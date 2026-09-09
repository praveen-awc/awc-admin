import { api, type ApiEnvelope } from "@/lib/api";

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
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const stripEmpty = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null)
  );

export const listLeads = async (params: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
}) => {
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
export const downloadLeadsCsv = async (params: { status?: string }) => {
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
