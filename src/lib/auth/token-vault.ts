import {
  getAccessTokenFromTokenVault,
  getCredentialsFromTokenVault,
} from "./auth0-ai";
import { getRefreshToken } from "./auth0";

export type GitHubTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

/**
 * Get the GitHub access token from the Auth0 AI SDK context.
 * Call inside a tool wrapped with withGitHubConnection.
 */
export function getGitHubTokenFromContext(): GitHubTokenResult {
  try {
    getCredentialsFromTokenVault();
    const token = getAccessTokenFromTokenVault();
    if (token) {
      return { ok: true, token };
    }

    return {
      ok: false,
      error:
        "No GitHub token available from Token Vault - connect your GitHub account",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Token Vault context error",
    };
  }
}

/**
 * Direct token exchange for use outside the AI SDK context
 * (for example, the GitHub status route).
 */
export async function getGitHubTokenDirect(): Promise<GitHubTokenResult> {
  try {
    if (!AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
      return {
        ok: false,
        error: "Auth0 client credentials not configured",
      };
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return {
        ok: false,
        error:
          "No Auth0 refresh token found in the session - log out and sign in with GitHub again",
      };
    }

    const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type:
          "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        subject_token: refreshToken,
        subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
        requested_token_type:
          "http://auth0.com/oauth/token-type/federated-connection-access-token",
        connection: "github",
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));

      return {
        ok: false,
        error: `Token exchange failed (${res.status}): ${body?.error_description || body?.error || "unknown"}`,
      };
    }

    const data = await res.json();
    return { ok: true, token: data.access_token };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Token exchange failed",
    };
  }
}
