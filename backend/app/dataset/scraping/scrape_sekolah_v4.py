"""
Scraper Data Sekolah Dapodik — Kecamatan Lamongan v4 (FINAL)
Mengambil: identitas, siswa, guru, dan kondisi infrastruktur lengkap.

Strategi: capture Bearer token dari XHR halaman, lalu replay via fetch
dengan header authorization + referer. Jauh lebih cepat dari klik per sekolah.
"""

import asyncio
import csv
import json
from pathlib import Path
from playwright.async_api import async_playwright  # type: ignore

BASE = "https://dapo.kemendikdasmen.go.id"
KODE_KECAMATAN = "050713"
JENJANG_LIST = ["SD", "SMP", "SMA", "SMK"]
PAGE_URL = (f"{BASE}/progres/050000/050700/{KODE_KECAMATAN}"
            f"?nama_kecamatan=Kec.+Lamongan&nama_kabupaten=Kab.+Lamongan&jenjang=SD")

CSV_COLUMNS = [
    "npsn", "sekolah_id", "nama", "jenjang", "bentuk_pendidikan", "status_sekolah",
    "provinsi", "kabupaten", "kecamatan", "desa_kelurahan", "alamat_jalan",
    "kode_pos", "lintang", "bujur", "akreditasi", "status_kepemilikan", "nama_kepsek",
    "pd", "pd_l", "pd_p", "rombel", "jum_ptk", "jum_guru", "jum_tendik",
    "ruang_kelas", "kelas_baik", "kelas_ringan", "kelas_sedang", "kelas_berat",
    "perpus", "perpus_baik", "perpus_ringan", "perpus_sedang", "perpus_berat",
    "lab_ipa", "lab_ipa_baik", "lab_ipa_ringan", "lab_ipa_sedang", "lab_ipa_berat",
    "lab_kom", "lab_kom_baik", "lab_kom_ringan", "lab_kom_sedang", "lab_kom_berat",
    "r_guru", "r_guru_baik", "r_guru_ringan", "r_guru_sedang", "r_guru_berat",
    "r_kepsek", "r_kepsek_baik", "r_kepsek_ringan", "r_kepsek_sedang", "r_kepsek_berat",
    "r_uks", "r_uks_baik", "r_uks_ringan", "r_uks_sedang", "r_uks_berat",
    "wc_guru", "wc_guru_baik", "wc_guru_ringan", "wc_guru_sedang", "wc_guru_berat",
    "wc_siswa", "wc_siswa_baik", "wc_siswa_ringan", "wc_siswa_sedang", "wc_siswa_berat",
    "sumber_listrik", "daya_listrik", "akses_internet",
    "ikd_ruang_total", "semester", "tanggal_update",
]


async def get_bearer_token(page) -> str:
    """Tangkap token dari XHR pertama yang dikirim halaman."""
    token_holder = {"v": None}

    async def on_req(req):
        if token_holder["v"]:
            return
        auth = req.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token_holder["v"] = auth.split(" ", 1)[1]

    page.on("request", on_req)
    try:
        await page.goto(PAGE_URL, wait_until="networkidle", timeout=60000)
    except Exception as e:
        print("[WARN] nav:", e)
    for _ in range(6):
        if token_holder["v"]:
            break
        await asyncio.sleep(1)
    page.remove_listener("request", on_req)
    return token_holder["v"]


async def api_fetch(page, token: str, url: str):
    """GET url via page.evaluate + header auth + referer. Return parsed JSON."""
    try:
        text = await page.evaluate(
            """async ({url, token}) => {
                const r = await fetch(url, {
                    headers: {
                        'authorization': 'Bearer ' + token,
                        'accept': 'application/json',
                        'content-type': 'application/json'
                    }
                });
                return await r.text();
            }""",
            {"url": url, "token": token},
        )
        return json.loads(text) if text else None
    except Exception as e:
        print("  [ERR]", url, e)
        return None


async def scrape_jenjang(page, token: str, jenjang: str) -> list:
    list_url = (f"{BASE}/api/progress-pengiriman/kecamatan/school"
                f"?kode_kecamatan={KODE_KECAMATAN}&jenjang={jenjang}")
    data = await api_fetch(page, token, list_url)
    schools = data.get("data", []) if isinstance(data, dict) and data.get("data") else []
    print(f"\n--- {jenjang}: {len(schools)} sekolah ---")

    results = []
    for idx, s in enumerate(schools, 1):
        npsn = s.get("npsn")
        if not npsn:
            continue
        detail = await api_fetch(page, token, f"{BASE}/api/detail-sekolah?npsn={npsn}")
        d = detail.get("data", []) if isinstance(detail, dict) and detail.get("data") else []
        row = d[0] if d and isinstance(d[0], dict) else dict(s)

        ikd = await api_fetch(page, token, f"{BASE}/api/ikdByNpsn?npsn={npsn}")
        dk = ikd.get("data", []) if isinstance(ikd, dict) and ikd.get("data") else []
        for e in dk:
            if isinstance(e, dict) and e.get("entitas") == "Ruang":
                row["ikd_ruang_total"] = round(float(e.get("total", 0)), 2)
                break

        results.append(row)
        print(f"  [{idx}/{len(schools)}] {npsn} {row.get('nama')} ok")
        await asyncio.sleep(0.2)

    return results


async def main():
    print("=" * 65)
    print("SCRAPER DAPODIK — KEC. LAMONGAN (v4 FINAL)")
    print("=" * 65)

    all_data = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        page = await ctx.new_page()

        token = await get_bearer_token(page)
        if not token:
            print("[FATAL] Token tidak tertangkap. Keluar.")
            await browser.close()
            return
        print(f"Token tertangkap: {token[:24]}...({len(token)} char)")

        for jenjang in JENJANG_LIST:
            all_data.extend(await scrape_jenjang(page, token, jenjang))

        await browser.close()

    out_dir = Path(__file__).parent.parent / "raw"
    out_dir.mkdir(parents=True, exist_ok=True)

    json_path = out_dir / "sekolah_lamongan_semua.json"
    json_path.write_text(json.dumps(all_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nJSON: {json_path} ({len(all_data)} sekolah)")

    if all_data:
        csv_path = out_dir / "sekolah_lamongan_semua.csv"
        cols = [c for c in CSV_COLUMNS if any(c in r for r in all_data)]
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            w.writerows(all_data)
        print(f"CSV:  {csv_path} ({len(cols)} kolom)")

    print(f"\nTotal: {len(all_data)} sekolah")
    per = {}
    for r in all_data:
        per[r.get("jenjang", "?")] = per.get(r.get("jenjang", "?"), 0) + 1
    for k, v in sorted(per.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    asyncio.run(main())