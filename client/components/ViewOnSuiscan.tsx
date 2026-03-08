"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";

export default function ViewOnSuiscan({ fallbackAddress }: { fallbackAddress?: string }) {
  const { connectedAddress } = useWalletSync();
  const addr = connectedAddress ?? fallbackAddress ?? "";
  const href = addr ? `https://suiscan.xyz/testnet/account/${addr}` : "https://suiscan.xyz/testnet";

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer" className="gap-2">
        View on Suiscan
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
}
