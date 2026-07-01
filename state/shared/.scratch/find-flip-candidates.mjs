// Scan milestone envelopes for clean envelope-status-flip candidates.
// Criteria: envelope.status='in_progress' AND every unit is complete/deferred/skipped
// AND complete count >= ceil(total*0.6) (so a 1/3 milestone doesn't qualify).
// Read-only — emits a ranked list, never writes envelopes.
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("mcp-server/data/milestones");
const out = [];
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
    if (cmp + def + skip === total && cmp >= Math.ceil(total * 0.6)) {
      out.push({ id: e.id, file: f, total, complete: cmp, deferred: def, skipped: skip });
    }
  } catch (_err) {
    // skip malformed
  }
}
out.sort((a, b) => b.complete - a.complete);
console.log(`Clean envelope-flip candidates: ${out.length}`);
for (const c of out.slice(0, 25)) {
  console.log(
    `  ${c.id.padEnd(32)} ${c.complete}C/${c.deferred}D/${c.skipped}S of ${c.total}  (${c.file})`,
  );
}
