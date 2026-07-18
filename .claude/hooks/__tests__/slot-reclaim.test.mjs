/**
 * slot-reclaim.test.mjs — SLOT-RECLAIM (2026-05-19)
 * ==================================================
 * Regression tests for the post-/compact slot force-reclaim fix spanning two
 * SessionStart hooks:
 *
 *   - session-start-terminal-pin.mjs — shouldForceReclaim() decides whether a
 *       post-/compact|/clear SessionStart force-takes its PS-window-pinned
 *       slot (advisory claim → deterministic --force --confirmRecent claim).
 *   - session-start-auto-resume.mjs — buildSlotWrapperDirective() emits the
 *       `/checkin-<nato>` NEXT-ACTION directive. That hyphenated wrapper form
 *       triggers slot-bind-enforce's deterministic force-claim; the generic
 *       `/checkin --topic <slot>-<topic>` it replaced does NOT force-take a
 *       named slot, so a peer that drifted into this terminal's slot during
 *       the /compact release window would otherwise keep it.
 *
 * User-reported 2026-05-19 (slot delta): "fix the post compaction so there's a
 * hook forcing you to check back into your chat slot you were on previously per
 * powershell terminal ... the chat that compacts needs to check what the
 * previous chat slot was for that specific powershell terminal then utilize
 * /startup-nato or /checkin-nato".
 *
 * Also guards the 26-slot fleet realign: chat-slots.mjs SLOT_NAMES is the full
 * NATO alphabet (alpha..zulu); both hooks' hardcoded copies had drifted to 13
 * (alpha..mike), silently failing every november..zulu membership check.
 *
 * Run: node --test H:/prism/.claude/hooks/__tests__/slot-reclaim.test.mjs
 *
 * @milestone SLOT-RECLAIM
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { shouldForceReclaim, peerBlocksForceReclaim } from "../session-start-terminal-pin.mjs";
import { buildSlotWrapperDirective, SLOT_NAMES } from "../session-start-auto-resume.mjs";
import { SLOT_NAMES as CANONICAL_SLOT_NAMES } from "../../helpers/chat-slots.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TERMINAL_PIN_SRC = fs.readFileSync(
  path.join(HERE, "..", "session-start-terminal-pin.mjs"), "utf-8");
const AUTO_RESUME_SRC = fs.readFileSync(
  path.join(HERE, "..", "session-start-auto-resume.mjs"), "utf-8");

// The canonical 26-slot NATO fleet — MUST mirror chat-slots.mjs SLOT_NAMES.
const FLEET_26 = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf", "hotel", "india", "juliett", "kilo", "lima", "mike", "november",
  "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor",
  "whiskey", "xray", "yankee", "zulu"];

// ─── shouldForceReclaim (terminal-pin) ───────────────────────────────────────

describe("shouldForceReclaim — post-/compact force-reclaim decision", () => {
  test("compact event + a pinned slot → TRUE (force-reclaim)", () => {
    assert.equal(shouldForceReclaim("compact", "delta", {}), true);
  });

  test("clear event + a pinned slot → TRUE (force-reclaim)", () => {
    assert.equal(shouldForceReclaim("clear", "hotel", {}), true);
  });

  test("startup event + a pinned slot → FALSE (advisory — window may be racing for a fresh slot)", () => {
    assert.equal(shouldForceReclaim("startup", "delta", {}), false);
  });

  test("resume event + a pinned slot → FALSE (advisory)", () => {
    assert.equal(shouldForceReclaim("resume", "delta", {}), false);
  });

  test("empty / unknown source → FALSE", () => {
    assert.equal(shouldForceReclaim("", "delta", {}), false);
    assert.equal(shouldForceReclaim("somethingelse", "delta", {}), false);
  });

  test("compact event but NO pinned slot (null) → FALSE — nothing authoritative to reclaim", () => {
    assert.equal(shouldForceReclaim("compact", null, {}), false);
  });

  test("compact event + empty-string pinned slot → FALSE", () => {
    assert.equal(shouldForceReclaim("compact", "", {}), false);
  });

  test("compact event + undefined pinned slot → FALSE", () => {
    assert.equal(shouldForceReclaim("compact", undefined, {}), false);
  });

  test("non-string pinned slot (number) → FALSE — typeof guard", () => {
    assert.equal(shouldForceReclaim("compact", 5, {}), false);
  });

  test("source is case-insensitive — COMPACT / Compact / CLEAR all reclaim", () => {
    assert.equal(shouldForceReclaim("COMPACT", "delta", {}), true);
    assert.equal(shouldForceReclaim("Compact", "delta", {}), true);
    assert.equal(shouldForceReclaim("CLEAR", "delta", {}), true);
  });

  test("kill switch PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM=1 → FALSE even on compact+slot", () => {
    assert.equal(
      shouldForceReclaim("compact", "delta", { PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM: "1" }),
      false,
    );
  });

  test("kill switch honors ONLY the exact '1' value (not '0' / 'true' / empty)", () => {
    assert.equal(shouldForceReclaim("compact", "delta", { PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM: "0" }), true);
    assert.equal(shouldForceReclaim("compact", "delta", { PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM: "true" }), true);
    assert.equal(shouldForceReclaim("compact", "delta", { PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM: "" }), true);
  });

  test("null / undefined source argument does not throw → FALSE", () => {
    assert.equal(shouldForceReclaim(null, "delta", {}), false);
    assert.equal(shouldForceReclaim(undefined, "delta", {}), false);
  });

  test("a non-canonical slot string still returns TRUE on compact — canonicity is enforced downstream", () => {
    // shouldForceReclaim is a coarse gate: "is there a slot to reclaim?".
    // It deliberately does NOT validate the slot name — chat-slots.mjs
    // claimSlot() validates SLOT_NAMES.includes(preferSlot) and falls back to
    // the default walk when it does not match, so a corrupt pin can never
    // force-take a wrong slot. This test pins WHERE validation lives.
    assert.equal(shouldForceReclaim("compact", "not-a-real-slot", {}), true);
  });

  test("force-reclaim fires for every slot in the 26-slot fleet (november..zulu included)", () => {
    for (const slot of FLEET_26) {
      assert.equal(shouldForceReclaim("compact", slot, {}), true,
        `${slot} must force-reclaim on a compact event`);
    }
  });
});

// ─── peerBlocksForceReclaim (terminal-pin) — the P1 safety gate ───────────────

/** Build a chat-slots.json-shaped state with one slot occupied. */
function slotsWith(slot, holder) {
  return { slots: { [slot]: holder } };
}
/** ISO timestamp `ms` milliseconds in the past. */
function agoIso(ms) { return new Date(Date.now() - ms).toISOString(); }

