import fs from 'fs';

const p1 = JSON.parse(fs.readFileSync('/tmp/wikimedia_photos.json'));
const p2 = JSON.parse(fs.readFileSync('/tmp/more_photos.json'));

const combined = [...p1, ...p2];
const seen = new Set();
const curated = [];

// Kata kunci kerusakan yang relevan
const damageKeywords = [
  'damage', 'damaged', 'ceiling', 'roof', 'destroyed', 'broken', 
  'tornado', 'hurricane', 'earthquake', 'flood', 'abandoned', 'decay'
];

for (const p of combined) {
  const altLower = p.alt.toLowerCase();
  // Filter keluar file yang bukan foto kerusakan sekolah (misal: plaque, monument, staff, bicycles, book, gerund, etc)
  const isExcluded = ['plaque', 'monument', 'staff', 'bicycles', 'djvu', 'gerund', 'magazine', 'panorama', 'bilingual', 'sign', 'post', 'envelope', 'stamp', 'map'].some(ex => altLower.includes(ex));
  
  if (!isExcluded && damageKeywords.some(kw => altLower.includes(kw)) && !seen.has(p.src)) {
    seen.add(p.src);
    curated.push(p);
  }
}

console.log(`Curated valid damaged school photos: ${curated.length}`);
fs.writeFileSync('/tmp/curated_24.json', JSON.stringify(curated.slice(0, 24), null, 2));
