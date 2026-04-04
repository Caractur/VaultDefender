import { AuditTable } from "@/components/audit/audit-table";

export default function AuditPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-muted-foreground">
          Immutable record of every tool invocation, policy decision, and approval outcome.
        </p>
      </div>

      <AuditTable />
    </div>
  );
}
