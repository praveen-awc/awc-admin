import { api, stripEmpty, type ApiEnvelope } from "@/lib/api";

/** Mirrors ActivityLog plus the "received" rows the feed synthesises. */
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "purged"
  | "published"
  | "unpublished"
  | "status_changed"
  | "role_changed"
  | "received";

export type ActivityEntity =
  | "blog"
  | "news"
  | "casestudy"
  | "job"
  | "application"
  | "lead"
  | "user";

export interface ActivityItem {
  _id: string;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId: string;
  title: string;
  detail: string;
  /** Null for things that arrived from the public site rather than an admin. */
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
  unread: boolean;
}

export interface ActivityFeed {
  items: ActivityItem[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}

/** An alias, not an interface -- only aliases satisfy stripEmpty's Record. */
export type ActivityQuery = {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

/**
 * The bell calls this with nothing but a limit; the audit page passes filters.
 *
 * unreadCount is counted server-side over everything, not over the rows
 * returned, so narrowing the audit page never moves the bell's badge.
 */
export const listActivity = async (
  query: ActivityQuery | number = 15
): Promise<ActivityFeed> => {
  const params = typeof query === "number" ? { limit: query } : query;

  const { data } = await api.get<ApiEnvelope<ActivityItem[]>>(
    "/admin/activity",
    { params: stripEmpty(params) }
  );

  const meta = data.meta as
    | { total?: number; unreadCount?: number; page?: number; totalPages?: number }
    | undefined;

  return {
    items: data.data,
    unreadCount: meta?.unreadCount ?? 0,
    total: meta?.total ?? data.data.length,
    page: meta?.page ?? 1,
    totalPages: meta?.totalPages ?? 1,
  };
};

/** Admin only. See downloadApplicationsCsv -- blob is required for cookie auth. */
export const downloadActivityCsv = async (query: ActivityQuery) => {
  const response = await api.get("/admin/activity/export", {
    params: stripEmpty(query),
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const markActivitySeen = async (): Promise<void> => {
  await api.post("/admin/activity/seen");
};

/** Where a feed row should take you. */
export const activityHref = (item: ActivityItem): string | null => {
  switch (item.entityType) {
    case "blog":
      return `/blogs/${item.entityId}/edit`;
    case "news":
      return `/news/${item.entityId}/edit`;
    case "casestudy":
      return `/case-studies/${item.entityId}/edit`;
    case "job":
      return `/jobs/${item.entityId}/edit`;
    // These have no edit page of their own; the list opens a drawer instead.
    case "application":
      return "/applications";
    case "lead":
      return "/leads";
    case "user":
      return "/settings/users";
    default:
      return null;
  }
};

/** Filter dropdown options. "received" is last: it is the synthetic one. */
export const ACTIVITY_ACTIONS: ActivityAction[] = [
  "created",
  "updated",
  "published",
  "unpublished",
  "status_changed",
  "role_changed",
  "deleted",
  "restored",
  "purged",
  "received",
];

export const ACTIVITY_ENTITIES: ActivityEntity[] = [
  "blog",
  "news",
  "casestudy",
  "job",
  "application",
  "lead",
  "user",
];

const ENTITY_LABEL: Record<ActivityEntity, string> = {
  blog: "blog post",
  news: "news item",
  casestudy: "case study",
  job: "job",
  application: "application",
  lead: "enquiry",
  user: "user",
};

/** Human name for an entity type, for filter options and table cells. */
export const entityLabel = (entity: ActivityEntity): string =>
  ENTITY_LABEL[entity] ?? entity;

const ACTION_VERB: Record<ActivityAction, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  restored: "restored",
  purged: "permanently deleted",
  published: "published",
  unpublished: "closed",
  status_changed: "moved",
  role_changed: "changed the role on",
  received: "received",
};

/**
 * One readable line per row.
 *
 * "received" has no actor -- those rows come from the public site, so they read
 * as "New application from X" rather than naming someone who did nothing.
 */
export const activitySentence = (item: ActivityItem): string => {
  const noun = ENTITY_LABEL[item.entityType];

  if (item.action === "received") {
    return `New ${noun} from ${item.title}`;
  }

  const who = item.actorName ?? "Someone";
  return `${who} ${ACTION_VERB[item.action]} ${noun} “${item.title}”`;
};
