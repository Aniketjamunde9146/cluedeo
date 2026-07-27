"use client";

/**
 * StatusState — one component for every "something is happening / something
 * went wrong" moment in the app (generator page, chat page, future ones).
 *
 * ui-ux-pro-max rules applied:
 * - Accessibility: aria-live region, role="alert" for errors so screen
 *   readers announce failures immediately without the user hunting for them
 * - Touch & Interaction: retry target is 44px minimum
 * - Animation: entrance is 150–300ms range, transform/opacity only
 *   (compositor-friendly, no layout thrash), and is skipped entirely under
 *   prefers-reduced-motion rather than just shortened
 * - Forms & Feedback: real heading + one line of detail, not a bare icon
 */

import { useRef } from "react";
import { LuLoaderCircle, LuCircleAlert, LuInbox } from "react-icons/lu";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ReactNode } from "react";

type StatusVariant = "loading" | "error" | "empty";

type StatusStateProps = {
  variant: StatusVariant;
  /** Short, specific — describes what's happening or what failed. */
  heading: string;
  /** One sentence of supporting detail. Optional. */
  description?: string;
  /** Shown only for variant="error". Wire this to your retry handler. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Compact renders inline (e.g. under a form); default is a full block. */
  density?: "compact" | "block";
  icon?: ReactNode;
  className?: string;
};

const VARIANT_STYLES: Record<
  StatusVariant,
  { iconWrap: string; iconColor: string }
> = {
  loading: {
    iconWrap: "bg-accent-soft",
    iconColor: "text-accent",
  },
  error: {
    iconWrap: "bg-red-500/10",
    iconColor: "text-red-400",
  },
  empty: {
    iconWrap: "bg-white/[0.06]",
    iconColor: "text-text-muted",
  },
};

export default function StatusState({
  variant,
  heading,
  description,
  onRetry,
  retryLabel = "Try again",
  density = "block",
  icon,
  className = "",
}: StatusStateProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const styles = VARIANT_STYLES[variant];
  const isCompact = density === "compact";

  // Entrance animation — re-fires whenever heading/variant changes, so a
  // fresh error or a new loading message always draws the eye briefly
  // instead of silently swapping text underneath the user.
  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el) return;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) return;

      gsap.fromTo(
        el,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
      );
    },
    { dependencies: [variant, heading], scope: rootRef }
  );

  const defaultIcon =
    variant === "loading" ? (
      <LuLoaderCircle className={`h-5 w-5 animate-spin ${styles.iconColor}`} />
    ) : variant === "error" ? (
      <LuCircleAlert className={`h-5 w-5 ${styles.iconColor}`} />
    ) : (
      <LuInbox className={`h-5 w-5 ${styles.iconColor}`} />
    );

  return (
    <div
      ref={rootRef}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-3 ${
        isCompact
          ? "rounded-[14px] border border-border bg-surface p-3.5"
          : "rounded-[18px] border border-border bg-surface p-5"
      } ${className}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}
      >
        {icon ?? defaultIcon}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[14px] font-bold leading-snug text-text">
          {heading}
        </p>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}

        {variant === "error" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-text px-4 text-[13px] font-semibold text-bg transition-colors hover:bg-white active:scale-[0.98]"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * SkeletonRows — for the specific "we know the shape of what's coming"
 * loading case (e.g. the link cards on the generator page). Pair it with a
 * StatusState(loading) heading above it so the skeleton isn't the only
 * signal something is happening. CSS `animate-pulse` only, deliberately —
 * it's a compositor-only opacity animation, cheaper than a JS-driven one
 * for something that may render many rows at once.
 */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[76px] animate-pulse rounded-[16px] bg-white/[0.04]"
        />
      ))}
    </div>
  );
}