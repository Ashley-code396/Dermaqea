import Link from "next/link";
import { Shield, QrCode, BarChart3, Zap } from "lucide-react";
import HeroImage from "@/components/HeroImage";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/layout/NavBar";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <NavBar />

  {/* Hero */}
      <section className="flex items-center px-6 pt-24 border-b border-primary/40 dark:border-primary/60 min-h-[60vh] lg:min-h-[75vh]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col items-center lg:flex-row lg:items-stretch">
            {/* Left: text (takes half on lg) */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left px-4 lg:pl-0 lg:pr-12">
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
                  <Link href="/create-account/enoki" className="gap-2">
                    Get started
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/create-account/enoki">View dashboard</Link>
                </Button>
              </div>
            </div>

            {/* Right: image (visible on mobile and desktop) */}
            <div className="w-full lg:w-1/2 mt-8 lg:mt-0 flex items-center justify-center">
              <div className="hero-image-wrapper w-full flex items-center justify-center">
                <HeroImage className="hero-image w-full lg:max-w-none lg:w-[90%] mx-auto h-auto lg:h-[72vh] object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-primary/40 dark:border-primary/60 bg-card/50 py-24">
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
      <section id="how-it-works" className="border-t border-primary/40 dark:border-primary/60 py-24">
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
              <Link href="/create-account/enoki">Create your account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/50 dark:border-primary/70 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span
              className="text-primary"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Dermaqea
            </span>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="/create-account/enoki" className="hover:text-foreground">
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