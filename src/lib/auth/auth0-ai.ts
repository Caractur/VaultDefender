import {
  Auth0AI,
  getAccessTokenFromTokenVault,
  getCredentialsFromTokenVault,
} from "@auth0/ai-vercel";
import { getRefreshToken } from "./auth0";
import { GITHUB_WRITE_SCOPES } from "./github-scopes";

/**
 * Token Vault authorizer using refresh-token exchange (official @auth0/ai-vercel pattern).
 * Uses the Regular Web App client — NOT the Custom API Client — because the subject token
 * is the user's Auth0 refresh token issued to that same application.
 *
 * @see https://github.com/auth0/auth0-ai-js/blob/main/packages/ai-vercel/README.md
 */
const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  },
});

const baseGitHubTokenVaultConfig = {
  connection: "github",
  // Use a fresh Token Vault exchange for each tool call so we do not reuse
  // stale GitHub credentials across a long-lived chat thread.
  credentialsContext: "tool-call",
  refreshToken: getRefreshToken,
} as const;

export const withGitHubConnection = auth0AI.withTokenVault({
  ...baseGitHubTokenVaultConfig,
  scopes: [],
});

export const withGitHubWriteConnection = auth0AI.withTokenVault({
  ...baseGitHubTokenVaultConfig,
  scopes: [...GITHUB_WRITE_SCOPES],
});

export { getAccessTokenFromTokenVault, getCredentialsFromTokenVault };
