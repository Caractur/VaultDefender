import type { ToolContext, ToolResult } from "./types";

export async function createBranch(
  ctx: ToolContext,
  params: { owner: string; repo: string; branchName: string; fromBranch?: string }
): Promise<ToolResult> {
  try {
    let baseBranch = params.fromBranch;
    if (!baseBranch) {
      const { data: repoData } = await ctx.octokit.repos.get({
        owner: params.owner,
        repo: params.repo,
      });
      baseBranch = repoData.default_branch;
    }

    const { data: refData } = await ctx.octokit.git.getRef({
      owner: params.owner,
      repo: params.repo,
      ref: `heads/${baseBranch}`,
    });

    await ctx.octokit.git.createRef({
      owner: params.owner,
      repo: params.repo,
      ref: `refs/heads/${params.branchName}`,
      sha: refData.object.sha,
    });

    return {
      success: true,
      data: {
        branchName: params.branchName,
        baseBranch,
        sha: refData.object.sha,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create branch",
    };
  }
}
