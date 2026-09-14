import { useQuery } from "@tanstack/react-query";
import { getStats, type AdminStats } from "./stats.api";

/** How often the panel asks the API whether anything new has arrived. */
export const STATS_POLL_MS = 45_000;

/**
 * The one place the admin stats query is configured.
 *
 * Both the sidebar badges and the activity notifications read from it. If each
 * declared its own useQuery(["stats"]) they would become two observers on the
 * same query with different refetch intervals -- the shortest one would win,
 * and the polling config would be split across two files.
 */
export const useAdminStats = () =>
  useQuery<AdminStats>({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: STATS_POLL_MS,
    /*
     * TanStack pauses interval refetching when the window loses focus. That
     * default defeats the point here: the whole reason to poll is to find out
     * about work that arrived while you were looking at something else. An
     * all-day tab costs about 80 requests an hour for counts.
     */
    refetchIntervalInBackground: true,
    // Overrides the app-wide `refetchOnWindowFocus: false`, so coming back to
    // the tab shows current counts immediately rather than after the interval.
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
