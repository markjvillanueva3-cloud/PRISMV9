#!/usr/bin/env node
// tier: T3
// U-HFR05 — RAG-index staleness advisory (Stop hook).
//
// Detects when a RAG embedding index is older than its underlying corpus and
// emits a non-blocking advisory so the operator knows Hermes / octopus RAG
// calls are running against stale embeddings. Never auto-refreshes — index
// regen costs ~minutes of embedding compute; operator gates that.
//
// Indexes tracked:
//   state/shared/tribal-embed-index.json    ← corpus: knowledge/wiki/code-tribal/*.md
//   (wiki vector index is under state/shared/system-viz/ — added when filename stabilises)
//
// Advisory only. Knobs:
//   PRISM_RAG_STALENESS_DISABLE=1      → silent skip
//   PRISM_RAG_STALENESS_MAX_HOURS=24   → adjust threshold (default 24h)

import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_MAX_HOURS = 24;
const PROJECT_ROOT = "H:/prism";

const INDEXES = [
  {
    name: "tribal-embed-index",
    indexPath: join(PROJECT_ROOT, "state/shared/tribal-embed-index.json"),
    corpusDir: join(PROJECT_ROOT, "knowledge/wiki/code-tribal"),
    leg: "5 Tribal",
  },
];

function maxMtimeInDir(dir) {
  if (!existsSync(dir)) return 0;
  let max = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".md")) continue;
      try {
        const st = statSync(join(dir, entry.name));
        if (st.mtimeMs > max) max = st.mtimeMs;
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip dir errors */ }
  return max;
}

function checkStaleness({ now = Date.now(), maxHours = DEFAULT_MAX_HOURS } = {}) {
  const stale = [];
  for (const cfg of INDEXES) {
    if (!existsSync(cfg.indexPath)) {
      stale.push({ name: cfg.name, leg: cfg.leg, status: "missing", indexPath: cfg.indexPath });
      continue;
    }
    let indexMtime;
    try {
      indexMtime = statSync(cfg.indexPath).mtimeMs;
    } catch {
      stale.push({ name: cfg.name, leg: cfg.leg, status: "unreadable", indexPath: cfg.indexPath });
      continue;
    }
    const corpusMtime = maxMtimeInDir(cfg.corpusDir);
    const ageHours = (now - indexMtime) / 3600000;
    const corpusNewer = corpusMtime > indexMtime;
    if (corpusNewer) {
      stale.push({
        name: cfg.name,
        leg: cfg.leg,
        status: "corpus-newer-than-index",
        indexMtime: new Date(indexMtime).toISOString(),
        corpusMtime: new Date(corpusMtime).toISOString(),
        driftMinutes: Math.round((corpusMtime - indexMtime) / 60000),
      });
    } else if (ageHours > maxHours) {
      stale.push({
        name: cfg.name,
        leg: cfg.leg,
        status: "stale-by-age",
        indexMtime: new Date(indexMtime).toISOString(),
        ageHours: Math.round(ageHours * 10) / 10,
        maxHours,
      });
    }
  }
  return stale;
}

function formatAdvisory(stale) {
  if (stale.length === 0) return null;
  const lines = ["⚠ RAG index staleness — Hermes/octopus RAG calls may use outdated embeddings:"];
  for (const s of stale) {
    if (s.status === "missing") {
      lines.push(`  • ${s.name} (PSN leg ${s.leg}) — INDEX MISSING at ${s.indexPath}`);
    } else if (s.status === "unreadable") {
      lines.push(`  • ${s.name} (PSN leg ${s.leg}) — index file unreadable`);
    } else if (s.status === "corpus-newer-than-index") {
      lines.push(`  • ${s.name} (PSN leg ${s.leg}) — corpus is ${s.driftMinutes}min NEWER than index (${s.corpusMtime} vs ${s.indexMtime})`);
    } else if (s.status === "stale-by-age") {
      lines.push(`  • ${s.name} (PSN leg ${s.leg}) — index ${s.ageHours}h old (> ${s.maxHours}h threshold)`);
    }
  }
  lines.push("  Operator: regenerate via the index's build script when safe. Hermes lib logs every RAG call's index name + score for audit (R12 fail-loud).");
  return lines.join("\n");
}

export { checkStaleness, formatAdvisory, INDEXES };

async function main() {
  if (process.env.PRISM_RAG_STALENESS_DISABLE === "1") {
    process.exit(0);
  }
  const maxHours = Number(process.env.PRISM_RAG_STALENESS_MAX_HOURS) || DEFAULT_MAX_HOURS;
  const stale = checkStaleness({ maxHours });
  const advisory = formatAdvisory(stale);
  if (advisory) {
    const payload = { hookSpecificOutput: { hookEventName: "Stop", additionalContext: advisory } };
    process.stdout.write(JSON.stringify(payload));
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("stop-rag-index-staleness-check.mjs")) {
  main().catch((err) => {
    process.stderr.write(`stop-rag-index-staleness-check: ${err.message}\n`);
    process.exit(0); // never block Stop on hook error
  });
}
