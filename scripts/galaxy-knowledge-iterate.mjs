#!/usr/bin/env node
/**
 * galaxy-knowledge-iterate.mjs -- the cron-runnable driver of the fleet
 * knowledge-accretion loop (FLEET-KNOWLEDGE-MAX / U-ZKM-ITERATE, slot:zulu
 * 2026-06-14). Operator goal: loop EVERY galaxy >=10x each, extracting reputable
 * external sources, until physically impossible (no more reputable sources).
 *
 * TWO-TIER design (honest about what runs where -- R12):
 *  - WORKFLOW tier (in a Claude session): `galaxy-deepen-foundations` Workflow does
 *    the WebFetch-CONFIRMED deepening (the real extraction). Record its outcome here
 *    with `--record GALAXY --sources a,b,c --note "..."` (or --confirmed).
 *  - HERMES tier (THIS script, cron-safe): calls Hermes (xAI Grok via :8645, outside
 *    Claude ctx) for the next deep-research layer + candidate reputable sources, and
 *    deposits a DRAFT anchor (clearly marked Hermes-drafted-pending-WebFetch-promotion)
 *    into the Obsidian vault. Keeps the loop turning between sessions.
 *
 * The ledger (galaxy-knowledge-ledger.mjs) gives the DETERMINISTIC stop: a galaxy
 * saturates at >= targetIterations (10) AND sustained low source-novelty. The cron
 * stops touching a galaxy once saturated; the fleet is DONE when all are saturated.
 *
 * USAGE:
 *   node scripts/galaxy-knowledge-iterate.mjs --status            # ledger summary
 *   node scripts/galaxy-knowledge-iterate.mjs --count 2           # Hermes-iterate the 2 least-iterated open galaxies
 *   node scripts/galaxy-knowledge-iterate.mjs --galaxy mill       # Hermes-iterate one named galaxy
 *   node scripts/galaxy-knowledge-iterate.mjs --record mill --sources "https://...,Author 2019 Title" --course 2 --note "..."
 *   node scripts/galaxy-knowledge-iterate.mjs --init-only         # just (re)build the ledger for all 34, no iteration
 * Env: PRISM_GKI_LEDGER (override path) · HERMES via ask-hermes.mjs · PRISM_GKI_HERMES_TIMEOUT_MS
 * ASCII-only.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initLedger,
  loadLedger,
  saveLedger,
  recordIteration,
  isSaturated,
  nextGalaxies,
  summary,
  fleetDone,
} from "./lib/galaxy-knowledge-ledger.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const LEDGER_PATH = process.env.PRISM_GKI_LEDGER || join(REPO, "state", "shared", "galaxy-knowledge-iterations.json");
// Cron has no Claude Stop hook, so write anchors straight into the Obsidian vault location.
const VAULT_REF = join(REPO, "knowledge", "memories", "reference");
const HERMES = join(REPO, "scripts", "ask-hermes.mjs");
const HERMES_TIMEOUT = Number(process.env.PRISM_GKI_HERMES_TIMEOUT_MS) || 240000;

// The 34 galaxies (engine subdir == galaxy key == galaxy-synthesis-refresh key).
// physics:true => SAFETY-CRITICAL cutting domain: method/standards/theory depth only,
// NEVER a numeric cutting constant (those live ONLY in src/physics/constants.ts).
// `hint` disambiguates the galaxy's TRUE PRISM domain so Hermes does not drift
// (e.g. "discovery" = software asset/code discovery, NOT manufacturing SPC).
export const GALAXIES = [
  { galaxy: "mill", owner: "foxtrot", physics: true, hint: "CNC milling: HSM/trochoidal toolpaths, ap/ae engagement, pocketing, face-milling, mill machining strategy" },
  { galaxy: "lathe", owner: "whiskey", physics: true, hint: "CNC turning/lathe: constant surface speed, single-point threading, boring, grooving/parting, bar/chuck work" },
  { galaxy: "wedm", owner: "mike", physics: true, hint: "wire EDM: multi-pass skim cuts, wire-break prediction, dielectric flushing, recast/HAZ, spark erosion" },
  { galaxy: "cam", owner: "kilo", physics: true, hint: "CAM toolpath programming: cross-vendor (Fusion/Mastercam/hyperMILL/NX), collision avoidance, 5-axis, post-to-program" },
  { galaxy: "speed-feed", owner: "oscar", physics: true, hint: "machining speeds & feeds physics: cutting force, tool life, chatter/stability lobes, MRR optimization" },
  { galaxy: "post-processor", owner: "echo", physics: true, hint: "CNC post-processors: controller dialects (Fanuc/Haas/Siemens/Heidenhain), G-code emission, RTCP/kinematics" },
  { galaxy: "cad", owner: "delta", physics: false, hint: "CAD geometry: feature recognition, STEP/IGES/B-rep, GD&T, parametric modeling, design-for-manufacture" },
  { galaxy: "cad-fusion-live", owner: "delta", physics: false, hint: "live Fusion 360 automation: in-host geometry mutation, API scripting, .f3d round-trip" },
  { galaxy: "quoting", owner: "charlie", physics: false, hint: "manufacturing cost estimation & quoting: should-cost, DFMA, margin/NRE, RFQ, competitive bid pricing" },
  { galaxy: "academy", owner: "lima", physics: false, hint: "technical education & training: curriculum/instructional design, knowledge tracing, assessment, machinist pedagogy" },
  { galaxy: "business", owner: "hotel", physics: false, hint: "manufacturing business systems: ERP, cost accounting, HR/payroll, compliance, cash flow, EDI" },
  { galaxy: "ai-training", owner: "india", physics: false, hint: "AI/ML systems engineering: GNN/GraphSAGE, LoRA/QLoRA, RAG, deep learning, model training/calibration/eval" },
  { galaxy: "quality", owner: "quality", physics: false, hint: "manufacturing quality engineering: SPC, Cpk, MSA/gauge R&R, inspection, ISO 9001/AS9100" },
  { galaxy: "shop-floor", owner: "shop-floor", physics: false, hint: "shop-floor execution: machine monitoring (MTConnect/OPC UA), scheduling, OEE, adaptive process control" },
  { galaxy: "blueprint-vision", owner: "xray", physics: false, hint: "engineering-drawing OCR & vision: VLM extraction, GD&T/FCF parsing, dimension recognition, multi-page split" },
  { galaxy: "frontend-app", owner: "quebec", physics: false, hint: "web/mobile app engineering: React/Next.js, UI/UX, state management, API integration" },
  { galaxy: "database-expansion", owner: "juliett", physics: false, hint: "data persistence engineering: vector DBs (Qdrant/HNSW), SQLite/WAL, schema design, indexing, migration" },
  { galaxy: "bug-hunting", owner: "uniform", physics: false, hint: "software defect detection: silent-failure analysis, regression hunting, static analysis, fault localization" },
  { galaxy: "fleet-hygiene", owner: "golf", physics: false, hint: "OS process/resource hygiene: orphan/zombie process reaping, memory monitoring, scheduled-task health" },
  { galaxy: "discovery", owner: "tango", physics: false, hint: "software asset/code discovery & deduplication: search indexing, capability surfacing, dead-code/orphan detection" },
  { galaxy: "token-optimization", owner: "alpha", physics: false, hint: "LLM token economy: context compression, KV/CAG caching, prompt efficiency, retrieval cost reduction" },
  { galaxy: "system-viz", owner: "sierra", physics: false, hint: "software-system visualization: large-graph rendering/layout, dependency mapping, code navigation" },
  { galaxy: "backend-helper", owner: "papa", physics: false, hint: "backend/build infrastructure: TypeScript compilation, V8/Node internals, CI/CD, build systems, large-file IO" },
  { galaxy: "agent-orchestration", owner: "golf", physics: false, hint: "multi-agent orchestration: model routing, agent coordination, workflow scheduling, consensus" },
  { galaxy: "compliance-safety", owner: "compliance", physics: false, hint: "manufacturing safety & regulatory compliance: machine safety, hazard analysis, S(x) gating, standards conformance" },
  { galaxy: "dormant-data", owner: "victor", physics: false, hint: "unused-asset analysis: dead-data detection, storage reclamation, orphan-data ledgering" },
  { galaxy: "wiring", owner: "romeo", physics: false, hint: "software dependency wiring: dispatcher/module connectivity, reachability analysis, dead-code elimination" },
  { galaxy: "corpus-aggregation", owner: "corpus", physics: false, hint: "knowledge-corpus engineering: document ingestion, dataset aggregation, ETL/extraction pipelines" },
  { galaxy: "knowledge-conversion", owner: "kc", physics: false, hint: "knowledge engineering: courseware-to-code conversion, ontology, structured knowledge extraction" },
  { galaxy: "hermes-zulu", owner: "bravo", physics: false, hint: "AI agent-fleet orchestration: multi-session coordination, agentic planning, fleet management" },
  { galaxy: "pdf-corpus", owner: "pdf", physics: false, hint: "PDF document extraction: page parsing, text/table extraction, technical-document mining" },
  { galaxy: "tribal-knowledge", owner: "tribal", physics: false, hint: "expert tacit-knowledge capture: shop-floor tips, machinist heuristics, know-how codification + retrieval" },
  { galaxy: "pdf-corpus-mill", owner: "pdf-mill", physics: false, hint: "milling-manual PDF extraction: Haas/Mazak handbook mining, machining-document parsing" },
  { galaxy: "mit-curriculum", owner: "mit", physics: false, hint: "MIT OpenCourseWare engineering curriculum: manufacturing/mechanical/controls course content sourcing" },
];

export function parseArgs(argv) {
  const a = { count: 1 };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--status") a.status = true;
    else if (t === "--init-only") a.initOnly = true;
    else if (t === "--confirmed") a.confirmed = true;
    else if (t === "--count") a.count = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (t === "--galaxy") a.galaxy = argv[++i];
    else if (t === "--record") a.record = argv[++i];
    else if (t === "--sources") a.sources = String(argv[++i] || "");
    else if (t === "--course") a.course = parseInt(argv[++i], 10) || 0;
    else if (t === "--note") a.note = argv[++i];
  }
  return a;
}

/** Parse Hermes free text -> { knowledge, sources[] }. Looks for a SOURCES: block. */
export function parseHermes(text) {
  const s = String(text || "");
  const sources = [];
  const m = s.match(/SOURCES?\s*:\s*([\s\S]*)$/i);
  const block = m ? m[1] : s;
  for (const line of block.split(/\r?\n/)) {
    const t = line.replace(/^\s*[-*\d.)\]]+\s*/, "").trim();
    if (!t) continue;
    // a "source" = a line that looks like a citation (has a URL, a year, or Title-Case + a comma)
    if (/https?:\/\//i.test(t) || /\b(19|20)\d{2}\b/.test(t) || /[A-Z][a-z]+,/.test(t)) {
      sources.push(t.slice(0, 200));
    }
    if (sources.length >= 30) break;
  }
  return { knowledge: s, sources: Array.from(new Set(sources)) };
}

