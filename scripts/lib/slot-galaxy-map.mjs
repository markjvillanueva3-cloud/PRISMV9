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
