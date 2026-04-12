"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function ProtectedDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const [storedAddr, setStoredAddr] = useState<string | null>(null);
  useEffect(() => {
    try {
      // Prefer sessionStorage (set by the Enoki login flow) but fall back to localStorage
      const sess = typeof window !== "undefined" ? sessionStorage.getItem("connectedAddress") : null
      setStoredAddr(sess);
    } catch (e) {
      // ignore
    }
  }, []);
  const connectedAddress = storedAddr;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const addr =
        currentAccount?.address ??
        connectedAddress ??
        // Also check sessionStorage at runtime in case the login flow just set it.
        (typeof window !== "undefined" ? sessionStorage.getItem("connectedAddress") : null) ??
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
  }, [currentAccount?.address, router]);

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
