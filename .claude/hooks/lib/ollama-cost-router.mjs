// tier: T4
// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
//
// Replaces hardcoded "first-of-preference-list" model selection with a
// category → tier → model decision. Smaller / faster models for trivial
// tasks (classify, format-convert, prism-inventory); larger / more
// capable models for complex codegen / multi-step reasoning.
//
// Cost proxy: VRAM footprint (≈ proxy for latency + GPU pressure + watt).
// For cheap tasks the cheaper choice is strictly dominant — output quality
// is indistinguishable but the resource bill is lower and the answer is
// faster, which keeps the GPU free for whatever the higher-tier work
// actually needs.
//
// PURE — no IO, no globals, no side effects. Tests inject `available`.
// The host hook is responsible for fetching the list from /api/tags.
//
// FOUR TIERS:
//   cheap     <4B params      Trivial classify / format / inventory dump
//   balanced  4-8B params     Summary / explain / docstring        (DEFAULT)
//   strong    13-15B params   Code reasoning, multi-step
//   best      30B+ params     Complex codegen / scaffold / refactor
//
// Categories come from ollama-task-offloader.mjs OFFLOADABLE_PATTERNS.
// Adding a new category in the offloader without adding it to
// CATEGORY_TIER here is non-fatal — it falls through to "balanced",
// matching the prior behaviour of the hardcoded preference list.

