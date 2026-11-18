import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  MotionValue,
} from "framer-motion"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import {
  Sparkles,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react"

// 62 Sekolah resmi Dapodik di Kecamatan Lamongan (Data Riil Kabupaten Lamongan)
interface SchoolChipItem {
  id: string
  name: string
  npsn: string
  jenjang: "SD" | "SMP" | "SMA" | "SMK"
}

const SCHOOLS_62: SchoolChipItem[] = [
  { id: "s-1", name: "SDN 1 Made", npsn: "20505816", jenjang: "SD" },
  { id: "s-2", name: "SDN 3 Made", npsn: "20505818", jenjang: "SD" },
  { id: "s-3", name: "SDN 4 Made", npsn: "20505819", jenjang: "SD" },
  { id: "s-4", name: "SDN 1 Kramat", npsn: "20505916", jenjang: "SD" },
  { id: "s-5", name: "SDN 2 Kramat", npsn: "20505917", jenjang: "SD" },
  { id: "s-6", name: "SDN Plosowahyu", npsn: "20505923", jenjang: "SD" },
  { id: "s-7", name: "SDN 1 Rancangkencono", npsn: "20505970", jenjang: "SD" },
  { id: "s-8", name: "SDN 2 Rancangkencono", npsn: "20505971", jenjang: "SD" },
  { id: "s-9", name: "SDN Pangkatrejo", npsn: "20506016", jenjang: "SD" },
  { id: "s-10", name: "SDN Banjarmendalan", npsn: "20506097", jenjang: "SD" },
  { id: "s-11", name: "SDN Karanglangit", npsn: "20506145", jenjang: "SD" },
  { id: "s-12", name: "SDN Kebet", npsn: "20506174", jenjang: "SD" },
  { id: "s-13", name: "SDN 4 Jetis", npsn: "20506218", jenjang: "SD" },
  { id: "s-14", name: "SDN Kepatihan", npsn: "20506220", jenjang: "SD" },
  { id: "s-15", name: "SDN Sukorejo", npsn: "20506479", jenjang: "SD" },
  { id: "s-16", name: "SDN 1 Sukomulyo", npsn: "20506498", jenjang: "SD" },
  { id: "s-17", name: "SDN 2 Sukomulyo", npsn: "20506499", jenjang: "SD" },
  { id: "s-18", name: "SDN 1 Sendangrejo", npsn: "20506506", jenjang: "SD" },
  { id: "s-19", name: "SDN 2 Sendangrejo", npsn: "20506507", jenjang: "SD" },
  { id: "s-20", name: "SDN Sidomukti", npsn: "20506543", jenjang: "SD" },
  { id: "s-21", name: "SDN 1 Sidoharjo", npsn: "20506544", jenjang: "SD" },
  { id: "s-22", name: "SDN 2 Sidoharjo", npsn: "20506545", jenjang: "SD" },
  { id: "s-23", name: "SDN 1 Tumenggungan", npsn: "20506558", jenjang: "SD" },
  { id: "s-24", name: "SDN 2 Tumenggungan", npsn: "20506559", jenjang: "SD" },
  { id: "s-25", name: "SDN Tlogoanyar", npsn: "20506575", jenjang: "SD" },
  { id: "s-26", name: "SDN 3 Jetis", npsn: "20506583", jenjang: "SD" },
  { id: "s-27", name: "SDN Wajik", npsn: "20506584", jenjang: "SD" },
  { id: "s-28", name: "SDN Sumberjo", npsn: "20506628", jenjang: "SD" },
  { id: "s-29", name: "SDN Tanjung", npsn: "20506659", jenjang: "SD" },
  { id: "s-30", name: "SD Muhammadiyah 1", npsn: "20507211", jenjang: "SD" },
  { id: "s-31", name: "SD NU Banat Banin", npsn: "20507213", jenjang: "SD" },
  { id: "s-32", name: "SD Kemala Bhayangkari 5", npsn: "20507220", jenjang: "SD" },
  { id: "s-33", name: "SD Islam Plus Al-Mudhofar", npsn: "20507221", jenjang: "SD" },
  { id: "s-34", name: "SDIT Cendekia Lamongan", npsn: "69830411", jenjang: "SD" },
  { id: "s-35", name: "SD Alam Citra Insani", npsn: "70002205", jenjang: "SD" },
  { id: "s-36", name: "SD Jazeerah Islamic", npsn: "70062428", jenjang: "SD" },
  { id: "s-37", name: "SD Islam Zawiyah Al-Azhar", npsn: "70063774", jenjang: "SD" },
  { id: "s-38", name: "SMPN 1 Lamongan", npsn: "20506349", jenjang: "SMP" },
  { id: "s-39", name: "SMPN 2 Lamongan", npsn: "20506385", jenjang: "SMP" },
  { id: "s-40", name: "SMPN 3 Lamongan", npsn: "20506380", jenjang: "SMP" },
  { id: "s-41", name: "SMPN 4 Lamongan", npsn: "20506382", jenjang: "SMP" },
  { id: "s-42", name: "SMPN 5 Lamongan", npsn: "20506396", jenjang: "SMP" },
  { id: "s-43", name: "SMP Muhammadiyah 2", npsn: "20506406", jenjang: "SMP" },
  { id: "s-44", name: "SMP Sunan Giri 1", npsn: "20506433", jenjang: "SMP" },
  { id: "s-45", name: "SMP Murni Sunan Drajat", npsn: "20506443", jenjang: "SMP" },
  { id: "s-46", name: "SMP Islam Tanfirul Ghoyyi", npsn: "20549009", jenjang: "SMP" },
  { id: "s-47", name: "SMP Thoriqul Ulum", npsn: "69759218", jenjang: "SMP" },
  { id: "s-48", name: "SMP Alam Citra Insani", npsn: "70010840", jenjang: "SMP" },
  { id: "s-49", name: "SMP Aplikatif Sunan Drajat", npsn: "70040020", jenjang: "SMP" },
  { id: "s-50", name: "SMAN 1 Lamongan", npsn: "20506327", jenjang: "SMA" },
  { id: "s-51", name: "SMAN 2 Lamongan", npsn: "20506254", jenjang: "SMA" },
  { id: "s-52", name: "SMAN 3 Lamongan", npsn: "20549024", jenjang: "SMA" },
  { id: "s-53", name: "SMA Panca Marga 1", npsn: "20506336", jenjang: "SMA" },
  { id: "s-54", name: "SMAS Muhammadiyah 4", npsn: "20549023", jenjang: "SMA" },
  { id: "s-55", name: "SMKN 1 Lamongan", npsn: "20506249", jenjang: "SMK" },
  { id: "s-56", name: "SMKN 2 Lamongan", npsn: "20554338", jenjang: "SMK" },
  { id: "s-57", name: "SMK NU Lamongan", npsn: "20506244", jenjang: "SMK" },
  { id: "s-58", name: "SMK Muhammadiyah 4", npsn: "20506241", jenjang: "SMK" },
  { id: "s-59", name: "SMKS PGRI 1 Lamongan", npsn: "20506286", jenjang: "SMK" },
  { id: "s-60", name: "SMKS Muhammadiyah 1", npsn: "20549027", jenjang: "SMK" },
  { id: "s-61", name: "SMK Thoriqul Ulum", npsn: "20570616", jenjang: "SMK" },
  { id: "s-62", name: "SMK Islam Tanfirul Ghoyyi", npsn: "70003836", jenjang: "SMK" },
]

// 3 Langkah Alur Kerja Partisipatif
const STEPS_DATA = [
  {
    stepNumber: "01",
    title: "Foto & Kirim Aduan",
    desc: "Sertakan foto kerusakan fasilitas dari HP Anda. Sistem secara otomatis mencocokkan metadata sensitif dan mengamankan data pelapor dalam brankas kriptografis.",
  },
  {
    stepNumber: "02",
    title: "Validasi AI & Konsensus Komunitas",
    desc: "Sistem mengelompokkan laporan serupa menjadi klaster isu dan membuka voting dukungan publik (1 NIK 1 Suara) untuk menentukan bobot urgensi pelaporan.",
  },
  {
    stepNumber: "03",
    title: "Dinas Menurunkan Anggaran Perbaikan",
    desc: "Dinas Pendidikan menerbitkan Surat Perintah Kerja (SPK). Warga dapat memantau serah terima material hingga proyek tuntas 100% secara transparan.",
  },
]

interface ConfiguredSchool extends SchoolChipItem {
  index: number
  startX: number
  startY: number
  startTilt: number
  targetTilt: number
}

// Chip sekolah: dioptimalkan untuk performa 60–120 FPS tanpa backdrop-blur & layout thrashing
function SchoolVortexPill({
  school,
  progress,
  ratio = 1.0,
}: {
  school: ConfiguredSchool
  progress: MotionValue<number>
  ratio?: number
}) {
  // Gerakan radial meluncur masuk ke pusat tengah (0, 0)
  const x = useTransform(progress, (p) => {
    const pull = Math.pow(p, 1.35)
    return school.startX * (1 - pull) * ratio
  })

  const y = useTransform(progress, (p) => {
    const pull = Math.pow(p, 1.35)
    return school.startY * (1 - pull) * ratio
  })

  // Rotasi banking dinamis 2D yang halus & natural
  const rotate = useTransform(progress, (p) => {
    const pull = Math.pow(p, 1.25)
    return school.startTilt * (1 - pull) + school.targetTilt * pull
  })

  // Efek kedalaman perspektif (scale)
  const scale = useTransform(progress, (p) => {
    return Math.max(0.12, 1 - Math.pow(p, 1.4) * 0.72)
  })

  // Opasitas: lenyap tuntas sebelum alur kerja mekar
  const opacity = useTransform(progress, (p) => {
    if (p < 0.08) return 1
    if (p > 0.52) return 0
    return Math.max(0, 1 - (p - 0.08) / 0.44)
  })

  return (
    <motion.div
      style={{
        x,
        y,
        scale,
        opacity,
        rotate,
      }}
      className="absolute will-change-transform"
    >
      {/* Warna solid #0c2238 menggantikan backdrop-blur agar GPU super ringan & mulus 60-120fps */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0c2238] px-2.5 py-1 shadow-md shadow-black/40 text-left hover:border-blue-400/50 transition-colors">
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${school.jenjang === "SD"
            ? "bg-blue-400 shadow-xs shadow-blue-400"
            : school.jenjang === "SMP"
              ? "bg-amber-400 shadow-xs shadow-amber-400"
              : "bg-emerald-400 shadow-xs shadow-emerald-400"
            }`}
        />
        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-100 whitespace-nowrap tracking-tight">
          {school.name}
        </span>
      </div>
    </motion.div>
  )
}

// Komponen Kartu Rekapitulasi Sekolah Modern Gelap dengan Background Logo SIMAKIS Transparan (Referensi OmniRoute)
function OmniRouteStyleSchoolCard({ progress }: { progress: MotionValue<number> }) {
  const [count, setCount] = useState(0)

  useMotionValueEvent(progress, "change", (latest) => {
    // Menghitung naik dari 0 ke 62 seiring scroll progress berjalan
    if (latest <= 0.22) {
      setCount(0)
    } else if (latest >= 0.70) {
      setCount(62)
    } else {
      const p = (latest - 0.22) / (0.70 - 0.22)
      setCount(Math.min(62, Math.max(0, Math.round(p * 62))))
    }
  })

  // Breakdown proporsional yang selalu sinkron dan jumlahnya tepat sama dengan count
  const sdCount = Math.min(37, Math.round((count * 37) / 62))
  const smpCount = Math.min(12, Math.round((count * 12) / 62))
  const smaCount = Math.min(5, Math.round((count * 5) / 62))
  const smkCount = Math.max(0, count - sdCount - smpCount - smaCount)

  return (
    <div className="w-full max-w-[420px] aspect-4/3 sm:aspect-square rounded-[36px] bg-[#071626]/35 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden relative flex flex-col justify-center items-center p-6 sm:p-8 select-none transition-all duration-300">

      {/* ── WATERMARK LOGO SIMAKIS TRANSPARAN DI LATAR BELAKANG (S Monokrom Geometris) ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <img
          src="/logo-simakis-watermark.png"
          alt="Watermark Logo SIMAKIS"
          className="w-[290px] sm:w-[330px] h-[290px] sm:h-[330px] object-contain opacity-[0.25] transform scale-110 -rotate-3 select-none"
          onError={(e) => {
            e.currentTarget.src = "/logo-simakis-transparent.png"
          }}
        />
        {/* Subtle ambient radial glow */}
        <div className="absolute inset-0 bg-radial from-blue-500/10 via-transparent to-transparent blur-2xl" />
      </div>

      {/* Main Center Content: Angka Raksasa 0 - 62 + Keterangan (Super Clean Minimalist) */}
      <div className="relative z-10 text-center space-y-2.5 py-2">
        {/* Angka Raksasa Modern */}
        <div className="inline-flex items-center justify-center gap-1 font-mono">
          <span className="text-6xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
            {count}
          </span>
          <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-teal-300 font-sans">
            {count >= 62 ? "+" : ""}
          </span>
        </div>

        {/* Teks Penjelas (Satu baris elegan seperti referensi) */}
        <p className="text-xs sm:text-sm text-slate-300/90 font-medium max-w-[280px] sm:max-w-[320px] mx-auto leading-relaxed">
          Seluruh sekolah negeri &amp; swasta, terverifikasi dalam satu data terintegrasi.
        </p>

        {/* Pills Jenjang di bawah teks (Gaya Persis Gambar 1) */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-[340px] mx-auto">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#0e2640] px-2.5 py-1 text-[10px] sm:text-[11px] font-mono text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span>{sdCount} SD</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#0e2640] px-2.5 py-1 text-[10px] sm:text-[11px] font-mono text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>{smpCount} SMP</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#0e2640] px-2.5 py-1 text-[10px] sm:text-[11px] font-mono text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{smaCount} SMA</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#0e2640] px-2.5 py-1 text-[10px] sm:text-[11px] font-mono text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span>{smkCount} SMK</span>
          </div>
        </div>
      </div>

    </div>
  )
}

// Komponen Pembungkus Langkah Pelaporan yang muncul bergantian saat di-scroll
function StaggeredStepItem({
  step,
  index,
  progress,
}: {
  step: { stepNumber: string; title: string; desc: string }
  index: number
  progress: MotionValue<number>
}) {
  // Rentang pergantian scroll tiap point:
  // Step 0 (01): 0.32 -> 0.48
  // Step 1 (02): 0.48 -> 0.65
  // Step 2 (03): 0.65 -> 0.82
  const start = 0.32 + index * 0.165
  const end = start + 0.14

  const opacity = useTransform(progress, [start, end], [0, 1])
  const y = useTransform(progress, [start, end], [30, 0])
  const scale = useTransform(progress, [start, end], [0.94, 1])

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="flex items-start gap-4 transition-all duration-300"
    >
      {/* Lingkaran Nomor Langkah */}
      <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full font-black text-sm flex items-center justify-center shrink-0 shadow-lg mt-0.5 bg-blue-600 text-white shadow-blue-600/40 ring-4 ring-blue-500/20">
        {step.stepNumber}
      </div>

      {/* Isi Langkah */}
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
          {step.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
          {step.desc}
        </p>
      </div>
    </motion.div>
  )
}

export default function ConvergingWorkflow() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleMulaiLapor = () => {
    if (isAuthenticated) {
      navigate("/laporan/baru")
    } else {
      navigate("/login?redirect=%2Flaporan%2Fbaru&action=report")
    }
  }

  // Pre-kalkulasi 62 sekolah di sekeliling teks tengah dengan zona bebas tabrakan (Exclusion Zone)
  const schoolNodes = useMemo<ConfiguredSchool[]>(() => {
    return SCHOOLS_62.map((school, index) => {
      let ringIndex = 0
      let ringTotal = 16
      // Radius yang sangat lapang di luar kotak judul tengah agar tidak menutupi teks sama sekali
      let radiusX = 490
      let radiusY = 240
      let angleOffset = 0.12

      if (index < 16) {
        ringIndex = index
        ringTotal = 16
        radiusX = 490
        radiusY = 245
        angleOffset = 0.12
      } else if (index < 38) {
        ringIndex = index - 16
        ringTotal = 22
        radiusX = 640
        radiusY = 320
        angleOffset = 0.38
      } else {
        ringIndex = index - 38
        ringTotal = 24
        radiusX = 790
        radiusY = 395
        angleOffset = 0.68
      }

      const angle = (ringIndex / ringTotal) * 2 * Math.PI + angleOffset
      const jitterX = Math.sin(index * 3.7) * 14
      const jitterY = Math.cos(index * 2.3) * 10

      let startX = Math.round(Math.cos(angle) * radiusX + jitterX)
      let startY = Math.round(Math.sin(angle) * radiusY + jitterY)

      // EXCLUSION ZONE: Pastikan tidak ada satupun chip yang masuk ke area kotak teks tengah
      // Area kotak teks tengah: lebar ~680px (|x| < 340), tinggi ~210px (|y| < 125)
      const minSafeX = 350
      const minSafeY = 135
      if (Math.abs(startX) < minSafeX && Math.abs(startY) < minSafeY) {
        const signX = startX >= 0 ? 1 : -1
        const signY = startY >= 0 ? 1 : -1
        // Dorong menjauh ke pinggir luar zona aman
        if (Math.abs(startX) / minSafeX < Math.abs(startY) / minSafeY) {
          startY = signY * (minSafeY + 15 + Math.abs(jitterY))
        } else {
          startX = signX * (minSafeX + 20 + Math.abs(jitterX))
        }
      }

      // Sudut kemiringan alami awal (-9° s/d +9°)
      const startTilt = Math.round(Math.sin(index * 1.7) * 9)

      // Target rotasi dinamis saat meluncur ke dalam:
      // Mengikuti arah kuadran pusaran (vortex banking spin yang hidup & memikat)
      const quadrantSign = Math.sign(Math.sin(angle)) * Math.sign(Math.cos(angle)) || 1
      const targetTilt = Math.round(quadrantSign * (18 + (index % 5) * 4))

      return {
        ...school,
        index,
        startX,
        startY,
        startTilt,
        targetTilt,
      }
    })
  }, [])

  // Cek rasio layar sekali di awal / saat resize (bukan 124x per scroll frame)
  const [screenRatio, setScreenRatio] = useState(1.0)
  useEffect(() => {
    const updateRatio = () => {
      setScreenRatio(typeof window !== "undefined" && window.innerWidth < 640 ? 0.45 : 1.0)
    }
    updateRatio()
    window.addEventListener("resize", updateRatio, { passive: true })
    return () => window.removeEventListener("resize", updateRatio)
  }, [])

  // Hook useScroll dari framer-motion untuk container runway
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // useSpring untuk menghasilkan gerakan halus alami (smooth fluid motion)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    restDelta: 0.001,
  })

  // Transisi Scene Awal (Judul tengah memudar seiring scroll)
  const centerPromptOpacity = useTransform(smoothProgress, [0, 0.22], [1, 0])
  const centerPromptScale = useTransform(smoothProgress, [0, 0.22], [1, 0.9])

  // Transisi Alur "Tiga Langkah Mudah": 0% di scene awal, mekar mengembang seiring konvergensi
  const workflowOpacity = useTransform(smoothProgress, [0.24, 0.58], [0, 1])
  const workflowScale = useTransform(smoothProgress, [0.24, 0.58], [0.94, 1])

  // Tombol CTA muncul mulus di akhir alur
  const ctaOpacity = useTransform(smoothProgress, [0.78, 0.92], [0, 1])
  const ctaY = useTransform(smoothProgress, [0.78, 0.92], [20, 0])

  // Progress Bar Width
  const progressPercent = useTransform(smoothProgress, [0, 1], ["0%", "100%"])

  return (
    <section
      ref={containerRef}
      className="relative w-full"
      style={{
        // Runway scroll 340vh memberikan kenyamanan alur bergantian yang lapang
        minHeight: "340vh",
      }}
    >
      {/* ── STICKY PINNED VIEWPORT ── */}
      <div
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between pt-14 sm:pt-18 pb-6 px-4 sm:px-6 lg:px-8 select-none"
        style={{
          backgroundColor: "#07192D",
          backgroundImage: "linear-gradient(180deg, #09233F 0%, #07192D 50%, #051322 100%)",
        }}
      >
        {/* Ambience Glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/5 blur-[120px]" />

        {/* ════════════════════════════════════════════════════════════════════
            SCENE AWAL: JUDUL & PETUNJUK KONSTELASI 62 SEKOLAH
            Bebas dari tumpukan kartu karena kartu diatur berada di luar radius teks!
           ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          style={{
            opacity: centerPromptOpacity,
            scale: centerPromptScale,
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pointer-events-none"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-[#0c243d] px-3.5 py-1 text-xs font-bold text-blue-200 mb-3 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-300" />
            <span>Dapodik Wilayah Kerja Kecamatan Lamongan</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight max-w-xl">
            62 Sekolah Terdaftar di SIMAKIS
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
            Scroll ke bawah — saksikan aduan dari 62 sekolah bergerak masuk ke dalam membentuk alur penanganan resmi yang transparan.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-300 font-mono animate-pulse">
            <span>Scroll perlahan ke bawah</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════════
            STAGE 62 CHIP SEKOLAH: BERGERAK LURUS RADIAL MASUK KE DALAM
            (Bukan memutar sudut kartu)
           ════════════════════════════════════════════════════════════════════ */}
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
          style={{ perspective: "1200px" }}
        >
          {schoolNodes.map((school) => (
            <SchoolVortexPill
              key={school.id}
              school={school}
              progress={smoothProgress}
              ratio={screenRatio}
            />
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            KONTEN TIGA LANGKAH MUDAH & KARTU REKAPITULASI OMNIROUTE STYLE
            Transparan 0% di scene awal, mekar mengembang dari pusat!
           ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          style={{
            opacity: workflowOpacity,
            scale: workflowScale,
          }}
          className="relative z-10 max-w-7xl w-full mx-auto my-auto py-2"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* ── KOLOM KIRI: KARTU REKAPITULASI OMNIROUTE STYLE DENGAN WATERMARK LOGO SIMAKIS ── */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <OmniRouteStyleSchoolCard progress={smoothProgress} />
            </div>

            {/* ── KOLOM KANAN: ALUR KERJA PARTISIPATIF (3 LANGKAH MUNCUL BERGANTIAN) ── */}
            <div className="lg:col-span-7 space-y-5">

              {/* Header Judul Alur */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  <span>Alur Kerja Partisipatif</span>
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-[38px] font-extrabold text-white tracking-tight leading-tight">
                  Tiga Langkah Mudah Mengawal Fasilitas Belajar
                </h2>
              </div>

              {/* List 3 Langkah (Muncul Bergantian Satu per Satu Saat Di-scroll) */}
              <div className="space-y-4 pt-1">
                {STEPS_DATA.map((step, idx) => (
                  <StaggeredStepItem
                    key={step.stepNumber}
                    step={step}
                    index={idx}
                    progress={smoothProgress}
                  />
                ))}
              </div>

              {/* Tombol CTA (Muncul di Akhir Alur) */}
              <motion.div
                style={{ opacity: ctaOpacity, y: ctaY }}
                className="pt-2 flex flex-wrap items-center gap-4"
              >
                <Button
                  onClick={handleMulaiLapor}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 h-auto rounded-xl text-xs sm:text-sm shadow-xl shadow-blue-600/30 transition-all duration-300 cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Mulai Laporkan Sarpras Sekarang</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </motion.div>

            </div>

          </div>
        </motion.div>

        {/* Indikator scroll bar di paling bawah sticky frame */}
        <div className="relative z-20 w-full max-w-xs mx-auto pb-1 flex items-center justify-center gap-2">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
              style={{ width: progressPercent }}
            />
          </div>
        </div>

      </div>
    </section>
  )
}
