import fs from 'fs';

async function fetchMore() {
  const specificQueries = [
    'damaged classroom ceiling',
    'damaged school building',
    'broken desks classroom',
    'dilapidated classroom',
    'school flood damage',
    'leaking ceiling school',
    'earthquake school damage'
  ];

  const photos = [];
  const seen = new Set();

  for (const q of specificQueries) {
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime&format=json`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SimakisSchoolAudit/1.0 (https://simakis.lamongankab.go.id; audit@lamongankab.go.id)'
        }
      });
      const data = await res.json();
      if (data && data.query && data.query.pages) {
        for (const pageId in data.query.pages) {
          const page = data.query.pages[pageId];
          if (page.imageinfo && page.imageinfo[0]) {
            const info = page.imageinfo[0];
            const cleanTitle = page.title.replace('File:', '');
            // abaikan dokumen teks / non-foto
            if (info.mime && info.mime.startsWith('image/') && !cleanTitle.endsWith('.svg') && !seen.has(cleanTitle)) {
              seen.add(cleanTitle);
              const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleanTitle)}?width=500`;
              photos.push({
                src: thumbUrl,
                alt: cleanTitle.replace(/_/g, ' ').replace(/\.[^/.]+$/, '')
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  console.log(`Fetched more: ${photos.length}`);
  fs.writeFileSync('/tmp/more_photos.json', JSON.stringify(photos, null, 2));
}

fetchMore();
