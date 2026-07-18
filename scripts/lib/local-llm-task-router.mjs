// tier: T4
// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
//
// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
//   canonical, Blackwell-tuned, install-truthful picker), install-truth to
//   fetchInstalledModels, host class to detectHostClass. The genuinely-new piece
//   is the merged routing VERDICT: given a task string, decide runLocal vs
//   escalate-to-Claude, pick the local model, and stamp a quality bar — so Hermes
//   / any pipeline gets ONE answer instead of querying four routers.
//
// WHY this lives in .mjs (not a .ts engine): every router it composes is .mjs
// (cost-router, host-aware, host-class) — keeping it .mjs avoids the .ts↔.mjs
// bundling boundary and is node:test-verifiable with zero tsc. A thin
// `LocalLLMTaskRouterEngine.ts` + `prism_ai:route_task` wrapper (U1b) exposes this
// to the MCP dispatcher; tool/dispatcherAction axes (costAwareRouterEngine +
// PRISMSelfAwarenessEngine) are added there. This unit owns the local-vs-claude +
// model decision — the highest-leverage, fully-local-verifiable slice.
//
// INVARIANTS (tested):
//   1. SAFETY-NEVER-LOCAL — any manufacturing-safety task (cutting params, feeds/
//      speeds to a real machine, S(x)/Ω gate, G-code validation, tolerance gate)
//      → runLocal:false, escalateTo:"claude". Manufacturing safety is NEVER judged
//      by a local model. (Mirrors modelRoutingEngine's safety_critical gate.)
//   2. MODEL-∈-INSTALLED — a returned ollamaModel is ALWAYS a member of the live
//      installed set (delegated to routeModelForTask's down-walk). Never a phantom
//      tag (the anti-drift invariant that the BLACKWELL retirement hardened).
//   3. IP-STAYS-LOCAL — text/extraction tasks default runLocal:true; nothing here
//      routes a customer drawing/program/corpus to a cloud model.
//
// PURE + dependency-injected (fetchModelsFn / routeModelForTaskFn /
// detectHostClassFn) so tests inject — no real Ollama/GPU/network touched.

import { routeModelForTask as defaultRouteModelForTask } from "../../.claude/hooks/lib/ollama-cost-router.mjs";
import { fetchInstalledModels as defaultFetchInstalledModels } from "./host-aware-synthesis-model.mjs";
import { detectHostClass as defaultDetectHostClass } from "../../.claude/hooks/lib/host-class.mjs";

// Manufacturing-safety: these NEVER run on a local model — they gate real metal /
// machine motion and must be judged by Claude (the safety-critical escalation).
// Manufacturing-safety vocabulary — ANY match escalates to Claude (never local).
// Broadened 2026-06-04 after a per-file scrutiny P0: the original patterns required
// literal multi-word phrases (e.g. "feeds AND speeds") and missed the most common
// real phrasings ("optimize the feedrate", "what RPM for 6061", "is this toolpath
// safe to run", "validate this CNC program", "review the g-code before posting").
// Safety-first beats token-savings: a few summarize-the-gcode tasks escalating to
// Claude is an acceptable price for NEVER judging real-metal safety on a local model.
export const SAFETY_PATTERNS = [
  /\bS\(x\)\b/i,
  /\b(omega|Ω)\s*(gate|threshold|score)/i,
  /\b(safety|S\(x\))\s*(gate|validat|review|check)/i,
  // speeds & feeds — any single machine-motion parameter term
  /\bcutting\s*(parameter|force|speed|feed|condition)/i,
  /\b(feeds?\s*(and|&|\/)?\s*speeds?|speeds?\s*(and|&|\/)?\s*feeds?|feed\s*rate|feedrate)\b/i,
  /\b(ipm|sfm|rpm|surface\s*speed|spindle\s*(speed|load|torque|rpm))\b/i,
  /\b(depth|width)\s*of\s*cut\b/i,
  /\b(doc|woc|stepover|step\s*over|stepdown|step\s*down|plunge\s*rate|chip\s*load)\b/i,
  // machine-motion artifacts — G-code / NC|CNC program / toolpath / M-code → Claude
  /\b(g-?code|m-?code|(cnc|nc)\s*program|tool\s*path|toolpath)\b/i,
  // collision / crash / safe-to-run / post-to-machine / rapid-through-stock
  /\b(collisions?|gouge|over-?travel|rapid\s*(move|through))/i,
  /\b(machine\s*crash|crash(es)?\s*the\s*machine|safe\s*to\s*run|run\s*(it\s*)?on\s*the\s*(vmc|mill|lathe|machine|spindle)|post\s*(it\s*)?(to|on)\s*the\s*(machine|control|vmc))/i,
  // tolerance + generic validate-near-machine-artifact. NOTE the trailing terms are
  // the MACHINING senses only (feed rate / surface|spindle speed) — bare "feed"/"speed"
  // were removed (per-file scrutiny P1) because check/verify+RSS"feed"/API"speed" is a
  // high-frequency NON-machining collision; standalone IPM/SFM/RPM/feedrate are already
  // caught above, so this loses zero safety coverage.
  /\btolerance\s*(gate|stack|validat)/i,
  /\b(validat|verif|check|gate)\w*[\s\S]{0,30}\b((cnc|nc)\s*program|toolpath|g-?code|machining|tolerance|cutting|feed\s*rate|feedrate|surface\s*speed|spindle\s*speed)\b/i,
];

