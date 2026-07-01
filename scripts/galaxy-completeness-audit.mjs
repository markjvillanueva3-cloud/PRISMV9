#!/usr/bin/env node
// scripts/galaxy-completeness-audit.mjs
//
// Assess every galaxy against the canonical 11-artifact completeness rubric
// (state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md) — the system's own
// definition of "galaxy at maximum potential", NOT an invented one.
//
// Maps to the operator's named axes (loop /goal 2026-06-09):
//   claude.md · souls.md · prism-awareness (domain knowledge in CLAUDE.md/MEMORY.md)
//   · wikis · tribal · memories · gsd/tdd (doctrine+tests) · PSN · container skills.
//
// Deterministic + read-only (no Claude API → immune to the rate-limiting that
// has blocked the multi-agent workflow all session; the operator also named the
// local/Ollama path explicitly). Output = a per-galaxy scorecard + the fill
// sequence (worst-first) for the sequential loop.
//
// Usage:
//   node scripts/galaxy-completeness-audit.mjs            # table
//   node scripts/galaxy-completeness-audit.mjs --json     # machine-readable

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const ENG = path.join(REPO, "mcp-server", "src", "engines");
const SOULS = path.join(REPO, "state", "shared", "slot-souls");
const WIKI_ARCH = path.join(REPO, "knowledge", "wiki", "architecture");
const TRIBAL = path.join(REPO, "knowledge", "wiki", "code-tribal");
const MEM = path.join(REPO, "knowledge", "memories");
const CMDS = path.join(REPO, ".claude", "commands");
const PATTERNS = path.join(REPO, "knowledge", "memories", "patterns");

// galaxy → owning slot (from per-slot-galaxy-buildout briefs). Extra infra
// galaxies (golf-created 2026-05-29) have no dedicated slot → soul/skill axes N/A.
const GALAXY_SLOT = {
  "token-optimization": "alpha", "hermes-zulu": "bravo", quoting: "charlie",
  cad: "delta", "post-processor": "echo", mill: "foxtrot", "fleet-hygiene": "golf",
  business: "hotel", "ai-training": "india", "database-expansion": "juliett",
  cam: "kilo", academy: "lima", wedm: "mike", "speed-feed": "oscar",
  "backend-helper": "papa", "frontend-app": "quebec", wiring: "romeo",
  "system-viz": "sierra", discovery: "tango", "bug-hunting": "uniform",
  "dormant-data": "victor", lathe: "whiskey", "blueprint-vision": "xray",
};

// Domain keywords for wiki/tribal coverage (trailing-boundary token match).
const KW = {
  cam: ["cam", "toolpath", "hypermill", "mastercam"], cad: ["cad", "step", "feature-recognition"],
  mill: ["mill", "vmc", "endmill"], lathe: ["lathe", "turning", "css"],
  wedm: ["wedm", "wire-edm", "edm", "discharge"], "speed-feed": ["speed-feed", "sfc", "kienzle", "feed"],
  business: ["business", "erp", "quote", "invoice"], quoting: ["quote", "quoting", "pricing"],
  academy: ["academy", "course", "curriculum"], "post-processor": ["post-processor", "post", "cps", "controller"],
  "blueprint-vision": ["blueprint", "ocr", "vision", "vlm"], "ai-training": ["gnn", "graphsage", "lora", "neural"],
  "shop-floor": ["shop-floor", "adaptive"], quality: ["quality", "cpk", "spc"],
  "fleet-hygiene": ["fleet", "reaper", "orphan"], "hermes-zulu": ["hermes", "zulu", "orchestrat"],
  "database-expansion": ["database", "qdrant", "agentdb", "sqlite"], discovery: ["discovery", "duplication", "master-index"],
  "system-viz": ["system-viz", "graph", "roost"], "token-optimization": ["token", "rtk", "compaction"],
  wiring: ["wiring", "dispatcher"], "bug-hunting": ["bug", "regression", "fail-loud"],
  "backend-helper": ["backend", "tsc", "esbuild"], "dormant-data": ["dormant", "dormant-engine", "orphan-data", "orphan-engine"],
  "compliance-safety": ["compliance", "safety", "alarm"], "knowledge-conversion": ["knowledge-conversion", "course-forge"],
  "corpus-aggregation": ["corpus", "aggregation"], "mit-curriculum": ["mit", "ocw"],
  "pdf-corpus": ["pdf", "pypdf"], "pdf-corpus-mill": ["pdf", "mill"],
  "tribal-knowledge": ["tribal", "tip"], "cad-fusion-live": ["cad-fusion", "fusion-live", "fusion360", "fus-apisrv", "hcs-connector", "live-session", "mill-turn-live"],
  "agent-orchestration": ["orchestrat", "agent"], "frontend-app": ["frontend", "react", "nextjs"],
};

