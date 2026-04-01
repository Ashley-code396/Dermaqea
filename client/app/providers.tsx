'use client';

import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { SuiClientProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { WalletProvider } from '@mysten/dapp-kit';
import { WalletSyncProvider } from '@/components/blockchain/WalletSyncProvider';
import { useCurrentClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';
import { EnokiFlowProvider } from '@mysten/enoki/react';

const GRPC_URLS = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet:  'https://fullnode.devnet.sui.io:443',
} as const;

const OVERRIDE_GRPC_URL = process.env.NEXT_PUBLIC_SUI_GRPC_URL;

type Network = keyof typeof GRPC_URLS;

const dAppKit = createDAppKit({
  networks: ['devnet', 'testnet', 'mainnet'],
  defaultNetwork: 'testnet',
  createClient: (network) =>
    new SuiGrpcClient({ network, baseUrl: OVERRIDE_GRPC_URL || GRPC_URLS[network as Network] }),
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

  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isEnokiNetwork(network)) return;

    let mounted = true;

    // Use an async registration flow in case registerEnokiWallets returns a Promise.
    (async () => {
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

      try {
        const maybePromise = registerEnokiWallets({
          apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY ?? 'YOUR_PUBLIC_ENOKI_API_KEY',
          providers: {
            google:   { clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID   ?? 'YOUR_GOOGLE_CLIENT_ID' },
            facebook: { clientId: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID ?? 'YOUR_FACEBOOK_CLIENT_ID' },
            twitch:   { clientId: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID   ?? 'YOUR_TWITCH_CLIENT_ID' },
          },
          client,
          network,
        });

        // Await if the registration returns a Promise
        const result = (maybePromise && typeof (maybePromise as any).then === 'function') ? await (maybePromise as any) : maybePromise;

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

        // Normalize unregister function if provided in several shapes
        let unregisterFn: (() => void) | null = null;
        if (result) {
          if (typeof (result as any).unregister === 'function') {
            unregisterFn = (result as any).unregister.bind(result);
          } else if (typeof result === 'function') {
            unregisterFn = result as any;
          }
        }

        // Save to ref for cleanup
        unregisterRef.current = unregisterFn;

        if (!result && mounted) {
          // eslint-disable-next-line no-console
          console.warn('[Enoki] registerEnokiWallets returned falsy result; registration may have failed or been skipped.');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Enoki] registerEnokiWallets failed:', err);
        // Also provide a helpful hint for configuration issues
        // eslint-disable-next-line no-console
        console.info('[Enoki] Check NEXT_PUBLIC_ENOKI_API_KEY and provider client IDs (NEXT_PUBLIC_GOOGLE_CLIENT_ID, etc.) and ensure redirect URIs are registered with Google/Enoki.');
      }
    })();

    return () => {
      mounted = false;
      try { (window as any).__ENOKI_REGISTERED = false; } catch (e) { /* ignore */ }
      try { if (typeof unregisterRef.current === 'function') unregisterRef.current(); } catch (e) { /* ignore */ }
    };
  }, [client, network]);

  return null;
}

export function SuiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Fail-fast in production if the frontend is built without a backend URL.
  // NEXT_PUBLIC_BACKEND_URL should be set in Vercel (or the hosting environment)
  // to the production API host. If it's missing or points to localhost in
  // production builds, render a helpful error so the app doesn't silently
  // try to call localhost and produce CORS errors.
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && (!backendUrl || backendUrl.includes('localhost'))) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ color: '#b91c1c' }}>Configuration error: backend URL missing</h1>
        <p>
          This deployment is missing the required environment variable
          <code style={{ background: '#f3f4f6', padding: '2px 6px', margin: '0 6px' }}>NEXT_PUBLIC_BACKEND_URL</code>.
        </p>
        <p>
          In production, set <code>NEXT_PUBLIC_BACKEND_URL</code> to your API host (for example
          <code>https://api.dermaqea.example</code>) in your Vercel project settings and redeploy.
        </p>
        <p style={{ color: '#6b7280' }}>
          Current value: {backendUrl ?? <em>undefined</em>}
        </p>
      </div>
    );
  }

  // Provide Sui client context using gRPC clients only (cast to any to satisfy provider typing)
  const networks: Record<string, any> = {
    devnet: new SuiGrpcClient({ network: 'devnet', baseUrl: OVERRIDE_GRPC_URL || GRPC_URLS.devnet }),
    testnet: new SuiGrpcClient({ network: 'testnet', baseUrl: OVERRIDE_GRPC_URL || GRPC_URLS.testnet }),
    mainnet: new SuiGrpcClient({ network: 'mainnet', baseUrl: OVERRIDE_GRPC_URL || GRPC_URLS.mainnet }),
  };

  const createSuiClient = (name: string, config: any) => {
    const baseUrl = OVERRIDE_GRPC_URL || (config && (config.url ?? config.baseUrl)) || GRPC_URLS[name as Network];
    return new SuiGrpcClient({ network: name as Network, baseUrl }) as any;
  };

return (
    <QueryClientProvider client={queryClient}>
      <EnokiFlowProvider apiKey={process.env.NEXT_PUBLIC_ENOKI_API_KEY || ''}>
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
      </EnokiFlowProvider>
    </QueryClientProvider>
  );
}