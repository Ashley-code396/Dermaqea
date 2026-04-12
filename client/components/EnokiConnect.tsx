"use client";

import React, { useState, useEffect } from "react";
import {
  useConnectWallet,
  useCurrentAccount,
  useWallets,
} from "@mysten/dapp-kit";
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from "@mysten/enoki";
import { Loader2 } from "lucide-react";

export default function EnokiConnect() {
  const currentAccount = useCurrentAccount();
  const { mutate: connect, isPending } = useConnectWallet();
  const [enokiReady, setEnokiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get fresh wallets array
  const allWallets = useWallets();
  const wallets = allWallets.filter(isEnokiWallet) as EnokiWallet[];
  
  const walletsByProvider = wallets.reduce(
    (map, wallet) => map.set(wallet.provider, wallet),
    new Map<AuthProvider, EnokiWallet>(),
  );
  
  const googleWallet = walletsByProvider.get("google");
  const facebookWallet = walletsByProvider.get("facebook");
  
  // Wait for Enoki to be ready
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    
    const check = () => {
      if (cancelled) return;
      
      const flagReady = typeof window !== "undefined" && (window as any).__ENOKI_REGISTERED;
      const walletsReady = wallets.length > 0;
      
      if (flagReady && walletsReady) {
        setEnokiReady(true);
        return;
      }
      
      if (Date.now() - start > 8000) {
        setError("Sign-in providers took too long to load. Please refresh the page.");
        return;
      }
      
      setTimeout(check, 150);
    };
    
    check();
    return () => { cancelled = true; };
  }, [wallets.length]);
  
  if (currentAccount) {
    return <div>Connected: {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}</div>;
  }
  
  if (!enokiReady) {
    return (
      <div className="pt-2 space-y-3">
        <div className="w-full h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="w-full h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <p className="text-xs text-center text-muted-foreground">
          Initialising sign-in providers…
        </p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 flex flex-col gap-3">
      {error && (
        <div className="text-red-600 text-sm text-center">{error}</div>
      )}
      
      {googleWallet ? (
        <button
          className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-60"
          disabled={isPending}
          onClick={() => {
            setError(null);
            connect({ wallet: googleWallet }, {
              onError: (err: any) => {
                const message = err instanceof Error ? err.message : String(err);
                if (!message.toLowerCase().includes("closed") && 
                    !message.toLowerCase().includes("cancel")) {
                  setError(message || "Failed to connect with Google");
                }
              },
            });
          }}
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>
      ) : (
        <div className="text-yellow-600 text-sm text-center">
          Google login not configured
        </div>
      )}
      
      {facebookWallet && (
        <button
          className="w-full bg-[#1877F2] hover:bg-[#166fe0] text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-60"
          disabled={isPending}
          onClick={() => {
            connect({ wallet: facebookWallet });
          }}
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <FacebookIcon />
              Sign in with Facebook
            </>
          )}
        </button>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H8.9v-2.89h1.54V9.69c0-1.52.9-2.36 2.28-2.36.66 0 1.35.12 1.35.12v1.49h-.76c-.75 0-.98.47-.98.95v1.15h1.67l-.27 2.89h-1.4v6.99C18.34 21.12 22 16.99 22 12z" fill="#fff"/>
    </svg>
  );
}