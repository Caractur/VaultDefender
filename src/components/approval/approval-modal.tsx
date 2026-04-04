"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ApprovalRow = {
  id: string;
  action: string;
  toolName: string;
  repo: string;
  path: string | null;
  riskLevel: string;
  status: string;
  createdAt: string;
  reason?: string | null;
};

function riskBadge(level: string) {
  const l = level.toLowerCase();
  if (l === "high") {
    return (
      <Badge variant="destructive" className="font-normal">
        High
      </Badge>
    );
  }
  if (l === "medium") {
    return (
      <Badge variant="warning" className="font-normal">
        Medium
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="font-normal">
      Low
    </Badge>
  );
}

export function ApprovalModal() {
  const [items, setItems] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/approval");
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as ApprovalRow[];
      setItems(data);
    } catch {
      setError("Could not load approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function respond(id: string, status: "approved" | "denied") {
    setActing(id);
    setError(null);
    try {
      const res = await fetch(`/api/approval/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("fail");
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Could not update approval.");
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading approvals…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Pending approvals</h2>
          <p className="text-sm text-muted-foreground">
            High-risk actions wait for your decision. This list refreshes every 10
            seconds.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No pending approvals
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{req.action}</CardTitle>
                    <p className="font-mono text-xs text-muted-foreground">
                      {req.repo}
                      {req.path ? ` · ${req.path}` : ""}
                    </p>
                    {req.reason ? (
                      <p className="text-xs text-amber-400/80">
                        {req.reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {riskBadge(req.riskLevel)}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(req.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button
                  type="button"
                  size="sm"
                  className={cn("gap-1 bg-emerald-600 text-white hover:bg-emerald-600/90")}
                  disabled={acting === req.id}
                  onClick={() => void respond(req.id, "approved")}
                >
                  {acting === req.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  disabled={acting === req.id}
                  onClick={() => void respond(req.id, "denied")}
                >
                  <X className="h-4 w-4" />
                  Deny
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
