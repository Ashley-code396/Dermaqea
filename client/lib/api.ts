export async function finalizeBatch(productId: string, signedPayloads: Array<{ payload: string; signature: string }>, baseUrl?: string) {
  const base = (baseUrl ?? (process.env.NEXT_PUBLIC_BACKEND_URL as string) ?? "http://localhost:5000").replace(/\/$/, "");
  const res = await fetch(`${base}/codes/create-batch-finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, signedPayloads }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(`Server returned ${res.status}${txt ? ': ' + txt : ''}`);
  }
  return res.json();
}

export default { finalizeBatch };
