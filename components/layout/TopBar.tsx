"use client";

import { usePathname } from "next/navigation";
import { Bell, ExternalLink, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const SUISCAN_URL = "https://suiscan.xyz/testnet";

const TITLE_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/profile": "Manufacturer Profile",
  "/products": "Products",
  "/products/new": "Submit New Product",
  "/batches": "Batches",
  "/batches/new": "Create New Batch",
  "/qr-codes": "QR Codes",
  "/analytics": "Analytics",
  "/settings": "Account Settings",
};

function getTitle(pathname: string): string {
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname];
  if (pathname.startsWith("/products/")) return "Product Details";
  if (pathname.startsWith("/batches/")) return "Batch Details";
  return "Dashboard";
}

export function TopBar() {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a
            href={SUISCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            View on Suiscan
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </header>
  );
}
