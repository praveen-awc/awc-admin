import type { AuditActor } from "@/components/ui/AuditLine";
import { api, stripEmpty, type ApiEnvelope, type ListQuery } from "@/lib/api";

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
  /**
   * Optional because it genuinely can be absent. The older deployment still
   * serving the live careers form predates this field and writes applications
   * to the same database without it. Treat a missing status as "new".
   */
  status?: ApplicationStatus;
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

export const listApplications = async (
  params: ListQuery & { status?: string; jobId?: string }
) => {
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

export interface ResumeLink {
  url: string;
  expiresIn: number;
  /** False for .doc/.docx, which no browser can render. */
  previewable: boolean;
  fileName: string;
}

/**
 * Resumes live in a private S3 bucket, so `application.resumeUrl` is not
 * directly openable -- it returns AccessDenied. Ask the API for a fresh signed
 * URL each time; it expires shortly after.
 *
 * `mode: "preview"` returns an inline URL for reading the CV in place;
 * otherwise the URL carries Content-Disposition: attachment and downloads.
 */
export const getResumeLink = async (
  id: string,
  mode: "download" | "preview" = "download"
): Promise<ResumeLink> => {
  const { data } = await api.get<ApiEnvelope<ResumeLink>>(
    `/admin/applications/${id}/resume`,
    { params: mode === "preview" ? { mode: "preview" } : undefined }
  );
  return data.data;
};

/** Convenience for the download path, which only ever needs the URL. */
export const getResumeDownloadUrl = async (id: string): Promise<string> =>
  (await getResumeLink(id, "download")).url;

/**
 * Downloads the CSV through the authenticated axios client, then hands the
 * browser a blob. A plain <a href> would hit the API without cookies attached
 * cross-origin and come back 401.
 */
export const downloadApplicationsCsv = async (params: {
  status?: string;
  jobId?: string;
  from?: string;
  to?: string;
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
