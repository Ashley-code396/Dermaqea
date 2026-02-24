import Link from "next/link";
import { Shield, QrCode, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span
            className="text-xl font-semibold text-primary"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Dermaqea
          </span>
          <nav className="flex items-center gap-6">
            <Link
              href="/#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </Link>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/create-account">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-screen items-center px-6 pt-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col items-center lg:flex-row lg:items-stretch">
            {/* Left: text (takes half on lg) */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left px-4 lg:px-12">
              <h1
                className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Make your skincare
                <br />
                <span className="text-primary">undeniably yours</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Protect your brand from fake or unauthorized copies.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Button size="lg" asChild>
                  <Link href="/create-account" className="gap-2">
                    Get started
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/dashboard">View dashboard</Link>
                </Button>
              </div>
            </div>

            {/* Right: image (takes half on lg) */}
            <div className="hidden lg:block lg:w-1/2">
              <img
                src="/dermaqea2.jpg"
                alt="Dermaqea skincare product"
                className="hero-image w-full h-[80vh] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="mb-16 text-center text-3xl font-bold"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Built for manufacturers
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Blockchain verification"
              description="Every product gets a unique on-chain identity. Consumers scan to verify authenticity."
            />
            <FeatureCard
              icon={<QrCode className="h-8 w-8" />}
              title="QR code generation"
              description="Batch-generate print-ready QR codes. Mint as Sui objects, export PDF or CSV."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Anti-counterfeiting"
              description="Monitor scan patterns. Get alerts when codes show impossible travel or suspicious activity."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Supply chain integrity"
              description="Flag stolen batches. Protect your brand and your customers from counterfeit products."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2
            className="mb-12 text-3xl font-bold"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            How it works
          </h2>
          <ol className="space-y-8 text-left">
            <li className="flex gap-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-primary">
                1
              </span>
              <div>
                <h3 className="font-semibold">Create your account</h3>
                <p className="mt-1 text-muted-foreground">
                  Submit your brand and verification documents. Dermaqea reviews
                  within 2–3 business days.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-primary">
                2
              </span>
              <div>
                <h3 className="font-semibold">Submit products</h3>
                <p className="mt-1 text-muted-foreground">
                  Add ingredients, certifications, and images. Products get a
                  unique ID after approval.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-primary">
                3
              </span>
              <div>
                <h3 className="font-semibold">Create batches & QR codes</h3>
                <p className="mt-1 text-muted-foreground">
                  Create production batches, mint QR codes on Sui, and download
                  print-ready labels.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-primary">
                4
              </span>
              <div>
                <h3 className="font-semibold">Monitor & protect</h3>
                <p className="mt-1 text-muted-foreground">
                  Track scan analytics. Flag stolen batches. Keep your supply
                  chain transparent.
                </p>
              </div>
            </li>
          </ol>
          <div className="mt-16">
            <Button size="lg" asChild>
              <Link href="/create-account">Create your account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span
              className="text-primary"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Dermaqea
            </span>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="/create-account" className="hover:text-foreground">
                Create account
              </Link>
              <Link href="/dashboard" className="hover:text-foreground">
                Sign in
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Product authentication powered by the Sui blockchain.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
