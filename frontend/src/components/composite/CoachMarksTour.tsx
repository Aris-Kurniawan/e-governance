import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  School,
  PlusCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CoachMarkStep {
  id: string
  targetSelector: string
  fallbackSelector?: string
  badge: string
  title: string
  description: string
  highlights?: string[]
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
  route?: string
}

const DEFAULT_STEPS: CoachMarkStep[] = [
  {
    id: "step-wilayah",
    targetSelector: '[data-coachmark="nav-wilayah"]',
    fallbackSelector: '[data-coachmark="hero-peta-btn"]',
    badge: "Fitur 1 dari 5 · Spasial & Transparansi",
    title: "Dashboard Wilayah & Peta Sebaran",
    description:
      "Pantau sebaran kondisi 62 sekolah di Kecamatan Lamongan secara interaktif. Anda dapat melihat indeks integritas sarpras, tingkat kerusakan fasilitas, dan peringkat prioritas perbaikan.",
    highlights: [
      "Peta interaktif sebaran sekolah se-Kecamatan Lamongan",
      "Skor integritas sarpras per sekolah dari audit dan laporan",
      "Filter prioritas darurat, waspada, hingga normal",
    ],
    icon: MapPin,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50 border-blue-200/80",
    route: "/laporan/wilayah",
  },
  {
    id: "step-klaster",
    targetSelector: '[data-coachmark="nav-klaster"]',
    badge: "Fitur 2 dari 5 · Otomatisasi AI",
    title: "Analisis Klaster Isu Berbasis AI",
    description:
      "SIMAKIS mengelompokkan laporan warga secara otomatis menggunakan kecerdasan buatan (Machine Learning). Sistem mendeteksi pola masalah fasilitas fisik yang serupa di lapangan.",
    highlights: [
      "Pengelompokan otomatis topik masalah (atap bocor, sanitasi, lab)",
      "Peringkat urgensi penanganan per klaster masalah",
      "Transparansi data tanpa bias laporan tunggal",
    ],
    icon: Layers,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50 border-indigo-200/80",
    route: "/klaster",
  },
  {
    id: "step-sekolah",
    targetSelector: '[data-coachmark="nav-sekolah"]',
    badge: "Fitur 3 dari 5 · Database Sekolah",
    title: "Direktori & Detail Fasilitas Sekolah",
    description:
      "Cari profil spesifik sekolah untuk memeriksa kondisi sarpras resmi Dapodik, status ruang kelas rusak, fasilitas sanitasi, dan riwayat laporan dari warga sekitar.",
    highlights: [
      "Pencarian cepat 62 sekolah jenjang SD/SMP Lamongan",
      "Detail perbandingan data Dapodik vs fakta laporan warga",
      "Katalog foto audit kondisi fisik sekolah terkini",
    ],
    icon: School,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border-emerald-200/80",
    route: "/sekolah",
  },
  {
    id: "step-lapor",
    targetSelector: '[data-coachmark="action-laporan"]',
    fallbackSelector: '[data-coachmark="hero-lapor-btn"]',
    badge: "Fitur 4 dari 5 · Partisipasi Warga",
    title: "Kirim Laporan Kerusakan Fasilitas",
    description:
      "Temukan fasilitas sekolah yang rusak atau membahayakan siswa? Laporkan langsung dengan mengunggah foto bukti, memilih kategori, dan menentukan titik koordinat sekolah.",
    highlights: [
      "Unggah bukti foto kerusakan langsung dari perangkat",
      "Privasi aman dengan enkripsi data identitas warga",
      "Laporan diteruskan langsung ke antrean verifikasi dinas",
    ],
    icon: PlusCircle,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50 border-amber-200/80",
    route: "/laporan/baru",
  },
  {
    id: "step-riwayat",
    targetSelector: '[data-coachmark="nav-riwayat"]',
    fallbackSelector: '[data-coachmark="user-menu"]',
    badge: "Fitur 5 dari 5 · Kawal & Dukung",
    title: "Riwayat Laporan & Dukungan Suara",
    description:
      "Pantau perkembangan tindak lanjut laporan yang Anda ajukan, serta berikan dukungan suara (vote) pada laporan warga lain untuk menaikkan prioritas penanganannya.",
    highlights: [
      "Status real-time: Terkirim → Terverifikasi → Ditindaklanjuti",
      "Dukung laporan darurat di lingkungan Anda lewat fitur upvote",
      "Transparansi catatan perbaikan dari Dinas Pendidikan",
    ],
    icon: CheckCircle2,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50 border-sky-200/80",
    route: "/laporan/riwayat",
  },
]

const STORAGE_KEY = "simakis_warga_coachmarks_completed"

