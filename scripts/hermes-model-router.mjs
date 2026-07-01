#!/usr/bin/env node
/**
 * hermes-model-router.mjs -- a DETERMINISTIC, local-first HYBRID model router for the Nous Hermes
 * agent (HERMES-HYBRID-ROUTER-MS0, slot:bravo 2026-06-30). The USABLE replacement for Hermes's own
 * model_router / hybrid_router / MOA -- a nondeterministic black box that dynamically built cloud
 * hybrids and landed the primary on nvidia/nemotron-3, a <think>-emitting reasoning model that HANGS
 * the agent loop ("it built a hybrid model... nemo3, stopped working").
 *
 * WHY THIS ONE IS BETTER + ACTUALLY USABLE:
 *  - DETERMINISTIC: task -> tier is a regex lookup, not a dynamic ensemble. Same input -> same model
 *    every time. No black box that drifts session to session.
 *  - LOCAL-FIRST ($0): every tier is an Ollama model resident on the 96GB Blackwell GPU.
 *  - SAFE: NEVER routes to a reasoning model (<think>-hang) or a <64K model. Cloud is OPT-IN and only
 *    a verified >=64K NON-reasoning model (never nemotron/deepseek-reasoner).
 *  - Sibling of scripts/lib/model-routing-policy.mjs (the CLAUDE-fleet router); this is the HERMES-
 *    LOCAL analog. Reuses its pure `modelCostRank` for the cheapest-viable tie-break.
 *
 * TIERS (all local, free, on the Blackwell -- match the Hermes config's aux tiers):
 *   fast    gpt-oss:20b        mechanical: classify/extract/format/title/triage/approve/route/summarize
 *   code    qwen2.5-coder:32b  code: generate/edit/lint/refactor/compress/diff/docstring
 *   reason  gpt-oss:120b       deep reasoning/plan/design/synthesis/orchestration (DEFAULT / main loop)
 *   vision  qwen2.5vl:32b      image/screenshot/diagram/OCR/vision
 *   cloud   nvidia qwen3-next-80b-a3b-instruct  OPT-IN only (allowCloud + explicit-cloud phrase; >=64K)
 *
 * CLI:  node scripts/hermes-model-router.mjs "<task>" [--cloud] [--json]
 * Lib:  import { routeHermesTask, TIERS } from "./hermes-model-router.mjs"
 */
import { pathToFileURL } from "node:url";
import { modelCostRank } from "./lib/model-routing-policy.mjs";

const LOCAL_BASE = "http://127.0.0.1:11434/v1";
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

/** The tier table. `ctx` is the safe context to request; every local model clears Hermes's 64K floor. */
export const TIERS = Object.freeze({
  fast:   { model: "gpt-oss:20b",        provider: "ollama", base_url: LOCAL_BASE, ctx: 131072, why: "mechanical -> smallest fast local model ($0)" },
  code:   { model: "qwen2.5-coder:32b",  provider: "ollama", base_url: LOCAL_BASE, ctx: 131072, why: "code -> coder-tuned local model ($0)" },
  reason: { model: "gpt-oss:120b",       provider: "ollama", base_url: LOCAL_BASE, ctx: 131072, why: "deep reasoning -> largest local model ($0)" },
  vision: { model: "qwen2.5vl:32b",      provider: "ollama", base_url: LOCAL_BASE, ctx: 32768,  why: "vision -> local multimodal model ($0)" },
  cloud:  { model: "nvidia/qwen3-next-80b-a3b-instruct", provider: "nvidia", base_url: NVIDIA_BASE, ctx: 65536, why: "explicit cloud -> NVIDIA >=64K NON-reasoning (never nemotron/deepseek-reasoner)" },
});

export const DEFAULT_TIER = "reason"; // the main agent loop

