/**
 * rgs-signal-fusion.mjs
 * Pure signal-fusion core for RGS tool-auto-invoke pipeline.
 *
 * export async function fuseSignals({ unit, complexity, readers }) -> ToolPlan | null
 *
 * All I/O is injected via `readers`; the only direct import is the pure rule
 * table from ./rgs-pipeline-rules.mjs (matchPipelines, matchAgents).
 *
 * CONTRACT: see task spec — implement every step exactly.
 */

import { matchPipelines, matchAgents } from "./rgs-pipeline-rules.mjs";

// ---------------------------------------------------------------------------
// Constants (extracted to avoid magic-number warnings)
// ---------------------------------------------------------------------------

/** Maximum text length fed to readers (oversize truncation). */
const MAX_TEXT_LEN = 20000;

/** Maximum confidence produced by the deterministic path. */
const DETERMINISTIC_CONF_CAP = 0.6;

/** Domain tokens scanned left-to-right in unit text to set prefDomain. */
const DOMAIN_TOKENS = ["mill", "lathe", "wedm", "cad", "cam"];

/** Valid verdict values for buildVsIntegrate. */
const VALID_VERDICTS = ["build", "integrate", "close-out"];

/** Valid tier values. */
const VALID_TIERS = ["S", "M", "L", "XL"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a numeric value to 0 when not finite (NaN / ±Infinity).
 * @param {number} x
 * @returns {number}
 */
function sanitizeFinite(x) {
  return Number.isFinite(x) ? x : 0;
}

/**
 * Derive a domain token from unit text (first match wins, else undefined).
 * @param {string} text
 * @returns {string|undefined}
 */
function derivePrefDomain(text) {
  const lower = text.toLowerCase();
  for (const token of DOMAIN_TOKENS) {
    if (lower.includes(token)) return token;
  }
  return undefined;
}

/**
 * Stable-sort tribal entries so those whose domain===prefDomain rank first.
 * Ties within each group preserve original order (Array.prototype.sort is
 * stable in Node >=11).
 * @param {{ domain: string }[]} tribal
 * @param {string|undefined} prefDomain
 * @returns {{ domain: string }[]}
 */
function boostTribalDomain(tribal, prefDomain) {
  if (!prefDomain) return tribal;
  return [...tribal].sort((a, b) => {
    const aMatch = a.domain === prefDomain ? 0 : 1;
    const bMatch = b.domain === prefDomain ? 0 : 1;
    return aMatch - bMatch; // 0-0=0 (stable), 0-1=-1 (a first), 1-0=1 (b first)
  });
}

/**
 * Compute the arithmetic mean of an array of numbers; returns 0 for empty.
 * @param {number[]} values
 * @returns {number}
 */
function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/**
 * Validate an ollama response object against the required schema.
 * Returns true iff toolchain is a non-empty string[], confidence is
 * finite in [0,1], and rationale is a string.
 * @param {unknown} obj
 * @returns {boolean}
 */
function isValidOllamaSchema(obj) {
  if (obj === null || typeof obj !== "object") return false;
  const { toolchain, confidence, rationale } = /** @type {Record<string,unknown>} */ (obj);
  if (!Array.isArray(toolchain) || toolchain.length === 0) return false;
  if (!toolchain.every((t) => typeof t === "string")) return false;
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) return false;
  if (confidence < 0 || confidence > 1) return false;
  if (typeof rationale !== "string") return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * @typedef {{ skill: string, why: string, confidence: number }} PipelineEntry
 * @typedef {{ id: string, tip: string, score: number, domain: string }} TribalEntry
 * @typedef {{
 *   pipelines: PipelineEntry[],
 *   tribal: TribalEntry[],
 *   skills: string[],
 *   mcpTools: string[],
 *   agents: string[],
 *   buildVsIntegrate: "build"|"integrate"|"close-out",
 *   complexityTier: "S"|"M"|"L"|"XL",
 *   confidence: number,
 *   rationale: string,
 *   source: "ollama"|"deterministic"
 * }} ToolPlan
 */

/**
 * fuseSignals — compose signals into a ToolPlan for a roadmap unit.
 *
 * @param {{
 *   unit: { key: string, milestone?: string, unitId: string, title: string, description?: string },
 *   complexity: { tier: "S"|"M"|"L"|"XL", verdict: "build"|"integrate" },
 *   readers: {
 *     capabilities(text: string): Promise<{ engines: string[], mcpTools: string[] }>,
 *     tribal(text: string, opts: { prefDomain?: string }): Promise<TribalEntry[]>,
 *     skillTriggers(text: string): Promise<string[]>,
 *     buildState(unit: object): Promise<{ shipped: boolean }>,
 *     outcomes(opts: { pipeline: string, tier: string, verdict: string }): Promise<{ shipped: number, blocked: number, reverted: number }>,
 *     ollama?(prompt: string): Promise<{ success: boolean, response: string }>
 *   }
 * }} args
 * @returns {Promise<ToolPlan|null>}
 */
export async function fuseSignals({ unit, complexity, readers }) {
  // Step 1 — guard: empty/whitespace title → null.
  if (!unit.title || !String(unit.title).trim()) {
    return null;
  }

  // Step 2 — build text (oversize truncation).
  const text = (String(unit.title) + " " + String(unit.description ?? "")).slice(0, MAX_TEXT_LEN);

  // Step 3 — resolve verdict; override to "close-out" if already shipped.
  let verdict = complexity.verdict;
  const bs = await readers.buildState(unit);
  if (bs && bs.shipped) {
    verdict = "close-out";
  }

  // Step 4 — tier.
  const tier = complexity.tier;

  // Step 5 — capabilities.
  const caps = (await readers.capabilities(text)) ?? { engines: [], mcpTools: [] };

  // Step 6 — skill triggers.
  const skills = (await readers.skillTriggers(text)) ?? [];

  // Step 7 — tribal with domain boost (stable sort).
  const prefDomain = derivePrefDomain(text);
  const rawTribal = (await readers.tribal(text, { prefDomain })) ?? [];
  // SANITIZE tribal scores (step 9 applied early to tribal so boost-sort uses clean values).
  const tribalSanitized = rawTribal.map((t) => ({ ...t, score: sanitizeFinite(t.score) }));
  const tribal = boostTribalDomain(tribalSanitized, prefDomain);

  // Step 8 — rule-based pipelines and agents.
  const rawPipelines = matchPipelines(unit);
  const agents = matchAgents(unit);

  // Step 9+10 — SANITIZE pipeline confidence scores AND re-rank by outcomes.
  const pipelines = await Promise.all(
    rawPipelines.map(async (p) => {
      const sanitizedConf = sanitizeFinite(p.confidence);
      const oc = (await readers.outcomes({ pipeline: p.skill, tier, verdict })) ??
        { shipped: 0, blocked: 0, reverted: 0 };
      const s = oc.shipped || 0;
      const f = (oc.blocked || 0) + (oc.reverted || 0);
      const mult = 0.5 + (s + 1) / (s + f + 2);
      const reranked = Math.max(0, Math.min(1, sanitizedConf * mult));
      return { ...p, confidence: reranked };
    }),
  );

  // Step 11 — raw confidence = mean of pipeline confidences.
  const rawConfidence = mean(pipelines.map((p) => p.confidence));

  // Step 12 — optional Ollama synthesis.
  let source = "deterministic";
  let finalConfidence = Math.min(rawConfidence, DETERMINISTIC_CONF_CAP);
  let rationale = `Deterministic plan for unit "${unit.unitId ?? unit.key}" (tier=${tier}, verdict=${verdict})`;

  if (readers.ollama) {
    // Build a synthesis prompt from the candidate signals.
    const synthesisPayload = {
      unit: { key: unit.key, unitId: unit.unitId, title: unit.title },
      tier,
      verdict,
      candidates: {
        pipelines: pipelines.map((p) => ({ skill: p.skill, confidence: p.confidence })),
        tribal: tribal.slice(0, 5).map((t) => ({ id: t.id, domain: t.domain, score: t.score })),
        skills: skills.slice(0, 10),
        mcpTools: (caps.mcpTools ?? []).slice(0, 10),
      },
    };
    const prompt =
      "You are a PRISM RGS tool-plan synthesizer. Given the candidate signals, " +
      "output ONLY valid JSON: { \"toolchain\": string[], \"confidence\": number, \"rationale\": string }. " +
      "toolchain must be non-empty, confidence must be in [0,1].\n\n" +
      "Signals:\n" +
      JSON.stringify(synthesisPayload, null, 2);

    try {
      const ollamaResult = await readers.ollama(prompt);

      if (ollamaResult && ollamaResult.success) {
        let parsed;
        try {
          parsed = JSON.parse(ollamaResult.response);
        } catch {
          // JSON.parse failed → fall through to deterministic (source stays "deterministic")
          parsed = null;
        }

        if (parsed !== null && isValidOllamaSchema(parsed)) {
          // Ollama succeeded and schema is valid.
          source = "ollama";
          finalConfidence = parsed.confidence;
          rationale = parsed.rationale;
        }
        // else: schema invalid → fall through to deterministic (already set)
      }
      // else: success:false → fall through to deterministic
    } catch {
      // Threw (network error, rejection, etc.) → fall through to deterministic.
    }
  }

  // Step 13 — deterministic confidence already capped above; only re-assign if still deterministic.
  // (No-op here; the logic is in the initialization above and the ollama branch.)

  // Step 14 — missing milestone → confidence = 0.
  if (!unit.milestone) {
    finalConfidence = 0;
  }

  // Step 15+16 — build plan and enforce minimum-plan contract.
  /** @type {ToolPlan} */
  const plan = {
    pipelines,
    tribal,
    skills,
    mcpTools: caps.mcpTools ?? [],
    agents,
    buildVsIntegrate: verdict,
    complexityTier: tier,
    confidence: finalConfidence,
    rationale,
    source,
  };

  // Step 16 — MINIMUM-PLAN CONTRACT (deterministic path only).
  if (source === "deterministic") {
    const hasMinContent =
      tribal.length >= 1 || skills.length >= 1 || (caps.mcpTools ?? []).length >= 1;

    if (
      !(
        pipelines.length >= 1 &&
        VALID_VERDICTS.includes(verdict) &&
        VALID_TIERS.includes(tier) &&
        hasMinContent
      )
    ) {
      const reasons = [];
      if (pipelines.length < 1) reasons.push("pipelines.length<1");
      if (!VALID_VERDICTS.includes(verdict)) reasons.push(`verdict="${verdict}" not in [${VALID_VERDICTS.join(",")}]`);
      if (!VALID_TIERS.includes(tier)) reasons.push(`tier="${tier}" not in [${VALID_TIERS.join(",")}]`);
      if (!hasMinContent) reasons.push("tribal.length<1 AND skills.length<1 AND mcpTools.length<1");
      throw new Error("RGS_DETERMINISTIC_PLAN_INVALID: " + reasons.join("; "));
    }
  }

  // Step 17 — return.
  return plan;
}
