"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Copy, ExternalLink, Loader2 } from "lucide-react";
import ViewOnSuiscan from "@/components/ViewOnSuiscan";
import useManufacturer from "@/lib/useManufacturer";
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
export default function ProfilePage() {
  const [storedAddr, setStoredAddr] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStoredAddr(typeof window !== 'undefined' ? sessionStorage.getItem('connectedAddress') : null);
    } catch (e) {
      // ignore
    }
  }, []);
  const connectedAddress = storedAddr;
  const { manufacturer, loading } = useManufacturer(connectedAddress ?? null);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    country: '',
    businessRegNumber: '',
    website: '',
    contactEmail: '',
  });

  const queryClient = useQueryClient();

  // Mutation to update manufacturer profile
  const updateMutation = useMutation<any, Error, any>({
    mutationFn: async (payload: any) => {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:5000';
      const sui = connectedAddress ?? m?.sui_address ?? m?.suiWalletAddress ?? '';
      const url = `${base.replace(/\/$/, '')}/manufacturers/${encodeURIComponent(sui)}`;
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('update failed');
      const body = await res.json();
      return body.data;
    },
    onSuccess(updated) {
      // Update react-query cache so UI updates instantly
      const key = ['manufacturer', connectedAddress ?? m?.sui_address ?? 'self'];
      queryClient.setQueryData(key, updated);
      setEditing(false);
    },
  });

  const isSaving = (updateMutation as any)?.isLoading ?? false;

  // Use real manufacturer data from the API. Provide small fallbacks for missing fields.
  const m = manufacturer ?? null;

  // Populate form when manufacturer data becomes available
  useEffect(() => {
    if (!m) return;
    setForm({
      name: m.name ?? m.brand_name ?? '',
      country: m.country ?? '',
      businessRegNumber: m.businessRegNumber ?? m.business_reg_number ?? '',
      website: m.website ?? '',
      contactEmail: m.email ?? m.contactEmail ?? '',
    });
  }, [m]);

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
        {!editing ? (
          <Button
            variant="default"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="default"
              className="bg-emerald-600 text-white hover:bg-emerald-700 flex items-center"
              onClick={() => updateMutation.mutate(form)}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                // reset form to current manufacturer values and exit edit mode
                setForm({
                  name: m?.name ?? m?.brand_name ?? '',
                  country: m?.country ?? '',
                  businessRegNumber: m?.businessRegNumber ?? m?.business_reg_number ?? '',
                  website: m?.website ?? '',
                  contactEmail: m?.email ?? m?.contactEmail ?? '',
                });
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <h3 className="font-semibold">Brand Identity</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Brand Name</p>
              {!editing ? (
                <p className="font-medium">{m?.name ?? m?.brand_name ?? '—'}</p>
              ) : (
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country of Manufacture</p>
              {!editing ? (
                <p className="font-medium">{m?.country ?? '—'}</p>
              ) : (
                <Input value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business Registration Number</p>
              {!editing ? (
                <p className="font-mono">{m?.businessRegNumber ?? m?.business_reg_number ?? '—'}</p>
              ) : (
                <Input value={form.businessRegNumber} onChange={(e) => setForm((s) => ({ ...s, businessRegNumber: e.target.value }))} />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Website</p>
              {!editing ? (
                m?.website ? (
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
                )
              ) : (
                <Input value={form.website} onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))} />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Email</p>
              {!editing ? (
                <p>{m?.email ?? m?.contactEmail ?? '—'}</p>
              ) : (
                <Input value={form.contactEmail} onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} />
              )}
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
            {!uploading && !showUploadForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowUploadForm(true)}>
                Upload New Document
              </Button>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!fileInputRef.current || !fileInputRef.current.files || fileInputRef.current.files.length === 0) return;
                  const file = fileInputRef.current.files[0];
                  setUploading(true);
                  try {
                    const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:5000';
                    const url = `${base.replace(/\/$/, '')}/manufacturers/${encodeURIComponent(connectedAddress ?? '')}/documents`;
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('docType', docType || file.name);
                    const res = await fetch(url, { method: 'POST', body: fd });
                    if (!res.ok) {
                      // TODO: better error handling
                      console.error('upload failed', await res.text());
                    } else {
                      // refresh the page data — simplest: reload
                      window.location.reload();
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-muted-foreground">Document Type</label>
                    <Input
                      className="border-2 border-emerald-400/30 bg-emerald-50"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      placeholder="e.g. Business Registration"
                    />
                  </div>
                  <div>
                    <input type="file" ref={fileInputRef} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={uploading}>
                      {uploading ? 'Uploading…' : 'Submit'}
                    </Button>
                    <Button variant="ghost" className="flex-1" onClick={() => { setShowUploadForm(false); setDocType(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}
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
