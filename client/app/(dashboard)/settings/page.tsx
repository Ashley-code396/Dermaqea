import { MOCK_MANUFACTURER } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function SettingsPage() {
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
              defaultValue={MOCK_MANUFACTURER.brand_name}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue="contact@dermaqea.com"
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              defaultValue={MOCK_MANUFACTURER.website}
              className="max-w-md"
            />
          </div>
          <Button>Save Changes</Button>
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
            <p className="font-mono">Testnet</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Connected Wallet</p>
            <p className="font-mono text-sm">
              {MOCK_MANUFACTURER.sui_address.slice(0, 10)}...
              {MOCK_MANUFACTURER.sui_address.slice(-8)}
            </p>
          </div>
          <Button variant="outline">Disconnect Wallet</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
