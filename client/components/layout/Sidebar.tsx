"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, User, Settings, Boxes, Smartphone, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import useManufacturer from "@/lib/useManufacturer";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/guide", label: "Consumer Experience", icon: Smartphone },
  { href: "/extractor", label: "Extract & Verify", icon: FileSearch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const currentAccount = useCurrentAccount();
  const [storedAddr, setStoredAddr] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStoredAddr(typeof window !== "undefined" ? sessionStorage.getItem("connectedAddress") : null);
    } catch (e) {
      // ignore
    }
  }, []);
  const acctAddr = currentAccount?.address ?? storedAddr ?? null;
  const { manufacturer } = useManufacturer(acctAddr);

  // Determine current network from public env var (matches Providers defaultNetwork)
  const currentNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK as string) || 'testnet';

    const isVerified = !!(
      manufacturer && (
        manufacturer.verified === true || manufacturer.verificationStatus === 'VERIFIED'
      )
    );

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      setMounted(true);
    }, []);

    // To avoid hydration mismatches, do NOT show dynamic wallet address until after mount.
    const connectedAddr = mounted
      ? (acctAddr ?? (manufacturer ? (manufacturer.sui_address ?? manufacturer.suiWalletAddress) : null) ?? "")
      : "";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-semibold text-primary" style={{ fontFamily: "var(--font-syne)" }}>
            Dermaqea
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-l-4 border-l-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              style={isActive ? { borderLeftColor: "#3DDC84" } : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
          <div className="rounded-lg bg-secondary/50 p-3">
          <div className="mb-1 flex items-center gap-2">
            <div
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                isVerified
                  ? "bg-primary/20 text-primary"
                  : "bg-warning/20 text-warning"
              )}
              style={
                isVerified ? { boxShadow: "0 0 12px #3DDC8440" } : undefined
              }
            >
                {isVerified ? "Verified" : "Pending"}
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {(() => {
                const addr = connectedAddr;
              if (!addr) return "Not connected";
              if (addr.length <= 12) return addr;
              return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
            })()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{typeof currentNetwork === 'string' ? ((currentNetwork as string).charAt(0).toUpperCase() + (currentNetwork as string).slice(1)) : 'Unknown'}</p>
        </div>
      </div>
    </aside>
  );
}
