"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GitFork,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = {
  connected: boolean;
  username?: string;
  error?: string;
};

export function GitHubConnection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/github/status");
        const data = (await res.json()) as Status;
        if (!cancelled) {
          setStatus(data);
        }
      } catch {
        if (!cancelled) {
          setStatus({ connected: false, error: "Request failed" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking GitHub connection...
      </div>
    );
  }

  const connected = status.connected && status.username;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">GitHub Access</h2>
        <p className="text-sm text-muted-foreground">
          For this MVP, GitHub is the primary sign-in path. VaultDefender
          retrieves GitHub access through Auth0 Token Vault after you sign in.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitFork className="h-5 w-5" />
            GitHub Connection Status
          </CardTitle>
          {connected ? (
            <Badge variant="success" className="font-normal">
              Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="font-normal">
              Unavailable
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <div className="space-y-1 text-sm">
                <p>
                  Signed in as{" "}
                  <span className="font-mono font-medium text-foreground">
                    {status.username}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Auth0 can exchange your session for short-lived GitHub access
                  when the agent needs to call GitHub.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  {status.error || "GitHub access is not available."}
                </p>
                <p className="text-muted-foreground">
                  Log out and sign in again with{" "}
                  <span className="font-medium text-foreground">
                    Continue with GitHub
                  </span>
                  . When a tool needs GitHub access, the chat can prompt you to
                  complete the Auth0 consent flow directly.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">How Token Vault Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            When you sign in with GitHub through Auth0, Auth0 stores the GitHub
            tokens in Token Vault. VaultDefender does not store raw GitHub
            tokens itself.
          </p>
          <p>
            During tool execution, VaultDefender uses your Auth0 session refresh
            token to ask Auth0 for a short-lived GitHub token. GitHub sign-in is
            the primary access path in this MVP.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            GitHub Permissions vs VaultDefender Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              GitHub permissions
            </span>{" "}
            come from what you granted during GitHub/Auth0 authorization.
            Token Vault stores and exchanges those credentials; it does not
            expand them.
          </p>
          <p>
            <span className="font-medium text-foreground">
              VaultDefender policies
            </span>{" "}
            add a stricter app-level layer on top: allowed repositories,
            allowed path prefixes, approval requirements, and audit logging.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="pt-6 text-sm italic text-muted-foreground">
          A future version may support connecting GitHub to an existing
          non-GitHub Auth0 account. This MVP keeps GitHub as the primary
          authentication and authorization path.
        </CardContent>
      </Card>
    </div>
  );
}
