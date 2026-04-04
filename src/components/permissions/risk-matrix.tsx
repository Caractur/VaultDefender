"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TOOL_NAMES } from "@/lib/constants";

const TOOL_LABELS: Record<string, string> = {
  [TOOL_NAMES.LIST_REPOS]: "List repos",
  [TOOL_NAMES.READ_FILE]: "Read files",
  [TOOL_NAMES.REVIEW_PR]: "Review PRs",
  [TOOL_NAMES.CREATE_BRANCH]: "Create branch",
  [TOOL_NAMES.CREATE_DRAFT_PR]: "Create draft PR",
};

const columns = [
  {
    title: "Low risk",
    risk: "Low",
    actions: [
      TOOL_LABELS[TOOL_NAMES.LIST_REPOS],
      TOOL_LABELS[TOOL_NAMES.READ_FILE],
      TOOL_LABELS[TOOL_NAMES.REVIEW_PR],
    ],
    headerClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  {
    title: "Medium risk",
    risk: "Medium",
    actions: [
      TOOL_LABELS[TOOL_NAMES.CREATE_BRANCH],
      TOOL_LABELS[TOOL_NAMES.CREATE_DRAFT_PR],
    ],
    headerClass: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    dotClass: "bg-amber-500",
  },
  {
    title: "High risk (contextual)",
    risk: "High",
    actions: [
      "Write to protected branches",
      "Touch CI/CD or sensitive paths",
      "Actions outside allowed path prefixes",
    ],
    headerClass: "border-red-500/40 bg-red-500/10 text-red-400",
    dotClass: "bg-red-500",
  },
] as const;

export function RiskMatrix() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Risk classification</h2>
        <p className="text-sm text-muted-foreground">
          Actions are grouped by impact and blast radius. Any action can be
          elevated to High when it targets a sensitive path or protected branch.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <Card key={col.risk} className="overflow-hidden border-border">
            <CardHeader className={cn("border-b pb-3", col.headerClass)}>
              <div className="flex items-center gap-2">
                <span
                  className={cn("h-2 w-2 rounded-full", col.dotClass)}
                  aria-hidden
                />
                <CardTitle className="text-base">{col.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2 text-sm">
                {col.actions.map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-2 rounded-md border border-border/60 bg-card/50 px-3 py-2"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    {a}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        High-risk actions require explicit approval before execution. Approvals
        expire after 10 minutes.
      </p>
    </div>
  );
}
