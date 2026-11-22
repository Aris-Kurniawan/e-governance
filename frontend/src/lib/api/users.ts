import { getData, getPage, type Page } from "./client"
import type { Role } from "./types"

/**
 * `GET /users`, `GET /users/statistik` — `admin` saja (F4.12).
 * NIK tidak pernah dikirim backend (D-29); hanya status verifikasi.
 */

export type StatusVerifikasi = "menunggu" | "terverifikasi" | "ditolak"

export interface AkunRow {
  user_id: string
  nama: string
  email: string
  role: Role
  status_verifikasi: StatusVerifikasi
  nip: string | null
  sekolah_terkait_npsn: string | null
  created_at: string | null
}

export interface AkunStatistik {
  total: number
  per_role: Record<Role, number>
  menunggu_verifikasi: number
}

export interface ListAkunParams {
  role?: Role | ""
  status_verifikasi?: StatusVerifikasi | ""
  q?: string
  page?: number
  page_size?: number
}

export function listAkun(params: ListAkunParams = {}): Promise<Page<AkunRow>> {
  return getPage<AkunRow>("/users", {
    role: params.role || undefined,
    status_verifikasi: params.status_verifikasi || undefined,
    q: params.q || undefined,
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
  })
}

export function statistikAkun(): Promise<AkunStatistik> {
  return getData<AkunStatistik>("/users/statistik")
}