export const TIER_PREFERENCES = Object.freeze({
  cheap: Object.freeze([
    "qwen2.5-coder:1.5b",
    "llama3.2:3b",
    "qwen2.5:3b",
    "phi3:mini",
  ]),
  balanced: Object.freeze([
    // U-ALPHA-OLLAMA-ROSTER-SYNC (slot:alpha 2026-06-25): qwen2.5-coder:7b was
    // RE-PULLED onto the Blackwell host -- verified live via /api/tags 2026-06-25 --
    // so the prior "RETIRED/deleted" note (U-BW-RESEARCH-REFINE 2026-06-04) is STALE.
    // It is restored as the FIRST balanced pick because it is the MEASURED mechanical
    // sweet spot: 100% on classify/unit-convert/arithmetic at ~80-200 tok/s
    // (reference_ollama_stress_capability_2026_06_24). Without it the whole `balanced`
    // tier held ONLY non-installed tags (qwen2.5:7b / codellama:7b / deepseek-coder:
    // 6.7b), so every balanced task escalated to gpt-oss:20b (13GB) -- a needless
    // VRAM cost on a box where a 32b at the global 131072 context already resides at
    // 55GB (headroom is the scarce resource; the 4.7GB coder:7b is both the proven
    // sweet spot AND frees VRAM). Tiers stay DISJOINT (coder:7b is in no other tier).
    // gpt-oss:20b (strong) remains the escalation target when no balanced model held.
    // The remaining 7B tags stay as registry options for a host that pulls one.
    "qwen2.5-coder:7b",
    "qwen2.5:7b",
    "codellama:7b",
    "deepseek-coder:6.7b",
  ]),
  strong: Object.freeze([
    // U-BW-RESEARCH-REFINE (2026-06-04): gpt-oss:20b (20B MoE) measured 185 tok/s /
    // 14GB on the Blackwell — the fastest model in the whole Ollama benchmark and
    // far stronger than the retired 14B dense options. qwen2.5-coder:14b and
    // deepseek-r1:14b were DELETED from the host (BLACKWELL-MODEL-UPGRADE-PLAN) and
    // removed here so the anti-revert grep stays clean. Install-gated: until golf's
    // pull lands, `strong` escalates upward to `best` (qwen2.5-coder:32b is held).
    // Reasoning that deepseek-r1:14b used to serve is now covered by gpt-oss:120b
    // (best tier) / gpt-oss:20b — both stronger, both local.
    "gpt-oss:20b",
    "qwen2.5:14b",
    "deepseek-coder:33b-instruct",
  ]),
  best: Object.freeze([
    // BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-BEST-MODEL-CEILING + U-BW-RESEARCH-REFINE
    // (2026-06-04, Playwright research vs live Ollama-on-Blackwell benchmarks):
    // the 96GB RTX PRO 6000 runs FAR bigger than the 32B (~20GB) — ~76GB free.
    // The routeModelForTask down-walk only ever returns an INSTALLED model, so
    // listing models AHEAD of a pull is safe — the resolver auto-promotes the
    // moment golf (infra/model-pulls lane) pulls one. Ordered by the measured
    // quality×speed-that-fits sweet spot from the databasemart Ollama benchmark
    // (Ollama 0.13.5, 4-bit, single RTX Pro 6000): a ~120B MoE beats dense 70B/72B
    // on BOTH capability and throughput because few params activate per token.
    //   gpt-oss:120b  → 65GB, 134 tok/s  (MoE, Apache-2.0, Ollama-native)
    //   qwen2.5:72b   → 47GB,  29 tok/s  (dense — 4.6× slower, smaller)
    // Synthesis (search_synthesis → BLACKWELL_CEILING `best`) is prose+structure
    // fusion where the 120B generalist is materially better; for pure code-gen the
    // 32B coder stays excellent and is the held fast-coder. golf: pull
    // `gpt-oss:120b` (top priority — turns the idle 96GB into a frontier local
    // brain), optionally `qwen3:32b` / `gpt-oss:20b` (185 tok/s).
    "gpt-oss:120b",         // 120B MoE — broadest synthesis: 65GB, 134 tok/s, fully local
    "gemma4:31b",           // U-BW-GEMMA4 (2026-06-04 research): 31B dense, ~165 tok/s w/ MTP on
                            // the Blackwell (FASTER than gpt-oss:120b) + benchmark-competitive with
                            // 70B (AIME 89.2 / MMLU-Pro 85.2, beats Llama4 + Qwen3.5-32B). Apache-2.0,
                            // Ollama-native. Install-gated; golf must VERIFY the exact tag on pull
                            // (`gemma4:31b` vs `:31b-it`) — the down-walk only returns an INSTALLED
                            // model so a tag typo is harmless (never matches) until corrected. Listed
                            // below gpt-oss:120b (the 120B leads on raw synthesis breadth) but ABOVE
                            // the dense 70/72B (gemma4 beats them on BOTH speed and reasoning).
    "qwen3:32b",            // newer generalist (20GB, 56 tok/s) — ahead of qwen2.5 dense
    "qwen2.5:72b",          // dense 72B — capable but slow (47GB, 29 tok/s)
    "llama3.3:70b",         // dense general/reasoning alternative (43GB, 32 tok/s)
    "deepseek-r1:32b",      // BLACKWELL-MODEL-EXPAND 2026-06-10: reasoning distill, 20GB, INSTALLED -- preferred over the uninstalled 70b.
                            // NOTE (U-ALPHA-OLLAMA-STRESS-FRONTIER, MEASURED 2026-06-25): r1 distills score
                            // 0/36 on the graded mechanical/exact-match battery (they emit <think> chains
                            // that break exact-match) -- correctly DEAD for mechanical routing here: `best`
                            // is reached ONLY by search_synthesis (BLACKWELL_CEILING), which picks the
                            // installed gpt-oss:120b first, so r1 never serves a mechanical task. r1 is a
                            // deep-REASONING tier asset (model-routing-policy/fable lane), not this offload map.
    "deepseek-r1:70b",      // reasoning-heavy distill (43GB, 32 tok/s) -- install-gated
    "qwen3-coder:30b",      // BLACKWELL-MODEL-EXPAND 2026-06-10: Qwen3-Coder 30B-A3B MoE, 18GB, INSTALLED -- newer/faster local coder.
                            // VERIFIED preferred over qwen2.5-coder:32b -- the prior "preferred" was a code-comment
                            // claim until U-ALPHA-OLLAMA-STRESS-FRONTIER (MEASURED 2026-06-25): qwen3-coder:30b
                            // clears 27/36 graded-stress tasks @100% vs qwen2.5-coder:32b's 26/36, AND is cheaper
                            // (30b < 32b param-rank). See state/shared/ollama-stress-frontier.md.
    "qwen2.5-coder:32b",    // prior CODER (~20GB) -- the held fast-coder (26/36 measured, just below qwen3-coder:30b)
    "deepseek-coder-v2:16b",
    "qwen2.5:32b",
  ]),
});

