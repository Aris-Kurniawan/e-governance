/**
 * F4.1 — Modul API Dashboard (§3) & Audit/Ingest (§8).
 *
 * Akses (INTERFACES.md §3):
 * - `GET /dashboard/prioritas` → **publik**
 * - `GET /dashboard/wilayah`  → `verifikator_dinas`, `kepala_dinas`
 */

import { getData, getPage, postForm, unwrap, request } from "./client";
import type {
  DashboardPrioritasItem,
  DashboardWilayah,
} from "./types";

/** `GET /dashboard/prioritas` — publik, badge untuk klaster belum terverifikasi. */
export async function dashboardPrioritas(
  params: { status?: string; limit?: number } = {},
): Promise<DashboardPrioritasItem[]> {
  const data = await getData<DashboardPrioritasItem[]>("/dashboard/prioritas", {
    status: params.status,
    limit: params.limit ?? 20,
  });
  return data ?? [];
}

/** `GET /dashboard/wilayah` — khusus dinas (butuh token). */
export function dashboardWilayah(): Promise<DashboardWilayah> {
  return getData<DashboardWilayah>("/dashboard/wilayah");
}

/** `GET /audit/log` — `admin`, `kepala_dinas`. */
export async function auditLog(
  params: { page?: number; page_size?: number } = {},
): Promise<{
  data: {
    id: string;
    actor_user_id: string | null;
    aksi: string;
    objek_tipe: string;
    objek_id: string | null;
    detail: Record<string, unknown> | null;
    created_at: string;
  }[];
  meta: { page: number; page_size: number; total_items: number; total_pages: number };
}> {
  return getPage(`/audit/log`, { page: params.page ?? 1, page_size: params.page_size ?? 20 });
}

/** `POST /ingest/dapodik` — upload CSV, `admin`/`verifikator_dinas` (§8). */
export async function ingestDapodik(file: File): Promise<{ ingest_job_id: string; status: string }> {
  const form = new FormData();
  form.append("file", file);
  return postForm<{ ingest_job_id: string; status: string }>("/ingest/dapodik", form);
}

/** Bentuk baris `GET /ingest/riwayat` (verifikasi dari backend). */
export interface IngestJob {
  id: string;
  file_name: string;
  status: string;
  baris_diproses: number | null;
  baris_gagal: number | null;
  completed_at: string | null;
  created_at: string;
}

/** `GET /ingest/riwayat` — `admin`, `verifikator_dinas` (§8). */
export async function riwayatIngest(
  params: { page?: number; page_size?: number } = {},
): Promise<IngestJob[]> {
  const page = await getPage<IngestJob>("/ingest/riwayat", {
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
  });
  return page.data;
}

export { unwrap, request };