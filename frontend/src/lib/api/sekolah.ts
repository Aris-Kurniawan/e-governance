/**
 * F4.1 — Modul API §2 Direktori & Profil Sekolah.
 *
 * Semua endpoint di sini **publik** (tanpa token) — INTERFACES.md §2.
 */

import { getData, getPage, type Page } from "./client";
import type {
  SanggahanItem,
  SekolahDetail,
  SekolahList,
} from "./types";

export interface ListSekolahParams {
  search?: string;
  jenjang?: string;
  page?: number;
  page_size?: number;
}

/** `GET /sekolah` — daftar sekolah + pagination. */
export function listSekolah(
  params: ListSekolahParams = {},
): Promise<Page<SekolahList>> {
  return getPage<SekolahList>("/sekolah", {
    search: params.search,
    jenjang: params.jenjang,
    page: params.page ?? 1,
    // Dikunci ke 100 sesuai INTERFACES.md §0.2; backend membalas 400
    // `VALIDATION_ERROR` bila nilainya melebihi batas.
    page_size: Math.min(Math.max(params.page_size ?? 20, 1), 100),
  });
}

/** `GET /sekolah/{npsn}` — detail sekolah (kondisi sarana, ringkasan, klaster isu). */
export function detailSekolah(npsn: string): Promise<SekolahDetail> {
  return getData<SekolahDetail>(`/sekolah/${encodeURIComponent(npsn)}`);
}

/** `GET /sekolah/{npsn}/sanggahan` — riwayat sanggahan (publik, INTERFACES.md §2.1). */
export async function riwayatSanggahan(
  npsn: string,
  params: { page?: number; page_size?: number } = {},
): Promise<SanggahanItem[]> {
  const page = await getPage<SanggahanItem>(
    `/sekolah/${encodeURIComponent(npsn)}/sanggahan`,
    { page: params.page ?? 1, page_size: params.page_size ?? 50 },
  );
  return page.data;
}

/** Helper tampilan: ringkasan kondisi dari angka backend. */
export function hitungPersenRusak(ringkasan: {
  total_unit: number;
  total_baik: number;
  total_rusak_ringan: number;
  total_rusak_sedang: number;
  total_rusak_berat: number;
}): number {
  const total =
    ringkasan.total_baik +
    ringkasan.total_rusak_ringan +
    ringkasan.total_rusak_sedang +
    ringkasan.total_rusak_berat;
  if (total === 0) return 0;
  const rusak = total - ringkasan.total_baik;
  return Math.round((rusak / total) * 100);
}