"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Package } from "lucide-react";
import type { ActivityItem } from "@/types";

const iconMap = {
  batch_qr: Package,
  product_approved: CheckCircle,
  product_rejected: AlertTriangle,
  alert: AlertTriangle,
  scan: Package,
};

const severityColors = {
  info: "text-muted-foreground",
  success: "text-primary",
  warning: "text-warning",
  error: "text-destructive",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <h3 className="font-semibold">Recent Activity</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => {
            const Icon = iconMap[item.type] ?? Package;
            const colorClass = severityColors[item.severity ?? "info"];
            return (
              <Link
                key={item.id}
                href={item.link ?? "#"}
                prefetch={false}
                className="flex gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/50"
              >
                <div className={`shrink-0 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
