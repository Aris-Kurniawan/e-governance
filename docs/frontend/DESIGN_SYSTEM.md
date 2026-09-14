# DESIGN_SYSTEM.md — SIMAKIS

> Sumber kebenaran **tunggal** untuk palet warna, tipografi, spacing,
> radius, dan shadow. `frontend/UI_COMPONENTS.md` hanya boleh mengutip
> token dari sini, bukan mendefinisikan ulang. Semua nilai diambil
> langsung dari file Figma mockup tim (bukan estimasi).

**Referensi visual yang disepakati:** bankmandiri.co.id / bpjs-kesehatan.go.id
— clean, satu warna aksen dominan, shadow lembut konsisten, ikon flat
dipakai secukupnya, background section berselang-seling. GOV.UK/USWDS
ditolak (terlalu polos), estetika "Open Design"/AI generator ditolak
(terlalu ramai/generik untuk konteks e-gov).

---

## 1. Warna

| Token | Hex | Fungsi |
|---|---|---|
| `primary` | `#123A63` | Warna aksen dominan — header, tombol utama, elemen brand |
| `primary-light` | `#EAF1F8` | Background lembut untuk elemen bertema primary (badge, highlight) |
| `primary-border` | `#D3E1EF` | Border untuk elemen bertema primary |
| `text-primary` | `#101828` | Teks utama/heading |
| `text-secondary` | `#475467` | Teks sekunder/body |
| `text-tertiary` | `#8A94A6` | Teks tersier/caption/placeholder |
| `background` | `#FFFFFF` | Background dasar halaman |
| `background-alt` | `#F4F6F9` | Background alternatif antar section |
| `background-subtle` | `#F8FAFC` | Background box data resmi (mis. box data Dapodik) |
| `border` | `#E4E7EC` | Border/divider umum |
| `danger-text` | `#991B1B` | Teks status bahaya/kritis |
| `danger-light` | `#FEF2F2` | Background status bahaya |
| `danger-border` | `#FEE2E2` | Border status bahaya |
| `warning-text` | `#92400E` | Teks status peringatan |
| `warning-light` | `#FEF3C7` | Background status peringatan |
| `warning-border` | `#FDE68A` | Border status peringatan |

> Belum ada token `success` eksplisit di ekstraksi Figma — kalau perlu
> warna status "Selesai"/hijau, tentukan dulu nilainya dan catat di sini,
> jangan hardcode di komponen.

---

## 2. Tipografi

Satu keluarga font untuk seluruh aplikasi: **Plus Jakarta Sans**.

| Level | Ukuran |
|---|---|
| Display / H1 | 46px |
| H2 | 36px |
| H3 | 30px |
| H4 | 26px |
| Body Large | 18px |
| Body | 16px |
| Body Small | 14px |
| Label (Semi Bold) | 14px |
| Caption | 12px |
| Caption Medium | 12px |
| Overline | 10px (letter-spacing 0.5px) |

Angka (skor prioritas, NPSN, tanggal) selalu pakai `tabular-nums` — jangan
buat token font terpisah untuk ini.

Font weight yang digunakan: 400, 500, 600, 700, 800 (lihat pemuatan Google
Fonts di `frontend/SETUP.md` §4).

---

## 3. Border Radius

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `radius-sm` | 8px | Button, badge, input |
| `radius-md` | 12px | Card, container kecil |
| `radius-lg` | 16px | Section card, panel utama |
| `radius-full` | 9999px | Pill button, avatar, tag |

---

## 4. Shadow

Prinsip: **1 elemen bershadow per halaman** — jangan menumpuk shadow di
banyak elemen sekaligus, konsisten dengan estetika e-gov yang clean.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.03)` | Card & container biasa |
| `shadow-md` | `0 1px 2px rgba(0,0,0,0.05)` | Button & elevated card |

Tidak ada shadow yang lebih tebal dari `shadow-md` di manapun dalam sistem
ini.

---

## 5. Spacing Scale

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `space-1` | 4px | Inline gap |
| `space-2` | 8px | Icon gap |
| `space-3` | 12px | Cell padding |
| `space-4` | 16px | Card padding |
| `space-5` | 20px | Section inner padding |
| `space-6` | 24px | Group spacing |
| `space-8` | 32px | Section gap |
| `space-10` | 40px | Large section gap |
| `space-12` | 48px | Container padding, section break |

---

## 6. Konfigurasi Tailwind (rujukan implementasi)

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

Saat `npx shadcn@latest init`: Style **Default**, base color **Slate**
(paling dekat ke token `ink`/`border` di atas sebelum di-override), CSS
variables **Yes** — wajib supaya token institusional bisa di-swap tanpa
mengubah tiap komponen satu per satu.

---

## 7. Prinsip Desain Institusional

- Satu warna aksen dominan (`primary`), bukan gradient atau multi-aksen.
- Shadow sangat halus dan dipakai sangat terbatas — hindari kesan "AI
  generator generik" (badge berlebihan, bento-grid, gradient dark banner
  — sudah ditolak sebelumnya dari eksplorasi model GLM).
- Ikon flat, dipakai sewajarnya, bukan ilustrasi dekoratif berat kecuali
  komponen institusional resmi di §8.
- Background section berselang-seling (`background` ↔ `background-alt`)
  untuk memisahkan section tanpa border tebal.

---

## 8. Elemen Dekoratif Institusional

Detail implementasi komponen ada di `frontend/UI_COMPONENTS.md` §4 — daftar
di sini hanya untuk konteks desain:

- **Hairline Kop Dokumen Resmi** — divider tipis 1px di atas judul card
  penting, meniru kop surat resmi.
- **Background Contour Watermark Motif** — SVG garis kontur wilayah,
  opacity 4%, dipakai di latar hero/section.
- **Muted Institutional Seal Watermark Motif** — motif segel line-art
  samar di pojok card terkait legalitas/privasi.
- **Institutional Crest & Header** — lambang/crest kecil di header resmi
  (surat, laporan skor).

---

## 9. Yang Belum Ditentukan

- Token warna `success`/hijau untuk status "Selesai" (lihat `PAGE_STATES.md`
  §A5, B3) belum ada nilai hex resmi dari Figma — perlu ditentukan sebelum
  implementasi `StatusBadge.tsx`.
- Palet warna untuk chart (`charts/theme.ts`) harus diturunkan dari token
  `primary`/`danger`/`warning` di atas — belum ada mapping eksplisit warna
  per kategori chart (mis. warna tiap kategori di `IntegrityHeatmap.tsx`).
