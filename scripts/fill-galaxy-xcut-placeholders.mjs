#!/usr/bin/env node
// fill-galaxy-xcut-placeholders.mjs
// GALAXY-ENRICH (papa, 2026-06-09): fill the two `<!-- owner-slot -->` placeholders
// in every galaxy CLAUDE.md cross-cutting block with CONCRETE, galaxy-specific
// (a) Ollama offload example and (b) recommended /loop(s). These are papa-VERIFIED
// PRISM-internal facts (the Blackwell model roster + loop mechanics + each galaxy's
// domain) -- not physics, not owner-gated. Idempotent: only replaces the exact
// placeholder strings; re-running after a fill is a no-op.
// Usage: node scripts/fill-galaxy-xcut-placeholders.mjs [--dry]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PH_OLLAMA = "<!-- owner-slot: add 1 galaxy-specific Ollama offload example -->";
const PH_LOOPS = "<!-- owner-slot: list 1-2 recommended loops for this galaxy -->";
const DRY = process.argv.includes("--dry");

// Canonical Blackwell roster (reference, not re-stated per galaxy): gpt-oss:120b (deep),
// gpt-oss:20b (mid triage), qwen2.5-coder:32b (heavy code/default), qwen2.5-coder:1.5b
// (trivial), nomic-embed-text (embed), qwen2.5vl + VLM ensemble (vision/OCR).
const MAP = {
  // --- machining / physics galaxies ---
  "mill": {
    ollama: "Offload: summarize/explain a Haas/Mazak mill program or a hyperMILL `.hmt` NCTools setup -> `qwen2.5-coder:32b`; classify mill features from a feature list -> `gpt-oss:20b`. Keep Kienzle/Taylor reasoning + S(x) safety on Claude.",
    loops: "Loops: mill speed-feed optimization `/loop` (each iter: pick part -> SFC physics -> validate vs S(x) gate); tool-library coverage audit `/loop`.",
  },
  "lathe": {
    ollama: "Offload: summarize a turning program / explain G96-G97 CSS logic -> `qwen2.5-coder:32b`; classify a chuck-jaw setup -> `gpt-oss:20b`. CSS/chuck-jaw SAFETY stays on Claude.",
    loops: "Loops: lathe CSS + chuck-jaw safety audit `/loop`; turning cycle-time estimate `/loop`.",
  },
  "wedm": {
    ollama: "Offload: summarize a wire-EDM E-code program / explain an ACU 7-pass family -> `qwen2.5-coder:32b`. Discharge-physics derivation stays on Claude (gpt-oss:120b for deep local).",
    loops: "Loops: WEDM tech-table coverage `/loop`; discharge-parameter optimization `/loop`.",
  },
  "speed-feed": {
    ollama: "Offload: explain a Kienzle/Taylor/Merchant derivation -> `gpt-oss:120b` (deep local); lint SFC engine code -> `qwen2.5-coder:32b`. Numeric constants come from `constants.ts`, never the LLM.",
    loops: "Loops: SFC vendor-parity sweep `/loop` (HSMAdvisor/G-Wizard); per-material calibration `/loop`.",
  },
  "cam": {
    ollama: "Offload: summarize a hyperMILL/Mastercam toolpath strategy or `.mcam` op tree -> `qwen2.5-coder:32b`; classify a strategy choice -> `gpt-oss:20b`.",
    loops: "Loops: CAM strategy-recommend -> toolpath-gen -> collision-check `/loop`; cross-vendor transfer-verify `/loop`.",
  },
  "post-processor": {
    ollama: "Offload: explain a `.cps`/`.pst` post or diff two controller dialects -> `qwen2.5-coder:32b`. Controller numeric defaults stay owner/`constants.ts`-gated.",
    loops: "Loops: post-parity verify `/loop` (CAM-sim vs emitted G-code); controller-dialect coverage `/loop`.",
  },
  "cad": {
    ollama: "Offload: summarize a STEP AP242 feature tree / explain a GD&T FCF -> `gpt-oss:20b`; lint CAD engine code -> `qwen2.5-coder:32b`.",
    loops: "Loops: CAD feature-recognition coverage `/loop`; STEP AP242 round-trip validation `/loop`.",
  },
  "blueprint-vision": {
    ollama: "Offload: VLM-OCR a drawing via the multi-VLM ensemble (`qwen2.5vl` + family, >=2-agree=corroborated); classify extracted dims -> `gpt-oss:20b`.",
    loops: "Loops: OCR closed-loop training `/loop` (per-page, resumable cursor); ensemble-consensus tuning `/loop`.",
  },
  // --- business / support galaxies ---
  "business": {
    ollama: "Offload: summarize an RFQ/PO, classify a vendor invoice, extract line items -> `gpt-oss:20b`. PII gate untrusted intake first; financial invariants stay deterministic.",
    loops: "Loops: quote-vs-actual reconciliation `/loop`; capacity-planning audit `/loop`.",
  },
  "quoting": {
    ollama: "Offload: extract cost drivers from a print, summarize an RFQ, OCR a blueprint -> `gpt-oss:20b`. Pricing math stays deterministic; $ rates owner-gated.",
    loops: "Loops: quote bootstrap-distribution `/loop`; NRE-amortization tuning `/loop`.",
  },
  "quality": {
    ollama: "Offload: summarize an SPC report, classify a defect, draft an FAI narrative -> `gpt-oss:20b`. Cpk/control-limit numerics stay deterministic.",
    loops: "Loops: Cpk-gate audit `/loop`; control-limit recalibration `/loop`.",
  },
  "shop-floor": {
    ollama: "Offload: summarize MTConnect machine status, triage an alarm, classify a downtime reason -> `gpt-oss:20b`. S(x) safety + adaptive-control decisions stay on Claude.",
    loops: "Loops: OEE rollup `/loop`; adaptive-feed shop-floor `/loop`.",
  },
  "academy": {
    ollama: "Offload: summarize a MIT-OCW lecture, generate a quiz from a lesson, classify a course-prereq -> `gpt-oss:20b`/`qwen2.5-coder:32b`.",
    loops: "Loops: course 3-leg-ship audit `/loop`; prereq-DAG validation `/loop`.",
  },
  // --- AI / infra galaxies ---
  "agent-orchestration": {
    ollama: "Offload: draft a multi-agent harness plan -> `gpt-oss:120b` (deep); classify a task for routing -> `gpt-oss:20b`. Route deterministically in code (R5), reason only when needed.",
    loops: "Loops: fleet-orchestration health `/loop`; agent-assignment ROI `/loop`.",
  },
  "hermes-zulu": {
    ollama: "Offload: draft a slot-brief, classify a slot's lane, summarize a handoff -> `gpt-oss:20b`.",
    loops: "Loops: slot-orchestration `/loop`; stub-hunt `/loop`.",
  },
  "token-optimization": {
    ollama: "Offload: summarize a long transcript for compaction -> `gpt-oss:20b`; classify a CAG/RAG route -> `qwen2.5-coder:1.5b` (trivial). This galaxy IS the offload-policy owner.",
    loops: "Loops: offload-ratio dashboard `/loop` (target >=30%); CAG cold-cache audit `/loop`.",
  },
  "database-expansion": {
    ollama: "Offload: summarize a schema migration, explain an HNSW/RaBitQ index, classify a store -> `qwen2.5-coder:32b`. Embeddings via `nomic-embed-text`.",
    loops: "Loops: store-coverage audit `/loop`; GPU embed-pool rebuild `/loop`.",
  },
  "knowledge-conversion": {
    ollama: "Offload: convert a MIT-OCW lecture or monolith node into a tribal tip / 6-node-type leaf -> `gpt-oss:20b`.",
    loops: "Loops: MIT-OCW 3-lane conversion `/loop`; port-verify `/loop`.",
  },
  "corpus-aggregation": {
    ollama: "Offload: summarize + dedup a corpus batch, tag domain -> `gpt-oss:20b`. Embed via `nomic-embed-text`.",
    loops: "Loops: corpus ingest `/loop` (zero-drop streaming); coverage-audit `/loop`.",
  },
  "mit-curriculum": {
    ollama: "Offload: index/summarize an OCW course, extract syllabus structure -> `gpt-oss:20b`.",
    loops: "Loops: OCW harvest-on-demand `/loop`.",
  },
  "pdf-corpus": {
    ollama: "Offload: summarize an extracted PDF page -> `gpt-oss:20b`; VLM-OCR a scanned page -> VLM ensemble. Use the lima pypdf page-by-page extractor (canonical).",
    loops: "Loops: pypdf page-by-page extraction `/loop` (resumable).",
  },
  "pdf-corpus-mill": {
    ollama: "Offload: summarize a Haas/Mazak manual page -> `gpt-oss:20b`; VLM-OCR a scanned figure -> VLM ensemble.",
    loops: "Loops: mill-manual extraction `/loop` (resumable cursor).",
  },
  "tribal-knowledge": {
    ollama: "Offload: lint/normalize a tribal tip, suggest cross-refs, embed -> `gpt-oss:20b` + `nomic-embed-text`. Ollama owns >=70% of tribal/wiki maintenance.",
    loops: "Loops: tribal coverage `/loop`; rerank-tuning `/loop`.",
  },
  "frontend-app": {
    ollama: "Offload: explain a React component, lint TSX, group build errors -> `qwen2.5-coder:32b`.",
    loops: "Loops: tsc-error-reduction `/loop` (goal: 0); route-coverage `/loop`.",
  },
  "discovery": {
    ollama: "Offload: summarize a dedup candidate set, classify an asset by domain -> `gpt-oss:20b`. DuplicationGuard stays deterministic (THROWS).",
    loops: "Loops: orphan-inventory `/loop`; coverage-audit `/loop`.",
  },
  "wiring": {
    ollama: "Offload: explain an engine's dispatcher contract, summarize a wiring diff -> `qwen2.5-coder:32b`.",
    loops: "Loops: unwired-engine closure `/loop` (drive `stop_on_unwired_assets` to 0).",
  },
  "bug-hunting": {
    ollama: "Offload: triage an error, summarize a stack trace, classify a failure mode -> `gpt-oss:20b`. Root-cause reasoning stays on Claude.",
    loops: "Loops: silent-no-op hunt `/loop`; regression-audit `/loop`.",
  },
  "backend-helper": {
    ollama: "Offload: group tsc errors by file/code, explain a NodeNext module-resolution break -> `qwen2.5-coder:32b` (`rtk tsc` first for grouping).",
    loops: "Loops: tsc-error-reduction `/loop` (goal: 0 across workspace); build-tier verify `/loop`.",
  },
  "dormant-data": {
    ollama: "Offload: classify a dormant/orphan-data candidate, summarize a ledger -> `gpt-oss:20b`.",
    loops: "Loops: dormant-X audit `/loop`.",
  },
  "fleet-hygiene": {
    ollama: "Offload: triage a reaper candidate, summarize an orphan sweep -> `gpt-oss:20b`. Reaper kill-decisions stay deterministic (ancestry-confirmed).",
    loops: "Loops: fleet-reaper sweep `/loop`; memory-pressure monitor `/loop`.",
  },
  "cad-fusion-live": {
    ollama: "Offload: summarize a Fusion automation session log, classify a UI element -> `qwen2.5-coder:32b`.",
    loops: "Loops: automation-bridge probe `/loop` (read-only surface discovery first).",
  },
  "compliance-safety": {
    ollama: "Offload: summarize an S(x) validation report, classify a safety alarm family -> `gpt-oss:20b`. NEVER web/LLM-source a safety numeric -- S(x)/Omega thresholds + constants come from `constants.ts`/`omega-thresholds.json` only.",
    loops: "Loops: S(x)-gate audit `/loop`; alarm-family coverage `/loop`.",
  },
  "system-viz": {
    ollama: "Offload: summarize a graph regen diff, classify a ghost node -> `gpt-oss:20b`. The 644MB graph stays code-driven (regen is one canonical writer).",
    loops: "Loops: regen-viz `/loop`; ghost-roost coverage `/loop`.",
  },
};

let updated = 0, skipped = 0, missing = 0, noPh = 0;
for (const g of Object.keys(MAP)) {
  const cp = path.join(ROOT, "mcp-server", "src", "engines", g, "CLAUDE.md");
  if (!fs.existsSync(cp)) { console.log(`  MISSING ${g}`); missing++; continue; }
  let cur = fs.readFileSync(cp, "utf8");
  if (!cur.includes(PH_OLLAMA) && !cur.includes(PH_LOOPS)) { console.log(`  no-placeholder ${g} (already filled?)`); noPh++; continue; }
  const next = cur.replace(PH_OLLAMA, MAP[g].ollama).replace(PH_LOOPS, MAP[g].loops);
  if (next === cur) { skipped++; continue; }
  if (DRY) { console.log(`  [dry] ${g}`); updated++; continue; }
  fs.writeFileSync(cp, next);
  console.log(`  filled ${g}`);
  updated++;
}
console.log(`\n${DRY ? "[dry] " : ""}filled=${updated} no-placeholder=${noPh} missing=${missing}`);
