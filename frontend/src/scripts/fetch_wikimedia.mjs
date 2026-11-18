import fs from 'fs';

async function fetchWikimedia() {
  const queries = [
    'damaged classroom',
    'abandoned school classroom',
    'ruined classroom',
    'broken school'
  ];

  const photos = [];
  const seen = new Set();

  for (const q of queries) {
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&format=json`;
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
            if (info.mime && info.mime.startsWith('image/') && !seen.has(cleanTitle)) {
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

  console.log(`Wikimedia fetched: ${photos.length} photos`);
  fs.writeFileSync('/tmp/wikimedia_photos.json', JSON.stringify(photos, null, 2));
}

fetchWikimedia();
