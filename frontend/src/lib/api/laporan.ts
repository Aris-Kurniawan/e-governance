/**
 * F4.1 — Modul API §4 Laporan / Sanggahan.
 *
 * Akses: `warga_terverifikasi` & `komite_sekolah` (INTERFACES.md §4).
 * Catatan backend: field `kategori` **tidak ada lagi** (Fase A drop kolom) —
 * teks `deskripsi` yang jadi isi utama, `fasilitas_terkait` opsional.
 */

import { getData, getPage, postData, postForm, type Page } from "./client";
import type {
  LaporanDetail,
  LaporanRequest,
  LaporanResponse,
  RiwayatLaporanItem,
} from "./types";

/** `POST /laporan` — kirim laporan/sanggahan baru. */
export function kirimLaporan(payload: LaporanRequest): Promise<LaporanResponse> {
  return postData<LaporanResponse>("/laporan", payload);
}

/** `GET /laporan/riwayat` — riwayat laporan milik sendiri. */
export function riwayatLaporan(
  params: { page?: number; page_size?: number } = {},
): Promise<Page<RiwayatLaporanItem>> {
  return getPage<RiwayatLaporanItem>("/laporan/riwayat", {
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
  });
}

/** `GET /laporan/{id}` — pemilik laporan atau petugas dinas. */
export function detailLaporan(id: string): Promise<LaporanDetail> {
  return getData<LaporanDetail>(`/laporan/${encodeURIComponent(id)}`);
}

/**
 * `POST /upload/laporan?laporan_id={id}` — upload foto bukti.
 * Multipart, field `file` (INTERFACES.md §10).
 */
export async function uploadFotoBukti(
  laporanId: string,
  file: File,
): Promise<{ storage_key: string }> {
  const form = new FormData();
  form.append("file", file);
  return postForm<{ storage_key: string }>(
    `/upload/laporan`,
    form,
    { laporan_id: laporanId },
  );
}