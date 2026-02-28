"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import React from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    // Force light as the default theme and do not follow the OS setting.
    <NextThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemeProvider>
  );
}

export default ThemeProvider;
