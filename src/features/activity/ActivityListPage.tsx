import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, Download } from "lucide-react";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ENTITIES,
  activityHref,
  activitySentence,
  downloadActivityCsv,
  entityLabel,
  listActivity,
  type ActivityItem,
} from "./activity.api";
import { listUsers } from "@/features/users/user.api";
import { errorMessage } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/format";
import { useListControls } from "@/hooks/useListParams";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/ListToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

/**
 * The audit trail.
 *
 * The same feed as the notification bell, but paged, filterable and
 * exportable -- the bell answers "what just happened", this answers "who
 * changed that, and when".
 *
 * Admin-only at the route, because it names every user and everything they
 * did. The bell stays open to editors.
 */

/** Destructive actions should be findable at a glance in a long list. */
const ACTION_TONE: Record<string, "slate" | "green" | "amber" | "blue"> = {
  created: "green",
  published: "green",
  restored: "green",
  updated: "blue",
  received: "blue",
  status_changed: "amber",
  role_changed: "amber",
  unpublished: "amber",
  deleted: "slate",
  purged: "slate",
};

export const ActivityListPage = () => {
  const toast = useToast();

  const {
    params: filters,
    page,
    set,
    setPage,
    limit,
    setLimit,
    range,
    setRange,
  } = useListControls(["entityType", "action", "actorId"] as const);
  const { entityType, action, actorId } = filters;

  // No sort control: this is a log, and a log that is not in time order is
  // not a log. The server's own order is the only one that makes sense.
  const query = useQuery({
    queryKey: ["activity", "page", { page, limit, entityType, action, actorId, ...range }],
    queryFn: () =>
      listActivity({ page, limit, entityType, action, actorId, ...range }),
  });

  // Populates the actor dropdown. Admin-only endpoint, and so is this page.
  const users = useQuery({
    queryKey: ["users", { limit: 100 }],
    queryFn: () => listUsers({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const exporting = useMutation({
    mutationFn: () =>
      downloadActivityCsv({ entityType, action, actorId, ...range }),
    onError: (error) => toast.error(errorMessage(error, "Export failed")),
  });

  const items = query.data?.items ?? [];
  const filtered = Boolean(
    entityType || action || actorId || range.from || range.to
  );

  const columns: Column<ActivityItem>[] = [
    {
      key: "when",
      header: "When",
      className: "whitespace-nowrap",
      cell: (item) => formatDateTime(item.createdAt),
    },
    {
      key: "who",
      header: "Who",
      cell: (item) =>
        item.actorName ?? (
          // Not missing data: these rows were written by the public site.
          <span className="text-slate-400">Public site</span>
        ),
    },
    {
      key: "action",
      header: "Action",
      cell: (item) => (
        <Badge tone={ACTION_TONE[item.action] ?? "slate"}>
          {titleCase(item.action.replace("_", " "))}
        </Badge>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (item) => (
        <span className="text-slate-600">{titleCase(entityLabel(item.entityType))}</span>
      ),
    },
    {
      key: "what",
      header: "Item",
      className: "max-w-md",
      cell: (item) => {
        const href = activityHref(item);
        const line = activitySentence(item);

        // Purged records no longer exist, so their link would 404. The stored
        // title is all that is left of them, which is why it is copied into
        // the log rather than referenced.
        if (!href || item.action === "purged") {
          return <span className="text-slate-700">{line}</span>;
        }

        return (
          <Link to={href} className="text-slate-700 hover:text-brand-700">
            {line}
          </Link>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity"
        actions={
          <Button
            size="sm"
            variant="secondary"
            loading={exporting.isPending}
            onClick={() => exporting.mutate()}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <p className="text-xs text-slate-500">
        Everything done in the panel, plus applications and enquiries as they
        arrive. Kept for 90 days.
      </p>

      <div className="flex flex-wrap gap-2">
        <Select
          className="w-44"
          value={entityType}
          onChange={(event) => set({ entityType: event.target.value })}
        >
          <option value="">All types</option>
          {ACTIVITY_ENTITIES.map((value) => (
            <option key={value} value={value}>
              {titleCase(entityLabel(value))}
            </option>
          ))}
        </Select>

        <Select
          className="w-44"
          value={action}
          onChange={(event) => set({ action: event.target.value })}
        >
          <option value="">All actions</option>
          {ACTIVITY_ACTIONS.map((value) => (
            <option key={value} value={value}>
              {titleCase(value.replace("_", " "))}
            </option>
          ))}
        </Select>

        <Select
          className="w-48"
          value={actorId}
          onChange={(event) => set({ actorId: event.target.value })}
        >
          <option value="">Anyone</option>
          {(users.data?.users ?? []).map((user) => (
            <option key={user._id} value={user._id}>
              {user.name}
            </option>
          ))}
        </Select>

        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
      </div>

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load activity")}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={filtered ? "Nothing matches these filters" : "No activity yet"}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(item) => item._id}
          footer={
            <Pagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              total={query.data.total}
              noun="entry"
              nounPlural="entries"
              limit={limit}
              onLimitChange={setLimit}
              onChange={setPage}
            />
          }
        />
      )}
    </div>
  );
};
