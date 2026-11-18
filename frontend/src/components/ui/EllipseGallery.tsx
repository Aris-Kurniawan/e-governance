import { useEffect, useRef, useState, CSSProperties } from "react"

// ─── Tipe data satu foto ───────────────────────────────────────────────────
interface GalleryPhoto {
  src: string
  alt: string
  label?: string
}

// ─── Konfigurasi posisi elips ──────────────────────────────────────────────
interface PhotoSlot {
  baseAngle: number // sudut dasar pada elips (derajat, 0 = kanan, 90 = bawah)
  rx: number        // semi-axis horizontal (% dari lebar container)
  ry: number        // semi-axis vertikal (% dari tinggi container)
  baseRotate: number// rotasi kemiringan foto (derajat)
  scale: number     // ukuran relatif foto
  delay: number     // delay animasi floating (ms)
  floatAmp: number  // amplitudo float (px)
}

// 24 slot membentuk formasi lingkaran elips yang padat dan penuh
const SLOTS: PhotoSlot[] = [
  // ── Sektor Atas & Kanan Atas (-90° s/d 0°) ──
  { baseAngle: -90, rx: 43, ry: 40, baseRotate: -4, scale: 0.96, delay: 0,    floatAmp: 8 },
  { baseAngle: -75, rx: 44, ry: 39, baseRotate:  7, scale: 1.02, delay: 350,  floatAmp: 10 },
  { baseAngle: -60, rx: 46, ry: 38, baseRotate: -6, scale: 1.08, delay: 700,  floatAmp: 7 },
  { baseAngle: -45, rx: 47, ry: 36, baseRotate:  8, scale: 0.98, delay: 200,  floatAmp: 11 },
  { baseAngle: -30, rx: 47, ry: 35, baseRotate: -8, scale: 1.04, delay: 550,  floatAmp: 9 },
  { baseAngle: -15, rx: 46, ry: 35, baseRotate:  6, scale: 0.95, delay: 900,  floatAmp: 12 },
  { baseAngle:   0, rx: 45, ry: 36, baseRotate: -5, scale: 1.06, delay: 150,  floatAmp: 8 },

  // ── Sektor Kanan Bawah & Bawah (15° s/d 90°) ──
  { baseAngle:  15, rx: 46, ry: 36, baseRotate:  9, scale: 0.94, delay: 600,  floatAmp: 10 },
  { baseAngle:  30, rx: 47, ry: 37, baseRotate: -7, scale: 1.05, delay: 850,  floatAmp: 9 },
  { baseAngle:  45, rx: 47, ry: 38, baseRotate:  8, scale: 1.00, delay: 300,  floatAmp: 11 },
  { baseAngle:  60, rx: 46, ry: 39, baseRotate: -6, scale: 0.96, delay: 750,  floatAmp: 8 },
  { baseAngle:  75, rx: 44, ry: 40, baseRotate:  7, scale: 1.04, delay: 100,  floatAmp: 10 },
  { baseAngle:  90, rx: 43, ry: 40, baseRotate: -4, scale: 0.98, delay: 450,  floatAmp: 7 },

  // ── Sektor Kiri Bawah (105° s/d 180°) ──
  { baseAngle: 105, rx: 44, ry: 40, baseRotate:  6, scale: 1.02, delay: 800,  floatAmp: 11 },
  { baseAngle: 120, rx: 46, ry: 39, baseRotate: -8, scale: 0.95, delay: 250,  floatAmp: 8 },
  { baseAngle: 135, rx: 47, ry: 38, baseRotate:  9, scale: 1.08, delay: 650,  floatAmp: 12 },
  { baseAngle: 150, rx: 47, ry: 37, baseRotate: -7, scale: 0.97, delay: 400,  floatAmp: 9 },
  { baseAngle: 165, rx: 46, ry: 36, baseRotate:  8, scale: 1.05, delay: 950,  floatAmp: 10 },
  { baseAngle: 180, rx: 45, ry: 36, baseRotate: -5, scale: 0.98, delay: 150,  floatAmp: 8 },

  // ── Sektor Kiri Atas (195° s/d 255°) ──
  { baseAngle: 195, rx: 46, ry: 36, baseRotate:  7, scale: 1.04, delay: 500,  floatAmp: 11 },
  { baseAngle: 210, rx: 47, ry: 37, baseRotate: -9, scale: 0.96, delay: 850,  floatAmp: 8 },
  { baseAngle: 225, rx: 47, ry: 38, baseRotate:  6, scale: 1.06, delay: 350,  floatAmp: 10 },
  { baseAngle: 240, rx: 46, ry: 39, baseRotate: -8, scale: 0.98, delay: 700,  floatAmp: 7 },
  { baseAngle: 255, rx: 44, ry: 40, baseRotate:  5, scale: 1.02, delay: 200,  floatAmp: 9 },
]

