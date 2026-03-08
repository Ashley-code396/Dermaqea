"use client";

import { useEffect, useState } from "react";
export default function useManufacturer(address?: string | null) {
  const [manufacturer, setManufacturer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetcher = async () => {
      setLoading(true);
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
      try {
        const url = address
          ? `${base.replace(/\/$/, "")}/manufacturers/${encodeURIComponent(address)}`
          : `${base.replace(/\/$/, "")}/manufacturers`;
        const res = await fetch(url);
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) {
          if (address) setManufacturer(body?.data ?? null);
          else setManufacturer(body?.data?.length > 0 ? body.data[0] : null);
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetcher();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { manufacturer, loading };
}
