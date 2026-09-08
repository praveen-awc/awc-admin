import { cn } from "@/lib/cn";
import type { BlogStatus } from "@/features/blogs/blog.types";

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-200",
} as const;

export type BadgeTone = keyof typeof TONES;

export const Badge = ({
  tone = "slate",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
      TONES[tone],
      className
    )}
  >
    {children}
  </span>
);

/**
 * A post is "scheduled" in the database until its publishedAt passes -- there
 * is no cron flipping it to published. So the label has to be derived from the
 * timestamp, not read straight off `status`.
 */
export const statusLabel = (
  status: BlogStatus,
  publishedAt: string | null
): { label: string; tone: BadgeTone } => {
  if (status === "draft") return { label: "Draft", tone: "slate" };

  const isFuture = publishedAt ? new Date(publishedAt) > new Date() : false;

  if (status === "scheduled") {
    return isFuture
      ? { label: "Scheduled", tone: "amber" }
      : { label: "Published", tone: "green" };
  }

  return isFuture
    ? { label: "Scheduled", tone: "amber" }
    : { label: "Published", tone: "green" };
};
