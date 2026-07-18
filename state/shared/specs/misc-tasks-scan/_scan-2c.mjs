import fs from 'fs';

const data = JSON.parse(fs.readFileSync('H:/prism/state/shared/specs/misc-tasks-scan/_scan-2b-results.json', 'utf8'));

// Score each hit: prefer deferral/promise language that names a concrete deliverable
const HIGH = /(ran out of (context|tokens|time)|deferred to|defer(red)? (this|to)|left for later|revisit later|punted|will (build|wire|implement|finish|add) (this|it|that)? ?later|didn'?t (get|have time) to|never got to|NOT SHIPPED|P[23][ -]?defer|remaining work|not yet (wired|built|implemented|shipped))/i;
const DELIVERABLE = /(engine|hook|dispatcher|skill|test|unit|milestone|U-[A-Z0-9-]+|MS[0-9]|wire|wiring|schema|script|endpoint|action|pipeline|integration)/i;

const compact = [];
for (const r of data.results) {
  const base = r.file.split('/').pop();
  // dedupe near-identical snippets
  const seen = new Set();
  const scored = [];
  for (const h of r.hits) {
    const key = h.snippet.slice(0, 120).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    let score = 0;
    if (HIGH.test(h.snippet)) score += 3;
    if (DELIVERABLE.test(h.snippet)) score += 2;
    if (h.role === 'user') score += 1; // user-stated promises matter
    scored.push({ ...h, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter(s => s.score >= 3).slice(0, 12);
  if (top.length) compact.push({ file: base, hitCount: r.hits.length, top });
}

fs.writeFileSync('H:/prism/state/shared/specs/misc-tasks-scan/_scan-2c-digest.json',
  JSON.stringify({ files: compact.length, items: compact }, null, 1));
console.log('files=' + compact.length + ' topHits=' + compact.reduce((a, c) => a + c.top.length, 0));
