import type { ToolContext, ToolResult } from "./types";

export async function createDraftPR(
  ctx: ToolContext,
  params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base?: string;
  }
): Promise<ToolResult> {
  try {
    let baseBranch = params.base;
    if (!baseBranch) {
      const { data: repoData } = await ctx.octokit.repos.get({
        owner: params.owner,
        repo: params.repo,
      });
      baseBranch = repoData.default_branch;
    }

    const { data: pr } = await ctx.octokit.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: baseBranch,
      draft: true,
    });

    return {
      success: true,
      data: {
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.state,
        draft: pr.draft,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create draft PR",
    };
  }
}
