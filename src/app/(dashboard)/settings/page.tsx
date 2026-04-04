import { GitHubConnection } from "@/components/settings/github-connection";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Auth0 session and Token Vault status.
        </p>
      </div>

      <GitHubConnection />
    </div>
  );
}
