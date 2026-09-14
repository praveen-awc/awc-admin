import { api, type ApiEnvelope } from "@/lib/api";

export interface SearchHit {
  module: string;
  moduleLabel: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/**
 * One request across every module, for the command palette.
 *
 * The server ignores terms shorter than two characters and returns an empty
 * list, so the caller does not need its own floor.
 */
export const searchAll = async (q: string): Promise<SearchHit[]> => {
  const { data } = await api.get<ApiEnvelope<SearchHit[]>>("/admin/search", {
    params: { q },
  });
  return data.data;
};
