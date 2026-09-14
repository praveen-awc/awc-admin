import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, X } from "lucide-react";
import { MODULES } from "@/config/modules";
import {
  LEAD_STATUSES,
  deleteLead,
  downloadLeadsCsv,
  listLeads,
  updateLead,
  type Lead,
  type LeadStatus,
} from "./lead.api";
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

const STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  new: "blue",
  contacted: "amber",
  qualified: "green",
  closed: "slate",
  spam: "slate",
};

export const LeadListPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Filters live in the URL so a refresh keeps them and a filtered view can be
  // shared -- "all new leads this month" is a link, not a set of clicks to
  // repeat.
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

  const [selected, setSelected] = useState<Lead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);
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
    queryKey: ["leads", params],
    queryFn: () => listLeads(params),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const mutate = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: { status?: LeadStatus; notes?: string };
    }) => updateLead(id, changes),
    onSuccess: (updated) => {
      toast.success("Lead updated");
      setSelected((current) => (current?._id === updated._id ? updated : current));
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update")),
  });

  const removal = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      toast.success("Lead deleted");
      setPendingDelete(null);
      setSelected(null);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  const exporting = useMutation({
    // The CSV has to match what is on screen, so it carries the same filters.
    mutationFn: () => downloadLeadsCsv({ status, ...range }),
    onError: (error) => toast.error(errorMessage(error, "Export failed")),
  });

  // Runs the existing per-item endpoints once per selected row, so their
  // requireRole guards apply unchanged. Partial failures are reported as such.
  const bulk = useMutation({
    mutationFn: (action: { verb: string; run: (id: string) => Promise<unknown> }) =>
      runBulk(selection, action.run).then((result) => ({ ...result, verb: action.verb })),
    onSuccess: ({ ok, failed, verb }) => {
      if (failed === 0) toast.success(`${ok} lead${ok === 1 ? "" : "s"} ${verb}`);
      else if (ok === 0) toast.error(`Could not ${verb} any of the ${failed} selected`);
      else toast.error(`${ok} of ${ok + failed} ${verb} — the rest failed`);

      setSelectedIds([]);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Bulk action failed")),
  });

  const leads = query.data?.leads ?? [];

  // Derived, not stored: intersecting with what's on screen guarantees a
  // bulk action can never reach a row the user can no longer see, without
  // depending on an effect having fired after a page or filter change.
  const selection = selectedIds.filter((id) =>
    leads.some((row) => row._id === id)
  );
  const meta = query.data?.meta;

  const columns: Column<Lead>[] = [
    {
      key: "name",
      header: "From",
      sortField: "fullName",
      cell: (lead) => (
        <>
          <button
            type="button"
            onClick={() => setSelected(lead)}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {lead.fullName}
          </button>
          <p className="mt-0.5 text-xs text-slate-400">{lead.email}</p>
        </>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortField: "companyName",
      cell: (lead) => (
        <>
          <span className="text-slate-700">{lead.companyName}</span>
          <p className="mt-0.5 text-xs text-slate-400">{lead.country}</p>
        </>
      ),
    },
    {
      key: "message",
      header: "Message",
      className: "max-w-sm",
      cell: (lead) => (
        <p className="line-clamp-2 text-slate-600">{lead.message}</p>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortField: "status",
      // Leads written by an older deployment can arrive with no status, the
      // same way applications do. Fall back to the schema default rather than
      // letting a missing field take the page down.
      cell: (lead) => {
        const status = lead.status ?? "new";
        return (
          <Badge tone={STATUS_TONE[status] ?? "slate"}>{titleCase(status)}</Badge>
        );
      },
    },
    {
      key: "received",
      header: "Received",
      sortField: "createdAt",
      defaultOrder: "desc",
      cell: (lead) => formatDateTime(lead.createdAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (lead) =>
        user?.role === "admin" ? (
          <Button
            size="sm"
            variant="ghost"
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setPendingDelete(lead)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contact leads"
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

      <div className="flex flex-wrap gap-2">
        <SearchBox
          value={q}
          placeholder="Search name, email, company or country"
          onChange={setSearch}
        />
        <Select
          className="w-44"
          value={status}
          onChange={(event) => set({ status: event.target.value })}
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </Select>
        <DateRangeFilter
          label="Received"
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
            label: "Mark contacted",
            onRun: () =>
              bulk.mutate({
                verb: "marked contacted",
                run: (id) => updateLead(id, { status: "contacted" }),
              }),
          },
          {
            label: "Mark spam",
            onRun: () =>
              bulk.mutate({
                verb: "marked spam",
                run: (id) => updateLead(id, { status: "spam" }),
              }),
          },
          {
            label: "Delete",
            variant: "danger",
            // The API rejects this for editors anyway; hiding it avoids
            // offering an action that can only fail.
            hidden: user?.role !== "admin",
            onRun: () =>
              bulk.mutate({ verb: "deleted", run: (id) => deleteLead(id) }),
          },
        ]}
      />

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load leads")}
        </p>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={MODULES.leads.icon}
          title={
            q || status || range.from || range.to
              ? "No matching leads"
              : "No enquiries yet"
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={leads}
          rowKey={(lead) => lead._id}
          selection={{ selectedIds: selection, onSelectionChange: setSelectedIds }}
          sort={sort}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                noun="lead"
                limit={limit}
                onLimitChange={setLimit}
                onChange={setPage}
              />
            )
          }
        />
      )}

      {selected && (
        <LeadDrawer
          lead={selected}
          saving={mutate.isPending}
          onClose={() => setSelected(null)}
          onSave={(changes) => mutate.mutate({ id: selected._id, changes })}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete the enquiry from ${pendingDelete?.fullName}?`}
        description="This permanently removes the message and contact details."
        confirmLabel="Delete"
        loading={removal.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removal.mutate(pendingDelete._id)}
      />
    </div>
  );
};

const LeadDrawer = ({
  lead,
  saving,
  onClose,
  onSave,
}: {
  lead: Lead;
  saving: boolean;
  onClose: () => void;
  onSave: (changes: { status: LeadStatus; notes: string }) => void;
}) => {
  // Same fallback as the list column: a record with no status is an unread
  // one, and the select needs a real value or it renders unset.
  const [status, setStatus] = useState<LeadStatus>(lead.status ?? "new");
  const [notes, setNotes] = useState(lead.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{lead.fullName}</h2>
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
              <a href={`mailto:${lead.email}`} className="text-brand-700 hover:underline">
                {lead.email}
              </a>
            </DetailRow>
            <DetailRow label="Phone">{lead.contactNumber}</DetailRow>
            <DetailRow label="Company">{lead.companyName}</DetailRow>
            <DetailRow label="Country">{lead.country}</DetailRow>
            <DetailRow label="Received">{formatDateTime(lead.createdAt)}</DetailRow>
            <DetailRow label="Newsletter">{lead.newsletter ? "Yes" : "No"}</DetailRow>
          </dl>

          {/* Who last moved this along. Blank before it was tracked. */}
          <AuditLine
            updatedBy={lead.updatedBy}
            createdAt={lead.createdAt}
            updatedAt={lead.updatedAt}
          />

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Message</dt>
            <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
              {lead.message}
            </dd>
          </div>

          <Field label="Status">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as LeadStatus)}
            >
              {LEAD_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Internal notes">
            <Textarea
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>

        <footer className="border-t border-slate-200 px-4 py-3">
          <Button className="w-full" loading={saving} onClick={() => onSave({ status, notes })}>
            Save
          </Button>
        </footer>
      </aside>
    </div>
  );
};
