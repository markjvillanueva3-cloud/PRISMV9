#!/usr/bin/env node
/**
 * slot-resolve-shared.mjs -- ONE canonical slot resolver for the precompaction,
 * compaction, and handoff paths (U-SLOT-RESOLVE-UNIFY, 2026-06-18, slot:alpha).
 *
 * Before this, three paths each reimplemented "which slot is this chat", and
 * two of them resolved PURELY by a lenient substring match in JSON-insertion
 * order:
 *   - precompact-handoff.resolveSlotPrefix          (insertion-order, exact-only)
 *   - precompact-auto-trigger.resolveSlotFromSlotsFile
 *       Its exact line `data.chatId === sessionId` NEVER fired: the stored
 *       chatId is `claude-<8hex>` while the harness sessionId is a full UUID, so
 *       it fell through to a lenient `sessionId.includes(<peer 8hex>)`. A peer's
 *       8hex appearing as a substring of THIS chat's UUID could resolve the
 *       PEER's slot -> read the wrong `token-budget-<slot>.json` -> wrong
 *       compaction-trigger decision.
 *   - self-compact.resolveSlot                      (exact-anywhere then lenient;
 *       its exact pass had the same claude-<8hex>-vs-full-UUID blind spot)
 *
 * This unifies them. Priority:
 *   1. explicit slot (caller/operator named it)
 *   2. EXACT chatId match in canonical SLOT_NAMES order -- tries the raw id AND
 *      the canonical `claude-<8hex>` DERIVED from a full UUID, so exact actually
 *      matches the stored form. EXACT always beats lenient (the 2026-06-14
 *      self-compact adversarial finding, generalized).
 *   3. lenient substring fallback (legacy) -- ONLY when no exact match anywhere.
 *
 * Pure + dependency-free (safe to import into the tier-T0 precompact hook).
 */

// Canonical 26-slot fleet -- inlined to keep this lean for the hot-path hook
// (no chat-slots.mjs import on every PreToolUse). DRIFT-GUARD: pinned against
// chat-slots.mjs SLOT_NAMES by slot-resolve-shared.test.mjs. Update BOTH on any
// fleet expansion (same convention slot-bind-enforce.mjs uses).
export const SLOT_NAMES = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "hotel", "india", "juliett", "kilo", "lima", "mike",
  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango",
  "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
];

/**
 * Derive the canonical stored chatId form (`claude-<8hex>`) from a harness
 * session id (a full UUID) or an already-canonical chatId. Returns null when
 * there is nothing usable.
 * @param {string|null|undefined} sessionId
 * @returns {string|null}
 */
export function canonicalChatId(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return null;
  const short = sessionId.replace(/^claude-/, "").slice(0, 8);
  return short ? `claude-${short}` : null;
}

/**
 * Resolve { slot, entry } for a chat from a parsed chat-slots doc.
 *
 * @param {{slots?:Object}|null} slotsDoc  parsed chat-slots.json
 * @param {{slot?:string|null, sessionId?:string|null, chatId?:string|null}} [opts]
 * @returns {{slot:string, entry:object}|null}
 */
export function resolveSlotShared(slotsDoc, { slot = null, sessionId = null, chatId = null } = {}) {
  const slots = (slotsDoc && slotsDoc.slots) || {};

  // 1. Explicit slot wins (operator/caller named it directly).
  if (slot && slots[slot]) return { slot, entry: slots[slot] };

  // Iterate canonical SLOT_NAMES that are present FIRST (deterministic
  // production order, matching findSlotForChat), then any non-canonical keys
  // (e.g. a hermetic test slot, or a hypothetical legacy/migration entry) so we
  // never miss a slot the doc actually carries -- the old resolvers iterated
  // Object.entries(slots) (all keys), and dropping that silently mis-resolved
  // non-canonical entries.
  const order = [
    ...SLOT_NAMES.filter((n) => slots[n]),
    ...Object.keys(slots).filter((k) => slots[k] && !SLOT_NAMES.includes(k)),
  ];

  // 2. EXACT chatId match. Build the set of canonical id forms to try,
  //    highest-confidence first, so exact actually matches the stored
  //    `claude-<8hex>` even when given a full-UUID sessionId.
  const exactIds = [];
  if (chatId) exactIds.push(chatId);
  if (sessionId) {
    exactIds.push(sessionId);                 // caller may pass a chatId here
    const canon = canonicalChatId(sessionId); // full-UUID -> claude-<8hex>
    if (canon && !exactIds.includes(canon)) exactIds.push(canon);
  }
  for (const id of exactIds) {
    for (const name of order) {
      const data = slots[name];
      if (data && data.chatId && data.chatId === id) return { slot: name, entry: data };
    }
  }

  // 3. Lenient substring fallback (legacy) -- ONLY when no exact match anywhere.
  //    Kept for back-compat with odd id shapes; exact (step 2) is preferred so a
  //    peer's 8hex appearing inside this chat's UUID can no longer win.
  if (sessionId) {
    for (const name of order) {
      const data = slots[name];
      if (!data || !data.chatId) continue;
      const bare = data.chatId.replace(/^claude-/, "");
      if (bare && String(sessionId).includes(bare)) return { slot: name, entry: data };
    }
  }

  return null;
}
