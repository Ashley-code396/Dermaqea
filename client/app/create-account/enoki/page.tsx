"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import EnokiConnect from "@/components/EnokiConnect";

export default function EnokiLoginPage() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    if (currentAccount?.address) {
      try { localStorage.setItem("connectedAddress", currentAccount.address); } catch {}
      try { sessionStorage.setItem("connectedAddress", currentAccount.address); } catch {}
      router.push("/create-account");
    }
  }, [currentAccount?.address, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-card/50 text-gray-900 dark:text-gray-100">
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-md">
          <div className="text-center animate-fade-in">
            <div className="bg-gray-50 dark:bg-card border border-gray-100 dark:border-border rounded-2xl p-8 shadow-sm">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Start by connecting your account</p>
                </div>

                <div className="pt-2">
                  <EnokiConnect />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div id="enoki-info-portal" />
    </div>
  );
}
