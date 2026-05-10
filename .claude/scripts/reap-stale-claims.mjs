#!/usr/bin/env node
// reap-stale-claims.mjs — Reap milestone-unit claim files whose heartbeat
// is older than the stale threshold. Doctrine (CLAUDE.md): claims must be
// heartbeat-refreshed every <5 min; older = abandoned.
//
// Usage:
//   node reap-stale-claims.mjs                  # dry-run (default)
//   node reap-stale-claims.mjs --apply          # actually delete
//   node reap-stale-claims.mjs --threshold-min N  # override 5-min default
//   node reap-stale-claims.mjs --json           # machine-readable
//
// Why it matters: file-claim-commit-guard, dispatch-prevent-collision, and
// other hooks scan mcp-server/data/claims/**/claim.json on every commit and
// many other tool calls. With 150+ orphan claims (one per long-dead Claude
// session), every git op pays a per-claim parse + age check. Reaping cleans
// up the working tree and shaves measurable latency off concurrent chat ops.

import { readdirSync, readFileSync, statSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/prism";
const CLAIMS_DIR = join(ROOT, "mcp-server/data/claims");

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const JSON_OUT = ARGS.includes("--json");
const THRESHOLD_MIN = (() => {
  const i = ARGS.indexOf("--threshold-min");
  return i >= 0 && i < ARGS.length - 1 ? parseFloat(ARGS[i + 1]) : 5;
})();
const THRESHOLD_MS = THRESHOLD_MIN * 60 * 1000;

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && entry.name === "claim.json") yield p;
  }
}

function inspect(path) {
  try {
    const text = readFileSync(path, "utf8");
    const c = JSON.parse(text);
    const heartbeat = c.heartbeat_at ? new Date(c.heartbeat_at).getTime() : null;
    const claimed = c.claimed_at ? new Date(c.claimed_at).getTime() : null;
    const ts = heartbeat || claimed;
    const ageMs = ts ? Date.now() - ts : null;
    return { path, claim: c, ageMs, ageMin: ageMs != null ? Math.round(ageMs / 60000) : null };
  } catch (e) {
    return { path, error: e.message };
  }
}

const all = [...walk(CLAIMS_DIR)].map(inspect);
const stale = all.filter((r) => r.ageMs != null && r.ageMs > THRESHOLD_MS);
const fresh = all.filter((r) => r.ageMs != null && r.ageMs <= THRESHOLD_MS);
const broken = all.filter((r) => r.error);

const summary = {
  thresholdMin: THRESHOLD_MIN,
  scanned: all.length,
  stale: stale.length,
  fresh: fresh.length,
  broken: broken.length,
  apply: APPLY,
  reaped: 0,
  reapErrors: [],
};

if (APPLY) {
  for (const r of [...stale, ...broken]) {
    try {
      unlinkSync(r.path);
      // try to clean up the empty parent dir tree
      let parent = r.path.slice(0, r.path.lastIndexOf("/"));
      while (parent.startsWith(CLAIMS_DIR) && parent !== CLAIMS_DIR) {
        try {
          if (readdirSync(parent).length === 0) rmdirSync(parent);
          else break;
        } catch { break; }
        parent = parent.slice(0, parent.lastIndexOf("/"));
      }
      summary.reaped++;
    } catch (e) {
      summary.reapErrors.push({ path: r.path, error: e.message });
    }
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ summary, stale: stale.slice(0, 50), fresh, broken }, null, 2));
} else {
  console.log(`reap-stale-claims (threshold=${THRESHOLD_MIN}min, apply=${APPLY})`);
  console.log(`  scanned: ${summary.scanned}`);
  console.log(`  fresh:   ${summary.fresh}`);
  console.log(`  stale:   ${summary.stale}`);
  console.log(`  broken:  ${summary.broken}`);
  if (APPLY) {
    console.log(`  reaped:  ${summary.reaped}`);
    if (summary.reapErrors.length) console.log(`  errors:  ${summary.reapErrors.length}`);
  } else if (summary.stale > 0) {
    console.log(`\n  Re-run with --apply to delete ${summary.stale} stale claims.`);
    console.log(`  Sample (oldest 5):`);
    for (const r of stale.sort((a, b) => b.ageMs - a.ageMs).slice(0, 5)) {
      const c = r.claim;
      console.log(`    ${r.ageMin}m  ${c.milestone_id || "?"}/${c.unit_id || "?"}  by ${c.instance_id || "?"}`);
    }
  }
}