// taskClass → cost-router category (CATEGORY_TIER keys). Unmapped → "summary"
// (balanced default — matches cost-router's own fallthrough).
const CLASS_TO_CATEGORY = Object.freeze({
  summarize: "summary",
  explain: "explanation",
  document: "documentation",
  classify: "classification",
  format: "format_convert",
  git_summary: "git_summary",
  audit: "prism_audit",
  synthesize: "search_synthesis",
  codegen: "search_synthesis", // codegen quality scales with model size → best tier on Blackwell
  reason: "search_synthesis", // gpt-oss:120b is a strong local reasoner — keep it local
  extract: "summary",
  unknown: "summary",
});

// Quality bar by class — the floor an offloaded answer must clear before it ships
// without Claude review (consumed by U3 reviewer/gap-fill).
const CLASS_QUALITY_BAR = Object.freeze({
  safety_critical: 0.98,
  codegen: 0.9,
  reason: 0.9,
  synthesize: 0.9,
  audit: 0.85,
  explain: 0.8,
  summarize: 0.8,
  document: 0.8,
  extract: 0.8,
  classify: 0.7,
  format: 0.7,
  git_summary: 0.7,
  unknown: 0.8,
});

// Ordered keyword classifiers (first match wins). Safety is checked SEPARATELY +
// first (see routeTask) — these are the non-safety work classes.
const CLASS_PATTERNS = [
  ["git_summary", /\b(git\s*(diff|log|status)|commit\s*(message|summary)|diff\s*summar)/i],
  ["format", /\b(convert|reformat|to\s*(json|yaml|csv|markdown)|normalize\s*format|transcode)\b/i],
  // U-CLASSIFY-STEM-FIX (india 2026-06-11): the truncated stems classif/categoriz had a TRAILING \b
  // -> "classify"/"categorize" never matched (the char after the stem is a word char, no boundary)
  // so the two most common classification verbs fell through to "unknown" -> never offloaded. Use
  // \w* after the stems so the whole word matches; keep \b-anchored whole words for the rest.
  ["classify", /\b(classif\w*|categoriz\w*|label\b|tag\s*this|which\s*(category|bucket|type)|triage\b)/i],
  // codegen BEFORE extract: "write a function to parse X" is codegen, not extract.
  ["codegen", /\b(write|generate|implement|refactor|scaffold|add)\s+(code|a\s*function|a\s*test|the\s*engine|tests?)\b/i],
  ["extract", /\b(extract|pull\s*out|parse\s*(out|the)|scrape|read\s*(the\s*)?(dims|fields|values))\b/i],
  ["document", /\b(docstring|jsdoc|document(ation)?|comment\s*this|write\s*docs)\b/i],
  // U-CLASSIFY-STEM-FIX-2 (india 2026-06-12): COMPLETE the 2026-06-11 trailing-\b stem fix. The same
  // bug (a truncated stem + a group-closing \b -> the whole word never matches, a word char follows
  // the stem) ALSO silently broke summar/synthesiz/consolidat/analyz: "summarize"/"synthesize"/
  // "consolidate"/"analyze" all fell to "unknown". Benign for "summarize" (still mechanical), but
  // synthesize/consolidate/analyze are JUDGMENT classes -> they were MIS-ROUTED to the local lane
  // (the exact wrong-direction leak smart-fanout depends on avoiding). Use \w* after each stem.
  ["summarize", /\b(summar\w*|tl;?dr|condense|digest|recap|brief\s*(me|this))\b/i],
  ["synthesize", /\b(synthesiz\w*|consolidat\w*|roll\s*up|fuse|merge\s*(the\s*)?(findings|notes)|aggregate\s*(into|the))\b/i],
  ["explain", /\b(explain|describe|what\s*(does|is)|how\s*does|walk\s*me\s*through)\b/i],
  ["reason", /\b(reason|analyz\w*|why\s*(is|does)|deduce|infer|trade-?off|design\b|architect)\b/i],
];

/**
 * Classify a task string into a work class + cost-router category.
 * Safety is NOT classified here (routeTask gates it first).
 * @param {string} task
 * @returns {{ taskClass: string, category: string }}
 */
export function classifyTaskClass(task) {
  if (typeof task !== "string" || task.trim() === "") {
    return { taskClass: "unknown", category: CLASS_TO_CATEGORY.unknown };
  }
  for (const [cls, re] of CLASS_PATTERNS) {
    if (re.test(task)) return { taskClass: cls, category: CLASS_TO_CATEGORY[cls] };
  }
  return { taskClass: "unknown", category: CLASS_TO_CATEGORY.unknown };
}

