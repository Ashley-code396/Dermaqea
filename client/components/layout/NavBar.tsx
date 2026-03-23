"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-primary/40 dark:border-primary/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-semibold text-primary" style={{ fontFamily: "var(--font-syne)" }}>
            Dermaqea
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </Link>
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/create-account/enoki">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/create-account/enoki">Create account</Link>
          </Button>
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent/50"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden mt-16 w-full border-t border-border bg-background/90 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
            <Link href="/#features" className="block text-sm text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="/#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">How it works</Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="flex-1">
                <Link href="/create-account/enoki">Sign in</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/create-account/enoki">Create account</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
