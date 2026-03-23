"use client";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const NETWORKS = ["localnet", "devnet", "testnet", "mainnet"] as const;
type Network = (typeof NETWORKS)[number];

const DEFAULT_GRPC_URLS: Record<Network, string> = {
  localnet: "http://127.0.0.1:9000",
  devnet: "https://fullnode.devnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
};

const queryClient = new QueryClient();

export function SuiProvider({ children }: { children: React.ReactNode }) {
  const configuredGrpcUrl = process.env.NEXT_PUBLIC_SUI_GRPC_URL;
  const clients = NETWORKS.reduce((acc, network) => {
    const baseUrl = configuredGrpcUrl || DEFAULT_GRPC_URLS[network];
    acc[network] = new SuiGrpcClient({ network, baseUrl });
    return acc;
  }, {} as Record<Network, SuiGrpcClient>);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={clients as any} defaultNetwork="testnet">
        <WalletProvider>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