// Map of known offloader categories → target tier.
// Unknown categories fall through to "balanced" (= the previous default).
export const CATEGORY_TIER = Object.freeze({
  format_convert:    "cheap",
  prism_inventory:   "cheap",
  prism_introspect:  "cheap",
  classification:    "cheap",
  summary:           "balanced",
  explanation:       "balanced",
  documentation:     "balanced",
  git_summary:       "balanced",
  prism_audit:       "balanced",
  search_synthesis:  "balanced",
});

// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-BEST-TIER-REACH: per-category ceiling that
// applies ONLY on the 96GB RTX PRO 6000 Blackwell. Synthesis-heavy work (fusing
// many sources into one digest — galaxy roll-ups, system-viz roost summaries,
// Obsidian memory consolidation) is the category whose output quality scales
// MOST with model size, and on the idle 96GB GPU the 32B `best` tier is free
// with ~50GB headroom. Raising its ceiling to `best` is the one-tier-up
// continuation of U-BW-OFFLOAD-TIER's balanced→strong promotion. A category
// absent here keeps the default Blackwell ceiling (balanced→strong); `cheap`
// work is never promoted (a 32B for a one-word classify is pure latency waste).
// Honest-telemetry rule (inherited from U-BW-OFFLOAD-TIER): the promotion only
// fires to a tier whose model is ACTUALLY installed — see routeModelForTask.
export const BLACKWELL_CEILING = Object.freeze({
  search_synthesis: "best",
});

export const TIER_ORDER = Object.freeze(["cheap", "balanced", "strong", "best"]);

/**
 * Pick the best available Ollama model for a given task category.
 *
 * Algorithm:
 *   1. Resolve the category to a target tier (default "balanced").
 *   2. Search that tier's preference list; first match wins.
 *   3. If nothing in the target tier is available, ESCALATE upward only —
 *      cheap → balanced → strong → best. Never de-escalate: degrading a
 *      strong-spec'd task to a 1.5B model is worse than spending the
 *      larger model the task asked for.
 *   4. If no tier matches at all, fall back to the first entry in
 *      `available` (last-resort — preserves prior "pick something"
 *      behaviour) and stamp tier=`"fallback"` so the caller can
 *      flag the tier mismatch.
 *
 * @param {{ category: string, available: string[], hardware?: string }} args
 *   `hardware` is the HardwareProfile from host-class.mjs (e.g.
 *   "home_blackwell"). When omitted/unknown the conservative 4080-era
 *   behaviour is preserved exactly (back-compat).
 * @returns {{ model: string|null, tier: string, reason: string }}
 */
