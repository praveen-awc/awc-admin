import { api, stripEmpty, type ApiEnvelope, type ListQuery } from "@/lib/api";

/** Must match TRASH_TYPES in the backend's trashController. */
export const TRASH_TYPES = [
  { value: "blogs", label: "Blog posts" },
  { value: "news", label: "News items" },
  { value: "casestudies", label: "Case studies" },
  { value: "jobs", label: "Jobs" },
  { value: "applications", label: "Applications" },
  { value: "leads", label: "Contact leads" },
] as const;

export type TrashType = (typeof TRASH_TYPES)[number]["value"];

export interface TrashItem {
  _id: string;
  type: TrashType;
  /** Human name for the module, e.g. "Case study". */
  typeLabel: string;
  title: string;
  detail: string;
  deletedAt: string;
  deletedBy: { _id: string; name: string; email: string } | null;
}

export interface PagedTrash {
  items: TrashItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const listTrash = async (
  params: ListQuery & { type?: string }
): Promise<PagedTrash> => {
  const { data } = await api.get<ApiEnvelope<TrashItem[]>>("/admin/trash", {
    params: stripEmpty(params),
  });

  return {
    items: data.data,
    meta: data.meta ?? {
      page: 1,
      limit: 20,
      total: data.data.length,
      totalPages: 1,
    },
  };
};

export const restoreItem = async (type: TrashType, id: string): Promise<void> => {
  await api.post(`/admin/trash/${type}/${id}/restore`);
};

/** Irreversible -- there is nothing behind this one. */
export const purgeItem = async (type: TrashType, id: string): Promise<void> => {
  await api.delete(`/admin/trash/${type}/${id}`);
};
