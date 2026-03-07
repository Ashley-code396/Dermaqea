'use client'; 
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";


const statusVariant = { approved: "default", pending: "secondary", rejected: "destructive" } as const;

// Define the Product type to match backend
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  status: "approved" | "pending" | "rejected";
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/products/${p.id}`}>View</Link>
                    </Button>
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