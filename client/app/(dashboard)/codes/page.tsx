"use client";

import { useState, useEffect } from "react";
import useManufacturer from "@/lib/useManufacturer";
import { useWalletSync } from "@/components/blockchain/WalletSyncProvider";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CodesPage() {
  const currentAccount = useCurrentAccount();
  const { connectedAddress } = useWalletSync();
  const acctAddr = currentAccount?.address ?? connectedAddress ?? null;

  const { manufacturer, loading } = useManufacturer(acctAddr);
  const [products, setProducts] = useState<any[]>([]);
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";

  const [codesDialogOpen, setCodesDialogOpen] = useState(false);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesList, setCodesList] = useState<any[]>([]);
  const [currentProduct, setCurrentProduct] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (manufacturer && manufacturer.products) setProducts(manufacturer.products);
  }, [manufacturer]);

  async function handleDownload(productId: string) {
    try {
      const url = `${base.replace(/\/$/, "")}/codes/product/${encodeURIComponent(productId)}/download`;
      window.open(url, "_blank");
    } catch (e: any) {
      setMessage(e?.message ?? "Failed to download codes");
    }
  }

  async function openCodesDialog(product: any) {
    setMessage(null);
    setCodesLoading(true);
    setCodesList([]);
    setCurrentProduct(product);
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/codes/product/${encodeURIComponent(product.id)}/codes`);
      if (!res.ok) throw new Error("Failed to fetch codes");
      const body = await res.json();
      setCodesList(body?.codes ?? []);
      setCodesDialogOpen(true);
    } catch (e: any) {
      setMessage(e?.message ?? "Failed to load codes");
    } finally {
      setCodesLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    try {
      navigator.clipboard.writeText(text);
      setMessage("Code copied to clipboard");
    } catch (e) {
      setMessage("Failed to copy");
    }
  }

  function printCodes() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Codes for ${currentProduct?.product_name ?? currentProduct?.name ?? ''}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}pre{word-break:break-all;background:#f6f6f6;padding:8px;border-radius:4px}</style></head><body><h1>Codes for ${currentProduct?.product_name ?? currentProduct?.name ?? ''}</h1>${codesList
  .map((c) => `<div style="margin-bottom:12px"><strong>Serial:</strong> ${c.serialNumber}<br/><strong>Code:</strong><pre>${c.codeData ?? ''}</pre></div>`)
      .join('')}<script>window.onload=function(){window.print();}</script></body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      setMessage("Popup blocked");
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Codes</h2>
      </div>

      {message && <div className="mb-4 text-sm text-muted-foreground">{message}</div>}

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
                <th />
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

      <Dialog open={codesDialogOpen} onOpenChange={(v) => setCodesDialogOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Codes for {currentProduct?.product_name ?? currentProduct?.name ?? ""}</DialogTitle>
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
                      <td className="py-2"><pre className="text-xs break-words">{c.codeData ?? ""}</pre></td>
                      <td className="py-2 text-xs font-mono">{c.signature ?? ""}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { navigator.clipboard.writeText(c.codeData ?? ""); setMessage('Copied'); }} className="flex items-center gap-2">
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
                <a href={`${base.replace(/\/$/, "")}/codes/product/${encodeURIComponent(currentProduct?.id ?? "")}/download`}>
                  <span className="flex items-center gap-2"><Download size={14} />Download CSV</span>
                </a>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
