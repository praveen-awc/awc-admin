import { api, type ApiEnvelope } from "@/lib/api";

export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "interviewing",
  "hired",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  _id: string;
  jobId: { _id: string; jobCode?: string; title?: string; location?: string } | null;
  fullName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  location: string;
  linkedinUrl: string;
  source: string;
  resumeUrl: string;
  status: ApplicationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const stripEmpty = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null)
  );

export const listApplications = async (params: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  jobId?: string;
}) => {
  const { data } = await api.get<ApiEnvelope<Application[]>>(
    "/admin/applications",
    { params: stripEmpty(params) }
  );
  return {
    applications: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
  };
};

export const updateApplication = async (
  id: string,
  changes: { status?: ApplicationStatus; notes?: string }
): Promise<Application> => {
  const { data } = await api.patch<ApiEnvelope<Application>>(
    `/admin/applications/${id}`,
    changes
  );
  return data.data;
};

export const deleteApplication = async (id: string): Promise<void> => {
  await api.delete(`/admin/applications/${id}`);
};

/**
 * Downloads the CSV through the authenticated axios client, then hands the
 * browser a blob. A plain <a href> would hit the API without cookies attached
 * cross-origin and come back 401.
 */
export const downloadApplicationsCsv = async (params: {
  status?: string;
  jobId?: string;
}) => {
  const response = await api.get("/admin/applications/export", {
    params: stripEmpty(params),
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
