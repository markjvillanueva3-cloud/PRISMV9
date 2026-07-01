// fanout-assess.mjs -- HERMES-MASTER-ORCHESTRATOR-MS0 / U-HMO-AUTO-FANOUT
//
// Lightweight, pure, no-throw PRE-SCREEN that decides WHETHER a raw prompt warrants
// a parallel multi-slot fan-out. It mirrors the APPROACH of the authoritative
// HermesParallelFanoutPlannerEngine.assessAutoTrigger (TS, dist) -- distinct-domain
// count + explicit fleet-wide scope -- in a compact .mjs the UserPromptSubmit hook
// can call with zero dist dependency (hooks must run on every checkout, dist or not).
//
// Division of labor (R8/DRY): the ENGINE is authoritative for the actual fan-out PLAN
// (plan() graph + full DOMAIN_SIGNATURES + candidate hydration). THIS lib only decides
// whether to SURFACE the advisory. Advisory-only -- it never spawns agents (bravo soul
// refuses unsafe-fleet-control). Keep PRIMARY_DOMAINS in rough sync with the engine.

export const DEFAULT_FANOUT_THRESHOLD = 3;
const MAX_SCAN = 8000;

// Compact primary fleet domains -> owning NATO slot + detection keywords.
// (Pre-screen subset of the engine's DOMAIN_SIGNATURES; canonical owner map is CHAT-SLOT-DOMAINS.md.)
export const PRIMARY_DOMAINS = [
  { domain: "mill", slot: "foxtrot", keywords: ["mill", "milling", "vmc", "face mill", "end mill"] },
  { domain: "lathe", slot: "whiskey", keywords: ["lathe", "turning", "turn", "chuck", "css"] },
  { domain: "wedm", slot: "mike", keywords: ["wedm", "wire edm", "wire-edm", "edm", "spark"] },
  { domain: "cam", slot: "kilo", keywords: ["cam", "toolpath", "mastercam", "hypermill", "fusion cam"] },
  { domain: "cad", slot: "delta", keywords: ["cad", "step file", "b-rep", "brep", "feature recognition", "geometry"] },
  { domain: "quoting", slot: "charlie", keywords: ["quote", "quoting", "estimate", "pricing", "margin", "bid"] },
  { domain: "business", slot: "hotel", keywords: ["erp", "hr", "accounting", "invoice", "payroll", "work order"] },
  { domain: "post-processor", slot: "echo", keywords: ["post processor", "post-processor", "g-code", "gcode", "nc code", "cps"] },
  { domain: "speed-feed", slot: "oscar", keywords: ["speed and feed", "speed/feed", "sfc", "feed rate", "rpm", "kienzle"] },
  { domain: "academy", slot: "lima", keywords: ["academy", "course", "curriculum", "lesson", "training course"] },
  { domain: "system-viz", slot: "sierra", keywords: ["system-viz", "system viz", "ghost roost", "graph node", "master index"] },
  { domain: "ai-systems", slot: "india", keywords: ["lora", "gnn", "neural net", "deep learning", "rag", "embedding"] },
];

const FLEET_SCOPE_RE = /\b(all galaxies|every slot|every galaxy|across all|fleet[- ]wide|whole system|system as a whole|all slots|all domains|all galaxy)\b/i;

/** Match a keyword on word boundaries (regex-meta safe). */
function kwHit(text, kw) {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(text);
}

/**
 * Assess whether a prompt warrants a parallel fan-out (advisory pre-screen).
 * @param {unknown} promptText
 * @param {{threshold?:number}} [opts]
 * @returns {{shouldFanout:boolean, domainCount:number, domains:{domain:string,slot:string,matched:string[]}[], signals:string[], threshold:number, reason:string}}
 */
export function assessFanout(promptText, opts = {}) {
  const rawT = opts.threshold;
  const threshold = (typeof rawT === "number" && Number.isFinite(rawT) && rawT >= 2) ? Math.floor(rawT) : DEFAULT_FANOUT_THRESHOLD;
  const base = { shouldFanout: false, domainCount: 0, domains: [], signals: [], threshold, reason: "empty-or-invalid-prompt" };
  if (typeof promptText !== "string" || promptText.trim().length === 0) return base;

  const text = promptText.slice(0, MAX_SCAN).toLowerCase();
  const domains = [];
  for (const d of PRIMARY_DOMAINS) {
    const matched = d.keywords.filter((kw) => kwHit(text, kw));
    if (matched.length > 0) domains.push({ domain: d.domain, slot: d.slot, matched });
  }
  const domainCount = domains.length;
  const signals = [];
  if (domainCount >= threshold) signals.push("multi-domain");
  const hasFleetScope = FLEET_SCOPE_RE.test(text);
  if (hasFleetScope) signals.push("fleet-wide-scope");

  // Only an explicit fleet-wide scope OR a genuine distinct-domain count >= threshold flips the verdict
  // (mirrors the engine: and-chains/single-domain prose must NOT over-fire).
  const shouldFanout = hasFleetScope || domainCount >= threshold;
  const reason = shouldFanout
    ? `fan-out worth considering (${hasFleetScope ? "explicit fleet-wide scope" : `${domainCount} distinct domains >= ${threshold}`}); domains: ${domains.map((d) => d.domain).join(", ") || "none"}`
    : `sequential ok -- ${domainCount} distinct domain(s) < ${threshold}, no fleet-wide signal`;
  return { shouldFanout, domainCount, domains, signals, threshold, reason };
}
