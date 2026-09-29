import type { StatusTindakLanjut } from "@/lib/api/types"

// Kunci semua 6 status di PAGE_STATES.md §A5 (append-only riwayat).
// kls-status-* = entri khusus untuk menguji tiap status lewat /klaster/{id}/status.
export const statusContoh: Record<string, StatusTindakLanjut> = {
  "kls-status-menunggu": {
    status_terkini: "menunggu_verifikasi",
    riwayat: [{ status: "menunggu_verifikasi", alasan: null, timestamp: "2026-02-01T09:00:00+07:00" }],
  },
  "kls-status-tidakverif": {
    status_terkini: "tidak_terverifikasi",
    riwayat: [
      { status: "menunggu_verifikasi", alasan: null, timestamp: "2026-02-01T09:00:00+07:00" },
      { status: "tidak_terverifikasi", alasan: "Laporan duplikat dengan klaster kls-003.", timestamp: "2026-02-03T10:30:00+07:00" },
    ],
  },
  "kls-status-antrian": {
    status_terkini: "dalam_antrian_prioritas",
    riwayat: [
      { status: "menunggu_verifikasi", alasan: null, timestamp: "2026-02-01T09:00:00+07:00" },
      { status: "terverifikasi", alasan: null, timestamp: "2026-02-03T09:15:00+07:00" },
      { status: "dalam_antrian_prioritas", alasan: null, timestamp: "2026-02-04T13:00:00+07:00" },
    ],
  },
  "kls-status-proses": {
    status_terkini: "dalam_proses",
    riwayat: [
      { status: "terverifikasi", alasan: null, timestamp: "2026-02-03T09:15:00+07:00" },
      { status: "dalam_antrian_prioritas", alasan: null, timestamp: "2026-02-04T13:00:00+07:00" },
      { status: "dalam_proses", alasan: null, timestamp: "2026-02-05T08:00:00+07:00" },
    ],
  },
  "kls-status-selesai": {
    status_terkini: "selesai",
    riwayat: [
      { status: "dalam_antrian_prioritas", alasan: null, timestamp: "2026-01-20T10:00:00+07:00" },
      { status: "dalam_proses", alasan: null, timestamp: "2026-01-25T08:30:00+07:00" },
      { status: "selesai", alasan: null, timestamp: "2026-02-10T16:45:00+07:00" },
    ],
  },
  "kls-status-tidaklanjut": {
    status_terkini: "tidak_dapat_ditindaklanjuti",
    riwayat: [
      { status: "dalam_proses", alasan: null, timestamp: "2026-02-05T08:00:00+07:00" },
      { status: "tidak_dapat_ditindaklanjuti", alasan: "Lahan terdampak belum jelas status kepemilikannya.", timestamp: "2026-02-20T14:00:00+07:00" },
    ],
  },
}

// Mock default untuk klaster riil (kls-001 s/d kls-004).
export const statusKlasterRiil: Record<string, StatusTindakLanjut> = {
  "kls-001": statusContoh["kls-status-proses"],
  "kls-002": statusContoh["kls-status-menunggu"],
  "kls-003": statusContoh["kls-status-antrian"],
  "kls-004": statusContoh["kls-status-tidakverif"],
}