// ─── Foto asli kondisi sarpras sekolah rusak / perlu audit (Wikimedia Commons - Bebas Hak Cipta / CC & Public Domain) ───
const DEFAULT_PHOTOS: GalleryPhoto[] = [
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Figure%204%20Damaged%20or%20Removed%20Classroom%20Ceiling%20Tiles%20Due%20to%20Leaks%20in%20Recently-Installed%20Roofs%20(17427831625).jpg?width=500",
    alt: "Plafon ruang kelas jebol akibat rembesan air atap",
    label: "Kerusakan Plafon & Atap",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Hurricane%20Ike%20classroom%20damage%20at%20Johnson%20Bayou%20(LA)%20School.jpg?width=500",
    alt: "Ruang kelas rusak parah dengan material atap runtuh",
    label: "Ruang Belajar Rusak Berat",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/The%20roof%20removed%20from%20a%20classroom%20at%20Eastern%20York%20High%20School%2C%20PA.jpg?width=500",
    alt: "Rangka atap ruang kelas terbuka membutuhkan renovasi",
    label: "Renovasi Atap Gedung",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Moore%2C%20Okla.%2C%20May%2022%2C%202013%20--%20Tornado%20damaged%20classroom%20in%20the%20Tower%20Elementary%20school%20in%20Moore%2C%20Oklahoma.%20An%20F5%20tornado%20struck%20the%20area%20on%20May%2020th%2C%20causing%20widespread%20destruction.%20-%20DPLA%20-%20accfe2f01707b47bff5a809511225918.jpg?width=500",
    alt: "Dinding ruang kelas runtuh dan retak struktural",
    label: "Kerusakan Dinding & Struktur",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Chernobyl%20and%20Pripyat%20(4854365632).jpg?width=500",
    alt: "Meja dan kursi ruang kelas lapuk serta berdebu",
    label: "Mebel & Bangku Lapuk",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/%E5%9C%B0%E9%9C%87%E6%AF%80%E6%90%8D%E6%95%99%E5%AE%A4%20Earthquake%20Damaged%20Classrooms%20-%20panoramio.jpg?width=500",
    alt: "Ruang kelas retak parah pada pondasi dan lantai",
    label: "Retak Struktur Pondasi",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/New%20Orleans%20after%20Hurricane%20Katrina%20Federal%20Flood%20-%20School%20Classroom%2001.jpg?width=500",
    alt: "Kondisi ruang kelas pasca banjir dengan dinding lembab",
    label: "Dampak Genangan & Sanitasi",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/FEMA%20-%2044659%20-%20FEMA%20representative%20inspecing%20a%20damaged%20school%20in%20California.jpg?width=500",
    alt: "Inspeksi lapangan kondisi gedung sekolah retak dan rusak",
    label: "Audit Sarpras Lapangan",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Pripyat%20Abandoned%20School.jpg?width=500",
    alt: "Kondisi lorong dan fasilitas sekolah rusak terbengkalai",
    label: "Fasilitas Belajar Tak Layak",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/New%20Orleans%20after%20Hurricane%20Katrina%20Federal%20Flood%20-%20School%20Classroom%2002.jpg?width=500",
    alt: "Lantai dan dinding ruang kelas keropos mengelupas",
    label: "Dinding Keropos",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Wheatland%20NM%20School%20Classroom%201.jpg?width=500",
    alt: "Plafon kayu dan jendela sekolah tua rusak",
    label: "Langit-langit Rusak",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Abandoned%20High%20School%203%206%20(5772214795).jpg?width=500",
    alt: "Ruang auditorium dan panggung sekolah rusak berat",
    label: "Sarana Aula Tak Memadai",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Inside%20a%20classroom%20of%20a%20school%20in%20Kabul.jpg?width=500",
    alt: "Ruang kelas darurat tanpa bangku memadai",
    label: "Ruang Belajar Kritis",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Abandoned%20Art%20School%2083%20(6343311754).jpg?width=500",
    alt: "Jendela ventilasi pecah dan kusen kayu lapuk",
    label: "Jendela & Ventilasi Pecah",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/New%20Orleans%20after%20Hurricane%20Katrina%20Federal%20Flood%20-%20School%20Classroom%2003.jpg?width=500",
    alt: "Tumpukan bangku dan meja belajar rusak di kelas",
    label: "Mebel Kelas Rusak",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/FEMA%20-%2044661%20-%20Damaged%20school%20property%20in%20California.jpg?width=500",
    alt: "Kerusakan struktur gedung dan dinding luar sekolah",
    label: "Struktur Gedung Sekolah",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Old%20Classroom%20Interior%20(47024892221).jpg?width=500",
    alt: "Ruang kelas kayu usang dengan lantai lapuk",
    label: "Kondisi Lantai & Ruang",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Jeanne%20d%20Arc%20School%20Iran%20Tehran%20AbandonedClassroom.jpg?width=500",
    alt: "Ruang kelas terbengkalai dengan cat tembok rontok",
    label: "Cat & Plester Rontok",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/The%20roof%20removed%20from%20a%20classroom%20at%20Eastern%20York%20High%20School%2C%20PA%20(cropped).png?width=500",
    alt: "Perbaikan atap bocor ruang kelas sekolah",
    label: "Perbaikan Atap Sekolah",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Abandoned%20Art%20School%2055%20(6342402653).jpg?width=500",
    alt: "Kusen pintu dan jendela ruang kelas keropos",
    label: "Pintu & Kusen Rusak",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Abandoned%20High%20School%203%202%20(5772201667).jpg?width=500",
    alt: "Lorong kelas dengan plafon ambrol dan kabel menjuntai",
    label: "Plafon Lorong Ambrol",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/%E6%AF%80%E6%90%8D%E6%95%99%E5%AE%A4%E5%B1%95%E7%A4%BA%E5%8D%80%20Damaged%20Classroom%20Display%20Area%20-%20panoramio.jpg?width=500",
    alt: "Reruntuhan material dinding ruang kelas",
    label: "Reruntuhan Dinding Kelas",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Fire%20Damage%20at%20Carleton%20High%20School%20-%20geograph.org.uk%20-%201020619.jpg?width=500",
    alt: "Kerusakan berat instalasi fisik gedung sekolah",
    label: "Kerusakan Fisik Gedung",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Fire%20Damage%20at%20Carleton%20High%20School%20-%20geograph.org.uk%20-%201020657.jpg?width=500",
    alt: "Struktur atap dan kerangka baja gedung sekolah rusak",
    label: "Rangka Atap Rusak",
  },
]

