import { prisma } from "@/lib/db";

type PermissionLookup = {
  id: string;
  repoFullName: string;
  allowedPaths: string;
  allowedActions: string;
  isActive: boolean;
};

export type RepoResolution =
  | { kind: "matched"; permission: PermissionLookup }
  | { kind: "inactive"; permission: PermissionLookup }
  | { kind: "ambiguous"; requestedRepo: string; matches: string[] }
  | { kind: "missing"; requestedRepo: string };

function normalizeRepoReference(value: string): string {
  return value.trim().toLowerCase();
}

function getShortRepoName(repoFullName: string): string {
  const parts = repoFullName.split("/");
  return parts[parts.length - 1] || repoFullName;
}

function findMatches(
  permissions: PermissionLookup[],
  requestedRepo: string
): PermissionLookup[] {
  const normalizedRequested = normalizeRepoReference(requestedRepo);

  const fullMatches = permissions.filter(
    (permission) =>
      normalizeRepoReference(permission.repoFullName) === normalizedRequested
  );
  if (fullMatches.length > 0 || requestedRepo.includes("/")) {
    return fullMatches;
  }

  return permissions.filter(
    (permission) =>
      normalizeRepoReference(getShortRepoName(permission.repoFullName)) ===
      normalizedRequested
  );
}

export async function resolveRepoPermission(
  userId: string,
  requestedRepo: string
): Promise<RepoResolution> {
  const trimmedRepo = requestedRepo.trim();
  const permissions = await prisma.permission.findMany({
    where: { userId },
    select: {
      id: true,
      repoFullName: true,
      allowedPaths: true,
      allowedActions: true,
      isActive: true,
    },
  });

  const matches = findMatches(permissions, trimmedRepo);

  if (matches.length === 0) {
    return { kind: "missing", requestedRepo: trimmedRepo };
  }

  if (matches.length > 1) {
    return {
      kind: "ambiguous",
      requestedRepo: trimmedRepo,
      matches: matches
        .map((permission) => permission.repoFullName)
        .sort((a, b) => a.localeCompare(b)),
    };
  }

  const permission = matches[0];
  if (!permission.isActive) {
    return { kind: "inactive", permission };
  }

  return { kind: "matched", permission };
}
