'use client';

import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { SuiClientProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { WalletProvider } from '@mysten/dapp-kit';
import { WalletSyncProvider } from '@/components/blockchain/WalletSyncProvider';
import { useCurrentClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';

const GRPC_URLS = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet:  'https://fullnode.devnet.sui.io:443',
} as const;

type Network = keyof typeof GRPC_URLS;

const dAppKit = createDAppKit({
  networks: ['devnet', 'testnet', 'mainnet'],
  defaultNetwork: 'testnet',
  createClient: (network) =>
    new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network as Network] }),
});

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}

function RegisterEnokiWallets() {
  // Use the gRPC client provided by DAppKit (SuiGrpcClient)
  const client = useCurrentClient();
  const network = useCurrentNetwork();

  useEffect(() => {
    if (!isEnokiNetwork(network)) return;

    // Wrap registration in try/catch and log errors to help diagnose registration failures.
    try {
      // Log environment and runtime hints to aid debugging when registration fails.
      // Avoid printing secret values; only log presence flags.
      // eslint-disable-next-line no-console
      console.log('[Enoki] registerEnokiWallets: starting', {
        network,
        hasApiKey: !!process.env.NEXT_PUBLIC_ENOKI_API_KEY,
        hasGoogleId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        hasFacebookId: !!process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
        hasTwitchId: !!process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
      });

      const result = registerEnokiWallets({
        apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY ?? 'YOUR_PUBLIC_ENOKI_API_KEY',
        providers: {
          google:   { clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID   ?? 'YOUR_GOOGLE_CLIENT_ID' },
          facebook: { clientId: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID ?? 'YOUR_FACEBOOK_CLIENT_ID' },
          twitch:   { clientId: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID   ?? 'YOUR_TWITCH_CLIENT_ID' },
        },
        client,
        network,
      });

      // registerEnokiWallets may return an unregister function or an object with unregister.
      // Only mark Enoki as registered if we received a truthy result.
      try {
        const ok = !!result;
        (window as any).__ENOKI_REGISTERED = ok;
        // eslint-disable-next-line no-console
        console.log('[Enoki] registerEnokiWallets: result', { ok, resultType: typeof result });
      } catch (e) {
        // ignore in non-browser environments
      }

      // Create a cleanup wrapper that will unset the flag and then call the original unregister
      const makeCleanup = (orig?: (() => void) | null) => {
        return () => {
          try { (window as any).__ENOKI_REGISTERED = false; } catch (e) {}
          try { if (typeof orig === 'function') orig(); } catch (e) { /* ignore */ }
        };
      };

      if (result && typeof (result as any).unregister === 'function') {
        return makeCleanup((result as any).unregister.bind(result));
      }

      // If the call returned a function directly, return a wrapped cleanup
      if (typeof result === 'function') {
        return makeCleanup(result as any);
      }

      // Otherwise return a cleanup that only unsets the flag
      return makeCleanup();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Enoki] registerEnokiWallets failed:', err);
      // Also provide a helpful hint for configuration issues
      // eslint-disable-next-line no-console
      console.info('[Enoki] Check NEXT_PUBLIC_ENOKI_API_KEY and provider client IDs (NEXT_PUBLIC_GOOGLE_CLIENT_ID, etc.) and ensure redirect URIs are registered with Google/Enoki.');
    }
    return undefined;
  }, [client, network]);

  return null;
}

export function SuiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Provide Sui client context using gRPC clients only (cast to any to satisfy provider typing)
  const networks: Record<string, any> = {
    devnet: new SuiGrpcClient({ network: 'devnet', baseUrl: GRPC_URLS.devnet }),
    testnet: new SuiGrpcClient({ network: 'testnet', baseUrl: GRPC_URLS.testnet }),
    mainnet: new SuiGrpcClient({ network: 'mainnet', baseUrl: GRPC_URLS.mainnet }),
  };

  const createSuiClient = (name: string, config: any) => {
    const baseUrl = (config && (config.url ?? config.baseUrl)) ?? GRPC_URLS[name as Network];
    return new SuiGrpcClient({ network: name as Network, baseUrl }) as any;
  };

return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks as any} createClient={createSuiClient as any} defaultNetwork="testnet">
        <DAppKitProvider dAppKit={dAppKit}>
          <RegisterEnokiWallets />
          <WalletProvider autoConnect>
            {/* WalletSyncProvider keeps a persisted copy of the connected address in localStorage
                and exposes it to the app. */}
            <WalletSyncProvider>
              {children}
            </WalletSyncProvider>
          </WalletProvider>
        </DAppKitProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}