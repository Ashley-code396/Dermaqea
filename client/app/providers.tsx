"use client";

import '@mysten/dapp-kit/dist/index.css';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterEnokiWallets } from './enokiwallets/register';
import { networkConfig } from './networkConfig'

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider 
          autoConnect
          storage={{
            getItem: (key: string) => sessionStorage.getItem(key),
            setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
            removeItem: (key: string) => sessionStorage.removeItem(key),
          }}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}