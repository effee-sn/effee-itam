import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSettings } from "@/modules/settings/service";
import { hasPermission } from "@/modules/rbac/permissions";
import { countPendingDiscovered } from "@/modules/inventory/service";
import { SessionProvider } from "@/components/providers/session-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const settings = await getSettings();

  // The notification bell shows a REAL count: devices the inventory agent found that are
  // waiting to be onboarded. Only fetched for roles that can see Discovered.
  const canViewDiscovered = hasPermission(session, "assets.create");
  const pendingCount = canViewDiscovered ? await countPendingDiscovered() : 0;

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar companyName={settings.companyName} logoPath={settings.logoPath} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar pendingCount={pendingCount} canViewDiscovered={canViewDiscovered} />
          <main className="flex-1 overflow-y-auto bg-[#f5f7fa] dark:bg-neutral-950">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
