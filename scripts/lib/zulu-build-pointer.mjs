// zulu-build-pointer.mjs -- ZULU-BUILDLOOP INCR 4 pure core (slot:zulu, 2026-06-15).
//
// The autonomous build loop's CONSUMER half. INCR 1-3 (queue core + cron driver +
// scheduled task) keep state/shared/zulu-build-loop-next.json continuously fresh with
// the next GATED build unit for the builder slot. This module decides, purely, whether
// to SURFACE that pointer to the chat that just submitted a prompt -- so the builder
// (bravo) sees its next unit on every prompt without anyone reading the pointer by hand.
//
// Pure + deterministic: no fs, no clock, no env. The hook wrapper
// (.claude/hooks/zulu-build-pointer-inject.mjs) owns IO + throttle + emit.
//
// SAFETY: read-only surfacing. It never builds, commits, or writes engine code -- it
// only renders an advisory "here is your next gated unit" block. The per-unit
// build+test+3-of-3 scrutiny stays with the builder chat (that gate caught a real P1
// this session; surfacing a pointer can never bypass it).
//
// ASCII-only (ascii-guard): uses "->" and "--", never unicode arrows/em-dashes/emoji.

/**
 * Render the advisory markdown block surfaced to the builder slot. Pure.
 * @param {object} directive - parsed zulu-build-loop-next.json
 * @returns {string}
 */
export function renderPointerBlock(directive) {
  const d = directive || {};
  const next = d.next || {};
  const builder = d.builder || "bravo";
  const pending = Array.isArray(d.pending) ? d.pending : [];
  const pendingIds = pending.map((c) => c && c.id).filter(Boolean).join(", ");
  const blocked = Array.isArray(d.blocked) ? d.blocked : [];
  const lines = [];
  lines.push(`## ZULU build queue -> you (${builder}): next GATED build = ${next.id} ${next.title || ""} (effort ${next.effort || "?"})`.trimEnd());
  lines.push("");
  // SECURITY NOTE: next.summary is LLM-generated (the INCR-2 driver Ollama-summarizes the
  // roadmap spec) and rendered into model context. The chain is trusted-INTERNAL (local
  // roadmap spec + local Ollama). It must STAY internal-only -- do NOT wire an untrusted/
  // customer-supplied unit description into next.summary. We still defensively collapse all
  // whitespace (so a multi-line summary cannot break the "> " blockquote framing -- only the
  // first line would otherwise be quoted), then cap length.
  if (next.summary) {
    const safeSummary = String(next.summary).replace(/\s+/g, " ").trim().slice(0, 600);
    if (safeSummary) lines.push(`> ${safeSummary}`);
  }
  lines.push(`- pending (${typeof d.pendingCount === "number" ? d.pendingCount : pending.length}): ${pendingIds || "(none)"}`);
  lines.push(`- shipped: ${typeof d.doneCount === "number" ? d.doneCount : "?"} | gated/blocked: ${blocked.length ? blocked.join(", ") : "(none)"}`);
  if (d.note) lines.push(`- ${d.note}`);
  lines.push("- pointer (single-writer, refreshed by `PRISM Zulu Build Loop` cron): `state/shared/zulu-build-loop-next.json`");
  lines.push("- pick up: `/loop` consumes this -- build + real tests + per-file 2-arm scrutiny + 3-of-3 at Stop; NEVER auto-commit unreviewed.");
  lines.push("");
  lines.push("_Auto-surfaced by zulu-build-pointer-inject (INCR 4). Disable: PRISM_ZULU_BUILD_POINTER_INJECT_DISABLE=1._");
  return lines.join("\n");
}

/**
 * Decide, purely, whether to surface the build pointer to the current slot.
 * Surfaces ONLY to the directive's builder slot (default "bravo") and ONLY when a
 * non-drained next unit exists.
 * @param {{directive: object|null, currentSlot: string|null}} args
 * @returns {{inject: boolean, reason: string, throttleKey?: string, text?: string}}
 */
export function shapePointerInjection({ directive, currentSlot } = {}) {
  if (!directive || typeof directive !== "object") return { inject: false, reason: "no-pointer" };
  const builder = directive.builder || "bravo";
  if (!currentSlot || currentSlot !== builder) return { inject: false, reason: "not-builder-slot" };
  const next = directive.next;
  if (directive.drained || !next || !next.id) return { inject: false, reason: "drained" };
  return {
    inject: true,
    reason: "pending",
    throttleKey: String(next.id),
    text: renderPointerBlock(directive),
  };
}
