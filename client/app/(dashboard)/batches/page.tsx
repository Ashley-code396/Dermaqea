"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useConnectWallet, useCurrentAccount, useSignTransaction, useWallets } from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
import { toast } from 'sonner';
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";
import type { Batch } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Boxes, Plus } from "lucide-react";

const statusVariant = {
  active: "default",
  recalled: "secondary",
  stolen: "destructive",
  expired: "secondary",
} as const;

export default function BatchesPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet } = useConnectWallet();
  const signTransaction = useSignTransaction();
  const availableWallets = useWallets();
  const { connectedAddress } = useWalletSync();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [minting, setMinting] = useState<Record<string, boolean>>({});
  const [minted, setMinted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        const signed = await signTransaction.mutateAsync({ transaction });
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

  // Reusable loader so we can refresh after a successful mint
  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
      const res = await fetch(`${base.replace(/\/$/, "")}/batches`);
      if (!res.ok) throw new Error(`Failed to fetch batches: ${res.status}`);
      const list = await res.json();
      // sort by manufacture_date desc
      const sorted = (list as Batch[]).sort((a, b) => new Date(b.manufacture_date).getTime() - new Date(a.manufacture_date).getTime());
      setBatches(sorted);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBatches();
  }, []);

  const handleBatchMint = async (batchId: string) => {
    setMinting((s) => ({ ...s, [batchId]: true }));

    // Temporary debug logs to help diagnose why the wallet isn't available
    try {
      // These logs are intentionally verbose and helpful for debugging in the browser console
      console.debug('[Batch Mint] clicked batchId', batchId);
      console.debug('[Batch Mint] currentAccount', currentAccount);
      console.debug('[Batch Mint] localStorage.connectedAddress', localStorage.getItem('connectedAddress'));
      console.debug('[Batch Mint] window.__ENOKI_REGISTERED', (globalThis as any).__ENOKI_REGISTERED);
      console.debug('[Batch Mint] signTransaction', signTransaction);
      console.debug('[Batch Mint] signTransaction.mutateAsync exists', !!signTransaction?.mutateAsync);
    } catch (e) {
      // Ignore errors reading debug values (e.g. SSR safety) but log to console if present
      console.warn('[Batch Mint] debug logging failed', e);
    }
      try {
      const signer = currentAccount?.address ?? connectedAddress ?? (typeof window !== "undefined" ? localStorage.getItem("connectedAddress") : null);
      // Enoki MUST be used to sign sponsored mints. Never attempt Slush.
      // If Enoki is not available, fall back to the first available wallet (existing behavior).
      if (!signer) {
        setMinting((s) => ({ ...s, [batchId]: false }));
        toast.error("No wallet address found. Open Enoki and connect to this app, then retry.");
        return;
      }

      if (!signTransaction?.mutateAsync) {
        setMinting((s) => ({ ...s, [batchId]: false }));
        toast.error("Wallet signer unavailable. Reconnect Enoki and retry.");
        return;
      }

      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
      const res = await fetch(`${base.replace(/\/$/, "")}/batches/${batchId}/mint`, { method: 'POST' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Mint failed: ${res.status} ${txt}`);
      }

      const sponsored = await res.json();
      // Prompt wallet to sign the sponsored transaction bytes
      const signature = await signWithReconnect(sponsored.bytes);

      // Execute via backend Enoki execute endpoint
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
  console.log('Batch mint executed', json);
  const txDigest = json?.digest ?? sponsored.digest;
  const suiscanUrl = `https://suiscan.xyz/testnet/transaction/${txDigest}`;
  // Show a success toast with an action to view the transaction in Suiscan
  toast.success(`Batch minted — transaction: ${txDigest}`, {
    action: {
      label: 'View',
      onClick: () => {
        try { window.open(suiscanUrl, '_blank'); } catch (e) { /* ignore */ }
      }
    }
  });

  // Mark this batch as minted in the UI and refresh the batch list to reflect any backend updates
  setMinted((s) => ({ ...s, [batchId]: true }));
  try { await loadBatches(); } catch (e) { /* ignore refresh errors */ }
    } catch (err: any) {
      console.error(err);
      toast.error(`Batch mint failed: ${err?.message ?? String(err)}`);
    } finally {
      setMinting((s) => ({ ...s, [batchId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Production Batches</h2>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Manufacture Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>QR Codes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono font-medium">#{batch.batch_number}</TableCell>
                  <TableCell>{batch.product?.name ?? "—"}</TableCell>
                  <TableCell>{new Date(batch.manufacture_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(batch.expiry_date).toLocaleDateString()}</TableCell>
                  <TableCell>{(batch.unit_count ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    {batch.unit_count && batch.unit_count > 0
                      ? `${Math.min(batch.unit_count, 6000).toLocaleString()} / ${batch.unit_count.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[batch.status as keyof typeof statusVariant]}>{batch.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/batches/${batch.id}`}>View</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleBatchMint(batch.id)}
                        disabled={!!minting[batch.id] || !!minted[batch.id]}
                      >
                        {minting[batch.id] ? 'Minting…' : minted[batch.id] ? 'Minted' : 'Batch Mint'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && batches.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Boxes className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold">No batches yet</h3>
            <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
              Upload products (ERP import) including a batch number — the system will auto-group uploaded units into batches.
            </p>
          </CardContent>
        </Card>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
