import { z } from "zod";
import type { RiskLevel, ToolName } from "@/lib/constants";

export const PermissionRuleSchema = z.object({
  repoFullName: z.string().min(1),
  allowedPaths: z.array(z.string()),
  allowedActions: z.array(z.string()),
  isActive: z.boolean().default(true),
});

export type PermissionRule = z.infer<typeof PermissionRuleSchema>;

export type PolicyDecision = {
  allowed: boolean;
  riskLevel: RiskLevel;
  reason: string;
  requiresApproval: boolean;
};

export type ToolInvocation = {
  toolName: ToolName;
  repo?: string;
  path?: string;
  branch?: string;
  metadata?: Record<string, unknown>;
};
