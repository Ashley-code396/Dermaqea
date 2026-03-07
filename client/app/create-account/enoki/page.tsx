"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import {
  useConnectWallet,
  useCurrentAccount,
  useWallets,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from "@mysten/enoki";

const LoginFlow = () => {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: connect } = useConnectWallet();
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
  const [error, setError] = useState("");

  const handleConnectGoogle = async () => {
    if (!googleWallet) return;

    setIsLoading(true);
    setError("");

    try {
      await connect({ wallet: googleWallet });
      router.push("/create-account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      router.refresh();
    } catch (err) {
      setError("Failed to disconnect");
    }
  };

  useEffect(() => {
    if (currentAccount?.address) {
      // If already connected, proceed to create-account
      router.push("/create-account");
    }
  }, [currentAccount, router]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-md">
          <div className="text-center animate-fade-in">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 shadow-sm">
              <div className="space-y-4">
                {/* Google first */}
                {googleWallet && (
                  <button
                    onClick={handleConnectGoogle}
                    className="w-full bg-white hover:bg-white text-gray-900 font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <GoogleIcon />
                        Sign in with Google
                      </>
                    )}
                  </button>
                )}

                {/* Facebook & Twitch */}
                <div className="space-y-3">
                  {facebookWallet ? (
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        setError("");
                        try {
                          await connect({ wallet: facebookWallet });
                          router.push("/create-account");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed to connect with Facebook");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full bg-[#1877F2] hover:bg-[#166fe0] text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-md"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <FacebookIcon />
                          Sign in with Facebook
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setError("Facebook sign-in is not configured")}
                      className="w-full bg-[#1877F2]/80 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-md"
                    >
                      <FacebookIcon />
                      Facebook (not available)
                    </button>
                  )}

                  {twitchWallet ? (
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        setError("");
                        try {
                          await connect({ wallet: twitchWallet });
                          router.push("/create-account");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed to connect with Twitch");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full bg-[#6441A4] hover:bg-[#503285] text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-md"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <TwitchIcon />
                          Sign in with Twitch
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setError("Twitch sign-in is not configured")}
                      className="w-full bg-[#6441A4]/80 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all shadow-md"
                    >
                      <TwitchIcon />
                      Twitch (not available)
                    </button>
                  )}

                </div>

                <div className="mt-6 p-4 bg-white/50 rounded-lg border border-gray-200/30">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span>Secured by zkLogin & Enoki</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600/90 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

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
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H8.9v-2.89h1.54V9.69c0-1.52.9-2.36 2.28-2.36.66 0 1.35.12 1.35.12v1.49h-.76c-.75 0-.98.47-.98.95v1.15h1.67l-.27 2.89h-1.4v6.99C18.34 21.12 22 16.99 22 12z" fill="#fff" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 3v14.5L7 18l2 2 2-2h3l4-4V3H4z" fill="#9146FF" />
      <path d="M15 7h1v5h-1zM11 7h1v5h-1z" fill="#fff" />
    </svg>
  );
}

export default LoginFlow;