import type { BadgeTone } from "@/components/ui/Badge";
import type { BlogStatus } from "@/features/blogs/blog.types";

/**
 * A post is "scheduled" in the database until its publishedAt passes -- there
 * is no cron flipping it to published. So the label has to be derived from the
 * timestamp, not read straight off `status`.
 *
 * Lives here rather than beside Badge so that file exports only components and
 * stays eligible for fast refresh.
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
