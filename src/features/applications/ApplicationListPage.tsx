import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Eye, FileText, Trash2, X } from "lucide-react";
import { MODULES } from "@/config/modules";
import {
  APPLICATION_STATUSES,
  deleteApplication,
  downloadApplicationsCsv,
  getResumeDownloadUrl,
  getResumeLink,
  listApplications,
  updateApplication,
  type Application,
  type ApplicationStatus,
} from "./application.api";
import { ResumePreview } from "./ResumePreview";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/format";
import { useListControls } from "@/hooks/useListParams";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { runBulk } from "@/lib/runBulk";
import { AuditLine } from "@/components/ui/AuditLine";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { DetailRow } from "@/components/ui/DetailRow";
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

  // All three filters live in the URL. jobId also arrives that way, as a link
  // from the Jobs list ("12 applicants").
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
  } = useListControls(["q", "status", "jobId"] as const);
  const { q, status, jobId } = filters;

  const [selected, setSelected] = useState<Application | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /**
   * The stored resumeUrl points at a private bucket, so it 403s. Fetch a signed
   * URL first, then navigate to it.
   *
   * window.location rather than window.open: after the await the user-gesture
   * context is gone and popup blockers step in. The signed URL carries
   * Content-Disposition: attachment, so assigning location starts the download
   * and leaves the page where it is.
   */
  const openResume = async (id: string) => {
    setDownloadingId(id);
    try {
      window.location.href = await getResumeDownloadUrl(id);
    } catch (error) {
      toast.error(errorMessage(error, "Could not open this resume"));
    } finally {
      setDownloadingId(null);
    }
  };

  /**
   * Read the CV first, download only if it is worth keeping.
   *
   * Word files have no preview -- the API rejects the request with a clear
   * message rather than opening a frame the browser cannot fill.
   */
  const previewResume = async (application: Application) => {
    setPreviewingId(application._id);
    try {
      const link = await getResumeLink(application._id, "preview");
      setPreview({ name: application.fullName, url: link.url });
    } catch (error) {
      toast.error(errorMessage(error, "Could not preview this resume"));
    } finally {
      setPreviewingId(null);
    }
  };

  const params = {
    page,
    limit,
    q,
    status,
    jobId,
    sort: sort.field,
    order: sort.order,
    ...range,
  };
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
    // Same filters as the list, so the CSV matches what is on screen.
    mutationFn: () => downloadApplicationsCsv({ status, jobId, ...range }),
    onError: (error) => toast.error(errorMessage(error, "Export failed")),
  });

  // One call per selected row against the existing endpoints, so their role
  // guards apply unchanged and partial failures stay visible.
  const bulk = useMutation({
    mutationFn: (action: { verb: string; run: (id: string) => Promise<unknown> }) =>
      runBulk(selection, action.run).then((result) => ({ ...result, verb: action.verb })),
    onSuccess: ({ ok, failed, verb }) => {
      if (failed === 0)
        toast.success(`${ok} application${ok === 1 ? "" : "s"} ${verb}`);
      else if (ok === 0)
        toast.error(`Could not ${verb} any of the ${failed} selected`);
      else toast.error(`${ok} of ${ok + failed} ${verb} — the rest failed`);

      setSelectedIds([]);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Bulk action failed")),
  });

  const applications = query.data?.applications ?? [];

  // Derived, not stored: intersecting with what's on screen guarantees a
  // bulk action can never reach a row the user can no longer see, without
  // depending on an effect having fired after a page or filter change.
  const selection = selectedIds.filter((id) =>
    applications.some((row) => row._id === id)
  );
  const meta = query.data?.meta;

  const columns: Column<Application>[] = [
    {
      key: "name",
      header: "Candidate",
      sortField: "fullName",
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
      sortField: "status",
      // Applications submitted through an older deployment arrive with no
      // status at all, so the schema default is applied here for display.
      // "new" is what the record means, not a guess.
      cell: (application) => {
        const status = application.status ?? "new";
        return (
          <Badge tone={STATUS_TONE[status] ?? "slate"}>
            {titleCase(status)}
          </Badge>
        );
      },
    },
    { key: "location", header: "Location", cell: (a) => a.location },
    {
      key: "applied",
      header: "Applied",
      sortField: "createdAt",
      defaultOrder: "desc",
      cell: (application) => formatDateTime(application.createdAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (application) => (
        <div className="flex justify-end gap-1">
          {/* Preview first, download second: reading a CV should not mean
              collecting a file you may not want. */}
          <Button
            size="sm"
            variant="ghost"
            aria-label="Preview resume"
            loading={previewingId === application._id}
            onClick={() => void previewResume(application)}
          >
            {previewingId === application._id ? null : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Download resume"
            loading={downloadingId === application._id}
            onClick={() => void openResume(application._id)}
          >
            {downloadingId === application._id ? null : (
              <FileText className="h-4 w-4" />
            )}
          </Button>
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
            onClick={() => set({ jobId: "" })}
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
          onChange={setSearch}
        />
        <Select
          className="w-44"
          value={status}
          onChange={(event) => set({ status: event.target.value })}
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </Select>
        <DateRangeFilter
          label="Applied"
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
            label: "Shortlist",
            onRun: () =>
              bulk.mutate({
                verb: "shortlisted",
                run: (id) => updateApplication(id, { status: "shortlisted" }),
              }),
          },
          {
            label: "Reject",
            onRun: () =>
              bulk.mutate({
                verb: "rejected",
                run: (id) => updateApplication(id, { status: "rejected" }),
              }),
          },
          {
            label: "Delete",
            variant: "danger",
            // Admin-only server-side; don't offer an action that can only fail.
            hidden: user?.role !== "admin",
            onRun: () =>
              bulk.mutate({
                verb: "deleted",
                run: (id) => deleteApplication(id),
              }),
          },
        ]}
      />

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
          icon={MODULES.applications.icon}
          title={
            q || status || jobId || range.from || range.to
              ? "No matching applications"
              : "No applications yet"
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={applications}
          rowKey={(application) => application._id}
          selection={{ selectedIds: selection, onSelectionChange: setSelectedIds }}
          sort={sort}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                noun="application"
                limit={limit}
                onLimitChange={setLimit}
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
          downloading={downloadingId === selected._id}
          previewing={previewingId === selected._id}
          onDownloadResume={() => void openResume(selected._id)}
          onPreviewResume={() => void previewResume(selected)}
          onClose={() => setSelected(null)}
          onSave={(changes) => mutate.mutate({ id: selected._id, changes })}
        />
      )}

      {preview && (
        <ResumePreview
          name={preview.name}
          url={preview.url}
          downloading={downloadingId !== null}
          onDownload={() => selected && void openResume(selected._id)}
          onClose={() => setPreview(null)}
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
  downloading,
  previewing,
  onDownloadResume,
  onPreviewResume,
  onClose,
  onSave,
}: {
  application: Application;
  saving: boolean;
  downloading: boolean;
  previewing: boolean;
  onDownloadResume: () => void;
  onPreviewResume: () => void;
  onClose: () => void;
  onSave: (changes: { status: ApplicationStatus; notes: string }) => void;
}) => {
  // Same fallback as the list column: a record with no status is an unreviewed
  // one, and the select needs a real value or it renders unset.
  const [status, setStatus] = useState<ApplicationStatus>(
    application.status ?? "new"
  );
  const [notes, setNotes] = useState(application.notes ?? "");

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
            <DetailRow label="Email">
              <a href={`mailto:${application.email}`} className="text-brand-700 hover:underline">
                {application.email}
              </a>
            </DetailRow>
            <DetailRow label="Phone">{application.contactNumber}</DetailRow>
            <DetailRow label="Location">{application.location}</DetailRow>
            <DetailRow label="Applied">{formatDateTime(application.createdAt)}</DetailRow>
            <DetailRow label="Applied for">
              {application.jobId?.title ?? "Job removed"}
            </DetailRow>
            <DetailRow label="Source">{application.source}</DetailRow>
          </dl>

          {/* Who last moved this along. Blank before it was tracked. */}
          <AuditLine
            updatedBy={application.updatedBy}
            createdAt={application.createdAt}
            updatedAt={application.updatedAt}
          />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={previewing} onClick={onPreviewResume}>
              {!previewing && <Eye className="h-4 w-4" />}
              Preview resume
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={downloading}
              onClick={onDownloadResume}
            >
              {!downloading && <FileText className="h-4 w-4" />}
              Download
            </Button>
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
