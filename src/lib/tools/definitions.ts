import { z } from "zod";
import { tool } from "ai";
import { executeTool } from "./executor";
import {
  withGitHubConnection,
  withGitHubWriteConnection,
} from "@/lib/auth/auth0-ai";
import { TOOL_NAMES } from "@/lib/constants";

/**
 * Build AI SDK tool definitions wired to the policy-guarded executor.
 * Each tool is wrapped with the appropriate GitHub Token Vault authorizer
 * so write actions can request elevated provider scopes when needed.
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

    create_branch: withGitHubWriteConnection(
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

    create_draft_pr: withGitHubWriteConnection(
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

    edit_file: withGitHubWriteConnection(
      tool({
        description:
          "Create or update a text file by committing the full file contents to a specific branch. Medium-risk action.",
        inputSchema: z.object({
          repo: z.string().describe("Repository full name (owner/repo)"),
          path: z.string().describe("Path to the file within the repo"),
          content: z
            .string()
            .describe("Full new UTF-8 file contents to commit"),
          branch: z
            .string()
            .describe("Branch name to commit to (must already exist)"),
          message: z
            .string()
            .optional()
            .describe("Commit message (defaults to Create/Update <path>)"),
        }),
        execute: async (args) => {
          const { result, policyDecision } = await executeTool(
            userId,
            TOOL_NAMES.EDIT_FILE,
            args
          );
          return { ...result, policy: policyDecision };
        },
      })
    ),
  };
}
