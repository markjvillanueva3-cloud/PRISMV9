// hermes-build-ready-pointer.mjs -- HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-CONSUME pure core (slot:zulu).
//
// The "how to surface" core for the build-ready-queue CONSUMER. Given the routed directive
// (from hermes-build-ready-queue.routeQueue), it decides -- purely -- what to inject into a slot's
// prompt, renders the standalone dashboard, and decides which throttled chat-bus advisories to
// post. Sibling of scripts/lib/zulu-build-pointer.mjs, but MULTI-slot (per-slot narrowcast) and
// with a change+cooldown-gated advisory decision the single-target zulu pointer does not need.
//
// Pure + deterministic: NO fs, NO clock (nowMs injected), NO env. The driver
// (scripts/hermes-build-ready-loop.mjs) owns IO; the hook owns emit/throttle.
//
// BOUNDARY: read-only surfacing. Every rendered block states "NEVER auto-build -- per-unit 3-of-3
// stays with the picking slot." Surfacing can never bypass that gate.
//
// ASCII-only (ascii-guard): "->" and "--" only, never unicode arrows/em-dashes.

const POINTER_REL = "state/shared/hermes-build-ready-next.json";

/**
 * Map a data string to pure ASCII so rendered context + the dashboard stay ASCII even when a unit
 * TITLE (from build-ready-queue.json, ultimately an LLM draft heading) carries an em-dash / smart
 * quote. Char-code based (NOT a unicode-literal regex) so THIS source file stays pure-ASCII too.
 */
export function asciiSafe(s) {
  let out = "";
  for (const ch of String(s == null ? "" : s)) {
    const c = ch.charCodeAt(0);
    if (c <= 0x7f) out += ch;
    else if (c === 0x2014 || c === 0x2013) out += "--";   // em/en dash
    else if (c === 0x2018 || c === 0x2019) out += "'";     // smart single quotes
    else if (c === 0x201c || c === 0x201d) out += '"';     // smart double quotes
    // else: strip anything else non-ASCII
  }
  return out;
}

/**
 * Render the per-slot advisory block injected into a slot's prompt. Pure.
 * @param {object} slotEntry directive.perSlot[slot] = { next, count, units }
 * @param {string} slot
 * @param {{queueUpdatedAt?:string|null, at?:string}} meta
 */
export function renderSlotBlock(slotEntry, slot, meta = {}) {
  const e = slotEntry || {};
  const next = e.next || {};
  const units = Array.isArray(e.units) ? e.units : [];
  const others = units.filter((u) => u && u.id && u.id !== next.id).map((u) => u.id);
  const ownedWord = next.ownership === "owned" ? "OWNED (claimed by you)" : "suggested lead (un-owned -- any slot may claim)";
  const lines = [];
  lines.push(`## Build-ready -> you (${slot}): next = UNIT-${next.id} (roi ${Number(next.roi) || 0}) -- ${ownedWord}`);
  lines.push("");
  lines.push(`- ${asciiSafe(String(next.title || "").replace(/\s+/g, " ").trim()).slice(0, 200)}`);
  if (others.length) lines.push(`- also build-ready for you: ${others.map((id) => "UNIT-" + id).join(", ")} (${e.count} total)`);
  lines.push("- pick up: `/checkin-" + slot + " /loop` -> `slot-task-claim` claim -> build + real tests + per-file 2-arm scrutiny + 3-of-3 at Stop.");
  lines.push("- CLOSE THE LOOP when shipped: `node scripts/mark-unit-built.mjs " + next.id + " --by " + slot + "` (drains it -- the fleet's `U-<id>` commits carry no `UNIT-<id>` token, so this is the completion signal).");
  lines.push("- SAFETY: NEVER auto-build/commit from this nudge -- the per-unit 3-of-3 gate stays with you.");
  lines.push("- draft to verify+build: `knowledge/hermes-outputs/units/work/UNIT-" + next.id + "-draft.md` (UNREVIEWED seed).");
  lines.push("- pointer (single-writer, refreshed by `PRISM Unit Plan Build-Ready Surface` cron): `" + POINTER_REL + "`" +
    (meta.queueUpdatedAt ? ` (queue @ ${meta.queueUpdatedAt})` : ""));
  lines.push("");
  lines.push("_Auto-surfaced by hermes-build-ready-inject. Disable: PRISM_HERMES_BUILD_READY_INJECT_DISABLE=1._");
  return lines.join("\n");
}

/**
 * Decide, purely, whether to surface the build-ready pointer to the current slot.
 * Surfaces ONLY when that slot has a `next` build-ready unit. Narrowcast: every other slot no-ops.
 * @param {{directive:object|null, currentSlot:string|null}} args
 * @returns {{inject:boolean, reason:string, throttleKey?:string, text?:string}}
 */
export function shapeBuildReadyInjection({ directive, currentSlot } = {}) {
  if (!directive || typeof directive !== "object") return { inject: false, reason: "no-pointer" };
  const slot = currentSlot ? String(currentSlot).toLowerCase() : null;
  if (!slot) return { inject: false, reason: "no-slot" };
  const perSlot = directive.perSlot;
  const entry = perSlot && typeof perSlot === "object" ? perSlot[slot] : null;
  if (!entry || !entry.next || !entry.next.id) return { inject: false, reason: "no-unit-for-slot" };
  return {
    inject: true,
    reason: "unit",
    throttleKey: String(entry.next.id),
    text: renderSlotBlock(entry, slot, { queueUpdatedAt: directive.queueUpdatedAt, at: directive.at }),
  };
}

