---
version: 1.0.0
name: SIMAKIS-Design-System
description: Design System SIMAKIS berbasis Bento Grid Architecture (referensi Medspa Practice Management) dengan palet resmi E-Government Dinas Pendidikan Kabupaten Lamongan.
colors:
  primary: "#123A63"
  primary-light: "#EAF1F8"
  primary-border: "#D3E1EF"
  background-canvas: "#F4F5F7"
  surface-card: "#FFFFFF"
  border-subtle: "#E4E7EC"
  border-strong: "#D0D5DD"
  text-primary: "#101828"
  text-secondary: "#475467"
  text-muted: "#6B7280"
  status-critical-bg: "#FEF3F2"
  status-critical-text: "#B42318"
  status-critical-border: "#FECDCA"
  status-warning-bg: "#FEF6EE"
  status-warning-text: "#B54708"
  status-warning-border: "#FEDF89"
  status-success-bg: "#ECFDF3"
  status-success-text: "#027A48"
  status-success-border: "#A6F4C5"
  status-info-bg: "#EFF8FF"
  status-info-text: "#175CD3"
  status-info-border: "#B2DDFF"
typography:
  font-family-sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  font-family-mono: "'JetBrains Mono', ui-monospace, monospace"
  h1:
    fontSize: "1.75rem" # 28px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
  h2:
    fontSize: "1.25rem" # 20px
    fontWeight: "600"
    lineHeight: "1.3"
  h3:
    fontSize: "1rem" # 16px
    fontWeight: "600"
    lineHeight: "1.4"
  body-md:
    fontSize: "0.875rem" # 14px
    fontWeight: "400"
    lineHeight: "1.5"
  body-sm:
    fontSize: "0.75rem" # 12px
    fontWeight: "400"
    lineHeight: "1.4"
  badge:
    fontSize: "0.6875rem" # 11px
    fontWeight: "500"
    letterSpacing: "0.02em"
rounded:
  card: "16px"
  card-hero: "20px"
  pill: "9999px"
  element: "8px"
  input: "8px"
spacing:
  sidebar-width: "236px"
  topbar-height: "56px"
  grid-gap: "16px"
  card-padding: "20px"
---

# SPESIFIKASI DESIGN SYSTEM SIMAKIS (BENTO GRID ARCHITECTURE)

## 1. Filosofi & Visi Desain
Mengadopsi struktur visual **Bento Grid** kelas enterprise (terinspirasi dari platform presisi tinggi seperti *Medspa Management / Monty*), dirancang khusus untuk membuang kesan kaku template e-government lama.
* **Density over Decoration:** Mengutamakan keterbacaan data, rasio angka KBM, dan bukti audit visual daripada ruang kosong tak bermakna.
* **Anti-Slop Discipline:** Tidak menggunakan gradien ungu AI neon, tidak ada sudut membulat sembarangan, batas kontras WCAG AA min (4.5:1), dan konsistensi penuh warna aksen `#123A63`.
* **Keamanan Privasi (UU PDP):** UI secara konsisten menampilkan status sanitasi EXIF dan proteksi brankas data (`pdp_vault`).

---

## 2. Token Warna & Palet Resmi

| Kategori Token | Nilai Hex | Penggunaan UI |
|---|:---:|---|
| `primary` | `#123A63` | Warna aksen dominan: tombol utama, active pill navbar, header high-priority |
| `primary-light` | `#EAF1F8` | Latar belakang hero identitas sekolah / klaster, highlight box |
| `primary-border` | `#D3E1EF` | Garis tepi (*stroke*) untuk kartu bertema primary |
| `background-canvas` | `#F4F5F7` | Latar kanvas kerja di belakang kartu Bento |
| `surface-card` | `#FFFFFF` | Permukaan kartu Bento, baris tabel, dan modal dialog |
| `text-primary` | `#101828` | Teks utama, judul, angka metrik tebal |
| `text-secondary` | `#475467` | Teks sub-judul, deskripsi kerusakan, keterangan pelapor |
| `text-muted` | `#6B7280` | Label tabel kecil, timestamp, breadcrumb navigasi |
| `status-critical` | `#B42318` | Badge & teks tingkat kerusakan Kritis (Skor KBM $\ge 70$) |
| `status-warning` | `#B54708` | Badge & teks tingkat kerusakan Tinggi (Skor KBM $50 - 69$) |
| `status-success` | `#027A48` | Badge status "Divalidasi", tahapan selesai, lolos audit AI |

