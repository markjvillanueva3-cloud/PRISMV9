import fs from 'fs';
import readline from 'readline';

const PATTERN = /(TODO|FIXME|deferred|defer this|didn'?t finish|did not finish|never finished|ran out of (context|tokens|time)|next session|follow[- ]?up|incomplete|not (yet )?(done|implemented|wired|built|finished)|left for later|P[23] deferr|still pending|blocked by|stub(bed)?|revisit later|punted|out of scope for now|will (do|wire|build|finish) later|NOT SHIPPED|unfinished|didn'?t get to|never got to|TBD)/i;

const files = fs.readFileSync('H:/prism/state/shared/specs/misc-tasks-scan/_intersect-2.txt', 'utf8')
  .split(/\r?\n/).filter(Boolean);

// Extract human-readable text from a transcript jsonl record
function extractText(line) {
  try {
    const o = JSON.parse(line);
    let parts = [];
    const msg = o.message;
    if (msg && msg.content) {
      if (typeof msg.content === 'string') parts.push(msg.content);
      else if (Array.isArray(msg.content)) {
        for (const c of msg.content) {
          if (c.type === 'text' && c.text) parts.push(c.text);
          else if (c.type === 'tool_result' && c.content) {
            if (typeof c.content === 'string') parts.push(c.content);
            else if (Array.isArray(c.content)) for (const cc of c.content) if (cc.type === 'text' && cc.text) parts.push(cc.text);
          }
          else if (c.type === 'tool_use' && c.input) parts.push(JSON.stringify(c.input).slice(0, 2000));
        }
      }
    }
    return { role: (msg && msg.role) || o.type || '?', text: parts.join('\n') };
  } catch { return null; }
}

const results = [];
let scanned = 0, matched = 0;

for (const f of files) {
  scanned++;
  let path = f;
  if (!fs.existsSync(path)) continue;
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split(/\r?\n/);
  let fileHits = [];
  for (let i = 0; i < lines.length; i++) {
    const rec = extractText(lines[i]);
    if (!rec || !rec.text) continue;
    // split text into sub-lines, match each
    const sub = rec.text.split(/\r?\n/);
    for (let j = 0; j < sub.length; j++) {
      if (PATTERN.test(sub[j])) {
        const ctx = sub.slice(Math.max(0, j - 3), j + 4).join(' | ').replace(/\s+/g, ' ').trim();
        fileHits.push({ role: rec.role, recIdx: i, snippet: ctx.slice(0, 600) });
      }
    }
  }
  if (fileHits.length) {
    matched++;
    results.push({ file: path, hits: fileHits.slice(0, 60) });
  }
}

fs.writeFileSync('H:/prism/state/shared/specs/misc-tasks-scan/_scan-2-results.json',
  JSON.stringify({ scanned, matched, results }, null, 1));
console.log('scanned=' + scanned + ' matched=' + matched + ' totalHits=' + results.reduce((a, r) => a + r.hits.length, 0));
