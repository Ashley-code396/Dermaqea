import { SuiProvider } from "@/components/blockchain/SuiProvider";
import ProtectedDashboard from "@/components/layout/ProtectedDashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuiProvider>
      <ProtectedDashboard>{children}</ProtectedDashboard>
    </SuiProvider>
  );
}
