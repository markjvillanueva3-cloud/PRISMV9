// scripts/lib/slot-galaxy-map.mjs
// SINGLE SOURCE OF TRUTH for slot -> galaxy mapping (GALAXY-KIT-MS0, slot:bravo 2026-05-29).
//
// Was TRIPLICATED across:
//   .claude/hooks/slot-context-bundle-inject.mjs
//   scripts/generate-per-slot-skill-wrappers.mjs
//   scripts/generate-per-slot-galaxy-buildout-files.mjs
// with no shared import. The drift already caused two real bugs:
//   (1) papa = frontend-app (live hook) vs backend-helper (both generators)
//   (2) zulu present in hook+skillgen but MISSING from briefgen
// All three now import THIS module, so the map can only ever be edited in one place.
//
// Every value MUST be a real `mcp-server/src/engines/<g>/` dir with a CLAUDE.md.
// The slot-galaxy-map.test.mjs invariant test enforces this (added 2026-06-13 after
// the hermes-zebra bug below slipped past for weeks).
//
// --- 2026-06-13 (slot:alpha, PER-SLOT-CLAUDEMD directive) -- TWO bugs fixed: ---
//  (1) bravo/zebra/zulu routed to "hermes-zulu" -- a NONEXISTENT dir (the real engine
//      dir is `hermes-zulu`; verified `ls engines/hermes-*` = hermes-zulu only). The 3
//      Hermes-domain slots were silently getting ZERO galaxy-context injection. -> hermes-zulu.
//  (2) papa OPEN CONFLICT resolved -> "backend-helper". The prior frontend-app value's
//      stated reason ("backend-helper is not a real dir") is now STALE -- backend-helper/
//      CLAUDE.md EXISTS. Operator-canonical state/shared/CHAT-SLOT-DOMAINS.md lists
//      PAPA="Backend helper"; the 34-galaxy synthesis (_TEMPLATE.md sec.3) independently
//      maps papa->backend-helper; memory feedback_papa_no_gates concurs. quebec remains
//      the sole frontend-app owner.
//
// november + yankee are DELIBERATELY unmapped (no galaxy domain assigned yet):
// a wrong routing matrix is worse than no matrix. Consumers MUST log-and-skip them
// (never silently drop) so a future assignment is visible.

export const SLOT_GALAXY_MAP = {
  alpha:   "token-optimization",
  bravo:   "hermes-zulu",
  charlie: "quoting",
  delta:   "cad",
  echo:    "post-processor",
  foxtrot: "mill",
  golf:    "fleet-hygiene",
  hotel:   "business",
  india:   "ai-training",
  juliett: "database-expansion",
  kilo:    "cam",
  lima:    "academy",
  mike:    "wedm",
  oscar:   "speed-feed",
  papa:    "backend-helper",    // RESOLVED 2026-06-13: operator-canonical + synthesis + dir exists (see header)
  quebec:  "frontend-app",
  romeo:   "wiring",
  sierra:  "system-viz",
  tango:   "discovery",
  uniform: "bug-hunting",
  victor:  "dormant-data",
  whiskey: "lathe",
  xray:    "blueprint-vision",
  zebra:   "hermes-zulu",      // legacy alias (pre-SLOT-RECLAIM); shares galaxy with bravo
  zulu:    "hermes-zulu",      // canonical 26th NATO slot (operator-canonical 2026-05-28)
};

// Slots intentionally WITHOUT a galaxy (no domain assigned). Consumers log-and-skip.
export const UNMAPPED_SLOTS = ["november", "yankee"];

