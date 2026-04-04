import type { Octokit } from "@octokit/rest";

export type ToolContext = {
  userId: string;
  octokit: Octokit;
};

export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};
