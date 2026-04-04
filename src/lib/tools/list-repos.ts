import { prisma } from "@/lib/db";
import type { ToolContext, ToolResult } from "./types";

function parseRepoFullName(fullName: string) {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

function summarizeRepo(
  repo: {
    full_name: string;
    name: string;
    owner: { login: string };
    private: boolean;
    description: string | null;
    default_branch: string | null;
    language: string | null;
    updated_at: string | null;
    html_url: string;
  },
  allowedRepoNames: Set<string>
) {
  return {
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    private: repo.private,
    description: repo.description,
    defaultBranch: repo.default_branch,
    language: repo.language,
    updatedAt: repo.updated_at,
    url: repo.html_url,
    hasVaultDefenderPolicy: allowedRepoNames.has(repo.full_name),
  };
}

export async function listRepos(ctx: ToolContext, userId: string): Promise<ToolResult> {
  try {
    const activePermissions = await prisma.permission.findMany({
      where: { userId, isActive: true },
      select: { repoFullName: true },
    });
    const allowedRepoNames = new Set(activePermissions.map((p) => p.repoFullName));

    let repos: Array<ReturnType<typeof summarizeRepo>> = [];
    const lookupFailures: Array<{
      repoFullName: string;
      status: number | null;
      error: string;
    }> = [];

    if (allowedRepoNames.size > 0) {
      // When the user has an allow-list, fetch those repos directly so they do not
      // disappear behind pagination or sort order from GitHub's list endpoint.
      const repoLookups = await Promise.all(
        [...allowedRepoNames].map(async (fullName) => {
          const parsed = parseRepoFullName(fullName);
          if (!parsed) {
            return null;
          }

          try {
            const { data } = await ctx.octokit.repos.get({
              owner: parsed.owner,
              repo: parsed.repo,
            });

            return summarizeRepo(data, allowedRepoNames);
          } catch (error) {
            const status =
              typeof error === "object" &&
              error !== null &&
              "status" in error &&
              typeof error.status === "number"
                ? error.status
                : null;
            const message =
              typeof error === "object" &&
              error !== null &&
              "message" in error &&
              typeof error.message === "string"
                ? error.message
                : "Unknown GitHub error";

            lookupFailures.push({
              repoFullName: fullName,
              status,
              error: message,
            });

            return null;
          }
        })
      );

      repos = repoLookups.filter((repo): repo is NonNullable<typeof repo> => repo !== null);

      if (repos.length === 0 && lookupFailures.length > 0) {
        const allUnauthorized = lookupFailures.every(
          (failure) =>
            failure.status === 401 ||
            failure.error.toLowerCase().includes("bad credentials")
        );

        if (allUnauthorized) {
          return {
            success: false,
            error:
              "GitHub rejected the Token Vault credential as invalid. Log out and sign in with GitHub again.",
          };
        }

        const failureSummary = lookupFailures
          .map(
            (failure) =>
              `${failure.repoFullName} (${failure.status ?? "no-status"}: ${failure.error})`
          )
          .join("; ");

        return {
          success: false,
          error: `None of your allowed repositories were accessible from GitHub. Failed checks: ${failureSummary}`,
        };
      }
    } else {
      const data = await ctx.octokit.paginate(ctx.octokit.repos.listForAuthenticatedUser, {
        sort: "updated",
        per_page: 100,
      });

      repos = data.map((repo) => summarizeRepo(repo, allowedRepoNames));
    }

    return { success: true, data: repos };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to list repositories",
    };
  }
}
