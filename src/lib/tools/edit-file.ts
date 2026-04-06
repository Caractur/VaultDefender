import type { ToolContext, ToolResult } from "./types";

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

export async function editFile(
  ctx: ToolContext,
  params: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    branch: string;
    message?: string;
  }
): Promise<ToolResult> {
  try {
    let existingSha: string | undefined;
    let operation: "created" | "updated" = "created";

    try {
      const { data } = await ctx.octokit.repos.getContent({
        owner: params.owner,
        repo: params.repo,
        path: params.path,
        ref: params.branch,
      });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
        return {
          success: false,
          error: `Path "${params.path}" is not a regular file and cannot be edited`,
        };
      }

      const currentContent = Buffer.from(data.content, "base64").toString("utf-8");
      if (currentContent === params.content) {
        return {
          success: true,
          data: {
            operation: "unchanged",
            path: params.path,
            branch: params.branch,
            sha: data.sha,
          },
        };
      }

      existingSha = data.sha;
      operation = "updated";
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    const { data } = await ctx.octokit.repos.createOrUpdateFileContents({
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      branch: params.branch,
      message:
        params.message?.trim() ||
        `${operation === "created" ? "Create" : "Update"} ${params.path}`,
      content: Buffer.from(params.content, "utf-8").toString("base64"),
      ...(existingSha ? { sha: existingSha } : {}),
    });

    return {
      success: true,
      data: {
        operation,
        path: params.path,
        branch: params.branch,
        commitSha: data.commit.sha,
        commitUrl: data.commit.html_url,
        fileSha: data.content?.sha,
        fileUrl: data.content?.html_url,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to edit file",
    };
  }
}
