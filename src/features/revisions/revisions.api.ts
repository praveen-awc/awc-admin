import { api, type ApiEnvelope } from "@/lib/api";
import type { AuditActor } from "@/components/ui/AuditLine";

/** Must match REVISION_TYPES in the backend's revisionController. */
export type RevisionEntity = "blog" | "news" | "casestudy" | "job";

export interface RevisionSummary {
  _id: string;
  entityType: RevisionEntity;
  entityId: string;
  /** Populated where the account still exists; actorName always present. */
  actorId?: AuditActor | string | null;
  actorName: string;
  createdAt: string;
}

export interface RevisionDetail extends RevisionSummary {
  snapshot: Record<string, unknown>;
}

export interface PagedRevisions {
  items: RevisionSummary[];
  total: number;
}

/**
 * History for one document, newest first.
 *
 * Snapshot bodies are left out of the list -- twenty versions of a blog post
 * is megabytes of HTML nobody has asked to see yet.
 */
export const listRevisions = async (
  type: RevisionEntity,
  id: string,
  limit = 20
): Promise<PagedRevisions> => {
  const { data } = await api.get<ApiEnvelope<RevisionSummary[]>>(
    `/admin/revisions/${type}/${id}`,
    { params: { limit } }
  );

  return { items: data.data, total: data.meta?.total ?? data.data.length };
};

/** One version, with its snapshot. */
export const getRevision = async (
  type: RevisionEntity,
  id: string,
  revisionId: string
): Promise<RevisionDetail> => {
  const { data } = await api.get<ApiEnvelope<RevisionDetail>>(
    `/admin/revisions/${type}/${id}/${revisionId}`
  );
  return data.data;
};

/**
 * Writes a version back over the live document.
 *
 * The server snapshots the current state first, so this is itself undoable.
 */
export const restoreRevision = async (
  type: RevisionEntity,
  id: string,
  revisionId: string
): Promise<void> => {
  await api.post(`/admin/revisions/${type}/${id}/${revisionId}/restore`);
};