export function routeModelForTask({ category, available, hardware }) {
  if (!Array.isArray(available) || available.length === 0) {
    return { model: null, tier: "none", reason: "no models available" };
  }
  // Defensive: filter to strings only — a malformed model object slipping in
  // would otherwise crash the .includes() check below.
  const av = available.filter((m) => typeof m === "string" && m.length > 0);
  if (av.length === 0) {
    return { model: null, tier: "none", reason: "no string-typed models" };
  }

  let requestedTier = (typeof category === "string" && CATEGORY_TIER[category]) || "balanced";
  const baseTier = requestedTier; // captured pre-promotion, for honest telemetry

  // BLACKWELL-TOKEN-SYNERGY-MS0 — U-BW-OFFLOAD-TIER (balanced→strong) +
  // U-BW-BEST-TIER-REACH (synthesis→best). On the 96GB RTX PRO 6000 Blackwell
  // the larger local tiers are free with huge headroom and give materially
  // better output than the 7B `balanced` tier — higher-quality offloaded
  // output means fewer re-escalations back to Claude (the offload take-rate
  // lever). Every non-cheap category rises at least to `strong` (14B);
  // synthesis-heavy categories (BLACKWELL_CEILING) rise to `best` (32B), the
  // tier whose quality scales most with model size. Trivial `cheap` tasks
  // (classify / format / inventory) are never promoted — a 32B for a one-word
  // classification is pure latency waste. Other hosts keep the conservative map.
  //
  // Honest-telemetry gate (inherited from U-BW-OFFLOAD-TIER): walk DOWN from the
  // ceiling to the highest tier whose model is ACTUALLY installed, never
  // promoting into an empty tier. Promoting when no 14B/32B is held would land
  // the task in the last-resort `fallback` tier (the smaller model still served,
  // but the dashboard would mis-read a clean hit as a tier-miss). When nothing
  // above the base tier is held we behave exactly like a non-Blackwell host —
  // identical model choice, honest reason.
  let blackwellTarget = null;
  if (hardware === "home_blackwell" && requestedTier !== "cheap") {
    let ceiling = "strong";
    const override = BLACKWELL_CEILING[category];
    if (override && TIER_ORDER.indexOf(override) > TIER_ORDER.indexOf(ceiling)) {
      ceiling = override;
    }
    const baseIdx = TIER_ORDER.indexOf(requestedTier);
    for (let t = TIER_ORDER.indexOf(ceiling); t > baseIdx; t--) {
      if (TIER_PREFERENCES[TIER_ORDER[t]].some((m) => av.includes(m))) {
        requestedTier = TIER_ORDER[t];
        blackwellTarget = TIER_ORDER[t];
        break;
      }
    }
  }
  const startIdx = TIER_ORDER.indexOf(requestedTier);
  // startIdx is always >=0 because CATEGORY_TIER values are constrained to
  // TIER_ORDER entries, but the bounds check costs ~nothing and protects
  // against a future typo in the constants table.
  if (startIdx < 0) {
    return { model: av[0], tier: "fallback", reason: `unknown tier "${requestedTier}"` };
  }

  // Auditability: the dashboard reads `reason`, so record the Blackwell
  // promotion (base tier → promoted tier) when it fired.
  const promo = blackwellTarget ? ` [blackwell:${baseTier}→${blackwellTarget}]` : "";

  for (let i = startIdx; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    for (const pref of TIER_PREFERENCES[tier]) {
      if (av.includes(pref)) {
        return {
          model: pref,
          tier,
          reason:
            (i === startIdx
              ? "target tier"
              : `escalated ${requestedTier} → ${tier}`) + promo,
        };
      }
    }
  }

  // Nothing in the curated tiers — fall back to whatever the host has.
  // NOTE: `promo` is provably "" on this path — a Blackwell promotion only ever
  // fires to a tier with a held model (the down-walk gate), so reaching the
  // fallback implies no promotion happened. Kept appended for symmetry; do NOT
  // "fix" it into emitting a [blackwell:…] suffix here — that would be dishonest.
  return { model: av[0], tier: "fallback", reason: "no preferred model in any tier" + promo };
}

// ---------------------------------------------------------------------------
// FLEET-OLLAMA-ROUTING-MS0/U-FLOR01 -- resolveExecutor: lane-aware per-task
// model selection. The executor contract that /smart + the offload hooks + the
// dev slash-commands all consume. WRAPS routeModelForTask (above) for the
// Ollama model choice and adds the LANE dimension the prior router lacked:
//
//   prism_calc -> deterministic PRISM code, NO model spend (R5).
//   claude     -> judgment / safety-critical -- NEVER a local model.
//   vllm       -> high-fan-out mechanical grunt, ONLY when explicitly enabled
//                 AND healthy; a single fixed hot model (served-model-name),
//                 NOT tier-routed. Auto-falls-back to Ollama when down.
//   ollama     -> the always-available local floor for mechanical text/code
//                 ops, at the cost-router-resolved tier/model.
//
// PURE -- the host hook injects `available` (from /api/tags), `vllmAvailable`
// (from vllm-hook-bridge isVllmAvailable), and `ollamaAvailable`. No IO here;
// tests inject the same way they inject `available` for routeModelForTask.
//
// FAIL-LOUD (R12): an offloadable task that cannot reach Ollama (daemon down or
// empty roster) returns lane:"claude" with an explicit reason -- it does NOT
// silently pretend to offload. The caller surfaces the reason.

