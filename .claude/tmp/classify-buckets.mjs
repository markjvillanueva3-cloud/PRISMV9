import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const GIT_TIMEOUT_MS = 15000;
const TOP_TAGS_K = 25;
const TOP_LIST_K = 10;
const ACTIVE_SINCE = '2026-05-25';
const DORM_SINCE = '2026-05-01';
const DORM_UNTIL = '2026-05-25';

const j = JSON.parse(fs.readFileSync('H:/prism/state/shared/specs/ROADMAP-CONSOLIDATED.json', 'utf8'));
const ms = j.milestones;
const total = ms.length;

const tagCounts = {};
for (const m of ms) {
  const prefix = (m.id || '').split('-')[0];
  if (!prefix) continue;
  tagCounts[prefix] = (tagCounts[prefix] || 0) + 1;
}
const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, TOP_TAGS_K);

function gitCount(grep, since, until) {
  const args = ['-C', 'H:/prism', 'log', '--oneline', `--grep=${grep}`, `--since=${since}`];
  if (until) args.push(`--until=${until}`);
  try {
    const out = execFileSync('git', args, { encoding: 'utf8', timeout: GIT_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'ignore'] });
    return out.trim() ? out.trim().split('\n').length : 0;
  } catch (e) {
    return -1;
  }
}

console.log('Top tags + activity:');
console.log('TAG\tCOUNT\tACTIVE\tDORM_PROG');
for (const [tag, cnt] of topTags) {
  const active = gitCount(tag, ACTIVE_SINCE);
  const dormProg = gitCount(tag, DORM_SINCE, DORM_UNTIL);
  console.log(`${tag}\t${cnt}\t${active}\t${dormProg}`);
}

const buckets = { ACTIVE: [], DORMANT_PROGRESSING: [], DORMANT_IDLE: [], OBSOLETE: [], CLEAN: [] };
const gitCache = new Map();
function cachedActive(tag) {
  const k = 'A:' + tag;
  if (!gitCache.has(k)) gitCache.set(k, gitCount(tag, ACTIVE_SINCE));
  return gitCache.get(k);
}
function cachedDormProg(tag) {
  const k = 'P:' + tag;
  if (!gitCache.has(k)) gitCache.set(k, gitCount(tag, DORM_SINCE, DORM_UNTIL));
  return gitCache.get(k);
}

for (const m of ms) {
  const drift = m.drift;
  if (drift === 'claims_not_started_but_has_shipped_units' || drift === 'claims_completed_but_units_pending') {
    buckets.OBSOLETE.push(m);
    continue;
  }
  if (m.derivedStatus === 'completed_real' && drift === 'consistent') { buckets.CLEAN.push(m); continue; }
  if (m.derivedStatus === 'no_units') { buckets.CLEAN.push(m); continue; }

  const tag = m.id;
  const active = cachedActive(tag);
  const dormProg = cachedDormProg(tag);
  if (active > 0) buckets.ACTIVE.push(m);
  else if (dormProg > 0) buckets.DORMANT_PROGRESSING.push(m);
  else buckets.DORMANT_IDLE.push(m);
}

console.log('\n=== BUCKET COUNTS ===');
for (const [b, arr] of Object.entries(buckets)) {
  console.log(`${b}: ${arr.length} (${((arr.length / total) * 100).toFixed(1)}%)`);
}

const obsTop = buckets.OBSOLETE
  .filter(m => m.shipped > 0)
  .sort((a, b) => b.shipped - a.shipped)
  .slice(0, TOP_LIST_K);
console.log('\n=== TOP 10 OBSOLETE ===');
for (const m of obsTop) {
  const lastSha = (m.units || []).filter(u => u.shipped && u.sha).slice(-1)[0]?.sha || 'n/a';
  console.log(`${m.id}: ${(m.title || '').slice(0, 80)} | shipped=${m.shipped}/${m.total} | sha=${lastSha}`);
}

const idleTop = buckets.DORMANT_IDLE
  .filter(m => m.pending > 0)
  .sort((a, b) => b.pending - a.pending)
  .slice(0, TOP_LIST_K);
console.log('\n=== TOP 10 DORMANT_IDLE ===');
for (const m of idleTop) {
  console.log(`${m.id}: ${(m.title || '').slice(0, 80)} | pending=${m.pending}/${m.total}`);
}

console.log('\n=== TAGS PER BUCKET (top 5) ===');
for (const [b, arr] of Object.entries(buckets)) {
  const tags = {};
  for (const m of arr) {
    const t = (m.id || '').split('-')[0];
    tags[t] = (tags[t] || 0) + 1;
  }
  const top5 = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`${b}: ${top5.map(([t, c]) => `${t}(${c})`).join(', ')}`);
}

console.log(`\n=== AUTO-FLIP % ===`);
console.log(`OBSOLETE ${buckets.OBSOLETE.length} / ${total} = ${((buckets.OBSOLETE.length / total) * 100).toFixed(1)}%`);
