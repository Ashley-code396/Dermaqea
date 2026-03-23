"use client";

import React, { useState, useEffect } from "react";
import { useConnectWallet, useCurrentAccount, useSignTransaction, useWallets } from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
import { toast } from 'sonner';
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";
import { useFieldArray, useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

type Item = {
  manufacture_date: string;
  expiry_date: string;
};

type FormValues = {
  brand_wallet?: string;
  product_name: string;
  items: Item[];
};

export default function NewProductPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet } = useConnectWallet();
  const signTx = useSignTransaction();
  const { connectedAddress } = useWalletSync();
  const effectiveAddress = currentAccount?.address ?? connectedAddress ?? "";
  const availableWallets = useWallets();
  const reconnectEnoki = async () => {
    const enokiWallet = (availableWallets || []).find((w: any) => isEnokiWallet(w));
    if (!enokiWallet) return false;
    return await new Promise<boolean>((resolve) => {
      connectWallet(
        { wallet: enokiWallet as any },
        {
          onSuccess: () => resolve(true),
          onError: () => resolve(false),
        },
      );
    });
  };
  const signWithReconnect = async (transaction: string) => {
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const signed = await signTx.mutateAsync({ transaction });
        const signature = (signed as any)?.signature as string | undefined;
        if (!signature) throw new Error("Signature missing from wallet response.");
        return signature;
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message ?? "");
        if (!(msg.includes("No wallet is connected") || msg.includes("WalletNotConnected"))) throw err;
        // eslint-disable-next-line no-await-in-loop
        await reconnectEnoki();
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    throw lastErr ?? new Error("Wallet not ready for signing.");
  };
  // helper: poll for signer/provider presence without opening popups
  const waitForSigner = async (timeoutMs = 15000, intervalMs = 1000) => {
    const start = Date.now();
    const tId = toast.loading('Waiting for Enoki to be available to sign...');
    try {
      while (Date.now() - start < timeoutMs) {
      // allow either live dapp-kit account or remembered wallet address
      const signerAddr = currentAccount?.address ?? connectedAddress;
        const signerReady = !!signTx?.mutateAsync && !!signerAddr;
        if (signerReady) {
          toast.success('Enoki available — proceeding to sign');
          return true;
        }
        // wait and poll
        if ((window as any).__ENOKI_REGISTERED && !currentAccount?.address) {
          // Best effort reconnect if wallet session is stale.
          // eslint-disable-next-line no-await-in-loop
          await reconnectEnoki();
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      toast.error('Timed out waiting for Enoki. Please open Enoki and ensure it is connected to this site.');
      return false;
    } finally {
      toast.dismiss(tId);
    }
  };

  const form = useForm<FormValues>({
    defaultValues: { product_name: "", items: [{ manufacture_date: "", expiry_date: "" }] },
  });

  const { control, handleSubmit, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const [attachedFileInfo, setAttachedFileInfo] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [backendResponse, setBackendResponse] = useState<any>(null);
  const [minting, setMinting] = useState<Record<string, boolean>>({});
  const [autoMint, setAutoMint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setAttachedFile(file);
    setAttachedFileInfo(`${file.name} (${Math.round(file.size / 1024)} KB)`);
  };

  const onSubmit = async (values: FormValues) => {
    if (!attachedFile) {
      alert("Please attach a CSV/XLSX file with serials.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", attachedFile);
  formData.append("product_name", values.product_name);
  // Use the live connected address (dapp-kit currentAccount preferred, fallback to persisted connectedAddress)
  const brandWalletToSend = effectiveAddress;
  if (!brandWalletToSend) throw new Error("No connected wallet address. Please connect your wallet before submitting.");
  formData.append("brand_wallet", brandWalletToSend);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/products/upload-batch`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload batch");
      }

      const data = await res.json();
      setBackendResponse(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };


  const handleMintBatch = async (batchId: string) => {
    setMinting((s) => ({ ...s, [batchId]: true }));
    try {
      // Debug: log wallet state to help diagnose why the client believes
      // there's no connected wallet even when Enoki/zkLogin is used.
      try {
        // eslint-disable-next-line no-console
        console.log('[Mint] currentAccount', currentAccount);
        // eslint-disable-next-line no-console
        console.log('[Mint] connectedAddress (from WalletSync)', connectedAddress);
        // eslint-disable-next-line no-console
        console.log('[Mint] signTx (useSignTransaction)', signTx);
        // eslint-disable-next-line no-console
        console.log('[Mint] signTx.mutateAsync exists?', typeof signTx?.mutateAsync);
        // eslint-disable-next-line no-console
        console.log('[Mint] window.__ENOKI_REGISTERED', (window as any).__ENOKI_REGISTERED);
      } catch (e) {
        // ignore console errors
      }

      const signer = currentAccount?.address ?? connectedAddress ?? null;
      if (!signer) {
        return alert("No wallet address found. Connect Enoki and retry.");
      }

      // signing requires the signTx hook from dapp-kit to be functional. If the
      // address is present in localStorage but the dapp-kit signer is not available
      // the user must open their wallet and connect to the dApp so the page can prompt
      // for the signature.
      if (!signTx?.mutateAsync) {
        // Provide more actionable diagnostic information so the user (or dev) can see what's available.
        return alert("Wallet signer unavailable. Reconnect Enoki and retry.");
      }

      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
      const resp = await fetch(`${base.replace(/\/$/, "")}/batches/${batchId}/mint`, { method: 'POST' });
      if (!resp.ok) {
        let bodyText = await resp.text();
        try {
          const json = JSON.parse(bodyText);
          // If server returns structured error, show a friendly toast
          if (resp.status === 409 && json?.message?.toLowerCase().includes('duplicate')) {
            toast.error('Mint rejected: one or more serial numbers in this batch are already minted on-chain. Please check your CSV and try again.');
          } else {
            toast.error(`Mint failed: ${json?.message ?? bodyText}`);
          }
        } catch (e) {
          toast.error(`Mint failed: ${resp.status} ${bodyText}`);
        }
        throw new Error(`Mint failed: ${resp.status} ${bodyText}`);
      }

      const sponsored = await resp.json();
  // sign with connected wallet
      const signature = await signWithReconnect(sponsored.bytes);

      const exec = await fetch(`${base.replace(/\/$/, "")}/enoki/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digest: sponsored.digest, signature }),
      });

      if (!exec.ok) {
        const txt = await exec.text();
        throw new Error(`Execute failed: ${exec.status} ${txt}`);
      }

  const json = await exec.json();
  console.log('Mint result', json);
  const txDigest = json?.digest ?? sponsored.digest;
  const suiscanUrl = `https://suiscan.xyz/testnet/transaction/${txDigest}`;
  try { window.open(suiscanUrl, '_blank'); } catch (e) {}
  alert(`Batch minted — transaction digest: ${txDigest}. View on Suiscan.`);
    } catch (e: any) {
      console.error(e);
      alert(`Batch mint failed: ${e?.message ?? String(e)}`);
    } finally {
      setMinting((s) => ({ ...s, [batchId]: false }));
    }
  };

  const generateAndDownloadTemplate = () => {
    const headers = ["serial_number", "batch_number", "manufacture_date", "expiry_date"];
    const exampleRows = [
      ["SN0001", "BATCH-A", "2026-01-01", "2027-01-01"],
      ["SN0002", "BATCH-A", "2026-02-01", "2027-02-01"],
    ];

    const csv = [headers.join(",")].concat(exampleRows.map((r) => r.join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dermaqea-products-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // After a successful backend response, if autoMint is enabled, mint each returned batch sequentially.
  useEffect(() => {
    if (!autoMint) return;
    if (!backendResponse || !Array.isArray(backendResponse.batches)) return;

    const mintAll = async () => {
      for (const b of backendResponse.batches) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await handleMintBatch(b.id);
        } catch (e) {
          // continue on error; handleMintBatch already alerts/logs
        }
      }
    };

    void mintAll();
  }, [backendResponse, autoMint]);

  return (
    <div className="space-y-6 ml-4 md:ml-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Submit New Product (batch)</h2>
        <Button variant="outline" asChild>
          <Link href="/products">Back</Link>
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormItem>
                <FormLabel>Brand wallet (connected)</FormLabel>
                <FormControl>
                  <Input
                    value={effectiveAddress}
                    readOnly
                    placeholder="Not connected"
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                  />
                </FormControl>
                <FormDescription>The currently connected wallet address will be used as the brand owner on-chain.</FormDescription>
              </FormItem>

              <FormItem>
                <FormLabel>Product name</FormLabel>
                <FormControl>
                  <Input
                    {...register("product_name", { required: true })}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                  />
                </FormControl>
              </FormItem>

              <div className="mt-2">
                <label className="block text-sm">Upload serials (CSV, XLSX)</label>
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                />
                {attachedFileInfo && <p className="text-xs text-muted-foreground mt-1">{attachedFileInfo}</p>}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={generateAndDownloadTemplate}>Download CSV template</Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Batch"}</Button>
                <Button variant="outline" type="button" onClick={() => { form.reset(); setBackendResponse(null); setAttachedFile(null); setAttachedFileInfo(null); }}>
                  Reset
                </Button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input id="autoMint" type="checkbox" className="h-4 w-4" checked={autoMint} onChange={(e) => setAutoMint(e.target.checked)} />
                <label htmlFor="autoMint" className="text-sm">Automatically mint created batches after upload</label>
              </div>
            </form>
          </Form>

          {error && <p className="mt-2 text-sm text-destructive">Error: {error}</p>}

          {/* Quick Enoki debug + action panel */}
          <div className="mt-4 p-3 rounded-md bg-muted text-sm">
            <div className="mb-2 font-medium">Wallet status</div>
            <div className="text-xs">Detected address: <span className="font-mono">{effectiveAddress || 'none'}</span></div>
            <div className="text-xs">Enoki registered: <span className="font-mono">{(window as any).__ENOKI_REGISTERED ? 'true' : 'false'}</span></div>
            <div className="text-xs">Available wallets: <span className="font-mono">{(availableWallets || []).map((w:any)=>w.walletName || w.name).join(', ') || 'none'}</span></div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { window.location.reload(); }}>Refresh page</Button>
              <Button size="sm" onClick={async () => {
                // Do not open a wallet popup. Instead, show toasts and poll for the
                // provider to become available. When available, the user can retry
                // the mint and it will sign without a popup.
                const ok = await waitForSigner();
                if (!ok) {
                  // already notified via toast
                }
              }}>Wait for Enoki</Button>
            </div>
          </div>

          {backendResponse && (
            <div className="mt-6">
              <h4 className="font-medium">Backend response</h4>
              <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-sm">
                {JSON.stringify(backendResponse, null, 2)}
              </pre>
              {backendResponse.batches && backendResponse.batches.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium">Actions</h5>
                  <div className="mt-2 flex flex-col gap-2">
                    {backendResponse.batches.map((b: any) => (
                      <div key={b.id} className="flex items-center gap-2">
                        <div className="flex-1 text-sm">Batch <span className="font-mono">{b.batchNumber}</span> — {b.unitsProduced} units</div>
                        <Button size="sm" onClick={() => void handleMintBatch(b.id)} disabled={!!minting[b.id]}>
                          {minting[b.id] ? 'Minting…' : 'Mint this batch'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}