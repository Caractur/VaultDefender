import { RepoPermissions } from "@/components/permissions/repo-permissions";
import { RiskMatrix } from "@/components/permissions/risk-matrix";
import { ApprovalModal } from "@/components/approval/approval-modal";

export default function PermissionsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
        <p className="mt-1 text-muted-foreground">
          Define which repositories, paths, and actions VaultDefender may use.
          These app-level policies are enforced on top of GitHub&apos;s provider-level scopes.
        </p>
      </div>

      <RepoPermissions />
      <RiskMatrix />
      <ApprovalModal />
    </div>
  );
}
