/**
 * Logika bersama untuk peta sebaran sekolah.
 *
 * Dipakai `DashboardWilayah` (warga) dan `PetaSebaranDinas` (dinas) agar
 * titik, skor, dan filter tidak kembali berbeda seperti sebelumnya:
 * Dashboard Wilayah menampilkan seluruh sekolah — termasuk yang tidak punya
 * klaster — sehingga muncul pin "0" yang bukan skor nol melainkan
 * "belum ada klaster".
 *
 * Sumber skor tetap `skor_prioritas` per klaster (D-07). Sekolah tanpa klaster
 * tidak dipetakan pada tampilan default; `hasKlaster` dibuat eksplisit agar
 * filter tidak bergantung pada `?? 0`.
 */

export type TitikStatus = "kritis" | "sedang" | "rendah"

export interface TitikPeta {
  npsn: string
  jenjang: string
  status: TitikStatus
  hasKlaster: boolean
}

export interface FilterTitikOptions {
  hanyaBerklaster?: boolean
  jenjang?: string[]
  status?: TitikStatus
}

/** Ambang warna pin: >70 kritis, 40–70 sedang, <40 rendah (legenda peta). */
export function statusDariSkor(skor: number): TitikStatus {
  if (skor > 70) return "kritis"
  if (skor >= 40) return "sedang"
  return "rendah"
}

/** Skor prioritas tertinggi per NPSN — satu sekolah satu pin. */
export function skorTertinggiPerSekolah(
  klaster: ReadonlyArray<{ sekolah_npsn: string; skor_prioritas: number | null }>,
): Map<string, number> {
  const peta = new Map<string, number>()
  for (const k of klaster) {
    const skor = k.skor_prioritas ?? 0
    if (skor > (peta.get(k.sekolah_npsn) ?? 0)) {
      peta.set(k.sekolah_npsn, skor)
    }
  }
  return peta
}

export function filterTitikPeta<T extends TitikPeta>(
  titik: readonly T[],
  { hanyaBerklaster = false, jenjang = [], status }: FilterTitikOptions = {},
): T[] {
  return titik.filter((p) => {
    if (jenjang.length > 0 && !jenjang.includes(p.jenjang)) return false
    if (status && p.status !== status) return false
    if (hanyaBerklaster && !p.hasKlaster) return false
    return true
  })
}
