import { evaluatePolicy } from "@/lib/policy/engine";
import { createGitHubClient } from "@/lib/github/client";
import { getGitHubTokenFromContext } from "@/lib/auth/token-vault";
import { listRepos } from "./list-repos";
import { readFile } from "./read-file";
import { reviewPR } from "./review-pr";
import { createBranch } from "./create-branch";
import { createDraftPR } from "./create-pr";
import { editFile } from "./edit-file";
import { TOOL_NAMES } from "@/lib/constants";
import type { ToolName } from "@/lib/constants";
import type { ToolInvocation } from "@/lib/policy/types";
import type { ToolResult } from "./types";
import { resolveRepoPermission } from "@/lib/policy/repo-resolution";

const BRANCH_TARGETING_TOOLS = new Set<string>([
  TOOL_NAMES.CREATE_BRANCH,
  TOOL_NAMES.CREATE_DRAFT_PR,
]);

function parseRepoFullName(
  fullName: unknown
): { ok: true; owner: string; repo: string } | { ok: false; error: string } {
  if (typeof fullName !== "string" || !fullName) {
    return { ok: false, error: "Missing repository name (expected owner/repo)" };
  }
  const parts = fullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, error: `Invalid repository format "${fullName}" - expected owner/repo` };
  }
  return { ok: true, owner: parts[0], repo: parts[1] };
}

/**
 * Execute a tool after passing it through the policy engine.
 * GitHub token is retrieved from the Auth0 AI SDK context
 * (set by the withGitHubConnection wrapper).
 */
export async function executeTool(
  userId: string,
  toolName: ToolName,
  args: Record<string, unknown>
): Promise<{ result: ToolResult; policyDecision: { allowed: boolean; riskLevel: string; reason: string; requiresApproval: boolean } }> {
  const requestedRepo =
    typeof args.repo === "string" && args.repo.trim() ? args.repo.trim() : undefined;

  let branch =
    (args.branch as string | undefined) ??
    (args.fromBranch as string | undefined) ??
    (args.base as string | undefined) ??
    (args.ref as string | undefined);

  if (!branch && BRANCH_TARGETING_TOOLS.has(toolName)) {
    branch = "main";
  }

  const invocation: ToolInvocation = {
    toolName,
    repo: requestedRepo,
    path: args.path as string | undefined,
    branch,
    metadata: args,
  };

  const decision = await evaluatePolicy(userId, invocation);

  if (!decision.allowed) {
    return {
      result: {
        success: false,
        error: decision.requiresApproval
          ? `This action requires approval: ${decision.reason}. Please approve it in the Permissions dashboard.`
          : `Policy blocked: ${decision.reason}`,
      },
      policyDecision: decision,
    };
  }

  let canonicalRepo = requestedRepo;
  if (requestedRepo) {
    const repoResolution = await resolveRepoPermission(userId, requestedRepo);
    if (repoResolution.kind === "matched") {
      canonicalRepo = repoResolution.permission.repoFullName;
    }
  }

  const executionArgs = canonicalRepo ? { ...args, repo: canonicalRepo } : args;

  const tokenResult = getGitHubTokenFromContext();
  if (!tokenResult.ok) {
    return {
      result: { success: false, error: `GitHub token error: ${tokenResult.error}` },
      policyDecision: decision,
    };
  }

  const octokit = createGitHubClient(tokenResult.token);
  const ctx = { userId, octokit };

  let result: ToolResult;

  try {
    switch (toolName) {
      case TOOL_NAMES.LIST_REPOS:
        result = await listRepos(ctx, userId);
        break;

      case TOOL_NAMES.READ_FILE: {
        const parsed = parseRepoFullName(executionArgs.repo);
        if (!parsed.ok) return { result: { success: false, error: parsed.error }, policyDecision: decision };
        result = await readFile(ctx, {
          owner: parsed.owner,
          repo: parsed.repo,
          path: executionArgs.path as string,
          ref: executionArgs.ref as string | undefined,
        });
        break;
      }

      case TOOL_NAMES.REVIEW_PR: {
        const parsed = parseRepoFullName(executionArgs.repo);
        if (!parsed.ok) return { result: { success: false, error: parsed.error }, policyDecision: decision };
        result = await reviewPR(ctx, {
          owner: parsed.owner,
          repo: parsed.repo,
          pullNumber: executionArgs.pullNumber as number,
          userId,
        });
        break;
      }

      case TOOL_NAMES.CREATE_BRANCH: {
        const parsed = parseRepoFullName(executionArgs.repo);
        if (!parsed.ok) return { result: { success: false, error: parsed.error }, policyDecision: decision };
        result = await createBranch(ctx, {
          owner: parsed.owner,
          repo: parsed.repo,
          branchName: executionArgs.branchName as string,
          fromBranch: executionArgs.fromBranch as string | undefined,
        });
        break;
      }

      case TOOL_NAMES.CREATE_DRAFT_PR: {
        const parsed = parseRepoFullName(executionArgs.repo);
        if (!parsed.ok) return { result: { success: false, error: parsed.error }, policyDecision: decision };
        result = await createDraftPR(ctx, {
          owner: parsed.owner,
          repo: parsed.repo,
          title: executionArgs.title as string,
          body: executionArgs.body as string,
          head: executionArgs.head as string,
          base: executionArgs.base as string | undefined,
        });
        break;
      }

      case TOOL_NAMES.EDIT_FILE: {
        const parsed = parseRepoFullName(executionArgs.repo);
        if (!parsed.ok) return { result: { success: false, error: parsed.error }, policyDecision: decision };
        result = await editFile(ctx, {
          owner: parsed.owner,
          repo: parsed.repo,
          path: executionArgs.path as string,
          content: executionArgs.content as string,
          branch: executionArgs.branch as string,
          message: executionArgs.message as string | undefined,
        });
        break;
      }

      default:
        result = { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    result = {
      success: false,
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }

  return { result, policyDecision: decision };
}
