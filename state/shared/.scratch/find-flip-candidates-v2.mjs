// Broader scan for envelope-flip candidates.
// V2 criteria: envelope.status='in_progress' AND ≥70% of units complete AND
// remainder is deferred/skipped OR completed_units >= 0.7*total.
// Excludes envelopes with any unit at pending/in_progress (still actively in flight).
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("mcp-server/data/milestones");
const candidates = [];
const blocked = [];

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  try {
    const e = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (e.status !== "in_progress") continue;
    const phases = Array.isArray(e.phases) ? e.phases : [];
    const units = phases.flatMap((p) => p.units || []);
    if (!units.length) continue;
    const st = Object.create(null);
    for (const u of units) {
      const s = String(u.status || "(none)");
      st[s] = (st[s] || 0) + 1;
    }
    const total = units.length;
    const cmp = (st.complete || 0) + (st.completed || 0);
    const def = st.deferred || 0;
    const skip = st.skipped || 0;
    const open = total - cmp - def - skip; // pending/in_progress/(none)/etc
    const completePct = (cmp / total) * 100;

    if (open === 0 && cmp >= Math.ceil(total * 0.5)) {
      // All units accounted for as complete/deferred/skipped
      candidates.push({ id: e.id, total, complete: cmp, deferred: def, skipped: skip, file: f, pct: completePct.toFixed(0) });
    } else if (open > 0) {
      blocked.push({ id: e.id, total, complete: cmp, open, pct: completePct.toFixed(0) });
    }
  } catch { /* skip */ }
}

candidates.sort((a, b) => b.complete - a.complete);
console.log(`CLEAN flip candidates (open=0, ≥50% complete): ${candidates.length}`);
for (const c of candidates.slice(0, 20)) {
  console.log(`  ${c.id.padEnd(32)} ${c.complete}C/${c.deferred}D/${c.skipped}S of ${c.total} (${c.pct}%)`);
}

console.log(`\nBLOCKED (still has open units, ≥70% complete): ${blocked.filter((x) => +x.pct >= 70).length}`);
for (const b of blocked.filter((x) => +x.pct >= 70).sort((a, b) => +b.pct - +a.pct).slice(0, 10)) {
  console.log(`  ${b.id.padEnd(32)} ${b.complete}C of ${b.total} (${b.pct}%, open=${b.open})`);
}
