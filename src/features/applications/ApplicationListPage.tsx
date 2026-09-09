import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, FileText, Trash2, Users, X } from "lucide-react";
import {
  APPLICATION_STATUSES,
  deleteApplication,
  downloadApplicationsCsv,
  listApplications,
  updateApplication,
  type Application,
  type ApplicationStatus,
} from "./application.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/format";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { PageHeader, SearchBox } from "@/components/ui/ListToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  new: "blue",
  reviewing: "amber",
  shortlisted: "amber",
  interviewing: "amber",
  hired: "green",
  rejected: "slate",
};

export const ApplicationListPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // jobId arrives as a link from the Jobs list ("12 applicants").
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);

  const params = { page, limit: 20, q, status, jobId };
  const query = useQuery({
    queryKey: ["applications", params],
    queryFn: () => listApplications(params),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["applications"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const mutate = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: { status?: ApplicationStatus; notes?: string };
    }) => updateApplication(id, changes),
    onSuccess: (updated) => {
      toast.success("Application updated");
      setSelected((current) => (current?._id === updated._id ? updated : current));
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update")),
  });

  const removal = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      toast.success("Application deleted");
      setPendingDelete(null);
      setSelected(null);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  const exporting = useMutation({
    mutationFn: () => downloadApplicationsCsv({ status, jobId }),
    onError: (error) => toast.error(errorMessage(error, "Export failed")),
  });

  const applications = query.data?.applications ?? [];
  const meta = query.data?.meta;

  const columns: Column<Application>[] = [
    {
      key: "name",
      header: "Candidate",
      cell: (application) => (
        <>
          <button
            type="button"
            onClick={() => setSelected(application)}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {application.fullName}
          </button>
          <p className="mt-0.5 text-xs text-slate-400">{application.email}</p>
        </>
      ),
    },
    {
      key: "job",
      header: "Applied for",
      cell: (application) =>
        application.jobId ? (
          <>
            <span className="text-slate-700">{application.jobId.title}</span>
            <p className="mt-0.5 text-xs text-slate-400">
              {application.jobId.jobCode}
            </p>
          </>
        ) : (
          // The job row was deleted; the application still exists.
          <span className="text-slate-400">Job removed</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (application) => (
        <Badge tone={STATUS_TONE[application.status] ?? "slate"}>
          {titleCase(application.status)}
        </Badge>
      ),
    },
    { key: "location", header: "Location", cell: (a) => a.location },
    {
      key: "applied",
      header: "Applied",
      cell: (application) => formatDateTime(application.createdAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (application) => (
        <div className="flex justify-end gap-1">
          <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" aria-label="Open resume">
              <FileText className="h-4 w-4" />
            </Button>
          </a>
          {user?.role === "admin" && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setPendingDelete(application)}
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
        title="Applications"
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

      {jobId && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Filtered to one job
          <button
            type="button"
            onClick={() => {
              setSearchParams({});
              setPage(1);
            }}
            className="ml-auto inline-flex items-center gap-1 text-xs hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <SearchBox
          value={q}
          placeholder="Search name, email or location"
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
          {APPLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </Select>
      </div>

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load applications")}
        </p>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || status || jobId ? "No matching applications" : "No applications yet"}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={applications}
          rowKey={(application) => application._id}
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

      {selected && (
        <ApplicationDrawer
          application={selected}
          saving={mutate.isPending}
          onClose={() => setSelected(null)}
          onSave={(changes) => mutate.mutate({ id: selected._id, changes })}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.fullName}'s application?`}
        description="This permanently removes the candidate record. The resume file stays in S3."
        confirmLabel="Delete"
        loading={removal.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removal.mutate(pendingDelete._id)}
      />
    </div>
  );
};

const ApplicationDrawer = ({
  application,
  saving,
  onClose,
  onSave,
}: {
  application: Application;
  saving: boolean;
  onClose: () => void;
  onSave: (changes: { status: ApplicationStatus; notes: string }) => void;
}) => {
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [notes, setNotes] = useState(application.notes ?? "");

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            {application.fullName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <dl className="grid grid-cols-2 gap-3">
            <Row label="Email">
              <a href={`mailto:${application.email}`} className="text-brand-700 hover:underline">
                {application.email}
              </a>
            </Row>
            <Row label="Phone">{application.contactNumber}</Row>
            <Row label="Location">{application.location}</Row>
            <Row label="Applied">{formatDateTime(application.createdAt)}</Row>
            <Row label="Applied for">
              {application.jobId?.title ?? "Job removed"}
            </Row>
            <Row label="Source">{application.source}</Row>
          </dl>

          <div className="flex flex-wrap gap-2">
            <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="secondary">
                <FileText className="h-4 w-4" />
                Resume
              </Button>
            </a>
            {application.linkedinUrl && (
              <a href={application.linkedinUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary">
                  <ExternalLink className="h-4 w-4" />
                  LinkedIn
                </Button>
              </a>
            )}
          </div>

          <Field label="Stage">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            >
              {APPLICATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Internal notes" hint="Never shown to the candidate.">
            <Textarea
              rows={6}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>

        <footer className="border-t border-slate-200 px-4 py-3">
          <Button
            className="w-full"
            loading={saving}
            onClick={() => onSave({ status, notes })}
          >
            Save
          </Button>
        </footer>
      </aside>
    </div>
  );
};
