import type { LoginResponse, RegisterResponse, UserMe } from "@/lib/api/types"

export const usersContoh: Record<string, UserMe> = {
  warga_umum: { user_id: "usr-001", nama: "Budi Santoso", role: "warga_umum", status_verifikasi: "menunggu" },
  warga_terverifikasi: { user_id: "usr-002", nama: "Siti Aminah", role: "warga_terverifikasi", status_verifikasi: "terverifikasi" },
  komite_sekolah: { user_id: "usr-003", nama: "Ahmad Fauzi", role: "komite_sekolah", status_verifikasi: "terverifikasi" },
  verifikator_dinas: { user_id: "usr-004", nama: "Dewi Lestari", role: "verifikator_dinas", status_verifikasi: "terverifikasi" },
  kepala_dinas: { user_id: "usr-005", nama: "H. Suprapto", role: "kepala_dinas", status_verifikasi: "terverifikasi" },
  admin: { user_id: "usr-006", nama: "Rizky Pratama", role: "admin", status_verifikasi: "terverifikasi" },
}

export const meContoh: UserMe = usersContoh["warga_terverifikasi"]

export const loginContoh: LoginResponse = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  role: "warga_terverifikasi",
  status_verifikasi: "terverifikasi",
}

export const registerContoh: RegisterResponse = {
  user_id: "usr-007",
  status_verifikasi: "menunggu",
}