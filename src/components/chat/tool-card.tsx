"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ToolCardPolicy = {
  allowed: boolean;
  riskLevel: string;
  reason: string;
  requiresApproval: boolean;
};

export type ToolCardResult = {
  success?: boolean;
  error?: string;
  data?: unknown;
  policy?: ToolCardPolicy;
};

function truncateJson(data: unknown, max = 400): string {
  try {
    const s = JSON.stringify(data, null, 2);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…`;
  } catch {
    return String(data);
  }
}

function policyBadge(policy: ToolCardPolicy | undefined) {
  if (!policy) {
    return (
      <Badge variant="secondary" className="font-normal">
        No policy
      </Badge>
    );
  }
  if (policy.allowed) {
    return (
      <Badge variant="success" className="font-normal">
        Allowed
      </Badge>
    );
  }
  if (policy.requiresApproval) {
    return (
      <Badge variant="warning" className="font-normal">
        Needs Approval
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="font-normal">
      Blocked
    </Badge>
  );
}

function riskBadge(level: string | undefined) {
  const l = (level || "").toLowerCase();
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

export function ToolCard({
  toolName,
  args,
  result,
}: {
  toolName: string;
  args: Record<string, unknown>;
  result?: ToolCardResult;
}) {
  const [expanded, setExpanded] = useState(false);
  const policy = result?.policy;

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-left shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Wrench className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate font-mono text-sm font-medium">{toolName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {policyBadge(policy)}
          {riskBadge(policy?.riskLevel)}
        </div>
      </div>

      {result?.error ? (
        <p className="mt-2 text-sm text-destructive">{result.error}</p>
      ) : null}

      {result?.success !== false && result?.data !== undefined ? (
        <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs text-muted-foreground">
          {truncateJson(result.data)}
        </pre>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-8 px-2 text-xs text-muted-foreground"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="mr-1 h-3 w-3" />
        ) : (
          <ChevronRight className="mr-1 h-3 w-3" />
        )}
        {expanded ? "Hide" : "Show"} details
      </Button>

      {expanded ? (
        <div className={cn("mt-2 space-y-2 border-t border-border pt-2 text-xs")}>
          <div>
            <p className="mb-1 font-medium text-muted-foreground">Arguments</p>
            <pre className="max-h-40 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-muted-foreground">
              {truncateJson(args, 2000)}
            </pre>
          </div>
          {policy?.reason ? (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Reason: </span>
              {policy.reason}
            </p>
          ) : null}
          {result && "success" in result && result.success === false && !result.error ? (
            <p className="text-destructive">Action was not successful.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
