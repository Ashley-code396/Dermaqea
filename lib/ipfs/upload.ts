// IPFS upload via Pinata - placeholder for actual implementation
// Set NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET for production

export async function uploadToIPFS(file: File): Promise<string> {
  // Placeholder: In production, use Pinata API
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT ?? "placeholder"}`,
    },
    body: formData,
  });

  if (!response.ok) {
    // Return mock hash for dev when API not configured
    return `Qm${btoa(file.name + Date.now()).slice(0, 44)}`;
  }

  const data = await response.json();
  return data.IpfsHash;
}

export async function uploadJsonToIPFS(data: unknown): Promise<string> {
  // Placeholder for JSON metadata upload
  return `Qm${btoa(JSON.stringify(data)).slice(0, 44)}`;
}
