// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA05 — backend-dev high-ROI priority payload
// for the SendKeys post-compact /checkin-<slot> directive.
//
// Standing doctrine [[feedback_prioritize_devtools_backend]] +
// [[feedback_high_roi_backend_first_slot_queue]]: dev-tooling + backend-infra
// units are P0 ahead of app/revenue/CAD-CAM/docs. On a post-compact pickup,
// zebra appends a priority-filter directive to the SendKeys text so the
// chat's next /pick-unit is biased toward U-WIRE*/U-BRIDGE*/U-HOOK*/
// backend-dev FIRST.
//
// Pure functions only. No I/O. Caller (U-ZEBRA02 main loop) assembles the
// final SendKeys text via buildCheckinPayload.

// Canonical priority prefixes (matches priority-queue.mjs lane filters).
// Frozen so the table can't be mutated mid-flight by a peer.
export const BACKEND_DEV_PREFIXES = Object.freeze([
  "U-WIRE",     // wiring units (engine→dispatcher)
  "U-BRIDGE",   // cross-engine bridges
  "U-HOOK",     // hook tier / wiring
  "U-INFRA",    // infrastructure
  "U-DEVTOOL",  // dev tooling
  "U-CK",       // command-kernel
]);

// Pure: does a unit_id start with a backend-dev prefix?
export function isBackendDevUnit(unitId) {
  if (!unitId || typeof unitId !== "string") return false;
  const u = unitId.trim();
  if (u.length === 0) return false;
  return BACKEND_DEV_PREFIXES.some((p) => u.startsWith(p));
}

// Pure: order an array of unit ids — backend-dev first, others after,
// stable within each group. Non-array → empty array.
export function sortBackendDevFirst(unitIds) {
  if (!Array.isArray(unitIds)) return [];
  const safe = unitIds.filter((u) => typeof u === "string" && u.length > 0);
  return [
    ...safe.filter((u) => isBackendDevUnit(u)),
    ...safe.filter((u) => !isBackendDevUnit(u)),
  ];
}

// Pure: assemble the SendKeys payload text for a post-compact /checkin-<slot>.
// Format: "/checkin-<slot> priority filter U-WIRE*|U-BRIDGE*|U-HOOK*|backend-dev FIRST\n"
// The trailing newline is left to the SendKeys helper to append (CHO04
// already appends ENTER via VK_RETURN). This function returns the line WITHOUT
// the newline so it can be safely composed.
export function buildCheckinPayload(slot, opts = {}) {
  if (!slot || typeof slot !== "string") {
    return { ok: false, error: "missing-slot" };
  }
  const s = slot.trim();
  if (s.length === 0) return { ok: false, error: "empty-slot" };
  // Disallow slot strings with whitespace or control chars — these would
  // break the SendKeys line. Per CHO04 the helper sanitizes too, but we
  // fail loud here for clarity.
  if (/[\s\x00-\x1f]/.test(s)) return { ok: false, error: "slot-has-whitespace-or-control" };

  const extraHint = typeof opts.extraHint === "string" && opts.extraHint.length > 0
    ? ` ${opts.extraHint.trim()}`
    : "";
  const prefixStr = BACKEND_DEV_PREFIXES.map((p) => `${p}*`).join("|");
  const text = `/checkin-${s} priority filter ${prefixStr}|backend-dev FIRST${extraHint}`;
  return { ok: true, text };
}

// Pure: assemble a /compact-then-checkin payload (multi-line). Returns an
// array of lines (each will be SendKey'd separately by U-ZEBRA02 with the
// 5s stagger between them).
export function buildCompactThenCheckinPayload(slot, opts = {}) {
  const checkin = buildCheckinPayload(slot, opts);
  if (!checkin.ok) return checkin;
  return { ok: true, lines: ["/compact", checkin.text] };
}

// ZEBRA-ORCHESTRATOR-MS3 / U-ZPSN01 — synthesize a compact PSN-awareness hint
// from a slot's awareness fingerprint (the same fp the sweep already reads via
// awarenessLookupSlot). Returns a short bracketed metadata string the chat can
// parse but that DOES NOT break the slash command's free-text tail.
//
// Format: `[psn:domain=<d>,role=<r>,queue=<n>,tribal=<top-domain>]`
//   - All fields are OPTIONAL — only present fields are emitted, so a partial
//     fingerprint produces a partial hint and a fully-absent fingerprint
//     produces an empty string (caller treats empty same as no hint).
//   - All values are ASCII-only (printable, no whitespace/control) so the
//     SendKeys helper's safety predicate accepts them.
//   - Bracket-delimited so future expansions never collide with the priority-
//     filter glob text (`U-WIRE*|...`) that already lives in the line.
//
// Why a fingerprint hint instead of raw PSN engine/action lookup:
//   PSN (PRISMSelfAwarenessEngine) is a TypeScript engine living in mcp-server/;
//   the awareness fingerprint already projects PSN's recommendation surface
//   (domain affinity, tribal scoring, queue depth, viz neighborhood, success
//   rate) into a pure JSON shape that the orchestrator-sweep can read without
//   a TS build step. Adding a TS dependency to the .mjs sweep would force a
//   build-gate before every cron tick — unacceptable. The fingerprint IS the
//   PSN view, captured upstream.
//
// Safety properties:
//   - Pure function; no I/O.
//   - Empty string on any non-object input (R12: fail-soft, never throw).
//   - Domain/role/tribal sanitised: lowercased, regex-filtered to [a-z0-9+\-_]
//     (so a hostile fingerprint cannot inject shell/slash chars into the line).
//   - Queue length clamped to integer ≥0.
export function buildAwarenessHint(fp) {
  if (!fp || typeof fp !== "object") return "";
  const parts = [];

  const sanitize = (s) => {
    if (typeof s !== "string" || s.length === 0) return null;
    const cleaned = s.toLowerCase().replace(/[^a-z0-9+\-_]/g, "");
    return cleaned.length > 0 ? cleaned : null;
  };

  // domain — first entry from fp.domains
  if (Array.isArray(fp.domains) && fp.domains.length > 0) {
    const d = sanitize(fp.domains[0]);
    if (d) parts.push(`domain=${d}`);
  }

  // role — fp.hermesRole
  const r = sanitize(fp.hermesRole);
  if (r) parts.push(`role=${r}`);

  // queue — non-negative integer
  if (typeof fp.queueLength === "number" && Number.isFinite(fp.queueLength)) {
    const q = Math.max(0, Math.floor(fp.queueLength));
    parts.push(`queue=${q}`);
  }

  // tribal — highest-scoring entry from fp.tribalDomainScores
  if (fp.tribalDomainScores && typeof fp.tribalDomainScores === "object") {
    let topDom = null;
    let topScore = -Infinity;
    for (const [dom, score] of Object.entries(fp.tribalDomainScores)) {
      if (typeof score === "number" && score > topScore) {
        const cleaned = sanitize(dom);
        if (cleaned) { topDom = cleaned; topScore = score; }
      }
    }
    if (topDom !== null && topScore > 0) parts.push(`tribal=${topDom}`);
  }

  if (parts.length === 0) return "";
  return `[psn:${parts.join(",")}]`;
}
