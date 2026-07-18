#!/usr/bin/env node
// tier: T2
// CAD-PIPELINE-WIRE-MS0/U-CAD-KNOWLEDGE-INJECT
//
// UserPromptSubmit hook that surfaces relevant CAD wiki + tribal nodes when
// a prompt mentions CAD operations (extrude, sketch, sweep, hole, fillet,
// pattern, loft, ...) or names a priority CAD system (hyperCAD, Fusion 360,
// Mastercam, SolidWorks, Inventor). Pure additive — only emits an advisory
// `additionalContext` block. Never blocks.
//
// Reads precomputed index at state/shared/cad-pipeline-knowledge-index.json
// (built by scripts/cad-pipeline-knowledge-index.mjs). Index miss = silent
// no-op so the hook never breaks a prompt.
//
// Disable: PRISM_CAD_PIPELINE_INJECT_DISABLE=1
// Cap K:  PRISM_CAD_PIPELINE_INJECT_K=N (default 5 ops, 3 tribal, 2 courses)
// Throttle: PRISM_CAD_PIPELINE_INJECT_THROTTLE_MS=N (default 30000)

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, "..", "..");
const INDEX_PATH = resolve(REPO_ROOT, "state/shared/cad-pipeline-knowledge-index.json");
const THROTTLE_DIR  = resolve(homedir(), ".claude", "state");
const THROTTLE_FILE = resolve(THROTTLE_DIR, "cad-pipeline-inject-throttle.json");

const CAD_OP_VOCAB = [
  "extrude","sketch","sweep","loft","revolve","hole","fillet","chamfer","pattern",
  "mirror","shell","draft","rib","emboss","thread","cut","boss","extrusion",
  "circular","linear","rectangular","plane","axis","point","spline","arc","line",
  "rectangle","circle","ellipse","polygon","offset","trim","extend","split",
  "drawing","dimension","tolerance","gd&t","gdt","assembly","mate","joint",
  "sheet-metal","sheetmetal","bend","flange","unfold","flat-pattern",
  "surface","face","edge","vertex","solid","body","component","part",
  "construction-geometry","reference-geometry",
];
const SYSTEM_VOCAB = {
  "hypercad": "hypercad",
  "hypermill": "hypercad",
  "fusion": "fusion360",
  "fusion 360": "fusion360",
  "fusion360": "fusion360",
  "mastercam": "mastercam",
  "solidworks": "solidworks",
  "solid works": "solidworks",
  "sw 20": "solidworks",
  "inventor": "inventor",
};
const REGEN_TRIGGERS = /reverse[- ]?engineer|regenerat(e|ion|ing)|reproduce.*cad|recreate.*part|cad.*from scratch|build.*from print/i;

function readPromptFromStdin() {
  try {
    const buf = readFileSync(0, "utf8");
    if (!buf) return "";
    const parsed = JSON.parse(buf);
    return String(parsed?.prompt ?? "");
  } catch { return ""; }
}

function loadIndex() {
  if (!existsSync(INDEX_PATH)) return null;
  try {
    const raw = readFileSync(INDEX_PATH, "utf8");
    return JSON.parse(raw);
  } catch { return null; }
}

function throttleAllowed() {
  const ms = Number(process.env.PRISM_CAD_PIPELINE_INJECT_THROTTLE_MS ?? 30000);
  if (ms <= 0) return true;
  try {
    if (!existsSync(THROTTLE_FILE)) return true;
    const last = JSON.parse(readFileSync(THROTTLE_FILE, "utf8")).lastFiredAt;
    if (!last) return true;
    return Date.now() - new Date(last).getTime() >= ms;
  } catch { return true; }
}

function markFired() {
  try {
    if (!existsSync(THROTTLE_DIR)) mkdirSync(THROTTLE_DIR, { recursive: true });
    writeFileSync(THROTTLE_FILE, JSON.stringify({ lastFiredAt: new Date().toISOString() }));
  } catch { /* best-effort */ }
}

function tokenize(text) {
  return (text || "").toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
}

function detectSystems(promptLower) {
  const hits = new Set();
  for (const [alias, canonical] of Object.entries(SYSTEM_VOCAB)) {
    if (promptLower.includes(alias)) hits.add(canonical);
  }
  return [...hits];
}