function read(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function listMd(dir) {
  const out = [];
  if (!exists(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith(".md")) out.push(p);
    }
  }
  return out;
}
function matchTok(name, kws) {
  const n = name.toLowerCase();
  // Match both hyphen and underscore forms — memory filenames use underscores
  // (reference_shop_floor_*), wiki/tribal use hyphens (shop-floor-*).
  const variants = (k) => {
    const lk = k.toLowerCase();
    return [...new Set([lk, lk.replace(/-/g, "_"), lk.replace(/_/g, "-")])];
  };
  return kws.flatMap(variants).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .some((k) => new RegExp(`${k}([^a-z0-9]|$)`).test(n));
}

// ── Pure, testable helpers (R9 — exported so the scoring authority has tests) ──
// Frontmatter `galaxy:` tag reader — HEAD only. The AUTHORITATIVE per-galaxy
// mapping signal that survives the filename-keyword bleed which let dormant-data
// score 103/104 cross-galaxy tokens.
export function readFmGalaxy(p) {
  let head; try { head = fs.readFileSync(p, "utf8").slice(0, 1200); } catch { return null; }
  const m = head.match(/^\s*galaxy:\s*["']?([A-Za-z0-9_-]+)/m);
  return m ? m[1].toLowerCase() : null;
}
const _gNorm = (s) => s.replace(/-/g, "_");
const _isAutoGen = (b) => /^node_/.test(b); // mirror fill-galaxy-memory-sections.mjs:140
// A file counts for `galaxy` iff: frontmatter galaxy tag matches (authoritative) OR
// (mem only) filename carries the owning slot key `_<slot>_` OR a CURATED galaxy
// keyword. node_* auto-gen excluded on ALL axes. Generic cross-galaxy keywords
// (unwired/dead-edge) were reverted from the KW table so they can't bleed.
export function fileCountsForGalaxy({ basename, fmTag, galaxy, slot, kws, allowSlotKey = false }) {
  if (_isAutoGen(basename)) return false;
  if (fmTag && (fmTag === galaxy || _gNorm(fmTag) === _gNorm(galaxy))) return true;
  if (allowSlotKey && slot && basename.includes(`_${slot}_`)) return true;
  return matchTok(basename, kws);
}
// Freshness: synthesis must be at least as new as MEMORY.md, else it's stale drift.
export function isSynthesisFresh(synthMtimeMs, memMtimeMs) {
  return Number.isFinite(synthMtimeMs) && Number.isFinite(memMtimeMs) && synthMtimeMs >= memMtimeMs;
}

const CANON = [
  /^##+\s+.*master-?brain link/im, /^##+\s+high-roi memories/im,
  /^##+\s+indexed memories/im, /^##+\s+(cross-galaxy bridges|known failure modes)/im,
];
// A SELF-DECLARED stub banner (real gap) — NOT an incidental mention of the word
// "stub" (e.g. a soul's "stub-hunting" refuse, or a mature CLAUDE.md noting it
// once in prose). Matches the scaffolder's banner forms only.
const STUB_BANNER = /HONEST STUB|⚠[^\n]{0,12}STUB|STUB\s*[\/—–-]\s*awaiting|awaiting\s+U-GALAXY|awaiting[^\n]{0,30}(migration|slot assignment)|^>?\s*STUB\b/im;
// Generic-stub soul frontmatter per PER-SLOT-GALAXY-BUILD-KIT.md STEP 1.
// Anchored to line-start `role:` so it matches the generic `role: work` stub but
// NOT the standard `hermes_role: work` field that every (incl. realigned) soul carries.
const SOUL_GENERIC = /^role:\s*work\b/im;

function auditGalaxy(g) {
  const dir = path.join(ENG, g);
  const slot = GALAXY_SLOT[g] || null;
  const claudeMd = read(path.join(dir, "CLAUDE.md"));
  const memoryMd = read(path.join(dir, "MEMORY.md"));
  const pathsMd = read(path.join(dir, "PATHS.md"));
  const toolbeltMd = read(path.join(dir, "TOOLBELT.md"));
  const kws = KW[g] || [g, g.replace(/-/g, "")];

  // node_* auto-gen + patterns/ excluded on ALL axes (was mem-only — the filter
  // asymmetry the audit flagged). Counting predicate is the pure, exported
  // fileCountsForGalaxy (R9-testable); frontmatter tag via readFmGalaxy.
  const countsFor = (dir, opts = {}) => listMd(dir).filter((p) => {
    if (p.includes(`${path.sep}patterns${path.sep}`)) return false;
    return fileCountsForGalaxy({ basename: path.basename(p), fmTag: readFmGalaxy(p), galaxy: g, slot, kws, ...opts });
  }).length;
  const archHits = countsFor(WIKI_ARCH);
  const tribalHits = countsFor(TRIBAL);
  const memHits = countsFor(MEM, { allowSlotKey: true });
  // container skills: .claude/commands/*-<slot>.md or domain-named skill
  const skillHits = slot
    ? listMd(CMDS).filter((p) => path.basename(p).includes(`-${slot}`) || path.basename(p).startsWith(`${slot}-`)).length
    : 0;
  const synthesis = read(path.join(PATTERNS, `${g}_synthesis.md`));
  const synthOk = !!synthesis && /[^\s\x00]/.test(synthesis) && /^##\s+(recurring patterns|key decisions)/im.test(synthesis);
  // Freshness: a synthesis OLDER than MEMORY.md is stale drift. The rubric reported
  // 34/34 while 7/8 synth files lagged MEMORY.md by 2-5 days — shape-valid but stale.
  let synthFresh = false;
  try {
    const sPath = path.join(PATTERNS, `${g}_synthesis.md`);
    if (synthOk && exists(sPath) && memoryMd) {
      synthFresh = isSynthesisFresh(fs.statSync(sPath).mtimeMs, fs.statSync(path.join(dir, "MEMORY.md")).mtimeMs);
    }
  } catch { synthFresh = false; }

  const soulText = slot ? read(path.join(SOULS, `${slot}.md`)) : null;
  const checks = {
    // Soul present + not generic-stub frontmatter (role: work). Mentioning the
    // word "stub" (e.g. bravo's "stub-hunting" refuse) is NOT a stub soul.
    soul: slot ? (!!soulText && soulText.length > 300 && !SOUL_GENERIC.test(soulText.slice(0, 400))) : "n/a",
    // CLAUDE.md real if substantial AND not a self-declared stub banner. cam &
    // speed-feed open with "⚠ HONEST STUB" → real gaps; cad/wedm merely mention
    // "stub" once in mature prose → not flagged.
    claudeMd: !!claudeMd && claudeMd.length > 1000 && !STUB_BANNER.test(claudeMd.slice(0, 500)),
    memory4: !!memoryMd && CANON.filter((r) => r.test(memoryMd)).length === 4,
    paths: !!pathsMd && pathsMd.length > 1000,
    toolbelt: !!toolbeltMd && toolbeltMd.length > 400,
    wiki3: archHits >= 3,
    tribal5: tribalHits >= 5,
    memory10: memHits >= 10,
    skill1: slot ? skillHits >= 1 : "n/a",
    psnEdges: !!claudeMd && /##+\s+(related galaxies|cross-galaxy|psn)/im.test(claudeMd),
    synthesis: synthOk,
    synthesisFresh: synthFresh,
  };
  // Score: count true among non-n/a checks.
  const applicable = Object.values(checks).filter((v) => v !== "n/a");
  const passed = applicable.filter((v) => v === true).length;
  return { g, slot, score: passed, max: applicable.length, checks,
    counts: { wiki: archHits, tribal: tribalHits, mem: memHits, skills: skillHits } };
}

function main() {
  const json = process.argv.includes("--json");
  const galaxies = fs.readdirSync(ENG, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".")) // exclude dot-dirs (.claude etc.)
    .map((d) => d.name)
    .filter((g) => exists(path.join(ENG, g, "CLAUDE.md")) || exists(path.join(ENG, g, "MEMORY.md")));
  const rows = galaxies.map(auditGalaxy).sort((a, b) => (a.score / a.max) - (b.score / b.max));

  if (json) { console.log(JSON.stringify(rows, null, 2)); return; }

  console.log("=== GALAXY COMPLETENESS AUDIT (canonical 11-artifact rubric) ===");
  console.log("score | galaxy (slot) | missing axes | wiki/tribal/mem/skill counts");
  console.log("-".repeat(100));
  for (const r of rows) {
    const missing = Object.entries(r.checks).filter(([, v]) => v === false).map(([k]) => k);
    const c = r.counts;
    console.log(`${r.score}/${r.max}  ${r.g.padEnd(22)}${("(" + (r.slot || "—") + ")").padEnd(11)} miss:[${missing.join(",")}]  w${c.wiki}/t${c.tribal}/m${c.mem}/s${c.skills}`);
  }
  const fully = rows.filter((r) => r.score === r.max).length;
  console.log("-".repeat(100));
  console.log(`${rows.length} galaxies · ${fully} at full · fill sequence (worst-first): ${rows.slice(0, 8).map((r) => r.g).join(" → ")}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