// ─── Komponen utama ─────────────────────────────────────────────────────────
interface EllipseGalleryProps {
  photos?: GalleryPhoto[]
  centerStat?: string
  centerStatLabel?: string
  centerTitle?: string
  centerSubtitle?: string
  className?: string
}

export function EllipseGallery({
  photos = DEFAULT_PHOTOS,
  centerStat = "1.200+",
  centerStatLabel = "Laporan Terverifikasi",
  centerTitle = "Jejak Nyata Laporan Warga",
  centerSubtitle = "Setiap foto adalah langkah nyata menuju sekolah yang layak",
  className = "",
}: EllipseGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotationAngle, setRotationAngle] = useState(0)
  const angleRef = useRef(0)
  const lastScrollY = useRef(0)
  const scrollBoostRef = useRef(0)
  const isVisibleRef = useRef(true)

  // ─── Putaran Lambat Default Kontinu + Akselerasi Kecepatan Saat Di-scroll ───
  useEffect(() => {
    lastScrollY.current = window.scrollY

    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = Math.abs(currentY - lastScrollY.current)
      lastScrollY.current = currentY
      // Tambahkan akselerasi putaran sebanding dengan kecepatan scroll pengguna
      scrollBoostRef.current = Math.min(scrollBoostRef.current + delta * 0.035, 2.2)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    // IntersectionObserver agar animasi hanya aktif saat terlihat (sangat hemat CPU)
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
      },
      { threshold: 0.05 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    let rafId: number
    const BASE_SPEED = 0.075 // Kecepatan putaran santai saat idle (~4.5° per detik)

    const loop = () => {
      if (isVisibleRef.current) {
        // Redam akselerasi scroll kembali ke kecepatan dasar secara halus (natural decay)
        scrollBoostRef.current *= 0.94
        angleRef.current = (angleRef.current + BASE_SPEED + scrollBoostRef.current) % 360
        setRotationAngle(angleRef.current)
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      observer.disconnect()
      cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.style.opacity = "1"
    })
  }, [])

  const photoList = photos.slice(0, SLOTS.length)

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Inject keyframes animasi float */}
      <style>{`
        @keyframes eg-float {
          from { transform: translateY(0px); }
          to   { transform: translateY(calc(-1 * var(--amp, 10px))); }
        }
      `}</style>

      {/* Container elips */}
      <div
        ref={containerRef}
        className="relative mx-auto select-none"
        style={{
          width: "100%",
          maxWidth: "1160px",
          height: "560px",
          opacity: 0,
          transition: "opacity 0.8s ease",
        }}
      >
        {/* ── Foto-foto di slot elips ── */}
        {photoList.map((photo, idx) => {
          const slot = SLOTS[idx]
          // Sudut dinamis: berputar otomatis secara kontinu + bertambah cepat saat scroll
          const currentAngle = (slot.baseAngle + rotationAngle) % 360
          const rad = (currentAngle * Math.PI) / 180

          // Posisi % relatif terhadap titik tengah container (50%, 50%)
          const xPct = 50 + slot.rx * Math.cos(rad)
          const yPct = 50 + slot.ry * Math.sin(rad)
          const w = Math.round(132 * slot.scale)
          const h = Math.round(92 * slot.scale)

          // Kemiringan card halus mengikuti kurva gerak orbit
          const currentRotate = slot.baseRotate + Math.sin(rad) * 6

          const wrapStyle: CSSProperties = {
            position: "absolute",
            left: `${xPct}%`,
            top: `${yPct}%`,
            width: `${w}px`,
            height: `${h}px`,
            transform: `translate(-50%, -50%) rotate(${currentRotate}deg)`,
            zIndex: idx % 2 === 0 ? 3 : 2,
            willChange: "left, top, transform",
          }

          const floatStyle: CSSProperties = {
            width: "100%",
            height: "100%",
            ["--amp" as string]: `${slot.floatAmp}px`,
            animation: `eg-float ${3.2 + (idx % 6) * 0.35}s ease-in-out ${slot.delay}ms infinite alternate`,
          }

          return (
            <div key={idx} style={wrapStyle}>
              <div style={floatStyle}>
                <div className="w-full h-full overflow-hidden rounded-xl border border-white/60 shadow-[0_6px_22px_rgba(0,0,0,0.14)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.24)] transition-all duration-300 cursor-pointer group bg-slate-100">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    loading="lazy"
                    draggable={false}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      // Fallback gradient jika gambar gagal dimuat
                      const hue = (idx * 37 + 190) % 360
                      const target = e.currentTarget
                      target.style.display = "none"
                      const wrap = target.parentElement
                      if (wrap) {
                        wrap.style.background = `linear-gradient(135deg, hsl(${hue},60%,65%), hsl(${hue + 35},60%,50%))`
                        wrap.innerHTML = `<span style="color:white;font-size:0.85rem;font-weight:700;display:flex;align-items:center;justify-content:center;width:100%;height:100%;text-align:center;padding:4px">
                          ${photo.alt.slice(0, 14)}
                        </span>`
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* ── Center overlay: stat + teks ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none px-4">
          {/* Stat box */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-lg px-8 py-4 mb-4">
            <span className="block text-5xl font-extrabold text-blue-600 leading-none tracking-tight">
              {centerStat}
            </span>
            <span className="mt-1.5 block text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
              {centerStatLabel}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug max-w-[210px]">
            {centerTitle}
          </h3>
          <p className="mt-1.5 text-[11px] text-slate-500 max-w-[190px] leading-relaxed">
            {centerSubtitle}
          </p>

          {/* Panah bawah animasi */}
          <div
            className="mt-4 text-slate-400"
            style={{
              animation: "eg-float 1.8s ease-in-out infinite alternate",
              ["--amp" as string]: "6px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Gradient fade putih digeser ke tepi pinggir terluar agar tidak menabrak foto kolase ── */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 bg-gradient-to-r from-white via-white/40 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 bg-gradient-to-l from-white via-white/40 to-transparent z-10" />
    </div>
  )
}
