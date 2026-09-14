import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminStats } from "@/features/stats/useAdminStats";
import { useAuth } from "@/auth/useAuth";
import { useToast } from "@/components/ui/Toast";

const BASE_TITLE = "AWC Admin";

/**
 * The two things that arrive from outside rather than from an admin.
 *
 * Both singular and plural are spelled out because "enquiry" does not
 * pluralise by adding an s.
 */
const WATCHED = [
  { key: "applications", to: "/applications", one: "application", many: "applications" },
  { key: "leads", to: "/leads", one: "enquiry", many: "enquiries" },
] as const;

type WatchedKey = (typeof WATCHED)[number]["key"];
type Counts = Record<WatchedKey, number>;

const ZERO: Counts = { applications: 0, leads: 0 };

/**
 * Per-user, because two people signing in on the same machine must not
 * inherit each other's baseline.
 */
const storageKey = (userId: string) => `awc-admin:seen:${userId}`;

/**
 * localStorage throws outright in a private window or when a browser is set to
 * block site data. A notification is a convenience -- it must never be the
 * reason the panel fails to load.
 */
const readSeen = (userId: string): Counts | null => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Counts>;
    // Anything unreadable is treated as absent, which costs one silent poll.
    if (typeof parsed?.applications !== "number") return null;
    if (typeof parsed?.leads !== "number") return null;

    return { applications: parsed.applications, leads: parsed.leads };
  } catch {
    return null;
  }
};

const writeSeen = (userId: string, counts: Counts): void => {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(counts));
  } catch {
    // Falls back to in-memory only: notifications work until the tab reloads.
  }
};

/**
 * Watches the polled stats and tells the admin when new work arrives.
 *
 * Called once from AdminLayout, which never unmounts, so polling keeps running
 * whatever page they are on.
 *
 * Only applications and leads are watched. Everything else in the panel
 * changes because an admin changed it, so announcing those would be noise.
 */
export const useActivityNotifications = () => {
  const { data } = useAdminStats();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const userId = user?.id;

  /**
   * Counts already accounted for.
   *
   * Seeded from localStorage rather than starting empty on every mount. An
   * in-memory-only baseline reset on each page load, so the common case --
   * submit something, then open the panel to look -- was silent every single
   * time, which defeated the whole feature. Persisting it also covers "3
   * arrived while you were away", which is what people expect a notification
   * to tell them.
   */
  const seen = useRef<Counts | null>(null);
  const seededFor = useRef<string | null>(null);

  const [unseen, setUnseen] = useState<Counts>(ZERO);

  useEffect(() => {
    if (!data || !userId) return;

    // Re-read when the signed-in user changes, so a second account on the
    // same machine starts from its own baseline.
    if (seededFor.current !== userId) {
      seededFor.current = userId;
      seen.current = readSeen(userId);
    }

    const current = { ...ZERO };
    for (const { key } of WATCHED) current[key] = data[key]?.new ?? 0;

    const previous = seen.current;
    seen.current = current;
    writeSeen(userId, current);

    // Nothing stored yet: this is the very first time this account has opened
    // the panel. Record where things stand and say nothing, otherwise signing
    // in would announce the entire untriaged backlog.
    if (!previous) return;

    const arrived = { ...ZERO };
    let any = false;

    for (const { key, to, one, many } of WATCHED) {
      const added = current[key] - previous[key];

      // Strictly greater: working through the queue makes the count fall, and
      // that is not news.
      if (added <= 0) continue;

      arrived[key] = added;
      any = true;
      toast.info(`${added} new ${added === 1 ? one : many}`, () => navigate(to));
    }

    if (any) {
      setUnseen((count) => ({
        applications: count.applications + arrived.applications,
        leads: count.leads + arrived.leads,
      }));
    }
  }, [data, userId, toast, navigate]);

  /*
   * Opening a list counts as having seen what arrived for it.
   *
   * Adjusted during render rather than in an effect: React re-runs the
   * component before committing, so the tab title never briefly shows a count
   * for the page already on screen. Same pattern as useSeedFromRecord.
   */
  const visited = WATCHED.find((entry) => pathname.startsWith(entry.to));
  if (visited && unseen[visited.key] !== 0) {
    setUnseen((count) => ({ ...count, [visited.key]: 0 }));
  }

  /**
   * Puts the count where it is visible from another tab, which is the whole
   * point -- a toast only helps someone already looking at the panel.
   */
  useEffect(() => {
    const pending = unseen.applications + unseen.leads;
    document.title = pending > 0 ? `(${pending}) ${BASE_TITLE}` : BASE_TITLE;

    return () => {
      document.title = BASE_TITLE;
    };
  }, [unseen]);
};
