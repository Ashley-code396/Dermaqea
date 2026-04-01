"use client";

import { useState, useEffect } from "react";
import useManufacturer from "@/lib/useManufacturer";
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useCurrentNetwork } from "@mysten/dapp-kit-react";
import { useEnokiFlow } from "@mysten/enoki/react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ProductsPage() {
  const currentAccount = useCurrentAccount();
  const currentNetwork = useCurrentNetwork();
  const enokiflow = useEnokiFlow();
  const { connectedAddress } = useWalletSync();
  const acctAddr = currentAccount?.address ?? connectedAddress ?? null;

  const { manufacturer, loading } = useManufacturer(acctAddr);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (manufacturer && manufacturer.products) setProducts(manufacturer.products);
  }, [manufacturer]);

  const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
  const [codesDialogOpen, setCodesDialogOpen] = useState(false);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesList, setCodesList] = useState<any[]>([]);
  const [currentProduct, setCurrentProduct] = useState<any | null>(null);

  async function refreshManufacturer() {
    if (!acctAddr) return;
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/manufacturers/${encodeURIComponent(acctAddr)}`);
      if (!res.ok) return;
      const body = await res.json();
      if (body?.data) setProducts(body.data.products ?? []);
    } catch (e) {
      // ignore
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (!manufacturer) {
      setMessage("No manufacturer profile found. Connect your wallet or register first.");
      setBusy(false);
      return;
    }

    try {
      const initPayload = {
        manufacturerId: manufacturer.id,
        productName: name,
        manufactureDate: new Date(manufactureDate).toISOString(),
        expiryDate: new Date(expiryDate).toISOString(),
        amount: Number(amount),
      };

      // Step 1: create product and receive unsigned payloads to sign
      const initRes = await fetch(`${base.replace(/\/$/, "")}/codes/create-batch-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initPayload),
      });
      if (!initRes.ok) throw new Error(`server returned ${initRes.status}`);
      const initBody = await initRes.json();
      const product = initBody?.product;
      const payloads: string[] = initBody?.payloads ?? [];
      if (!product) throw new Error('Server did not return created product');

      // Step 2: client-side sign each payload
      // Verify Enoki flow is available
      if (!enokiflow) {
        throw new Error('Enoki flow is not initialized');
      }

      const keypair = await enokiflow.getKeypair({ network: currentNetwork });
      const signedPayloads: Array<{ payload: string; signature: string }> = [];

      for (const p of payloads) {
        // Sign as bytes
        const msg = new TextEncoder().encode(p);

        const { signature: sigRes } = await keypair.signPersonalMessage(msg);

        // Normalize the various shapes we may get back
        function toBase64UrlFromSig(raw: any): string {
          if (!raw) throw new Error('Signing failed');

          const candidate = raw.signature ?? raw.sig ?? raw.bytes ?? raw;

          if (typeof candidate === 'string') {
            return candidate.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
          }

          if (candidate instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(candidate))) {
            const arr = candidate instanceof Uint8Array ? candidate : new Uint8Array(candidate as Buffer);
            let binary = '';
            const chunk = 0x8000;
            for (let i = 0; i < arr.length; i += chunk) {
              const slice = arr.subarray(i, Math.min(i + chunk, arr.length));
              binary += String.fromCharCode.apply(null, Array.from(slice));
            }
            const b64 = typeof window !== 'undefined' ? btoa(binary) : Buffer.from(arr).toString('base64');
            return b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
          }

          throw new Error('Unsupported signature format');
        }

        const b64url = toBase64UrlFromSig(sigRes);
        signedPayloads.push({ payload: p, signature: b64url });
      }

      // Step 3: send signed payloads to server for verification & persistence
      const finalizeRes = await fetch(`${base.replace(/\/$/, "")}/codes/create-batch-finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, signedPayloads }),
      });
      if (!finalizeRes.ok) throw new Error(`server finalize returned ${finalizeRes.status}`);
      const finalBody = await finalizeRes.json();

      // append new product if returned
      if (finalBody?.product) {
        setProducts((p) => [finalBody.product, ...p]);
        setMessage('Product created and codes generated.');
        setShowForm(false);
        setName('');
        setManufactureDate('');
        setExpiryDate('');
        setAmount(1);
      } else {
        setMessage('Created, but server did not return product details.');
      }

      await refreshManufacturer();
    } catch (err: any) {
      setMessage(err?.message ?? 'Failed to create product');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(productId: string) {
    if (!acctAddr) return;
    const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
    try {
      // trigger product-level codes download (server will return CSV)
      const url = `${base.replace(/\/$/, "")}/codes/product/${encodeURIComponent(productId)}/download`;
      window.open(url, '_blank');
    } catch (e: any) {
      setMessage(e?.message ?? 'Failed to download codes');
    }
  }

  async function openCodesDialog(product: any) {
    setMessage(null);
    setCodesLoading(true);
    setCodesList([]);
    setCurrentProduct(product);
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/codes/product/${encodeURIComponent(product.id)}/codes`);
      if (!res.ok) throw new Error('Failed to fetch codes');
      const body = await res.json();
      setCodesList(body?.codes ?? []);
      setCodesDialogOpen(true);
    } catch (e: any) {
      setMessage(e?.message ?? 'Failed to load codes');
    } finally {
      setCodesLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    try {
      navigator.clipboard.writeText(text);
      setMessage('Code copied to clipboard');
    } catch (e) {
      setMessage('Failed to copy');
    }
  }

  function printCodes() {
    // open a printable window with codes list
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Codes for ${currentProduct?.product_name ?? currentProduct?.name ?? ''}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}pre{word-break:break-all;background:#f6f6f6;padding:8px;border-radius:4px}</style></head><body><h1>Codes for ${currentProduct?.product_name ?? currentProduct?.name ?? ''}</h1>${codesList
      .map((c) => `<div style="margin-bottom:12px"><strong>Serial:</strong> ${c.serialNumber}<br/><strong>Code:</strong><pre>${c.codeData ?? ''}</pre></div>`)
      .join('')}<script>window.onload=function(){window.print();}</script></body></html>`;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      setMessage('Popup blocked');
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  if (loading) return <div className="p-6">Loading...</div>;
  const enokiRegisteredFlag = typeof window !== 'undefined' ? Boolean((window as any).__ENOKI_REGISTERED) : false;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Products</h2>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Close" : "Add product"}</Button>
      </div>
      {/* Codes dialog */}
      <Dialog open={codesDialogOpen} onOpenChange={(v) => setCodesDialogOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Codes for {currentProduct?.product_name ?? currentProduct?.name ?? ''}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto mt-2">
            {codesLoading ? (
              <div>Loading...</div>
            ) : codesList && codesList.length > 0 ? (
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="py-2">Serial</th>
                    <th>Code</th>
                    <th>Signature</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codesList.map((c: any) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-2 font-mono text-sm">{c.serialNumber}</td>
                      <td className="py-2"><pre className="text-xs break-words">{c.codeData ?? ''}</pre></td>
                      <td className="py-2 text-xs font-mono">{c.signature ?? ''}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => copyToClipboard(c.codeData ?? '')} className="flex items-center gap-2">
                            <Copy size={14} />
                            Copy
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-muted-foreground">No codes found for this product.</div>
            )}
          </div>

          <DialogFooter className="mt-4" showCloseButton>
            <div className="flex gap-2">
              <Button onClick={printCodes} disabled={codesList.length === 0}>
                <Printer size={14} />
                Print
              </Button>
              <Button asChild>
                <a href={`${base.replace(/\/$/, "")}/codes/product/${encodeURIComponent(currentProduct?.id ?? '')}/download`}>
                  <span className="flex items-center gap-2"><Download size={14} />Download CSV</span>
                </a>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {message && <div className="mb-4 text-sm text-muted-foreground">{message}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid gap-3 max-w-lg">
          <Input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="text-sm">Manufacture date</label>
          <Input type="date" value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} required />
          <label className="text-sm">Expiry date</label>
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
          <label className="text-sm">Quantity (how many codes)</label>
          <Input type="number" min={1} value={String(amount)} onChange={(e) => setAmount(Number(e.target.value))} required />
          <div>
            <Button type="submit" disabled={busy}>{busy ? "Creating..." : "Create product & generate codes"}</Button>
          </div>
        </form>
      )}

      <div>
        {products && products.length > 0 ? (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-2">Name</th>
                <th>Batch</th>
                <th>Manufacture</th>
                <th>Expiry</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2">{p.product_name ?? p.name ?? p.sku ?? "-"}</td>
                  <td>{p.batchNumber ?? p.batch_number ?? "-"}</td>
                  <td>{p.manufactureDate ? new Date(p.manufactureDate).toLocaleDateString() : "-"}</td>
                  <td>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "-"}</td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleDownload(p.id)} className="flex items-center gap-2">
                        <Download size={14} />
                        Download
                      </Button>
                      <Button size="sm" onClick={() => openCodesDialog(p)} className="flex items-center gap-2">
                        <Printer size={14} />
                        View codes
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-muted-foreground">No products found for this manufacturer.</div>
        )}
      </div>
    </div>
  );
}