interface CoachMarksTourProps {
  steps?: CoachMarkStep[]
}

export default function CoachMarksTour({ steps = DEFAULT_STEPS }: CoachMarksTourProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const [targetFound, setTargetFound] = useState(false)

  const navigate = useNavigate()
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Otomatis buka untuk pengguna baru setelah delay awal
  useEffect(() => {
    const isCompleted = localStorage.getItem(STORAGE_KEY)
    if (!isCompleted) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Listener event global agar bisa dipicu dari tombol Panduan kapan saja
  useEffect(() => {
    const handleOpen = () => {
      setCurrentIndex(0)
      setIsOpen(true)
    }
    window.addEventListener("open-simakis-coachmarks", handleOpen)
    return () => window.removeEventListener("open-simakis-coachmarks", handleOpen)
  }, [])

  const currentStep = useMemo(() => steps[currentIndex] || steps[0], [steps, currentIndex])

  // Cari posisi elemen target di viewport
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return

    let element: HTMLElement | null = document.querySelector(currentStep.targetSelector)

    // Jika tidak ditemukan atau tidak terlihat (misal di mobile navbar disembunyikan), coba fallback
    if ((!element || element.offsetParent === null) && currentStep.fallbackSelector) {
      element = document.querySelector(currentStep.fallbackSelector)
    }

    // Jika masih tidak ditemukan atau tidak terlihat, coba mobile hamburger
    if (!element || element.offsetParent === null) {
      const mobileNav = document.querySelector('[data-coachmark="mobile-menu-btn"]') as HTMLElement | null
      if (mobileNav && mobileNav.offsetParent !== null) {
        element = mobileNav
      }
    }

    if (element && element.offsetParent !== null) {
      const rect = element.getBoundingClientRect()
      // Pastikan ada ukuran nyata
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
        setTargetFound(true)
        return
      }
    }

    // Fallback jika tidak ada elemen target yang dapat dijangkau
    setTargetRect(null)
    setTargetFound(false)
  }, [isOpen, currentStep])

  // Scroll target ke pandangan pengguna bila perlu
  useEffect(() => {
    if (!isOpen || !currentStep) return

    let element: HTMLElement | null = document.querySelector(currentStep.targetSelector)
    if ((!element || element.offsetParent === null) && currentStep.fallbackSelector) {
      element = document.querySelector(currentStep.fallbackSelector)
    }

    if (element && element.offsetParent !== null) {
      const rect = element.getBoundingClientRect()
      // Scroll hanya jika elemen berada di luar viewport vertikal
      if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }

    // Perbarui posisi setelah sedikit jeda scroll
    const timer = setTimeout(updateTargetPosition, 150)
    return () => clearTimeout(timer)
  }, [isOpen, currentIndex, currentStep, updateTargetPosition])

  // Update posisi saat resize / scroll
  useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => {
      window.requestAnimationFrame(updateTargetPosition)
    }

    window.addEventListener("resize", handleScrollOrResize)
    window.addEventListener("scroll", handleScrollOrResize, true)

    updateTargetPosition()

    return () => {
      window.removeEventListener("resize", handleScrollOrResize)
      window.removeEventListener("scroll", handleScrollOrResize, true)
    }
  }, [isOpen, updateTargetPosition])

  // Navigasi keyboard (Escape = tutup, Panah Kanan = lanjut, Panah Kiri = kembali)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentIndex])

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }

  const handleComplete = () => {
    setIsOpen(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }

  if (!isOpen) return null

  // Parameter spotlight dengan padding
  const padding = 8
  const spotlightX = targetRect ? Math.max(0, targetRect.left - padding) : 0
  const spotlightY = targetRect ? Math.max(0, targetRect.top - padding) : 0
  const spotlightW = targetRect ? targetRect.width + padding * 2 : 0
  const spotlightH = targetRect ? targetRect.height + padding * 2 : 0

  // Hitung posisi Tooltip Card secara responsif
  const tooltipWidth = typeof window !== "undefined" ? Math.min(420, window.innerWidth - 32) : 380
  const isTargetNearTop = targetRect ? targetRect.top < 220 : false

  let tooltipTop = 0
  let tooltipLeft = 0
  let arrowOffsetLeft = "50%"

  if (targetRect && targetFound) {
    // Letakkan di bawah target jika target di atas, atau di atas target jika di bawah
    if (isTargetNearTop) {
      tooltipTop = targetRect.top + targetRect.height + padding + 14
    } else {
      tooltipTop = targetRect.top - padding - 340 // perkiraan tinggi kartu
    }

    // Posisikan horizontal terpusat terhadap target
    const targetCenterX = targetRect.left + targetRect.width / 2
    let desiredLeft = targetCenterX - tooltipWidth / 2

    // Batasi agar tidak terpotong tepi layar
    const minLeft = 16
    const maxLeft = window.innerWidth - tooltipWidth - 16
    desiredLeft = Math.max(minLeft, Math.min(maxLeft, desiredLeft))

    tooltipLeft = desiredLeft
    arrowOffsetLeft = `${Math.max(20, Math.min(tooltipWidth - 20, targetCenterX - desiredLeft))}px`
  } else {
    // Tampilan di tengah layar jika target tidak ditemukan
    tooltipTop = typeof window !== "undefined" ? Math.max(80, window.innerHeight / 2 - 180) : 100
    tooltipLeft = typeof window !== "undefined" ? Math.max(16, (window.innerWidth - tooltipWidth) / 2) : 20
  }

  const IconComponent = currentStep.icon || HelpCircle
  const progressPercent = ((currentIndex + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden select-none">
      {/* ── 1. SVG Cutout Mask (Spotlight Efek) ── */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        onClick={handleNext}
        style={{ cursor: "pointer" }}
      >
        <title>Klik di mana saja untuk lanjut ke fitur berikutnya</title>
        <defs>
          <mask id="simakis-coachmarks-mask">
            {/* Area putih = tetap gelap */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Area hitam = tembus pandang (spotlight target) */}
            {targetRect && targetFound && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx="14"
                ry="14"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>

        {/* Dimmed Backdrop Navy Brand */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(11, 48, 82, 0.72)"
          mask="url(#simakis-coachmarks-mask)"
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* ── 2. Pulsing Glow Ring di sekeliling Target ── */}
      {targetRect && targetFound && (
        <div
          style={{
            top: spotlightY,
            left: spotlightX,
            width: spotlightW,
            height: spotlightH,
          }}
          className="fixed pointer-events-none z-[9991] rounded-2xl ring-4 ring-blue-400/90 shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 ease-out animate-pulse"
        />
      )}

      {/* ── 3. Tooltip Card Berpemandu ── */}
      <div
        ref={tooltipRef}
        style={{
          top: `${Math.max(16, Math.min(window.innerHeight - 380, tooltipTop))}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
        }}
        className="fixed z-[9995] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-300 ease-out animate-in fade-in zoom-in-95 pointer-events-auto"
      >
        {/* Progress Bar di sisi atas */}
        <div className="h-1.5 w-full bg-slate-100 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Panah Indikator menunjuk ke target */}
        {targetRect && targetFound && (
          <div
            style={{ left: arrowOffsetLeft }}
            className={`absolute w-3.5 h-3.5 bg-white border-slate-200/90 transform -translate-x-1/2 rotate-45 z-10 ${
              isTargetNearTop
                ? "-top-2 border-t border-l"
                : "-bottom-2 border-b border-r"
            }`}
          />
        )}

        {/* Content Card Body */}
        <div className="p-4 sm:p-5">
          {/* Header Step: Badge & Tutup Button */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-blue-800 bg-blue-50/90 border border-blue-200/80 px-2.5 py-1 rounded-full">
              <Sparkles className="h-3 w-3 text-blue-600" />
              {currentStep.badge}
            </span>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup petunjuk tur"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Lewati dan tutup petunjuk (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Judul & Ikon Fitur */}
          <div className="flex items-start gap-3 mb-2.5">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${currentStep.iconBg}`}
            >
              <IconComponent className={`h-5 w-5 ${currentStep.iconColor}`} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-1">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Poin-Poin Manfaat Fitur */}
          {currentStep.highlights && currentStep.highlights.length > 0 && (
            <div className="mt-3.5 bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col gap-1.5">
              {currentStep.highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick link jika ada */}
          {currentStep.route && (
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span className="italic">Jalur Cepat:</span>
              <button
                type="button"
                onClick={() => {
                  handleComplete()
                  navigate(currentStep.route!)
                }}
                className="text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Buka Halaman Ini</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigasi Tur */}
        <div className="px-4 py-3 sm:px-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Sisi Kiri: Lewati & Step Dots */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer mr-1"
            >
              Lewati Tur
            </button>

            {/* Dots Navigasi */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Ke langkah ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                    idx === currentIndex
                      ? "w-5 bg-blue-600"
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Sisi Kanan: Tombol Sebelumnya & Lanjut */}
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                Kembali
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-8 px-3.5 text-xs font-semibold bg-[#0B3052] hover:bg-[#07213A] text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1 transition-all"
            >
              <span>{currentIndex === steps.length - 1 ? "Selesai & Jelajahi" : "Lanjut"}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
