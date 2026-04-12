import type { Metadata } from "next";
import { Syne, DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/ThemeProvider";
import Script from 'next/script';
import { cookies } from 'next/headers';
import { Providers } from "./providers";

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
  // If a server-rendered route has already set the `next-theme` cookie
  // (see some server pages that set it explicitly), read it here and
  // render the matching `class` and `color-scheme` on the `<html>` tag
  // so the server markup matches the client. Otherwise leave it unset
  // and rely on the client-side `themeInitScript` to apply a class
  // before hydration.
  const cookieStore = await cookies();
  const nextThemeCookie = cookieStore.get('next-theme')?.value;
  const serverTheme = nextThemeCookie === 'dark' || nextThemeCookie === 'light' ? nextThemeCookie : null;

  const themeInitScript = `(function(){try{var m=document.cookie.match('(^|;)\\s*next-theme=([^;]+)');var t=m?decodeURIComponent(m[2]):null;if(t==='dark'||t==='light'){document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}else{document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}}catch(e){} })();`;

  return (
    // Do not render a theme-dependent class or color-scheme on the server.
    // The inline `themeInitScript` runs before React hydrates and will set
    // the correct class (light/dark) and color-scheme on the client to
    // avoid hydration mismatches.
    <html
      lang="en"  suppressHydrationWarning
      {...(serverTheme
        ? { className: serverTheme, style: { colorScheme: serverTheme } }
        : {})}
    >
      <head>
        {/* Run beforeInteractive so the class is applied before React hydration */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${syne.variable} ${dmMono.variable} ${instrumentSans.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <Providers>
            {children}
          </Providers>
          <Toaster />
        </ThemeProvider>
        {/* Portal for Enoki to mount UI elements (social login popup) */}
        <div id="enoki-info-portal" />
      </body>
    </html>
  );
}
