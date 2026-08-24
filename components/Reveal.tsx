"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
 * Scroll-reveal wrapper, GSAP-powered. Fades + slides children up as they
 * enter the viewport with a refined power3 ease. Honours
 * prefers-reduced-motion (content shows instantly, no animation), and if
 * JavaScript never runs the content is simply visible — nothing is hidden
 * in CSS.
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

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            duration: duration / 1000,
            delay: delay / 1000,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              ...(repeat
                ? { toggleActions: "play none none reverse" }
                : { once: true }),
            },
          }
        );
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} id={id} className={cn(className)}>
      {children}
    </div>
  );
}
