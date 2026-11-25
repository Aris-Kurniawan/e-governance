/**
 * F4.1 — Modul API §1 Auth.
 *
 * Token disimpan lewat `client.tokenStore`; lokasi penyimpanan mengikuti
 * pilihan sesi user dan dipasang otomatis pada header request oleh `client.ts`.
 * Field `nik` tidak pernah disimpan di sisi FE (INTERFACES.md §1).
 */

import { getData, postData, tokenStore } from "./client";
import type {
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserMe,
} from "./types";

/** `POST /auth/login` — publik. Sukses → token tersimpan di `tokenStore`. */
export async function login(
  email: string,
  password: string,
  remember = false,
): Promise<LoginResponse> {
  const data = await postData<LoginResponse>(
    "/auth/login",
    { email, password },
    undefined,
    { anonymous: true },
  );
  tokenStore.set(data.access_token, data.refresh_token, remember);
  return data;
}

/** `POST /auth/register` — publik. Akun baru statusnya `menunggu`. */
export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  return postData<RegisterResponse>("/auth/register", payload, undefined, { anonymous: true });
}

/** `GET /auth/me` — data akun & role sendiri. */
export async function me(): Promise<UserMe> {
  return getData<UserMe>("/auth/me");
}

/** Hapus token di sisi FE (logout). */
export function logout(): void {
  tokenStore.clear();
}

export function isLoggedIn(): boolean {
  return tokenStore.access !== null;
}