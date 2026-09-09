import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Newspaper, Pencil, Trash2 } from "lucide-react";
import { deleteNews, listNews, type NewsListItem } from "./news.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PUBLIC_SITE_URL } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
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

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pendingDelete, setPendingDelete] = useState<NewsListItem | null>(null);

  const params = { page, limit: 20, q, status };
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

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const columns: Column<NewsListItem>[] = [
    {
      key: "title",
      header: "Title",
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
      cell: (item) => formatDate(item.publishedAt),
    },
    { key: "updated", header: "Updated", cell: (item) => formatDate(item.updatedAt) },
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
          onChange={(value) => {
            setQ(value);
            setPage(1);
          }}
        />
        <Select
          className="w-44"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
      </div>

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
          icon={Newspaper}
          title={q || status ? "No matching items" : "No news items yet"}
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
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
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
