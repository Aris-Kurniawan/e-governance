import React from "react"
import { MapContainer as LeafletMapContainer, TileLayer, useMapEvents } from "react-leaflet"
import type { LatLngExpression } from "leaflet"

export interface MapContainerProps {
  center?: LatLngExpression
  zoom?: number
  minZoom?: number
  maxZoom?: number
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  scrollWheelZoom?: boolean
  onMapClick?: () => void
}

// Inner component to capture clicks on the map background
function MapEvents({ onMapClick }: { onMapClick?: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick?.()
    },
  })
  return null
}

export const MapContainer: React.FC<MapContainerProps> = ({
  center = [-7.1197, 112.4145], // Lamongan Kota
  zoom = 13,
  minZoom = 10,
  maxZoom = 18,
  className = "w-full h-full min-h-[560px]",
  style,
  children,
  scrollWheelZoom = false,
  onMapClick,
}) => {
  const tileUrl =
    (import.meta as any).env?.VITE_MAP_TILE_URL ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={style}>
      <LeafletMapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        scrollWheelZoom={scrollWheelZoom}
        className="w-full h-full z-0"
        style={{ width: "100%", height: "100%", minHeight: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
        />
        {onMapClick && <MapEvents onMapClick={onMapClick} />}
        {children}
      </LeafletMapContainer>
    </div>
  )
}

export default MapContainer
