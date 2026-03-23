"use client";

import Link from "next/link";
import { Twitter, Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-primary/40 dark:border-primary/60 bg-card py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="text-xl font-semibold text-primary" style={{ fontFamily: "var(--font-syne)" }}>
              Dermaqea
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Product authentication powered by the Sui blockchain. Built for
              manufacturers to protect products and customers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/products" className="hover:text-foreground">Products</Link>
                </li>
                <li>
                  <Link href="/batches" className="hover:text-foreground">Batches</Link>
                </li>
                <li>
                  <Link href="/qr-codes" className="hover:text-foreground">QR Codes</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/#how-it-works" className="hover:text-foreground">How it works</Link>
                </li>
                <li>
                  <Link href="/create-account/enoki" className="hover:text-foreground">Create account</Link>
                </li>
                <li>
                  <Link href="/create-account/enoki" className="hover:text-foreground">Sign in</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">Contact</h4>
              <p className="text-sm text-muted-foreground">
                <a href="mailto:dermaqea@gmail.com" className="hover:underline">dermaqea@gmail.com</a>
              </p>
              <div className="mt-4 flex items-center gap-4">
                <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-foreground">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-foreground">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" aria-label="GitHub" className="text-muted-foreground hover:text-foreground">
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} Dermaqea. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
