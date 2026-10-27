import React, { useMemo, useState } from "react"
import { Marker, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"

export interface SeverityMarkerProps {
  id: string
  position: [number, number]
  sekolah: string
  skor: number
  status: "kritis" | "sedang" | "rendah" | string
  isSelected?: boolean
  onClick?: () => void
  children?: React.ReactNode
}

export const SeverityMarker: React.FC<SeverityMarkerProps> = ({
  position,
  sekolah,
  skor,
  status,
  isSelected = false,
  onClick,
  children,
}) => {
  const map = useMap()
  const [currentZoom, setCurrentZoom] = useState<number>(() => {
    try {
      return map.getZoom()
    } catch {
      return 13
    }
  })

  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom())
    },
    zoom: () => {
      setCurrentZoom(map.getZoom())
    },
  })

  // Skala ukuran: Saat Zoom Out (currentZoom < 13) point membesar, saat Zoom In (currentZoom > 13) point mengecil
  const scale = useMemo(() => {
    const diff = 13 - currentZoom
    return Math.max(0.65, Math.min(1.5, 1 + diff * 0.15))
  }, [currentZoom])

  // Format skor pada point nomor
  const displaySkor = useMemo(() => {
    if (typeof skor !== "number") return skor
    if (scale < 0.75) {
      return Math.round(skor)
    }
    return Number.isInteger(skor) ? skor : Number(skor.toFixed(1))
  }, [skor, scale])

  const customIcon = useMemo(() => {
    const isKritis = status === "kritis" || skor > 70
    const isSedang = !isKritis && (status === "sedang" || skor >= 40)

    const bgClass = isKritis ? "#E11D48" : isSedang ? "#F59E0B" : "#10B981"
    // Ukuran point nomor disamakan seragam dengan ukuran pin sedang (seperti nomor 47.9)
    const baseSize = 30
    const size = Math.round(baseSize * scale)
    const fontSize = Math.max(7, Math.round(11 * scale))
    const borderWidth = Math.max(1.5, Math.min(3, 2.5 * scale))

    // Ukuran font dan padding label nama sekolah
    const labelFontSize = Math.max(9, Math.round(10 * Math.min(1.2, Math.max(0.85, scale))))
    const labelPadding = `${Math.max(2, Math.round(3 * scale))}px ${Math.max(4, Math.round(8 * scale))}px`
    const labelMaxWidth = Math.max(120, Math.round(180 * scale))

    // Label tag nama sekolah: tersembunyi secara default dan muncul ketika disentuh kursor (hover) atau saat dipilih (isSelected)
    const topTag = isKritis
      ? `<div class="marker-label-tag" style="
          position: absolute;
          bottom: ${size + Math.max(4, Math.round(5 * scale))}px;
          left: 50%;
          transform: translateX(-50%);
          background: #0B3052;
          color: #ffffff;
          padding: ${labelPadding};
          border-radius: 6px;
          font-size: ${labelFontSize}px;
          font-weight: 800;
          white-space: nowrap;
          max-width: ${labelMaxWidth}px;
          text-overflow: ellipsis;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 5px;
          z-index: 50;
        ">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #F43F5E; flex-shrink: 0;"></span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sekolah}</span>
        </div>`
      : `<div class="marker-label-tag" style="
          position: absolute;
          top: ${size + Math.max(3, Math.round(4 * scale))}px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.98);
          color: #0F172A;
          padding: ${labelPadding};
          border-radius: 6px;
          font-size: ${labelFontSize}px;
          font-weight: 700;
          white-space: nowrap;
          max-width: ${labelMaxWidth}px;
          text-overflow: ellipsis;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
          border: 1px solid #CBD5E1;
          display: flex;
          align-items: center;
          z-index: 45;
        ">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sekolah}</span>
        </div>`

    const ringStyle = isSelected
      ? `box-shadow: 0 0 0 ${Math.max(3, Math.round(4 * scale))}px rgba(59, 130, 246, 0.6), 0 10px 15px -3px rgba(0, 0, 0, 0.3); transform: scale(1.15);`
      : `box-shadow: 0 3px 6px -1px rgba(0, 0, 0, 0.25);`

    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${topTag}
        <div class="marker-circle-pin" style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${bgClass};
          color: #FFFFFF;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-weight: 800;
          font-size: ${fontSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: ${borderWidth}px solid #FFFFFF;
          transition: transform 0.15s ease-out;
          ${ringStyle}
        ">
          ${displaySkor}
        </div>
      </div>
    `

    return L.divIcon({
      html,
      className: `custom-severity-marker ${isSelected ? "is-selected" : ""}`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [sekolah, displaySkor, status, isSelected, scale, currentZoom, skor])

  return (
    <Marker
      position={position}
      icon={customIcon}
      riseOnHover={true}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e)
          onClick?.()
        },
      }}
    >
      {children}
    </Marker>
  )
}

export default SeverityMarker