// Judgment / safety categories -- never offloaded to a local model. Single-
// sourced here so every consumer (/smart, the hooks, the commands) shares ONE
// definition of "Claude-only" instead of re-deriving it.
export const CLAUDE_LANE_CATEGORIES = Object.freeze(new Set([
  "safety", "safety_validation", "security", "security_audit",
  "tolerance_reasoning", "physics_judgment", "architecture",
  "deep_reasoning", "novel_codegen", "multi_file_refactor", "orchestration",
]));

// Categories answered by deterministic PRISM code -- no model spend at all (R5).
export const DETERMINISTIC_LANE_CATEGORIES = Object.freeze(new Set([
  "physics_calc", "sx_gate", "unit_convert",
]));

// High-fan-out mechanical categories that benefit MOST from vLLM's continuous
// batching when it is enabled + available (the 26-slot single-model grunt path).
// A subset of the offloadable categories; everything else stays on Ollama even
// when vLLM is up (Ollama's multi-model elasticity is the better fit -- see the
// vLLM-vs-Ollama decision in the FLEET-OLLAMA-ROUTING-MS0 wiki entry).
export const VLLM_PREFERRED_CATEGORIES = Object.freeze(new Set([
  "summary", "explanation", "documentation", "git_summary",
  "classification", "diff_summary", "error_triage", "docstring",
]));

// FLEET-OLLAMA-ROUTING-MS1/U-FLOR-CLAUDE-TIER (2026-06-11, operator directive):
// the Claude-lane SUB-TIER. The fleet fallback ladder is
//   Ollama (free) -> Sonnet/Haiku (cheap Claude) -> Opus/Fable (reserved).
// Opus/Fable are correct in EXACTLY ONE place: the judgment/safety/deep-reasoning/
// heavy-codegen categories (CLAUDE_LANE_CATEGORIES) -- those ARE the
// "reasoning, planning and heavy coding" tasks the operator reserves the top
// tier for. A MECHANICAL task that cannot reach Ollama (daemon down / no model)
// must NEVER silently promote to the session's Opus -- it drops to the cheapest
// Claude tier that still does the job. This single-sources "which Claude model"
// the same way CLAUDE_LANE_CATEGORIES single-sources "is this Claude-only".
//
// CLAUDE_REASONING_MODEL is the canonical label for the top reasoning tier --
// "opus" here stands in for the fable-class ceiling / whatever the session's top
// model is. Consumers on a Fable session treat it as their session top model.
export const CLAUDE_REASONING_MODEL = "opus";

/**
 * The cheap-Claude fallback model for a MECHANICAL category that can't offload.
 * Reuses the SAME cheap/balanced split the Ollama tiers use (CATEGORY_TIER) so
 * the Claude fallback tier tracks the task's intrinsic weight 1:1:
 *   cheap-tier work  (classify / format / inventory / introspect) -> "haiku"
 *   balanced+/unknown (summary / explain / doc / audit / synthesis) -> "sonnet"
 * NEVER returns "opus" -- that is reserved for CLAUDE_LANE_CATEGORIES only. PURE.
 * @param {string} category
 * @returns {"haiku"|"sonnet"}
 */
export function claudeFallbackModel(category) {
  const cat = typeof category === "string" ? category : "";
  return CATEGORY_TIER[cat] === "cheap" ? "haiku" : "sonnet";
}

