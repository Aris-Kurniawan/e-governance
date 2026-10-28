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
  nip?: string | null;
  status_verifikasi: StatusVerifikasi;
  sekolah_terkait_npsn: string | null;
}

// ── §2 Sekolah ───────────────────────────────────────────────────────────────

export type Jenjang = "SD" | "SMP" | "SMA" | "SMK";

/**
 * `penanda_masalah` — INTERFACES §2: `aman | perlu_perhatian | kritis`.
 * Sejak F4.11 (D-23) backend menghitungnya dari level Skor KBM
 * (≥70 `kritis`, 40–69 `perlu_perhatian`, <40 `aman`); `"normal"` adalah
 * nilai legacy backend v1 yang tetap ditangani untuk kompatibilitas.
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
  /** Koordinat Dapodik (WGS84). `null` = tidak tersedia — jangan buat titik rekaan. */
  lintang: number | null;
  bujur: number | null;
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

/**
 * F4.13 — Konfirmasi Severity Pasca-Laporan (INTERFACES.md §4.1–§4.4,
 * disetujui 20 Okt 2026: sekali GET · field `kode` · endpoint terpisah ·
 * lazy flip `dilewati` · verifikator tidak boleh ubah jawaban — §11.1).
 *
 * Sifat: opsional, tidak memblokir; jawaban warga selalu menang atas
 * ekstraksi AI (SPEC_SEVERITY_KLASIFIKASI.md §15.6).
 */
export type StatusKonfirmasi = "menunggu" | "terjawab" | "dilewati";
export type SumberKondisi = "ai" | "warga" | null;

/** Ikhtisar alur konfirmasi — dikirim pada respons POST /laporan (opsional). */
export interface KonfirmasiInfo {
  perlu_konfirmasi: boolean;
  jumlah_pertanyaan?: number;
  kedaluwarsa_pada?: string | null;
}

export interface KonfirmasiPilihan {
  kode: string;
  label: string;
  /** Enum kondisi resmi — hanya pada pilihan gejala (`pilih_satu_bertingkat`). */
  tingkat?: string;
}

export interface KonfirmasiPertanyaan {
  kode: string;
  teks: string;
  tipe: "pilih_satu" | "pilih_satu_bertingkat";
  urutan?: "dari_terparah";
  /** Aturan FE: begitu satu gejala terjawab, opsi lebih ringan dilewati. */
  lewati_bila_terjawab?: boolean;
  pilihan: KonfirmasiPilihan[];
}

/** Respons `GET /laporan/{id}/konfirmasi` (§4.2). */
export interface KonfirmasiDetail {
  laporan_id: string;
  status: StatusKonfirmasi;
  jumlah_terjawab: number;
  pertanyaan: KonfirmasiPertanyaan[];
}

export interface JawabanKonfirmasi {
  kode: string;
  nilai: string;
}

/** Respons `POST /laporan/{id}/konfirmasi` (§4.3). */
export interface KonfirmasiHasil {
  status: "terjawab" | "dilewati";
  kondisi_dilaporkan: string | null;
  sumber_kondisi: SumberKondisi;
  diproses_pada: string;
}

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
  /** F4.13 — ikhtisar alur konfirmasi pada respons pembuatan laporan (opsional). */
  konfirmasi?: KonfirmasiInfo | null;
  /** F4.13 (§4.4) — status konfirmasi severity (opsional, toleran bila BE belum kirim). */
  status_konfirmasi?: StatusKonfirmasi | null;
  sumber_kondisi?: SumberKondisi | null;
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
  /** F4.13 (§4.4) — semua field konfirmasi opsional: FE tidak render bila absen. */
  status_konfirmasi?: StatusKonfirmasi | null;
  sumber_kondisi?: SumberKondisi | null;
  /** true bila laporan masih boleh dijawab (< 24 jam). */
  konfirmasi_perlu_dijawab?: boolean;
}

export interface LaporanDetail extends LaporanResponse {
  sekolah: { npsn: string; nama: string; jenjang: string } | null;
  foto: { id: string; storage_key: string; created_at: string }[];
}