/** Galaxy dir name for a slot, or null if intentionally/structurally unmapped. */
export function galaxyForSlot(slot) {
  return Object.prototype.hasOwnProperty.call(SLOT_GALAXY_MAP, slot) ? SLOT_GALAXY_MAP[slot] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REVERSE resolver: galaxy -> addressable slot (HERMES-CAPABILITY-C1 governance,
// slot:bravo 2026-06-18). Closes HERMES-CONTROL-READINESS blocker #4: the fleet
// router addressed only the galaxies WITH a forward-map owner (~23/34), leaving the
// rest (agent-orchestration, cad-fusion-live, compliance-safety, corpus-aggregation,
// knowledge-conversion, mit-curriculum, pdf-corpus, pdf-corpus-mill, quality,
// shop-floor, tribal-knowledge) as routing dead-ends. This resolver guarantees EVERY
// galaxy is addressable WITHOUT unilaterally assigning permanent ownership (that stays
// an operator decision in SLOT_GALAXY_MAP) -- exactly the readiness doc's offered fix
// ("add a galaxy->slot reverse-resolver"). It is governance INFRA, not enforcing
// fleet-control (the bravo soul refuses unsafe-fleet-control-before-governance).

// Legacy alias slots that must NEVER be the canonical owner of a shared galaxy.
const ALIAS_SLOTS = new Set(["zebra"]);

// Addressability backstop for a galaxy with no explicit owner-slot: the slot-less fleet
// orchestrator re-dispatches it. This is NOT a permanent owner -- the operator assigns
// real owners in SLOT_GALAXY_MAP; the resolver only guarantees no routing dead-end.
// Override with PRISM_GALAXY_FALLBACK_SLOT or opts.fallbackSlot.
export const GALAXY_FALLBACK_SLOT = "zulu";

/**
 * Reverse index galaxy -> canonical owner slot. First non-alias slot in SLOT_GALAXY_MAP
 * insertion order wins, so a shared galaxy (hermes-zulu: bravo/zebra/zulu) resolves to its
 * primary owner (bravo, the builder) and never the legacy `zebra` alias.
 */
export const GALAXY_SLOT_REVERSE = (() => {
  const idx = {};
  for (const [slot, galaxy] of Object.entries(SLOT_GALAXY_MAP)) {
    if (ALIAS_SLOTS.has(slot)) continue;
    if (!Object.prototype.hasOwnProperty.call(idx, galaxy)) idx[galaxy] = slot;
  }
  return idx;
})();

/**
 * Resolve a galaxy to an addressable slot. Returns a governance-honest verdict so the
 * router KNOWS whether the slot is a real owner or just the addressability backstop:
 *   { slot, source: "map"|"fallback"|"none", explicit: boolean, addressable: boolean }
 * - explicit map owner  -> { slot, source:"map",      explicit:true,  addressable:true }
 * - unowned galaxy      -> { slot, source:"fallback", explicit:false, addressable:true }
 * - invalid/empty input -> { slot:null, source:"none", explicit:false, addressable:false }
 * Never throws. @param {string} galaxy @param {{fallbackSlot?:string}} [opts]
 *
 * CONSUMER CONTRACT: round-trip identity (`galaxyForSlot(slotForGalaxy(g).slot) === g`) holds ONLY
 * for `source:"map"`. For a `source:"fallback"` row the slot is the backstop (its OWN galaxy differs,
 * e.g. quality -> zulu -> hermes-zulu), so a router MUST branch on `explicit===false` and re-dispatch
 * the REQUESTED galaxy to the backstop -- never load the backstop slot's own galaxy doctrine.
 */
export function slotForGalaxy(galaxy, opts = {}) {
  if (typeof galaxy !== "string" || galaxy.length === 0) {
    return { slot: null, source: "none", explicit: false, addressable: false };
  }
  const owner = Object.prototype.hasOwnProperty.call(GALAXY_SLOT_REVERSE, galaxy)
    ? GALAXY_SLOT_REVERSE[galaxy] : null;
  if (owner) return { slot: owner, source: "map", explicit: true, addressable: true };
  const fb = opts.fallbackSlot || process.env.PRISM_GALAXY_FALLBACK_SLOT || GALAXY_FALLBACK_SLOT;
  return { slot: fb, source: "fallback", explicit: false, addressable: true };
}

/**
 * Addressability report over a galaxy list (the REACH-blocker #4 proof surface). Pure.
 * Returns { total, explicit, fallback, unaddressable, allAddressable, perGalaxy }.
 */
export function galaxyAddressabilityReport(galaxies, opts = {}) {
  const list = Array.isArray(galaxies) ? galaxies : [];
  const perGalaxy = list.map((g) => ({ galaxy: g, ...slotForGalaxy(g, opts) }));
  const explicit = perGalaxy.filter((r) => r.source === "map").length;
  const fallback = perGalaxy.filter((r) => r.source === "fallback").length;
  const unaddressable = perGalaxy.filter((r) => !r.addressable).length;
  return { total: list.length, explicit, fallback, unaddressable, allAddressable: unaddressable === 0, perGalaxy };
}
