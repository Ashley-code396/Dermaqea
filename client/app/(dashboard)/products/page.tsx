'use client'; 
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [minting, setMinting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
                            const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
                            const res = await fetch(`${base.replace(/\/$/, "")}/products/${p.id}/mint`, { method: 'POST' });
                            if (!res.ok) {
                              const txt = await res.text();
                              throw new Error(`${res.status} ${txt}`);
                            }
                            const j = await res.json();
                            console.log('mint result', j);
                            alert('Product mint submitted (check server logs)');
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