function rankOpsForPrompt(idx, promptLower, opLimit) {
  const tokens = tokenize(promptLower);
  const opVocabHits = tokens.filter(t => CAD_OP_VOCAB.includes(t));
  if (opVocabHits.length === 0) return [];

  const seen = new Map();  // key: "system::op", value: { system, op, params, path, score }
  for (const tok of opVocabHits) {
    const refs = idx.tokenIndex?.[tok] ?? [];
    for (const ref of refs) {
      const key = `${ref.system}::${ref.op}`;
      if (!seen.has(key)) {
        const opData = idx.systems?.[ref.system]?.ops?.[ref.op];
        if (!opData) continue;
        seen.set(key, {
          system: ref.system,
          op: ref.op,
          path: opData.path,
          paramCount: opData.params.length,
          score: 0,
        });
      }
      seen.get(key).score++;
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.score - a.score || a.system.localeCompare(b.system))
    .slice(0, opLimit);
}

function rankByPriority(items, prioritySystems) {
  // boost items whose system_hint matches priority order
  return [...items].sort((a, b) => {
    const ai = prioritySystems.indexOf(a.system_hint ?? "_");
    const bi = prioritySystems.indexOf(b.system_hint ?? "_");
    const ar = ai < 0 ? 99 : ai;
    const br = bi < 0 ? 99 : bi;
    return ar - br;
  });
}

function buildAdvisory(idx, prompt) {
  const promptLower = prompt.toLowerCase();
  const opLimit  = Number(process.env.PRISM_CAD_PIPELINE_INJECT_K ?? 5);
  const tribalLimit = 3;
  const courseLimit = 2;

  const systemsMentioned = detectSystems(promptLower);
  const opMatches = rankOpsForPrompt(idx, promptLower, opLimit);
  const regenIntent = REGEN_TRIGGERS.test(prompt);
  const cadIntent = systemsMentioned.length > 0 || opMatches.length > 0 || regenIntent;

  if (!cadIntent) return null;

  const lines = [
    "## 🧠 CAD pipeline knowledge — wiki + tribal nodes available",
    `_Source: \`state/shared/cad-pipeline-knowledge-index.json\` (${idx.summary.systems} systems · ${idx.summary.ops} ops · ${idx.summary.params} params · ${idx.summary.tribal} tribal · ${idx.summary.courses} courses)._`,
  ];

  if (systemsMentioned.length > 0) {
    lines.push("", `**Systems detected in prompt:** ${systemsMentioned.join(", ")}`);
    // surface op-count per detected system to confirm coverage
    for (const sys of systemsMentioned) {
      const ops = idx.systems?.[sys]?.ops;
      if (ops) {
        const opCount = Object.keys(ops).length;
        const paramTotal = Object.values(ops).reduce((s, o) => s + o.params.length, 0);
        lines.push(`  • \`${sys}\` — ${opCount} ops / ${paramTotal} params indexed at \`knowledge/wiki/architecture/cad-params/${sys}/\``);
      } else {
        lines.push(`  • \`${sys}\` — no wiki coverage yet (build target)`);
      }
    }
  }

  if (opMatches.length > 0) {
    lines.push("", `**Top ${opMatches.length} matching ops (by token-overlap):**`);
    for (const m of opMatches) {
      lines.push(`  • \`${m.system}/${m.op}\` (${m.paramCount} params) → \`${m.path}\``);
    }
  }

  // Tribal entries — surface CAD-specific ones
  const tribal = (idx.tribal ?? []).slice(0, tribalLimit);
  if (tribal.length > 0) {
    lines.push("", `**Top ${tribal.length} tribal CAD entries:**`);
    for (const t of tribal) {
      lines.push(`  • [[${t.name}]] → \`${t.path}\``);
    }
  }

  // Courses — priority-ranked
  const courses = rankByPriority(idx.courses ?? [], idx.prioritySystems ?? []).slice(0, courseLimit);
  if (courses.length > 0) {
    lines.push("", `**Top ${courses.length} engineering courses:**`);
    for (const c of courses) {
      lines.push(`  • \`${c.name}\` → \`${c.path}\``);
    }
  }

  // PDF extracts — priority-ranked
  const pdfs = rankByPriority(idx.pdfExtracts ?? [], idx.prioritySystems ?? []).slice(0, 3);
  if (pdfs.length > 0) {
    lines.push("", `**Top ${pdfs.length} extracted CAD/CAM PDFs:**`);
    for (const p of pdfs) {
      lines.push(`  • \`${p.name}\` → \`${p.path}\``);
    }
  }

  if (regenIntent) {
    lines.push("", "**Regen intent detected** — see also `/cad-regen` skill + 30-file test set at `H:/PRISM/resources/CAD FILES/`. STEP feature signatures: `mcp-server/data/ingestion_cache/STEP-FEATURE-SIGNATURES-2026-05-24.json`.");
  }

  lines.push("", "_Disable banner: `PRISM_CAD_PIPELINE_INJECT_DISABLE=1`. Rebuild index: `node scripts/cad-pipeline-knowledge-index.mjs`._");
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_CAD_PIPELINE_INJECT_DISABLE === "1") { process.exit(0); }
  if (!throttleAllowed()) { process.exit(0); }

  const idx = loadIndex();
  if (!idx) { process.exit(0); }  // index not built yet — silent

  const prompt = readPromptFromStdin();
  if (!prompt) { process.exit(0); }

  const advisory = buildAdvisory(idx, prompt);
  if (!advisory) { process.exit(0); }

  markFired();
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: advisory,
    },
  }));
  process.exit(0);
}

main();
