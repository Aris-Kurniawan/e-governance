/**
 * F4.1 — Modul API §6 Voting Prioritas.
 *
 * `POST /vote` memakai **query param** `klaster_id`, bukan body
 * (INTERFACES.md §6).
 */

import { getData, postData, putData } from "./client";
import type { VoteResponse, VoteStatus } from "./types";

/** `POST /vote?klaster_id={id}` — warga_terverifikasi, komite_sekolah. */
export function voteKlaster(klasterId: string): Promise<VoteResponse> {
  return postData<VoteResponse>("/vote", undefined, { klaster_id: klasterId });
}

/** `GET /vote/status/{klaster_id}` — apakah akun ini sudah vote. */
export function statusVote(klasterId: string): Promise<VoteStatus> {
  return getData<VoteStatus>(`/vote/status/${encodeURIComponent(klasterId)}`);
}

/** `PUT /vote/klaster/{id}/skor` — `admin`, hitung ulang skor prioritas. */
export function hitungUlangSkor(klasterId: string) {
  return putData<{
    klaster_id: string;
    skor_prioritas: number;
    jumlah_vote_terhitung: number;
  }>(`/vote/klaster/${encodeURIComponent(klasterId)}/skor`);
}

/** `PUT /vote/klaster/{id}/override?urutan_prioritas=&alasan=` — `kepala_dinas`. */
export function overridePrioritas(
  klasterId: string,
  urutanPrioritas: number,
  alasan: string,
) {
  return putData<{
    klaster_id: string;
    urutan_prioritas_override: number;
    alasan_override: string;
  }>(`/vote/klaster/${encodeURIComponent(klasterId)}/override`, {
    query: { urutan_prioritas: urutanPrioritas, alasan },
  });
}