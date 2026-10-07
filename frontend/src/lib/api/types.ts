/**
 * F4.1 — Type API.
 *
 * Cerminan bentuk respons backend (INTERFACES.md §0–§10). Semua di sini
 * sudah diverifikasi terhadap API yang sedang jalan, bukan hanya dokumen —
 * lihat catatan deviasi di `docs/frontend/CHANGELOG.md` F4.1.
 */

// ── Utilitas state (src/hooks/useFetch.ts) ───────────────────────────────────

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "success"; data: T }
  | { status: "error"; code: string; message: string };

// ── §0.4 Role ────────────────────────────────────────────────────────────────

export type Role =
  | "warga_umum"
  | "warga_terverifikasi"
  | "komite_sekolah"
  | "verifikator_dinas"
  | "kepala_dinas"
  | "admin";

export const ROLES: Role[] = [
  "warga_umum",
  "warga_terverifikasi",
  "komite_sekolah",
  "verifikator_dinas",
  "kepala_dinas",
  "admin",
];

/** Label peran untuk UI — backend hanya mengirim kode role. */
export const ROLE_LABEL: Record<Role, string> = {
  warga_umum: "Warga Umum",
  warga_terverifikasi: "Warga Terverifikasi",
  komite_sekolah: "Komite Sekolah",
  verifikator_dinas: "Verifikator Dinas",
  kepala_dinas: "Kepala Dinas",
  admin: "Admin",
};

export type StatusVerifikasi = "menunggu" | "terverifikasi" | "ditolak";

// ── §1 Auth ──────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  role: Role;
  status_verifikasi: string;
}

export interface RegisterResponse {
  user_id: string;
  status_verifikasi: StatusVerifikasi;
}

export interface RegisterRequest {
  nama: string;
  /** 16 digit. Disimpan backend di PDP Vault; tidak pernah dikembalikan lagi. */
  nik: string;
  email: string;
  password: string;
  sekolah_terkait_id?: string | null;
}

/**
 * `GET /auth/me`. PENTING: backend mengirim field `id`, bukan `user_id`
 * (deviasi dari mock lama — lihat CHANGELOG F4.1).
 */
export interface UserMe {
  id: string;
  nama: string;
  email: string;
  role: Role;
  status_verifikasi: StatusVerifikasi;
  sekolah_terkait_npsn: string | null;
}

// ── §2 Sekolah ───────────────────────────────────────────────────────────────

export type Jenjang = "SD" | "SMP" | "SMA" | "SMK";

/**
 * `penanda_masalah`: backend v1 selalu mengirim `"normal"`
 * (lihat AGENTS.md "Scope FINAL"). Nilai `aman`/`perlu_perhatian`/`kritis`
 * ada di kontrak §2 tetapi belum dihitung backend — FE harus tetap
 * menangani keduanya.
 */
export type PenandaMasalah = "normal" | "aman" | "perlu_perhatian" | "kritis";

export interface SekolahList {
  npsn: string;
  nama: string;
  alamat: string;
  jenjang: Jenjang | string;
  status_sekolah?: string;
  jumlah_isu_aktif: number;
  penanda_masalah: PenandaMasalah | string;
}

export interface KondisiSarana {
  id: string;
  nama_ruang: string;
  jumlah: number;
  kondisi_baik: number;
  kondisi_rusak_ringan: number;
  kondisi_rusak_sedang: number;
  kondisi_rusak_berat: number;
  sumber: string | null;
  perlu_verifikasi: boolean;
}

export interface RingkasanSarpras {
  total_unit: number;
  total_baik: number;
  total_rusak_ringan: number;
  total_rusak_sedang: number;
  total_rusak_berat: number;
}

export interface KlasterIsuRingkas {
  klaster_id: string;
  label: string | null;
  kategori: string;
  skor_prioritas: number;
  status_verifikasi: StatusKlaster;
}

/**
 * `GET /sekolah/{npsn}`. Bentuk datar — bukan `data_resmi` bersarang
 * seperti mock lama. Lihat CHANGELOG F4.1.
 *
 * PENTING (AGENTS.md §Scope): `rasio_guru_siswa`, `jumlah_pd`, `jumlah_ptk`,
 * `jumlah_rombel`, `utilitas_kapasitas_belajar` belum berisi data valid
 * (null / 0) — jangan dirender sebagai angka nyata (D-20: 3 kartu).
 */
export interface SekolahDetail extends SekolahList {
  status_sekolah: string;
  akreditasi: string | null;
  nama_kepsek: string | null;
  rasio_guru_siswa: string | null;
  rasio_spm_terpenuhi: boolean;
  jumlah_pd: number;
  jumlah_ptk: number;
  jumlah_rombel: number;
  utilitas_kapasitas_belajar: number;
  kondisi_sarana: KondisiSarana[];
  ringkasan_sarpras: RingkasanSarpras;
  klaster_isu: KlasterIsuRingkas[];
}

