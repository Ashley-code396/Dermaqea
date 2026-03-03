"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid rendering theme-dependent UI during SSR to prevent hydration mismatches.
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label="Toggle color theme"
    >
      {/* Render actual icon only after client mount to keep server and client HTML consistent */}
      {mounted ? (
        resolvedTheme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )
      ) : (
        // placeholder element to preserve layout during SSR
        <span className="h-5 w-5 inline-block" aria-hidden />
      )}
    </Button>
  );
}
