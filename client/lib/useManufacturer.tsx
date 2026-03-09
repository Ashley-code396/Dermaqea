"use client";

import { useQuery } from "@tanstack/react-query";

export default function useManufacturer(address?: string | null) {
  const queryKey = ["manufacturer", address ?? "self"] as const;

  const fetchManufacturer = async () => {
    const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:5000";
    const url = address
      ? `${base.replace(/\/$/, "")}/manufacturers/${encodeURIComponent(address)}`
      : `${base.replace(/\/$/, "")}/manufacturers`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch manufacturer");
    const body = await res.json();
    return address ? body?.data ?? null : body?.data?.length > 0 ? body.data[0] : null;
  };

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: fetchManufacturer,
    // Keep profile fresh for 5 minutes to avoid refetching when navigating between tabs
    staleTime: 1000 * 60 * 5,
    // Avoid refetching on window focus (switching tabs) to improve UX
    refetchOnWindowFocus: false,
    // When the component remounts, don't refetch immediately if data is fresh
    refetchOnMount: false,
    // Don't refetch automatically on reconnect — optional
    refetchOnReconnect: false,
    // Keep errors surfaced but do not throw
    retry: 1,
  });

  return { manufacturer: (data as any) ?? null, loading: isLoading, error: isError };
}
