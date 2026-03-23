"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useConnectWallet, useCurrentAccount, useSignTransaction, useWallets } from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
import { toast } from 'sonner';
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";


// Define the Product type returned by the backend (Prisma model)
interface Product {
  id: string;
  product_name: string;
  brand_wallet: string;
  serialNumber: string;
  batchNumber: string;
  manufactureDate: string; // ISO
  expiryDate: string; // ISO
  extraData?: Record<string, any> | null;
  objectId?: string | null;
  createdAt: string;
}

export default function ProductsPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet } = useConnectWallet();
  const signTransaction = useSignTransaction();
  const availableWallets = useWallets();
  const { connectedAddress } = useWalletSync();
  const [products, setProducts] = useState<Product[]>([]);
  const [minting, setMinting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        // Try to rebind Enoki wallet session, then retry sign.
        // eslint-disable-next-line no-await-in-loop
        await reconnectEnoki();
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    throw lastErr ?? new Error("Wallet not ready for signing.");
  };
  const fetchProducts = async () => {
    setLoading(true);
    setErrorMessage(null);
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    let url = "";
    try {
      if (!backend) {
        console.error("NEXT_PUBLIC_BACKEND_URL is not set. Cannot fetch products from backend.");
        setProducts([]);
        setErrorMessage("Backend URL not configured (NEXT_PUBLIC_BACKEND_URL).");
        return;
      }

      url = `${backend.replace(/\/$/, "")}/products`;
      console.log("Fetching products from:", url);
      const res = await fetch(url);

      // If the response is not ok, log the status and body to help debugging.
      if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to fetch products: ${res.status} ${res.statusText}`, text);
        setErrorMessage(`Server returned ${res.status} ${res.statusText}`);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Expected JSON but received:", text);
        setErrorMessage("Invalid response from server (not JSON).");
        return;
      }

      const data: Product[] = await res.json();
      setProducts(data);
    } catch (error) {
      const errName = (error as any)?.name ?? "UnknownError";
      const errMsg = (error as any)?.message ?? String(error ?? "");
      // Browser DOMExceptions sometimes stringify to empty objects; log fields explicitly.
      console.error("Failed to fetch products", {
        name: errName,
        message: errMsg,
        url,
        backend,
        online: typeof navigator !== "undefined" ? navigator.onLine : "unknown",
        location: typeof window !== "undefined" ? window.location.href : "ssr",
      });
      setErrorMessage(errMsg || "Network error while fetching products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  if (loading) return <div>Loading products...</div>;

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">All Products</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent>
            <div className="p-6 text-center">
              <p className="mb-4 text-red-600">Failed to fetch products: {errorMessage}</p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => void fetchProducts()}>Retry</Button>
                <Button variant="ghost" asChild>
                  <Link href="/">Back to dashboard</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Products</h2>
        <Button asChild>
          <Link href="/products/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Submit New Product
          </Link>
        </Button>
      </div>
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Manufacture Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.product_name}</TableCell>
                  <TableCell className="font-mono text-sm">{p.serialNumber}</TableCell>
                  <TableCell>{p.batchNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{p.manufactureDate ? new Date(p.manufactureDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/products/${p.id}`}>View</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          setMinting((s) => ({ ...s, [p.id]: true }));
                          try {
                            const signer = currentAccount?.address ?? connectedAddress ?? (typeof window !== "undefined" ? localStorage.getItem("connectedAddress") : null);
                            if (!signer) {
                              return alert("No wallet address found. Connect Enoki and retry.");
                            }

                            if (!signTransaction?.mutateAsync) {
                              return alert("Wallet signer unavailable. Reconnect Enoki and retry.");
                            }

                            const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
                            const res = await fetch(`${base.replace(/\/$/, "")}/products/${p.id}/mint`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sender: signer }),
                            });
                            if (!res.ok) {
                              const body = await res.text();
                              try {
                                const json = JSON.parse(body);
                                if (res.status === 409 && json?.message?.toLowerCase().includes('duplicate')) {
                                  toast.error('Mint rejected: duplicate serial number found on-chain. Confirm your serials and try again.');
                                } else {
                                  toast.error(`Mint failed: ${json?.message ?? body}`);
                                }
                              } catch (e) {
                                toast.error(`Mint failed: ${res.status} ${body}`);
                              }
                              throw new Error(`Mint failed: ${res.status} ${body}`);
                            }

                            const sponsored = await res.json();
                            // Prompt wallet to sign the sponsored transaction bytes
                            const signature = await signWithReconnect(sponsored.bytes);

                            // Submit signature to execute the sponsored transaction
                            const exec = await fetch(`${base.replace(/\/$/, "")}/enoki/execute`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ digest: sponsored.digest, signature }),
                            });

                            if (!exec.ok) {
                              const txt = await exec.text();
                              throw new Error(`Execute failed: ${exec.status} ${txt}`);
                            }

                            const execRes = await exec.json();
                            console.log('mint executed', execRes);
                            // Prefer to use the digest returned by the execute endpoint if present,
                            // otherwise fall back to the original sponsored.digest we already have.
                            const txDigest = execRes?.digest ?? sponsored.digest;
                            const suiscanUrl = `https://suiscan.xyz/testnet/transaction/${txDigest}`;
                            // Open Suiscan in a new tab and also notify the user.
                            try { window.open(suiscanUrl, '_blank'); } catch (e) { /* ignore */ }
                            alert(`Product mint executed — transaction digest: ${txDigest}. View on Suiscan.`);
                          } catch (e: any) {
                            console.error(e);
                            alert(`Product mint failed: ${e?.message ?? String(e)}`);
                          } finally {
                            setMinting((s) => ({ ...s, [p.id]: false }));
                          }
                        }}
                        disabled={!!minting[p.id]}
                      >
                        {minting[p.id] ? 'Minting…' : 'Mint'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}