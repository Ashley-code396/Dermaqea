import type { Metadata } from "next";
import { Syne, DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/ThemeProvider";
import Script from 'next/script';
import { SuiProvider } from "./providers";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Do not render a theme-dependent class on the server. Instead inject
  // a tiny inline script that reads the `next-theme` cookie and sets the
  // `<html>` class *before* React hydrates. This avoids hydration
  // mismatches between server and client-rendered markup.

  const themeInitScript = `(function(){try{var m=document.cookie.match('(^|;)\\s*next-theme=([^;]+)');var t=m?decodeURIComponent(m[2]):null;if(t==='dark'||t==='light'){document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}else{document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}}catch(e){} })();`;

  return (
    <html lang="en">
      <head>
        {/* Run beforeInteractive so the class is applied before React hydration */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${syne.variable} ${dmMono.variable} ${instrumentSans.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <SuiProvider>
            {children}
          </SuiProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
