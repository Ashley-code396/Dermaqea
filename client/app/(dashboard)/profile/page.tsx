"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Copy, ExternalLink } from "lucide-react";
import ViewOnSuiscan from "@/components/ViewOnSuiscan";
import useManufacturer from "@/lib/useManufacturer";
import { useWalletSync } from '@/components/blockchain/WalletSyncProvider';

export default function ProfilePage() {
  const { connectedAddress } = useWalletSync();
  const { manufacturer, loading } = useManufacturer(connectedAddress ?? null);

  // Use real manufacturer data from the API. Provide small fallbacks for missing fields.
  const m = manufacturer ?? null;

  // Derive verification documents and timeline from the manufacturer payload
  const verificationDocs = (m?.documents && m.documents.length > 0) ? m.documents : [];

  const verificationTimeline = (() => {
    const steps: Array<any> = [];
    if (m) {
      steps.push({ step: "Account Created", done: true, date: m.createdAt ? new Date(m.createdAt).toDateString() : undefined });
      if (verificationDocs.length > 0) {
        // Use the earliest uploadedAt as documents submitted date
        const uploadedDates = verificationDocs.map((d: any) => d.uploadedAt).filter(Boolean).sort();
        steps.push({ step: "Documents Submitted", done: true, date: uploadedDates.length > 0 ? new Date(uploadedDates[0]).toDateString() : undefined });
      } else {
        steps.push({ step: "Documents Submitted", done: false });
      }

      const anyPending = verificationDocs.some((d: any) => d.status === 'PENDING');
      steps.push({ step: "Dermaqea Review", done: !anyPending && verificationDocs.length > 0, inProgress: anyPending });

      steps.push({ step: "Verified Manufacturer", done: m.verificationStatus === 'VERIFIED' });

      const hasProducts = (m.products && m.products.length > 0);
      steps.push({ step: "First Product Submission", done: hasProducts });
    } else {
      // No manufacturer loaded yet — show minimal skeleton steps
      steps.push({ step: "Account Created", done: false });
      steps.push({ step: "Documents Submitted", done: false });
      steps.push({ step: "Dermaqea Review", done: false });
      steps.push({ step: "Verified Manufacturer", done: false });
      steps.push({ step: "First Product Submission", done: false });
    }
    return steps;
  })();

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
              <p className="font-medium">{m?.name ?? m?.brand_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country of Manufacture</p>
              <p className="font-medium">{m?.country ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business Registration Number</p>
              <p className="font-mono">{m?.businessRegNumber ?? m?.business_reg_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Website</p>
              {m?.website ? (
                <a
                  href={m.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {m.website}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Email</p>
              <p>{m?.email ?? m?.contactEmail ?? '—'}</p>
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
                <span className="break-all">{m?.sui_address ?? m?.suiWalletAddress ?? ''}</span>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* View on Suiscan: prefer the connected client wallet, fall back to the manufacturer's stored address */}
            <ViewOnSuiscan fallbackAddress={m?.sui_address ?? m?.suiWalletAddress ?? undefined} />
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
            {verificationDocs.length === 0 ? (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">No documents uploaded yet.</div>
            ) : (
              verificationDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{doc.docType}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.filename} • Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toDateString() : 'unknown'}
                    </p>
                    {doc.ipfsHash && (
                      <p className="font-mono text-xs text-muted-foreground">IPFS: {doc.ipfsHash}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      doc.status === "VERIFIED"
                        ? "default"
                        : doc.status === "PENDING"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))
            )}
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
            {verificationTimeline.map((item: any, i: number) => (
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
