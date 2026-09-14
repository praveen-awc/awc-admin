import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

/** Emitted when the session is unrecoverable; AuthProvider listens and signs out. */
export const AUTH_LOGOUT_EVENT = "auth:logout";
export const AUTH_FORBIDDEN_EVENT = "auth:forbidden";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // Sends and receives the httpOnly auth cookies. Without this the API sees
  // every request as anonymous.
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Single-flight refresh.
 *
 * Several queries firing at once will each get a 401 when the access token
 * expires. Without this shared promise they would trigger N parallel refreshes;
 * because the server rotates refresh tokens and treats a replayed token as
 * theft, that would revoke the whole family and log the user out mid-session.
 */
let refreshPromise: Promise<void> | null = null;

const runRefresh = (): Promise<void> => {
  refreshPromise ??= api
    .post("/auth/refresh")
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = config?.url ?? "";

    // Never recurse through the endpoints that produce the session itself.
    const isAuthEndpoint =
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/logout");

    if (status === 401 && config && !config._retry && !isAuthEndpoint) {
      config._retry = true;
      try {
        await runRefresh();
        return api(config);
      } catch {
        window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
      }
    }

    if (status === 403) {
      window.dispatchEvent(new Event(AUTH_FORBIDDEN_EVENT));
    }

    return Promise.reject(error);
  }
);

/**
 * Query params every admin list endpoint understands, on top of its own
 * filters. `sort` is ignored by the server unless that field is on the
 * endpoint's allowlist; `from`/`to` are inclusive `YYYY-MM-DD` days.
 *
 * A type alias rather than an interface on purpose: only aliases get an
 * implicit index signature, so only these can be passed to stripEmpty's
 * Record<string, unknown>.
 */
export type ListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
  from?: string;
  to?: string;
};

/**
 * Drops empty params so a request carries only what is actually filtered.
 *
 * Was written separately in six feature api modules. Sending `?status=` is
 * mostly harmless -- the controllers test truthiness -- but it makes two
 * identical views produce different query keys, and so separate caches.
 */
export const stripEmpty = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null)
  );

/** Shape every new backend endpoint returns. */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorBody {
  success: false;
  code: string;
  message: string;
  errors?: Array<{ path?: string; msg?: string }>;
}

/**
 * Pulls a displayable message out of an axios failure.
 * Prefers the first field-level validation error, then the top-level message.
 */
export const errorMessage = (
  error: unknown,
  fallback = "Something went wrong"
): string => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    const fieldError = body?.errors?.[0]?.msg;
    if (fieldError) return fieldError;
    if (body?.message) return body.message;
    if (!error.response) return "Cannot reach the server";
  }
  return fallback;
};

export const errorCode = (error: unknown): string | undefined =>
  axios.isAxiosError<ApiErrorBody>(error)
    ? error.response?.data?.code
    : undefined;

/** Bare client for presigned S3 PUTs -- must NOT carry cookies or interceptors. */
export const uploadToS3 = (
  url: string,
  file: File,
  onProgress?: (percent: number) => void
) =>
  axios.put(url, file, {
    // Content-Type must match what the URL was signed with, or S3 returns 403.
    headers: { "Content-Type": file.type },
    withCredentials: false,
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  } satisfies AxiosRequestConfig);
