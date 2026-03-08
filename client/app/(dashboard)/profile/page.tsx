import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, ExternalLink, Copy } from "lucide-react";

async function fetchManufacturer() {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/manufacturers`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body.data && body.data.length > 0) ? body.data[0] : null;
  } catch (e) {
    console.error('Failed to fetch manufacturer', e);
    return null;
  }
}

export default async function ProfilePage() {
  const manufacturer = await fetchManufacturer();

  const MOCK_VERIFICATION_TIMELINE = [
    { step: "Account Created", done: true, date: "Jan 15, 2025" },
    { step: "Documents Submitted", done: true, date: "Jan 16, 2025" },
    { step: "Dermaqea Review", done: false, inProgress: true, note: "Estimated 2-3 business days" },
    { step: "Verified Manufacturer", done: false },
    { step: "First Product Submission", done: false },
  ];

  const MOCK_VERIFICATION_DOCS = [] as any[];

  const m = manufacturer ?? {
    brand_name: '—',
    country: '—',
    business_reg_number: '—',
    website: '',
    sui_address: '',
    email: '',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manufacturer Profile</h2>
        <Button variant="outline">Edit Profile</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <h3 className="font-semibold">Brand Identity</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Brand Name</p>
              <p className="font-medium">{m.name ?? m.brand_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country of Manufacture</p>
              <p className="font-medium">{m.country}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business Registration Number</p>
              <p className="font-mono">{m.businessRegNumber ?? m.business_reg_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Website</p>
              <a
                href={m.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {m.website}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Email</p>
              <p>{m.email ?? m.contactEmail ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <h3 className="font-semibold">Sui Wallet Info</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Connected Address</p>
              <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3 font-mono text-sm">
                <span className="break-all">{m.sui_address ?? m.suiWalletAddress ?? ''}</span>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://suiscan.xyz/testnet/account/0x1234567890abcdef1234567890abcdef12345678"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                View on Suiscan
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <h3 className="font-semibold">Verification Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload and manage your regulatory certifications
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_VERIFICATION_DOCS.map((doc) => (
              <div
                key={doc.type}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-medium">{doc.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.filename} • Uploaded {doc.uploaded}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    IPFS: {doc.ipfs_hash}
                  </p>
                </div>
                <Badge
                  variant={
                    doc.status === "Verified"
                      ? "default"
                      : doc.status === "Pending"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {doc.status}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              Upload New Document
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <h3 className="font-semibold">Verification Status Timeline</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_VERIFICATION_TIMELINE.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    item.done
                      ? "bg-primary/20 text-primary"
                      : item.inProgress
                        ? "bg-warning/20 text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.done ? (
                    <Check className="h-4 w-4" />
                  ) : item.inProgress ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">○</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{item.step}</p>
                  {item.date && (
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  )}
                  {item.note && (
                    <p className="text-sm text-muted-foreground">
                      In Progress ({item.note})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
