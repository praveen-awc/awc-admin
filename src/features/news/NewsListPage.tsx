import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { MODULES } from "@/config/modules";
import { deleteNews, listNews, type NewsListItem } from "./news.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useListControls } from "@/hooks/useListParams";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { runBulk } from "@/lib/runBulk";
import { PUBLIC_SITE_URL } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { PageHeader, SearchBox } from "@/components/ui/ListToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export const NewsListPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    params: filters,
    page,
    set,
    setPage,
    setSearch,
    limit,
    setLimit,
    sort,
    range,
    setRange,
  } = useListControls(["q", "status"] as const);
  const { q, status } = filters;

  const [pendingDelete, setPendingDelete] = useState<NewsListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const params = {
    page,
    limit,
    q,
    status,
    sort: sort.field,
    order: sort.order,
    ...range,
  };
  const query = useQuery({
    queryKey: ["news", params],
    queryFn: () => listNews(params),
  });

  const removal = useMutation({
    mutationFn: deleteNews,
    onSuccess: () => {
      toast.success("News item deleted");
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["news"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  // Delete only: News has no status-only endpoint, so bulk publishing would
  // mean a fetch-then-full-update per row. Worth adding a PATCH /status route
  // if that becomes wanted.
  const bulk = useMutation({
    mutationFn: (action: { verb: string; run: (id: string) => Promise<unknown> }) =>
      runBulk(selection, action.run).then((r) => ({ ...r, verb: action.verb })),
    onSuccess: ({ ok, failed, verb }) => {
      if (failed === 0) toast.success(`${ok} item${ok === 1 ? "" : "s"} ${verb}`);
      else if (ok === 0) toast.error(`Could not ${verb} any of the ${failed} selected`);
      else toast.error(`${ok} of ${ok + failed} ${verb} — the rest failed`);
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ["news"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Bulk action failed")),
  });

  const items = query.data?.items ?? [];

  // Derived, not stored: intersecting with what's on screen guarantees a
  // bulk action can never reach a row the user can no longer see, without
  // depending on an effect having fired after a page or filter change.
  const selection = selectedIds.filter((id) =>
    items.some((row) => row._id === id)
  );
  const meta = query.data?.meta;

  const columns: Column<NewsListItem>[] = [
    {
      key: "title",
      header: "Title",
      sortField: "title",
      cell: (item) => (
        <>
          <Link
            to={`/news/${item._id}/edit`}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {item.title}
          </Link>
          <p className="mt-0.5 text-xs text-slate-400">/{item.slug}</p>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortField: "status",
      cell: (item) =>
        item.status === "published" ? (
          <Badge tone="green">Published</Badge>
        ) : (
          <Badge tone="slate">Draft</Badge>
        ),
    },
    {
      key: "published",
      header: "Published",
      sortField: "publishedAt",
      defaultOrder: "desc",
      cell: (item) => formatDate(item.publishedAt),
    },
    {
      key: "updated",
      header: "Updated",
      sortField: "updatedAt",
      defaultOrder: "desc",
      cell: (item) => formatDate(item.updatedAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (item) => (
        <div className="flex justify-end gap-1">
          {item.status === "published" && (
            <a
              href={`${PUBLIC_SITE_URL}/news-and-events/${item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="ghost" aria-label="View live">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit"
            onClick={() => navigate(`/news/${item._id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {user?.role === "admin" && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setPendingDelete(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="News & Events"
        actions={
          <Link to="/news/new">
            <Button size="sm">New item</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <SearchBox
          value={q}
          placeholder="Search title or slug"
          onChange={setSearch}
        />
        <Select
          className="w-44"
          value={status}
          onChange={(event) => set({ status: event.target.value })}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
        <DateRangeFilter
          label="Updated"
          from={range.from}
          to={range.to}
          onChange={setRange}
        />
      </div>

      <BulkActionBar
        count={selection.length}
        busy={bulk.isPending}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: "Delete",
            variant: "danger",
            hidden: user?.role !== "admin",
            onRun: () => bulk.mutate({ verb: "deleted", run: (id) => deleteNews(id) }),
          },
        ]}
      />

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load news")}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MODULES.news.icon}
          title={
            q || status || range.from || range.to
              ? "No matching items"
              : "No news items yet"
          }
          action={
            <Link to="/news/new">
              <Button size="sm">New item</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(item) => item._id}
          selection={{ selectedIds: selection, onSelectionChange: setSelectedIds }}
          sort={sort}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                noun="item"
                limit={limit}
                onLimitChange={setLimit}
                onChange={setPage}
              />
            )
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.title}"?`}
        description="It will be removed from the site immediately."
        confirmLabel="Delete"
        loading={removal.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removal.mutate(pendingDelete._id)}
      />
    </div>
  );
};
