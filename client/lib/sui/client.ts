import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig } = createNetworkConfig({
  localnet: { url: "http://127.0.0.1:9000", network: "localnet" },
  devnet: { url: "https://fullnode.devnet.sui.io:443", network: "devnet" },
  testnet: { url: "https://fullnode.testnet.sui.io:443", network: "testnet" },
  mainnet: { url: "https://fullnode.mainnet.sui.io:443", network: "mainnet" },
});

export { networkConfig };
export const DEFAULT_NETWORK = "testnet" as const;
