"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TOOL_NAMES } from "@/lib/constants";

const TOOL_LABELS: Record<string, string> = {
  [TOOL_NAMES.LIST_REPOS]: "List repos",
  [TOOL_NAMES.READ_FILE]: "Read file",
  [TOOL_NAMES.REVIEW_PR]: "Review PR",
  [TOOL_NAMES.CREATE_BRANCH]: "Create branch",
  [TOOL_NAMES.CREATE_DRAFT_PR]: "Create draft PR",
  [TOOL_NAMES.EDIT_FILE]: "Edit file",
};

const ALL_ACTIONS = Object.values(TOOL_NAMES).map((value) => ({
  value,
  label: TOOL_LABELS[value] ?? value,
}));

type PermissionRow = {
  id: string;
  repoFullName: string;
  allowedPaths: string[];
  allowedActions: string[];
  isActive: boolean;
};

function ActionCheckboxes({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (actions: string[]) => void;
}) {
  function toggle(action: string) {
    onChange(
      selected.includes(action)
        ? selected.filter((a) => a !== action)
        : [...selected, action]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_ACTIONS.map((a) => {
        const active = selected.includes(a.value);
        return (
          <button
            key={a.value}
            type="button"
            onClick={() => toggle(a.value)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

export function RepoPermissions() {
  const [items, setItems] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [prefixes, setPrefixes] = useState("");
  const [addActions, setAddActions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editPaths, setEditPaths] = useState("");
  const [editActions, setEditActions] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/permissions");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as PermissionRow[];
      setItems(data);
    } catch {
      setError("Could not load permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const repoFullName = repoName.trim();
    if (!repoFullName) return;
    const allowedPaths = prefixes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName,
          allowedPaths,
          allowedActions: addActions,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setRepoName("");
      setPrefixes("");
      setAddActions([]);
      setShowAdd(false);
      await load();
    } catch {
      setError("Could not add repository.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/permissions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.filter((p) => p.id !== id));
      if (editId === id) setEditId(null);
    } catch {
      setError("Could not remove repository.");
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive } : p))
    );
    try {
      const res = await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setError("Could not update repository.");
      await load();
    }
  }

  function startEdit(p: PermissionRow) {
    setEditId(p.id);
    setEditPaths(p.allowedPaths.join(", "));
    setEditActions([...p.allowedActions]);
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setError(null);
    const allowedPaths = editPaths
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, allowedPaths, allowedActions: editActions }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditId(null);
      await load();
    } catch {
      setError("Could not save changes.");
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading permissions…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Repositories</h2>
          <p className="text-sm text-muted-foreground">
            Scope allowed paths and actions per repository.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Repository
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {showAdd ? (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add repository</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="repo-name" className="text-sm font-medium">
                    Repository
                  </label>
                  <Input
                    id="repo-name"
                    placeholder="owner/repo"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="prefixes" className="text-sm font-medium">
                    Path prefixes
                  </label>
                  <Input
                    id="prefixes"
                    placeholder="src/, docs/ (comma-separated)"
                    value={prefixes}
                    onChange={(e) => setPrefixes(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Allowed actions{" "}
                  <span className="font-normal text-muted-foreground">
                    (none selected = all allowed)
                  </span>
                </label>
                <ActionCheckboxes
                  selected={addActions}
                  onChange={setAddActions}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No repositories configured yet.
            </CardContent>
          </Card>
        ) : (
          items.map((p) => {
            const isEditing = editId === p.id;

            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base font-mono">
                      {p.repoFullName}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Active
                      </span>
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={(checked) =>
                          void handleToggle(p.id, checked)
                        }
                        aria-label={`Toggle ${p.repoFullName}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {!isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => startEdit(p)}
                        aria-label="Edit repository"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void handleRemove(p.id)}
                      aria-label="Remove repository"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Allowed paths
                        </label>
                        <Input
                          value={editPaths}
                          onChange={(e) => setEditPaths(e.target.value)}
                          placeholder="src/, docs/ (comma-separated, empty = all)"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Allowed actions{" "}
                          <span className="font-normal normal-case">
                            (none = all allowed)
                          </span>
                        </label>
                        <ActionCheckboxes
                          selected={editActions}
                          onChange={setEditActions}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={editSaving}
                          onClick={() => void saveEdit(p.id)}
                          className="gap-1.5"
                        >
                          {editSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Allowed paths
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.allowedPaths.length ? (
                            p.allowedPaths.map((path) => (
                              <Badge
                                key={path}
                                variant="secondary"
                                className="font-mono"
                              >
                                {path}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              All paths
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Allowed actions
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.allowedActions.length ? (
                            p.allowedActions.map((a) => (
                              <Badge key={a} variant="outline">
                                {ALL_ACTIONS.find((x) => x.value === a)
                                  ?.label ?? a}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              All actions
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
