/** Short absolute date, e.g. "8 Sep 2026". Em dash when absent. */
export const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

/** Date with time, for records where the hour matters (applications, leads). */
export const formatDateTime = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** "3 days ago" style, falling back to an absolute date beyond a month. */
export const formatRelative = (value?: string | null): string => {
  if (!value) return "—";

  const then = new Date(value).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatDate(value);
};

/**
 * Title-cases a status slug for display: "shortlisted" -> "Shortlisted".
 *
 * Tolerates missing values rather than throwing. Records written by an older
 * deployment can be missing fields this UI expects, and a display helper
 * blowing up takes the whole page down with it -- see the status fallbacks in
 * the application and lead lists.
 */
export const titleCase = (value?: string | null): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
