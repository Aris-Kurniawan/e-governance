/**
 * F4.1 — Modul API §4 Laporan / Sanggahan.
 *
 * Akses: `warga_terverifikasi` & `komite_sekolah` (INTERFACES.md §4).
 * Catatan backend: field `kategori` **tidak ada lagi** (Fase A drop kolom) —
 * teks `deskripsi` yang jadi isi utama, `fasilitas_terkait` opsional.
 */

import { getData, getPage, postData, postForm, putData, type Page } from "./client";
import type {
  JawabanKonfirmasi,
  KonfirmasiDetail,
  KonfirmasiHasil,
  LaporanDetail,
  LaporanPerluReview,
  LaporanRequest,
  LaporanResponse,
  RiwayatLaporanItem,
  SkorKbmData,
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

/** `GET /laporan/publik` — aduan mandiri tervalidasi publik (DBG-023, D-29). */
export function listLaporanPublik(
  params: { page?: number; page_size?: number; sekolah_npsn?: string } = {},
): Promise<Page<RiwayatLaporanItem>> {
  return getPage<RiwayatLaporanItem>("/laporan/publik", {
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
    ...(params.sekolah_npsn ? { sekolah_npsn: params.sekolah_npsn } : {}),
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
/** `GET /laporan/skor-kbm` — F4.8 (D-22); RBAC: admin | verifikator_dinas | kepala_dinas. */
export function getSkorKbm(): Promise<SkorKbmData> {
  return getData<SkorKbmData>("/laporan/skor-kbm");
}

/**
 * F4.7 (D-21) — `GET /laporan/perlu-review`: laporan tanpa klaster (noise)
 * ATAU klaster kategori `belum_terklasifikasi`. RBAC: `admin`, `kepala_dinas`.
 */
export function perluReviewLaporan(
  params: { page?: number; page_size?: number } = {},
): Promise<Page<LaporanPerluReview>> {
  return getPage<LaporanPerluReview>("/laporan/perlu-review", {
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
  });
}

/**
 * F4.7 (D-21) — `PUT /laporan/{id}/status`: verifikasi manual per laporan.
 * RBAC: `admin`, `kepala_dinas`. Status di luar enum → `422 UNPROCESSABLE_ENTITY`.
 */
export function updateStatusLaporan(
  id: string,
  status: "menunggu" | "divalidasi" | "ditolak",
): Promise<{ id: string; tracking_id: string; status_sanggahan: string }> {
  return putData(`/laporan/${encodeURIComponent(id)}/status`, { json: { status } });
}

/**
 * F4.13 — `GET /laporan/{id}/konfirmasi` (INTERFACES §4.2, endpoint terpisah
 * sesuai keputusan §11.1 #3). Akses: pemilik laporan (403 untuk selainnya).
 *
 * Sekali GET memuat seluruh pertanyaan (keputusan §11.1 #1). Status
 * `terjawab`/`dilewati` → `pertanyaan: []` — FE jangan render pilihan kosong.
 */
export function getKonfirmasi(laporanId: string): Promise<KonfirmasiDetail> {
  return getData<KonfirmasiDetail>(`/laporan/${encodeURIComponent(laporanId)}/konfirmasi`);
}

/**
 * F4.13 — `POST /laporan/{id}/konfirmasi` (INTERFACES §4.3).
 * `jawaban: []` = warga melewati semua → `200 status: "dilewati"`.
 * Sudah pernah dijawab → `409 CONFLICT` (ApiError code `ALREADY_VOTED`
 * tidak dipakai di sini — backend mengirim `CONFLICT`/`ALREADY_ANSWERED`,
 * FE menangkap lewat `ApiError.status === 409` bila code tidak dikenal).
 */
export function postKonfirmasi(
  laporanId: string,
  jawaban: JawabanKonfirmasi[],
): Promise<KonfirmasiHasil> {
  return postData<KonfirmasiHasil>(`/laporan/${encodeURIComponent(laporanId)}/konfirmasi`, {
    jawaban,
  });
}
