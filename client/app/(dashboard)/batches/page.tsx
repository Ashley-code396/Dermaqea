"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentAccount, useSignTransaction, useConnectWallet, useWallets } from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
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
  const signTransaction = useSignTransaction();
  const { mutateAsync: connectWalletAsync } = useConnectWallet();
  const availableWallets = useWallets();
  const { connectedAddress } = useWalletSync();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [minting, setMinting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
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
    void fetchBatches();
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
      const signer = currentAccount?.address ?? connectedAddress ?? (typeof window !== 'undefined' ? localStorage.getItem('connectedAddress') : null);
      if (!signer) {
        const enoki = availableWallets?.find((w: any) => isEnokiWallet(w));
        const toConnect = enoki ?? (availableWallets && availableWallets.length > 0 ? availableWallets[0] : null);
        if (toConnect) {
          try {
            await connectWalletAsync({ wallet: toConnect });
            return;
          } catch (e) {
            console.warn('Automatic connect failed', e);
          }
        }
        return alert('Connect your wallet to sign the batch mint transaction');
      }

      if (!signTransaction?.mutateAsync) {
        return alert('Wallet signer unavailable. Open your wallet and connect to the dApp so you can sign the transaction.');
      }

      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
      const res = await fetch(`${base.replace(/\/$/, "")}/batches/${batchId}/mint`, { method: 'POST' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Mint failed: ${res.status} ${txt}`);
      }

      const sponsored = await res.json();
      // Prompt wallet to sign the sponsored transaction bytes
      let signature: string | undefined;
      try {
        const signed = await signTransaction.mutateAsync({ transaction: sponsored.bytes });
        signature = (signed as any)?.signature;
      } catch (err: any) {
        const msg = (err && err.message) ? String(err.message) : '';
        if (msg.includes('No wallet is connected') || msg.includes('WalletNotConnected')) {
          if (availableWallets && availableWallets.length > 0) {
            try { await connectWalletAsync({ wallet: availableWallets[0] }); return; } catch (e) { console.warn('Auto-connect after sign failure failed', e); }
          }
          return alert('No wallet connected. Please open your wallet and connect to sign the transaction.');
        }
        throw err;
      }

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
  try { window.open(suiscanUrl, '_blank'); } catch (e) {}
  alert(`Batch minted — transaction digest: ${txDigest}. View on Suiscan.`);
    } catch (err: any) {
      console.error(err);
      alert(`Batch mint failed: ${err?.message ?? String(err)}`);
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
                        disabled={!!minting[batch.id]}
                      >
                        {minting[batch.id] ? 'Minting…' : 'Batch Mint'}
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
