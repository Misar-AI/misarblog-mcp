# Installing Misar.Blog — every platform

Publish and manage articles, series, comments, reactions, newsletters, and analytics — from any AI assistant.

23 tools · 8 prompts ·
5 resources · 3 agents

**Authentication is required for every tool.** Either run the `login` tool
(opens https://www.misar.blog/authorize — nothing to copy), or create a key at
https://www.misar.blog/dashboard/settings/api-keys and set `MISARBLOG_API_KEY`.

## Desktop, CLI and IDE (stdio)

| Platform | Where | Artifact |
| --- | --- | --- |
| Claude Desktop | `claude_desktop_config.json` | `connectors/claude-desktop.json` |
| Claude Code (CLI) | `claude mcp add` or `.mcp.json` | `connectors/claude-code.json`, `.mcp.json` |
| Claude plugin / marketplace | `/plugin marketplace add` | `.claude-plugin/` |
| Cursor | Settings → MCP | `connectors/cursor.json` |
| VS Code (incl. Copilot agent mode) | `.vscode/mcp.json` | `connectors/vscode.json` |
| Visual Studio | MCP settings | `connectors/visual-studio.json` |
| JetBrains IDEs | AI Assistant → MCP | `connectors/jetbrains.json` |
| Windsurf | `mcp_config.json` | `connectors/windsurf.json` |
| Cline | MCP servers | `connectors/cline.json` |
| Zed | `settings.json` → context_servers | `connectors/zed.json` |
| Codex (CLI/app) | `~/.codex/config.toml` | `connectors/codex.toml` |
| Gemini CLI | `settings.json` | `connectors/gemini-cli.json` |

All of the above run:

```bash
npx -y @misarblog/mcp@latest
```

## Web and hosted

| Platform | How | Artifact | Notes |
| --- | --- | --- | --- |
| Claude.ai (web) | Custom connector | `connectors/claude-web.json` | Remote URL: `https://api.misar.io/blog/mcp` |
| Smithery | `npx -y @smithery/cli install misar/misarblog-mcp --client claude` | `smithery.yaml` | Hosted, no local install |
| ChatGPT (Custom GPT) | Actions → import schema | `customgpt/openapi.json` + `customgpt/gpt-config.json` | Bearer auth with your API key |
| Any MCP client over HTTP | Streamable HTTP | `connectors/remote-http.json` | `https://api.misar.io/blog/mcp` |
| MCP registry | `server.json` | `server.json`, `.well-known/` | `io.github.misar-ai/misarblog-mcp` |

## Agents and skills

- **Agents** — `agents/*.md`: task-scoped personas with the rules for using
  these tools safely.
- **Skills** — `skills/*/SKILL.md`: one workflow each, for clients that load
  skill folders.

A skill teaches one workflow; an agent owns a job and picks workflows.

## Verifying

```bash
# Discovery works with no credentials — tools/list must answer
npx -y @misarblog/mcp@latest <<< '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Every tool call without a key returns setup instructions naming the sign-in URL,
the dashboard URL, and where to put the key.

Docs: https://docs.misar.io/blog
