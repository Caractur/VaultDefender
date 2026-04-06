import { prisma } from "@/lib/db";
import { classifyRisk, requiresApproval } from "./risk";
import { logAuditEntry } from "@/lib/audit/logger";
import type { PolicyDecision, ToolInvocation } from "./types";
import { resolveRepoPermission } from "./repo-resolution";

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
 * Central policy guard - every tool invocation passes through here.
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
    path,
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

  const repoResolution = await resolveRepoPermission(userId, repo);

  if (repoResolution.kind === "missing") {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: `Repository "${repo}" is not in your allowed list`,
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocation, decision);
    return decision;
  }

  if (repoResolution.kind === "inactive") {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: `Repository "${repoResolution.permission.repoFullName}" is configured but disabled`,
      requiresApproval: false,
    };
    await logAuditEntry(
      userId,
      { ...invocation, repo: repoResolution.permission.repoFullName },
      decision
    );
    return decision;
  }

  if (repoResolution.kind === "ambiguous") {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: `Repository reference "${repoResolution.requestedRepo}" is ambiguous. Use one of: ${repoResolution.matches.join(", ")}`,
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocation, decision);
    return decision;
  }

  const permission = repoResolution.permission;
  const invocationWithCanonicalRepo =
    permission.repoFullName === repo
      ? invocation
      : { ...invocation, repo: permission.repoFullName };

  // Fail-closed: if stored JSON is corrupted, deny access.
  const allowedPaths = safeParseJsonArray(permission.allowedPaths);
  if (allowedPaths === null) {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: "Permission data corrupted - access denied for safety",
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocationWithCanonicalRepo, decision);
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
      await logAuditEntry(userId, invocationWithCanonicalRepo, decision);
      return decision;
    }
  }

  const allowedActions = safeParseJsonArray(permission.allowedActions);
  if (allowedActions === null) {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: "Permission data corrupted - access denied for safety",
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocationWithCanonicalRepo, decision);
    return decision;
  }

  if (allowedActions.length > 0 && !allowedActions.includes(toolName)) {
    const decision: PolicyDecision = {
      allowed: false,
      riskLevel: risk.level,
      reason: `Action "${toolName}" is not allowed for "${permission.repoFullName}"`,
      requiresApproval: false,
    };
    await logAuditEntry(userId, invocationWithCanonicalRepo, decision);
    return decision;
  }

  if (requiresApproval(risk.level)) {
    const existingApproval = await prisma.approvalRequest.findFirst({
      where: {
        userId,
        toolName,
        repo: permission.repoFullName,
        path: invocation.path ?? null,
        status: "approved",
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!existingApproval) {
      const existingPending = await prisma.approvalRequest.findFirst({
        where: {
          userId,
          toolName,
          repo: permission.repoFullName,
          path: invocation.path ?? null,
          status: "pending",
        },
      });

      if (!existingPending) {
        await prisma.approvalRequest.create({
          data: {
            userId,
            action: `${toolName} on ${permission.repoFullName}${path ? ` at ${path}` : ""}`,
            toolName,
            repo: permission.repoFullName,
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
      await logAuditEntry(userId, invocationWithCanonicalRepo, decision);
      return decision;
    }
  }

  const decision: PolicyDecision = {
    allowed: true,
    riskLevel: risk.level,
    reason: "Policy check passed",
    requiresApproval: false,
  };
  await logAuditEntry(userId, invocationWithCanonicalRepo, decision);
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
  const repoResolution = await resolveRepoPermission(userId, repoFullName);
  if (repoResolution.kind !== "matched") return null;
  return safeParseJsonArray(repoResolution.permission.allowedPaths) ?? [];
}
