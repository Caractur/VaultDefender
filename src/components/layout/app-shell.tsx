import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background md:flex-row">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
