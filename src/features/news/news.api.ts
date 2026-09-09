import { api, type ApiEnvelope } from "@/lib/api";
import type { Block } from "@/components/forms/BlockEditor";

export type NewsStatus = "draft" | "published";

export interface NewsListItem {
  _id: string;
  title: string;
  slug: string;
  subtitle?: string;
  overlay_image?: string;
  logo?: string;
  status: NewsStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsItem extends NewsListItem {
  heading_level?: number;
  items: Block[];
  previousSlugs: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    noIndex?: boolean;
  };
}

export interface NewsInput {
  title: string;
  slug?: string;
  subtitle?: string;
  heading_level?: number;
  overlay_image?: string;
  logo?: string;
  items: Block[];
  status: NewsStatus;
  seo?: NewsItem["seo"];
}

const stripEmpty = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null)
  );

export const listNews = async (params: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
}) => {
  const { data } = await api.get<ApiEnvelope<NewsListItem[]>>("/admin/news", {
    params: stripEmpty(params),
  });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
  };
};

export const getNews = async (id: string): Promise<NewsItem> => {
  const { data } = await api.get<ApiEnvelope<NewsItem>>(`/admin/news/${id}`);
  return data.data;
};

export const createNews = async (input: NewsInput): Promise<NewsItem> => {
  const { data } = await api.post<ApiEnvelope<NewsItem>>("/admin/news", input);
  return data.data;
};

export const updateNews = async (
  id: string,
  input: NewsInput
): Promise<NewsItem> => {
  const { data } = await api.put<ApiEnvelope<NewsItem>>(
    `/admin/news/${id}`,
    input
  );
  return data.data;
};

export const deleteNews = async (id: string): Promise<void> => {
  await api.delete(`/admin/news/${id}`);
};
