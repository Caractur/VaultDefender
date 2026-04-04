import { prisma } from "@/lib/db";
import { classifyRisk, requiresApproval } from "./risk";
import { logAuditEntry } from "@/lib/audit/logger";
import type { PolicyDecision, ToolInvocation } from "./types";

function safeParseJsonArray(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Central policy guard — every tool invocation passes through here.
 *
 * This is the core of VaultDefender's authorization model:
 * 1. GitHub grants repo-level access through its OAuth scopes.
 * 2. VaultDefender adds finer-grained path-prefix and action restrictions on top.
 * 3. High-risk actions require explicit human approval.
 */
export async function evaluatePolicy(
  userId: string,
  invocation: ToolInvocation
): Promise<PolicyDecision> {
  const { toolName, repo, path } = invocation;

  const risk = classifyRisk(toolName, {
    path: path,
    branch: invocation.branch,
  });

  if (!repo) {
    const decision: PolicyDecision = {
      allowed: true,
      riskLevel: risk.level,
      reason: "No repo-specific policy needed",
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocation, decision);
    return decision;
  }

  const permission = await prisma.permission.findUnique({
    where: { userId_repoFullName: { userId, repoFullName: repo } },
  });

  if (!permission || !permission.isActive) {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: `Repository "${repo}" is not in your allowed list`,
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocation, decision);
    return decision;
  }

  // Fail-closed: if stored JSON is corrupted, deny access
  const allowedPaths = safeParseJsonArray(permission.allowedPaths);
  if (allowedPaths === null) {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: "Permission data corrupted — access denied for safety",
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocation, decision);
    return decision;
  }

  if (path && allowedPaths.length > 0) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const pathAllowed = allowedPaths.some((prefix) => {
      const normalizedPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
      return normalizedPath.startsWith(normalizedPrefix);
    });

    if (!pathAllowed) {
      const decision: PolicyDecision = {
        allowed: false,
        riskLevel: risk.level,
        reason: `Path "${path}" is outside allowed prefixes: ${allowedPaths.join(", ")}`,
        requiresApproval: false,
      };
      await logAuditEntry(userId, invocation, decision);
      return decision;
    }
  }

  const allowedActions = safeParseJsonArray(permission.allowedActions);
  if (allowedActions === null) {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: "Permission data corrupted — access denied for safety",
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocation, decision);
    return decision;
  }

  if (allowedActions.length > 0 && !allowedActions.includes(toolName)) {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: `Action "${toolName}" is not allowed for "${repo}"`,
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocation, decision);
    return decision;
  }

  if (requiresApproval(risk.level)) {
    // Check for existing approved request (scoped to path)
    const existingApproval = await prisma.approvalRequest.findFirst({
      where: {
        userId,
        toolName,
        repo,
        path: invocation.path ?? null,
        status: "approved",
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!existingApproval) {
      // Deduplicate: don't create if an identical pending request already exists
      const existingPending = await prisma.approvalRequest.findFirst({
        where: {
          userId,
          toolName,
          repo,
          path: invocation.path ?? null,
          status: "pending",
        },
      });

      if (!existingPending) {
        await prisma.approvalRequest.create({
          data: {
            userId,
            action: `${toolName} on ${repo}${path ? ` at ${path}` : ""}`,
            toolName,
            repo,
            path,
            riskLevel: risk.level,
            reason: risk.reasons.join("; "),
          },
        });
      }

      const decision: PolicyDecision = {
        allowed: false,
        riskLevel: risk.level,
        reason: `High-risk action requires approval: ${risk.reasons.join("; ")}`,
        requiresApproval: true,
      };
      await logAuditEntry(userId, invocation, decision);
      return decision;
    }
  }

  const decision: PolicyDecision = {
    allowed: true,
    riskLevel: risk.level,
    reason: "Policy check passed",
    requiresApproval: false,
  };
  await logAuditEntry(userId, invocation, decision);
  return decision;
}

/**
 * Get the allowed path prefixes for a user+repo from the permission table.
 * Returns null if no permission exists, or empty array (meaning all paths allowed).
 */
export async function getAllowedPathsForRepo(
  userId: string,
  repoFullName: string
): Promise<string[] | null> {
  const permission = await prisma.permission.findUnique({
    where: { userId_repoFullName: { userId, repoFullName } },
  });
  if (!permission || !permission.isActive) return null;
  return safeParseJsonArray(permission.allowedPaths) ?? [];
}
