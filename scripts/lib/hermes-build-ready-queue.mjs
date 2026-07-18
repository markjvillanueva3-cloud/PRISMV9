// hermes-build-ready-queue.mjs -- HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-CONSUME pure core (slot:zulu).
//
// The "what to surface" core for the build-ready-queue CONSUMER -- the R15-WIRE follow-up that
// routes each VERIFIED unit in knowledge/hermes-outputs/units/work/build-ready-queue.json to the
// slot that should pick it up, so the draft -> verify -> build-ready -> PICKUP pipeline runs with
// no down time. Sibling of the zulu-build-loop consumer, but MULTI-target (17 units fan out to
// many slots at once) where zulu-build-pointer is SINGLE-target -- hence a separate clone, not a
// generalization (R7: code that serves both contracts is the worst code).
//
// Pure + deterministic: NO fs, NO clock, NO env. The driver shell
// (scripts/hermes-build-ready-loop.mjs) owns all IO; the hook owns emit/throttle.
//
// BOUNDARY (hard invariant): this only ROUTES + LABELS. It never builds, commits, dequeues, or
// writes the queue/claims. The keyword->slot table is an ADVISORY lead hint layered on the fleet
// route (multi-domain fleet policy: any slot may claim an un-owned unit) -- never an exclusive lock.
// Actual pickup still flows slot -> /loop -> slot-task-claim -> per-unit build+test+3-of-3.
//
// ASCII-only (ascii-guard): uses "->" and "--", never unicode arrows/em-dashes.

/**
 * Ordered keyword -> lead-slot table (first-match-wins, word-boundary matched). This is an
 * advisory "natural specialist" hint for an UN-OWNED unit, never an assignment.
 *
 * ORDER NOTE (corrects the design's own section-4 trace): `november` (ethics/compliance) is placed
 * BEFORE `india` (AI) so "Ethical AI Governance ..." routes to november, not india -- the design
 * text claimed 0023->november while listing india first, which would have matched "AI" first.
 * `juliett` stays ahead of november so "Data Governance / Knowledge Graph" (0018) keeps its
 * data-domain lead rather than being pulled to compliance.
 */
export const DOMAIN_SLOT_RULES = Object.freeze([
  { re: /\bpost[- ]?process/i, slot: "echo" },
  { re: /\bwire[- ]?edm\b|\bwedm\b/i, slot: "mike" },
  { re: /\blathe\b|\bturning\b/i, slot: "whiskey" },
  { re: /\bmill(ing)?\b/i, slot: "foxtrot" },
  { re: /\bcam\b|toolpath/i, slot: "kilo" },
  { re: /\bcad\b/i, slot: "delta" },
  { re: /speed[- ]?feed|\bsfc\b|tool wear|\bcutting\b|cryogenic|serrated chip|built-up edge|minimum chip|size effect/i, slot: "oscar" },
  { re: /quot|pricing|\bcost\b/i, slot: "charlie" },
  { re: /\berp\b|account|business|econom/i, slot: "hotel" },
  { re: /database|knowledge graph|data governance|ingest/i, slot: "juliett" },
  { re: /ethical|regulatory|compliance/i, slot: "november" },
  { re: /\bai\b|neural|\bnn\b|\bgnn\b|lora|\brag\b|training|reasoning|pattern learning|closed[- ]?loop|back-inference/i, slot: "india" },
]);

/** Accept either a {claims:{id:owner}} wrapper or a flat id->owner map; non-object -> {}. */
export function unwrapClaims(raw) {
  if (!raw || typeof raw !== "object") return {};
  const inner = raw.claims;
  return (inner && typeof inner === "object") ? inner : raw;
}

/** The natural lead slot for an un-owned unit by title keyword. First rule wins; null if none. */
export function inferLead(title /*, id */) {
  const t = String(title || "");
  if (!t) return null;
  for (const { re, slot } of DOMAIN_SLOT_RULES) if (re.test(t)) return slot;
  return null;
}

/**
 * Git-reality shipped set: a unit id is "shipped" iff a recent commit SUBJECT carries its
 * `UNIT-<id>` token. Drift-immune, no queue mutation (the producer never dequeues, so without
 * this a shipped unit would be nudged forever). Guards against 5-digit ids and bare-number /
 * commit-hash false matches via the `UNIT-` prefix + \b anchors.
 * @param {string} gitLogText output of `git log --oneline`
 * @returns {Set<string>}
 */
export function shippedIds(gitLogText) {
  const out = new Set();
  for (const m of String(gitLogText || "").matchAll(/\bUNIT-(\d{4})\b/g)) out.add(m[1]);
  return out;
}

