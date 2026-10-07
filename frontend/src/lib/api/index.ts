/**
 * F4.1 — Indeks modul API.
 *
 * Import dari satu tempat agar halaman tidak perlu tahu nama file:
 *   import { listSekolah, kirimLaporan } from "@/lib/api";
 *
 * Kontrak: `docs/universal/INTERFACES.md` (sumber kebenaran).
 */

export * from "./errors";
export * from "./types";
export {
  API_BASE_URL,
  tokenStore,
  request,
  getData,
  getPage,
  postData,
  putData,
  postForm,
  qs,
  unwrap,
  unwrapPage,
  type Page,
  type PageMeta,
  type QueryValue,
} from "./client";

export * as authApi from "./auth";
export * as sekolahApi from "./sekolah";
export * as laporanApi from "./laporan";
export * as klasterApi from "./klaster";
export * as voteApi from "./vote";
export * as dashboardApi from "./dashboard";