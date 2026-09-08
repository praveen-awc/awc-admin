import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Trash2, Search } from "lucide-react";
import { deleteBlog, listBlogs } from "./blog.api";
import type { BlogStatus } from "./blog.types";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { Badge, statusLabel } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
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

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BlogStatus | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = { page, limit: 20, status, q: debouncedSearch };

  const query = useQuery({
    queryKey: ["blogs", params],
    queryFn: () => listBlogs(params),
  });

  const removal = useMutation({
    mutationFn: deleteBlog,
    onSuccess: () => {
      toast.success("Post deleted");
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  const posts = query.data?.posts ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Blog</h1>
        <Link to="/blogs/new">
          <Button size="sm">New post</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search title or slug"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          className="w-44"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as BlogStatus | "");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </Select>
      </div>

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
          icon={FileText}
          title={debouncedSearch || status ? "No matching posts" : "No posts yet"}
          description={
            debouncedSearch || status
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
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Published</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => {
                  const badge = statusLabel(post.status, post.publishedAt);
                  return (
                    <tr key={post._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/blogs/${post._id}/edit`}
                          className="font-medium text-slate-900 hover:text-brand-700"
                        >
                          {post.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400">/{post.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {post.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(post.publishedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(post.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onChange={setPage}
            />
          )}
        </div>
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
