#!/usr/bin/env node
// tier: T3 (observer — advisory only, never blocks Stop)
/**
 * stop-dream-queue-surface.mjs — Stop hook that surfaces today's pending
 * dream-queue items so the operator sees them in the §Report and can
 * promote-or-discard before the next session.
 *
 * Reads:  state/shared/dream-queue/dream-<slot>-<YYYY-MM-DD>.json (today only)
 * Emits:  systemMessage with the count + top refusal candidates per slot
 *
 * Knobs:
 *   PRISM_DREAM_SURFACE_DISABLE=1   skip entirely
 *   PRISM_DREAM_SURFACE_HORIZON=N   include the last N days (default 1)
 *   PRISM_DREAM_SURFACE_TOP_K=N     top-K refusals per slot (default 3)
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.env.PRISM_ROOT || "H:/prism";
const QUEUE_DIR = join(REPO_ROOT, "state/shared/dream-queue");

if (process.env.PRISM_DREAM_SURFACE_DISABLE === "1") {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

const HORIZON_DAYS = Math.max(1, parseInt(process.env.PRISM_DREAM_SURFACE_HORIZON || "1", 10) || 1);
const TOP_K = Math.max(1, parseInt(process.env.PRISM_DREAM_SURFACE_TOP_K || "3", 10) || 3);

function dateOffset(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function readQueue() {
  if (!existsSync(QUEUE_DIR)) return [];
  const targetDates = new Set(Array.from({ length: HORIZON_DAYS }, (_, i) => dateOffset(i)));
  const out = [];
  let files;
  try { files = readdirSync(QUEUE_DIR); }
  catch { return []; }
  for (const f of files) {
    const m = f.match(/^dream-([a-z0-9-]+)-(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    if (!targetDates.has(m[2])) continue;
    try {
      const doc = JSON.parse(readFileSync(join(QUEUE_DIR, f), "utf8"));
      if (doc && doc.batch) out.push({ slot: m[1], date: m[2], batch: doc.batch });
    } catch { /* skip bad json */ }
  }
  return out;
}

function summarize(items) {
  if (items.length === 0) return null;
  const lines = [`## 💤 Dream queue — ${items.length} pending batch(es) this session window`];
  // Sort: most refuse_rules first, then most skills.
  items.sort((a, b) => {
    const ar = (a.batch.refuse_rules || []).length;
    const br = (b.batch.refuse_rules || []).length;
    if (br !== ar) return br - ar;
    return (b.batch.skills || []).length - (a.batch.skills || []).length;
  });
  for (const it of items.slice(0, 12)) {
    const refuses = (it.batch.refuse_rules || []).slice(0, TOP_K);
    const skills = (it.batch.skills || []).slice(0, TOP_K);
    if (refuses.length === 0 && skills.length === 0) continue;
    lines.push(`- **${it.slot}** (${it.date}): ${refuses.length} refuse-rule candidate(s), ${skills.length} skill candidate(s)`);
    for (const r of refuses) {
      lines.push(`  - refuse: \`${String(r.rule).slice(0, 60)}\` (observed ${r.observed_count}×)`);
    }
    for (const s of skills) {
      lines.push(`  - skill: \`${String(s.name).slice(0, 60)}\` (observed ${s.observed_count}×)`);
    }
  }
  if (items.length > 12) lines.push(`- _… ${items.length - 12} more dream-queue files in state/shared/dream-queue/_`);
  lines.push(`_Promote manually by editing the slot's soul.md. Disable: \`PRISM_DREAM_SURFACE_DISABLE=1\`._`);
  return lines.join("\n");
}

function main() {
  try {
    const items = readQueue();
    const summary = summarize(items);
    if (!summary) {
      process.stdout.write(JSON.stringify({ continue: true }));
    } else {
      process.stdout.write(JSON.stringify({ continue: true, systemMessage: summary }));
    }
  } catch (err) {
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `stop-dream-queue-surface: ${err?.message || err}`,
    }));
  }
  process.exit(0);
}

main();