export interface SanggahanItem {
  laporan_id: string;
  tracking_id: string;
  deskripsi: string;
  fasilitas_terkait: string | null;
  kondisi_dilaporkan: string | null;
  status_sanggahan: string;
  created_at: string;
}

// ── §4 Laporan ───────────────────────────────────────────────────────────────

export type KondisiDilaporkan =
  | "rusak_ringan"
  | "rusak_sedang"
  | "rusak_berat"
  | "rusak_total"
  | string;

/**
 * Nama lama `KategoriLaporan` dipertahankan agar import di halaman yang
 * sudah ada tidak pecah. Backend v1 **tidak** lagi punya kolom
 * `kategori` pada laporan (Fase A: drop `laporan.kategori`) — teks bebas
 * saja, `fasilitas_terkait` opsional.
 */
export type KategoriLaporan = "ruang_belajar" | "sanitasi_air" | "utilitas" | "akses_lahan" | string;

export interface LaporanRequest {
  sekolah_npsn: string;
  deskripsi: string;
  /** Nama ruang dari kartu sarpras — opsional. */
  fasilitas_terkait?: string | null;
  kondisi_dilaporkan?: KondisiDilaporkan | null;
}

export interface LaporanResponse {
  id: string;
  tracking_id: string;
  user_id: string;
  sekolah_npsn: string;
  fasilitas_terkait: string | null;
  kondisi_dilaporkan: string | null;
  deskripsi: string;
  status_sanggahan: string;
  created_at: string;
}

export interface RiwayatLaporanItem {
  id: string;
  tracking_id: string;
  sekolah_npsn: string;
  fasilitas_terkait: string | null;
  kondisi_dilaporkan: string | null;
  deskripsi: string;
  status_sanggahan: string;
  created_at: string;
}

export interface LaporanDetail extends LaporanResponse {
  sekolah: { npsn: string; nama: string; jenjang: string } | null;
  foto: { id: string; storage_key: string; created_at: string }[];
}

// ── §5 Klaster ───────────────────────────────────────────────────────────────

export type KategoriKlaster =
  | "ruang_belajar"
  | "sanitasi_air"
  | "utilitas"
  | "akses_lahan"
  | "penunjang"
  | "belum_terklasifikasi";

export type StatusKlaster =
  | "menunggu_verifikasi"
  | "perlu_info_tambahan"
  | "tidak_terverifikasi"
  | "terverifikasi";

export interface KlasterListItem {
  klaster_id: string;
  label: string | null;
  kategori: KategoriKlaster | string;
  sekolah_npsn: string;
  skor_keparahan: number;
  skor_prioritas: number;
  jumlah_vote_terhitung: number;
  status_verifikasi: StatusKlaster;
  status_penanganan: string | null;
  urutan_prioritas_override: number | null;
}

export interface LaporanAnggota {
  laporan_id: string;
  fasilitas_terkait: string | null;
  kondisi_dilaporkan: string | null;
  deskripsi: string;
  created_at: string;
}

export interface KlasterDetail extends KlasterListItem {
  sekolah_nama: string | null;
  created_at: string;
  laporan: LaporanAnggota[];
}

// ── §6 Vote ──────────────────────────────────────────────────────────────────

export interface VoteResponse {
  vote_id: string;
  status_vote: "pending" | "terhitung";
}

export interface VoteStatus {
  has_voted: boolean;
  status_vote: "pending" | "terhitung" | null;
  vote_id: string | null;
}

// ── §7 Status tindak lanjut ──────────────────────────────────────────────────

export type StatusPenanganan =
  | "menunggu_verifikasi"
  | "perlu_info_tambahan"
  | "tidak_terverifikasi"
  | "terverifikasi"
  | "dalam_antrian_prioritas"
  | "dalam_proses"
  | "selesai"
  | "tidak_dapat_ditindaklanjuti";

export const STATUS_PENANGANAN: StatusPenanganan[] = [
  "menunggu_verifikasi",
  "perlu_info_tambahan",
  "tidak_terverifikasi",
  "terverifikasi",
  "dalam_antrian_prioritas",
  "dalam_proses",
  "selesai",
  "tidak_dapat_ditindaklanjuti"];

export interface RiwayatStatusEntry {
  status: string;
  alasan: string | null;
  timestamp: string;
}

export interface StatusTindakLanjut {
  status_terkini: string | null;
  riwayat: RiwayatStatusEntry[];
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardPrioritasItem {
  klaster_id: string;
  label: string | null;
  kategori: string;
  sekolah_npsn: string;
  sekolah_nama: string;
  skor_prioritas: number;
  status_verifikasi: StatusKlaster;
  badge: string | null;
}

export interface DashboardWilayah {
  jumlah_sekolah: number;
  klaster_aktif: number;
  klaster_prioritas: DashboardPrioritasItem[];
  sekolah_dengan_isu_terbanyak: unknown[];
}

export interface AiStatus {
  unclustered_laporan: number;
  total_klaster: number;
  last_run: string;
  message: string;
}