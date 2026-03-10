"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [batches, setBatches] = useState<Batch[]>([]);
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
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/batches/${batch.id}`}>View</Link>
                    </Button>
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
