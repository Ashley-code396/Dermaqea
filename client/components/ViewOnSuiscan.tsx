"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from 'react';

export default function ViewOnSuiscan({ fallbackAddress }: { fallbackAddress?: string }) {
  // To avoid hydration mismatch we prefer the server-provided `fallbackAddress`
  // for the initial render (this is stable server-side). After the component
  // hydrates, if a wallet `connectedAddress` exists we switch to it.
  const [addr, setAddr] = useState<string | undefined>(fallbackAddress ?? undefined);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('connectedAddress') ?? undefined : undefined;
      if (stored) setAddr(stored);
    } catch (e) {
      // ignore
    }
  }, []);

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
