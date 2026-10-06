import { useState } from "react"
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
  ArrowRight
} from "lucide-react"
import { daftarKlasterDinas, KlasterIsuDinas } from "@/mocks/dinasData"

export default function AntrianValidasi() {
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get("id") || daftarKlasterDinas[0].id

  const [activeTab, setActiveTab] = useState<string>("belum_ditinjau")
  const [selectedKlasterId, setSelectedKlasterId] = useState<string>(initialId)
  const [selectedSchool, setSelectedSchool] = useState<string>("Semua Sekolah")
  const [prioritySlider, setPrioritySlider] = useState<number>(60)

  // Masking state for PDP Vault
  const [revealedNiks, setRevealedNiks] = useState<{ [key: number]: boolean }>({})
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null)

  const selectedKlaster: KlasterIsuDinas =
    daftarKlasterDinas.find((k) => k.id === selectedKlasterId) || daftarKlasterDinas[0]

  const toggleNik = (idx: number) => {
    setRevealedNiks((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleDecision = (type: "mismatch" | "baru" | "tolak") => {
    if (type === "mismatch") {
      setDecisionFeedback("Klaster berhasil diverifikasi sebagai Mismatch Sarpras Resmi. Dokumen diteruskan ke Tim Perencanaan & DAK.")
    } else if (type === "baru") {
      setDecisionFeedback("Klaster ditandai sebagai Kejadian Baru di Lapangan. Jadwal audit fisik lapangan diterbitkan.")
    } else {
      setDecisionFeedback("Sanggahan ditolak dengan catatan verifikator. Alasan penolakan diarsipkan ke Log Audit.")
    }
    setTimeout(() => {
      setDecisionFeedback(null)
    }, 4000)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Sub-Nav Filters Strip ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: "belum_ditinjau", label: "Belum Ditinjau", count: "7", badgeClass: "bg-rose-100 text-rose-700" },
              { id: "mismatch", label: "Mismatch Terverifikasi", count: "14", badgeClass: "bg-slate-100 text-slate-700" },
              { id: "kejadian_baru", label: "Kejadian Baru", count: "5", badgeClass: "bg-slate-100 text-slate-700" },
              { id: "ditolak", label: "Ditolak", count: "2", badgeClass: "bg-slate-100 text-slate-700" },
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
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === t.id ? "bg-white/20 text-white" : t.badgeClass
                  }`}>
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
                className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer"
              >
                <option>Semua Sekolah</option>
                <option>SMAN 1 Sukodadi</option>
                <option>SMKN 1 Lamongan</option>
                <option>SMPN 2 Lamongan</option>
                <option>SDN 5 Turi</option>
                <option>SMPN 1 Lamongan</option>
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Priority Slider Mock */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
              <span className="font-semibold text-[11px]">Prioritas:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={prioritySlider}
                onChange={(e) => setPrioritySlider(Number(e.target.value))}
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
            <span className="text-[11px]">Klasterisasi: <strong>14 mnt lalu</strong> · Stream AI Aktif - Worker 02</span>
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
          <button onClick={() => setDecisionFeedback(null)} className="text-emerald-700 hover:text-emerald-900 text-xs">
            Tutup
          </button>
        </div>
      )}

      {/* ── Main Split View ── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (5 Cols): Antrian Isu Terklaster */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 px-1 whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wider whitespace-nowrap">
                ANTRIAN ISU TERKLASTER
              </span>
              <span className="rounded-full bg-[#0B3052] text-white text-[9px] font-bold px-2 py-0.5 whitespace-nowrap leading-none">
                7 Klaster
              </span>
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">Urut: Skor Keparahan Tertinggi</span>
          </div>

          <div className="space-y-3">
            {daftarKlasterDinas.slice(0, 3).map((klaster) => {
              const isSelected = klaster.id === selectedKlaster.id
              return (
                <div
                  key={klaster.id}
                  onClick={() => setSelectedKlasterId(klaster.id)}
                  className={`rounded-2xl border p-5 transition-all cursor-pointer bg-white space-y-3 relative ${isSelected
                    ? "border-[#0B3052] ring-2 ring-[#0B3052]/10 shadow-md"
                    : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                    }`}
                >
                  {/* Top metadata strip */}
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${klaster.tipeBadge === "Mismatch"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                        {klaster.tipeBadge}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">{klaster.nomorTiket}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">Diperbarui {klaster.diperbarui}</span>
                    </div>

                    <div className="text-right shrink-0 ml-auto">
                      <div className={`inline-flex items-center justify-center font-black rounded text-xs px-2 py-0.5 ${klaster.skor >= 70
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 text-white"
                        }`}>
                        {klaster.skor}
                      </div>
                      <span className={`block text-[9px] font-bold tracking-wider mt-0.5 ${klaster.skor >= 70 ? "text-rose-600" : "text-blue-600"
                        }`}>
                        {klaster.prioritasLabel}
                      </span>
                    </div>
                  </div>

                  {/* Title & School */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {klaster.judul}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <strong className="text-slate-800">{klaster.sekolah}</strong>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-[11px]">NPSN {klaster.npsn}</span>
                      <span className="text-slate-300">•</span>
                      <span>{klaster.kecamatan}</span>
                    </div>
                  </div>

                  {/* Metrics & Inspector selection link */}
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

                    {isSelected && (
                      <span className="text-[#0B3052] font-bold text-[11px] flex items-center gap-0.5 whitespace-nowrap ml-auto">
                        Terpilih di Inspector <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {/* Thumbnail previews */}
                  {klaster.fotoMinio.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-slate-400 font-mono">
                        <span>BUKTI MINIO ENCRYPTED PRESIGNED URL</span>
                        <span>Kedaluwarsa 42 mnt lagi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {klaster.fotoMinio.slice(0, 3).map((foto) => (
                          <div key={foto.id} className="h-12 w-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            <img src={foto.url} alt={foto.caption} className="h-full w-full object-cover" />
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

          <div className="text-center text-xs text-slate-400 pt-2">
            Menampilkan 3 dari 7 klaster isu aktif
          </div>
        </div>

        {/* Right Column (7 Cols): Audit Sheet Inspector */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6 sticky top-20">
          {/* Header */}
          <div className="space-y-2 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200">
                AUDIT SHEET {selectedKlaster.nomorTiket}
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-800 border border-rose-200 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-600" />
                Prioritas {selectedKlaster.skor} / 100
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
              {selectedKlaster.judul}
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="text-slate-800 font-bold">{selectedKlaster.sekolah}</span>
              <span>•</span>
              <span className="font-mono">NPSN {selectedKlaster.npsn}</span>
              <span>•</span>
              <span className="text-rose-600 font-semibold">{selectedKlaster.kategori}</span>
            </div>
          </div>

          {/* Decision Buttons (3 Big CTAs) */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            {/* Button 1: Verifikasi Mismatch */}
            <Button
              onClick={() => handleDecision("mismatch")}
              className="h-11 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Verifikasi Mismatch</span>
            </Button>

            {/* Button 2: Tandai Kejadian Baru */}
            <Button
              onClick={() => handleDecision("baru")}
              variant="outline"
              className="h-11 bg-blue-50/70 hover:bg-blue-100 text-blue-900 border-blue-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bell className="h-4 w-4 text-blue-600" />
              <span>Tandai Kejadian Baru</span>
            </Button>

            {/* Button 3: Tolak Sanggahan */}
            <Button
              onClick={() => handleDecision("tolak")}
              variant="outline"
              className="h-11 bg-rose-50/70 hover:bg-rose-100 text-rose-800 border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              <span>Tolak Sanggahan</span>
            </Button>
          </div>

          {/* Side-by-Side Comparison Box */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              PERBANDINGAN DATA RESMI VS FAKTA LAPANGAN
            </span>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Left: Baseline Dapodik */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  BASELINE DAPODIK 2026
                </span>
                <div className="font-extrabold text-emerald-700 text-sm flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {selectedKlaster.baselineDapodik.kondisi}
                </div>
                <div className="space-y-1 text-slate-600 text-[11px]">
                  <div>{selectedKlaster.baselineDapodik.tanggalUpdate}</div>
                  <div>{selectedKlaster.baselineDapodik.volume}</div>
                  <div>{selectedKlaster.baselineDapodik.detail}</div>
                </div>
              </div>

              {/* Right: Fakta Temuan Warga */}
              <div className="rounded-xl bg-rose-50/60 border border-rose-200 p-4 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  FAKTA TEMUAN WARGA
                </span>
                <div className="font-extrabold text-rose-700 text-sm flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                  {selectedKlaster.faktaLapangan.kondisi}
                </div>
                <div className="space-y-1 text-rose-950 font-medium text-[11px]">
                  <div>{selectedKlaster.faktaLapangan.deskripsiFisik}</div>
                  <div>{selectedKlaster.faktaLapangan.keteranganKbm}</div>
                  <div className="font-bold text-rose-700">{selectedKlaster.faktaLapangan.dampak}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen Quotes (PDP Vault) */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#0B3052]" />
                LAPORAN WARGA (PDP_VAULT AES-256)
              </span>
              <span className="rounded bg-slate-200/70 text-slate-600 font-mono text-[10px] font-bold px-1.5 py-0.5">
                UU PDP No. 27/2022
              </span>
            </div>

            <div className="space-y-2.5">
              {selectedKlaster.laporanWargaVault.map((item, idx) => {
                const isRevealed = !!revealedNiks[idx]
                return (
                  <div key={idx} className="rounded-lg bg-white p-3 border border-slate-200/70 space-y-2">
                    <p className="text-xs text-slate-700 leading-relaxed italic">
                      "{item.isi}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                      <div className="font-mono text-slate-600">
                        NIK: <strong>{isRevealed ? item.nikFull : item.nikMasked}</strong>
                        {isRevealed && <span className="ml-2 font-sans text-[10px] text-slate-400">({item.namaWarga})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleNik(idx)}
                        className="text-xs font-bold text-[#0B3052] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="h-3 w-3" /> Sembunyikan
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" /> Lihat NIK Penuh
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Galeri Bukti Presigned MinIO */}
          {selectedKlaster.fotoMinio.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0B3052]" />
                  GALERI BUKTI PRESIGNED MINIO
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Tautan berlaku s.d. 14:32 WIB</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedKlaster.fotoMinio.slice(0, 2).map((foto) => (
                  <div key={foto.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <div className="h-36 w-full overflow-hidden bg-slate-200">
                      <img src={foto.url} alt={foto.caption} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-2.5 text-[11px] text-slate-600">
                      <span className="font-semibold block text-slate-800">{foto.caption}</span>
                      <span className="text-slate-400 text-[10px]">{foto.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Riwayat Perubahan & Audit Trail */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              RIWAYAT PERUBAHAN &amp; AUDIT TRAIL
            </span>

            <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-1">
              {selectedKlaster.auditTrail.map((item, idx) => (
                <div key={idx} className="relative pl-4 space-y-0.5">
                  <div className={`absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${item.status === "selesai"
                    ? "bg-slate-700"
                    : item.status === "proses"
                      ? "bg-rose-600 animate-pulse"
                      : "bg-slate-300"
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
        </div>
      </div>
    </div>
  )
}
