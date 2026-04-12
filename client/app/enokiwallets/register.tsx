"use client";

import { useEffect } from "react";
import { registerEnokiWallets } from "@mysten/enoki";
import { SuiGrpcClient } from "@mysten/sui/grpc";

export function RegisterEnokiWallets() {
  useEffect(() => {
    try {
      const defaultClient = new SuiGrpcClient({
        network: "testnet",
        baseUrl: process.env.NEXT_PUBLIC_SUI_GRPC_URL || "https://fullnode.testnet.sui.io:443",
      });

      registerEnokiWallets({
        apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY ?? "",
        providers: {
          google: { clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "" },
        },
        client: defaultClient as any,
        network: "testnet",
      });

      // mark registration on window for debugging
      try {
        (window as any).__ENOKI_REGISTERED = true;
      } catch {}
    } catch (e) {
      // keep this quiet in production but useful during development
      // eslint-disable-next-line no-console
      console.error("[Enoki] register failed:", e);
    }
  }, []);

  return null;
}
