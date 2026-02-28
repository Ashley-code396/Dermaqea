import Link from "next/link";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ScanChart } from "@/components/dashboard/ScanChart";
import { Button } from "@/components/ui/button";
import {
  MOCK_ACTIVITY,
  MOCK_BATCHES,
  MOCK_PRODUCTS,
  MOCK_SCAN_DATA,
  MOCK_MANUFACTURER,
} from "@/lib/mock-data";
import { Package, Boxes, Download } from "lucide-react";

export default function DashboardPage() {
  const approvedProducts = MOCK_PRODUCTS.filter((p) => p.status === "approved").length;
  const pendingProducts = MOCK_PRODUCTS.filter((p) => p.status === "pending").length;
  const totalQRCodes = MOCK_BATCHES.reduce((sum, b) => sum + b.unit_count, 0);

  const statusConfig = {
    VERIFIED: {
      label: "VERIFIED MANUFACTURER",
      className: "bg-primary text-primary-foreground",
      glow: true,
    },
    PENDING_REVIEW: {
      label: "PENDING REVIEW",
      className: "bg-warning text-primary-foreground",
      glow: false,
    },
    ACTION_REQUIRED: {
      label: "ACTION REQUIRED",
      className: "bg-destructive text-white",
      glow: false,
    },
  };

  const status = MOCK_MANUFACTURER.verified ? "VERIFIED" : "PENDING_REVIEW";
  const config = statusConfig[status];

  return (
    <div className="space-y-8">
      {/* Status Banner */}
      <div
        className={`flex items-center justify-center rounded-lg px-6 py-4 ${config.className}`}
        style={
          config.glow
            ? { boxShadow: "0 0 12px rgba(61, 220, 132, 0.25)" }
            : undefined
        }
      >
        <span className="font-semibold tracking-wider">{config.label}</span>
      </div>

      {/* Stats */}
      <StatsRow
        totalProducts={MOCK_PRODUCTS.length}
        approvedProducts={approvedProducts}
        pendingProducts={pendingProducts}
        totalBatches={MOCK_BATCHES.length}
        totalQRCodes={totalQRCodes}
        scansToday={247}
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/products/new" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Submit New Product
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/batches/new" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Create New Batch
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/batches/batch-1" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download QR Codes
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Activity */}
        <ActivityFeed items={MOCK_ACTIVITY} />

        {/* Scan Activity Chart */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Scan Activity (30 days)</h3>
          <ScanChart data={MOCK_SCAN_DATA} />
        </div>
      </div>
    </div>
  );
}
