import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Users } from "lucide-react";
import { MODULES } from "@/config/modules";
import { deleteJob, listJobs, setJobActive } from "./job.api";
import type { JobListItem } from "./job.types";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useListControls } from "@/hooks/useListParams";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { runBulk } from "@/lib/runBulk";
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

export const JobListPage = () => {
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
  } = useListControls(["q", "isActive"] as const);
  const { q, isActive } = filters;

  const [pendingDelete, setPendingDelete] = useState<JobListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const params = {
    page,
    limit,
    q,
    isActive,
    sort: sort.field,
    order: sort.order,
    ...range,
  };
  const query = useQuery({
    queryKey: ["jobs", params],
    queryFn: () => listJobs(params),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const toggle = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      setJobActive(id, next),
    onSuccess: (job) => {
      toast.success(job.isActive ? "Job reopened" : "Job closed");
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update")),
  });

  const removal = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      toast.success("Job deleted");
      setPendingDelete(null);
      invalidate();
    },
    // The API refuses to delete a job that has applications -- surface that
    // message rather than a generic failure.
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  // One call per selected row against the existing endpoints, so their role
  // guards apply unchanged and partial failures stay visible.
  const bulk = useMutation({
    mutationFn: (action: { verb: string; run: (id: string) => Promise<unknown> }) =>
      runBulk(selection, action.run).then((r) => ({ ...r, verb: action.verb })),
    onSuccess: ({ ok, failed, verb }) => {
      if (failed === 0) toast.success(`${ok} job${ok === 1 ? "" : "s"} ${verb}`);
      else if (ok === 0) toast.error(`Could not ${verb} any of the ${failed} selected`);
      else toast.error(`${ok} of ${ok + failed} ${verb} — the rest failed`);
      setSelectedIds([]);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Bulk action failed")),
  });

  const jobs = query.data?.jobs ?? [];

  // Derived, not stored: intersecting with what's on screen guarantees a
  // bulk action can never reach a row the user can no longer see, without
  // depending on an effect having fired after a page or filter change.
  const selection = selectedIds.filter((id) =>
    jobs.some((row) => row._id === id)
  );
  const meta = query.data?.meta;

  const columns: Column<JobListItem>[] = [
    {
      key: "title",
      header: "Role",
      sortField: "title",
      cell: (job) => (
        <>
          <Link
            to={`/jobs/${job._id}/edit`}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 text-xs text-slate-400">
            {job.jobCode} &middot; {job.designation}
          </p>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortField: "isActive",
      cell: (job) =>
        job.isActive ? (
          <Badge tone="green">Open</Badge>
        ) : (
          <Badge tone="slate">Closed</Badge>
        ),
    },
    {
      key: "location",
      header: "Location",
      sortField: "location",
      cell: (job) => job.location,
    },
    { key: "experience", header: "Experience", cell: (job) => job.experience },
    {
      key: "applicants",
      // Not sortable: applicationCount is grouped in after the page of jobs
      // has already been chosen, so the database cannot order by it.
      header: "Applicants",
      cell: (job) =>
        job.applicationCount > 0 ? (
          <Link
            to={`/applications?jobId=${job._id}`}
            className="inline-flex items-center gap-1 text-brand-700 hover:underline"
          >
            <Users className="h-3.5 w-3.5" />
            {job.applicationCount}
          </Link>
        ) : (
          <span className="text-slate-400">0</span>
        ),
    },
    {
      key: "posted",
      header: "Posted",
      sortField: "postedAt",
      defaultOrder: "desc",
      cell: (job) => formatDate(job.postedAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (job) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggle.mutate({ id: job._id, next: !job.isActive })}
          >
            {job.isActive ? "Close" : "Reopen"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit"
            onClick={() => navigate(`/jobs/${job._id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {user?.role === "admin" && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setPendingDelete(job)}
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
        title="Jobs"
        actions={
          <Link to="/jobs/new">
            <Button size="sm">New job</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <SearchBox
          value={q}
          placeholder="Search title, job code or designation"
          onChange={setSearch}
        />
        <Select
          className="w-44"
          value={isActive}
          onChange={(event) => set({ isActive: event.target.value })}
        >
          <option value="">All jobs</option>
          <option value="true">Open</option>
          <option value="false">Closed</option>
        </Select>
        <DateRangeFilter
          label="Posted"
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
            label: "Close",
            onRun: () =>
              bulk.mutate({ verb: "closed", run: (id) => setJobActive(id, false) }),
          },
          {
            label: "Reopen",
            onRun: () =>
              bulk.mutate({ verb: "reopened", run: (id) => setJobActive(id, true) }),
          },
          {
            label: "Delete",
            variant: "danger",
            // Admin-only server-side, and the API also refuses any job that
            // still has applications.
            hidden: user?.role !== "admin",
            onRun: () => bulk.mutate({ verb: "deleted", run: (id) => deleteJob(id) }),
          },
        ]}
      />

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load jobs")}
        </p>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={MODULES.jobs.icon}
          title={
            q || isActive || range.from || range.to
              ? "No matching jobs"
              : "No jobs posted yet"
          }
          action={
            <Link to="/jobs/new">
              <Button size="sm">New job</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={jobs}
          rowKey={(job) => job._id}
          selection={{ selectedIds: selection, onSelectionChange: setSelectedIds }}
          sort={sort}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                noun="job"
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
        description="This is permanent. If the role is simply filled, close it instead so its applications stay linked."
        confirmLabel="Delete"
        loading={removal.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removal.mutate(pendingDelete._id)}
      />
    </div>
  );
};
