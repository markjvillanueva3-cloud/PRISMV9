#!/usr/bin/env node
// scripts/lib/domain-classifier.mjs
//
// Single source of truth for slot↔domain mapping + unit→domain classification.
//
// Background: PRISM runs 13 NATO-named chat slots, each assigned a PRISM system
// domain (alpha=mill, bravo=lathe, charlie=wire-EDM, etc. per JULIETT-12CHAT-
// ALLOCATION-MS0). The slot-task queue allocator (scripts/allocate-domains-to-
// slots.mjs) and the pickup picker (.claude/helpers/priority-queue.mjs) both
// need to know "which slot owns this unit" — extracted here to one place so
// they can't drift.
//
// Rule ordering is first-match-wins and IS load-bearing:
//   - wire BEFORE lathe (WEDM is wire-EDM, not lathe-EDM)
//   - cam BEFORE mill (HYPERMILL contains the substring MILL — would falsely
//     classify as mill if MILL ran first; same for SOLIDCAM/MASTERCAM/etc.)
//   - Specific keywords beat generic ones (e.g. PRINT-TO-PROGRAM is its own
//     domain, not "post" or "cad")

const DEFAULT_DOMAIN = Object.freeze({ domain: "misc", slot: "mike" });

const DOMAIN_RULES = Object.freeze([
  { domain: "wire",       slot: "charlie", rx: /\bWEDM\b|WIRE.?EDM|\bEDM\b|ELECTRODE|TAPTITE|SINKER/ },
  { domain: "lathe",      slot: "bravo",   rx: /\bLATHE|TURNING|\bTURN\b|SWISS|\bGROOV|HARD.?TURN/ },
  { domain: "cam",        slot: "echo",    rx: /\bCAM\b|TOOLPATH|HYPERMILL|MASTERCAM|\bESPRIT\b|INVENTOR.?HSM|SOLIDWORKS|SOLIDCAM|POWERMILL|\bNX.?CAM|CATIA|SPRUTCAM|CIMATRON|FUSION.?(360|CAM)/ },
  { domain: "mill",       slot: "alpha",   rx: /\bMILL|MILLING|FIVE.?AXIS|\b5.?AXIS|FACE.?MILL|\bDRILL/ },
  { domain: "cad",        slot: "delta",   rx: /\bCAD\b|CADQUERY|GEOMETRY|FEATURE.?RECOG|STEP.?FILE|\bDXF\b|\bIGES\b|BLUEPRINT.?TO.?CAD|TOLERANCE.?STACK|\bGD.?T\b/ },
  { domain: "post",       slot: "india",   rx: /POST.?PROCESS|\bPPG\b|MASTER.?POST|CONTROLLER|\bDNC\b|NC.?OUTPUT|\bG.?CODE|MACRO.?CONVERT/ },
  { domain: "speedfeed",  slot: "juliett", rx: /SPEED.?FEED|\bSFC\b|SF-AI|FEED.?RATE|KIENZLE|\bGILBERT|SPINDLE.?CHAR/ },
  { domain: "print2prog", slot: "kilo",    rx: /PRINT.?TO.?PROGRAM|\bP2P\b|PRINT2PROG|DOCUSTRATA|DOCUMENT.?INGEST|DOCU.?PRINT|\bOCR\b|MACRO.?PROGRAM|MACRO.?FILL|BLUEPRINT.?OCR/ },
  { domain: "academy",    slot: "lima",    rx: /ACADEMY|\bLEARNING|TRAINING|TUTORIAL|\bVIDEO|MIT.?(COURSE|OCW)|CURRICULUM|ELEARNING|COURSE.?FORGE|KNOWLEDGE.?CONVERSION/ },
  { domain: "tribal",     slot: "foxtrot", rx: /TRIBAL|PLAYBOOK|KNOW.?HOW|SHOP.?KNOWLEDGE|MACHINING.?KNOW|OPERATOR.?WISDOM/ },
  { domain: "erp",        slot: "hotel",   rx: /\bERP\b|BUSINESS|\bBIZ\b|QUOTE|QUOTING|SHOULD.?COST|COST.?(ESTIMAT|CASCADE)|INVOICE|\bCUSTOMER|\bHR\b|EMPLOYEE|SUBSCRIPTION|BILLING|\bRBAC\b|COMPLIANCE|\bTAX\b|SCHEDUL|CAPACITY.?PLAN/ },
  { domain: "database",   slot: "golf",    rx: /DATABASE|DB.?(BUILD|MAINT)|\bCATALOG|REGISTRY|\bRES-MS|\bINGEST|MATERIAL.?(DB|BAND|ENRICH)|TOOL.?(DB|CATALOG)/ },
]);

