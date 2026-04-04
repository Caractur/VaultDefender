import { prisma } from "@/lib/db";
import { auth0 } from "./auth0";

export type SessionUser = {
  id: string;
  auth0Id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  githubConnected: boolean;
  githubUsername: string | null;
};

/**
 * Get or create the app-level user record from the Auth0 session.
 * Returns null if the user is not authenticated.
 */
export async function getAppUser(): Promise<SessionUser | null> {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  const { sub, email, name, picture } = session.user;

  const user = await prisma.user.upsert({
    where: { auth0Id: sub },
    update: { email, name, avatarUrl: picture },
    create: {
      auth0Id: sub,
      email,
      name,
      avatarUrl: picture,
    },
  });

  return {
    id: user.id,
    auth0Id: user.auth0Id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    githubConnected: user.githubConnected,
    githubUsername: user.githubUsername,
  };
}

/**
 * Require authentication. Throws if user is not logged in.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getAppUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}
