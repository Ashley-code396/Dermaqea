"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

type WalletSyncContextType = {
  connectedAddress: string | null;
  setConnectedAddress: (addr: string | null) => void;
};

const WalletSyncContext = createContext<WalletSyncContextType | undefined>(undefined);

export function WalletSyncProvider({ children }: { children: React.ReactNode }) {
  const currentAccount = useCurrentAccount();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("connectedAddress") : null;
    } catch (e) {
      return null;
    }
  });

  // Sync dapp-kit current account into localStorage and provider state
  useEffect(() => {
    const addr = currentAccount?.address ?? null;
    if (addr) {
      try {
        localStorage.setItem("connectedAddress", addr);
      } catch (e) {
        // ignore storage errors
      }
      setConnectedAddress(addr);
    }
  }, [currentAccount?.address]);

  // Keep local changes in localStorage
  const setAndStore = (addr: string | null) => {
    try {
      if (addr) localStorage.setItem("connectedAddress", addr);
      else localStorage.removeItem("connectedAddress");
    } catch (e) {
      // ignore
    }
    setConnectedAddress(addr);
  };

  return (
    <WalletSyncContext.Provider value={{ connectedAddress, setConnectedAddress: setAndStore }}>
      {children}
    </WalletSyncContext.Provider>
  );
}

export function useWalletSync() {
  const ctx = useContext(WalletSyncContext);
  if (!ctx) throw new Error("useWalletSync must be used within WalletSyncProvider");
  return ctx;
}
