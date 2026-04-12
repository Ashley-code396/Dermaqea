import { SuiGrpcClient } from "@mysten/sui/grpc";

const GRPC_URLS = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
} as const;

export const networkConfig: Record<string, any> = {
  devnet: new SuiGrpcClient({ network: "devnet", baseUrl: process.env.NEXT_PUBLIC_SUI_GRPC_URL || GRPC_URLS.devnet }),
  testnet: new SuiGrpcClient({ network: "testnet", baseUrl: process.env.NEXT_PUBLIC_SUI_GRPC_URL || GRPC_URLS.testnet }),
  mainnet: new SuiGrpcClient({ network: "mainnet", baseUrl: process.env.NEXT_PUBLIC_SUI_GRPC_URL || GRPC_URLS.mainnet }),
};
