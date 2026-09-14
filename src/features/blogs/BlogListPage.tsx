import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { MODULES } from "@/config/modules";
import { deleteBlog, listBlogs, setBlogStatus } from "./blog.api";
import type { BlogListItem, BlogStatus } from "./blog.types";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { statusLabel } from "@/lib/statusLabel";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { PageHeader, SearchBox } from "@/components/ui/ListToolbar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { runBulk } from "@/lib/runBulk";
import { useListControls } from "@/hooks/useListParams";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const BlogListPage = () => {
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
  const q = filters.q;
  const status = filters.status as BlogStatus | "";

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // SearchBox already debounces internally -- the local debounce that used to
  // live here was a second one on top of it.
  const params = {
    page,
    limit,
    status,
    q,
    sort: sort.field,
    order: sort.order,
    ...range,
  };

  const query = useQuery({
    queryKey: ["blogs", params],
    queryFn: () => listBlogs(params),
  });

  /** An empty list means something different once a filter is on. */
  const filtered = Boolean(q || status || range.from || range.to);

  const removal = useMutation({
    mutationFn: deleteBlog,
    onSuccess: () => {
      toast.success("Post deleted");
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  // One call per selected row against the existing endpoints, so their role
  // guards apply unchanged and partial failures stay visible.
  const bulk = useMutation({
    mutationFn: (action: { verb: string; run: (id: string) => Promise<unknown> }) =>
      runBulk(selection, action.run).then((r) => ({ ...r, verb: action.verb })),
    onSuccess: ({ ok, failed, verb }) => {
      if (failed === 0) toast.success(`${ok} post${ok === 1 ? "" : "s"} ${verb}`);
      else if (ok === 0) toast.error(`Could not ${verb} any of the ${failed} selected`);
      else toast.error(`${ok} of ${ok + failed} ${verb} — the rest failed`);

      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Bulk action failed")),
  });

  const posts = query.data?.posts ?? [];

  // Derived, not stored: intersecting with what's on screen guarantees a
  // bulk action can never reach a row the user can no longer see, without
  // depending on an effect having fired after a page or filter change.
  const selection = selectedIds.filter((id) =>
    posts.some((row) => row._id === id)
  );
  const meta = query.data?.meta;

  // This page predates the shared DataTable and had its own hand-rolled table.
  // Moving to DataTable removes the duplicate markup and is what lets it take
  // the selection checkboxes the other lists use.
  const columns: Column<BlogListItem>[] = [
    {
      key: "title",
      header: "Title",
      sortField: "title",
      cell: (post) => (
        <>
          <Link
            to={`/blogs/${post._id}/edit`}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {post.title}
          </Link>
          <p className="mt-0.5 text-xs text-slate-400">/{post.slug}</p>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortField: "status",
      cell: (post) => {
        const badge = statusLabel(post.status, post.publishedAt);
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    // Worth a column now that different people write the posts. Not sortable:
    // author.name is nested and is not on the endpoint's sort allowlist.
    { key: "author", header: "Author", cell: (post) => post.author?.name || "—" },
    { key: "category", header: "Category", cell: (post) => post.category || "—" },
    {
      key: "published",
      header: "Published",
      sortField: "publishedAt",
      defaultOrder: "desc",
      cell: (post) => formatDate(post.publishedAt),
    },
    {
      key: "updated",
      header: "Updated",
      sortField: "updatedAt",
      defaultOrder: "desc",
      cell: (post) => formatDate(post.updatedAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (post) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit"
            onClick={() => navigate(`/blogs/${post._id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {/* Deleting is admin-only; the server enforces it too. */}
          {user?.role === "admin" && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setPendingDelete(post._id)}
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
        title="Blog"
        actions={
          <Link to="/blogs/new">
            <Button size="sm">New post</Button>
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
          <option value="scheduled">Scheduled</option>
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
            label: "Publish",
            onRun: () =>
              bulk.mutate({
                verb: "published",
                run: (id) => setBlogStatus(id, "published"),
              }),
          },
          {
            label: "Unpublish",
            onRun: () =>
              bulk.mutate({
                verb: "moved to draft",
                run: (id) => setBlogStatus(id, "draft"),
              }),
          },
          {
            label: "Delete",
            variant: "danger",
            // Admin-only server-side; don't offer what can only fail.
            hidden: user?.role !== "admin",
            onRun: () =>
              bulk.mutate({ verb: "deleted", run: (id) => deleteBlog(id) }),
          },
        ]}
      />

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load posts")}
        </p>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MODULES.blogs.icon}
          title={filtered ? "No matching posts" : "No posts yet"}
          description={
            filtered
              ? "Try a different search or filter."
              : "Write your first post to get the blog started."
          }
          action={
            <Link to="/blogs/new">
              <Button size="sm">New post</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={posts}
          rowKey={(post) => post._id}
          selection={{ selectedIds: selection, onSelectionChange: setSelectedIds }}
          sort={sort}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                noun="post"
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
        title="Delete this post?"
        description="It will be removed from the site immediately. This can be undone by an administrator in the database."
        confirmLabel="Delete"
        loading={removal.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removal.mutate(pendingDelete)}
      />
    </div>
  );
};
