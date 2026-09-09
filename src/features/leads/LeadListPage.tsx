import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Mail, Trash2, X } from "lucide-react";
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

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);

  const params = { page, limit: 20, q, status };
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
    mutationFn: () => downloadLeadsCsv({ status }),
    onError: (error) => toast.error(errorMessage(error, "Export failed")),
  });

  const leads = query.data?.leads ?? [];
  const meta = query.data?.meta;

  const columns: Column<Lead>[] = [
    {
      key: "name",
      header: "From",
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
      cell: (lead) => (
        <Badge tone={STATUS_TONE[lead.status] ?? "slate"}>
          {titleCase(lead.status)}
        </Badge>
      ),
    },
    {
      key: "received",
      header: "Received",
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
          {LEAD_STATUSES.map((value) => (
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
          {errorMessage(query.error, "Could not load leads")}
        </p>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={q || status ? "No matching leads" : "No enquiries yet"}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={leads}
          rowKey={(lead) => lead._id}
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
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );

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
            <Row label="Email">
              <a href={`mailto:${lead.email}`} className="text-brand-700 hover:underline">
                {lead.email}
              </a>
            </Row>
            <Row label="Phone">{lead.contactNumber}</Row>
            <Row label="Company">{lead.companyName}</Row>
            <Row label="Country">{lead.country}</Row>
            <Row label="Received">{formatDateTime(lead.createdAt)}</Row>
            <Row label="Newsletter">{lead.newsletter ? "Yes" : "No"}</Row>
          </dl>

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
