"use client";

import { useEffect, useState } from "react";
export default function useManufacturer() {
  const [manufacturer, setManufacturer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetcher = async () => {
      setLoading(true);
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
      try {
        const res = await fetch(`${base.replace(/\/$/, "")}/manufacturers`);
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled && body?.data?.length > 0) setManufacturer(body.data[0]);
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
  }, []);

  return { manufacturer, loading };
}