/** True if the task gates real metal / machine motion → must escalate to Claude. */
export function isSafetyCritical(task) {
  if (typeof task !== "string") return false;
  return SAFETY_PATTERNS.some((re) => re.test(task));
}

// HERMES-PARITY/U-HERMES-OLLAMA-PARITY-L3 NOTE (slot:alpha 2026-06-17): this router is
// INTENTIONALLY local-only and does NOT surface a Hermes (paid cloud) escalation tier.
// Its charter (invariant #3 IP-STAYS-LOCAL + [[reference_hermes_router_u1_2026_06_04]]
// "LOCAL ONLY -- manufacturing IP never leaves the box") makes a cloud-escalation advisory
// a philosophy-fork (R7/R11). Hermes-aware OFFLOAD ROUTING already lives in its correct home,
// scripts/lib/task-substrate-router.mjs (the per-task substrate planner -- it surfaces both
// the ask-hermes inference path and the Hermes fan-out, gated by shouldUseWorkflow). Do NOT
// add a Hermes rung here; route per-task Hermes decisions through task-substrate-router.

/**
 * Route a task to the optimal execution target.
 *
 * @param {object} args
 * @param {string} args.task                 the task description
 * @param {string[]} [args.available]        installed model tags (else fetched)
 * @param {string} [args.hardware]           HardwareProfile (else detected)
 * @param {function} [args.fetchModelsFn]    () => Promise<string[]>  (DI)
 * @param {function} [args.routeModelForTaskFn]  ({category,available,hardware}) => {model,tier,reason}  (DI)
 * @param {function} [args.detectHostClassFn]    () => string  (DI; defaults to the real host-class probe — so a caller that omits `hardware` still gets the Blackwell promotion, not the conservative route)
 * @returns {Promise<{taskClass,category,runLocal,ollamaModel,escalateTo,qualityBar,fallbackChain,reason}>}
 */
export async function routeTask({
  task,
  available,
  hardware,
  fetchModelsFn = defaultFetchInstalledModels,
  routeModelForTaskFn = defaultRouteModelForTask,
  detectHostClassFn = defaultDetectHostClass,
} = {}) {
  const reason = [];

  // ── INVARIANT 1: safety is judged by Claude, never local ──
  if (isSafetyCritical(task)) {
    reason.push("safety-critical: manufacturing-safety task escalates to Claude (never local)");
    return {
      taskClass: "safety_critical",
      category: null,
      runLocal: false,
      ollamaModel: null,
      escalateTo: "claude",
      qualityBar: CLASS_QUALITY_BAR.safety_critical,
      fallbackChain: ["claude"],
      reason,
    };
  }

  const { taskClass, category } = classifyTaskClass(task);
  reason.push(`classified as "${taskClass}" → category "${category}"`);

  // Install-truth: never trust a static tag (the BLACKWELL retirement lesson).
  let installed = Array.isArray(available) ? available.filter((m) => typeof m === "string" && m) : null;
  if (!installed) {
    try {
      installed = await fetchModelsFn();
    } catch {
      installed = [];
    }
  }

  if (!installed || installed.length === 0) {
    // Ollama down / no models → cannot run local; escalate honestly (fail-loud).
    reason.push("no installed models (ollama down?) — cannot run local, escalate to Claude");
    return {
      taskClass,
      category,
      runLocal: false,
      ollamaModel: null,
      escalateTo: "claude",
      qualityBar: CLASS_QUALITY_BAR[taskClass] ?? 0.8,
      fallbackChain: ["claude"],
      reason,
    };
  }

  let host = hardware;
  if (!host && typeof detectHostClassFn === "function") {
    try { host = detectHostClassFn(); } catch { host = undefined; }
  }

  // ── INVARIANT 2: model-tier DELEGATED to the canonical picker; result ∈ installed ──
  const picked = routeModelForTaskFn({ category, available: installed, hardware: host });
  const ollamaModel = picked && picked.model ? picked.model : null;
  if (ollamaModel) reason.push(`model via cost-router: ${ollamaModel} [tier:${picked.tier}] ${picked.reason || ""}`.trim());

  if (!ollamaModel || !installed.includes(ollamaModel)) {
    // Picker returned nothing usable (or a phantom — defends invariant 2) → escalate.
    reason.push("no installed model matched a tier — escalate to Claude (no phantom tag)");
    return {
      taskClass,
      category,
      runLocal: false,
      ollamaModel: null,
      escalateTo: "claude",
      qualityBar: CLASS_QUALITY_BAR[taskClass] ?? 0.8,
      fallbackChain: ["claude"],
      reason,
    };
  }

  // INVARIANT 3: text/work tasks stay local (IP never leaves the box).
  const fallbackChain = [ollamaModel, ...installed.filter((m) => m !== ollamaModel)].slice(0, 4);
  fallbackChain.push("claude"); // last resort is always the cloud reviewer
  return {
    taskClass,
    category,
    runLocal: true,
    ollamaModel,
    escalateTo: null,
    qualityBar: CLASS_QUALITY_BAR[taskClass] ?? 0.8,
    fallbackChain,
    reason,
  };
}
