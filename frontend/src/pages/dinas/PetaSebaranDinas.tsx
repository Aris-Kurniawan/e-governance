import { useState, useCallback, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  RotateCw,
  Download,
  MapPin,
  FileText,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  X,
  TrendingUp,
  BarChart2,
  GripHorizontal,
} from "lucide-react"
import { petaMismatchTitik, trenBulananIsu, distribusiFasilitas } from "@/mocks/dinasData"
import { MapContainer, SeverityMarker, MapLegend } from "@/components/map"
import { AreaTrendChart, HorizontalBarChart } from "@/components/charts"

interface PointItem {
  id: string
  sekolah: string
  npsn: string
  kecamatan: string
  skor: number
  status: string
  lat: number
  lng: number
  posX?: number
  posY?: number
  fasilitas: string
  deskripsi: string
  dapodikKondisi: string
  laporanWarga: number
  dukunganWarga: number
  radius: string
}

export default function PetaSebaranDinas() {
  const navigate = useNavigate()
  const mapWrapperRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{
    startX: number
    startY: number
    initialPopupX: number
    initialPopupY: number
  }>({ startX: 0, startY: 0, initialPopupX: 0, initialPopupY: 0 })

  const [jenjang, setJenjang] = useState<string>("Semua Jenjang")
  const [status, setStatus] = useState<string>("Semua Status (Mismatch & Baru)")
  const [onlyMismatch, setOnlyMismatch] = useState<boolean>(true)

  const selectedPoint = petaMismatchTitik.find((p) => p.id === selectedPointId) as PointItem | undefined

  const handlePinClick = useCallback((id: string) => {
    setSelectedPointId((prev) => (prev === id ? null : id))
    setPopupPos((prevPos) => {
      if (mapWrapperRef.current) {
        const mapRect = mapWrapperRef.current.getBoundingClientRect()
        const popupWidth = 340
        const popupHeight = 360
        if (prevPos) {
          const maxX = Math.max(8, mapRect.width - popupWidth - 8)
          const maxY = Math.max(8, mapRect.height - popupHeight - 8)
          return {
            x: Math.min(Math.max(8, prevPos.x), maxX),
            y: Math.min(Math.max(8, prevPos.y), maxY),
          }
        }
        // Default initial placement: top-right area of map canvas
        const defaultX = Math.max(8, mapRect.width - popupWidth - 24)
        const defaultY = 24
        return { x: defaultX, y: defaultY }
      }
      return prevPos ?? { x: 300, y: 24 }
    })
  }, [])

  const closePopup = useCallback(() => {
    setSelectedPointId(null)
  }, [])

  // Keep popup within container on viewport resize
  useEffect(() => {
    const handleResize = () => {
      if (!mapWrapperRef.current || !popupRef.current) return
      setPopupPos((pos) => {
        if (!pos || !mapWrapperRef.current || !popupRef.current) return pos
        const mapRect = mapWrapperRef.current.getBoundingClientRect()
        const popupRect = popupRef.current.getBoundingClientRect()
        const maxX = Math.max(8, mapRect.width - popupRect.width - 8)
        const maxY = Math.max(8, mapRect.height - popupRect.height - 8)
        return {
          x: Math.min(Math.max(8, pos.x), maxX),
          y: Math.min(Math.max(8, pos.y), maxY),
        }
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Pointer drag event handlers (header drag handle)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    if ((e.target as HTMLElement).closest("button, a, input, select")) return

    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)

    const currentX = popupPos?.x ?? 0
    const currentY = popupPos?.y ?? 0

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPopupX: currentX,
      initialPopupY: currentY,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault()
    e.stopPropagation()

    if (!mapWrapperRef.current || !popupRef.current) return

    const dx = e.clientX - dragStartRef.current.startX
    const dy = e.clientY - dragStartRef.current.startY

    const mapRect = mapWrapperRef.current.getBoundingClientRect()
    const popupRect = popupRef.current.getBoundingClientRect()

    const targetX = dragStartRef.current.initialPopupX + dx
    const targetY = dragStartRef.current.initialPopupY + dy

    // Strictly limit movement within map canvas area
    const minX = 8
    const minY = 8
    const maxX = Math.max(minX, mapRect.width - popupRect.width - 8)
    const maxY = Math.max(minY, mapRect.height - popupRect.height - 8)

    const clampedX = Math.min(Math.max(minX, targetX), maxX)
    const clampedY = Math.min(Math.max(minY, targetY), maxY)

    setPopupPos({ x: clampedX, y: clampedY })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      setIsDragging(false)
    }
  }

  const trenData = trenBulananIsu.map((t) => ({ bulan: t.bulan, nilai: t.jumlah }))
  const distribusiData = distribusiFasilitas.map((d) => ({
    nama: d.nama,
    nilai: d.jumlah,
    subLabel: `${d.persen}%`,
  }))

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* â”€â”€ Top Header Strip â”€â”€ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <strong className="text-slate-800 tracking-wider uppercase text-[11px]">
              DINAS PENDIDIKAN KAB. LAMONGAN
            </strong>
            <span className="text-slate-300">/</span>
            <span>Sub-Bagian Perencanaan &amp; Sarpras</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>HASH: 8F2A-90DC-71</span>
            <span>â€¢</span>
            <span className="font-semibold text-[#0B3052]">SIK-VERIF-LAMONGAN v2.4</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Peta Sebaran Mismatch Sarpras
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Pemetaan spasial sebaran selisih data sarana prasarana sekolah dan klaster laporan warga di 27 desa/kelurahan Kecamatan Lamongan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer shadow-sm"
            >
              <RotateCw className="h-3.5 w-3.5 mr-1.5" />
              <span>Sinkronisasi Geo-Anchor: Terkini</span>
            </Button>
            <Button
              size="sm"
              className="h-9 px-4 text-xs font-bold text-white bg-[#0B3052] hover:bg-[#07213A] rounded-lg shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span>Ekspor Peta Spasial (.GeoJSON)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* â”€â”€ Filter Bar & Legend Row â”€â”€ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Jenjang Dropdown */}
          <div className="relative">
            <select
              value={jenjang}
              onChange={(e) => setJenjang(e.target.value)}
              className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer"
            >
              <option>Semua Jenjang</option>
              <option>SD/MI</option>
              <option>SMP/MTs</option>
              <option>SMA/SMK</option>
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#0B3052] cursor-pointer"
            >
              <option>Semua Status (Mismatch &amp; Baru)</option>
              <option>Mismatch Kritis (&gt;70)</option>
              <option>Selisih Sedang (40-70)</option>
              <option>Rendah (&lt;40)</option>
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              id="mismatch-only"
              checked={onlyMismatch}
              onCheckedChange={(c) => setOnlyMismatch(!!c)}
            />
            <label htmlFor="mismatch-only" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Hanya tampilkan sekolah dengan mismatch aktif
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium border-t md:border-t-0 pt-2 md:pt-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            AMBANG PRIORITAS:
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> &lt;40 Rendah
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 40–70 Sedang
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-rose-700 font-semibold text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> &gt;70 Kritis
          </span>
        </div>
      </div>

      {/* ── React-Leaflet Map Canvas ── */}
      <div
        ref={mapWrapperRef}
        className="relative z-10 rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"
        style={{ height: 580 }}
      >
        {/* Koordinat info bar (digeser ke kanan sedikit agar tombol zoom +/- di pojok kiri atas tidak tertutup) */}
        <div className="absolute top-3 left-14 sm:left-16 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/80 px-3 py-1.5 text-[11px] font-mono text-slate-600 shadow-sm">
            LAT: -7.119732° | LNG: 112.414510° | PROJ: EPSG:4326 (WGS84)
          </div>
        </div>

        <MapContainer
          center={[-7.1197, 112.4145]}
          zoom={13}
          className=""
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          onMapClick={closePopup}
        >
          {petaMismatchTitik.map((point) => (
            <SeverityMarker
              key={point.id}
              id={point.id}
              position={[point.lat, point.lng]}
              sekolah={point.sekolah}
              skor={point.skor}
              status={point.status}
              isSelected={point.id === selectedPointId}
              onClick={() => handlePinClick(point.id)}
            />
          ))}

          {/* Legend Card */}
          <MapLegend
            position="bottomright"
            totalPins={petaMismatchTitik.length}
            clusterCount={3}
          />
        </MapContainer>

        {/* Draggable Detail Popup Overlay (hanya bisa digeser di area map) */}
        {selectedPoint && popupPos && (
          <div
            ref={popupRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
              transform: `translate3d(${popupPos.x}px, ${popupPos.y}px, 0)`,
            }}
            className={`absolute top-0 left-0 z-[1001] w-[340px] max-w-[calc(100%-24px)] bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transition-shadow ${
              isDragging ? "shadow-blue-500/25 ring-2 ring-[#0B3052]/40 cursor-grabbing" : ""
            }`}
          >
            {/* Header / Drag Handle */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="px-4 pt-3 pb-2.5 bg-slate-50/95 border-b border-slate-100 cursor-grab active:cursor-grabbing select-none touch-none transition-colors hover:bg-slate-100/70"
              title="Klik dan tahan untuk menggeser panel di area peta"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <GripHorizontal className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Geser Panel
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closePopup()
                  }}
                  className="shrink-0 h-6 w-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center transition-colors cursor-pointer"
                  title="Tutup Popup"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                    selectedPoint.status === "kritis"
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : selectedPoint.status === "sedang"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      selectedPoint.status === "kritis"
                        ? "bg-rose-600"
                        : selectedPoint.status === "sedang"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  SKOR {selectedPoint.skor} · {selectedPoint.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-black text-slate-900 leading-snug">
                {selectedPoint.sekolah}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span className="font-mono text-slate-600">NPSN: {selectedPoint.npsn}</span>
                <span>•</span>
                <span>{selectedPoint.kecamatan}</span>
              </div>
            </div>

            {/* Popup Body */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-4 space-y-3 max-h-[350px] overflow-y-auto"
            >
              {/* Koordinat */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5 flex items-center justify-between text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-[#0B3052]" />
                  Koordinat:
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedPoint.lat}, {selectedPoint.lng}
                </span>
              </div>

              {/* Fasilitas bermasalah */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  FASILITAS BERMASALAH:
                </span>
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900">{selectedPoint.fasilitas}</span>
                    <span className="rounded bg-blue-50 text-blue-800 font-semibold text-[10px] px-2 py-0.5 border border-blue-200 shrink-0">
                      Dapodik: {selectedPoint.dapodikKondisi}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    &quot;{selectedPoint.deskripsi}&quot;
                  </p>
                </div>
              </div>

              {/* Metrik */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Laporan Warga
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                    {selectedPoint.laporanWarga} Laporan
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Dukungan Publik
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                    {selectedPoint.dukunganWarga} Warga
                  </span>
                </div>
              </div>

              {/* Footer Aksi */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Button
                  onClick={() => navigate(`/dinas/antrian?id=${selectedPoint.id.replace("pin", "kls")}`)}
                  className="w-full h-9 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Buka di Antrian Validasi</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-8 text-[11px] font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Tinjau Berkas Berita Acara</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Chart Section â”€â”€ */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Tren Isu Baru per Bulan â€” AreaTrendChart (ECharts) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#0B3052]" />
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Tren Isu Baru per Bulan
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Rentang 6 Bulan Terakhir (Mar â€“ Agu 2026)</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0B3052] border border-blue-200/60 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0B3052]" />
              Isu Mismatch
            </span>
          </div>

          <AreaTrendChart data={trenData} height={220} />

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1 text-slate-600">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Kenaikan fluktuatif pasca verifikasi lapangan semester genap.
            </span>
            <span className="font-bold text-slate-800">
              Rata-rata: {Math.round(trenData.reduce((a, b) => a + b.nilai, 0) / trenData.length)} isu / bln
            </span>
          </div>
        </div>

        {/* Right: Distribusi Jenis Fasilitas Bermasalah â€” HorizontalBarChart (ECharts) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-[#0B3052]" />
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Distribusi Jenis Fasilitas Bermasalah
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Jumlah isu per kategori fasilitas aktif</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200/80">
              {distribusiFasilitas.reduce((a, b) => a + b.jumlah, 0)} Total Isu
            </span>
          </div>

          <HorizontalBarChart
            data={distribusiData}
            height={220}
            unit="isu"
          />

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Ruang Kelas &amp; Laboratorium mendominasi isu aktif.</span>
            <span className="font-bold text-slate-800">5 Kategori</span>
          </div>
        </div>
      </div>

      {/* â”€â”€ Bottom Strip: Protocols & GIS service status â”€â”€ */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#0B3052] shrink-0" />
          <span>
            Protokol Audit Spasial: RFC-3161 Time-Stamp Authority terhubung dengan server Bappeda Kab. Lamongan.
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-500 font-medium text-xs">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            GIS Service: Aktif (0.42s)
          </span>
          <span>â€¢</span>
          <span className="font-mono text-[11px]">Layer: {petaMismatchTitik.length} Titik / {petaMismatchTitik.filter(p => p.status === "kritis").length} Mismatch Kritis</span>
        </div>
      </div>
    </div>
  )
}
