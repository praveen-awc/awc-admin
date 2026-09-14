import { useState } from "react";

/**
 * Returns true on the single render where `record` has just arrived, or has
 * been replaced by a different one. Editor pages use it to seed their form
 * state from a loaded record.
 *
 * The caller sets state *during render* on that pass. That is React's
 * documented "adjusting state when a prop changes" pattern: React throws the
 * in-progress render away and immediately re-runs the component before
 * committing, so the browser never paints the unseeded form. The same work in
 * an effect paints once with empty fields and again with real ones, which is
 * what react-hooks/set-state-in-effect flags.
 *
 * The identity check is deliberately on the object reference, matching the
 * `[query.data]` dependency the effects used before: after a save the query is
 * invalidated and refetched, and re-seeding from the server's response is
 * wanted -- that is how sanitized HTML makes it back into the editor.
 */
export const useSeedFromRecord = (record: unknown): boolean => {
  const [seeded, setSeeded] = useState<unknown>(null);

  if (record && record !== seeded) {
    setSeeded(record);
    return true;
  }

  return false;
};
