import { useState, useRef, useEffect, useMemo } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  Map, 
  SlidersHorizontal, 
  BarChart2, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Bell, 
  Building2,
  User,
  ExternalLink,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCheck,
  School,
  Ticket,
  BadgeCheck
} from "lucide-react"
import { daftarKlasterDinas } from "@/mocks/dinasData"
import { sekolahDirektoriList } from "@/mocks/sekolahDirektori"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface NotificationItem {
  id: string
  title: string
  desc: string
  time: string
  category: string
  unread: boolean
  link: string
  type: "kritis" | "warning" | "info" | "success"
}

export default function DinasLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Notifications state
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Klaster Kritis: KLS-2026-0891",
      desc: "SMAN 1 Sukodadi mencapai kuorum 8 laporan warga dengan anomali atap bocor Lab Kimia.",
      time: "5m lalu",
      category: "Mismatch Kritis",
      unread: true,
      link: "/dinas/antrian?id=kls-001",
      type: "kritis",
    },
    {
      id: "notif-2",
      title: "Dokumen Sanggahan Baru Diunggah",
      desc: "Komite SMKN 1 Lamongan mengunggah bukti sanggahan berita acara ruang bengkel mesin.",
      time: "18m lalu",
      category: "Sanggahan",
      unread: true,
      link: "/dinas/antrian?id=kls-002",
      type: "warning",
    },
    {
      id: "notif-3",
      title: "Klasterisasi Spasial DBSCAN Selesai",
      desc: "Algoritma spasial mengidentifikasi 5 klaster anomali sarpras aktif di Kecamatan Lamongan.",
      time: "1j lalu",
      category: "Spasial",
      unread: true,
      link: "/dinas/peta",
      type: "info",
    },
    {
      id: "notif-4",
      title: "Verifikasi Berita Acara Disahkan",
      desc: "Kadis Pendidikan mengesahkan revisi status ruang kelas 3B SDN 5 Turi ke status Rusak Ringan.",
      time: "2j lalu",
      category: "Verifikasi",
      unread: true,
      link: "/dinas/tabel",
      type: "success",
    },
    {
      id: "notif-5",
      title: "Deteksi Selisih Baseline Dapodik",
      desc: "Tercatat 14 laporan lapangan warga vs kondisi 'Baik' pada server Dapodik Kemendikbud.",
      time: "3j lalu",
      category: "Mismatch",
      unread: true,
      link: "/dinas/skor-kbm",
      type: "kritis",
    },
    {
      id: "notif-6",
      title: "Sinkronisasi Geo-Anchor Berhasil",
      desc: "Sinkronisasi koordinat -7.1197, 112.4145 dengan proyeksi EPSG:4326 (WGS84) telah selesai.",
      time: "5j lalu",
      category: "Sistem",
      unread: true,
      link: "/dinas/peta",
      type: "info",
    },
    {
      id: "notif-7",
      title: "Laporan Skor KBM Mingguan",
      desc: "Rekapitulasi indeks keselamatan belajar periode minggu ke-4 Agustus 2026 siap diunduh.",
      time: "1h lalu",
      category: "Laporan",
      unread: true,
      link: "/dinas/skor-kbm",
      type: "info",
    },
  ])

  const notifContainerRef = useRef<HTMLDivElement>(null)

  // Account menu state
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const accountContainerRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => n.unread).length

  // Click outside & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false)
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false)
      }
      if (
        accountContainerRef.current &&
        !accountContainerRef.current.contains(event.target as Node)
      ) {
        setIsAccountOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false)
        setIsNotifOpen(false)
        setIsAccountOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Search results calculation
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return { klaster: [], sekolah: [], total: 0 }

    const klasterMatches = daftarKlasterDinas.filter((item) =>
      item.nomorTiket.toLowerCase().includes(q) ||
      item.sekolah.toLowerCase().includes(q) ||
      item.npsn.includes(q) ||
      item.judul.toLowerCase().includes(q) ||
      item.kategori.toLowerCase().includes(q)
    ).slice(0, 4)

    const sekolahMatches = sekolahDirektoriList.filter((item) =>
      item.nama.toLowerCase().includes(q) ||
      item.npsn.includes(q) ||
      item.jenjang.toLowerCase().includes(q) ||
      item.alamat.toLowerCase().includes(q)
    ).slice(0, 4)

    return {
      klaster: klasterMatches,
      sekolah: sekolahMatches,
      total: klasterMatches.length + sekolahMatches.length,
    }
  }, [searchQuery])

  const handleSelectKlaster = (id: string) => {
    setIsSearchOpen(false)
    setSearchQuery("")
    navigate(`/dinas/antrian?id=${id}`)
  }

  const handleSelectSekolah = (npsn: string) => {
    setIsSearchOpen(false)
    setSearchQuery("")
    navigate(`/sekolah/${npsn}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearchOpen(false)
    navigate(`/dinas/antrian?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  const markAllNotifsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleNotifClick = (notif: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
    )
    setIsNotifOpen(false)
    navigate(notif.link)
  }

  const navItems = [
    {
      to: "/dinas/dashboard",
      label: "Dashboard Kadis",
      icon: LayoutDashboard,
      active: location.pathname === "/dinas" || location.pathname === "/dinas/dashboard",
    },
    {
      to: "/dinas/antrian",
      label: "Antrian Validasi",
      icon: ClipboardList,
      badge: "24",
      badgeColor: "bg-rose-100 text-rose-700 border border-rose-200",
      active: location.pathname.startsWith("/dinas/antrian"),
    },
    {
      to: "/dinas/ingest",
      label: "Ingest Data CSV",
      icon: FileText,
      active: location.pathname.startsWith("/dinas/ingest"),
    },
    {
      to: "/dinas/peta",
      label: "Peta Sebaran",
      icon: Map,
      active: location.pathname.startsWith("/dinas/peta"),
    },
    {
      to: "/dinas/tabel",
      label: "Tabel Verifikasi",
      icon: SlidersHorizontal,
      active: location.pathname.startsWith("/dinas/tabel"),
    },
    {
      to: "/dinas/skor-kbm",
      label: "Laporan Skor KBM",
      icon: BarChart2,
      active: location.pathname.startsWith("/dinas/skor-kbm"),
    },
    {
      to: "/dinas/log-audit",
      label: "Log Audit PDP",
      icon: ShieldCheck,
      active: location.pathname.startsWith("/dinas/log-audit"),
    },
  ]

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* ── Left Sidebar (Static width 260px) ── */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between sticky top-0 h-screen z-30">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <Link to="/dinas/dashboard" className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-1.5 shadow-sm shrink-0">
                <img
                  src="/logo-simakis-icon.png"
                  alt="Logo SIMAKIS"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/logo-simakis.png";
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[#0B3052] text-sm tracking-tight">SIMAKIS v2</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600 border border-slate-200">
                    RESMI
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 block">Disdik Kab. Lamongan</span>
              </div>
            </Link>
          </div>

          {/* Nav Menu */}
          <div className="p-3 space-y-1">
            <p className="px-3 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              MENU VALIDASI &amp; AUDIT
            </p>

            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    item.active
                      ? "bg-[#EBF3FC] text-[#0B3052] shadow-sm font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${item.active ? "text-[#0B3052]" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold leading-none ${item.badgeColor || "bg-slate-100 text-slate-600"}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom Profile & Portal Switcher */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-lg bg-[#0B3052] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                BH
              </div>
              <div className="leading-tight truncate">
                <span className="font-bold text-xs text-slate-800 block truncate">Bambang H., S.T.</span>
                <span className="text-[10px] text-slate-400 block truncate">Verifikator Sarpras</span>
              </div>
            </div>
            <button
              onClick={() => navigate("/dinas/login")}
              title="Keluar ke Portal Login Dinas"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-[#0B3052] py-1 transition-colors"
          >
            <span>Buka Portal Warga</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      {/* ── Right Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
              <Building2 className="h-4 w-4 text-[#0B3052]" />
              <span>Portal Dinas</span>
            </div>

            {/* Global Search Input with Functional Flyout */}
            <div className="relative w-full max-w-md" ref={searchContainerRef}>
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setIsSearchOpen(true)
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setIsSearchOpen(true)
                  }}
                  placeholder="Cari NPSN, nama sekolah, nomor tiket validasi..."
                  className="w-full h-8 pl-8 pr-8 text-xs bg-slate-50 border border-slate-200/80 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B3052] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
                      setIsSearchOpen(false)
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </form>

              {/* Search Results Dropdown Flyout */}
              {isSearchOpen && searchQuery.trim() && (
                <div className="absolute left-0 top-full mt-2 w-full min-w-[320px] sm:min-w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-[460px] flex flex-col">
                  {/* Results Header */}
                  <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Hasil pencarian: <strong className="text-slate-800">&quot;{searchQuery}&quot;</strong>
                    </span>
                    <span className="font-semibold text-slate-600">
                      {searchResults.total} ditemukan
                    </span>
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {/* Klaster / Tiket Matches */}
                    {searchResults.klaster.length > 0 && (
                      <div className="p-2 space-y-1">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Ticket className="h-3 w-3 text-[#0B3052]" />
                          <span>Klaster &amp; Tiket Validasi</span>
                        </div>
                        {searchResults.klaster.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectKlaster(item.id)}
                            className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono font-bold text-[10px] text-[#0B3052] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {item.nomorTiket}
                                </span>
                                <span className="font-semibold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                  {item.sekolah}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">{item.judul}</p>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                NPSN: {item.npsn} · {item.kecamatan}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  item.skor >= 70
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : item.skor >= 40
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                SKOR {item.skor}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sekolah Matches */}
                    {searchResults.sekolah.length > 0 && (
                      <div className="p-2 space-y-1">
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <School className="h-3 w-3 text-emerald-600" />
                          <span>Entitas Sekolah di Lamongan</span>
                        </div>
                        {searchResults.sekolah.map((item) => (
                          <div
                            key={item.npsn}
                            onClick={() => handleSelectSekolah(item.npsn)}
                            className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="rounded bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5">
                                  {item.jenjang}
                                </span>
                                <span className="font-semibold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                  {item.nama}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{item.alamat}</p>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                NPSN: {item.npsn}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  item.status === "Selisih Kritis"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : item.status === "Selisih Minor"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty State */}
                    {searchResults.total === 0 && (
                      <div className="p-6 text-center space-y-1">
                        <Search className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-700">
                          Tidak ditemukan data yang cocok
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Coba kata kunci lain seperti nama sekolah, nomor tiket (contoh: KLS-2026), atau NPSN.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Results Footer */}
                  <div className="p-2 bg-slate-50/80 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full h-7 rounded-lg text-xs font-semibold text-[#0B3052] hover:bg-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Lihat Semua di Antrian Validasi</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-3">
            {/* AI Stream status indicator */}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200/70 px-3 py-1 text-[11px] text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Stream: <strong>Idle</strong> · 14m lalu</span>
            </div>

            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifContainerRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                title="Notifikasi & Pembaruan Sistem"
                className={`relative h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                  isNotifOpen
                    ? "bg-blue-50 border-blue-300 text-[#0B3052]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">Notifikasi Sistem</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-[10px] px-2 py-0.2">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotifsAsRead}
                        className="text-[11px] font-semibold text-[#0B3052] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>Tandai dibaca</span>
                      </button>
                    )}
                  </div>

                  {/* List of Notifications */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotifClick(item)}
                        className={`p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start gap-3 ${
                          item.unread ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {item.type === "kritis" ? (
                            <div className="h-7 w-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                          ) : item.type === "warning" ? (
                            <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                          ) : item.type === "success" ? (
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-blue-100 text-[#0B3052] flex items-center justify-center">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                            {item.desc}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="rounded bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 border border-slate-200">
                              {item.category}
                            </span>
                            {item.unread && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="p-2.5 bg-slate-50/90 border-t border-slate-100 text-center">
                    <Link
                      to="/dinas/log-audit"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-bold text-[#0B3052] hover:underline flex items-center justify-center gap-1.5 py-1"
                    >
                      <span>Lihat Semua Riwayat di Log Audit PDP</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Account Menu with Dropdown */}
            <div className="relative" ref={accountContainerRef}>
              <button
                type="button"
                onClick={() => {
                  setIsAccountOpen((prev) => !prev)
                  setIsNotifOpen(false)
                  setIsSearchOpen(false)
                }}
                title="Menu Akun Verifikator"
                className={`relative h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  isAccountOpen
                    ? "bg-[#0B3052] text-white border-[#0B3052] shadow-sm"
                    : "bg-slate-100 border-slate-200/80 text-slate-700 hover:bg-slate-200/70"
                }`}
              >
                <User className="h-4 w-4" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
              </button>

              {/* Account Flyout Dropdown */}
              {isAccountOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100">
                  {/* Profile Card Header */}
                  <div className="p-4 bg-slate-50/90">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        BH
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-xs text-slate-900 truncate">Bambang H., S.T.</h3>
                          <span className="rounded bg-blue-100 text-[#0B3052] text-[9px] font-bold px-1.5 py-0.2 shrink-0">
                            PNS
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">bambang.sarpras@lamongankab.go.id</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIP: 19820415 200801 1 009</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">Status Hak Akses:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Verifikator Utama
                      </span>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="p-2 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false)
                        setIsProfileModalOpen(true)
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-slate-400 group-hover:text-[#0B3052]" />
                        <span>Profil &amp; Kredensial Pegawai</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false)
                        navigate("/dinas/antrian")
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <ClipboardList className="h-4 w-4 text-slate-400 group-hover:text-[#0B3052]" />
                        <span>Antrian Tugas Validasi</span>
                      </div>
                      <span className="rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 leading-none">
                        24
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false)
                        navigate("/dinas/log-audit")
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="h-4 w-4 text-slate-400 group-hover:text-[#0B3052]" />
                        <span>Log Audit PDP &amp; Sesi</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

                  {/* Portal Switcher */}
                  <div className="p-2">
                    <Link
                      to="/"
                      target="_blank"
                      onClick={() => setIsAccountOpen(false)}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0B3052] flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-[#0B3052]" />
                        <span>Buka Portal Warga (Publik)</span>
                      </div>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="p-2 bg-slate-50/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountOpen(false)
                        navigate("/dinas/login")
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Keluar dari Sesi Dinas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Sub-view Outlet */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Profil Verifikator Dialog Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#0B3052] text-white flex items-center justify-center font-bold text-base shadow-sm">
                BH
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900">
                  Bambang Hariyanto, S.T.
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Verifikator Sarpras · Sub-Bagian Perencanaan Disdik Lamongan
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">NIP:</span>
                <span className="font-mono font-bold text-slate-800">19820415 200801 1 009</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pangkat / Golongan:</span>
                <span className="font-semibold text-slate-800">Penata Tk. I (III/d)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Instansi:</span>
                <span className="font-semibold text-slate-800">Dinas Pendidikan Kab. Lamongan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email Resmi:</span>
                <span className="font-mono text-slate-800">bambang.sarpras@lamongankab.go.id</span>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 space-y-1">
              <div className="flex items-center gap-2 text-[#0B3052] font-bold text-xs">
                <BadgeCheck className="h-4 w-4 text-blue-600" />
                <span>Sertifikasi Tanda Tangan Elektronik</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Terkoneksi ke Otoritas Sertifikat Digital BSrE (BSSN) untuk pengesahan Berita Acara Rekonsiliasi Sarpras.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="h-9 px-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                setIsProfileModalOpen(false)
                navigate("/dinas/login")
              }}
              className="h-9 px-4 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs cursor-pointer transition-colors"
            >
              Keluar Sesi
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
