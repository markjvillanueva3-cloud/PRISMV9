#!/usr/bin/env node
/**
 * cad-text-to-cadquery.mjs -- the Ollama text->CAD generation bridge
 * (U-CAD-TEXT-BRIDGE, slot:zulu 2026-06-12; operator: "everything hard coded,
 * bridged and wired so we can utilize the prism ai systems on ollama to do
 * cad generation").
 *
 * PATTERN (open-source recon, DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md):
 * CadQuery/build123d + local LLM = parametric STEP for free (the strongest
 * open-source combo; Seek-CAD proves the fully-local loop on DeepSeek-R1-32B,
 * Text-to-CadQuery proves qwen-coder-class models generate CadQuery well --
 * BOTH model classes are resident in this box's Ollama).
 *
 * WHAT RUNS TODAY: text request -> hard-coded delta-doctrine prompt (inch
 * units, proven-emitter rules, JM conventions) + feature-template names ->
 * qwen2.5-coder:32b via /api/generate -> python code-fence extracted +
 * validated -> staged to state/shared/cad-text-gen/<slug>-<ts>/ (model.py +
 * request.json + status.json). STAGING-ONLY writes; nothing touches shared
 * indexes.
 *
 * WHAT LIGHTS UP LATER (no code change needed): if `import build123d` or
 * `import cadquery` succeeds in the portable Python, the staged model.py is
 * EXECUTED -> STEP -> validated via scripts/cad-analyze-step.mjs. Until then
 * status.json says executed:false with the named unblock
 * (U-QUEBEC-MCP-CADQUERY-MERGE / pip install cadquery build123d).
 *
 * Exit codes: 0 staged ok (executed or honestly-deferred) - 2 usage -
 *             3 generation invalid (no usable code) - 4 Ollama unreachable.
 *
 * Usage:
 *   node scripts/cad-text-to-cadquery.mjs "a 1 inch cube with a 0.25in center hole"
 *   node scripts/cad-text-to-cadquery.mjs "<text>" --model deepseek-r1:32b --json
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
export const STAGING_ROOT = join(REPO_ROOT, "state", "shared", "cad-text-gen");
export const DEFAULT_MODEL = "qwen2.5-coder:32b"; // repo heavy-code default; --model deepseek-r1:32b for Seek-CAD-style reasoning
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const FEATURE_TEMPLATE_INDEX = join(REPO_ROOT, "state", "shared", "cad-feature-templates", "INDEX.json");
const GEN_TIMEOUT_MS = 180_000;
const PYTHON = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";

/** Pure: filesystem-safe slug from the request text. */
export function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "cad-request";
}

/**
 * Fail-soft: pull the CANONICAL system prompt from the existing
 * CadQueryCodeGeneratorEngine (its header documents the intended pipeline
 * "NL description -> LLM (with this prompt) -> CadQuery code" -- the engine
 * shipped the prompt+validate+execute half; THIS script is the LLM caller
 * that was never built). pathToFileURL is REQUIRED on Windows dynamic import
 * (U-YT-INGEST-URL-FIX lesson, same day).
 */
export async function loadEnginePrompt(importImpl = (s) => import(s)) {
  try {
    const { pathToFileURL } = await import("node:url");
    const mod = await importImpl(pathToFileURL(resolve(REPO_ROOT, "mcp-server", "dist", "engines", "CadQueryCodeGeneratorEngine.js")).href);
    const eng = mod.cadQueryCodeGeneratorEngine || (mod.CadQueryCodeGeneratorEngine && new mod.CadQueryCodeGeneratorEngine());
    const p = eng && typeof eng.getCodeGenPrompt === "function" ? eng.getCodeGenPrompt() : null;
    return typeof p === "string" && p.length > 50 ? p : null;
  } catch { return null; } // bridge still works on the built-in doctrine block alone
}

/**
 * Pure: assemble the generation prompt. The delta doctrine is HARD-CODED here
 * (operator directive) so every local-LLM generation carries the galaxy's
 * known-failure rules without any retrieval dependency; the engine's canonical
 * codegen prompt is PREPENDED when loadable, and feature-template names are
 * appended when available (RAG-lite, fail-soft).
 */
export function buildPrompt(request, templateNames = [], enginePrompt = null) {
  return [
    enginePrompt ? enginePrompt : null,
    enginePrompt ? "" : null,
    "You are PRISM's CAD code generator. Produce a COMPLETE, runnable Python script",
    "using build123d (preferred) or cadquery that models the requested part and",
    "exports it as STEP to the file path given by the OUTPUT_STEP environment",
    "variable (fall back to 'out.step').",
    "",
    "HARD RULES (JM Die shop conventions -- violating any makes the part scrap):",
    "- UNITS: dimensions in the request are INCHES unless explicitly metric.",
    "  build123d/cadquery work in mm: convert with 25.4 mm/inch EXPLICITLY and",
    "  name the conversion constant (e.g. IN = 25.4).",
    "- Parametrize every dimension as a named variable at the top of the script.",
    "- Solids only -- no open shells; the STEP must be a manifold B-rep.",
    "- No periodic B-spline surface tricks; use primitive booleans/extrudes/",
    "  revolves/fillets (malformed periodic splines open BLANK in Fusion).",
    "- If the request implies a sinker-EDM electrode, undersize all burning",
    "  surfaces by 0.0015 inch per side (0.003 total spark gap).",
    "- Output ONLY one python code block. No prose before or after it.",
    templateNames.length ? "" : null,
    templateNames.length ? `Known PRISM feature templates you may pattern-match against: ${templateNames.slice(0, 20).join(", ")}.` : null,
    "",
    `REQUEST: ${String(request).trim()}`,
  ].filter((l) => l !== null).join("\n");
}

