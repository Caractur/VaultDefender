import { Octokit } from "@octokit/rest";

/**
 * Create an authenticated Octokit instance using a GitHub token
 * retrieved from Auth0 Token Vault. The token is never stored by VaultDefender.
 */
export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: "VaultDefender/1.0",
  });
}
