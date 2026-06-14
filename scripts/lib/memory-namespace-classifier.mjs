#!/usr/bin/env node
// scripts/lib/memory-namespace-classifier.mjs
// U-GALAXY-MS1-B2 (2026-05-27, slot:alpha — sierra-territory alpha-skeleton):
// HMEMV05 memory-router intercept per SCOPE-EXPANSION §Q6 #2.
//
// Pure-function classifier that maps {key, value, context} → namespace target.
// Designed for memoryStoreEngine to call BEFORE writing to its SQLite table —
// the engine then writes to the chosen namespace instead of `default`. Today
// most memory_store calls land in `default` namespace (wasted retrieval).
//
// Sierra integrates this into prism_memory action handlers. This file is the
// pure-fn LIB; the wire-up at action sites is a separate ship.
//
// Namespaces:
//   - universal:<key>           — generic standing-doctrine + cross-cutting
//   - galaxy:<name>:<key>       — domain-specific (mill / lathe / wedm / etc.)
//   - slot-soul:<slot>:<key>    — personality / refuse-list / domain-filter
//   - ephemeral:<sessionId>:<key> — short-lived session state, TTL-eligible
//
// Pure exports: classifyNamespace(input) → {namespace, target, confidence, reason}.
// No I/O. No env reads. Easily testable.

export const NAMESPACE_KINDS = ["universal", "galaxy", "slot-soul", "ephemeral"];

const GALAXY_KEYWORDS = {
  mill: ["mill", "milling", "kienzle", "taylor", "chip-load", "spindle", "hsm", "trochoidal", "hypermill"],
  lathe: ["lathe", "turning", "css", "g96", "boring-bar", "threading", "parting", "sub-spindle"],
  wedm: ["wedm", "edm", "dielectric", "flushing", "recast", "wire-tension"],
  quoting: ["quote", "quoting", "qp-", "cost-estimate", "bootstrap-distribution"],
  business: ["erp", "payroll", "pto", "customer-portfolio", "employee-academy", "business-sync"],
  academy: ["course", "curriculum", "lesson", "mit-ocw", "ahmad"],
  "post-processor": ["gcode", "master-post", "fanuc", "okuma", "siemens", "heidenhain", "hurco"],
  cad: ["dfm", "tolerance-stack", "feature-recognition", "blueprint"],
  cam: ["toolpath", "cam-strategy", "fusion-cam"],
  "shop-floor": ["machine-live", "traveler", "alarm-code"],
  quality: ["cpk", "spc", "cmm", "surface-finish-grade"],
  "compliance-safety": ["softening-safety", "s-x-score", "omega-threshold"],
  "agent-orchestration": ["zebra", "orchestrator", "swarm", "hive-mind", "fleet-precheck"],
};

const EPHEMERAL_KEYS = /^(session|temp|scratch|cache|throwaway|tmp)/i;
const SLOT_SOUL_KEYS = /^slot-soul[-_:]|^soul:[a-z]+/i;
const UNIVERSAL_KEYWORDS = ["feedback_karpathy", "feedback_r5_thru_r12", "feedback_psn_definition", "feedback_always_capture", "feedback_always_build", "feedback_never_delete"];

function detectGalaxyByContent(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [g, kws] of Object.entries(GALAXY_KEYWORDS)) {
    const s = kws.filter(k => lower.includes(k)).length;
    if (s > 0) scores[g] = s;
  }
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  // Dominant if 2x next-best OR single
  if (entries.length === 1 || entries[0][1] >= entries[1][1] * 2) {
    return { galaxy: entries[0][0], confidence: Math.min(1, entries[0][1] / 5) };
  }
  return null; // ambiguous → universal
}

/**
 * Classify a memory store call → namespace target.
 *
 * @param {object} input
 * @param {string} input.key       — memory key (e.g. "feedback_karpathy_discipline")
 * @param {string|object} input.value — memory body (string or JSON-stringifiable object)
 * @param {string} [input.slot]    — chat slot (alpha/bravo/etc.) when known
 * @param {string} [input.sessionId] — session id for ephemeral classification
 * @returns {{namespace: string, target: string, confidence: number, reason: string}}
 */
export function classifyNamespace({ key, value, slot, sessionId } = {}) {
  const k = String(key || "");
  const v = typeof value === "string" ? value : JSON.stringify(value ?? "");

  // 1. Ephemeral if key matches throwaway pattern
  if (EPHEMERAL_KEYS.test(k)) {
    return {
      namespace: "ephemeral",
      target: `ephemeral:${sessionId || "unknown"}:${k}`,
      confidence: 0.95,
      reason: `key prefix "${k.split(/[-_:]/)[0]}" matches ephemeral pattern`,
    };
  }

  // 2. Slot-soul if key explicitly names a soul
  if (SLOT_SOUL_KEYS.test(k) || (slot && k.toLowerCase().includes(`soul:${slot}`))) {
    return {
      namespace: "slot-soul",
      target: `slot-soul:${slot || "unknown"}:${k}`,
      confidence: 0.95,
      reason: `key matches slot-soul pattern OR contains explicit soul: prefix`,
    };
  }

  // 3. Universal if key matches known universal-doctrine pattern
  for (const u of UNIVERSAL_KEYWORDS) {
    if (k.toLowerCase().includes(u)) {
      return {
        namespace: "universal",
        target: `universal:${k}`,
        confidence: 0.9,
        reason: `key contains universal-doctrine marker "${u}"`,
      };
    }
  }

  // 4. Galaxy classification by content + key keywords
  const combined = `${k} ${v}`;
  const galaxyHit = detectGalaxyByContent(combined);
  if (galaxyHit) {
    return {
      namespace: "galaxy",
      target: `galaxy:${galaxyHit.galaxy}:${k}`,
      confidence: galaxyHit.confidence,
      reason: `keyword match → galaxy=${galaxyHit.galaxy}`,
    };
  }

  // 5. Fallback: universal (was: default; the gap this LIB closes)
  return {
    namespace: "universal",
    target: `universal:${k}`,
    confidence: 0.3,
    reason: `no specific match — fallback universal (vs prior default-namespace fallback)`,
  };
}

// Allow direct invocation for smoke-test: `node memory-namespace-classifier.mjs '{"key":"...","value":"..."}'`
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const inputRaw = process.argv[2] || '{"key":"test_unknown","value":"hello world"}';
  try {
    const input = JSON.parse(inputRaw);
    const result = classifyNamespace(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Usage: node memory-namespace-classifier.mjs '{\"key\":\"...\",\"value\":\"...\"}'");
    console.error("Error:", e.message);
    process.exit(1);
  }
}
