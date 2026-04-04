import {
  Auth0AI,
  getAccessTokenFromTokenVault,
  getCredentialsFromTokenVault,
} from "@auth0/ai-vercel";
import { getRefreshToken } from "./auth0";

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

export const withGitHubConnection = auth0AI.withTokenVault({
  connection: "github",
  // GitHub permissions come from the GitHub app itself, not Token Vault scopes.
  // Auth0's GitHub Token Vault integration currently expects an empty scope list.
  scopes: [],
  // Use a fresh Token Vault exchange for each tool call so we do not reuse
  // stale GitHub credentials across a long-lived chat thread.
  credentialsContext: "tool-call",
  refreshToken: getRefreshToken,
});

export { getAccessTokenFromTokenVault, getCredentialsFromTokenVault };
