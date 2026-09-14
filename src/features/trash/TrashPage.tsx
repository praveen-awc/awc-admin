import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2, Trash } from "lucide-react";
import {
  TRASH_TYPES,
  listTrash,
  purgeItem,
  restoreItem,
  type TrashItem,
} from "./trash.api";
import { errorMessage } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useListControls } from "@/hooks/useListParams";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/ListToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

/**
 * Recovery for anything deleted from the panel.
 *
 * Case studies, jobs, applications and leads used to be destroyed outright.
 * Blog posts and news items were kept but had no way back short of opening the
 * database, so all six live here.
 */
export const TrashPage = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    params: filters,
    page,
    set,
    setPage,
    limit,
    setLimit,
    sort,
    range,
    setRange,
  } = useListControls(["type"] as const);
  const type = filters.type;

  const [pendingPurge, setPendingPurge] = useState<TrashItem | null>(null);

  const params = {
    page,
    limit,
    type,
    sort: sort.field,
    order: sort.order,
    ...range,
  };
  const query = useQuery({
    queryKey: ["trash", params],
    queryFn: () => listTrash(params),
  });

  // Restoring or purging changes what every other list shows, so the whole
  // cache is refreshed rather than guessing which keys are affected.
  const invalidateEverything = () => {
    void queryClient.invalidateQueries();
  };

  const restore = useMutation({
    mutationFn: (item: TrashItem) => restoreItem(item.type, item._id),
    onSuccess: (_data, item) => {
      toast.success(`${item.typeLabel} restored`);
      invalidateEverything();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not restore")),
  });

  const purge = useMutation({
    mutationFn: (item: TrashItem) => purgeItem(item.type, item._id),
    onSuccess: (_data, item) => {
      toast.success(`${item.typeLabel} permanently deleted`);
      setPendingPurge(null);
      invalidateEverything();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const columns: Column<TrashItem>[] = [
    {
      key: "item",
      header: "Item",
      cell: (item) => (
        <>
          <span className="font-medium text-slate-900">
            {item.title || "(untitled)"}
          </span>
          {item.detail && (
            <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
          )}
        </>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (item) => <Badge>{item.typeLabel}</Badge>,
    },
    {
      key: "deleted",
      header: "Deleted",
      // The only sortable column here -- see TRASH_SORT_FIELDS on the server
      // for why title cannot be one when six collections are merged in memory.
      sortField: "deletedAt",
      defaultOrder: "desc",
      cell: (item) => (
        <>
          <span className="text-slate-700">{formatRelative(item.deletedAt)}</span>
          <p className="mt-0.5 text-xs text-slate-400">
            {/* Blank on anything deleted before this was recorded. */}
            {item.deletedBy?.name ?? "—"}
          </p>
        </>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            loading={restore.isPending && restore.variables?._id === item._id}
            onClick={() => restore.mutate(item)}
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Delete permanently"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setPendingPurge(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Trash" />

      <p className="text-sm text-slate-500">
        Anything deleted from the panel lands here and stays until someone
        removes it for good. Nothing is cleared automatically.
      </p>

      <div className="flex flex-wrap gap-2">
        <Select
          className="w-52"
          value={type}
          onChange={(event) => set({ type: event.target.value })}
        >
          <option value="">All types</option>
          {TRASH_TYPES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </Select>
        <DateRangeFilter
          label="Deleted"
          from={range.from}
          to={range.to}
          onChange={setRange}
        />
      </div>

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load the trash")}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Trash}
          title={
            type || range.from || range.to
              ? "Nothing deleted matching this"
              : "Trash is empty"
          }
          description="Deleted items will appear here so you can put them back."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(item) => `${item.type}:${item._id}`}
          sort={sort}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                noun="deleted item"
                limit={limit}
                onLimitChange={setLimit}
                onChange={setPage}
              />
            )
          }
        />
      )}

      <ConfirmDialog
        open={pendingPurge !== null}
        title={`Permanently delete this ${pendingPurge?.typeLabel.toLowerCase()}?`}
        description="This cannot be undone. The record is removed from the database for good."
        confirmLabel="Delete permanently"
        loading={purge.isPending}
        onCancel={() => setPendingPurge(null)}
        onConfirm={() => pendingPurge && purge.mutate(pendingPurge)}
      />
    </div>
  );
};