// Derived maps — single source of truth above.
const DOMAIN_TO_SLOT = Object.freeze(
  Object.fromEntries([
    [DEFAULT_DOMAIN.domain, DEFAULT_DOMAIN.slot],
    ...DOMAIN_RULES.map((r) => [r.domain, r.slot]),
  ])
);
const SLOT_TO_DOMAIN = Object.freeze(
  Object.fromEntries([
    [DEFAULT_DOMAIN.slot, DEFAULT_DOMAIN.domain],
    ...DOMAIN_RULES.map((r) => [r.slot, r.domain]),
  ])
);

const SLOT_DOMAIN_LABEL = Object.freeze({
  alpha: "mill", bravo: "lathe", charlie: "wire (WEDM)", delta: "cad", echo: "cam",
  foxtrot: "machining-knowhow + tribal", hotel: "erp/business + hr",
  india: "post-processor + master post", juliett: "speed-feed calculator",
  kilo: "print-to-program pipelines", lima: "prism-academy + learning-pipelines",
  mike: "misc features", golf: "database build/maintenance + hygiene",
});

export { DEFAULT_DOMAIN, DOMAIN_RULES, DOMAIN_TO_SLOT, SLOT_TO_DOMAIN, SLOT_DOMAIN_LABEL };

/**
 * Classify a unit into its owning domain + slot.
 *
 * @param {object} unit — fields searched (case-insensitive): milestone, unit_id, id, title.
 * @returns {{domain: string, slot: string}} — never null; falls back to {misc, mike}.
 */
export function classifyUnit(unit) {
  if (!unit || typeof unit !== "object") return DEFAULT_DOMAIN;
  const text = `${unit.milestone || ""} ${unit.unit_id || unit.id || ""} ${unit.title || ""}`.toUpperCase();
  for (const rule of DOMAIN_RULES) {
    if (rule.rx.test(text)) return { domain: rule.domain, slot: rule.slot };
  }
  return DEFAULT_DOMAIN;
}

/**
 * Convenience: classify a free-text string (e.g. a milestone description or
 * a stop-hook log line). Same rules as classifyUnit; useful when you don't
 * have a structured unit record handy.
 */
export function classifyText(text) {
  if (typeof text !== "string" || !text) return DEFAULT_DOMAIN;
  const t = text.toUpperCase();
  for (const rule of DOMAIN_RULES) {
    if (rule.rx.test(t)) return { domain: rule.domain, slot: rule.slot };
  }
  return DEFAULT_DOMAIN;
}

/**
 * Lookup a slot's owning domain. Returns null if the slot name is unknown
 * (e.g., a future slot that doesn't have a domain assignment yet).
 */
export function slotDomain(slot) {
  if (typeof slot !== "string") return null;
  const s = slot.toLowerCase();
  return SLOT_TO_DOMAIN[s] || null;
}

/**
 * Filter a list of units to those owned by the given slot. R12-compliant:
 * if `slot` is unknown OR `units` is empty, returns the input list unchanged
 * (caller can detect via referential equality if needed).
 */
export function filterUnitsBySlot(units, slot) {
  if (!Array.isArray(units) || units.length === 0) return units;
  const domain = slotDomain(slot);
  if (!domain) return units;                              // unknown slot — no filter
  return units.filter((u) => classifyUnit(u).domain === domain);
}
