
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import useManufacturer from '@/lib/useManufacturer';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useCurrentNetwork } from '@mysten/dapp-kit-react';
import { useWalletSync } from '@/components/blockchain/WalletSyncProvider';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const currentAccount = useCurrentAccount();
  const { connectedAddress, setConnectedAddress } = useWalletSync();
  const { mutateAsync: disconnect } = useDisconnectWallet();
  const router = useRouter();

  // read the active Sui network from the dapp-kit context
  const currentNetwork = useCurrentNetwork();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // prefer current dapp-kit account address, fallback to stored connectedAddress
  const effectiveAddress = currentAccount?.address ?? connectedAddress ?? null;

  // Load real manufacturer data for the connected wallet (falls back to server-side list when null)
  const { manufacturer, loading } = useManufacturer(effectiveAddress);

  const [brand, setBrand] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (manufacturer) {
      setBrand(manufacturer.name ?? manufacturer.brand_name ?? '');
      setEmail(manufacturer.email ?? '');
      setWebsite(manufacturer.website ?? '');
    }
  }, [manufacturer]);

  const handleSave = async () => {
    if (!effectiveAddress) return;
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:5000';
      const url = `${base.replace(/\/$/, '')}/manufacturers/${encodeURIComponent(effectiveAddress)}`;
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: brand, email, website }) });
      if (!res.ok) throw new Error('Failed to save');
      // refresh to pick up changes
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to save changes');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      // ignore provider disconnect errors — still clear local state
      console.warn('disconnect error', err);
    }
    try { localStorage.removeItem('connectedAddress'); } catch {}
    setConnectedAddress(null);
    router.refresh();
  };

  // Delete account modal + action
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!effectiveAddress) return;
    setDeleting(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:5000';
      const url = `${base.replace(/\/$/, '')}/manufacturers/${encodeURIComponent(effectiveAddress)}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      // cleanup local state and disconnect
      try { await disconnect(); } catch (e) { /* ignore */ }
      try { localStorage.removeItem('connectedAddress'); } catch {}
      setConnectedAddress(null);
      setDeleteOpen(false);
      // navigate home (or to signup flow)
      router.push('/');
    } catch (err) {
      console.error(err);
      alert('Failed to delete account');
      setDeleting(false);
    }
  };
  const truncatedAddress = effectiveAddress
    ? `${effectiveAddress.slice(0, 10)}...${effectiveAddress.slice(-8)}`
    : '';
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Account Settings</h2>

      <Card className="border-border bg-card">
        <CardHeader>
          <h3 className="font-semibold">Profile</h3>
          <CardDescription>Update your manufacturer profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand Name</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}>Save Changes</Button>
            <Button variant="ghost" onClick={() => { if (manufacturer) { setBrand(manufacturer.name ?? manufacturer.brand_name ?? ''); setEmail(manufacturer.email ?? ''); setWebsite(manufacturer.website ?? ''); } }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <h3 className="font-semibold">Notifications</h3>
          <CardDescription>Configure alert preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Counterfeiting Alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive alerts when QR codes are flagged for suspicious activity
              </p>
            </div>
            <Checkbox defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Product Approval Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get notified when products are approved or need attention
              </p>
            </div>
            <Checkbox defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Batch Expiry Reminders</p>
              <p className="text-sm text-muted-foreground">
                Remind before batches approach expiry (60 days)
              </p>
            </div>
            <Checkbox defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <h3 className="font-semibold">Blockchain</h3>
          <CardDescription>Network and wallet settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Network</p>
            <p className="font-mono">{currentNetwork ? currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1) : 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Connected Wallet</p>
            <p className="font-mono text-sm">
              {mounted ? (
                effectiveAddress ? (
                  <>
                    {effectiveAddress.slice(0, 10)}...{effectiveAddress.slice(-8)}
                  </>
                ) : (
                  'Not connected'
                )
              ) : (
                // match the server-rendered content to avoid hydration mismatch
                'Not connected'
              )}
            </p>
          </div>
          <Button variant="outline" onClick={handleDisconnect}>Disconnect Wallet</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={!effectiveAddress}>Delete Account</Button>
              </DialogTrigger>

              <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete account</DialogTitle>
                <DialogDescription>
                  This will permanently delete your manufacturer account and all associated data (products, batches, documents). This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4">
                <p className="text-sm">Are you sure you want to delete the account for <span className="font-mono break-all">{truncatedAddress}</span>?</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={deleting || !effectiveAddress}>
                  {deleting ? 'Deleting…' : 'Delete account'}
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
