import React from "react"

export interface MapLegendProps {
  position?: "bottomleft" | "bottomright" | "topleft" | "topright"
  title?: string
  clusterCount?: number
  totalPins?: number
  className?: string
}

export const MapLegend: React.FC<MapLegendProps> = ({
  position = "bottomright",
  title = "AMBANG SKOR PRIORITAS",
  clusterCount = 5,
  totalPins = 27,
  className = "",
}) => {
  const posClasses = {
    bottomleft: "bottom-4 left-4",
    bottomright: "bottom-4 right-4",
    topleft: "top-4 left-4",
    topright: "top-4 right-4",
  }

  return (
    <div
      className={`absolute z-[1000] bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 p-3.5 shadow-lg text-xs pointer-events-auto ${posClasses[position]} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </div>

      <div className="space-y-1.5 font-medium">
        <div className="flex items-center gap-2 text-rose-700">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shadow-sm" />
          <span className="font-semibold">&gt; 70 Kritis</span>
          <span className="text-[10px] text-slate-400 ml-auto">Tindakan Segera</span>
        </div>

        <div className="flex items-center gap-2 text-amber-700">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" />
          <span className="font-semibold">40–70 Sedang</span>
          <span className="text-[10px] text-slate-400 ml-auto">Verifikasi Lapangan</span>
        </div>

        <div className="flex items-center gap-2 text-emerald-700">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
          <span className="font-semibold">&lt; 40 Rendah</span>
          <span className="text-[10px] text-slate-400 ml-auto">Pemantauan Rutin</span>
        </div>
      </div>

      {(clusterCount !== undefined || totalPins !== undefined) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 gap-3">
          <span>{totalPins} Sekolah Terpetakan</span>
          <span className="font-bold text-slate-700">{clusterCount} Klaster Spasial</span>
        </div>
      )}
    </div>
  )
}

export default MapLegend
