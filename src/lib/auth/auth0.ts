import { Auth0Client } from "@auth0/nextjs-auth0/server";

const appBaseUrl = process.env.AUTH0_BASE_URL;

export const auth0 = new Auth0Client({
  ...(appBaseUrl ? { appBaseUrl } : {}),
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
  enableConnectAccountEndpoint: true,
});

export async function getRefreshToken(): Promise<string | undefined> {
  const session = await auth0.getSession();
  return session?.tokenSet?.refreshToken;
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const tokenResponse = await auth0.getAccessToken();
    return tokenResponse?.token ?? null;
  } catch {
    return null;
  }
}
