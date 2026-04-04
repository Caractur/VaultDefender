import type { ToolContext, ToolResult } from "./types";

export async function readFile(
  ctx: ToolContext,
  params: { owner: string; repo: string; path: string; ref?: string }
): Promise<ToolResult> {
  try {
    const { data } = await ctx.octokit.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: params.ref,
    });

    if (Array.isArray(data)) {
      const entries = data.map((item) => ({
        name: item.name,
        type: item.type,
        path: item.path,
        size: item.size,
      }));
      return { success: true, data: { type: "directory", entries } };
    }

    if (data.type === "file" && "content" in data) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return {
        success: true,
        data: {
          type: "file",
          path: data.path,
          size: data.size,
          content: content.length > 10000 ? content.slice(0, 10000) + "\n... (truncated)" : content,
        },
      };
    }

    return { success: true, data: { type: data.type, path: data.path } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to read file",
    };
  }
}
