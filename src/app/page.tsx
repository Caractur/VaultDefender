import { Shield, Lock, FileText, ArrowRight, GitBranch, Eye, ShieldCheck } from "lucide-react";
import { auth0 } from "@/lib/auth/auth0";

export default async function HomePage() {
  const session = await auth0.getSession();

  if (session) {
    const { redirect } = await import("next/navigation");
    redirect("/chat");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">VaultDefender</span>
        </div>
        <a
          href="/auth/login?connection=github"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in with GitHub
        </a>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <ShieldCheck className="h-4 w-4" />
            Least-Privilege by Design
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            AI agent authorization
            <br />
            <span className="text-primary">done right</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            VaultDefender is a least-privilege GitHub agent that combines{" "}
            <strong className="text-foreground">Auth0 Token Vault</strong> for
            delegated GitHub access with an{" "}
            <strong className="text-foreground">app-level policy engine</strong>{" "}
            that restricts what the agent may do inside allowed repositories and
            path prefixes.
          </p>

          <div className="mt-8">
            <a
              href="/auth/login?connection=github"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue with GitHub
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Lock,
              title: "Path-level policies",
              description:
                "GitHub scopes grant repo access. VaultDefender adds finer path-prefix and action restrictions on top.",
            },
            {
              icon: Eye,
              title: "Full audit trail",
              description:
                "Every tool call, policy decision, and approval is logged and visible in a clear dashboard.",
            },
            {
              icon: GitBranch,
              title: "Risk-aware actions",
              description:
                "Actions are classified by risk. High-risk operations require explicit human approval before execution.",
            },
            {
              icon: ShieldCheck,
              title: "Token Vault",
              description:
                "GitHub tokens are stored by Auth0, never by the app. Credentials are fetched on demand and never exposed.",
            },
            {
              icon: Shield,
              title: "Central policy guard",
              description:
                "Every tool invocation passes through a single policy engine before any GitHub API call is made.",
            },
            {
              icon: FileText,
              title: "Transparent boundaries",
              description:
                "Users see exactly what the agent can do, where it can do it, and what requires their approval.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <item.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-xl rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-sm italic text-muted-foreground">
            &ldquo;GitHub permissions are still coarser than many safe AI
            workflows need, so VaultDefender overlays finer app-level path
            policies and approval rules.&rdquo;
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        Built for the Auth0 &ldquo;Authorized to Act&rdquo; Hackathon
      </footer>
    </div>
  );
}