/** Render the standalone build-ready dashboard markdown. Pure. */
export function renderDashboard(directive) {
  const d = directive || {};
  const perSlot = d.perSlot && typeof d.perSlot === "object" ? d.perSlot : {};
  const fleet = Array.isArray(d.fleet) ? d.fleet : [];
  const owned = Array.isArray(d.owned) ? d.owned : [];
  const done = Array.isArray(d.done) ? d.done : [];
  const lines = [];
  lines.push("# Build-Ready Surface -- VERIFIED units awaiting specialist pickup");
  lines.push("");
  lines.push("> Single-writer, refreshed by the `PRISM Unit Plan Build-Ready Surface` cron from");
  lines.push("> `knowledge/hermes-outputs/units/work/build-ready-queue.json`. Read/route/advertise only --");
  lines.push("> NEVER auto-built. Pick up a unit via `/checkin-<slot> /loop` -> claim -> build + 3-of-3.");
  lines.push("");
  lines.push(`- total build-ready: **${Number(d.totalReady) || 0}**  |  owned: ${owned.length}  |  suppressed (shipped): ${done.length}`);
  lines.push(`- queue updated: ${d.queueUpdatedAt || "(unknown)"}  |  surfaced: ${d.at || "(unknown)"}`);
  lines.push("");
  lines.push("## Per-slot leads");
  lines.push("");
  const slots = Object.keys(perSlot).sort();
  if (!slots.length) {
    lines.push("_(none -- queue empty or all shipped)_");
  } else {
    lines.push("| slot | next | roi | ownership | also ready |");
    lines.push("|---|---|---:|---|---|");
    for (const slot of slots) {
      const e = perSlot[slot] || {};
      const n = e.next || {};
      const others = (Array.isArray(e.units) ? e.units : []).filter((u) => u && u.id !== n.id).map((u) => "UNIT-" + u.id);
      lines.push(`| ${slot} | UNIT-${n.id} | ${Number(n.roi) || 0} | ${n.ownership || "?"} | ${others.join(", ") || "-"} |`);
    }
  }
  lines.push("");
  lines.push(`## Fleet (un-owned, any slot may claim) -- ${fleet.length}`);
  lines.push("");
  if (!fleet.length) {
    lines.push("_(none)_");
  } else {
    for (const u of fleet) {
      lines.push(`- UNIT-${u.id} (roi ${Number(u.roi) || 0})${u.suggestedLead ? ` -- suggested lead: ${u.suggestedLead}` : " -- no lead"}: ${asciiSafe(String(u.title || "").replace(/\s+/g, " ").trim()).slice(0, 120)}`);
    }
  }
  if (done.length) {
    lines.push("");
    lines.push(`## Recently shipped (suppressed, git-grounded) -- ${done.length}`);
    lines.push("");
    lines.push(done.map((u) => "UNIT-" + u.id).join(", "));
  }
  lines.push("");
  lines.push("_Generated by hermes-build-ready-loop. Disable cron: PRISM_HBR_DISABLE=1._");
  return lines.join("\n");
}

/**
 * Decide which throttled chat-bus advisories to post + the next advisory ledger. Pure (nowMs +
 * cooldownMs injected). Posts a slot's next-unit advisory when the unit CHANGED (change-gate,
 * overrides cooldown) OR the cooldown has elapsed since the last post. Fail-soft: a corrupt/missing
 * ledger is treated as empty (all post). Never posts for a slot with no next unit.
 * @param {{directive:object, ledger:object|null, nowMs:number, cooldownMs:number}} args
 * @returns {{posts:Array<{slot,unitId,roi,message}>, nextLedger:object}}
 */
export function decideAdvisories({ directive, ledger, nowMs, cooldownMs } = {}) {
  const prev = (ledger && typeof ledger === "object" && ledger.slots && typeof ledger.slots === "object") ? ledger.slots : {};
  const perSlot = (directive && directive.perSlot && typeof directive.perSlot === "object") ? directive.perSlot : {};
  const nextSlots = { ...prev };
  const posts = [];
  for (const slot of Object.keys(perSlot)) {
    const next = perSlot[slot] && perSlot[slot].next;
    if (!next || !next.id) continue;
    const unitId = String(next.id);
    const p = prev[slot];
    const changed = !p || String(p.lastUnit) !== unitId;
    const cooled = !p || !Number.isFinite(p.lastAdvisoryAt) || (nowMs - p.lastAdvisoryAt) >= cooldownMs;
    if (changed || cooled) {
      const roi = Number(next.roi) || 0;
      posts.push({
        slot, unitId, roi,
        message: `Build-ready: UNIT-${unitId} (roi ${roi}) is your ${next.ownership === "owned" ? "OWNED" : "suggested-lead"} build-ready unit. Pick up via /checkin-${slot} /loop -> slot-task-claim. When shipped, CLOSE THE LOOP: node scripts/mark-unit-built.mjs ${unitId} --by ${slot} (drains it). NEVER auto-build -- per-unit 3-of-3 stays with you. Pointer: ${POINTER_REL}`,
      });
      nextSlots[slot] = { lastUnit: unitId, lastAdvisoryAt: nowMs };
    }
  }
  return { posts, nextLedger: { schemaVersion: "1.0.0", updatedAt: nowMs, slots: nextSlots } };
}
