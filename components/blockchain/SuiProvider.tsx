"use client";

import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

const { networkConfig } = createNetworkConfig({
  localnet: { url: getJsonRpcFullnodeUrl("localnet"), network: "localnet" },
  devnet: { url: getJsonRpcFullnodeUrl("devnet"), network: "devnet" },
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" },
  mainnet: { url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" },
});

const queryClient = new QueryClient();

export function SuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
