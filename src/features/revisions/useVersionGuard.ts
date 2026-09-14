import { useState } from "react";
import { errorCode } from "@/lib/api";

/**
 * Tracks which version of a record this form is based on, so a save cannot
 * silently erase someone else's.
 *
 * The editor reports the updatedAt it has seen -- once when the record loads,
 * and again after every save. That value goes back with the next write, and
 * the server refuses it if the stored document has moved on since.
 *
 * WHY IT IS TRACKED HERE AND NOT READ FROM THE QUERY
 *
 * The obvious source is `existing.data.updatedAt`, but a successful save does
 * not invalidate that query -- only the list is refetched. The cached record
 * would keep its original timestamp, so the SECOND save of a session would be
 * rejected as stale when nothing was wrong. Keeping the value in state, fed
 * from each response, means it always reflects the version actually held.
 *
 * `expected` stays null for a new record and whenever the check is waived,
 * which the server reads as "no expectation" and applies unconditionally.
 */
export const useVersionGuard = () => {
  const [expected, setExpected] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  return {
    /** Send as expectedUpdatedAt. Null means the write is not guarded. */
    expected,

    /** Record the version now held: on load, and after each successful save. */
    seen: (updatedAt?: string | null) => setExpected(updatedAt ?? null),

    /** True while the conflict prompt should be shown. */
    conflict,

    /**
     * Call from onError. Returns true when this was a lost-update rejection,
     * which it has handled -- the caller should not also toast.
     */
    caught: (error: unknown): boolean => {
      if (errorCode(error) !== "STALE_WRITE") return false;
      setConflict(true);
      return true;
    },

    dismiss: () => setConflict(false),

    /**
     * The user chose to keep their version.
     *
     * Only closes the prompt: the retry passes `force` explicitly rather than
     * relying on this clearing `expected`, because the mutation would read the
     * value from the render that is already in flight and send the stale one
     * again.
     */
    forceNext: () => setConflict(false),
  };
};
