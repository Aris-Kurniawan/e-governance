import React, { useMemo } from "react"
import { Marker } from "react-leaflet"
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
  const customIcon = useMemo(() => {
    const isKritis = status === "kritis" || skor >= 70
    const isSedang = !isKritis && (status === "sedang" || skor >= 40)

    const bgClass = isKritis ? "#E11D48" : isSedang ? "#F59E0B" : "#10B981"
    const size = isKritis ? 38 : isSedang ? 32 : 28
    const fontSize = isKritis ? 13 : isSedang ? 12 : 11

    const topTag = isKritis
      ? `<div style="
          position: absolute;
          bottom: ${size + 4}px;
          left: 50%;
          transform: translateX(-50%);
          background: #0B3052;
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 4px;
          pointer-events: none;
        ">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #F43F5E;"></span>
          <span>${sekolah}</span>
        </div>`
      : `<div style="
          position: absolute;
          top: ${size + 2}px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          color: #1E293B;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #E2E8F0;
          pointer-events: none;
        ">
          ${sekolah}
        </div>`

    const ringStyle = isSelected
      ? `box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 10px 15px -3px rgba(0, 0, 0, 0.2); transform: scale(1.1);`
      : `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);`

    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${topTag}
        <div style="
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
          border: 2.5px solid #FFFFFF;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          ${ringStyle}
        ">
          ${skor}
        </div>
      </div>
    `

    return L.divIcon({
      html,
      className: "custom-severity-marker",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [sekolah, skor, status, isSelected])

  return (
    <Marker
      position={position}
      icon={customIcon}
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
