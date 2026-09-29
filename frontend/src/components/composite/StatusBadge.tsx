import type { StatusPenanganan, StatusKlaster } from "@/lib/api/types"

interface StatusBadgeProps {
  status: StatusKlaster | StatusPenanganan | "menunggu_verifikasi" | "tidak_terverifikasi"
  className?: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  terverifikasi: { label: "Terverifikasi", className: "bg-primary-light text-primary" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", className: "bg-surface-alt text-ink-secondary" },
  tidak_terverifikasi: { label: "Tidak Terverifikasi", className: "bg-danger-light text-danger-text" },
  dalam_antrian_prioritas: { label: "Antrian Prioritas", className: "bg-warning-light text-warning-text" },
  dalam_proses: { label: "Dalam Proses", className: "bg-primary-light text-primary" },
  selesai: { label: "Selesai", className: "bg-primary-light text-primary" },
  tidak_dapat_ditindaklanjuti: { label: "Tidak Dapat Ditindaklanjuti", className: "bg-danger-light text-danger-text" },
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-surface-alt text-ink-secondary" }
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${config.className} ${className}`}>
      {config.label}
    </span>
  )
}