describe("peerBlocksForceReclaim — never force-evict a healthy operator peer", () => {
  test("free slot → FALSE (nothing to evict — force may proceed)", () => {
    assert.equal(peerBlocksForceReclaim("delta", "me", { slots: {} }), false);
  });

  test("slot held by THIS chat → FALSE (already mine, no eviction)", () => {
    const st = slotsWith("delta", { chatId: "me", activity: "checkin", lastHeartbeat: agoIso(0) });
    assert.equal(peerBlocksForceReclaim("delta", "me", st), false);
  });

  test("slot held by a CRASHED peer (heartbeat > 10min) → FALSE (reclaimable)", () => {
    const st = slotsWith("delta", { chatId: "peer", activity: "checkin", lastHeartbeat: agoIso(20 * 60_000) });
    assert.equal(peerBlocksForceReclaim("delta", "me", st), false);
  });

  test("slot held by a LIVE auto-pinned peer → FALSE (drifted in — reclaimable)", () => {
    for (const act of ["session-start-auto-pin", "session-start-auto-resolve", "session-start-force-reclaim"]) {
      const st = slotsWith("delta", { chatId: "peer", activity: act, lastHeartbeat: agoIso(0) });
      assert.equal(peerBlocksForceReclaim("delta", "me", st), false, `${act} must not block`);
    }
  });

  test("slot held by a LIVE operator-bound peer (/checkin) → TRUE (BLOCKS force-reclaim)", () => {
    const st = slotsWith("delta", { chatId: "peer", activity: "checkin", lastHeartbeat: agoIso(0) });
    assert.equal(peerBlocksForceReclaim("delta", "me", st), true);
  });

  test("slot held by a LIVE operator-bound peer (/startup) → TRUE (BLOCKS)", () => {
    const st = slotsWith("delta", { chatId: "peer", activity: "startup", lastHeartbeat: agoIso(60_000) });
    assert.equal(peerBlocksForceReclaim("delta", "me", st), true);
  });

  test("a STALE-but-not-crashed operator peer (5min heartbeat) → TRUE (still BLOCKS)", () => {
    // 5min < CRASH_TTL 10min → not crashed → an operator peer that may just be
    // mid-thought must NOT be force-evicted.
    const st = slotsWith("delta", { chatId: "peer", activity: "checkin", lastHeartbeat: agoIso(5 * 60_000) });
    assert.equal(peerBlocksForceReclaim("delta", "me", st), true);
  });

  test("a crashed peer is reclaimable regardless of operator activity (crashed checked first)", () => {
    const st = slotsWith("delta", { chatId: "peer", activity: "checkin", lastHeartbeat: agoIso(30 * 60_000) });
    assert.equal(peerBlocksForceReclaim("delta", "me", st), false);
  });

  test("null / empty slots state → FALSE (no peers to evict)", () => {
    assert.equal(peerBlocksForceReclaim("delta", "me", null), false);
    assert.equal(peerBlocksForceReclaim("delta", "me", {}), false);
    assert.equal(peerBlocksForceReclaim("delta", "me", { slots: {} }), false);
  });

  test("fail-SAFE — a present-but-malformed slot entry → TRUE (block; holder unknowable)", () => {
    assert.equal(peerBlocksForceReclaim("delta", "me", { slots: { delta: 42 } }), true);
    assert.equal(peerBlocksForceReclaim("delta", "me", { slots: { delta: { activity: "checkin" } } }), true,
      "an object with no chatId is corrupt — block the force-take");
  });

  test("unparseable heartbeat on an operator peer → TRUE (treated as live, blocks)", () => {
    const st = slotsWith("delta", { chatId: "peer", activity: "checkin", lastHeartbeat: "not-a-date" });
    assert.equal(peerBlocksForceReclaim("delta", "me", st), true);
  });
});

