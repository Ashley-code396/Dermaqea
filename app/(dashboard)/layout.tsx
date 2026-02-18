import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SuiProvider } from "@/components/blockchain/SuiProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuiProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col">
          <TopBar />
          <div className="flex-1 p-8">{children}</div>
        </main>
      </div>
    </SuiProvider>
  );
}
