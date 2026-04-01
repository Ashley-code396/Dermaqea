"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function ProtectedDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { connectedAddress } = useWalletSync();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const addr =
        currentAccount?.address ??
        connectedAddress ??
        (typeof window !== "undefined" ? localStorage.getItem("connectedAddress") : null);

      if (!addr) {
        router.push("/create-account/enoki");
        return;
      }

      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const res = await fetch(`${base.replace(/\/$/, "")}/manufacturers/${encodeURIComponent(addr)}`);

        if (!res.ok) {
          // If server returns 404 or other error, redirect to create-account
          router.push("/create-account");
          return;
        }

        const json = await res.json();
        if (!json?.data) {
          router.push("/create-account");
          return;
        }
      } catch (e) {
        // Network error or other failure — treat as not-registered and direct to create-account
        router.push("/create-account");
        return;
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [currentAccount?.address, connectedAddress, router]);

  if (checking) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col">
        <TopBar />
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
