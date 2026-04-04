"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ClosePage() {
  useEffect(() => {
    window.close();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">Authorization complete</h1>
        <p className="text-sm text-muted-foreground">
          You can close this window. If it does not close automatically, return
          to chat and try your request again.
        </p>
        <Link
          href="/chat"
          className="inline-flex rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Return to chat
        </Link>
      </div>
    </main>
  );
}
