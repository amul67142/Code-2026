"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Optional id — forwarded to the wrapper so it can serve as a scroll anchor. */
  id?: string;
  /** Delay before the reveal starts, in ms — use to stagger heading → content. */
  delay?: number;
  /** Distance (px) the element travels up as it fades in. */
  y?: number;
  /** Transition duration in ms. */
  duration?: number;
  /** Re-run the animation every time it scrolls back into view. Default: once. */
  repeat?: boolean;
};

/**
 * Subtle, sleek scroll-reveal wrapper. Fades + slides its children up the
 * moment they enter the viewport. No glow / lighting — motion only.
 * Honours prefers-reduced-motion by showing content instantly.
 */
export function Reveal({
  children,
  className,
  id,
  delay = 0,
  y = 16,
  duration = 700,
  repeat = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who prefer reduced motion — show instantly, no animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (!repeat) observer.disconnect();
        } else if (repeat) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [repeat]);

  return (
    <div
      ref={ref}
      id={id}
      className={cn("will-change-transform", className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
