"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, Boxes, QrCode, Scan } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  pulse?: boolean;
}

function StatCard({ title, value, subtext, icon, pulse }: StatCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${pulse ? "text-primary animate-pulse" : ""}`}
            >
              {value}
            </p>
            {subtext && (
              <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsRowProps {
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  totalBatches: number;
  totalQRCodes: number;
  scansToday: number;
}

export function StatsRow({
  totalProducts,
  approvedProducts,
  pendingProducts,
  totalBatches,
  totalQRCodes,
  scansToday,
}: StatsRowProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Manufacturers"
        value={totalProducts}
        subtext={`${approvedProducts} verified / ${pendingProducts} pending`}
        icon={<Package className="h-6 w-6" />}
      />
      <StatCard
        title="Active Facilities"
        value={totalBatches}
        icon={<Boxes className="h-6 w-6" />}
      />
      <StatCard
        title="System Events"
        value={totalQRCodes.toLocaleString()}
        icon={<QrCode className="h-6 w-6" />}
      />
      <StatCard
        title="Scans Today"
        value={scansToday}
        icon={<Scan className="h-6 w-6" />}
        pulse
      />
    </div>
  );
}
