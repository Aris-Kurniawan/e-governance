import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Compass,
  Camera,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Building2,
  ThumbsUp,
  MapPin,
  HelpCircle,
} from "@/components/ui/iconify-icons"

interface OnboardingGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface StepItem {
  number: number
  badge: string
  title: string
  tagline: string
  description: string
  icon: typeof Compass
  iconColor: string
  iconBg: string
  highlightList: { icon: typeof ShieldCheck; text: string }[]
  ctaPrimary?: { label: string; to: string }
  ctaSecondary?: { label: string; to: string }
}

const STEPS: StepItem[] = [
  {
    number: 1,
    badge: "Langkah 1 dari 4 · Transparansi Wilayah",
    title: "Pantau Kondisi Sarpras 62 Sekolah",
    tagline: "Akses data fasilitas sekolah terbuka untuk seluruh warga Lamongan.",
    description:
      "SIMAKIS menyajikan kondisi fisik ruang kelas, toilet, laboratorium, dan perpustakaan sekolah secara transparan. Anda dapat melihat peta sebaran dan indeks integritas sarpras di wilayah Anda.",
    icon: Building2,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50 border-blue-200/80",
    highlightList: [
      { icon: MapPin, text: "Jelajahi peta interaktif 62 sekolah Kecamatan Lamongan" },
      { icon: ShieldCheck, text: "Data resmi tervalidasi basis Dapodik & fakta lapangan" },
    ],
    ctaSecondary: { label: "Buka Peta Wilayah", to: "/laporan/wilayah" },
  },
  {
    number: 2,
    badge: "Langkah 2 dari 4 · Aduan Partisipatif",
    title: "Laporkan Fasilitas Rusak dengan Aman",
    tagline: "Unggah foto kerusakan sarpras langsung dari ponsel atau komputer.",
    description:
      "Temukan atap bocor, toilet rusak, atau bangku patah? Ambil foto dan laporkan dalam hitungan menit. Privasi Anda terlindungi: NIK disanitasi secara otomatis sehingga aman dari intervensi.",
    icon: Camera,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50 border-blue-200/80",
    highlightList: [
      { icon: ShieldCheck, text: "Sanitasi privasi NIK otomatis (identitas warga terjamin aman)" },
      { icon: CheckCircle2, text: "Unggah hingga 5 foto bukti faktual kerusakan sarana" },
    ],
    ctaPrimary: { label: "Coba Buat Laporan", to: "/laporan/baru" },
  },
  {
    number: 3,
    badge: "Langkah 3 dari 4 · Partisipasi Suara Sah",
    title: "Dukung Usulan Prioritas Sekolah (Vote)",
    tagline: "Laporan yang serupa dikelompokkan secara cerdas oleh AI ke Klaster Isu.",
    description:
      "Berikan dukungan suara (vote) pada klaster isu sekolah anak atau lingkungan Anda. Setiap suara warga terverifikasi menambah skor prioritas perbaikan yang diajukan ke dinas.",
    icon: Users,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50 border-blue-200/80",
    highlightList: [
      { icon: ThumbsUp, text: "1 NIK terverifikasi = 1 suara sah per isu (Bebas manipulasi)" },
      { icon: CheckCircle2, text: "Akumulasi suara mempercepat penerbitan Surat Perintah Kerja (SPK)" },
    ],
    ctaSecondary: { label: "Lihat Klaster Isu", to: "/klaster" },
  },
  {
    number: 4,
    badge: "Langkah 4 dari 4 · Akuntabilitas Publik",
    title: "Pantau Realisasi Hingga Selesai Direnovasi",
    tagline: "Kawal proses penanganan oleh Dinas Pendidikan hingga tuntas.",
    description:
      "Setiap tindak lanjut audit fisik, verifikasi lapangan, hingga pengerjaan perbaikan dapat dipantau secara langsung. Tidak ada laporan yang mengendap tanpa kejelasan status.",
    icon: CheckCircle2,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50 border-blue-200/80",
    highlightList: [
      { icon: Compass, text: "Pelacakan transparan: Antrian Dinas, Audit Fisik, hingga Tuntas" },
      { icon: ShieldCheck, text: "Pembaruan otomatis ke catatan resmi sarpras sekolah" },
    ],
    ctaPrimary: { label: "Mulai Jelajahi SIMAKIS", to: "/" },
  },
]

