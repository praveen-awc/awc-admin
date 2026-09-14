/**
 * Runs one per-item call for each selected id and reports honestly.
 *
 * allSettled, not all: a partial failure (say an editor hitting a
 * admin-only delete) must be reported as "3 of 5" rather than collapsing the
 * whole batch into a single error.
 */
export const runBulk = async <T,>(
  ids: T[],
  run: (id: T) => Promise<unknown>
): Promise<{ ok: number; failed: number }> => {
  const results = await Promise.allSettled(ids.map(run));
  const failed = results.filter((r) => r.status === "rejected").length;
  return { ok: results.length - failed, failed };
};
