"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditRow = {
  id: string;
  timestamp: string;
  action: string;
  repo: string | null;
  path: string | null;
  riskLevel: string;
  decision: string;
  reason: string | null;
};

type SortKey = keyof Pick<
  AuditRow,
  "timestamp" | "action" | "repo" | "path" | "riskLevel" | "decision" | "reason"
>;

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

function decisionBadge(decision: string) {
  const d = decision.toLowerCase();
  if (d === "allowed" || d === "approved") {
    return (
      <Badge variant="success" className="font-normal">
        Allowed
      </Badge>
    );
  }
  if (d === "pending") {
    return (
      <Badge variant="warning" className="font-normal">
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="font-normal">
      Blocked
    </Badge>
  );
}

export function AuditTable() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/audit");
      if (!res.ok) throw new Error("Unauthorized");
      const data = (await res.json()) as AuditRow[];
      setRows(data);
    } catch {
      setError("Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp =
        sortKey === "timestamp"
          ? new Date(av as string).getTime() - new Date(bv as string).getTime()
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "timestamp" ? "desc" : "asc");
    }
  }

  function SortButton({
    column,
    children,
  }: {
    column: SortKey;
    children: ReactNode;
  }) {
    const active = sortKey === column;
    return (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 font-medium hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => toggleSort(column)}
      >
        {children}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Audit log</h2>
          <p className="text-sm text-muted-foreground">
            Immutable record of policy decisions and tool activity.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No audit entries yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton column="timestamp">Time</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="action">Action</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="repo">Repository</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="path">Path</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="riskLevel">Risk</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="decision">Decision</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="reason">Reason</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDistanceToNow(new Date(row.timestamp), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{row.action}</TableCell>
                  <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                    {row.repo ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate font-mono text-xs">
                    {row.path ?? "—"}
                  </TableCell>
                  <TableCell>{riskBadge(row.riskLevel)}</TableCell>
                  <TableCell>{decisionBadge(row.decision)}</TableCell>
                  <TableCell className="max-w-xs text-muted-foreground">
                    {row.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
