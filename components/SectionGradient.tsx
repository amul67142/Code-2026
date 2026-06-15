"use client";

import { cn } from "@/lib/utils";

type Position = "top" | "bottom" | "center";

const POS: Record<Position, string> = {
  top: "at 50% 0%",
  bottom: "at 50% 100%",
  center: "at 50% 50%",
};

/**
 * Soft, monochrome gradient wash for a section background — adds depth on plain
 * white/black without grids or colour. Theme-aware, fades to transparent.
 * Sits behind content (give the content `relative z-10`).
 */
export function SectionGradient({
  isDark,
  position = "top",
  className,
}: {
  isDark: boolean;
  position?: Position;
  className?: string;
}) {
  const tint = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-0 transition-opacity duration-500", className)}
      style={{ backgroundImage: `radial-gradient(ellipse 85% 55% ${POS[position]}, ${tint}, transparent 70%)` }}
    />
  );
}
