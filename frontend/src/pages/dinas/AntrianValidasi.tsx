import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Bell,
  XCircle,
  Eye,
  EyeOff,
  Building2,
  Users,
  ChevronDown,
  Sparkles,
  Lock,
  Maximize2,
  X,
  FileCheck,
  Zap,
  Droplets,
  Wifi,
  Wind,
  Shield,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  MapPin,
  Clock,
  Hash
} from "lucide-react"
import { daftarKlasterDinas, KlasterIsuDinas } from "@/mocks/dinasData"

export default function AntrianValidasi() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlId = searchParams.get("id")
  const urlSearch = searchParams.get("search") || ""

  const [activeTab, setActiveTab] = useState<string>("belum_ditinjau")
  const [selectedKlasterId, setSelectedKlasterId] = useState<string>(
    urlId || daftarKlasterDinas[0]?.id || "kls-001"
  )
  const [selectedSchool, setSelectedSchool] = useState<string>("Semua Sekolah")
  const [prioritySlider, setPrioritySlider] = useState<number>(0)

  // Masking state for PDP Vault
  const [revealedNiks, setRevealedNiks] = useState<{ [key: number]: boolean }>({})
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<{ url: string; caption: string } | null>(null)

  // Update selected cluster when URL parameter changes
  useEffect(() => {
    if (urlId) {
      const match = daftarKlasterDinas.find((k) => k.id.toLowerCase() === urlId.toLowerCase() || k.nomorTiket.toLowerCase() === urlId.toLowerCase())
      if (match) {
        setSelectedKlasterId(match.id)
      }
    }
  }, [urlId])

  // Extract unique school names from data
  const schoolOptions = useMemo(() => {
    const schools = Array.from(new Set(daftarKlasterDinas.map((k) => k.sekolah)))
    return ["Semua Sekolah", ...schools]
  }, [])

  // Filtered clusters based on active tab, school, priority, and search
  const filteredKlasters = useMemo(() => {
    return daftarKlasterDinas.filter((k) => {
      // Tab filter
      if (activeTab === "mismatch" && k.tipeBadge !== "Mismatch") return false
      if (activeTab === "kejadian_baru" && k.tipeBadge !== "Kejadian Baru") return false
      if (activeTab === "ditolak" && k.tipeBadge !== "Ditolak") return false

      // School filter
      if (selectedSchool !== "Semua Sekolah" && k.sekolah !== selectedSchool) {
        return false
      }

      // Priority slider filter
      if (k.skor < prioritySlider) {
        return false
      }

      // Search query filter
      if (urlSearch) {
        const query = urlSearch.toLowerCase()
        const matchTitle = k.judul.toLowerCase().includes(query)
        const matchSchool = k.sekolah.toLowerCase().includes(query)
        const matchNpsn = k.npsn.includes(query)
        const matchTicket = k.nomorTiket.toLowerCase().includes(query)
        const matchKec = k.kecamatan.toLowerCase().includes(query)
        if (!matchTitle && !matchSchool && !matchNpsn && !matchTicket && !matchKec) {
          return false
        }
      }

      return true
    })
  }, [activeTab, selectedSchool, prioritySlider, urlSearch])

  // Selected cluster object
  const selectedKlaster: KlasterIsuDinas = useMemo(() => {
    const found = daftarKlasterDinas.find((k) => k.id === selectedKlasterId)
    if (found) return found
    if (filteredKlasters.length > 0) return filteredKlasters[0]
    return daftarKlasterDinas[0]
  }, [selectedKlasterId, filteredKlasters])

  const handleSelectKlaster = (id: string) => {
    setSelectedKlasterId(id)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("id", id)
      return next
    })
    // Reset revealed NIKs when switching cluster
    setRevealedNiks({})
  }

  const toggleNik = (idx: number) => {
    setRevealedNiks((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleDecision = (type: "mismatch" | "baru" | "tolak") => {
    if (type === "mismatch") {
      setDecisionFeedback(
        `Klaster ${selectedKlaster.nomorTiket} (${selectedKlaster.sekolah}) berhasil diverifikasi sebagai Mismatch Sarpras Resmi. Dokumen diteruskan ke Tim Perencanaan DAK.`
      )
    } else if (type === "baru") {
      setDecisionFeedback(
        `Klaster ${selectedKlaster.nomorTiket} (${selectedKlaster.sekolah}) ditandai sebagai Kejadian Baru di Lapangan. Jadwal audit fisik lapangan diterbitkan.`
      )
    } else {
      setDecisionFeedback(
        `Sanggahan pada klaster ${selectedKlaster.nomorTiket} ditolak dengan catatan verifikator. Alasan penolakan diarsipkan ke Log Audit PDP.`
      )
    }
    setTimeout(() => {
      setDecisionFeedback(null)
    }, 4500)
  }

  // Count per tab
  const tabCounts = useMemo(() => {
    const mismatchCount = daftarKlasterDinas.filter((k) => k.tipeBadge === "Mismatch").length
    const baruCount = daftarKlasterDinas.filter((k) => k.tipeBadge === "Kejadian Baru").length
    const tolakCount = daftarKlasterDinas.filter((k) => k.tipeBadge === "Ditolak").length
    return {
      belum_ditinjau: daftarKlasterDinas.length,
      mismatch: mismatchCount,
      kejadian_baru: baruCount,
      ditolak: tolakCount || 0,
    }
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Sub-Nav Filters Strip ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: "belum_ditinjau", label: "Belum Ditinjau", count: tabCounts.belum_ditinjau, badgeClass: "bg-rose-100 text-rose-700" },
              { id: "mismatch", label: "Mismatch Terverifikasi", count: tabCounts.mismatch, badgeClass: "bg-slate-100 text-slate-700" },
              { id: "kejadian_baru", label: "Kejadian Baru", count: tabCounts.kejadian_baru, badgeClass: "bg-blue-100 text-blue-700" },
              { id: "ditolak", label: "Ditolak", count: tabCounts.ditolak, badgeClass: "bg-slate-100 text-slate-700" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === t.id
                  ? "bg-[#0B3052] text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                  }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === t.id ? "bg-white/20 text-white" : t.badgeClass
                    }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Right Filter Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* School dropdown */}
            <div className="relative">
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                aria-label="Filter berdasarkan sekolah"
                className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer"
              >
                {schoolOptions.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Priority Slider */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
              <span className="font-semibold text-[11px]">Prioritas Min:</span>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={prioritySlider}
                onChange={(e) => setPrioritySlider(Number(e.target.value))}
                aria-label="Filter skor prioritas minimum"
                className="w-20 h-1.5 bg-slate-200 rounded-lg accent-[#0B3052] cursor-pointer"
              />
              <span className="font-black text-[#0B3052] text-xs">{prioritySlider}+</span>
            </div>
          </div>
        </div>

        {/* AI Stream Sub-indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px]">
              Klasterisasi: <strong>14 mnt lalu</strong> · Stream AI Aktif - Worker 02
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">DBSCAN Epsilon: 0.82 | MinPts: 4 aduan</span>
        </div>
      </div>

      {/* Decision feedback alert */}
      {decisionFeedback && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{decisionFeedback}</span>
          </div>
          <button
            onClick={() => setDecisionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ── Main Split View ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch" style={{ height: 'calc(100vh - 260px)', minHeight: '480px' }}>
        {/* Left Column (5 Cols): Antrian Isu Terklaster */}
        <div className="lg:col-span-5 flex flex-col min-h-0 min-w-0">
          {/* Fixed header of left column */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 px-1 whitespace-nowrap overflow-hidden shrink-0 mb-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wider whitespace-nowrap">
                ANTRIAN ISU TERKLASTER
              </span>
              <span className="rounded-full bg-[#0B3052] text-white text-[9px] font-bold px-2 py-0.5 whitespace-nowrap leading-none">
                {filteredKlasters.length} Klaster
              </span>
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">Urut: Skor Keparahan Tertinggi</span>
          </div>
          {/* Scrollable list area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>

          {filteredKlasters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">Tidak ada klaster isu yang cocok</p>
              <p className="text-xs text-slate-400">Silakan sesuaikan filter sekolah atau turunkan nilai prioritas.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSchool("Semua Sekolah")
                  setPrioritySlider(0)
                }}
                className="mt-2 text-xs"
              >
                Reset Filter
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredKlasters.map((klaster) => {
                const isSelected = klaster.id === selectedKlaster.id
                return (
                  <div
                    key={klaster.id}
                    onClick={() => handleSelectKlaster(klaster.id)}
                    className={`rounded-2xl border p-5 transition-all cursor-pointer bg-white space-y-3 relative ${isSelected
                      ? "border-[#0B3052] ring-2 ring-[#0B3052]/10 shadow-md bg-white"
                      : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                      }`}
                  >
                    {/* Top Area: Badges, Title in upper space, & Score */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Metadata strip */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${klaster.tipeBadge === "Mismatch"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                          >
                            {klaster.tipeBadge}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 font-semibold">{klaster.nomorTiket}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-400">Diperbarui {klaster.diperbarui}</span>
                        </div>

                        {/* Title enlarged in the upper space */}
                        <h3 className="font-black text-slate-900 text-base sm:text-[17px] leading-snug tracking-tight">
                          {klaster.judul}
                        </h3>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right shrink-0 pt-0.5">
                        <div
                          className={`inline-flex items-center justify-center font-black rounded-lg text-xs px-2.5 py-1 ${klaster.skor >= 70
                            ? "bg-rose-600 text-white shadow-sm"
                            : klaster.skor >= 50
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-blue-600 text-white shadow-sm"
                            }`}
                        >
                          {klaster.skor}
                        </div>
                        <span
                          className={`block text-[9px] font-black tracking-wider mt-1 ${klaster.skor >= 70
                            ? "text-rose-600"
                            : klaster.skor >= 50
                              ? "text-amber-600"
                              : "text-blue-600"
                            }`}
                        >
                          {klaster.prioritasLabel}
                        </span>
                      </div>
                    </div>

                    {/* School & Location Info */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap font-medium">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <strong className="text-slate-800">{klaster.sekolah}</strong>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-[11px]">NPSN {klaster.npsn}</span>
                      <span className="text-slate-300">•</span>
                      <span>{klaster.kecamatan}</span>
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <strong>{klaster.laporanWargaCount}</strong> laporan warga
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 whitespace-nowrap">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <strong>{klaster.dukunganCount}</strong> dukungan
                        </span>
                      </div>
                    </div>

                    {/* Thumbnail previews */}
                    {klaster.fotoMinio.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-slate-400 font-mono">
                          <span>BUKTI LAPORAN</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {klaster.fotoMinio.slice(0, 3).map((foto) => (
                            <div
                              key={foto.id}
                              className="h-12 w-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={foto.url}
                                alt={foto.caption}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback to high-availability placeholder
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=600&q=80"
                                }}
                              />
                            </div>
                          ))}
                          {klaster.fotoMinio.length > 3 && (
                            <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                              +{klaster.fotoMinio.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

            <div className="text-center text-xs text-slate-400 pt-2 pb-1">
              Menampilkan {filteredKlasters.length} dari {daftarKlasterDinas.length} klaster isu aktif
            </div>
          </div>{/* end scrollable list */}
        </div>

        {/* Right Column (7 Cols): Audit Sheet Inspector */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-y-auto overflow-x-hidden min-w-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
          <div className="p-6 sm:p-7 space-y-5">

          {/* ── CLUSTER THEME SYSTEM ── derive accent palette from kategori */}
          {(() => {
            const k = selectedKlaster

            // ─── palette map ───────────────────────────────────────────────
            type Palette = {
              accent: string          // tailwind bg class for accent strip
              accentText: string
              accentBorder: string
              accentBg: string
              accentDot: string
              icon: React.ReactNode
              statColor: string       // for stat pills
              factBg: string
              factBorder: string
              factText: string
              factDot: string
            }

            const getPalette = (kategori: string): Palette => {
              if (/kelistrikan|listrik/i.test(kategori)) return {
                accent: 'bg-amber-500', accentText: 'text-amber-700',
                accentBorder: 'border-amber-300', accentBg: 'bg-amber-50',
                accentDot: 'bg-amber-500', icon: <Zap className="h-4 w-4 text-amber-600" />,
                statColor: 'bg-amber-100 text-amber-800 border-amber-200',
                factBg: 'bg-amber-50/60', factBorder: 'border-amber-300',
                factText: 'text-amber-900', factDot: 'bg-amber-500 animate-pulse',
              }
              if (/sanitasi|air/i.test(kategori)) return {
                accent: 'bg-teal-500', accentText: 'text-teal-700',
                accentBorder: 'border-teal-200', accentBg: 'bg-teal-50',
                accentDot: 'bg-teal-500', icon: <Droplets className="h-4 w-4 text-teal-600" />,
                statColor: 'bg-teal-100 text-teal-800 border-teal-200',
                factBg: 'bg-teal-50/60', factBorder: 'border-teal-300',
                factText: 'text-teal-900', factDot: 'bg-teal-500 animate-pulse',
              }
              if (/tik|jaringan|komputer/i.test(kategori)) return {
                accent: 'bg-violet-500', accentText: 'text-violet-700',
                accentBorder: 'border-violet-200', accentBg: 'bg-violet-50',
                accentDot: 'bg-violet-500', icon: <Wifi className="h-4 w-4 text-violet-600" />,
                statColor: 'bg-violet-100 text-violet-800 border-violet-200',
                factBg: 'bg-violet-50/60', factBorder: 'border-violet-300',
                factText: 'text-violet-900', factDot: 'bg-violet-500 animate-pulse',
              }
              if (/ventilasi|kenyamanan/i.test(kategori)) return {
                accent: 'bg-sky-400', accentText: 'text-sky-700',
                accentBorder: 'border-sky-200', accentBg: 'bg-sky-50',
                accentDot: 'bg-sky-400', icon: <Wind className="h-4 w-4 text-sky-500" />,
                statColor: 'bg-sky-100 text-sky-800 border-sky-200',
                factBg: 'bg-sky-50/60', factBorder: 'border-sky-300',
                factText: 'text-sky-900', factDot: 'bg-sky-500 animate-pulse',
              }
              if (/keamanan|drainase|pagar/i.test(kategori)) return {
                accent: 'bg-blue-500', accentText: 'text-blue-700',
                accentBorder: 'border-blue-200', accentBg: 'bg-blue-50',
                accentDot: 'bg-blue-500', icon: <Shield className="h-4 w-4 text-blue-600" />,
                statColor: 'bg-blue-100 text-blue-800 border-blue-200',
                factBg: 'bg-blue-50/60', factBorder: 'border-blue-300',
                factText: 'text-blue-900', factDot: 'bg-blue-500 animate-pulse',
              }
              if (/struktur/i.test(kategori)) return {
                accent: 'bg-slate-600', accentText: 'text-slate-700',
                accentBorder: 'border-slate-300', accentBg: 'bg-slate-50',
                accentDot: 'bg-slate-600', icon: <AlertTriangle className="h-4 w-4 text-slate-600" />,
                statColor: 'bg-slate-100 text-slate-800 border-slate-300',
                factBg: 'bg-slate-100/60', factBorder: 'border-slate-400',
                factText: 'text-slate-900', factDot: 'bg-slate-600',
              }
              // default: sarpras kritis / atap
              return {
                accent: 'bg-rose-600', accentText: 'text-rose-700',
                accentBorder: 'border-rose-200', accentBg: 'bg-rose-50',
                accentDot: 'bg-rose-600', icon: <Building2 className="h-4 w-4 text-rose-600" />,
                statColor: 'bg-rose-100 text-rose-800 border-rose-200',
                factBg: 'bg-rose-50/60', factBorder: 'border-rose-200',
                factText: 'text-rose-900', factDot: 'bg-rose-600 animate-pulse',
              }
            }

            const p = getPalette(k.kategori)

            const priorityColor = k.skor >= 70
              ? 'bg-rose-50 text-rose-800 border-rose-200 [&>span]:bg-rose-600'
              : k.skor >= 50
                ? 'bg-amber-50 text-amber-800 border-amber-200 [&>span]:bg-amber-600'
                : 'bg-blue-50 text-blue-800 border-blue-200 [&>span]:bg-blue-600'

            return (
              <>
                {/* ── Accent header strip ───────────────────────── */}
                <div className={`-mx-6 sm:-mx-7 -mt-6 sm:-mt-7 px-6 sm:px-7 pt-4 pb-5 rounded-t-2xl ${p.accentBg} border-b ${p.accentBorder} space-y-3`}>
                  {/* Top meta row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-1.5 ${p.accentBg} border ${p.accentBorder}`}>
                        {p.icon}
                      </div>
                      <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 border border-slate-200/80 shadow-sm">
                        {k.nomorTiket}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${p.statColor}`}>
                        {k.kategori}
                      </span>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold border flex items-center gap-1.5 ${priorityColor}`}>
                      <span className="h-2 w-2 rounded-full" />
                      Prioritas {k.skor} / 100
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                    {k.judul}
                  </h2>

                  {/* School meta */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="font-bold text-slate-800">{k.sekolah}</span>
                    <span className="font-mono text-slate-400">NPSN {k.npsn}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{k.kecamatan}</span>
                  </div>

                  {/* Quick stat pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${p.statColor}`}>
                      <Users className="h-3 w-3" />
                      {k.laporanWargaCount} Laporan
                    </span>
                    <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${p.statColor}`}>
                      <TrendingUp className="h-3 w-3" />
                      {k.dukunganCount} Dukungan
                    </span>
                    <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${p.statColor}`}>
                      <Clock className="h-3 w-3" />
                      {k.diperbarui}
                    </span>
                    <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${p.statColor}`}>
                      <Hash className="h-3 w-3" />
                      {k.tfidfTag.replace('TF-IDF: ', '')}
                    </span>
                  </div>
                </div>

                {/* ── Skor bar ───────────────────────────────────── */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                      Skor Keparahan
                    </span>
                    <span className="font-mono font-bold text-slate-700">{k.skor} / 100</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${k.skor >= 70 ? 'bg-rose-500' : k.skor >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`}
                      style={{ width: `${k.skor}%` }}
                    />
                  </div>
                </div>

                {/* ── Decision Buttons ───────────────────────────── */}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <Button
                    onClick={() => handleDecision("mismatch")}
                    className="h-11 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Verifikasi Mismatch</span>
                  </Button>
                  <Button
                    onClick={() => handleDecision("baru")}
                    variant="outline"
                    className="h-11 bg-blue-50/70 hover:bg-blue-100 text-blue-900 border-blue-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Bell className="h-4 w-4 text-blue-600" />
                    <span>Tandai Kejadian Baru</span>
                  </Button>
                  <Button
                    onClick={() => handleDecision("tolak")}
                    variant="outline"
                    className="h-11 bg-rose-50/70 hover:bg-rose-100 text-rose-800 border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>Tolak Sanggahan</span>
                  </Button>
                </div>

                {/* ── Comparison Box (themed right card) ─────────── */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    PERBANDINGAN DATA RESMI VS FAKTA LAPANGAN
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Baseline */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">BASELINE DAPODIK 2026</span>
                        <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="font-extrabold text-emerald-700 text-sm flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {k.baselineDapodik.kondisi}
                      </div>
                      <div className="space-y-1 text-slate-600 text-[11px]">
                        <div>{k.baselineDapodik.tanggalUpdate}</div>
                        <div>{k.baselineDapodik.volume}</div>
                        <div className="italic text-slate-400">{k.baselineDapodik.detail}</div>
                      </div>
                    </div>
                    {/* Fakta (themed) */}
                    <div className={`rounded-xl border p-4 space-y-2 text-xs ${p.factBg} ${p.factBorder}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${p.accentText}`}>FAKTA TEMUAN WARGA</span>
                        {p.icon}
                      </div>
                      <div className={`font-extrabold text-sm flex items-center gap-1.5 ${p.accentText}`}>
                        <span className={`h-2 w-2 rounded-full ${p.factDot}`} />
                        {k.faktaLapangan.kondisi}
                      </div>
                      <div className={`space-y-1 font-medium text-[11px] ${p.factText}`}>
                        <div>{k.faktaLapangan.deskripsiFisik}</div>
                        <div>{k.faktaLapangan.keteranganKbm}</div>
                        <div className={`font-bold ${p.accentText}`}>{k.faktaLapangan.dampak}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PDP Vault ─────────────────────────────────── */}
                <div className={`rounded-xl border p-4 space-y-3 ${p.accentBg} ${p.accentBorder}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${p.accentText}`}>
                      <Lock className="h-3.5 w-3.5" />
                      LAPORAN WARGA (PDP_VAULT AES-256)
                    </span>
                    <span className="rounded bg-white/70 text-slate-600 font-mono text-[10px] font-bold px-1.5 py-0.5 border border-slate-200">
                      UU PDP No. 27/2022
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {k.laporanWargaVault.map((item, idx) => {
                      const isRevealed = !!revealedNiks[idx]
                      return (
                        <div key={idx} className="rounded-lg bg-white p-3 border border-white/80 shadow-sm space-y-2">
                          <p className="text-xs text-slate-700 leading-relaxed italic">"{item.isi}"</p>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                            <div className="font-mono text-slate-600">
                              NIK: <strong>{isRevealed ? item.nikFull : item.nikMasked}</strong>
                              {isRevealed && <span className="ml-2 font-sans text-[10px] text-slate-400">({item.namaWarga})</span>}
                            </div>
                            <button type="button" onClick={() => toggleNik(idx)}
                              className={`text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer ${p.accentText}`}>
                              {isRevealed ? <><EyeOff className="h-3 w-3" /> Sembunyikan</> : <><Eye className="h-3 w-3" /> Lihat NIK Penuh</>}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Gallery ───────────────────────────────────── */}
                {k.fotoMinio.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-bold flex items-center gap-1.5 ${p.accentText}`}>
                        <Sparkles className="h-3.5 w-3.5" />
                        GALERI BUKTI PRESIGNED MINIO
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Tautan berlaku s.d. 14:32 WIB</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {k.fotoMinio.map((foto) => (
                        <div key={foto.id}
                          onClick={() => setPreviewImage({ url: foto.url, caption: foto.caption })}
                          className="group rounded-xl border overflow-hidden bg-slate-50 cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="h-36 w-full overflow-hidden bg-slate-200 relative">
                            <img src={foto.url} alt={foto.caption}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=600&q=80" }}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="h-5 w-5 drop-shadow" />
                            </div>
                            {/* Themed color overlay strip at bottom */}
                            <div className={`absolute bottom-0 left-0 right-0 h-1 ${p.accent}`} />
                          </div>
                          <div className="p-2.5 text-[11px] text-slate-600">
                            <span className="font-semibold block text-slate-800 truncate">{foto.caption}</span>
                            <span className="text-slate-400 text-[10px]">{foto.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Audit Trail (themed timeline) ─────────────── */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    RIWAYAT PERUBAHAN &amp; AUDIT TRAIL
                  </span>
                  <div className={`space-y-3 pl-2 border-l-2 ml-1 ${p.accentBorder}`}>
                    {k.auditTrail.map((item, idx) => (
                      <div key={idx} className="relative pl-4 space-y-0.5">
                        <div className={`absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          item.status === 'selesai' ? 'bg-slate-700'
                          : item.status === 'proses' ? `${p.accentDot} animate-pulse`
                          : 'bg-slate-300'
                        }`} />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{item.judul}</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.waktu}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{item.keterangan}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          })()}
          </div>{/* end inner padding */}
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white">
              <h4 className="text-sm font-bold truncate">{previewImage.caption}</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-xl bg-black flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.caption}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Bukti Terenkripsi MinIO S3 Presigned URL</span>
              <span className="font-mono text-emerald-400">Status: Valid Signature</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
