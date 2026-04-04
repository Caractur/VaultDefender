import { getAllowedPathsForRepo } from "@/lib/policy/engine";
import type { ToolContext, ToolResult } from "./types";

export async function reviewPR(
  ctx: ToolContext,
  params: { owner: string; repo: string; pullNumber: number; userId: string }
): Promise<ToolResult> {
  try {
    const [prResponse, filesResponse] = await Promise.all([
      ctx.octokit.pulls.get({
        owner: params.owner,
        repo: params.repo,
        pull_number: params.pullNumber,
      }),
      ctx.octokit.pulls.listFiles({
        owner: params.owner,
        repo: params.repo,
        pull_number: params.pullNumber,
        per_page: 50,
      }),
    ]);

    const pr = prResponse.data;
    const repoFullName = `${params.owner}/${params.repo}`;
    const allowedPaths = await getAllowedPathsForRepo(params.userId, repoFullName);

    let files = filesResponse.data.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch?.slice(0, 2000),
    }));

    // If the user has path restrictions, filter diffs to only allowed paths
    let redactedCount = 0;
    if (allowedPaths && allowedPaths.length > 0) {
      const total = files.length;
      files = files.filter((f) => {
        const normalizedFile = f.filename.startsWith("/") ? f.filename : `/${f.filename}`;
        return allowedPaths.some((prefix) => {
          const normalizedPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
          return normalizedFile.startsWith(normalizedPrefix);
        });
      });
      redactedCount = total - files.length;
    }

    return {
      success: true,
      data: {
        title: pr.title,
        body: pr.body?.slice(0, 2000),
        state: pr.state,
        author: pr.user?.login,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        mergeable: pr.mergeable,
        files,
        ...(redactedCount > 0 && {
          notice: `${redactedCount} file(s) hidden — outside your allowed path prefixes`,
        }),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to review PR",
    };
  }
}
