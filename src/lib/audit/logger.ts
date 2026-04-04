import { prisma } from "@/lib/db";
import type { PolicyDecision, ToolInvocation } from "@/lib/policy/types";

/**
 * Record every tool invocation and its policy outcome in the audit trail.
 */
export async function logAuditEntry(
  userId: string,
  invocation: ToolInvocation,
  decision: PolicyDecision
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action: `${invocation.toolName}${invocation.repo ? ` on ${invocation.repo}` : ""}`,
      toolName: invocation.toolName,
      repo: invocation.repo,
      path: invocation.path,
      riskLevel: decision.riskLevel,
      decision: decision.allowed ? "allowed" : "blocked",
      reason: decision.reason,
      approvalRequired: decision.requiresApproval,
      metadata: invocation.metadata
        ? JSON.stringify(invocation.metadata)
        : null,
    },
  });
}