// ---- deterministic classifier (ordered: first match wins) --------------------------------------
// vision BEFORE fast (an image task also mentions "read"); code BEFORE reason (codegen is not "deep
// reason"); reason is the default. Cloud is NEVER auto-picked here -- only via the explicit gate below.
const VISION_RE = /\b(image|screenshot|photo|picture|diagram|drawing|blueprint|ocr|vision|visual|\.png|\.jpe?g|\.webp)\b/i;
const CODE_RE = /\b(code|codegen|refactor|lint|compile|debug|stack\s?trace|function|regex|snippet|docstring|diff|patch|unit\s?test|compress\s+(this|the)\s+(file|code)|typescript|javascript|python|\.ts|\.mjs|\.py)\b/i;
const FAST_RE = /\b(classify|categoriz|label|tag|extract|pull\s+out|title|name\s+(this|it)|triage|approve|yes\/no|boolean|is\s+this|format|convert|normaliz|summari[sz]e|tl;?dr|one[\s-]line|keyword)\b/i;
const REASON_RE = /\b(plan|design|architect|brainstorm|strateg|reason|analy[sz]e|synthesi[sz]e|orchestrat|decide|evaluate|compare\s+approaches|trade[\s-]?off|why|how\s+should|deep)\b/i;

// explicit cloud request (mirrors model-routing-policy's CLOUD_EXPLICIT discipline: needs a directive
// verb so a topic mention of "cloud" does not route to it). Even so, cloud only fires when allowCloud.
const CLOUD_EXPLICIT_RE = /\b(use|via|route\s+to|run\s+(on|via)|switch\s+to|ask)\s+(the\s+)?(cloud|nvidia|nim)\b/i;

/** Classify a task string -> tier key (never "cloud"; cloud is gated separately). Pure. */
export function classifyHermesTask(task) {
  const s = typeof task === "string" ? task : "";
  if (!s.trim()) return DEFAULT_TIER;
  if (VISION_RE.test(s)) return "vision";
  if (CODE_RE.test(s)) return "code";
  if (FAST_RE.test(s) && !REASON_RE.test(s)) return "fast"; // a task that is BOTH mechanical + deep -> reason (quality)
  if (REASON_RE.test(s)) return "reason";
  return DEFAULT_TIER;
}

/**
 * The routing verdict. Pure. `allowCloud` (default false) gates the only non-local path, and even
 * then ONLY an explicit-cloud phrase promotes to cloud -- so the default is always a safe local model.
 * @returns {{ tier: string, model: string, provider: string, base_url: string, ctx: number, reason: string, local: boolean }}
 */
export function routeHermesTask(task, { allowCloud = false } = {}) {
  const s = typeof task === "string" ? task : "";
  if (allowCloud && CLOUD_EXPLICIT_RE.test(s)) {
    const t = TIERS.cloud;
    return { tier: "cloud", ...t, reason: t.why, local: false };
  }
  const key = classifyHermesTask(s);
  const t = TIERS[key] || TIERS[DEFAULT_TIER];
  return { tier: key, ...t, reason: t.why, local: true };
}

/** The cheapest local tier that still clears a required param-size floor (helper; uses modelCostRank). Pure. */
export function cheapestLocalTier(minParamsB = 0) {
  let best = null, bestRank = Infinity;
  for (const [key, t] of Object.entries(TIERS)) {
    if (t.provider !== "ollama") continue;
    const rank = modelCostRank(t.model);
    if (rank >= minParamsB && rank < bestRank) { best = key; bestRank = rank; }
  }
  return best || DEFAULT_TIER;
}

// ---- CLI ---------------------------------------------------------------------------------------
function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const allowCloud = argv.includes("--cloud");
  const task = argv.filter((a) => !a.startsWith("--")).join(" ");
  if (!task.trim()) {
    process.stderr.write('usage: node scripts/hermes-model-router.mjs "<task>" [--cloud] [--json]\n');
    process.exit(2);
  }
  const v = routeHermesTask(task, { allowCloud });
  if (json) process.stdout.write(JSON.stringify(v) + "\n");
  else process.stdout.write(`${v.tier}\t${v.model}\t(${v.reason})\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
