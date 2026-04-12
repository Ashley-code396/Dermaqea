"use client";

import { useEffect, useState } from 'react';
import { useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// intentionally not showing connect UI here; user should already be connected via Enoki
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";

// Central backend base URL used across the client pages
const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:5000';

const createAccountSchema = z.object({
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  country: z.string().min(2, "Country is required"),
  businessRegNumber: z.string().min(2, "Business registration number is required"),
  website: z.union([
    z.url({ message: "Enter a valid URL" }),
    z.literal("")
  ]),
  contactEmail: z.string().email({ message: "Enter a valid email" }),
});

type CreateAccountForm = z.infer<typeof createAccountSchema>;

export default function CreateAccountPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [storedAddr, setStoredAddr] = useState<string | null>(null);
  const currentAccount = useCurrentAccount();

  // Keep storedAddr in-sync with the wallet connection. Prefer the live
  // dapp-kit account address when available, otherwise fall back to sessionStorage.
  useEffect(() => {
    try {
      if (currentAccount?.address) {
        sessionStorage.setItem('connectedAddress', currentAccount.address);
        setStoredAddr(currentAccount.address);
      } else {
        setStoredAddr(typeof window !== 'undefined' ? sessionStorage.getItem('connectedAddress') : null);
      }
    } catch (e) {
      // ignore
    }
  }, [currentAccount?.address]);

  const connectedAddress = currentAccount?.address ?? storedAddr;
  const router = useRouter();

  // If there's no connected address, redirect to the Enoki login page so the
  // user can sign in first. This page assumes the user is already authenticated.
  useEffect(() => {
    if (!connectedAddress) {
      // push to the enoki login path where the social login buttons live
      router.replace('/create-account/enoki');
    }
  }, [connectedAddress, router]);

  const form = useForm<CreateAccountForm>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      brandName: "",
      country: "",
      businessRegNumber: "",
      website: "",
      contactEmail: "",
    },
  });

  async function onSubmit(data: CreateAccountForm) {
    setIsSubmitting(true);
    try {
      // Send data to backend API to create manufacturer record
      const res = await fetch(`${base.replace(/\/$/, '')}/manufacturers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.brandName,
          contactEmail: data.contactEmail,
          country: data.country,
          businessRegNumber: data.businessRegNumber,
          website: data.website,
          suiWalletAddress: connectedAddress ?? '',
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to create account: ${res.status} ${txt}`);
      }

      setStep('success');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "success") {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            <Card className="border-border bg-card">
              <CardHeader>
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20"
                  style={{ boxShadow: "0 0 12px rgba(61, 220, 132, 0.25)" }}
                >
                  <span className="text-2xl text-primary">✓</span>
                </div>
                <CardTitle>Application submitted</CardTitle>
                <CardDescription>
                  Thank you for applying to Dermaqea. Our team will review your
                  brand and verification documents within 2–3 business days.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We&apos;ll send a confirmation to{" "}
                  <span className="font-mono text-foreground">
                    {form.getValues("contactEmail")}
                  </span>{" "}
                  with next steps.
                </p>
                <Button className="w-full" asChild>
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="mb-6 inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: "var(--font-syne)" }}>
                Create your account
              </CardTitle>
              <CardDescription>
                Register your cosmetics or skincare brand. You&apos;ll need to
                provide verification documents before submitting products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Dermaqea Labs"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country of manufacture</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Kenya"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessRegNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business registration number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. PVT-2024-001234"
                            className="font-mono bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://yourbrand.com"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contact@yourbrand.com"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    After submitting, you&apos;ll be asked to upload verification
                    documents (business registration, FDA/EU certs, etc.) on your
                    profile page.
                  </p>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting…" : "Create account"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
