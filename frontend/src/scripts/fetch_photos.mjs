import fs from 'fs';

async function fetchPhotos() {
  const queries = [
    'abandoned classroom',
    'damaged ceiling',
    'broken school desks',
    'abandoned school building',
    'cracked building wall',
    'broken window school'
  ];

  const photos = [];
  const seen = new Set();

  for (const q of queries) {
    try {
      const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=8`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      const data = await res.json();
      if (data && data.results) {
        for (const item of data.results) {
          if (item && item.urls && item.urls.raw && !seen.has(item.id)) {
            seen.add(item.id);
            const cleanUrl = item.urls.raw.split('?')[0] + '?w=500&q=80&auto=format&fit=crop';
            photos.push({
              src: cleanUrl,
              alt: item.alt_description || q,
              label: item.description || q
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching for query:', q, err.message);
    }
  }

  console.log(`Fetched ${photos.length} photos`);
  fs.writeFileSync('/tmp/school_photos.json', JSON.stringify(photos, null, 2));
}

fetchPhotos();
