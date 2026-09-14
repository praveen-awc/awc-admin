import type { AuditActor } from "@/components/ui/AuditLine";
import { api, stripEmpty, type ApiEnvelope, type ListQuery } from "@/lib/api";
import type { Block } from "@/components/forms/BlockEditor";

export interface CaseStudyHero {
  title: string;
  subText?: string;
  ctaText?: string;
  backgroundImage?: string;
  downloadLink?: string;
  logo?: string;
}

export interface CaseStudyListItem {
  _id: string;
  slug: string;
  clientName: string;
  industry?: string;
  casetype?: string;
  hero?: Pick<CaseStudyHero, "title" | "logo">;
  createdAt: string;
  /**
   * Populated by the admin detail endpoints. Absent on records written
   * before the field existed -- AuditLine renders those without a name.
   */
  createdBy?: AuditActor | string | null;
  updatedBy?: AuditActor | string | null;
  updatedAt: string;
}

export interface CaseStudy extends Omit<CaseStudyListItem, "hero"> {
  hero: CaseStudyHero;
  content: Block[];
  meta?: { title?: string; description?: string; keywords?: string[] };
}

export interface CaseStudyInput {
  slug?: string;
  clientName: string;
  industry?: string;
  casetype?: string;
  hero: CaseStudyHero;
  content: Block[];
  meta?: { title?: string; description?: string; keywords?: string[] };
}

export const listCaseStudies = async (
  params: ListQuery & { casetype?: string }
) => {
  const { data } = await api.get<ApiEnvelope<CaseStudyListItem[]>>(
    "/admin/casestudies",
    { params: stripEmpty(params) }
  );
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
  };
};

export const getCaseStudy = async (id: string): Promise<CaseStudy> => {
  const { data } = await api.get<ApiEnvelope<CaseStudy>>(
    `/admin/casestudies/${id}`
  );
  return data.data;
};

export const createCaseStudy = async (
  input: CaseStudyInput
): Promise<CaseStudy> => {
  const { data } = await api.post<ApiEnvelope<CaseStudy>>(
    "/admin/casestudies",
    input
  );
  return data.data;
};

export const updateCaseStudy = async (
  id: string,
  input: CaseStudyInput
): Promise<CaseStudy> => {
  const { data } = await api.put<ApiEnvelope<CaseStudy>>(
    `/admin/casestudies/${id}`,
    input
  );
  return data.data;
};

export const deleteCaseStudy = async (id: string): Promise<void> => {
  await api.delete(`/admin/casestudies/${id}`);
};
