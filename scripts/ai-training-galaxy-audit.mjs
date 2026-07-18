#!/usr/bin/env node
// ai-training-galaxy-audit.mjs — re-runnable synergy audit for slot:india's ai-training galaxy.
// U-PSGB-INDIA-AUDIT (2026-05-28). Encodes the 13-artifact buildout gate + the PSN synergy legs
// programmatically so any future india session confirms "is my galaxy truly synergized?" in ONE
// command instead of a manual sweep. Reads only — never mutates. Exit 1 if any HARD check GAPs.
//
// Paths resolve relative to THIS script's tree (so a worktree run audits the worktree galaxy,
// a merged run audits the merged galaxy); cross-tree state (master MEMORY.md on C:) is absolute.
//
// Usage: node scripts/ai-training-galaxy-audit.mjs [--json]
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const GALAXY = `${ROOT}/mcp-server/src/engines/ai-training`;
const MASTER_MEM = "C:/Users/wompu/.claude/projects/H--prism/memory";

const exists = (p) => { try { return fs.statSync(p).size > 0; } catch { return false; } };
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
const has = (p, re) => re.test(read(p));
const countMem = (re) => { try { return fs.readdirSync(MASTER_MEM).filter((f) => re.test(f)).length; } catch { return 0; } };
const countWikiIndia = () => {
  let n = 0;
  for (const sub of ["architecture", "lessons"]) {
    try {
      for (const f of fs.readdirSync(`${ROOT}/knowledge/wiki/${sub}`)) {
        if (f.endsWith(".md") && /ai-training|heterophily|slot: india|india/.test(read(`${ROOT}/knowledge/wiki/${sub}/${f}`))) n++;
      }
    } catch { /* dir absent */ }
  }
  return n;
};

// [id, label, hard?, check() -> {ok, detail}]
const CHECKS = [
  ["A1", "galaxy CLAUDE.md", true, () => ({ ok: exists(`${GALAXY}/CLAUDE.md`) })],
  ["A2", "galaxy MEMORY.md", true, () => ({ ok: exists(`${GALAXY}/MEMORY.md`) })],
  ["A3", "galaxy PATHS.md", true, () => ({ ok: exists(`${GALAXY}/PATHS.md`) })],
  ["A4", "galaxy TOOLBELT.md", true, () => ({ ok: exists(`${GALAXY}/TOOLBELT.md`) })],
  ["A5", "soul realigned (not generic, ai-training)", true, () => {
    const s = read(`${ROOT}/state/shared/slot-souls/india.md`);
    return { ok: !!s && !/domain_filter:\s*any/.test(s) && /ai-training/.test(s) };
  }],
  ["A6", "SLOT_GALAXY_MAP india:ai-training", true, () => {
    const re = /india:\s*["']ai-training["']/;
    // ROOT first (merged tree); fall back to main fleet tree (stale worktree may lack this fleet hook).
    return { ok: has(`${ROOT}/.claude/hooks/slot-context-bundle-inject.mjs`, re) || has("H:/prism/.claude/hooks/slot-context-bundle-inject.mjs", re) };
  }],
  ["A7", "MEMORY.md Master-brain link + sync stamp", true, () => {
    const m = read(`${GALAXY}/MEMORY.md`);
    return { ok: /## Master-brain link/.test(m) && /Last master-sync:/i.test(m) };
  }],
  ["A8", "CLAUDE.md Related galaxies (PSN edges)", true, () => ({ ok: has(`${GALAXY}/CLAUDE.md`, /## Related galaxies/) })],
  ["A9", "≥10 *_india_* memories", true, () => { const n = countMem(/_india_.*\.md$/); return { ok: n >= 10, detail: `${n} found` }; }],
  ["A10", "≥3 wiki refs mention india/ai-training", true, () => { const n = countWikiIndia(); return { ok: n >= 3, detail: `${n} found` }; }],
  ["A11", "custom skill (/ai-train-india or /galaxy-audit-india)", true, () => {
    const dirs = [`${ROOT}/.claude/commands`, "C:/Users/wompu/.claude/commands"];
    const ok = dirs.some((d) => { try { return fs.readdirSync(d).some((f) => /india/.test(f) && /ai-train|galaxy-audit/.test(f)); } catch { return false; } });
    return { ok };
  }],
  ["A12", "master MEMORY.md [galaxy:ai-training] back-pointer", true, () => ({ ok: has(`${MASTER_MEM}/MEMORY.md`, /galaxy:ai-training/) })],
  ["A13", "custom domain-awareness (generator + hook + wired)", true, () => {
    const gen = exists(`${ROOT}/scripts/ai-training-awareness.mjs`);
    const hook = exists(`${ROOT}/.claude/hooks/india-awareness-inject.mjs`);
    const wired = has(`${ROOT}/.claude/settings.json`, /india-awareness-inject/);
    return { ok: gen && hook && wired, detail: `gen=${gen} hook=${hook} wired=${wired}` };
  }],
  ["A14", "domain RULES.md (AI-T rules + GSD protocol)", true, () => ({ ok: exists(`${GALAXY}/RULES.md`) })],
  ["A15", "compiled KNOWLEDGE.md (wiki+tribal+action index)", true, () => ({ ok: exists(`${GALAXY}/KNOWLEDGE.md`) })],
  ["A16", "master-brain DOWN edge — india memories pushed to H: vault (CONN-3)", true, () => {
    const c = ["feedback", "reference"].reduce((n, sub) => {
      try { return n + fs.readdirSync(`H:/prism/knowledge/memories/${sub}`).filter((f) => /_india_/.test(f)).length; } catch { return n; }
    }, 0);
    return { ok: c >= 10, detail: `${c} india memories in master vault` };
  }],
  // Informational (soft) — domain health, never gates.
  ["I1", "NN-GRAPH deploy-gate status", false, () => {
    const e = JSON.parse(read(`${ROOT}/state/shared/nn-graph/NN-EVAL.json`) || "{}");
    if (e.deferred) return { ok: true, detail: `DEFERRED (${e.reason}); AUROC ${e.checkpointMeta?.auroc?.toFixed?.(3) ?? "?"}` };
    return { ok: true, detail: "see NN-EVAL.json" };
  }],
];

function run() {
  const results = CHECKS.map(([id, label, hard, fn]) => {
    let r; try { r = fn(); } catch (e) { r = { ok: false, detail: `err:${e.message}` }; }
    return { id, label, hard, ok: !!r.ok, detail: r.detail || "" };
  });
  const hardGaps = results.filter((r) => r.hard && !r.ok);
  return { results, hardGaps, synergized: hardGaps.length === 0 };
}

const out = run();
if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
} else {
  process.stdout.write("# ai-training galaxy synergy audit (slot:india)\n\n");
  for (const r of out.results) {
    const mark = r.ok ? "✓" : (r.hard ? "✗ GAP" : "·");
    process.stdout.write(`${mark}  ${r.id} ${r.label}${r.detail ? ` — ${r.detail}` : ""}\n`);
  }
  process.stdout.write(`\nVERDICT: ${out.synergized ? "🟢 SYNERGIZED (all hard checks pass)" : `🔴 ${out.hardGaps.length} GAP(s): ${out.hardGaps.map((g) => g.id).join(", ")}`}\n`);
}
process.exit(out.synergized ? 0 : 1);
