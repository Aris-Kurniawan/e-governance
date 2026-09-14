# UI_COMPONENTS.md — SIMAKIS Frontend

Detail implementasi komponen: struktur folder, konvensi penamaan, dan
pemetaan shadcn/ui vs komponen custom institusional. Token warna/tipografi
lengkap seharusnya tinggal di `universal/DESIGN_SYSTEM.md` (belum dibuat) —
dokumen ini cuma mengutip token seperlunya sebagai konteks implementasi,
bukan sumber kebenarannya.

> **Sumber:** komponen dan token di bawah diekstrak langsung dari file Figma
> mockup yang sudah dibuat tim, bukan didesain ulang dari nol — supaya kode
> yang dibangun benar-benar cocok dengan hasil desain yang sudah disetujui.

---

## 0. Catatan penting sebelum mulai

Ada satu komponen di mockup Figma (halaman Log Audit PDP) bernama **"Integrity
Hash Audit"** dan **"Blockchain / Ledger Integrity"** yang **tidak ada
dasarnya** di PRD atau `ARCHITECTURE.md` manapun — kemungkinan besar ini
ditambahkan begitu saja oleh AI generator desain, bukan keputusan produk.
**Jangan diimplementasikan** sampai ini dikonfirmasi ulang dan (kalau memang
dipakai) dicatat sebagai keputusan resmi di `DECISIONS.md`. Komponen ini
sengaja **tidak** didaftarkan di bawah.

---

## 1. Token inti yang dipakai lintas komponen

Diambil dari file Figma (nilai final, bukan perkiraan):

**Warna** — `primary #123A63`, `text-primary #101828`, `text-secondary #475467`,
`text-tertiary #8A94A6`, `background #FFFFFF`, `background-alt #F4F6F9`,
`background-subtle #F8FAFC` (box data Dapodik), `primary-light #EAF1F8`,
`primary-border #D3E1EF`, `border/divider #E4E7EC`, `danger-text #991B1B`,
`danger-light #FEF2F2`, `danger-border #FEE2E2`, `warning-text #92400E`,
`warning-light #FEF3C7`, `warning-border #FDE68A`.

**Tipografi** — satu keluarga font `Plus Jakarta Sans` untuk semua level:
Display/H1 46px, H2 36px, H3 30px, H4 26px, Body Large 18px, Body 16px, Body
Small 14px, Label 14px (Semi Bold), Caption 12px, Caption Medium 12px,
Overline 10px (letter-spacing 0.5px).

**Border radius** — `radius-sm` 8px (button, badge, input), `radius-md` 12px
(card, container kecil), `radius-lg` 16px (section card, panel utama),
`radius-full` 9999px (pill button, avatar, tag).

