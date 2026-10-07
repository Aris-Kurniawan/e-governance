/**
 * F4.1 — Modul API §5 Klaster & pipeline AI.
 *
 * Catatan penting: `verifikasi` dan `status` memakai **query param**, bukan
 * body JSON (INTERFACES.md §5 & §7) — jangan diubah ke body.
 */

import { getData, getPage, postData, putData, type Page } from "./client";
import type {
  AiStatus,
  KlasterDetail,
  KlasterListItem,
  RiwayatStatusEntry,
  StatusPenanganan,
} from "./types";

export interface ListKlasterParams {
  sekolah_npsn?: string;
  kategori?: string;
  status_verifikasi?: string;
  page?: number;
  page_size?: number;
}

/** `GET /klaster` — publik, urut skor prioritas descending. */
export function listKlaster(params: ListKlasterParams = {}): Promise<Page<KlasterListItem>> {
  return getPage<KlasterListItem>("/klaster", {
    sekolah_npsn: params.sekolah_npsn,
    kategori: params.kategori,
    status_verifikasi: params.status_verifikasi,
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
  });
}

/** `GET /klaster/{id}` — detail + daftar laporan anggota. */
export function detailKlaster(id: string): Promise<KlasterDetail> {
  return getData<KlasterDetail>(`/klaster/${encodeURIComponent(id)}`);
}

/**
 * `PUT /klaster/{id}/verifikasi?status=&alasan=` — `verifikator_dinas`.
 * `alasan` wajib kalau `status` ≠ `terverifikasi` (backend → 422).
 */
export function verifikasiKlaster(
  id: string,
  status: StatusPenanganan,
  alasan?: string,
): Promise<{ klaster_id: string; status: string; message: string }> {
  return putData(`/klaster/${encodeURIComponent(id)}/verifikasi`, {
    query: { status, alasan },
  });
}

/** `GET /klaster/{id}/riwayat` — riwayat status append-only, publik. */
export async function riwayatStatus(id: string): Promise<RiwayatStatusEntry[]> {
  const page = await getPage<RiwayatStatusEntry>(
    `/klaster/${encodeURIComponent(id)}/riwayat`,
    { page_size: 100 },
  );
  return page.data;
}

/** Ringkas riwayat menjadi bentuk yang dipakai kartu status di FE. */
export async function statusTindakLanjut(id: string) {
  const riwayat = await riwayatStatus(id);
  const terakhir = riwayat.length > 0 ? riwayat[riwayat.length - 1] : null;
  return { status_terkini: terakhir?.status ?? null, riwayat };
}

/** `POST /ai/cluster` — `admin`, `verifikator_dinas`. Pipeline lambat. */
export function triggerClustering(forceReprocess = false) {
  return postData<{ klaster_created: number; message: string }>("/ai/cluster", undefined, {
    force_reprocess: forceReprocess ? true : undefined,
  });
}

/** `GET /ai/status` — `admin`, `verifikator_dinas`. */
export function statusPipeline(): Promise<AiStatus> {
  return getData<AiStatus>("/ai/status");
}