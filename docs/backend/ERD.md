```mermaid
erDiagram

    users ||--o{ pdp_vault : has
    users ||--o{ sekolah : "terkait (sekolah_terkait_npsn)"
    users ||--o{ laporan : "dikirim"
    users ||--o{ vote : "dibuat"
    users ||--o{ status_log : "actor"
    users ||--o{ ingest_job : "uploaded_by"
    users ||--o{ audit_log : "actor"

    sekolah ||--o{ sekolah_data_resmi : "memiliki"
    sekolah ||--o{ kondisi_sarana : "memiliki"
    sekolah ||--o{ laporan : "terkait"
    sekolah ||--o{ klaster : "memiliki"

    laporan ||--o{ laporan_foto : "memiliki"
    laporan ||--o{ klaster : "terkait"

    klaster ||--o{ vote : "memiliki"
    klaster ||--o{ status_log : "memiliki"

    %% Tables & Columns

    users {
        string id PK "UUID"
        string nama
        string email "UNIQUE"
        string password_hash
        string role "ENUM"
        string status_verifikasi "ENUM"
        string sekolah_terkait_npsn FK "nullable"
        datetime created_at
    }

    pdp_vault {
        string user_id PK FK "to users.id"
        blob nik_encrypted
        datetime created_at
    }

    sekolah {
        string npsn PK "VARCHAR(20)"
        string sekolah_id "UUID, nullable"
        string nama
        string alamat "nullable"
        string jenjang "ENUM(SD,SMP,SMA,SMK)"
        string status_sekolah "ENUM(Negeri,Swasta), nullable"
        string kecamatan "nullable"
        string desa_kelurahan "nullable"
        decimal lintang "nullable"
        decimal bujur "nullable"
        string akreditasi "nullable"
        string nama_kepsek "nullable"
        string sumber_data "default: Dapodik"
        date tanggal_pembaruan_data "nullable"
        date tanggal_verifikasi_baseline "nullable"
        datetime created_at
    }

    sekolah_data_resmi {
        string id PK "UUID"
        string sekolah_npsn FK "to sekolah.npsn"
        string rasio_guru_siswa "nullable"
        string indikator_kualitas_data "nullable"
        datetime created_at
    }

    kondisi_sarana {
        string id PK "UUID"
        string sekolah_npsn FK "to sekolah.npsn"
        string nama_ruang
        int jumlah "default: 0"
        int kondisi_baik "default: 0"
        int kondisi_rusak_ringan "default: 0"
        int kondisi_rusak_sedang "default: 0"
        int kondisi_rusak_berat "default: 0"
        string sumber "ENUM(dapodik,laporan_warga), default: dapodik"
        datetime created_at
        UNIQUE(sekolah_npsn, nama_ruang, sumber)
    }

    laporan {
        string id PK "UUID"
        string tracking_id "UNIQUE, indexed"
        string user_id FK "to users.id"
        string sekolah_npsn FK "to sekolah.npsn"
        string kategori "ENUM"
        string fasilitas_terkait "nullable"
        string kondisi_dilaporkan "ENUM, nullable"
        text deskripsi
        string klaster_id FK "to klaster.id, nullable"
        string status_sanggahan "ENUM, default: menunggu"
        datetime created_at
    }

    laporan_foto {
        string id PK "UUID"
        string laporan_id FK "to laporan.id"
        string storage_key "path di MinIO/S3"
        datetime created_at
    }

    klaster {
        string id PK "UUID"
        string label "nullable"
        string kategori "ENUM"
        string sekolah_npsn FK "to sekolah.npsn"
        decimal skor_keparahan "nullable"
        int jumlah_vote_terhitung "default: 0"
        decimal skor_prioritas "nullable"
        int urutan_prioritas_override "nullable"
        text alasan_override "nullable"
        string status_verifikasi "ENUM"
        string status_penanganan "ENUM, nullable"
        datetime updated_at
        datetime created_at
    }

    vote {
        string id PK "UUID"
        string klaster_id FK "to klaster.id"
        string user_id FK "to users.id"
        string status_vote "ENUM(pending,terhitung), default: pending"
        datetime created_at
        UNIQUE(klaster_id, user_id)
    }

    status_log {
        string id PK "UUID"
        string klaster_id FK "to klaster.id"
        string status "ENUM"
        text alasan "nullable"
        string actor_user_id FK "to users.id"
        datetime created_at
        -- Append-only (no UPDATE/DELETE)
    }

    ingest_job {
        string id PK "UUID"
        string file_name
        string status "ENUM(diproses,selesai,gagal), default: diproses"
        string uploaded_by FK "to users.id"
        int baris_diproses "nullable"
        int baris_gagal "nullable"
        datetime completed_at "nullable"
        datetime created_at
    }

    audit_log {
        string id PK "UUID"
        string aksi
        string actor_user_id FK "to users.id"
        string target "nullable"
        datetime created_at
    }
```

---

**Catatan:**
- Semua tabel menggunakan `uuid` (String(36)) sebagai PK (kecuali `sekolah` pakai `npsn` VARCHAR(20))
- Semua tabel punya `created_at` timestamp (via `TimestampMixin`)
- Relasi one-to-many (1:N) ditunjukkan dengan `||--o{`
- Relasi one-to-one (1:1) ditunjukkan dengan `||--||`
- Table `status_log` bersifat **append-only** (tidak ada UPDATE/DELETE dari aplikasi)
- `pdp_vault` dihapus ke DB (hanya di `app/core/pdp.py` yang akses)
