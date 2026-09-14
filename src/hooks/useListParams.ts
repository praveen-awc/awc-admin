import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps list filters in the URL instead of component state, so a refresh keeps
 * the view and a filtered list can be shared or bookmarked.
 *
 * `set` drops empty values rather than leaving `?status=` on the URL, and
 * resets the page whenever a filter changes — otherwise narrowing a filter
 * while on page 3 lands on an empty result.
 */
export const useListParams = <K extends string>(keys: readonly K[]) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => {
    const out = {} as Record<K, string>;
    keys.forEach((key) => {
      out[key] = searchParams.get(key) ?? "";
    });
    return out;
    // searchParams is a new object per navigation; keys is a stable literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const set = useCallback(
    (
      changes: Partial<Record<K, string>>,
      options: { replace?: boolean } = {}
    ) => {
      const next = new URLSearchParams(searchParams);

      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, String(value));
        else next.delete(key);
      });

      next.delete("page");
      setSearchParams(next, { replace: options.replace ?? false });
    },
    [searchParams, setSearchParams]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const next = new URLSearchParams(searchParams);
      if (nextPage <= 1) next.delete("page");
      else next.set("page", String(nextPage));
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  /**
   * For the search box specifically: replace rather than push, or every
   * keystroke leaves a history entry and Back becomes unusable.
   */
  const setSearch = useCallback(
    (value: string) => set({ q: value } as Partial<Record<K, string>>, { replace: true }),
    [set]
  );

  return { params, page, set, setPage, setSearch };
};

/** Sorting, date range and page size are spelled the same way on every list. */
const CONTROL_KEYS = ["sort", "order", "from", "to", "limit"] as const;
type ControlKey = (typeof CONTROL_KEYS)[number];

/** Matches readPaging's default on the server. */
const DEFAULT_LIMIT = 20;

export type SortOrder = "asc" | "desc";

/**
 * useListParams plus the three controls every list screen now shares.
 *
 * Callers pass only their own filters ("q", "status", ...) and get the rest
 * assembled, so a list page reads as what it filters by rather than as five
 * near-identical lines of query-string plumbing repeated seven times.
 *
 * Defaults are stored as an absent param rather than an explicit value, so a
 * list at its default settings still has a clean URL and the server keeps
 * ownership of what "default" means.
 */
export const useListControls = <K extends string>(filterKeys: readonly K[]) => {
  const { params, page, set, setPage, setSearch } = useListParams([
    ...filterKeys,
    ...CONTROL_KEYS,
  ] as readonly (K | ControlKey)[]);

  // `set` is generic over its own key union; these writers all pass control
  // keys, which are in that union by construction.
  const write = set as (changes: Record<string, string>) => void;

  return {
    params,
    page,
    set,
    setPage,
    setSearch,

    limit: Number(params.limit) || DEFAULT_LIMIT,
    setLimit: (next: number) =>
      write({ limit: next === DEFAULT_LIMIT ? "" : String(next) }),

    sort: {
      field: params.sort,
      order: (params.order === "asc" ? "asc" : "desc") as SortOrder,
      onChange: (field: string, order: SortOrder) => write({ sort: field, order }),
    },

    range: { from: params.from, to: params.to },
    setRange: (range: { from: string; to: string }) =>
      write({ from: range.from, to: range.to }),
  };
};
