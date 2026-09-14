import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import {
  activityHref,
  activitySentence,
  listActivity,
  markActivitySeen,
  type ActivityItem,
} from "@/features/activity/activity.api";
import { STATS_POLL_MS } from "@/features/stats/useAdminStats";
import { useAuth } from "@/auth/useAuth";
import { formatRelative } from "@/lib/format";

/**
 * Everything that has happened, newest first.
 *
 * The feed covers both what admins do in the panel and what arrives from the
 * public site -- see the activity controller for why those are two separate
 * sources.
 *
 * Toasts are deliberately left alone: the bell is the full record, while a
 * toast interrupts, and only work that is actually waiting deserves that.
 */
export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const feed = useQuery({
    queryKey: ["activity"],
    queryFn: () => listActivity(15),
    // Same cadence and options as the stats poll rather than a second timer.
    refetchInterval: STATS_POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const seen = useMutation({
    mutationFn: markActivitySeen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activity"] }),
  });

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unread = feed.data?.unreadCount ?? 0;
  const items = feed.data?.items ?? [];

  /*
   * Opening the panel is not the same as having read it. Clearing on open
   * would wipe the count the instant someone glances at the bell, so it is
   * cleared by following a row or pressing "Mark all read".
   */
  const go = (item: ActivityItem) => {
    setOpen(false);
    seen.mutate();
    const href = activityHref(item);
    if (href) navigate(href);
  };

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-200"
        >
          <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Activity
            </h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => seen.mutate()}
                disabled={seen.isPending}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </header>

          <div className="max-h-96 overflow-y-auto">
            {feed.isPending ? (
              <p className="px-3 py-8 text-center text-sm text-slate-400">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-400">
                Nothing has happened yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => go(item)}
                      className={`flex w-full gap-2 px-3 py-2.5 text-left hover:bg-slate-50 ${
                        item.unread ? "bg-brand-50/50" : ""
                      }`}
                    >
                      {/* A dot rather than bold text: the row still has to be
                          readable once it has been read. */}
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          item.unread ? "bg-brand-600" : "bg-transparent"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-slate-800">
                          {activitySentence(item)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {formatRelative(item.createdAt)}
                          {item.detail ? ` · ${item.detail}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* The dropdown only ever holds the newest handful. Admins get the
              full, filterable, exportable history; editors have no such page,
              so there is nothing to point them at. */}
          {user?.role === "admin" && (
            <Link
              to="/activity"
              onClick={() => setOpen(false)}
              className="block border-t border-slate-100 px-3 py-2 text-center text-xs font-medium text-brand-600 hover:bg-slate-50"
            >
              View all activity
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
