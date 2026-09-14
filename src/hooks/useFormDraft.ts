import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "awc-admin:draft";
const DEBOUNCE_MS = 800;

interface StoredDraft<T> {
  savedAt: string;
  data: T;
}

const read = <T,>(key: string): StoredDraft<T> | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredDraft<T>) : null;
  } catch {
    // localStorage throws outright in private windows and when a browser is
    // set to block site data. No draft is not an error.
    return null;
  }
};

/**
 * Keeps a debounced snapshot of an in-progress form in localStorage, so a crash
 * or an accidental navigation doesn't lose the work.
 *
 * Every access is guarded; if storage is unavailable the feature simply goes
 * quiet and the editor keeps working.
 */
export const useFormDraft = <T,>(
  module: string,
  id: string | undefined,
  value: T,
  { enabled = true, savedAt }: { enabled?: boolean; savedAt?: string } = {}
) => {
  const key = `${PREFIX}:${module}:${id ?? "new"}`;

  // Read during the first render rather than in an effect: an effect would
  // render once without the draft and then again with it.
  const [stored, setStored] = useState<StoredDraft<T> | null>(() => read<T>(key));

  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ savedAt: new Date().toISOString(), data: value })
        );
      } catch {
        // Quota exceeded or storage blocked -- nothing useful to do.
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer.current);
  }, [enabled, key, value]);

  const clearDraft = useCallback(() => {
    setStored(null);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  }, [key]);

  // Staleness is decided at render, not at read time: the server's updatedAt
  // arrives from a query that may still have been loading on first render.
  // A draft older than the record itself means it was edited elsewhere since.
  const isStale =
    Boolean(savedAt) &&
    Boolean(stored) &&
    new Date(stored!.savedAt) <= new Date(savedAt!);

  return { draft: isStale ? null : stored, clearDraft };
};
