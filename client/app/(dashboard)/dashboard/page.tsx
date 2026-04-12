"use client";

import Link from "next/link";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ScanChart } from "@/components/dashboard/ScanChart";
import { Button } from "@/components/ui/button";
import useManufacturer from '@/lib/useManufacturer';
import { useEffect, useState } from 'react';
import {
  MOCK_ACTIVITY,
  MOCK_PRODUCTS,
  MOCK_SCAN_DATA,
  MOCK_MANUFACTURER,
} from "@/lib/mock-data";

import { Package, Boxes, Download } from "lucide-react";

export default function DashboardPage() {
  const approvedProducts = MOCK_PRODUCTS.filter((p) => p.status === "approved").length;
  const pendingProducts = MOCK_PRODUCTS.filter((p) => p.status === "pending").length;
  // batches / qr-code functionality has been removed from the UI; keep placeholders
  const [batches] = useState([] as any[]);
  const totalQRCodes = 0;

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
  // Prefer real manufacturer verification status when available (based on connected wallet).
  const [storedAddr, setStoredAddr] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStoredAddr(typeof window !== 'undefined' ? sessionStorage.getItem('connectedAddress') : null);
    } catch (e) {
      // ignore
    }
  }, []);
  const { manufacturer } = useManufacturer(storedAddr ?? null);

  const mapStatus = (v?: string | null) => {
    if (!v) return MOCK_MANUFACTURER.verified ? 'VERIFIED' : 'PENDING_REVIEW';
    if (v === 'VERIFIED') return 'VERIFIED';
    if (v === 'SUSPENDED') return 'ACTION_REQUIRED';
    return 'PENDING_REVIEW';
  };

  const status = mapStatus(manufacturer?.verificationStatus ?? null);
  const config = statusConfig[status as keyof typeof statusConfig];

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
            totalBatches={batches.length}
            totalQRCodes={totalQRCodes}
            scansToday={247}
          />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/profile" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            View Profile
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/analytics" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            View Analytics
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
