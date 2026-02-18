import Link from "next/link";
import { MOCK_QR_CODES, MOCK_BATCHES } from "@/lib/mock-data";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QrCode, Download } from "lucide-react";

const statusVariant = {
  generated: "secondary",
  applied: "default",
  scanned: "default",
  flagged: "destructive",
} as const;

export default function QRCodesPage() {
  const totalGenerated = MOCK_BATCHES.reduce(
    (sum, b) => sum + Math.min(b.unit_count, 6000),
    0
  );
  const totalUnits = MOCK_BATCHES.reduce((sum, b) => sum + b.unit_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">QR Codes</h2>
        <Button variant="outline" asChild>
          <Link href="/batches/batch-1" className="gap-2">
            <Download className="h-4 w-4" />
            Download QR Codes
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Total Generated</p>
            <p className="text-2xl font-semibold text-primary">
              {totalGenerated.toLocaleString()}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Across Batches</p>
            <p className="text-2xl font-semibold">
              {MOCK_BATCHES.length}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Pending Generation</p>
            <p className="text-2xl font-semibold">
              {Math.max(0, totalUnits - totalGenerated).toLocaleString()}
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <h3 className="font-semibold">Recent QR Codes</h3>
          <p className="text-sm text-muted-foreground">
            Sample of generated QR codes. Manage full lists from each batch.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Sui Object ID</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scan Count</TableHead>
                <TableHead>Last Scan</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_QR_CODES.map((qr) => (
                <TableRow key={qr.id}>
                  <TableCell className="font-mono font-medium">
                    {qr.serial_number}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {qr.sui_object_id.slice(0, 10)}...
                  </TableCell>
                  <TableCell>#{qr.batch_id.replace("batch-", "")}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[qr.status]}>
                      {qr.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{qr.scan_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {qr.first_scan_at
                      ? new Date(qr.first_scan_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/batches/batch-1`}>View Batch</Link>
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
