/**
 * F4.1 — Client HTTP.
 *
 * Satu-satunya tempat FE boleh bicara ke backend. Tanggung jawabnya:
 * - ungkap `data` dari amplop `{ data, meta }` (INTERFACES.md §0.1)
 * - pasang `Authorization: Bearer <access_token>` dari localStorage
 * - memetakan respons gagal ke `ApiError` (INTERFACES.md §0.3)
 * - refresh token otomatis sekali saat 401, lalu mengulang request
 *
 * Modul domain (`auth.ts`, `sekolah.ts`, dst) memanggil `request()`;
 * komponen tidak pernah memanggil `fetch` langsung.
 */

import { ApiError, type ApiErrorCode } from "./errors";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
  "http://localhost:8000";

/**
 * Batas waktu satu request. Tanpa ini, `fetch` ke backend yang mati dapat
 * menggantung Lebih dari 2 menit (teramati di lingkungan WSL) sehingga UI
 * tertahan di status "memuat" tanpa umpan balik. Setelah lewat, permintaan
 * dibatalkan dan dilaporkan sebagai `NETWORK_ERROR`.
 */
const DEFAULT_TIMEOUT_MS = Number(
  (import.meta.env.VITE_API_TIMEOUT_MS as string | undefined) ?? 15_000,
);

const ACCESS_TOKEN_KEY = "simakis_access_token";
const REFRESH_TOKEN_KEY = "simakis_refresh_token";

// ── Penyimpanan token ────────────────────────────────────────────────────────
// Sengaja `localStorage`: hanya access/refresh token JWT, tidak ada data
// pribadi. Field `nik` tidak pernah disimpan di sisi FE (INTERFACES.md §1).

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(access: string, refresh: string | null): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem("simakis_auth_user");
  },
};

// ── Bentuk amplop ─────────────────────────────────────────────────────────────

interface Envelope<T> {
  data?: T;
  meta?: PageMeta;
  error?: { code?: string; message?: string; details?: Record<string, string> };
}

export interface PageMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

const EMPTY_META: PageMeta = {
  page: 1,
  page_size: 20,
  total_items: 0,
  total_pages: 0,
};

/**.Unwrap `data` dari respons ber-amplop. Errorius → `ApiError`. */
export function unwrap<T>(payload: unknown, fallbackCode: ApiErrorCode = "INTERNAL_ERROR"): T {
  if (payload && typeof payload === "object" && "error" in payload) {
    const env = payload as Envelope<never>;
    throw new ApiError(
      (env.error?.code as ApiErrorCode) ?? fallbackCode,
      env.error?.message ?? "Permintaan gagal diproses server.",
      0,
      env.error?.details,
    );
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    const env = payload as Envelope<T>;
    if (env.data === undefined) {
      throw new ApiError(fallbackCode, "Respons server tidak memuat data.", 0);
    }
    return env.data;
  }
  // Endpoint tanpa amplop (mis. health check) — kembalikan apa adanya.
  return payload as T;
}

/** Ambil `data` + `meta` (untuk endpoint berpaginasi). */
export function unwrapPage<T>(payload: unknown): Page<T> {
  const env = (payload ?? {}) as Envelope<T>;
  if (env.error) {
    throw new ApiError(
      (env.error.code as ApiErrorCode) ?? "INTERNAL_ERROR",
      env.error.message ?? "Permintaan gagal diproses server.",
      0,
      env.error.details,
    );
  }
  const rows = env.data;
  if (!Array.isArray(rows)) {
    throw new ApiError("INTERNAL_ERROR", "Respons server tidak memuat daftar data.", 0);
  }
  return { data: rows, meta: env.meta ?? EMPTY_META };
}

// ── Query param ──────────────────────────────────────────────────────────────
// Vote/verifikasi/status memakai **query param**, bukan body JSON
// (INTERFACES.md §5, §6, §7).

export type QueryValue = string | number | boolean | null | undefined;

export function qs(params: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ── Refresh token (satu percobaan, anti infinite-loop) ───────────────────────

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Tukar refresh_token jadi access_token baru.
 * Kembalikan `false` kalau gagal → pemanggil membersihkan token & logout.
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as Envelope<{ access_token: string; refresh_token?: string }>;
        const data = body.data;
        if (!data?.access_token) return false;
        tokenStore.set(data.access_token, data.refresh_token ?? refresh);
        return true;
      } catch {
        return false;
      } finally {
        // Beri tick berikutnya kesempatan retry setelah promise ini selesai.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

// ── Request inti ─────────────────────────────────────────────────────────────

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Body JSON — jangan dipakai untuk vote/verifikasi/status (query param). */
  json?: unknown;
  /** Query param — dipakai vote/verifikasi/status. */
  query?: Record<string, QueryValue>;
  /** FormData (upload CSV/foto) — header Content-Type biarkan otomatis. */
  formData?: FormData;
  /** Endpoint publik: tidak perlu token (mis. `/sekolah`). */
  anonymous?: boolean;
  signal?: AbortSignal;
  /** Batas waktu request ini (ms). Default `VITE_API_TIMEOUT_MS` atau 15 detik. */
  timeoutMs?: number;
}

