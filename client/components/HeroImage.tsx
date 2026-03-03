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
  // prefer the new landing asset if present
  const lightSrc = "/dermaqea.png";
  const darkSrc = "/dermaqea2.jpg";
  const src = resolvedTheme === "dark" ? darkSrc : lightSrc;

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // If the preferred light image fails to load, try the dark image as a fallback.
    if (img.src.endsWith(lightSrc)) {
      img.src = darkSrc;
      return;
    }
    // If the dark image also fails, attempt to load the generic dermaqea.png (if not already)
    if (!img.src.endsWith("/dermaqea.png")) {
      img.src = "/dermaqea.png";
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
