import React, { useRef, useState, useCallback } from "react"

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  maxTilt?: number // Sudut kemiringan maksimal dalam derajat (default: 8)
  perspective?: number // Jarak perspektif dalam px (default: 1000)
  scale?: number // Pembesaran skala saat di-hover (default: 1.02)
  glare?: boolean // Efek kilauan pantulan cahaya lembut mengikuti kursor (default: true)
}

export function TiltCard({
  children,
  className = "",
  maxTilt = 8,
  perspective = 1000,
  scale = 1.02,
  glare = true,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({
    transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)`,
  })
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Hitung persentase offset (-1 s/d +1)
      const percentX = (clientX - centerX) / centerX
      const percentY = (clientY - centerY) / centerY

      // Hitung rotasi 3D (X dibalik agar kartu mengikuti arah kursor seperti ditekan/diangkat)
      const rotateX = -(percentY * maxTilt)
      const rotateY = percentX * maxTilt

      setTiltStyle({
        transform: `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px) scale3d(${scale}, ${scale}, ${scale})`,
        transition: "transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      })

      if (glare) {
        setGlarePosition({
          x: (clientX / rect.width) * 100,
          y: (clientY / rect.height) * 100,
          opacity: 0.18,
        })
      }
    },
    [maxTilt, perspective, scale, glare]
  )

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setTiltStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)`,
      transition: "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s ease",
    })
    if (glare) {
      setGlarePosition((prev) => ({ ...prev, opacity: 0 }))
    }
  }, [perspective, glare])

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...tiltStyle,
        transformStyle: "preserve-3d",
      }}
      className={`relative will-change-transform ${
        isHovered
          ? "shadow-2xl shadow-blue-500/15"
          : "shadow-lg shadow-slate-200/50"
      } ${className}`}
      {...props}
    >
      {/* Konten Utama */}
      <div className="relative z-10 h-full w-full">{children}</div>

      {/* Lapisan Glare (Pantulan Cahaya Dinamis) */}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-20 overflow-hidden"
          style={{
            opacity: glarePosition.opacity,
            background: `radial-gradient(circle 350px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.8), transparent 70%)`,
          }}
        />
      )}
    </div>
  )
}
export default TiltCard
