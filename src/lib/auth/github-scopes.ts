import { TOOL_NAMES, type ToolName } from "@/lib/constants";

export const GITHUB_WRITE_SCOPES = ["repo"] as const;

const WRITE_TOOL_NAMES = new Set<ToolName>([
  TOOL_NAMES.CREATE_BRANCH,
  TOOL_NAMES.CREATE_DRAFT_PR,
  TOOL_NAMES.EDIT_FILE,
]);

export function getGitHubScopesForTool(toolName?: string): string[] {
  if (!toolName) {
    return [];
  }

  return WRITE_TOOL_NAMES.has(toolName as ToolName)
    ? [...GITHUB_WRITE_SCOPES]
    : [];
}

export function needsGitHubWriteAccess(toolName?: string): boolean {
  return getGitHubScopesForTool(toolName).length > 0;
}
