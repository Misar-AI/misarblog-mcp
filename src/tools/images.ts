import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch, apiUpload } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";
import { readFile } from "fs/promises";
import { createReadStream } from "fs";

/** Controls whether filesystem-dependent image tools are registered. */
export interface ImageToolOptions {
  /**
   * `upload_image` reads a file from the local filesystem, so it is registered
   * only on stdio. The hosted HTTP endpoint has no access to the caller's disk
   * and would advertise a tool that can never succeed.
   */
  includeLocalTools?: boolean;
}

/** Register cover-image generation, plus local upload on stdio only. */
export function registerImageTools(server: McpServer, options: ImageToolOptions = {}) {
  if (options.includeLocalTools) {
  server.registerTool(
    "upload_image",
    {
      title: "Upload a local image",
      description:
        "Upload an image file from the local filesystem to the Misar.Blog CDN and return its " +
        "public URL.\n\n" +
        "Use it for images the user already has on disk; use generate_cover_image when the " +
        "image does not exist yet. Available only when the server runs locally over stdio — " +
        "the hosted endpoint cannot see your disk, so it does not offer this tool at all.\n\n" +
        "Reads the file and creates a NEW CDN object each call; uploading twice yields two " +
        "URLs. Nothing on the filesystem is modified or deleted. Requires an API key. The " +
        "resulting URL is public and undeletable through this server, so do not upload " +
        "anything private. Accepts JPEG, PNG, WebP and GIF.",
      inputSchema: {
        file_path: z
          .string()
          .describe(
            "Absolute path to the image on this machine, e.g. '/Users/me/cover.png'. " +
              "JPEG, PNG, WebP or GIF; the type is inferred from the extension.",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ file_path }) => {
      try {
        const { Blob } = await import("buffer");
        const data = await readFile(file_path);
        const ext = file_path.split(".").pop()?.toLowerCase() ?? "jpg";
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          gif: "image/gif",
        };
        const mime = mimeMap[ext] ?? "image/jpeg";
        const blob = new Blob([data], { type: mime });
        const form = new FormData();
        form.append("file", blob as unknown as File, `upload.${ext}`);
        const result = await apiUpload<{ url: string }>("/images/upload", form);
        return { content: [{ type: "text", text: `Image uploaded!\n\nURL: ${result.url}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
  }

  server.registerTool(
    "generate_cover_image",
    {
      title: "Generate a cover image",
      description:
        "Generate an image from a text prompt with AI, upload it to the Misar.Blog CDN, and " +
        "return its public URL for use as cover_image_url when publishing.\n\n" +
        "Use it when no artwork exists yet; use upload_image for a file the user already has. " +
        "Each call generates a NEW image and costs generation credits against the account's " +
        "plan — it is not idempotent, so re-running to 'try again' bills again. Generation " +
        "takes noticeably longer than other tools.\n\n" +
        "Requires an API key. The resulting URL is public and cannot be deleted through this " +
        "server. Results vary between runs for the same prompt.",
      inputSchema: {
        prompt: z
          .string()
          .min(1)
          .max(1000)
          .describe(
            "What the image should show, in plain language, up to 1000 characters. Describe " +
              "subject and style; avoid asking for text in the image.",
          ),
        size: z
          .enum(["1024x1024", "1792x1024", "1024x1792"])
          .default("1792x1024")
          .describe(
            "Output dimensions: '1792x1024' landscape (the default, best for article covers), " +
              "'1024x1024' square, '1024x1792' portrait.",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ prompt, size }) => {
      try {
        const result = await apiFetch<{ url: string }>("/images/generate", {
          method: "POST",
          body: JSON.stringify({ prompt, size }),
        });
        return {
          content: [
            { type: "text", text: `Cover image generated!\n\nURL: ${result.url}\n\nUse this as cover_image_url when publishing.` },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
}