/** Pure: extract the first python code fence (or bare code as fallback). */
export function extractPythonCode(llmText) {
  const text = String(llmText || "");
  const fence = text.match(/```(?:python|py)?\s*\n([\s\S]*?)```/);
  const code = fence ? fence[1].trim() : "";
  return code || null;
}

/**
 * Pure: is the generated code plausibly a CAD script? Cheap structural gates
 * only (the real validation is execution + cad-analyze-step downstream).
 * Returns a reason string or null when acceptable.
 */
export function codeInvalidReason(code) {
  if (!code || code.length < 40) return "empty/trivial generation";
  if (!/import\s+(build123d|cadquery)|from\s+(build123d|cadquery)/.test(code)) {
    return "no build123d/cadquery import -- not a CAD script";
  }
  if (!/step/i.test(code)) return "no STEP export present";
  if (!/25\.4|\bIN\b|\binch/i.test(code)) return "no inch->mm conversion evidence (JM units rule)";
  return null;
}

function loadTemplateNames() {
  try {
    const j = JSON.parse(readFileSync(FEATURE_TEMPLATE_INDEX, "utf8"));
    const arr = Array.isArray(j) ? j : (j.templates || j.entries || []);
    return arr.map((t) => (typeof t === "string" ? t : t && (t.id || t.name))).filter(Boolean);
  } catch { return []; } // RAG-lite is additive; absence never blocks generation
}

function ollamaGenerate(prompt, model) {
  const body = JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.2 } });
  const r = spawnSync("curl", ["-s", "-m", String(Math.floor(GEN_TIMEOUT_MS / 1000)), "-X", "POST",
    `${OLLAMA_URL}/api/generate`, "-H", "Content-Type: application/json", "-d", body],
  { encoding: "utf8", timeout: GEN_TIMEOUT_MS + 10_000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0 || !r.stdout) return { ok: false, error: `ollama call failed (curl exit ${r.status})` };
  try {
    const j = JSON.parse(r.stdout);
    if (!j.response) return { ok: false, error: `no response field: ${r.stdout.slice(0, 160)}` };
    return { ok: true, text: j.response };
  } catch (e) { return { ok: false, error: `ollama response parse: ${e.message}` }; }
}

/** Can the portable Python execute the generated code? Probed at runtime so the execution branch self-activates when the env lands. */
function pythonCadAvailable() {
  for (const mod of ["build123d", "cadquery"]) {
    const r = spawnSync(PYTHON, ["-c", `import ${mod}`], { encoding: "utf8", timeout: 30_000, windowsHide: true });
    if (r.status === 0) return mod;
  }
  return null;
}

function executeStaged(dir, mod) {
  const stepPath = join(dir, "model.step");
  const r = spawnSync(PYTHON, [join(dir, "model.py")], {
    encoding: "utf8", timeout: 120_000, windowsHide: true, cwd: dir,
    env: { ...process.env, OUTPUT_STEP: stepPath },
  });
  if (r.status !== 0) return { executed: false, reason: `python exit ${r.status}: ${String(r.stderr || "").slice(-400)}` };
  if (!existsSync(stepPath)) return { executed: false, reason: "script ran but produced no model.step" };
  const a = spawnSync(process.execPath, [join(REPO_ROOT, "scripts", "cad-analyze-step.mjs"), stepPath],
    { encoding: "utf8", timeout: 60_000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  return { executed: true, via: mod, stepPath, analysisExit: a.status, analysisTail: String(a.stdout || "").slice(-600) };
}

export async function main(argv = process.argv.slice(2)) {
  const request = argv.find((a) => !a.startsWith("--"));
  if (!request) { console.error("usage: node scripts/cad-text-to-cadquery.mjs \"<part description>\" [--model m] [--json]"); return 2; }
  const mi = argv.indexOf("--model");
  const model = mi !== -1 && argv[mi + 1] ? argv[mi + 1] : DEFAULT_MODEL;

  const prompt = buildPrompt(request, loadTemplateNames(), await loadEnginePrompt());
  const gen = ollamaGenerate(prompt, model);
  if (!gen.ok) { console.error(`[cad-text] OLLAMA UNREACHABLE/FAILED: ${gen.error}`); return 4; }

  const code = extractPythonCode(gen.text);
  const invalid = codeInvalidReason(code);
  if (invalid) { console.error(`[cad-text] generation INVALID: ${invalid}`); console.error(String(gen.text).slice(0, 400)); return 3; }

  const dir = join(STAGING_ROOT, `${slugify(request)}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "model.py"), code, "utf8");
  writeFileSync(join(dir, "request.json"), JSON.stringify({ request, model, generatedAt: new Date().toISOString(), promptChars: prompt.length }, null, 2), "utf8");

  const mod = pythonCadAvailable();
  const status = mod
    ? executeStaged(dir, mod)
    : { executed: false, reason: "build123d/cadquery not installed in portable Python -- unblock: U-QUEBEC-MCP-CADQUERY-MERGE or pip install build123d cadquery (then re-run; this branch self-activates)" };
  writeFileSync(join(dir, "status.json"), JSON.stringify(status, null, 2), "utf8");

  const summary = { dir, model, codeChars: code.length, ...status };
  console.log(argv.includes("--json") ? JSON.stringify(summary, null, 2) : `[cad-text] staged ${dir} executed=${!!status.executed}${status.reason ? ` (${status.reason.slice(0, 120)})` : ""}`);
  return 0;
}

const __isMain = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (__isMain) main().then((c) => process.exit(c)).catch((e) => { console.error(`[cad-text] fatal: ${e?.message || e}`); process.exit(1); });
