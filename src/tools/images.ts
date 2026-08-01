import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch, apiUpload } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";
import { readFile } from "fs/promises";
import { createReadStream } from "fs";

export interface ImageToolOptions {
  /**
   * `upload_image` reads a file from the local filesystem, so it is registered
   * only on stdio. The hosted HTTP endpoint has no access to the caller's disk
   * and would advertise a tool that can never succeed.
   */
  includeLocalTools?: boolean;
}

export function registerImageTools(server: McpServer, options: ImageToolOptions = {}) {
  if (options.includeLocalTools) {
  server.tool(
    "upload_image",
    "Upload a local image file to the Misar.Blog CDN",
    {
      file_path: z.string().describe("Absolute path to the image file (JPEG, PNG, WebP, or GIF)"),
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

  server.tool(
    "generate_cover_image",
    "Generate a cover image using AI and upload it to the Misar.Blog CDN",
    {
      prompt: z.string().min(1).max(1000).describe("Description of the image to generate"),
      size: z
        .enum(["1024x1024", "1792x1024", "1024x1792"])
        .default("1792x1024")
        .describe("Image dimensions (default: landscape 1792x1024)"),
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
