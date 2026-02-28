import Link from "next/link";
import { MOCK_BATCHES } from "@/lib/mock-data";
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Production Batches</h2>
        <Button asChild>
          <Link href="/batches/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Batch
          </Link>
        </Button>
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
              {MOCK_BATCHES.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono font-medium">
                    #{batch.batch_number}
                  </TableCell>
                  <TableCell>{batch.product?.name ?? "—"}</TableCell>
                  <TableCell>
                    {new Date(batch.manufacture_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(batch.expiry_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{batch.unit_count.toLocaleString()}</TableCell>
                  <TableCell>
                    {batch.unit_count > 0
                      ? `${Math.min(batch.unit_count, 6000).toLocaleString()} / ${batch.unit_count.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[batch.status]}>
                      {batch.status}
                    </Badge>
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

      {MOCK_BATCHES.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Boxes className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold">No batches yet</h3>
            <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
              Create your first production batch for an approved product.
            </p>
            <Button asChild>
              <Link href="/batches/new" className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Batch
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