---

## 3. Komponen Baku Bento Grid

### A. Kartu Identitas Hero (Hero Profile Card)
* **Ukuran Standar:** Lebar 450px – 480px, Tinggi 210px.
* **Latar:** `#EAF1F8` dengan radius `20px` dan border `1px solid #D3E1EF`.
* **Anatomi:**
  * Kiri: Foto thumbnail gedung / sarpras ber-radius 14px dengan tag NPSN.
  * Kanan Atas: Trio badge kapsul (`[Status Urgensi]`, `[ID Klaster]`, `[Kategori Sarpras]`).
  * Tengah: Nama Sekolah (Font Size 18px–20px bold) + Sub-teks demografi siswa.
  * Bawah: Baris tombol aksi cepat (Telepon, Lokasi Peta, Tombol Pil `+ Berita Acara`, dan menu overflow `•••`).

### B. Grid Metrik 2×2 (2x2 Metric Grid)
* **Ukuran:** 4 kartu berukuran masing-masing $\approx 340 \text{px} \times 98 \text{px}$.
* **Hierarki:**
  * Kartu Netral (Putih): Angka hitam tebal + keterangan tren waktu.
  * Kartu Sorot (Soft Azure `#EAF1F8`): Skor KBM bersimbol petir merah.
  * Kartu Status Sukses (`#FFFFFF` + badge hijau): Konsensus AI & jumlah laporan sinkron.
  * Kartu Jadwal Lapangan (Solid Navy `#123A63`): Teks putih kontras tinggi untuk jadwal tim teknis.

### C. Alur Penanganan Sarpras (Infrastructure Journey Pipeline)
* **Penempatan:** Kartu lebar penuh (*full-width card*), tinggi 104px.
* **Struktur:** Garis horizontal penghubung dengan 7 simpul tahapan SP4N-LAPOR!:
  1. *Aduan Masuk* (Lingkaran hijau mint + ikon centang `✓`)
  2. *Sanitasi PDP* (Lingkaran hijau mint, penanda EXIF bersih)
  3. *Klasterisasi AI* (Lingkaran hijau mint, penanda algoritma adaptif)
  4. *Verifikasi Dinas* (Lingkaran solid Deep Navy `#123A63` + ikon bintang `★` = Tahap Aktif)
  5. *Penetapan RKT* (Lingkaran outline abu-abu putus-putus)
  6. *Pengerjaan Fisik* (Lingkaran outline abu-abu)
  7. *BAST & Selesai* (Lingkaran outline abu-abu)

### D. Modul Komparasi Fisik (Before & After Photo Comparison)
* **Ukuran:** Lebar 424px, Tinggi 520px.
* **Fitur Utama:**
  * Kontainer split visual 50/50: Foto aduan pelapor (kiri) vs Arsip resmi Dapodik (kanan).
  * Batang slider pembagi tengah dengan handle tombol `◂▸`.
  * Tombol kapsul pemilih sudut pandang: `[Tampak Depan]`, `[Rangka Plafon]`, `[Lantai Kelas]`.
  * Banner Forensik AI: Kotak hijau mint penanda lolos uji kemiripan dan anti-duplikasi foto lama.
  * Sepasang tombol aksi eksekusi: `[✓ Sahkan Klaster]` dan `[Jadwalkan Tim Teknis]`.

---

## 4. Konfigurasi Tailwind CSS (v3 / v4)

```javascript
// tailwind.config.js snippet
module.exports = {
  theme: {
    extend: {
      colors: {
        simakis: {
          navy: '#123A63',
          'navy-dark': '#0E1F38',
          azure: '#EAF1F8',
          'azure-border': '#D3E1EF',
          canvas: '#F4F5F7',
        },
        status: {
          critical: { bg: '#FEF3F2', text: '#B42318', border: '#FECDCA' },
          warning: { bg: '#FEF6EE', text: '#B54708', border: '#FEDF89' },
          success: { bg: '#ECFDF3', text: '#027A48', border: '#A6F4C5' },
        }
      },
      borderRadius: {
        'bento': '16px',
        'bento-hero': '20px',
      }
    }
  }
}
```
