import { z } from "zod";
import { tool } from "ai";
import { executeTool } from "./executor";
import { withGitHubConnection } from "@/lib/auth/auth0-ai";
import { TOOL_NAMES } from "@/lib/constants";

/**
 * Build AI SDK tool definitions wired to the policy-guarded executor.
 * Each tool is wrapped with withGitHubConnection which handles
 * Token Vault exchange via the Auth0 AI SDK.
 */
export function buildAgentTools(userId: string) {
  return {
    list_repos: withGitHubConnection(
      tool({
        description:
          "List GitHub repositories accessible to the connected user. Returns repository names, visibility, and metadata.",
        inputSchema: z.object({
          _dummy: z.string().optional().describe("Unused"),
        }),
        execute: async () => {
          const { result, policyDecision } = await executeTool(
            userId,
            TOOL_NAMES.LIST_REPOS,
            {}
          );
          return { ...result, policy: policyDecision };
        },
      })
    ),

    read_file: withGitHubConnection(
      tool({
        description:
          "Read a file or list directory contents within a repository. Only works within allowed path prefixes.",
        inputSchema: z.object({
          repo: z.string().describe("Repository full name (owner/repo)"),
          path: z.string().describe("File or directory path within the repo"),
          ref: z.string().optional().describe("Git ref (branch/tag/commit)"),
        }),
        execute: async (args) => {
          const { result, policyDecision } = await executeTool(
            userId,
            TOOL_NAMES.READ_FILE,
            args
          );
          return { ...result, policy: policyDecision };
        },
      })
    ),

    review_pr: withGitHubConnection(
      tool({
        description:
          "Review and summarize a pull request including its changes, file diffs, and metadata.",
        inputSchema: z.object({
          repo: z.string().describe("Repository full name (owner/repo)"),
          pullNumber: z.number().describe("Pull request number"),
        }),
        execute: async (args) => {
          const { result, policyDecision } = await executeTool(
            userId,
            TOOL_NAMES.REVIEW_PR,
            args
          );
          return { ...result, policy: policyDecision };
        },
      })
    ),

    create_branch: withGitHubConnection(
      tool({
        description: "Create a new branch in a repository. Medium-risk action.",
        inputSchema: z.object({
          repo: z.string().describe("Repository full name (owner/repo)"),
          branchName: z.string().describe("Name for the new branch"),
          fromBranch: z
            .string()
            .optional()
            .describe("Base branch (defaults to main)"),
        }),
        execute: async (args) => {
          const { result, policyDecision } = await executeTool(
            userId,
            TOOL_NAMES.CREATE_BRANCH,
            args
          );
          return { ...result, policy: policyDecision };
        },
      })
    ),

    create_draft_pr: withGitHubConnection(
      tool({
        description:
          "Open a draft pull request. Medium-risk action. Use after creating a branch.",
        inputSchema: z.object({
          repo: z.string().describe("Repository full name (owner/repo)"),
          title: z.string().describe("PR title"),
          body: z.string().describe("PR description/body"),
          head: z.string().describe("Head branch name"),
          base: z
            .string()
            .optional()
            .describe("Base branch (defaults to main)"),
        }),
        execute: async (args) => {
          const { result, policyDecision } = await executeTool(
            userId,
            TOOL_NAMES.CREATE_DRAFT_PR,
            args
          );
          return { ...result, policy: policyDecision };
        },
      })
    ),
  };
}
