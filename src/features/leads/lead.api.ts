import type { AuditActor } from "@/components/ui/AuditLine";
import { api, stripEmpty, type ApiEnvelope, type ListQuery } from "@/lib/api";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "closed",
  "spam",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  _id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  country: string;
  companyName: string;
  message: string;
  newsletter: boolean;
  /** Optional for the same reason as Application.status -- see that comment. */
  status?: LeadStatus;
  notes?: string;
  createdAt: string;
  /**
   * Populated by the admin detail endpoints. Absent on records written
   * before the field existed -- AuditLine renders those without a name.
   */
  createdBy?: AuditActor | string | null;
  updatedBy?: AuditActor | string | null;
  updatedAt: string;
}

export const listLeads = async (
  params: ListQuery & { status?: string; newsletter?: string }
) => {
  const { data } = await api.get<ApiEnvelope<Lead[]>>("/admin/leads", {
    params: stripEmpty(params),
  });
  return {
    leads: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
  };
};

export const updateLead = async (
  id: string,
  changes: { status?: LeadStatus; notes?: string }
): Promise<Lead> => {
  const { data } = await api.patch<ApiEnvelope<Lead>>(
    `/admin/leads/${id}`,
    changes
  );
  return data.data;
};

export const deleteLead = async (id: string): Promise<void> => {
  await api.delete(`/admin/leads/${id}`);
};

/** See downloadApplicationsCsv -- the blob route is required for cookie auth. */
export const downloadLeadsCsv = async (params: {
  status?: string;
  newsletter?: string;
  from?: string;
  to?: string;
}) => {
  const response = await api.get("/admin/leads/export", {
    params: stripEmpty(params),
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
