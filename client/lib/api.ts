export async function finalizeBatch(productId: string, signedPayloads: Array<{ payload: string; signature: string }>, imageFile?: File | null, baseUrl?: string) {
  const base = (baseUrl ?? (process.env.NEXT_PUBLIC_BACKEND_URL as string) ?? "http://localhost:5000").replace(/\/$/, "");
  
  const formData = new FormData();
  formData.append("productId", productId);
  formData.append("signedPayloads", JSON.stringify(signedPayloads));
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await fetch(`${base}/codes/create-batch-finalize`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(`Server returned ${res.status}${txt ? ': ' + txt : ''}`);
  }
  return res.json();
}

export default { finalizeBatch };