/**
 * Resolve the executor LANE + model for a task category.
 *
 * @param {{
 *   category: string,
 *   available?: string[],      // Ollama /api/tags model names (host-injected)
 *   hardware?: string,         // HardwareProfile (e.g. "home_blackwell")
 *   vllmEnabled?: boolean,     // PRISM_VLLM_ENABLE
 *   vllmAvailable?: boolean,   // vllm-hook-bridge isVllmAvailable() result
 *   ollamaAvailable?: boolean  // /api/tags reachable (default true)
 * }} args
 * @returns {{ lane: "prism_calc"|"claude"|"vllm"|"ollama", model: string|null,
 *             tier: string, reason: string,
 *             claudeModel: "opus"|"sonnet"|"haiku"|null }}
 *   `claudeModel` is the Claude SUB-TIER when (and only when) the task lands on
 *   Claude: "opus" for judgment/reasoning/heavy-codegen (CLAUDE_LANE_CATEGORIES),
 *   "sonnet"/"haiku" for a MECHANICAL task that fell back from an unreachable
 *   Ollama. null on the prism_calc / ollama / vllm lanes (no Claude spend). The
 *   anti-leak invariant: a mechanical offload-miss NEVER yields "opus".
 */
export function resolveExecutor({
  category,
  available = [],
  hardware,
  vllmEnabled = false,
  vllmAvailable = false,
  ollamaAvailable = true,
} = {}) {
  const cat = typeof category === "string" ? category : "";

  // 1. Deterministic -- PRISM code answers it; no model spend (R5).
  if (DETERMINISTIC_LANE_CATEGORIES.has(cat)) {
    return {
      lane: "prism_calc", model: null, tier: "deterministic", claudeModel: null,
      reason: `deterministic "${cat}" -> PRISM code (R5, no model spend)`,
    };
  }

  // 2. Judgment / safety -- hard invariant: never a local model.
  if (CLAUDE_LANE_CATEGORIES.has(cat)) {
    return {
      lane: "claude", model: null, tier: "cloud", claudeModel: CLAUDE_REASONING_MODEL,
      reason: `judgment/safety "${cat}" -> Claude ${CLAUDE_REASONING_MODEL} (reasoning/planning/heavy-coding tier, never local)`,
    };
  }

  // 3. Mechanical / offloadable. Resolve the Ollama model first (the local
  //    floor). If Ollama is unreachable or has no model, we CANNOT offload --
  //    fail loud and keep on Claude (R12); do not silently pretend.
  const routed = routeModelForTask({ category: cat, available, hardware });
  if (!ollamaAvailable || routed.model === null) {
    // Fallback ladder: a mechanical task that can't reach Ollama drops to the
    // CHEAP Claude tier (haiku/sonnet) -- it must NOT silently land on the
    // session's Opus (the leak this field exists to close). R12: fail-loud reason.
    const claudeModel = claudeFallbackModel(cat);
    return {
      lane: "claude", model: null, tier: "cloud", claudeModel,
      reason: `offloadable "${cat}" but Ollama unavailable (${routed.reason}) -> ${claudeModel} (cheap-Claude fallback, NOT Opus) [fail-loud]`,
    };
  }

  // 4. vLLM lane -- only when explicitly enabled AND healthy AND a high-fan-out
  //    class. vLLM serves ONE fixed hot model (served-model-name "local-vllm");
  //    no tier escalation. Ollama is the named fallback if vLLM health-fails.
  if (vllmEnabled && vllmAvailable && VLLM_PREFERRED_CATEGORIES.has(cat)) {
    return {
      lane: "vllm", model: "local-vllm", tier: "vllm", claudeModel: null,
      reason: `high-fan-out "${cat}" -> vLLM (ollama-fallback: ${routed.model})`,
    };
  }

  // 5. Default lane: Ollama at the cost-router-resolved tier/model.
  const vllmNote = vllmEnabled && !vllmAvailable ? " [vllm-enabled-but-down->ollama]" : "";
  return {
    lane: "ollama", model: routed.model, tier: routed.tier, claudeModel: null,
    reason: routed.reason + vllmNote,
  };
}
