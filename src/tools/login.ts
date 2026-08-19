import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createServer, IncomingMessage, ServerResponse, Server } from "http";
import { execFileSync } from "child_process";
import { saveConfig, getBaseUrl, tryGetApiKey } from "../lib/auth.js";
import { apiFetch } from "../lib/api-client.js";

interface MeResponse { username: string }

// Opens URL in the system browser — uses execFileSync with separate args (no shell, no injection)
function openBrowser(url: string): void {
  try {
    if (process.platform === "darwin") execFileSync("open", [url], { stdio: "ignore" });
    else if (process.platform === "win32") execFileSync("cmd.exe", ["/c", "start", "", url], { stdio: "ignore" });
    else execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch {
    process.stderr.write(`Open this URL in your browser:\n  ${url}\n`);
  }
}

/**
 * Best-effort name for the host application, shown on the consent screen so the
 * user can see WHICH tool is asking for access.
 */
function detectClientName(): string {
  const explicit = process.env.MISARBLOG_CLIENT_NAME?.trim();
  if (explicit) return explicit.slice(0, 60);
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE) return "Claude Code";
  if (process.env.CURSOR_TRACE_ID || process.env.CURSOR_SESSION_ID) return "Cursor";
  if (process.env.TERM_PROGRAM === "vscode") return "VS Code";
  if (process.env.WINDSURF_SESSION_ID) return "Windsurf";
  return "MCP Client";
}

/**
 * Where the consent screen lives — the WEB app, not the API host.
 *
 * `getBaseUrl()` returns an API base, and its default
 * (`https://api.misar.io/blog/v1`) does not end in `/api/v1`, so the previous
 * `.replace(/\/api\/v1$/, "")` was a no-op on every default install: `login`
 * opened `https://api.misar.io/blog/v1/authorize`, which 404s. Browser
 * authentication was therefore broken for anyone who had not set
 * MISARBLOG_BASE_URL by hand.
 *
 * Self-hosted installs still work: a configured base URL has its API suffix
 * stripped to recover the app origin.
 */
function resolveAppUrl(): string {
  const explicit = process.env.MISARBLOG_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const apiBase = getBaseUrl();
  // Public default -> the public app.
  if (/^https?:\/\/api\.misar\.io\/blog(\/|$)/.test(apiBase)) return "https://www.misar.blog";
  // Self-hosted: MISARBLOG_BASE_URL had "/api/v1" appended by getBaseUrl().
  const stripped = apiBase.replace(/\/api\/v1\/?$/, "");
  return stripped !== apiBase ? stripped : "https://www.misar.blog";
}

const PORT_MIN = 9001;
const PORT_MAX = 9099;

function randomPort(): number {
  return PORT_MIN + Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1));
}

/**
 * Bind the loopback listener, retrying on a different port when the chosen one
 * is already taken. A hard-coded single attempt made `login` fail with
 * EADDRINUSE whenever another editor had a listener open — which surfaced to
 * the user as an unexplained authorization failure.
 */
function listenOnFreePort(
  srv: Server,
  preferred: number | undefined,
  attemptsLeft: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const port =
      preferred && preferred >= PORT_MIN && preferred <= PORT_MAX
        ? preferred
        : randomPort();

    const onError = (err: NodeJS.ErrnoException) => {
      srv.removeListener("error", onError);
      if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
        listenOnFreePort(srv, undefined, attemptsLeft - 1).then(resolve, reject);
        return;
      }
      reject(err);
    };

    srv.once("error", onError);
    srv.listen(port, "127.0.0.1", () => {
      srv.removeListener("error", onError);
      resolve(port);
    });
  });
}

