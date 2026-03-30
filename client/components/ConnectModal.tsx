"use client";

import React from "react";
import { useDAppKit, useWallets } from "@mysten/dapp-kit-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConnectModal() {
  const dAppKit = useDAppKit();
  const wallets = useWallets() || [];

  const handleSelect = async (wallet: any, onClose?: () => void) => {
    try {
      await dAppKit.connectWallet({ wallet: wallet as any });
      if (onClose) onClose();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("connectWallet failed", e);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-full" variant="default">
          Connect Wallet
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Wallet</DialogTitle>
          <DialogDescription>
            Choose a Wallet Standard compatible wallet to connect. Enoki social
            providers will appear here if registered.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-2">
          {wallets.length === 0 && (
            <div className="text-sm text-muted-foreground">No wallets found in this browser.</div>
          )}

          {wallets.map((w: any) => (
            <div key={w.id || w.name} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                {w.icon && (
                  // icon may be a url or react node; render if string
                  typeof w.icon === "string" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.icon} alt={w.name} className="h-8 w-8 rounded-sm" />
                  ) : (
                    <div className="h-8 w-8">{w.icon}</div>
                  )
                )}
                <div className="text-sm">
                  <div className="font-medium">{w.name}</div>
                  {w.description && <div className="text-xs text-muted-foreground">{w.description}</div>}
                </div>
              </div>

              <div>
                <Button onClick={() => handleSelect(w)} size="sm">
                  Connect
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
