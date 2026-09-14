# PAGE_STATES.md — SIMAKIS Frontend

Breakdown state/kondisi yang wajib di-handle tiap halaman, diturunkan
langsung dari titik percabangan (decision node) di FLOWS.md. Gunakan
dokumen ini sebagai checklist saat membangun komponen — setiap baris
adalah satu kondisi UI yang harus punya tampilan berbeda, bukan
diasumsikan "pasti berhasil" (happy path saja).

---

## A. Sisi Warga

### A1. Landing / Cek Status Akun
Sumber: Alur Warga, node B ("Akun sudah terverifikasi?")

| Kondisi | Tampilan |
|---|---|
| Belum terverifikasi | Tampilkan halaman informasi publik + CTA "Ajukan Verifikasi Akun" |
| Sudah terverifikasi | Langsung arahkan ke Direktori Sekolah / Dashboard Utama Warga |

### A2. Detail Sekolah — Pilih Aktivitas
Sumber: Alur Warga, node G ("Pilih aktivitas")

| Kondisi | Tampilan |
|---|---|
| Melihat isu | Tampilkan daftar klaster isu di sekolah tersebut |
| Melaporkan isu | Buka Form Laporan (lihat A4) |

### A3. Detail Klaster Isu — Vote
Sumber: Alur Warga, node I ("Ingin memberikan vote?")

| Kondisi | Tampilan |
|---|---|
| Tidak vote | Tampilkan info isu saja (read-only), tombol "Vote" tetap ada untuk aksi lanjutan |
| Ya, vote | Tombol "Vote" berubah state → konfirmasi → tampilkan "Vote Tercatat" |
| *(dari sesi sebelumnya)* Akun masih dalam masa tunda verifikasi | Vote tersimpan status "Pending", badge "Menunggu Masa Tunda" — BUKAN "Sudah Vote" |
| Sudah pernah vote sebelumnya | Tombol berubah jadi "Sudah Vote" (disabled) |

### A4. Form Laporan
Sumber: Alur Warga, node M–O (Isi form → Pilih kategori → Kirim)

| Kondisi | Tampilan |
|---|---|
| Kategori = Infrastruktur/Sarana | Tampilkan dropdown "Pilih fasilitas" + card data resmi pembanding (lihat sesi Detail Sekolah) |
| Kategori = Ketersediaan Tenaga Pengajar | Sembunyikan dropdown fasilitas, tampilkan info rasio guru:siswa sebagai pembanding |
| Kategori = Lainnya | Sembunyikan seluruh card pembanding data resmi (tidak ada cross-check) |
| Setelah kirim | Tampilkan state "Laporan Berhasil Dikirim" dengan tracking ID, redirect/tombol ke Riwayat Laporan |

### A5. Status Tindak Lanjut (dilihat semua jalur: vote, lapor, atau lihat isu tanpa vote)
Sumber: Alur Warga, node Q ("Melihat status tindak lanjut") — titik konvergensi 3 jalur

| Kondisi | Tampilan |
|---|---|
| Status dari sisi Dinas = Menunggu Verifikasi | Badge netral, teks "Sedang ditinjau" |
| Status = Tidak Terverifikasi | Badge merah + **tampilkan alasan verifikasi** (wajib ada field ini, bukan cuma badge) |
| Status = Dalam Antrian Prioritas | Badge kuning |
| Status = Dalam Proses | Badge kuning/biru, stepper aktif di tahap "Dalam Proses" |
| Status = Selesai | Badge hijau, stepper penuh |
| Status = Tidak Dapat Ditindaklanjuti | Badge abu/merah + **tampilkan alasan** (field wajib, sama seperti Tidak Terverifikasi) |

---

## B. Sisi Pemerintah / Petugas (Dinas)

### B1. Dashboard — Hasil Verifikasi Klaster
Sumber: Alur Pemerintah, node D ("Hasil verifikasi") — 3 cabang

| Kondisi | Tampilan | Aksi Lanjutan |
|---|---|---|
| Perlu Informasi Tambahan | Form/modal "Minta informasi tambahan" ke pelapor | Klaster kembali ke dashboard, badge "Menunggu Verifikasi" |
| Tidak Terverifikasi | Form wajib isi "Alasan verifikasi" | Klaster tetap tampil ke warga dengan badge merah + alasan (lihat A5) |
| Terverifikasi | Tidak perlu input tambahan | Klaster masuk perhitungan skor prioritas |

### B2. Peninjauan Prioritas — Kepala Dinas
Sumber: Alur Pemerintah, node N ("Perlu penyesuaian prioritas?")

| Kondisi | Tampilan |
|---|---|
| Tidak (pakai skor sistem) | Daftar prioritas tampil apa adanya dari perhitungan otomatis |
| Ya (override manual) | Buka mode edit urutan (drag-reorder atau input manual peringkat), field wajib **catatan alasan override** untuk audit trail |

### B3. Update Status Penanganan
Sumber: Alur Pemerintah, node T ("Hasil penanganan") — 3 cabang

| Kondisi | Tampilan | Efek Lanjutan |
|---|---|---|
| Selesai | Form konfirmasi ringkas | Status akhir, tidak bisa diubah lagi (sesuai prinsip accountability append-only) |
| Masih berlangsung | Form update progres (opsional catatan) | **Loop kembali** ke halaman "Petugas melaksanakan tindak lanjut" — jangan anggap ini state akhir |
| Tidak dapat ditindaklanjuti | Form wajib isi **alasan** | Status akhir, alasan wajib tampil ke publik (lihat A5) |

---

## C. Aturan Lintas-Halaman

1. **Setiap field "alasan"** (Tidak Terverifikasi, Tidak Dapat Ditindaklanjuti, Override Prioritas) bersifat **wajib diisi**, bukan opsional — form tidak boleh submit tanpa itu.
2. **Tidak ada status yang menghapus data** — "Tidak Terverifikasi" dan "Tidak Dapat Ditindaklanjuti" tetap menyimpan dan menampilkan klaster/laporan, bukan menyembunyikannya. Konsisten dengan prinsip "Menunggu Prioritas" yang sudah disepakati sebelumnya.
3. **Loop "Masih berlangsung"** butuh komponen status yang reusable dan bisa dipanggil ulang berkali-kali dari halaman yang sama — hindari membangunnya sebagai one-time form yang hilang setelah submit pertama.
