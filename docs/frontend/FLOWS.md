# FLOWS.md — SIMAKIS Frontend

Dokumen ini memformalkan dua alur utama sistem ke dalam Mermaid, sebagai
rujukan tunggal bagi frontend saat membangun routing, state, dan kondisi
tampilan. Diturunkan langsung dari flowchart yang disusun tim (drawio).

---

## 1. Alur Warga

```mermaid
flowchart TD
    START([START]) --> A[Warga membuka SIMAKIS]
    A --> B{Akun sudah terverifikasi?}

    B -- Belum --> C[Melihat informasi publik]
    C --> D[Ajukan verifikasi akun]
    D --> E[Memilih sekolah]

    B -- Sudah --> E

    E --> F[Melihat data dan kondisi sekolah]
    F --> G{Pilih aktivitas}

    G -- Melihat isu --> H[Melihat klaster isu]
    H --> I{Ingin memberikan vote?}
    I -- Tidak --> J[Melihat informasi isu]
    I -- Ya --> K[Memberikan vote pada klaster isu]
    K --> L[Vote tercatat]

    G -- Melaporkan isu --> M[Isi form laporan]
    M --> N[Pilih kategori dan tulis deskripsi]
    N --> O[Kirim laporan]
    O --> P[Laporan berhasil dikirim]

    J --> Q[Melihat status tindak lanjut]
    L --> Q
    P --> Q

    Q --> R[Memantau perkembangan tindak lanjut]
    R --> END1([END])
```

---

## 2. Alur Pemerintah / Petugas

```mermaid
flowchart TD
    START([START]) --> A[Pemerintah/Petugas login ke SIMAKIS]
    A --> B[Melihat dashboard laporan dan klaster isu]
    B --> C[Meninjau klaster isu]
    C --> D{Hasil verifikasi}

    D -- Perlu Informasi Tambahan --> E[Meminta informasi atau laporan tambahan]
    E --> F[Klaster tetap tampil sebagai Menunggu Verifikasi]
    F --> B

    D -- Tidak Terverifikasi --> G[Menetapkan status Tidak Terverifikasi]
    G --> H[Menampilkan alasan verifikasi]

    D -- Terverifikasi --> I[Menetapkan status Terverifikasi]
    I --> J[Klaster tetap tampil dan dapat diprioritaskan]

    H --> K[Memantau perkembangan partisipasi warga]
    J --> K

    K --> L[Melihat hasil prioritas dari sistem]
    L --> M[Kepala Dinas meninjau daftar prioritas]
    M --> N{Perlu penyesuaian prioritas?}

    N -- Ya --> O[Kepala Dinas menetapkan prioritas manual]
    N -- Tidak --> P[Menggunakan prioritas sistem]

    O --> Q[Menetapkan tindak lanjut]
    P --> Q

    Q --> R[Petugas melaksanakan tindak lanjut]
    R --> S[Memperbarui status penanganan]
    S --> T{Hasil penanganan}

    T -- Selesai --> U[Status Selesai]
    T -- Masih berlangsung --> V[Status Dalam Proses]
    V --> R
    T -- Tidak dapat ditindaklanjuti --> W[Status Tidak Dapat Ditindaklanjuti + Alasan]

    U --> X[Status dan riwayat tampil publik]
    W --> X

    X --> END1([END])
```

---

## Catatan penting untuk frontend

- **Loop "Masih berlangsung"** (Alur Pemerintah, node T→V→R) berarti UI status
  harus mendukung update berulang tanpa reload halaman penuh — gunakan
  polling/refetch pada komponen status, bukan hard navigation.
- **Loop "Perlu Informasi Tambahan"** (node D→E→F→B) mengembalikan klaster
  ke daftar dashboard dengan status "Menunggu Verifikasi" — pastikan badge
  ini konsisten dengan status yang sama di sisi warga.
- **Titik percabangan (decision node)** di kedua alur adalah sumber utama
  untuk PAGE_STATES.md — setiap decision node berarti minimal 2 varian
  tampilan/komponen kondisional yang harus disediakan.