// ─── buildSlotWrapperDirective (auto-resume) ─────────────────────────────────

describe("buildSlotWrapperDirective — /checkin-<nato> NEXT-ACTION directive", () => {
  test("happy: delta + compact → emits the /checkin-delta wrapper directive", () => {
    const out = buildSlotWrapperDirective("delta", "compact");
    assert.ok(out, "non-empty");
    assert.match(out, /NEXT ACTION/);
    assert.match(out, /\/checkin-delta/);
    assert.match(out, /\/startup-delta/);
    assert.match(out, /force-re-claims/);
    assert.match(out, /slot-bind-enforce/);
  });

  test("the directive explains WHY a bare /checkin is insufficient (intent)", () => {
    // R9: the directive must teach the model that a generic /checkin does not
    // force-take a named slot — that reasoning is the whole point of the fix.
    const out = buildSlotWrapperDirective("hotel", "compact");
    assert.match(out, /does NOT force-take/);
  });

  test("clear source → wording references /clear, never /compact", () => {
    const out = buildSlotWrapperDirective("delta", "clear");
    assert.match(out, /\/clear window/);
    assert.equal(/\/compact window/.test(out), false, "must not mention /compact on a clear event");
  });

  test("unknown source defaults the wording to 'compact'", () => {
    const out = buildSlotWrapperDirective("delta", "weird");
    assert.match(out, /\/compact window/);
  });

  test("returns '' for a non-canonical slot — hyphenated 'x-ray' (canonical is 'xray')", () => {
    assert.equal(buildSlotWrapperDirective("x-ray", "compact"), "");
  });

  test("returns '' for a non-canonical slot — 'kilo7'", () => {
    assert.equal(buildSlotWrapperDirective("kilo7", "compact"), "");
  });

  test("returns '' for empty / null / undefined slot", () => {
    assert.equal(buildSlotWrapperDirective("", "compact"), "");
    assert.equal(buildSlotWrapperDirective(null, "compact"), "");
    assert.equal(buildSlotWrapperDirective(undefined, "compact"), "");
  });

  test("emits a correct wrapper directive for every slot in the 26-slot fleet", () => {
    for (const slot of FLEET_26) {
      const out = buildSlotWrapperDirective(slot, "compact");
      assert.ok(out, `${slot} must produce a directive`);
      assert.match(out, new RegExp(`/checkin-${slot}\\b`),
        `${slot} directive must name /checkin-${slot}`);
    }
  });

  test("regression guard — november..zulu slots must NOT return '' (26-slot realign)", () => {
    // If SLOT_NAMES drifts back to 13 (alpha..mike), these return "" and the
    // post-/compact slot-recovery directive silently vanishes for half the
    // fleet — the exact drift this fix corrected.
    for (const slot of ["november", "papa", "tango", "xray", "zulu"]) {
      assert.notEqual(buildSlotWrapperDirective(slot, "compact"), "",
        `${slot} must yield a directive — SLOT_NAMES must be the full 26-slot fleet`);
    }
  });
});

// ─── SLOT_NAMES 26-slot realign (drift guard) ────────────────────────────────

