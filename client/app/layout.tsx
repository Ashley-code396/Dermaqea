import type { Metadata } from "next";
import { Syne, DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/ThemeProvider";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  weight: "400",
  variable: "--font-dm-mono",
  subsets: ["latin"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dermaqea Manufacturer Dashboard",
  description: "Product authentication platform for cosmetics manufacturers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Do not hardcode a theme class on the html element so the ThemeProvider
  // can manage the class consistently. Default theme is set in
  // components/ThemeProvider.tsx (defaultTheme="light").
  // To avoid hydration mismatches we render the same theme attributes
  // on the server as the client will expect (class + color-scheme).
  <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body
        className={`${syne.variable} ${dmMono.variable} ${instrumentSans.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