/**
 * Explicit built-ledger completion set: a DETERMINISTIC second source for `shipped`, unioned with
 * `shippedIds` by the driver. `shippedIds` only fires when a commit SUBJECT carries the literal
 * `UNIT-<id>` token -- but the fleet convention is `[SCOPE]/U-<id>: title`, which never emits that
 * token, so a specialist who builds UNIT-0028 under their own U-id would NOT drain it (verified
 * 2026-07-04: 0/60 recent subjects carried a UNIT token -> the git signal was effectively dormant
 * and the queue could re-surface built units forever -- a false "no down time"). The built-ledger
 * (state/shared/hermes-unit-plan-built-ledger.jsonl, one JSON object per line, written by the
 * `mark-unit-built` CLI / post-build hook) closes that gap: any `{ "id": "0028", ... }` line marks
 * 0028 done regardless of commit-subject convention. Pure -- the driver owns the file read.
 * Malformed / non-4-digit / non-object lines are skipped (fail-soft, never throws).
 * @param {string} ledgerText raw JSONL contents of the built-ledger
 * @returns {Set<string>} the 4-digit ids marked built
 */
export function builtIdsFromLedger(ledgerText) {
  const out = new Set();
  for (const line of String(ledgerText || "").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let rec;
    try { rec = JSON.parse(s); } catch { continue; } // skip a torn / non-JSON line
    if (!rec || typeof rec !== "object") continue;
    const id = rec.id == null ? "" : String(rec.id).trim();
    if (/^\d{4}$/.test(id)) out.add(id); // enforce the 4-digit unit-id shape (no bare/5-digit ids)
  }
  return out;
}

// ownership precedence for a slot's `next`: owned before suggested.
const OWNERSHIP_RANK = { owned: 0, suggested: 1 };
const roiThenId = (a, b) => (b.roi - a.roi) || a.id.localeCompare(b.id);

/**
 * Route the VERIFIED queue into per-slot + fleet + owned + done buckets. Pure.
 * Precedence per unit: shipped -> done | claimed -> owned (exclusive to owner) | else inferLead ->
 * suggested-to-lead + fleet | no lead -> fleet only.
 * @param {{queue:object|null, claims?:object, shipped?:Set<string>, nowIso?:string, queuePath?:string}} args
 * @returns {object} the directive written to hermes-build-ready-next.json
 */
export function routeQueue({ queue, claims = {}, shipped = new Set(), nowIso = "", queuePath = "" } = {}) {
  const rawUnits = (queue && Array.isArray(queue.units)) ? queue.units : [];
  // dedup by id (last-wins, matching the producer's id-keyed upsert intent)
  const byId = new Map();
  for (const u of rawUnits) if (u && u.id != null) byId.set(String(u.id), u);

  const done = [], owned = [], fleet = [];
  const perSlotUnits = {}; // slot -> unit[]
  const pushSlot = (slot, unit) => { (perSlotUnits[slot] || (perSlotUnits[slot] = [])).push(unit); };

  for (const u of byId.values()) {
    const id = String(u.id);
    const base = {
      id,
      title: String(u.title || `UNIT-${id}`).replace(/\s+/g, " ").trim(),
      roi: Number(u.roi) || 0,
      warningCount: Number(u.warningCount) || 0,
      verifiedAt: u.verifiedAt || null,
    };
    if (shipped.has(id)) { done.push({ ...base, reason: "shipped" }); continue; }
    const owner = claims[id];
    if (owner) {
      const entry = { ...base, ownership: "owned", owner };
      owned.push(entry);
      pushSlot(owner, entry);
      continue; // exclusive to the owner -- never surfaced to other slots
    }
    const lead = inferLead(base.title, id);
    if (lead) {
      pushSlot(lead, { ...base, ownership: "suggested", suggestedLead: lead });
      fleet.push({ ...base, ownership: "unowned", suggestedLead: lead });
    } else {
      fleet.push({ ...base, ownership: "unowned", suggestedLead: null });
    }
  }

  fleet.sort(roiThenId);
  owned.sort(roiThenId);
  done.sort(roiThenId);

  const perSlot = {};
  for (const [slot, units] of Object.entries(perSlotUnits)) {
    const sorted = units.slice().sort((a, b) =>
      ((OWNERSHIP_RANK[a.ownership] ?? 9) - (OWNERSHIP_RANK[b.ownership] ?? 9)) || roiThenId(a, b));
    perSlot[slot] = { next: sorted[0] || null, count: sorted.length, units: sorted };
  }

  const totalReady = byId.size - done.length;
  return {
    schemaVersion: "1.0.0",
    at: nowIso,
    source: "hermes-build-ready-loop",
    queueUpdatedAt: (queue && queue.updatedAt) || null,
    queuePath,
    totalReady,
    perSlot,
    fleet,
    owned,
    done,
    note: `${totalReady} build-ready unit(s). Owned -> claim owner (exclusive); un-owned -> a suggested lead + the fleet (any slot may claim). NEVER auto-build -- per-unit 3-of-3 stays with the picking slot.`,
  };
}
