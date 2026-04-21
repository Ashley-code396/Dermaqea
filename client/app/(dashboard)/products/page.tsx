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
  const [imageFile, setImageFile] = useState<File | null>(null);

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
      // Ensure wallet is connected synchronously (or close to the initial user gesture) before fetching 
      // preventing the browser from blocking popups out-of-band.
      let accountToUse = currentAccount ?? undefined;
      if (!accountToUse) {
        try {
          const enoki = wallets.find((w: any) => isEnokiWallet(w));
          const selected = enoki ?? wallets[0];
          if (selected) {
            console.log('Attempting to connect wallet automatically before signing');
            const connResult: any = await connect({ wallet: selected });
            accountToUse = connResult?.account ?? connResult?.currentAccount ?? (connResult?.accounts && connResult.accounts[0]) ?? undefined;
          }
        } catch (e: any) {
          console.warn('Wallet connection interrupted:', e.message);
        }
      }

      // We do not strictly throw here because `mutateAsync` might successfully connect 
      // in the background without returning an obvious account shape, and `useSignPersonalMessage` 
      // can safely fallback to the contextual `currentAccount`.

      const initPayload = {
        manufacturerId: manufacturer.id,
        productName: name,
        manufactureDate: new Date(manufactureDate).toISOString(),
        expiryDate: new Date(expiryDate).toISOString(),
        amount: Number(amount),
      };

      // Step 1: create product and receive unsigned payloads to sign
      setMessage('Initializing product and reserving signatures...');
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
      setMessage('Awaiting wallet signature approvals...');
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

      // Helper that retries signPersonalMessage on 429 (rate limit) with exponential backoff + jitter.
      async function signWithRetries(messageBytes: Uint8Array, account: any, maxAttempts = 5) {
        const baseDelay = 250; // ms
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await signPersonalMessage({ message: messageBytes, account });
          } catch (e: any) {
            // try to detect HTTP status 429 from different error shapes
            const status = e?.status || e?.response?.status || (typeof e?.message === 'string' && (/status[: ]?(\d{3})/.exec(e.message) || [])[1]);
            const is429 = String(status) === '429' || (typeof e?.message === 'string' && e.message.includes('429'));
            if (is429 && attempt < maxAttempts) {
              // backoff with jitter
              const delay = Math.min(10000, Math.pow(2, attempt) * baseDelay) + Math.floor(Math.random() * 300);
              console.warn(`signPersonalMessage rate-limited (429). Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            // rethrow non-retryable or final attempt error
            throw e;
          }
        }
      }

      async function worker() {
        while (true) {
          const idx = nextIndex;
          nextIndex += 1;
          if (idx >= payloads.length) break;
          const p = payloads[idx];
          const msg = new TextEncoder().encode(p);
          let sigRaw: any;
          try {
            sigRaw = await signWithRetries(msg, accountToUse, 5);
          } catch (e: any) {
            // If retries exhausted due to rate limiting, show a helpful message to the user
            const is429 = typeof e?.message === 'string' && e.message.includes('429');
            if (is429) {
              setMessage('Signing rate-limited by Enoki. Please wait a bit and try again.');
            }
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

      setMessage('Finalizing packaging artwork and embedding signatures...');
      console.log('All payloads signed. Now automatically finalizing with the backend.', signedPayloads.length);

      // Step 3: Automatically upload the signed payloads & image and download the ZIP
      const api = await import('@/lib/api');
      const res = await api.finalizeBatch(product.id, signedPayloads, imageFile, base);
      
      // Generate ZIP of stego images if they reside in the response
      if (res?.codes && res.codes.length > 0) {
        try {
          const JSZipModule = await import('jszip');
          const JSZip = JSZipModule.default || JSZipModule;
          const fileSaver = await import('file-saver');
          const saveAs = fileSaver.saveAs || fileSaver.default;
          const zip = new JSZip();
          let hasImages = false;
          res.codes.forEach((code: any) => {
            if (code.stegoImageBase64) {
              zip.file(`code-${code.serialId}.png`, code.stegoImageBase64, { base64: true });
              hasImages = true;
            }
          });
          if (hasImages) {
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `stego-packages-${product.id}.zip`);
          }
        } catch(e) {
          console.error("Failed to generate zip", e);
        }
      }

      setMessage('Packaging units generated successfully! Downloading ZIP...');

      // show the product returned by the init endpoint so the UI reflects the new product
      setProducts((p) => [product, ...p]);
      setShowForm(false);
      setName('');
      setManufactureDate('');
      setExpiryDate('');
      setAmount(1);
      setImageFile(null);

      await refreshManufacturer();
    } catch (err: any) {
      console.error('CRITICAL ERROR DURING CREATION:', err);
      alert('Error: ' + (err?.message ?? 'Failed to create product'));
      setMessage(err?.message ?? 'Failed to create product');
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
    // open a printable window with log list
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Serials for ${currentProduct?.product_name ?? currentProduct?.name ?? ''}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}pre{word-break:break-all;background:#f6f6f6;padding:8px;border-radius:4px}</style></head><body><h1>Packaging Serials for ${currentProduct?.product_name ?? currentProduct?.name ?? ''}</h1>${codesList
      .map((c) => `<div style="margin-bottom:12px"><strong>Serial:</strong> ${c.serialNumber}</div>`)
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
            <DialogTitle>Packaging Units for {currentProduct?.product_name ?? currentProduct?.name ?? ''}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto mt-2">
            {codesLoading ? (
              <div>Loading...</div>
            ) : codesList && codesList.length > 0 ? (
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="py-2">Serial Number</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codesList.map((c: any) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-2 font-mono text-sm">{c.serialNumber}</td>

                      <td className="py-2">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => copyToClipboard(c.serialNumber ?? '')} className="flex items-center gap-2">
                            <Copy size={14} />
                            Copy Serial
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-muted-foreground">No units found for this product.</div>
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
          <label className="text-sm">Packaging artwork (required)</label>
          <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} required />
          <label className="text-sm">Quantity (how many packaging units)</label>
          <Input type="number" min={1} value={String(amount)} onChange={(e) => setAmount(Number(e.target.value))} required />
          <div>
            <Button type="submit" disabled={busy}>{busy ? "Generating..." : "Generate packaging units"}</Button>
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
                        Export Log
                      </Button>
                      <Button size="sm" onClick={() => openCodesDialog(p)} className="flex items-center gap-2">
                        <Printer size={14} />
                        View Serials
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
