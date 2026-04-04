import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getGitHubTokenDirect } from "@/lib/auth/token-vault";
import { createGitHubClient } from "@/lib/github/client";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const tokenResult = await getGitHubTokenDirect();

    if (tokenResult.ok) {
      try {
        const octokit = createGitHubClient(tokenResult.token);
        const { data: ghUser } = await octokit.users.getAuthenticated();
        await prisma.user.update({
          where: { id: user.id },
          data: { githubConnected: true, githubUsername: ghUser.login },
        });

        return NextResponse.json({ connected: true, username: ghUser.login });
      } catch {
        await prisma.user.update({
          where: { id: user.id },
          data: { githubConnected: false, githubUsername: null },
        });

        return NextResponse.json({
          connected: false,
          error:
            "Auth0 returned a GitHub token, but GitHub rejected it. Log out and sign in with GitHub again.",
        });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { githubConnected: false, githubUsername: null },
    });

    return NextResponse.json({ connected: false, error: tokenResult.error });
  } catch {
    return NextResponse.json(
      { connected: false, error: "Not authenticated" },
      { status: 401 }
    );
  }
}
