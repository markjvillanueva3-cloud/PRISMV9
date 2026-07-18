import fs from 'fs';

// Strong-signal patterns: genuine promises / deferrals of incomplete work made IN the chat
const STRONG = /(ran out of (context|tokens|time)|deferred to (a )?(next|future|follow)|defer(red)? this|left for later|revisit later|punted|out of scope for now|will (do|wire|build|finish|implement|add|handle) (this |it |that )?later|didn'?t (get|have time) to|never got to|next session|follow[- ]?up (unit|task|item|work|needed|required)|P[23][ -]?(deferr|defer)|NOT SHIPPED|not yet (wired|built|implemented|done|shipped)|still (pending|need to|needs to)|TODO\(future\)|remaining work|未|to be (done|built|wired|implemented) (later|next))/i;

// Reject obvious noise
const NOISE = /(node_modules|\.test\.|eslint-disable|@ts-|"TODO"|'TODO'|TODO:|FIXME:|\/\/ TODO|# TODO|tool_use_id|toolu_|errorClass|stub(bed)? engine|placeholder return|hook (block|reject)|grep|ripgrep)/i;

const files = fs.readFileSync('H:/prism/state/shared/specs/misc-tasks-scan/_intersect-2.txt', 'utf8')
  .split(/\r?\n/).filter(Boolean);

function extractAssistantUser(line) {
  try {
    const o = JSON.parse(line);
    const msg = o.message;
    if (!msg) return null;
    const role = msg.role || o.type;
    if (role !== 'assistant' && role !== 'user') return null;
    let parts = [];
    if (typeof msg.content === 'string') parts.push(msg.content);
    else if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'text' && c.text) parts.push(c.text);
        // skip tool_result and tool_use - those are noise for "promised work"
      }
    }
    return { role, text: parts.join('\n'), ts: o.timestamp };
  } catch { return null; }
}

const results = [];
let scanned = 0, matched = 0;

for (const path of files) {
  scanned++;
  if (!fs.existsSync(path)) continue;
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
  let fileHits = [];
  for (let i = 0; i < lines.length; i++) {
    const rec = extractAssistantUser(lines[i]);
    if (!rec || !rec.text) continue;
    const sub = rec.text.split(/\r?\n/);
    for (let j = 0; j < sub.length; j++) {
      const L = sub[j];
      if (STRONG.test(L) && !NOISE.test(L)) {
        const ctx = sub.slice(Math.max(0, j - 2), j + 3).join(' / ').replace(/\s+/g, ' ').trim();
        fileHits.push({ role: rec.role, recIdx: i, ts: rec.ts || '', snippet: ctx.slice(0, 500) });
      }
    }
  }
  if (fileHits.length) {
    matched++;
    results.push({ file: path, hits: fileHits.slice(0, 40) });
  }
}

fs.writeFileSync('H:/prism/state/shared/specs/misc-tasks-scan/_scan-2b-results.json',
  JSON.stringify({ scanned, matched, results }, null, 1));
console.log('scanned=' + scanned + ' matched=' + matched + ' totalHits=' + results.reduce((a, r) => a + r.hits.length, 0));
