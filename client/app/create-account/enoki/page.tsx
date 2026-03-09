"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import {
  useConnectWallet,
  useCurrentAccount,
  useWallets,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from "@mysten/enoki";
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";

const LoginFlow = () => {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const { mutateAsync: disconnect } = useDisconnectWallet();
  const wallets = useWallets().filter(isEnokiWallet);

  const walletsByProvider = wallets.reduce(
    (map, wallet) => map.set(wallet.provider, wallet),
    new Map<AuthProvider, EnokiWallet>(),
  );

  const googleWallet = walletsByProvider.get("google");
  const twitchWallet = walletsByProvider.get("twitch");
  const facebookWallet = walletsByProvider.get("facebook");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [enokiReady, setEnokiReady] = useState(false);

  const { setConnectedAddress } = useWalletSync();

  // ─── Wait for Enoki to fully register before allowing any sign-in ───────────
  // Key fix: also check that the wallets are actually populated (not just the
  // global flag), because the redirect_uri is derived from the registered wallet.
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    const check = () => {
      if (cancelled) return;

      const flagReady = typeof window !== "undefined" && (window as any).__ENOKI_REGISTERED;
      // wallets list is populated inside the closure via the outer `wallets` variable
      // but we need a fresh read — re-check via the store instead:
      const walletsReady = wallets.length > 0;

      if (flagReady && walletsReady) {
        setEnokiReady(true);
        return;
      }

      if (Date.now() - start > 8000) {
        // Give up waiting — surface a helpful message
        setError("Sign-in providers took too long to load. Please refresh the page.");
        return;
      }

      setTimeout(check, 150);
    };

    check();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length]); // re-run if wallets suddenly populate

  // ─── Generic connect handler ─────────────────────────────────────────────────
  const handleConnect = useCallback(
    (wallet: EnokiWallet, provider: string) => {
      if (!enokiReady || isLoading) return;

      setIsLoading(true);
      setLoadingProvider(provider);
      setError("");

      connect(
        { wallet },
        {
          onSuccess: () => {
            setIsLoading(false);
            setLoadingProvider(null);
            router.push("/create-account");
          },
          onError: (err: any) => {
            setIsLoading(false);
            setLoadingProvider(null);
            // Don't surface "popup closed" as an error — user just cancelled
            const message: string = err instanceof Error ? err.message : String(err);
            if (!message.toLowerCase().includes("closed") && !message.toLowerCase().includes("cancel")) {
              setError(message || `Failed to connect with ${provider}`);
            }
          },
        },
      );
    },
    [connect, enokiReady, isLoading, router],
  );

  // ─── If already connected, push immediately ──────────────────────────────────
  useEffect(() => {
    if (currentAccount?.address) {
      try { localStorage.setItem("connectedAddress", currentAccount.address); } catch {}
      setConnectedAddress(currentAccount.address);
      router.push("/create-account");
    }
  }, [currentAccount?.address, router, setConnectedAddress]);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      try { localStorage.removeItem("connectedAddress"); } catch {}
      setConnectedAddress(null);
      router.refresh();
    } catch {
      setError("Failed to disconnect");
    }
  };

  // Dismiss error after 6 s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-card/50 text-gray-900 dark:text-gray-100">
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-md">
          <div className="text-center animate-fade-in">
            <div className="bg-gray-50 dark:bg-card border border-gray-100 dark:border-border rounded-2xl p-8 shadow-sm">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Start by connecting your account</p>
                </div>

                {/* ── Loading skeleton shown while Enoki initialises ── */}
                {!enokiReady ? (
                  <div className="pt-2 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-full h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                      />
                    ))}
                    <p className="text-xs text-center text-muted-foreground">
                      Initialising sign-in providers…
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Google */}
                    {googleWallet && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleConnect(googleWallet, "Google")}
                          disabled={isLoading}
                          className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-60"
                        >
                          {loadingProvider === "Google" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <GoogleIcon />
                              Continue with Google
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Social providers */}
                    <div className="mt-2 space-y-3">
                      {facebookWallet ? (
                        <button
                          onClick={() => handleConnect(facebookWallet, "Facebook")}
                          disabled={isLoading}
                          className="w-full bg-[#1877F2] hover:bg-[#166fe0] text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-60"
                        >
                          {loadingProvider === "Facebook" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <FacebookIcon />
                              Sign in with Facebook
                            </>
                          )}
                        </button>
                      ) : (
                        <button disabled className="w-full bg-[#1877F2]/40 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 shadow-sm cursor-not-allowed">
                          <FacebookIcon />
                          Facebook (not available)
                        </button>
                      )}

                      {twitchWallet ? (
                        <button
                          onClick={() => handleConnect(twitchWallet, "Twitch")}
                          disabled={isLoading}
                          className="w-full bg-[#6441A4] hover:bg-[#503285] text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-60"
                        >
                          {loadingProvider === "Twitch" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <TwitchIcon />
                              Sign in with Twitch
                            </>
                          )}
                        </button>
                      ) : (
                        <button disabled className="w-full bg-[#6441A4]/40 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 shadow-sm cursor-not-allowed">
                          <TwitchIcon />
                          Twitch (not available)
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Icons ────────────────────────────────────────────────────────────────────

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

function TwitchIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M4 3v14.5L7 18l2 2 2-2h3l4-4V3H4z" fill="#9146FF"/>
      <path d="M15 7h1v5h-1zM11 7h1v5h-1z" fill="#fff"/>
    </svg>
  );
}

export default LoginFlow;