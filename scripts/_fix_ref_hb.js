const fs = require('fs');
let d = fs.readFileSync('C:\\PRISM\\scripts\\generate_verified_nonferrous.js', 'utf-8');

// Add ref_hb to heat-treatable aluminum alloys (reference = T6 HB)
const additions = [
  ["base: '6061'", "ref_hb: 95, "],
  ["base: '7075'", "ref_hb: 150, "],
  ["base: '2024'", "ref_hb: 120, "],
  ["base: '2014'", "ref_hb: 135, "],
  ["base: '6063'", "ref_hb: 73, "],
  ["base: '6082'", "ref_hb: 95, "],
  ["base: '7050'", "ref_hb: 140, "],
  ["base: '7475'", "ref_hb: 142, "],
  ["base: '2011'", "ref_hb: 95, "],
  ["base: '2017'", "ref_hb: 105, "],
  ["base: 'A356'", "ref_hb: 80, "],
  ["base: '319'", "ref_hb: 95, "],
  ["base: '2195'", "ref_hb: 130, "],
  ["base: '2090'", "ref_hb: 125, "],
  ["base: 'C172'", "ref_hb: 360, "],
];

for (const [marker, insert] of additions) {
  const idx = d.indexOf(marker);
  if (idx === -1) continue;
  // Find kc1_base line after this marker
  const kc1Idx = d.indexOf('kc1_base:', idx);
  if (kc1Idx === -1 || kc1Idx - idx > 800) continue;
  // Insert ref_hb before kc1_base
  d = d.slice(0, kc1Idx) + insert + d.slice(kc1Idx);
}

fs.writeFileSync('C:\\PRISM\\scripts\\generate_verified_nonferrous.js', d);
const refs = d.match(/ref_hb: \d+/g);
console.log('ref_hb entries added:', refs ? refs.length : 0);
console.log(refs);
