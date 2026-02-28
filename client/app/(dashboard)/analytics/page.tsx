import Link from "next/link";
import { MOCK_ALERTS, MOCK_SCAN_DATA } from "@/lib/mock-data";
import { ScanChart } from "@/components/dashboard/ScanChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";

const productScanData = [
  { name: "Vitamin C Serum", scans: 1247, flagged: 1 },
  { name: "Retinol Night Cream", scans: 892, flagged: 1 },
  { name: "Hyaluronic Moisturizer", scans: 0, flagged: 0 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Total Scans (30d)</p>
            <p className="text-2xl font-semibold text-primary">2,139</p>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Unique Products</p>
            <p className="text-2xl font-semibold">2</p>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Flagged QR Codes</p>
            <p className="text-2xl font-semibold text-destructive">2</p>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Geographic Reach</p>
            <p className="text-2xl font-semibold">8 cities</p>
          </CardHeader>
        </Card>
      </div>
      {MOCK_ALERTS.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold text-destructive">COUNTERFEITING ALERTS ({MOCK_ALERTS.length})</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_ALERTS.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-destructive/30 bg-card p-4">
                <p className="font-mono font-medium">{alert.serial_number}</p>
                <p className="text-sm text-muted-foreground">{alert.reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">{alert.product_name} | Batch #{alert.batch_number}</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="destructive" size="sm">Flag as Counterfeit</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="border-border bg-card">
        <CardHeader><h3 className="font-semibold">Scan Activity (30 days)</h3></CardHeader>
        <CardContent><ScanChart data={MOCK_SCAN_DATA} /></CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader><h3 className="font-semibold">Per-Product Breakdown</h3></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Total Scans</TableHead>
                <TableHead>Flagged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productScanData.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.scans.toLocaleString()}</TableCell>
                  <TableCell>{row.flagged > 0 ? <Badge variant="destructive">{row.flagged}</Badge> : "0"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
