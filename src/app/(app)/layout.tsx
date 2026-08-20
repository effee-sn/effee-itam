import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSettings } from "@/modules/settings/service";
import { SessionProvider } from "@/components/providers/session-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const settings = await getSettings();

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar companyName={settings.companyName} logoPath={settings.logoPath} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
