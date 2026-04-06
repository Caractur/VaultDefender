export const APP_NAME = "VaultDefender";
export const APP_DESCRIPTION =
  "A least-privilege GitHub agent that combines Auth0 Token Vault for delegated GitHub access with an app-level policy engine that restricts what the agent may do inside allowed repositories and path prefixes.";

export const RISK_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

export const TOOL_NAMES = {
  LIST_REPOS: "list_repos",
  READ_FILE: "read_file",
  REVIEW_PR: "review_pr",
  CREATE_BRANCH: "create_branch",
  CREATE_DRAFT_PR: "create_draft_pr",
  EDIT_FILE: "edit_file",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

export const SENSITIVE_PATHS = [
  ".github/workflows",
  ".github/actions",
  ".env",
  ".secrets",
  "config/secrets",
  "credentials",
] as const;

export const PROTECTED_BRANCH_PATTERNS = ["main", "master", "release/*", "production"];