function hermesResearch(entry, iter, prior) {
  const physicsRule = entry.physics
    ? "SAFETY-CRITICAL cutting galaxy: give METHOD/theory/standards/source depth ONLY. NEVER state a numeric cutting constant (kc1.1, Taylor C/n, specific force, SFM/IPR/chip-load) -- those are owner-gated in src/physics/constants.ts."
    : "Give institutional/standards/methodology/theory depth.";
  const seen = prior.length ? `Already-covered sources (do NOT repeat): ${prior.slice(-25).join(" | ")}` : "No sources covered yet.";
  const fieldFence = entry.physics
    ? "This IS a machining/manufacturing-physics domain: use manufacturing/machining/materials sources."
    : "CRITICAL FIELD FENCE: treat the domain as EXACTLY the description above and nothing else. If that description is a software/computer-science, AI/ML, data, business, or education domain, your sources MUST come from THAT field (CS/software-engineering textbooks, ACM/IEEE/arXiv/USENIX papers, language/tool/framework docs, business or pedagogy literature) -- do NOT pull manufacturing, machining, metrology, SPC, DOE, or gauge-R&R sources just because PRISM serves manufacturing. The galaxy name may collide with a manufacturing term; the description is authoritative, not the name.";
  const q = `You are a world-leading expert in this EXACT domain: ${entry.hint || entry.galaxy}. This is PRISM's internal "${entry.galaxy}" galaxy (PRISM is a software platform for manufacturing intelligence, but most galaxies are SOFTWARE/engineering domains, not machining). ${fieldFence} This is deep-research iteration ${iter} for PRISM's ${entry.galaxy} knowledge base. Goal: name the NEXT layer of reputable-source knowledge a world-leading expert masters that is NOT yet covered -- pulled from college courses (MIT OCW / .edu courseware), textbooks, standards bodies (ISO/ASME/IEEE/etc.), government reports (NIST/NASA/DOE/BLS), reputable seminars/conference papers, and technical articles. ${seen} ${physicsRule} Cite ONLY real, published, nameable sources (author+year / standard number / course id) -- NO fabricated databases or made-up papers (if unsure, say so). Be concrete. End your answer with a line "SOURCES:" followed by one source per line (author+year+title / standard-number / course-id / URL). Keep under 450 words.`;
  let out;
  try {
    out = execFileSync(process.execPath, [HERMES, "ask", q, "--timeout", String(HERMES_TIMEOUT)], {
      cwd: REPO,
      timeout: HERMES_TIMEOUT + 30000,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (e) {
    // FAIL LOUD -- do not fabricate an iteration if the planner is unreachable.
    throw new Error(`hermesResearch(${entry.galaxy}): Hermes call failed: ${e.message}`);
  }
  return parseHermes(out);
}

function depositAnchor(entry, iter, knowledge, sources) {
  if (!existsSync(VAULT_REF)) mkdirSync(VAULT_REF, { recursive: true });
  const slug = `reference_${entry.galaxy}_iter${iter}_deepsource_2026_06_14`;
  const file = join(VAULT_REF, `${slug}.md`);
  const body = `---
name: ${slug}
description: "Knowledge-accretion iteration ${iter} for the ${entry.galaxy} galaxy (owner:${entry.owner}). Hermes-DRAFTED next-layer reputable-source research (courses/textbooks/standards/gov-reports/seminars/articles). DRAFT: citations are Hermes-recalled, PENDING WebFetch-promotion by a session deepen-workflow pass. ${entry.physics ? "Physics-safe: method/standards depth only, no cutting constants." : ""} Written 2026-06-14 by galaxy-knowledge-iterate.mjs (cron tier)."
metadata:
  node_type: memory
  type: reference
  originSessionId: cron-galaxy-knowledge-iterate
---

## Context (DRAFT -- Hermes tier, pending WebFetch-promotion, R12)
Deep-research iteration **${iter}** for the **${entry.galaxy}** galaxy. Drafted by Hermes (xAI Grok) via the
cron knowledge-accretion loop. Citations are Hermes-RECALLED, NOT yet WebFetch-confirmed -- a session
\`galaxy-deepen-foundations\` Workflow pass promotes the confirmable claims to VERIFIED in
\`knowledge/wiki/${entry.galaxy}/${entry.galaxy}-foundations.md\`. ${entry.physics ? "**Safety:** no numeric cutting constant appears below; those stay owner-gated in src/physics/constants.ts." : ""}

## Next-layer knowledge (Hermes-drafted)
${knowledge.replace(/\r/g, "").trim()}

## Sources (candidate -- WebFetch-verify before promoting)
${sources.length ? sources.map((s) => `- ${s}`).join("\n") : "- (none parsed)"}

_Cron tier of FLEET-KNOWLEDGE-MAX (U-ZKM-ITERATE). Ledger: state/shared/galaxy-knowledge-iterations.json._
`;
  writeFileSync(file, body, "utf8");
  return file;
}

function getOrInitLedger(at) {
  let ledger = loadLedger(LEDGER_PATH); // throws on corrupt -> never clobbers
  if (!ledger) {
    ledger = initLedger(GALAXIES, { at });
    saveLedger(LEDGER_PATH, ledger, at);
    log(`init ledger: ${Object.keys(ledger.galaxies).length} galaxies -> ${LEDGER_PATH}`);
  }
  return ledger;
}

function log(...m) {
  process.stdout.write(m.join(" ") + "\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const at = new Date().toISOString();
  const ledger = getOrInitLedger(at);

  if (args.initOnly) {
    log(JSON.stringify(summary(ledger), null, 2));
    return;
  }
  if (args.status) {
    const s = summary(ledger);
    log(`FLEET KNOWLEDGE-MAX ledger: ${s.saturated}/${s.total} saturated · iters min ${s.minIterations}/max ${s.maxIterations} (target ${s.target}) · fleetDone=${s.fleetDone}`);
    for (const e of Object.values(ledger.galaxies).sort((a, b) => a.iterations - b.iterations)) {
      log(`  ${e.saturated ? "[SAT]" : "[   ]"} ${e.galaxy.padEnd(20)} iter ${String(e.iterations).padStart(2)} · newSrc ${String(e.totalNewSources).padStart(3)} · lowStreak ${e.consecutiveLowNovelty}`);
    }
    return;
  }

  // Record an externally-confirmed (Workflow-tier) iteration into the ledger.
  if (args.record) {
    const g = args.record;
    if (!ledger.galaxies[g]) throw new Error(`--record: unknown galaxy '${g}'`);
    const sources = args.sources ? args.sources.split(",").map((x) => x.trim()).filter(Boolean) : [];
    recordIteration(ledger, g, { sources, courseBookSources: args.course || 0, note: args.note || (args.confirmed ? "WebFetch-confirmed (Workflow tier)" : "recorded"), at });
    saveLedger(LEDGER_PATH, ledger, at);
    log(`recorded ${g} -> iter ${ledger.galaxies[g].iterations} (newSrc this iter ${ledger.galaxies[g].history.at(-1).newSources}) · saturated=${isSaturated(ledger, g)}`);
    return;
  }

  if (fleetDone(ledger)) {
    log("FLEET DONE -- every galaxy saturated (>=10 iters + sustained source-exhaustion). Nothing to iterate.");
    return;
  }

  // Pick the galaxies to Hermes-iterate this run.
  let picks;
  if (args.galaxy) {
    const e = ledger.galaxies[args.galaxy];
    if (!e) throw new Error(`--galaxy: unknown '${args.galaxy}'`);
    if (e.saturated) { log(`${args.galaxy} already saturated; nothing to do.`); return; }
    picks = [e];
  } else {
    picks = nextGalaxies(ledger, args.count);
  }
  if (!picks.length) { log("no open galaxies."); return; }

  for (const e of picks) {
    const iter = e.iterations + 1;
    log(`hermes-iterate ${e.galaxy} (iteration ${iter})...`);
    const { knowledge, sources } = hermesResearch(e, iter, e.sourceKeys);
    const file = depositAnchor(e, iter, knowledge, sources);
    recordIteration(ledger, e.galaxy, { sources, note: `Hermes draft -> ${file}`, at });
    saveLedger(LEDGER_PATH, ledger, at);
    const ent = ledger.galaxies[e.galaxy];
    log(`  ${e.galaxy}: iter ${ent.iterations}, ${ent.history.at(-1).newSources} new src, anchor ${file}, saturated=${isSaturated(ledger, e.galaxy)}`);
  }
  log(JSON.stringify(summary(ledger)));
}

// run-as-main guard so importing for tests does not execute
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
