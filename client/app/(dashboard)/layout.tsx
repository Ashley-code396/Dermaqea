import ProtectedDashboard from "@/components/layout/ProtectedDashboard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The app-level providers are applied in `app/providers.tsx`. This layout
  // no longer needs a local `SuiProvider` wrapper.
  return <ProtectedDashboard>{children}</ProtectedDashboard>;
}
