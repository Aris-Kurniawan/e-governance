/**
 * F4.1 — Error API.
 *
 * Amplop error backend mengikuti INTERFACES.md §0.1:
 *   { "error": { "code": "...", "message": "...", "details": { ... } } }
 *
 * `ApiError` dipakai `useFetch` (src/hooks/useFetch.ts) untuk memetakan
 * respons gagal ke state UI: `code` jadi penanda aksi (mis. `ALREADY_VOTED`
 * → tampilkan info "sudah vote"), `message` ditampilkan apa adanya karena
 * backend sudah mengirim pesan human-readable berbahasa Indonesia.
 */

/** Kode error standar — INTERFACES.md §0.3 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "ALREADY_VOTED"
  | "REASON_REQUIRED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 0,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** true kalau error ini karena token invalid/expired → FE harus refresh/logout */
  get isAuthError(): boolean {
    return this.code === "UNAUTHORIZED";
  }
}