"use client";

import React from "react";
import { useTheme } from "next-themes";

export default function HeroImage({
  className,
  alt,
}: {
  className?: string;
  alt?: string;
}) {
  const { resolvedTheme } = useTheme();

  // Use a light-mode image when available; fall back to the dark image.
  const lightSrc = "/dermaqealight.png";
  const darkSrc = "/dermaqea2.jpg";
  const src = resolvedTheme === "dark" ? darkSrc : lightSrc;

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.endsWith(lightSrc)) {
      img.src = darkSrc;
    }
  };

  return (
    // loading="lazy" helps page performance; `onError` falls back if light image missing
    <img
      src={src}
      alt={alt ?? "Dermaqea skincare product"}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  );
}
