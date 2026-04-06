import { RISK_LEVELS, SENSITIVE_PATHS, TOOL_NAMES, PROTECTED_BRANCH_PATTERNS } from "@/lib/constants";
import type { RiskLevel, ToolName } from "@/lib/constants";

const BASE_TOOL_RISK: Record<string, RiskLevel> = {
  [TOOL_NAMES.LIST_REPOS]: RISK_LEVELS.LOW,
  [TOOL_NAMES.READ_FILE]: RISK_LEVELS.LOW,
  [TOOL_NAMES.REVIEW_PR]: RISK_LEVELS.LOW,
  [TOOL_NAMES.CREATE_BRANCH]: RISK_LEVELS.MEDIUM,
  [TOOL_NAMES.CREATE_DRAFT_PR]: RISK_LEVELS.MEDIUM,
  [TOOL_NAMES.EDIT_FILE]: RISK_LEVELS.MEDIUM,
};

const DIRECT_PROTECTED_BRANCH_WRITE_TOOLS = new Set<ToolName>([
  TOOL_NAMES.EDIT_FILE,
]);

function matchesProtectedBranch(branch: string): boolean {
  return PROTECTED_BRANCH_PATTERNS.some((pattern) => {
    if (pattern.endsWith("/*")) {
      return branch.startsWith(pattern.slice(0, -1));
    }
    return branch === pattern;
  });
}

function touchesSensitivePath(path: string): boolean {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return SENSITIVE_PATHS.some(
    (sp) => normalized.startsWith(sp) || normalized === sp
  );
}

/**
 * Classify the risk level of a tool invocation, considering both
 * the base tool risk and contextual factors (path, branch).
 * Protected branches only escalate tools that write directly to that branch.
 */
export function classifyRisk(
  toolName: ToolName,
  opts: { path?: string; branch?: string } = {}
): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let level = BASE_TOOL_RISK[toolName] ?? RISK_LEVELS.HIGH;

  if (opts.path && touchesSensitivePath(opts.path)) {
    level = RISK_LEVELS.HIGH;
    reasons.push(`Path "${opts.path}" is security-sensitive`);
  }

  if (
    opts.branch &&
    DIRECT_PROTECTED_BRANCH_WRITE_TOOLS.has(toolName) &&
    matchesProtectedBranch(opts.branch)
  ) {
    level = RISK_LEVELS.HIGH;
    reasons.push(`Branch "${opts.branch}" is protected`);
  }

  if (!reasons.length) {
    reasons.push(`Base risk for ${toolName}: ${level}`);
  }

  return { level, reasons };
}

export function requiresApproval(riskLevel: RiskLevel): boolean {
  return riskLevel === RISK_LEVELS.HIGH;
}
