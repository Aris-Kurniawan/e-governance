import { Check } from "lucide-react"

/**
 * F3.1 — "Institutional Stepper: 4 Stages" (UI_COMPONENTS.md §5).
 *
 * Stepper tahapan status tindak lanjut isu (FLOWS.md node Q / PAGE_STATES.md §A5):
 * Meninjau → Antrian Prioritas → Dalam Proses → Selesai.
 *
 * Dipakai halaman status tindak lanjut publik; `tahapAktif` diturunkan dari
 * `status_terkini` pada `GET /klaster/{id}/riwayat` (lihat `pages/warga/
 * StatusTindakLanjutWarga.tsx`). Untuk status terminal negatif
 * (`tidak_terverifikasi` / `tidak_dapat_ditindaklanjuti`) stepper TIDAK
 * dipakai — halaman menampilkan badge + alasan (PAGE_STATES §A5).
 */

export const TAHAP_STEPPER = [
  { label: "Meninjau", desc: "Verifikasi Dinas" },
  { label: "Antrian Prioritas", desc: "Rencana Penanganan" },
  { label: "Dalam Proses", desc: "Pekerjaan Lapangan" },
  { label: "Selesai", desc: "Tuntas Ditangani" },
] as const

/** Pemetaan status backend → nomor tahap (1–4). Null = jalur negatif/absen. */
export function tahapDariStatus(status: string | null): number | null {
  switch (status) {
    case "menunggu_verifikasi":
      return 1
    case "terverifikasi":
    case "dalam_antrian_prioritas":
      return 2
    case "dalam_proses":
      return 3
    case "selesai":
      return 4
    default:
      return null
  }
}

interface InstitutionalStepperProps {
  /** 0 = belum ada tahap tercapai; 1–4 = tahap aktif; 4 = seluruh tahap penuh. */
  tahapAktif: number
  className?: string
}

export default function InstitutionalStepper({ tahapAktif, className = "" }: InstitutionalStepperProps) {
  return (
    <ol className={`flex items-start w-full ${className}`} aria-label="Tahapan tindak lanjut">
      {TAHAP_STEPPER.map((tahap, i) => {
        const nomor = i + 1
        const sudahLewat = nomor < tahapAktif
        const penuh = tahapAktif >= TAHAP_STEPPER.length
        const aktif = nomor === tahapAktif && !penuh
        const tercapai = sudahLewat || penuh

        const lingkaran = penuh || sudahLewat
          ? "bg-primary text-white border-primary"
          : aktif
            ? "bg-white text-primary border-primary ring-4 ring-primary-light"
            : "bg-surface-alt text-ink-tertiary border-border"

        return (
          <li key={tahap.label} className="flex-1 min-w-0 flex flex-col items-center text-center relative">
            {/* Penghubung ke tahap berikutnya */}
            {i < TAHAP_STEPPER.length - 1 && (
              <span
                aria-hidden
                className={`hidden sm:block absolute top-4 left-[calc(50%+18px)] right-[calc(-50%+18px)] h-0.5 ${
                  tercapai ? "bg-primary" : "bg-border"
                }`}
              />
            )}

            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-extrabold ${lingkaran}`}
            >
              {tercapai ? <Check className="h-4 w-4" strokeWidth={3} /> : nomor}
            </span>

            <span
              className={`mt-2 text-[11px] font-bold leading-tight ${
                tercapai ? "text-primary" : aktif ? "text-primary" : "text-ink-tertiary"
              }`}
            >
              {tahap.label}
            </span>
            <span className="mt-0.5 text-[10px] text-ink-tertiary leading-tight">{tahap.desc}</span>
          </li>
        )
      })}
    </ol>
  )
}
