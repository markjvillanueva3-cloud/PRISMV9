#!/usr/bin/env node
/**
 * cad-gen-coverage-meter.mjs -- the agent-FREE, re-runnable CAD-generation coverage meter
 * (U-CADGEN-COVERAGE-METER, slot:india 2026-06-12). The fix for the audit that rate-limited:
 *
 *   - PHASE 1 (deterministic, R5): scan each galaxy's source for every technique-category keyword,
 *     score in CODE. NO agents -> NO Anthropic rate limit, instant, re-runnable. This is the whole
 *     coverage NUMBER. (A coverage audit is a search problem, not a 34-agent job.) Pure Node -- NO
 *     external `rg` dependency (the first cut shelled out to ripgrep, which is NOT installed on this
 *     host -> every galaxy silently skipped -> a false 0%; the fail-soft skip surfaced it -- R12).
 *   - PHASE 2 (optional, --ollama): the per-galaxy QUALITATIVE pass ("name the biggest gap") is the
 *     mechanical fan-out that tripped Anthropic before. It now AUTO-routes to local Ollama via
 *     smartFanout -- $0, no rate limit, GPU-bound. This is the dogfood proof of the auto-invocation:
 *     the EXACT task that rate-limited on 34 Claude agents runs locally instead.
 *
 * Usage:
 *   node scripts/cad-gen-coverage-meter.mjs            # deterministic meter -> console + JSON/MD
 *   node scripts/cad-gen-coverage-meter.mjs --ollama   # + per-galaxy qualitative gap notes (LOCAL)
 *   node scripts/cad-gen-coverage-meter.mjs --json     # JSON to stdout only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, scoreCoverage } from "./lib/cad-coverage-score.mjs";
import { smartFanout } from "./lib/smart-fanout.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const ENGINES = path.join(ROOT, "mcp-server", "src", "engines");
const OUT_JSON = path.join(ROOT, "state", "shared", "specs", "CAD-GEN-COVERAGE-METER.json");
const OUT_MD = path.join(ROOT, "state", "shared", "specs", "CAD-GEN-COVERAGE-METER.md");
const TEXT_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".md", ".markdown", ".json", ".txt"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", ".cache", "coverage", "__pycache__"]);
const MAX_FILE_BYTES = 4 * 1024 * 1024; // skip giant generated artifacts

// keyword -> categoryId (first owner wins; keywords are CAD-specific to minimize cross-domain FPs)
const KW_TO_CAT = new Map();
const ALL_KW = [];
for (const cat of CATEGORIES) {
  for (const kw of cat.keywords) {
    const k = kw.toLowerCase();
    if (!KW_TO_CAT.has(k)) { KW_TO_CAT.set(k, cat.id); ALL_KW.push(k); }
  }
}
// One alternation regex over the STATIC keyword set (not model input -> no ReDoS surface). Longest-
// first so a phrase like "swept surface" wins over a bare substring before it.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KW_REGEX = new RegExp("(" + [...ALL_KW].sort((a, b) => b.length - a.length).map(escapeRe).join("|") + ")", "g");

// CAPABILITY signal: a technique keyword only counts when it sits on a line that ALSO declares a
// GENERATION OPERATION. This is what discriminates `case "fillet":` / `generateFillet(` / `action:
// "extrude"` (a real op we can execute) from a bare mention in a comment, a toolpath variable, or --
// the dominant false positive -- the wiki INDEX naming every engine (which inflated a raw-mention scan
// to a meaningless 96% vs the grounded audit's ~7%). Without this filter the number is catalog noise.
const OPERATION_MARKER = /\b(case|action|generate|create|construct|build|make|insert|apply|emit|feature|operation|command|sketch|revolve|extrude|loft|sweep|pattern|mirror|offset|trim|knit|draft|shell|chamfer|fillet)\s*[:("'`]|\b(generate|create|construct|build)[A-Z]/;

function* walkTextFiles(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name)) yield* walkTextFiles(path.join(dir, e.name)); }
    else if (TEXT_EXT.has(path.extname(e.name).toLowerCase())) yield path.join(dir, e.name);
  }
}

/**
 * Count technique-keyword hits under a path. Returns {catId:count}.
 * @param {string} target  dir or single file
 * @param {boolean} operationContext  true (CAPABILITY): count a keyword ONLY on a line that also
 *   declares a generation operation. false (KNOWLEDGE PRESENCE): raw mention anywhere.
 */