/** Register the browser-based `login` tool (stdio only). */
export function registerLoginTool(server: McpServer) {
  server.registerTool(
    "login",
    {
      title: "Log in via browser",
      description:
        "Connect a Misar.Blog account by browser consent, with no API key to copy and " +
        "paste.\n\n" +
        "Use it when `status` reports no key, or when a tool fails as unauthenticated. It " +
        "opens the authorisation page in the user's browser, waits for them to review the " +
        "permissions and click Authorize, then stores the returned key in " +
        "`~/.misarblog/config.json`.\n\n" +
        "Two things to know before calling it. It BLOCKS until a human acts in the browser, " +
        "so it can hang for as long as they take — never call it speculatively or in a " +
        "retry loop. And `force=true` ROTATES the key, invalidating the existing one " +
        "everywhere else it is used; without force, an already-valid session returns " +
        "immediately and changes nothing. It listens on a short-lived local port to receive " +
        "the callback.",
      inputSchema: {
        port: z
          .number()
          .int()
          .min(PORT_MIN)
          .max(PORT_MAX)
          .optional()
          .describe(
            "Local port for the one-shot callback listener, 9001-9099. Random by default; " +
              "set it only when a firewall requires a fixed port.",
          ),
        base_url: z
          .string()
          .url()
          .optional()
          .describe("Base URL of a self-hosted Misar.Blog. Omit for the hosted service."),
        force: z
          .boolean()
          .optional()
          .describe(
            "Re-authenticate even when already logged in. This ROTATES the API key and " +
              "breaks any other client using the old one — only on explicit request.",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ port: preferredPort, base_url, force }) => {
      // Guard: if already authenticated and key is valid, skip the login flow
      if (!force) {
        const existingKey = tryGetApiKey();
        if (existingKey) {
          try {
            const profile = await apiFetch<MeResponse>("/me");
            return {
              content: [{
                type: "text" as const,
                text: `Already authenticated as @${profile.username}. Use \`status\` to verify, or call \`login\` with force=true to rotate your API key.`,
              }],
            };
          } catch {
            // Key exists but rejected — fall through to re-auth
          }
        }
      }

      const _baseUrl = (base_url ?? resolveAppUrl()).replace(/\/$/, "");
      const _clientName = detectClientName();

      return new Promise<{ content: Array<{ type: "text"; text: string }> }>((resolve) => {
        let _resolved = false;
        let _timer: NodeJS.Timeout | undefined;

        const finish = (text: string) => {
          if (_resolved) return;
          _resolved = true;
          if (_timer) clearTimeout(_timer);
          _srv.close();
          resolve({ content: [{ type: "text", text }] });
        };

        const _srv = createServer((req: IncomingMessage, res: ServerResponse) => {
          // Only accept callbacks from loopback
          const _remote = req.socket.remoteAddress ?? "";
          if (_remote !== "127.0.0.1" && _remote !== "::1" && _remote !== "::ffff:127.0.0.1") {
            res.writeHead(403).end();
            return;
          }
          if (req.method !== "POST" || req.url !== "/token") {
            res.writeHead(404).end();
            return;
          }

          let _body = "";
          req.on("data", (chunk: Buffer) => { _body += chunk.toString(); });
          req.on("end", () => {
            try {
              const _data = JSON.parse(_body) as { api_key?: string; username?: string; base_url?: string };
              const _gotKey = (_data.api_key ?? "").trim();
              const _gotUser = (_data.username ?? "").trim();

              if (!_gotKey.startsWith("mbk_")) {
                res.writeHead(400, { "Content-Type": "application/json" })
                  .end(JSON.stringify({ error: "invalid key" }));
                return;
              }

              res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
              saveConfig({ api_key: _gotKey, username: _gotUser, ...(base_url ? { base_url } : {}) });

              finish(
                `Connected as @${_gotUser}! API key saved to ~/.misarblog/config.json.\n\n` +
                `You can now use all Misar.Blog tools without setting MISARBLOG_API_KEY.`
              );
            } catch {
              res.writeHead(400).end();
            }
          });
        });

        listenOnFreePort(_srv, preferredPort, 8).then(
          (boundPort) => {
            // The consent screen. `mode=key` selects the loopback handshake and
            // `client` labels the request so the user knows what is asking.
            const params = new URLSearchParams({
              mode: "key",
              mcp_port: String(boundPort),
              client: _clientName,
              scope: "read write analytics newsletter",
            });
            const authorizeUrl = `${_baseUrl}/authorize?${params.toString()}`;

            openBrowser(authorizeUrl);
            process.stderr.write(
              `Waiting for authorization at ${authorizeUrl}\n` +
              `(listening on 127.0.0.1:${boundPort})\n`
            );

            _timer = setTimeout(() => {
              finish(
                `Login timed out after 120 seconds. Open this URL manually and click 'Authorize':\n\n${authorizeUrl}`
              );
            }, 120_000);
          },
          (err: Error) => {
            finish(
              `Could not start the local callback listener: ${err.message}\n\n` +
              `Ports ${PORT_MIN}–${PORT_MAX} all appear to be in use. Pass an explicit free port, e.g. login(port: 9042).`
            );
          }
        );
      });
    }
  );
}