describe("SLOT_NAMES 26-slot realign — drift guard", () => {
  test("auto-resume SLOT_NAMES export has exactly 26 slots", () => {
    assert.equal(SLOT_NAMES.size, 26);
  });

  test("auto-resume SLOT_NAMES contains the full NATO alphabet alpha..zulu", () => {
    for (const slot of FLEET_26) {
      assert.equal(SLOT_NAMES.has(slot), true, `SLOT_NAMES missing ${slot}`);
    }
  });

  test("terminal-pin VALID_SLOTS literal carries all 26 NATO slots (source check)", () => {
    // terminal-pin's VALID_SLOTS Set is module-private; assert via source so a
    // revert back to the 13-slot copy fails loud here. The quoted form
    // `"<slot>"` appears only in the array literal, not in the prose comments.
    for (const slot of FLEET_26) {
      assert.match(TERMINAL_PIN_SRC, new RegExp(`"${slot}"`),
        `terminal-pin VALID_SLOTS missing "${slot}"`);
    }
  });

  test("DRIFT GUARD — FLEET_26 oracle + auto-resume SLOT_NAMES match canonical chat-slots.mjs", () => {
    // The recurring drift class (10→13→26): chat-slots.mjs SLOT_NAMES is the
    // single source of truth; the two hooks hardcode copies for latency. If
    // chat-slots grows and a copy is not mirrored in the same commit, this
    // fails loud. (terminal-pin's copy is checked against FLEET_26 by the
    // source-check test above; FLEET_26 is pinned to canonical here, so the
    // chain covers all three literals.)
    const canonical = [...CANONICAL_SLOT_NAMES].sort();
    assert.deepEqual([...FLEET_26].sort(), canonical,
      "this test's FLEET_26 oracle drifted from chat-slots.mjs SLOT_NAMES");
    assert.deepEqual([...SLOT_NAMES].sort(), canonical,
      "auto-resume SLOT_NAMES drifted from canonical chat-slots.mjs SLOT_NAMES");
  });
});

// ─── wiring — the SLOT-RECLAIM logic is actually invoked, not just defined ────

describe("wiring — SLOT-RECLAIM is invoked end-to-end, not orphaned", () => {
  test("terminal-pin: claimSlotForWindow accepts forceReclaim + threads --force/--confirmRecent", () => {
    assert.match(TERMINAL_PIN_SRC,
      /function claimSlotForWindow\(chatId, windowId, preferSlot, forceReclaim/);
    assert.match(TERMINAL_PIN_SRC, /"--force", "true", "--confirmRecent", "true"/);
  });

  test("terminal-pin: main() gates forceReclaim through shouldForceReclaim AND peerBlocksForceReclaim, then passes it to the claim", () => {
    assert.match(TERMINAL_PIN_SRC, /let forceReclaim = shouldForceReclaim\(source, priorSlot\)/);
    assert.match(TERMINAL_PIN_SRC, /peerBlocksForceReclaim\(priorSlot, chatId, slotsState\)/);
    assert.match(TERMINAL_PIN_SRC, /claimSlotForWindow\(chatId, windowId, priorSlot, forceReclaim\)/);
  });

  test("terminal-pin: a force-takeover surfaces a loud confirmation (R12 — not silent)", () => {
    assert.match(TERMINAL_PIN_SRC, /force-reclaimed for this PowerShell terminal/);
    assert.match(TERMINAL_PIN_SRC, /reason === "force-takeover"/);
  });

  test("terminal-pin: __isMain guard present so main() runs only when invoked as a script", () => {
    assert.match(TERMINAL_PIN_SRC, /if \(__isMain\) main\(\)/);
  });

  test("auto-resume: main() dynamic-imports ps-window-pin and uses buildSlotWrapperDirective", () => {
    assert.match(AUTO_RESUME_SRC, /await import\("\.\.\/helpers\/ps-window-pin\.mjs"\)/);
    assert.match(AUTO_RESUME_SRC, /buildSlotWrapperDirective\(slotForDirective, source\)/);
  });

  test("auto-resume: the /checkin-<nato> directive falls back to the handoff-derived slot when no PS-pin", () => {
    // The ps-window-pin is frequently empty; without the handoff fallback the
    // wrapper directive would almost never fire.
    assert.match(AUTO_RESUME_SRC, /const parsed = parseSlotAndTopic\(handoff\.content\)/);
    assert.match(AUTO_RESUME_SRC, /psPinnedSlot\s*\n?\s*\|\|\s*\(SLOT_NAMES\.has\(parsed\.slot\)/);
  });

  test("auto-resume: the generic /checkin --topic stays as the last-resort no-slot fallback", () => {
    // buildCheckinDirective(parsed) fires only when neither the ps-window-pin
    // nor the handoff frontmatter yields a canonical slot.
    assert.match(AUTO_RESUME_SRC, /buildCheckinDirective\(parsed\)/);
  });

  test("auto-resume: __isMain guard present (prevents readFileSync(0) hang on test import)", () => {
    assert.match(AUTO_RESUME_SRC, /if \(__isMain\) main\(\)/);
  });
});
