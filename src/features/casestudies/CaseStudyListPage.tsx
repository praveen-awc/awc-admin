import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  deleteCaseStudy,
  listCaseStudies,
  type CaseStudyListItem,
} from "./caseStudy.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PUBLIC_SITE_URL } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, SearchBox } from "@/components/ui/ListToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export const CaseStudyListPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CaseStudyListItem | null>(
    null
  );

  const params = { page, limit: 20, q };
  const query = useQuery({
    queryKey: ["casestudies", params],
    queryFn: () => listCaseStudies(params),
  });

  const removal = useMutation({
    mutationFn: deleteCaseStudy,
    onSuccess: () => {
      toast.success("Case study deleted");
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["casestudies"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const columns: Column<CaseStudyListItem>[] = [
    {
      key: "title",
      header: "Case study",
      cell: (item) => (
        <>
          <Link
            to={`/case-studies/${item._id}/edit`}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {item.hero?.title || item.clientName}
          </Link>
          <p className="mt-0.5 text-xs text-slate-400">/{item.slug}</p>
        </>
      ),
    },
    { key: "client", header: "Client", cell: (item) => item.clientName },
    {
      key: "casetype",
      header: "Technology",
      cell: (item) =>
        item.casetype ? (
          <Badge tone="blue">{item.casetype}</Badge>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "industry",
      header: "Industry",
      cell: (item) => item.industry || <span className="text-slate-400">—</span>,
    },
    { key: "updated", header: "Updated", cell: (item) => formatDate(item.updatedAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <a
            href={`${PUBLIC_SITE_URL}/our-work/${item.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="ghost" aria-label="View live">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit"
            onClick={() => navigate(`/case-studies/${item._id}/edit`)}
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
        title="Case studies"
        actions={
          <Link to="/case-studies/new">
            <Button size="sm">New case study</Button>
          </Link>
        }
      />

      <SearchBox
        value={q}
        placeholder="Search client, slug or title"
        onChange={(value) => {
          setQ(value);
          setPage(1);
        }}
      />

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load case studies")}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={q ? "No matching case studies" : "No case studies yet"}
          action={
            <Link to="/case-studies/new">
              <Button size="sm">New case study</Button>
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
        title={`Delete "${pendingDelete?.hero?.title || pendingDelete?.clientName}"?`}
        description="This is permanent — case studies have no soft delete, and the public page will 404 immediately."
        confirmLabel="Delete"
        loading={removal.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removal.mutate(pendingDelete._id)}
      />
    </div>
  );
};