**Shadow** — cuma 2 token, sangat halus (sesuai prinsip "1 elemen bershadow
per halaman" di `DESIGN_SYSTEM` v2): `shadow-sm` (0,1 / blur 2px / `#000` 3%)
untuk card & container biasa, `shadow-md` (0,1 / blur 2px / `#000` 5%) untuk
button & elevated card. Tidak ada shadow lebih tebal dari ini di manapun.

**Spacing scale** — `space-1` 4px (inline gap), `space-2` 8px (icon gap),
`space-3` 12px (cell padding), `space-4` 16px (card padding), `space-5` 20px
(section inner padding), `space-6` 24px (group spacing), `space-8` 32px
(section gap), `space-10` 40px (large section gap), `space-12` 48px
(container padding, section break).

Konfigurasi `tailwind.config.js`:

```js
export default {
  theme: {
    extend: {
      fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#123A63', light: '#EAF1F8', border: '#D3E1EF' },
        ink: { DEFAULT: '#101828', secondary: '#475467', tertiary: '#8A94A6' },
        surface: { DEFAULT: '#FFFFFF', alt: '#F4F6F9', subtle: '#F8FAFC' },
        border: { DEFAULT: '#E4E7EC' },
        danger: { text: '#991B1B', light: '#FEF2F2', border: '#FEE2E2' },
        warning: { text: '#92400E', light: '#FEF3C7', border: '#FDE68A' },
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px' },
      spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px' },
    },
  },
}
```

Angka (skor prioritas, NPSN, tanggal) selalu pakai class util `tabular-nums`
(bawaan Tailwind) — jangan bikin token font terpisah untuk ini.

---

## 2. Struktur folder `src/components/`

```
components/
├── ui/                    # shadcn/ui generated — JANGAN edit manual, re-generate kalau perlu ubah
├── institutional/          # komponen dekoratif khas institusi (lihat §4)
├── composite/               # komponen gabungan spesifik SIMAKIS (lihat §5)
├── charts/                 # wrapper ECharts (lihat §6)
├── map/                    # wrapper Leaflet (lihat §7)
└── layout/                  # shell halaman per persona (lihat §8)
```

**Konvensi penamaan:** PascalCase per file (`KpiCard.tsx`, bukan `kpi-card.tsx`),
satu komponen per file, nama file = nama export default. Folder `ui/` ikut
konvensi shadcn (kebab-case) — jangan disamakan dengan folder lain.

---

## 3. Komponen shadcn/ui yang dipakai

Generate lewat `npx shadcn@latest add <nama>`, jangan ditulis manual:

`button`, `card`, `badge`, `input`, `select`, `checkbox`, `table`, `tabs`,
`dialog`, `sheet`, `alert`, `avatar`, `collapsible`, `separator`, `tooltip`.

Semua styling default shadcn (radius, shadow) **wajib di-override** lewat
token di §1 — jangan pakai className bawaan `shadow-sm`/`shadow-md`
Tailwind default tanpa cek dulu apakah nilainya cocok dengan token institusi
di atas.

---

## 4. Komponen dekoratif institusional (`components/institutional/`)

Elemen dekoratif kontekstual yang sebelumnya cuma ada di deskripsi prompt
desain, sekarang terkonfirmasi ada implementasinya di mockup Figma:

| Komponen | Nama di Figma | Fungsi |
|---|---|---|
| `HairlineKop.tsx` | "Hairline Kop Dokumen Resmi" | 1px divider tipis di atas judul card penting, meniru kop surat resmi |
| `WatermarkContour.tsx` | "Background Contour Watermark Motif (4% opacity)" | SVG garis kontur wilayah, opacity rendah, latar hero/section |
| `SealMotif.tsx` | "Muted Institutional Seal Watermark Motif" | Motif segel line-art samar di pojok card terkait legalitas/privasi |
| `InstitutionalCrest.tsx` | "Institutional Crest & Header" | Lambang/crest kecil di header resmi (surat, laporan skor) |

Semua komponen ini **presentational only** — tidak menerima data, cuma props
opsional untuk posisi (`position="top-right"` dsb) dan opacity override.

---

## 5. Komponen composite (`components/composite/`)

Komponen gabungan yang dipakai berulang di banyak halaman:

| Komponen | Nama di Figma | Dipakai di |
|---|---|---|
| `KpiCard.tsx` + `KpiGrid.tsx` | "Three Institutional KPI Cards", "KPI Metrics Grid (4 Cards)", "Baris 4 KPI Card Ringkasan Dampak KBM" | Dashboard Warga, Dashboard Kadis, Laporan Skor KBM |
| `InstitutionalStepper.tsx` | "Institutional Stepper: 4 Stages" | Status tindak lanjut laporan (Sanggahan → Verifikasi → Audit → Pembaruan) |
| `StatusBadge.tsx` | badge Mismatch/Kejadian Baru/Terverifikasi dsb | Semua halaman yang menampilkan status isu |
| `InspectorSheet.tsx` | "Floating Inspector Sheet (Pinned Right Overlay)" | Panel detail klaster di Antrian Validasi — dibangun di atas `<Sheet>` shadcn, dipin ke kanan bukan overlay tengah |
| `NumberedPagination.tsx` | "Explicit Numbered Pagination (Anti infinite-scroll mandate)" | Semua tabel besar (Tabel Verifikasi, Log Audit, Riwayat Ingest) — **wajib** angka halaman eksplisit, tidak boleh infinite scroll, sesuai catatan di prompt Portal Pemerintah sebelumnya |
| `InstitutionalTable.tsx` | pola table di semua "Table" node Figma | Header selalu `bg-primary` + teks putih, baris genap `bg-[#F9FAFB]`, border `border` token — dipakai sebagai base untuk semua tabel data, termasuk contoh di Design System Documentation Figma-nya sendiri |
| `ComparisonBox.tsx` | "Data Dapodik Box" / "Fakta Lapangan Box" | Preview card hero Landing Page, panel detail klaster |

---

## 6. Chart (`components/charts/`), wrapper `echarts-for-react`

| Komponen | Nama di Figma | Tipe chart |
|---|---|---|
| `AreaTrendChart.tsx` | "Chart Left: Monthly Issue Trend (Area Chart)" | Line + area, tren isu per bulan |
| `HorizontalBarChart.tsx` | "Chart Right: Facility Distribution", "Bar Chart 8 Sekolah Tertinggi" | Dipakai untuk distribusi fasilitas & peringkat skor dampak KBM |
| `IntegrityHeatmap.tsx` | "Matriks Integritas Sarana" (heatmap) | Matriks sekolah × fasilitas |
| `DamageDonutChart.tsx` | "Diagram Kondisi Kerusakan Ruang" | Donut, Detail Sekolah |

Semua chart wajib pakai palet warna dari §1 (`danger`/`warning`/`primary`),
**bukan** palet default ECharts — set lewat `color: [...]` di option config,
satu tempat terpusat (`charts/theme.ts`), jangan hardcode di tiap komponen.

---

## 7. Peta (`components/map/`), wrapper `react-leaflet`

| Komponen | Fungsi |
|---|---|
| `MapContainer.tsx` | Wrapper `<MapContainer>` react-leaflet + tile OSM dari `VITE_MAP_TILE_URL` |
| `SeverityMarker.tsx` | Marker lingkaran, warna sesuai ambang skor (hijau/kuning/merah), ukuran proporsional jumlah isu — sesuai "Marker SMAN 1 Sukodadi (Skor 82)" dkk di Figma |
| `MapLegend.tsx` | "Legend Card in Corner" — legenda ambang warna, posisi mengambang |

---

## 8. Layout shell (`components/layout/`)

Dua shell terpisah sesuai dua persona (Warga vs Pemerintah), **jangan**
dipaksa satu layout serba guna:

| Komponen | Dipakai untuk |
|---|---|
| `PublicLayout.tsx` | Landing Page, Login, Registrasi (header sederhana, tanpa sidebar) |
| `WargaLayout.tsx` | Dashboard Warga, Direktori, Detail Sekolah, dst (header + nav publik) |
| `PemerintahLayout.tsx` | Semua halaman Portal Pemerintah — sidebar kiri (menu "1. Dashboard Kadis" s/d "7. Log Audit PDP", persis urutan di Figma) + strip status bar aksen 3px di atas + top bar dengan search & notifikasi |

---

## 9. Yang belum bisa dikerjakan (menunggu file lain)

- **Props tipe data** (bentuk `laporan`, `klaster`, `skorPrioritas`, dst) —
  menunggu `universal/INTERFACES.md`. Sampai itu ada, komponen composite di
  atas dibangun dulu dengan props generik/contoh statis, bukan tipe final.
- **Warna & tipografi lengkap sebagai satu sumber kebenaran** — idealnya
  pindah ke `universal/DESIGN_SYSTEM.md`, dokumen ini cuma menumpang kutip
  supaya tidak nunggu file itu jadi duluan.
