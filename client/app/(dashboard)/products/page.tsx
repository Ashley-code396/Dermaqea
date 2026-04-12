"use client";

import { useState, useEffect } from "react";
import useManufacturer from "@/lib/useManufacturer";
import { useCurrentAccount, useConnectWallet, useWallets } from "@mysten/dapp-kit";
import { useSignPersonalMessage } from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
import { Button } from "@/components/ui/button";
import { Download, Printer, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ProductsPage() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: connect } = useConnectWallet();
  const wallets = useWallets();
  const [storedAddr, setStoredAddr] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStoredAddr(typeof window !== 'undefined' ? sessionStorage.getItem('connectedAddress') : null);
    } catch (e) {
      // ignore
    }
  }, []);
  const acctAddr = currentAccount?.address ?? storedAddr ?? null;

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
  const [lastSignedExport, setLastSignedExport] = useState<null | { productId: string; signedPayloads: Array<{ payload: string; signature: string }> }>(null);

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
      console.log('Sending init request for:', initPayload);
      const initRes = await fetch(`${base.replace(/\/$/, "")}/codes/create-batch-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initPayload),
      });
      if (!initRes.ok) throw new Error(`server returned ${initRes.status}`);
      const initBody = await initRes.json();
      const product = initBody?.product;
      const payloads: string[] = initBody?.payloads ?? [];
      console.log('Init response successful. Product ID:', product?.id, 'Payloads received:', payloads.length);
      if (!product) throw new Error('Server did not return created product');

      // Step 2: client-side sign each payload
      // If dapp-kit has not yet rehydrated a currentAccount (but we have a
      // persisted connectedAddress), attempt to connect programmatically so
      // the signing hooks become available. Prefer an Enoki wallet if present.
      // If there's no currentAccount from the hook, attempt to auto-connect a wallet.
      // Avoid waiting on the hook's value (race condition) by using the result returned
      // from `connect(...)` which should include the newly connected account info.
  let accountToUse = currentAccount ?? undefined;
      if (!accountToUse) {
        try {
          const enoki = wallets.find((w: any) => isEnokiWallet(w));
          const selected = enoki ?? wallets[0];
          if (selected) {
            console.log('Attempting to connect wallet automatically before signing');
            const connResult: any = await connect({ wallet: selected });
            // connect implementations may return the connected account in different shapes
            accountToUse = connResult?.account ?? connResult?.currentAccount ?? (connResult?.accounts && connResult.accounts[0]) ?? accountToUse;
          }
        } catch (e) {
          // ignore and let the subsequent check throw a helpful error
        }
      }

      if (!accountToUse) {
        throw new Error('Wallet not connected. Please connect your Enoki wallet first.');
      }

      console.log('Wallet connected. Proceeding to sign payloads.');
      const signedPayloads: Array<{ payload: string; signature: string }> = [];

      // Helper: normalize various signature shapes into base64url string
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

      // Parallel signing with limited concurrency to balance UX and performance.
      // Many wallets don't like massive concurrent signing prompts; pick a small pool.
      const CONCURRENCY = Math.min(4, Math.max(1, payloads.length));
      let nextIndex = 0;

      async function worker() {
        while (true) {
          const idx = nextIndex;
          nextIndex += 1;
          if (idx >= payloads.length) break;
          const p = payloads[idx];
          const msg = new TextEncoder().encode(p);
          let sigRaw: any;
          try {
            sigRaw = await signPersonalMessage({ message: msg, account: accountToUse });
          } catch (e: any) {
            throw new Error('Failed to sign message: ' + (e?.message || String(e)));
          }
          const b64url = toBase64UrlFromSig(sigRaw);
          console.log(`Payload signed: ${p.substring(0, 8)}... Signature Base64Url length: ${b64url.length}`);
          signedPayloads[idx] = { payload: p, signature: b64url };
        }
      }

      // spawn workers
      const workers: Promise<void>[] = [];
      for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
      // Wait for all workers to finish (or throw)
      await Promise.all(workers);

      console.log('All payloads signed. Preparing signed payloads for mobile app (no server-side finalize).', signedPayloads.length);

      // NOTE: Verification will be performed by the mobile app, not the manufacturer UI.
      // We still sign payloads here, but we do NOT call the server finalize/verification endpoint.
      // Instead we create a downloadable JSON containing the signed payloads so the mobile
      // app can import/verify them later. We also optimistically add the product returned
      // from the init call to the UI so manufacturers see it immediately.
      try {
        const exportObj = { productId: product.id, signedPayloads };
        // Save for potential upload to backend (user can upload via button)
        setLastSignedExport(exportObj);
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-${product.id}-signed-payloads.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMessage('Signed payloads downloaded for mobile app. Verification will be performed by the mobile app.');
      } catch (e: any) {
        console.error('Failed to prepare signed payloads for download:', e);
        setMessage('Failed to prepare signed payloads for mobile app');
      }

      // show the product returned by the init endpoint so the UI reflects the new product
      if (product) {
        setProducts((p) => [product, ...p]);
        setShowForm(false);
        setName('');
        setManufactureDate('');
        setExpiryDate('');
        setAmount(1);
      }

      await refreshManufacturer();
    } catch (err: any) {
      console.error('CRITICAL ERROR DURING CREATION:', err);
      alert('Error: ' + (err?.message ?? 'Failed to create product'));
      setMessage(err?.message ?? 'Failed to create product');
    } finally {
      setBusy(false);
    }
  }

  async function uploadSignedPayloadsToBackend() {
    if (!lastSignedExport) {
      setMessage('No signed payloads available to upload.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // lazy import to keep bundle small
      const api = await import('@/lib/api');
      const res = await api.finalizeBatch(lastSignedExport.productId, lastSignedExport.signedPayloads, base);
      setMessage('Signed payloads uploaded to backend successfully.');
      // optionally refresh manufacturer to reflect server-side codes
      await refreshManufacturer();
      // clear saved export to avoid accidental re-uploads
      setLastSignedExport(null);
      return res;
    } catch (e: any) {
      console.error('Failed to upload signed payloads to backend:', e);
      setMessage(e?.message ?? 'Failed to upload signed payloads');
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(productId: string) {
    if (!acctAddr) return;
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
                      {lastSignedExport && lastSignedExport.productId === p.id ? (
                        <Button size="sm" onClick={uploadSignedPayloadsToBackend} className="flex items-center gap-2">
                          Upload signed payloads
                        </Button>
                      ) : null}
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