function countKeywords(target, operationContext) {
  let stat;
  try { stat = fs.statSync(target); } catch { return {}; }
  const files = stat.isDirectory()
    ? [...walkTextFiles(target)]
    : (TEXT_EXT.has(path.extname(target).toLowerCase()) ? [target] : []);
  const counts = {};
  const tally = (text) => {
    for (const m of text.matchAll(KW_REGEX)) {
      const cat = KW_TO_CAT.get(m[1]);
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
  };
  for (const f of files) {
    let content;
    try {
      if (fs.statSync(f).size > MAX_FILE_BYTES) continue;
      content = fs.readFileSync(f, "utf8").toLowerCase();
    } catch { continue; }
    if (!operationContext) { tally(content); continue; }
    for (const line of content.split("\n")) {
      if (OPERATION_MARKER.test(line)) tally(line); // capability: op-declaring lines only
    }
  }
  return counts;
}

function isGalaxyDir(name) {
  return !name.startsWith(".") && name !== "__tests__" && !name.startsWith("_");
}

function buildHits() {
  // CAPABILITY = generation operations in engine CODE (op-context). This is the trustworthy signal.
  const capability = {};
  const galaxies = fs.readdirSync(ENGINES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && isGalaxyDir(d.name)).map((d) => d.name).sort();
  for (const g of galaxies) capability[g] = countKeywords(path.join(ENGINES, g), true);
  // KNOWLEDGE PRESENCE = raw mentions in wiki + tribal (a catalog/theory signal -- reported SEPARATELY,
  // never folded into the capability %; a name in the wiki index is not a technique we can execute).
  const knowledge = { _wiki: countKeywords(path.join(ROOT, "knowledge", "wiki"), false) };
  const tribal = path.join(ROOT, "state", "tribal_captured_tips.json");
  if (fs.existsSync(tribal)) knowledge["_tribal"] = countKeywords(tribal, false);
  return { capability, knowledge, galaxyCount: galaxies.length };
}

/** Categories that have ANY knowledge-presence mention (wiki/tribal), regardless of capability. */
function knowledgeTouchedCategories(knowledge) {
  const touched = new Set();
  for (const src of Object.keys(knowledge)) for (const cat of Object.keys(knowledge[src])) touched.add(cat);
  return touched;
}

/** Per-galaxy mechanical "name the biggest gap" tasks -> AUTO-routed to local Ollama by smartFanout. */
async function ollamaQualitative(report, hits) {
  // Only galaxies with real CAD signal, ranked, capped -- bounded local fan-out.
  const ranked = Object.keys(hits)
    .map((g) => ({ g, total: Object.values(hits[g]).reduce((a, b) => a + b, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const tasks = ranked.map(({ g }) => {
    const pg = report.perGalaxy[g] || { covered: [], shallow: [] };
    const essentialAbsent = CATEGORIES.filter((c) => c.essential && !pg.covered.includes(c.id) && !pg.shallow.includes(c.id)).map((c) => c.label);
    return {
      id: g,
      lane: "ollama", // KNOWN-mechanical inventory work -> force the local lane (the auto-invoke)
      prompt: `Galaxy "${g}" CAD-generation coverage. Covered: ${pg.covered.join(", ") || "none"}. `
        + `Shallow: ${pg.shallow.join(", ") || "none"}. Missing essential categories: ${essentialAbsent.slice(0, 8).join("; ") || "none"}. `
        + `In ONE sentence, summarize the single biggest CAD-generation capability this galaxy still lacks.`,
    };
  });
  if (tasks.length === 0) return { notes: [], routing: { total: 0, ollama: 0, claude: 0 } };
  const { ollamaResults, routing, fallback } = await smartFanout(tasks, { withFallback: true, concurrency: 3 });
  const notes = (ollamaResults.results || []).map((r) => ({ galaxy: r.id, ok: !!r.ok, note: (r.text || r.error || "").trim().slice(0, 400) }));
  // Report the first SUCCESSFUL call's model -- a failed call carries no model, so results[0].model
  // would read undefined even when later calls succeeded (reviewer-A note, 2026-06-12).
  const firstModeled = (ollamaResults.results || []).find((r) => r && r.model);
  return { notes, routing, fallback, model: firstModeled ? firstModeled.model : undefined };
}

function renderMd(report, meta, qual) {
  const L = [];
  L.push(`# CAD-Generation Capability Meter`);
  L.push(``);
  L.push(`_Generated by \`scripts/cad-gen-coverage-meter.mjs\` (deterministic scan, R5 -- no agents, no rg dependency). Re-run to track closed-loop training progress._`);
  L.push(``);
  L.push(`> **What this measures (R12 honesty):** generation OPERATIONS in engine CODE -- a technique keyword on a`);
  L.push(`> line that declares an op (\`case "fillet":\`, \`generateFillet(\`, \`action: "extrude"\`). A raw keyword`);
  L.push(`> mention -- especially in the wiki INDEX, which names every engine -- is NOT capability and is`);
  L.push(`> reported separately as "knowledge presence." (A naive mention scan reads ~96%; the grounded agent`);
  L.push(`> audit measured ~7% real. This op-context metric tracks the real signal and climbs as ops are wired.)`);
  L.push(``);
  L.push(`**Galaxies scanned:** ${meta.galaxyCount} engine galaxies (capability) + wiki + tribal (knowledge presence)`);
  L.push(``);
  const t = report.totals;
  L.push(`## Capability totals (generation operations in engine code)`);
  L.push(`- **Covered (>=5 op-hits): ${t.covered}/${t.categories} = ${t.coveredPct}%**`);
  L.push(`- Touched (>=1 op-hit): ${t.covered + t.shallow}/${t.categories} = ${t.touchedPct}%`);
  L.push(`- Absent (no op evidence): ${t.absent}/${t.categories}`);
  L.push(`- **Essential-category gaps (${t.essentialGaps.length}):** ${t.essentialGaps.join(", ") || "none"}`);
  L.push(`- Knowledge presence (wiki/tribal mention, NOT capability): ${meta.knowTouched ? meta.knowTouched.size : "?"}/${t.categories} categories`);
  L.push(``);
  L.push(`## Per-category state (union across all galaxies)`);
  L.push(`| Category | Essential | State | Total hits | Top covering galaxies |`);
  L.push(`|---|---|---|---|---|`);
  for (const cat of CATEGORIES) {
    const pc = report.perCategory[cat.id];
    const cov = pc.coveringGalaxies.slice().sort((a, b) => b.hits - a.hits).map((c) => `${c.galaxy}(${c.hits})`).slice(0, 6).join(", ");
    L.push(`| ${cat.label} | ${cat.essential ? "yes" : ""} | ${pc.state} | ${pc.totalHits} | ${cov} |`);
  }
  L.push(``);
  if (qual && qual.notes.length) {
    L.push(`## Per-galaxy gap notes (auto-routed to LOCAL Ollama via smartFanout -- $0, no rate limit)`);
    L.push(`_Routing: ${qual.routing.ollama} local / ${qual.routing.claude} Claude${qual.fallback && qual.fallback.needed ? " (Ollama-down fallback signaled)" : ""}._`);
    L.push(``);
    for (const n of qual.notes) L.push(`- **${n.galaxy}** ${n.ok ? "" : "(local call failed) "}-- ${n.note || "(no note)"}`);
    L.push(``);
  }
  return L.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const wantOllama = argv.includes("--ollama");
  const jsonOnly = argv.includes("--json");
  const { capability, knowledge, galaxyCount } = buildHits();
  const report = scoreCoverage(capability);                 // headline = CODE generation operations
  const knowTouched = knowledgeTouchedCategories(knowledge); // wiki/tribal presence (separate signal)
  let qual = null;
  if (wantOllama) qual = await ollamaQualitative(report, capability);

  const out = {
    generatedAt: new Date().toISOString(), galaxyCount,
    metric: "generation-operation coverage (engine code, operation-context). Wiki/tribal are knowledge-presence only, not capability.",
    totals: report.totals, perCategory: report.perCategory, perGalaxy: report.perGalaxy,
    knowledgePresence: { categoriesTouched: knowTouched.size, of: CATEGORIES.length, byCategory: Object.fromEntries(CATEGORIES.map((c) => [c.id, knowTouched.has(c.id)])) },
    qualitative: qual,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  fs.writeFileSync(OUT_MD, renderMd(report, { galaxyCount, knowTouched }, qual));

  if (jsonOnly) { process.stdout.write(JSON.stringify(out.totals, null, 2) + "\n"); return; }
  const t = report.totals;
  console.log(`CAD-gen CAPABILITY (engine code, op-context): ${t.covered}/${t.categories} covered (${t.coveredPct}%), ${t.touchedPct}% touched, ${t.essentialGaps.length} essential gaps`);
  console.log(`Essential gaps: ${t.essentialGaps.join(", ") || "none"}`);
  console.log(`Knowledge presence (wiki/tribal mentions, NOT capability): ${knowTouched.size}/${CATEGORIES.length} categories`);
  if (qual) console.log(`Ollama qualitative: ${qual.routing.ollama} local notes (model ${qual.model || "?"})${qual.fallback && qual.fallback.needed ? " [fallback signaled]" : ""}`);
  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} + ${path.relative(ROOT, OUT_MD)}`);
}

main().catch((e) => { console.error("cad-gen-coverage-meter failed:", e && e.message ? e.message : e); process.exit(1); });