/**
 * F4.7 (D-21) — baris `GET /laporan/perlu-review` (INTERFACES.md §4):
 * laporan tanpa klaster (noise HDBSCAN) ATAU klaster kategori
 * `belum_terklasifikasi`. `klaster: null` bila laporan tidak punya klaster.
 */
export interface LaporanPerluReview {
  id: string;
  tracking_id: string;
  sekolah_npsn: string;
  sekolah_nama: string | null;
  fasilitas_terkait: string | null;
  kondisi_dilaporkan: string | null;
  deskripsi: string;
  status_sanggahan: string;
  created_at: string;
  klaster: { id: string; label: string | null; kategori: string } | null;
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
  | "tidak_terverifikasi"
  | "terverifikasi"
  | "dalam_antrian_prioritas"
  | "dalam_proses"
  | "selesai"
  | "tidak_dapat_ditindaklanjuti";

export const STATUS_PENANGANAN: StatusPenanganan[] = [
  "menunggu_verifikasi",
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

export interface DashboardWilayahKlaster {
  klaster_id: string;
  sekolah_nama: string;
  skor_prioritas: number;
}

export interface SekolahIsuTerbanyak {
  npsn: string;
  nama: string;
  jumlah_isu: number;
}

/**
 * `GET /dashboard/wilayah` — bentuk mengikuti INTERFACES.md §3 (sudah
 * disinkronkan di F4.5) dan implementasi backend `routers/dashboard.py`.
 * PERHATIAN: versi lama tipe ini memakai `klaster_aktif` +
 * `sekolah_dengan_isu_terbanyak` + item `DashboardPrioritasItem[]` yang
 * tidak pernah dikirim backend (lihat CHANGELOG F4.1 "Deviasi Kontrak").
 */
export interface DashboardWilayah {
  jumlah_sekolah: number;
  jumlah_klaster_aktif: number;
  klaster_prioritas: DashboardWilayahKlaster[];
  sekolah_isu_terbanyak: SekolahIsuTerbanyak[];
}

/**
 * `GET /audit/log` (INTERFACES.md §9).
 *
 * Deviasi kontrak: dokumen menetapkan `actor_role`, backend mengirim
 * `actor_user_id` (ID, bukan nama peran). Keduanya opsional di sini supaya
 * FE tetap bisa merender apa pun yang dikirim server; `target` menggantikan
 * `objek_tipe`/`objek_id` dan `timestamp` menggantikan `created_at`.
 */
export interface AuditLogEntry {
  audit_id: string;
  aksi: string;
  /** Deviasi: backend mengirim ID aktór, kontrak menyebut `actor_role`. */
  actor_user_id?: string | null;
  actor_role?: string | null;
  target: string | null;
  timestamp: string | null;
}

export interface AiStatus {
  unclustered_laporan: number;
  total_klaster: number;
  last_run: string;
  /** F4.10 — status run terakhir pipeline (`sukses` / `gagal` / null bila belum pernah). */
  last_run_status?: string | null;
  message: string;
}
// ── F4.8 (D-22) — Skor dampak KBM per sekolah ───────────────────────────────

export type LevelKbm = "kritis" | "tinggi" | "sedang" | "rendah";

export interface DistribusiKondisi {
  baik: number;
  rusak_ringan: number;
  rusak_sedang: number;
  rusak_berat: number;
}

export interface JenisRuangRusak {
  nama_ruang: string;
  rusak_berat: number;
  jumlah: number;
}

export interface SkorKbmRingkasan {
  rata_rata_skor: number;
  sekolah_kritis: number;
  jumlah_mismatch: number;
  prior: number;
  k: number;
  total_laporan: number;
  ruang_rusak_berat: number;
  distribusi_kondisi: DistribusiKondisi;
  dampak_per_jenis_ruang: JenisRuangRusak[];
}

export interface SkorKbmSekolah {
  npsn: string;
  nama: string;
  skor_kbm: number;
  level: LevelKbm;
  skor_laporan: number;
  skor_dapodik: number;
  jumlah_laporan: number;
  laporan_rusak_berat: number;
  mismatch: boolean;
}

export interface SkorKbmData {
  ringkasan: SkorKbmRingkasan;
  sekolah: SkorKbmSekolah[];
}
