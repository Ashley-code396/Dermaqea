"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useCurrentAccount, useConnectWallet, useWallets } from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";

function short(addr?: string | null) {
  if (!addr) return "-";
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

export function ConnectionBanner() {
  const currentAccount = useCurrentAccount();
  const { connectedAddress } = useWalletSync();
  const { mutate: connectWallet } = useConnectWallet();
  const wallets = useWallets();

  const address = currentAccount?.address ?? connectedAddress ?? null;

  const handleConnect = async () => {
    if (!wallets || wallets.length === 0) {
      // nothing to connect to — instruct user to install/enable a wallet
      alert("No wallets detected in this browser. Install a Wallet Standard wallet (Enoki, Martian, etc.) and try again.");
      return;
    }

    try {
      const preferred = wallets.find((wallet) => isEnokiWallet(wallet as any)) ?? wallets[0];
      await connectWallet({ wallet: preferred });
    } catch (e) {
      console.warn("Connection attempt failed", e);
      alert("Unable to open wallet. Please open your wallet and connect manually.");
    }
  };

  // If connected, show green connected banner. If remembered but not connected,
  // show yellow hint with a Connect button. If neither, show neutral with install hint.
  if (address) {
    return (
      <div className="w-full bg-green-50 border-b border-green-100 text-green-900 px-8 py-2 text-sm">
        Connected: <span className="font-mono">{short(address)}</span>
      </div>
    );
  }

  if (connectedAddress) {
    return (
      <div className="w-full bg-yellow-50 border-b border-yellow-100 text-yellow-900 px-8 py-2 text-sm flex items-center justify-between">
        <div>
          Remembered address: <span className="font-mono">{short(connectedAddress)}</span> — open your wallet and connect to sign transactions.
        </div>
        <div>
          <Button size="sm" onClick={handleConnect}>Connect</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-muted/50 border-b border-border text-muted-foreground px-8 py-2 text-sm flex items-center justify-between">
      <div>No wallet connected</div>
      <div>
        <Button size="sm" onClick={handleConnect}>Connect Wallet</Button>
      </div>
    </div>
  );
}