/**
 * Satu-satunya jalan ke backend. Otomatis:
 * 1. pasang Bearer token (kecuali `anonymous`)
 * 2.UNGKAP amplop / lempar `ApiError`
 * 3. coba refresh token sekali lalu ulangi request bila 401
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", json, query, formData, anonymous = false, signal, timeoutMs } = options;
  const url = `${API_BASE_URL}${path}${qs(query ?? {})}`;
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lewatWaktu = false;
  if (!signal?.aborted) {
    timeoutId = setTimeout(() => {
      lewatWaktu = true;
      controller.abort();
    }, timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }
  // Abort dari pemanggil (mis. StrictMode atau unmount komponen) diteruskan
  // ke controller internal supaya request benar-benar dibatalkan.
  const forwardAbort = (): void => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  const buildHeaders = (): HeadersInit => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (json !== undefined) headers["Content-Type"] = "application/json";
    if (!anonymous) {
      const token = tokenStore.access;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const send = (): Promise<Response> =>
    fetch(url, {
      method,
      headers: buildHeaders(),
      body: formData ?? (json !== undefined ? JSON.stringify(json) : undefined),
      signal: controller.signal,
    });

  const clear = (): void => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    signal?.removeEventListener("abort", forwardAbort);
  };

  let res: Response;
  try {
    res = await send();
  } catch (err) {
    if ((err as Error)?.name === "AbortError" && !lewatWaktu) {
      // Dibatalkan pemanggil (mis. StrictMode / unmount) — biarkan apa adanya.
      clear();
      throw err;
    }
    clear();
    throw new ApiError(
      "NETWORK_ERROR",
      lewatWaktu
        ? `Server tidak merespons dalam ${Math.round((timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)} detik. ` +
            `Pastikan backend berjalan di ${API_BASE_URL}.`
        : "Tidak dapat terhubung ke server. Pastikan backend berjalan di " + API_BASE_URL,
    );
  }
  clear();

  // 401 → coba tukar refresh token sekali, lalu ulangi.
  if (res.status === 401 && !anonymous) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        timeoutId = setTimeout(() => {
          lewatWaktu = true;
          controller.abort();
        }, timeoutMs ?? DEFAULT_TIMEOUT_MS);
        res = await send();
        clear();
      } catch {
        clear();
        throw new ApiError("NETWORK_ERROR", "Koneksi terputus saat mencoba lagi.");
      }
    } else {
      tokenStore.clear();
      throw new ApiError("UNAUTHORIZED", "Sesi berakhir. Silakan login kembali.", 401);
    }
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const env = (payload ?? {}) as Envelope<never>;
    throw new ApiError(
      (env.error?.code as ApiErrorCode) ?? "INTERNAL_ERROR",
      env.error?.message ?? `Permintaan gagal (HTTP ${res.status}).`,
      res.status,
      env.error?.details,
    );
  }

  return payload as T;
}

// ── Helper It'll dipakai modul domain ────────────────────────────────────────

export function get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
  return request<T>(path, { query });
}

export async function getData<T>(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<T> {
  return unwrap<T>(await request<unknown>(path, { query }));
}

export async function getPage<T>(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<Page<T>> {
  return unwrapPage<T>(await request<unknown>(path, { query }));
}

/** POST dengan body JSON. */
export async function postData<T>(
  path: string,
  json?: unknown,
  query?: Record<string, QueryValue>,
): Promise<T> {
  return unwrap<T>(await request<unknown>(path, { method: "POST", json, query }));
}

/** PUT dengan body JSON (atau hanya query param — lihat INTERFACES.md §7). */
export async function putData<T>(
  path: string,
  options: { json?: unknown; query?: Record<string, QueryValue> } = {},
): Promise<T> {
  return unwrap<T>(
    await request<unknown>(path, { method: "PUT", json: options.json, query: options.query }),
  );
}

/** POST multipart/form-data (upload CSV & foto bukti — INTERFACES.md §10). */
export async function postForm<T>(
  path: string,
  formData: FormData,
  query?: Record<string, QueryValue>,
): Promise<T> {
  return unwrap<T>(await request<unknown>(path, { method: "POST", formData, query }));
}