export default function OnboardingGuideModal({
  open,
  onOpenChange,
}: OnboardingGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()

  // Reset ke langkah pertama setiap kali modal dibuka kembali
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
    }
  }, [open])

  // Navigasi keyboard (panah kiri/kanan)
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (currentStep < STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1)
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, currentStep])

  const completeOnboarding = () => {
    try {
      localStorage.setItem("simakis_warga_onboarding_completed", "true")
    } catch {
      // Abaikan jika storage dinonaktifkan browser
    }
    onOpenChange(false)
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      completeOnboarding()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleAction = (path: string) => {
    completeOnboarding()
    navigate(path)
  }

  const step = STEPS[currentStep]
  const IconComponent = step.icon
  const isLastStep = currentStep === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        completeOnboarding()
      } else {
        onOpenChange(val)
      }
    }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border border-slate-200/90 shadow-2xl rounded-3xl bg-white sm:max-w-[540px]">
        {/* Header Dekoratif dengan Progress Bar Segmen */}
        <div className="bg-gradient-to-b from-slate-50 to-white px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/70 px-3 py-1 text-[11px] font-bold text-[#0B3052]">
              <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              <span>Panduan Pengguna Baru</span>
            </div>
            <button
              type="button"
              onClick={completeOnboarding}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer select-none"
            >
              Lewati Panduan
            </button>
          </div>

          {/* Segmented Progress Indicators */}
          <div className="grid grid-cols-4 gap-1.5">
            {STEPS.map((s, idx) => {
              const isActive = idx === currentStep
              const isPast = idx < currentStep
              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-[#0B3052] w-full"
                      : isPast
                        ? "bg-blue-300 w-full"
                        : "bg-slate-200 hover:bg-slate-300 w-full"
                  }`}
                  aria-label={`Lompat ke langkah ${idx + 1}`}
                />
              )
            })}
          </div>
        </div>

        {/* Isi Panduan Langkah */}
        <div className="px-6 py-5 sm:py-6 space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-transform duration-300 ${step.iconBg} ${step.iconColor}`}
            >
              <IconComponent className="h-7 w-7" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-700">
                {step.badge}
              </span>
              <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {step.title}
              </DialogTitle>
              <p className="text-xs font-medium text-slate-500">
                {step.tagline}
              </p>
            </div>
          </div>

          <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
            {step.description}
          </DialogDescription>

          {/* Kotak Poin Penting / Keunggulan */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-3.5 space-y-2">
            {step.highlightList.map((item, i) => {
              const HIcon = item.icon
              return (
                <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                  <div className="h-5 w-5 rounded-md bg-white border border-slate-200/80 flex items-center justify-center shrink-0 text-blue-600">
                    <HIcon className="h-3 w-3" />
                  </div>
                  <span>{item.text}</span>
                </div>
              )
            })}
          </div>

          {/* Opsi CTA Langsung (Shortcut Opsional) */}
          {step.ctaPrimary && isLastStep && (
            <div className="pt-1">
              <Button
                type="button"
                onClick={() => handleAction(step.ctaPrimary!.to)}
                className="w-full bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold h-10 rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{step.ctaPrimary.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer Navigasi Antar Langkah */}
        <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`text-xs font-semibold rounded-xl h-9 px-3 ${
              currentStep === 0 ? "opacity-0 pointer-events-none" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Sebelumnya
          </Button>

          <div className="flex items-center gap-2">
            {!isLastStep ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-[#0B3052] hover:bg-[#07213A] text-white font-semibold text-xs sm:text-sm rounded-xl h-9 px-4 sm:px-5 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Lanjut</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={completeOnboarding}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl h-9 px-4 sm:px-5 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Selesai</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
