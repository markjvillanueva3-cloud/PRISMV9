// SESSION-CONTINUITY-FIX/U-STALE-SLOT-CRON-ADVISORY (2026-06-18, slot:alpha)
// Tests for the stale slot-loop cron detector. Encodes the REAL "keep checking
// back into papa" bug (cron 1b150d99 /startup-papa created by 14b038a1 after it
// rebound to alpha) and the live 5-cron fleet as a no-false-positive regression.
//
// Run: node H:/prism/.claude/hooks/__tests__/stale-slot-cron-advisory.test.mjs
// (node:test auto-runs on exit; `node --test` runs 0 tests in this env.)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTargetSlot,
  actuatesSlotClaim,
  findStaleSlotCrons,
  renderAdvisory,
} from "../stale-slot-cron-advisory.mjs";

// ---- parseTargetSlot: HIGH confidence ----------------------------------------

test("parseTargetSlot: /startup-<slot> -> high confidence", () => {
  assert.deepEqual(parseTargetSlot("/startup-papa autonomous backend loop"), { slot: "papa", confidence: "high" });
});

test("parseTargetSlot: slot:<slot> attribution -> high confidence", () => {
  assert.deepEqual(parseTargetSlot("[AUTONOMOUS BUILD LOOP -- slot:alpha] Continue building."), { slot: "alpha", confidence: "high" });
});

test("parseTargetSlot: (slot:romeo) with paren+space -> high confidence", () => {
  assert.deepEqual(parseTargetSlot("Autonomous JM CAM tooling continuity (slot:romeo). Re-run audit."), { slot: "romeo", confidence: "high" });
});

test("parseTargetSlot: /startup wins over a bare mention of another slot", () => {
  // A prompt that actuates /startup-papa but also mentions 'alpha' in prose
  // must resolve to the ACTUATING slot (papa), not the prose mention.
  assert.deepEqual(parseTargetSlot("/startup-papa then hand back to alpha later"), { slot: "papa", confidence: "high" });
});

test("parseTargetSlot: slot: capture is case-insensitive and lowercased", () => {
  assert.deepEqual(parseTargetSlot("commit (slot:Zulu): title"), { slot: "zulu", confidence: "high" });
});

// ---- parseTargetSlot: LOW confidence (bare single slot name) ------------------

test("parseTargetSlot: bare single slot name (ZULU) -> low confidence", () => {
  assert.deepEqual(parseTargetSlot("[ZULU AUTONOMOUS BUILD LOOP] continue building autonomously"), { slot: "zulu", confidence: "low" });
});

test("parseTargetSlot: bare 'sierra' once -> low confidence", () => {
  assert.deepEqual(parseTargetSlot("[AUTONOMOUS BUILD LOOP -- sierra, operator-armed] prefer vault-ops"), { slot: "sierra", confidence: "low" });
});

// ---- parseTargetSlot: null (no/ambiguous target) -----------------------------

test("parseTargetSlot: two distinct bare slot names -> null (never guess)", () => {
  assert.equal(parseTargetSlot("hand off from alpha to bravo when done"), null);
});

test("parseTargetSlot: no slot name at all -> null", () => {
  assert.equal(parseTargetSlot("run the nightly vault health check and report"), null);
});

test("parseTargetSlot: non-string / empty inputs -> null", () => {
  assert.equal(parseTargetSlot(null), null);
  assert.equal(parseTargetSlot(undefined), null);
  assert.equal(parseTargetSlot(42), null);
  assert.equal(parseTargetSlot(""), null);
  assert.equal(parseTargetSlot({}), null);
});

test("parseTargetSlot: a non-slot word that contains a slot substring is NOT matched", () => {
  // 'alphabet' must NOT match 'alpha' (whole-word boundary).
  assert.equal(parseTargetSlot("learn the alphabet and the betamax"), null);
});

// ---- findStaleSlotCrons: THE REAL BUG (R9 failing-first) ----------------------

const CHAT_SLOTS_LIVE = {
  slots: {
    // Mirrors the live 2026-06-18 state: alpha/zulu/golf/romeo/sierra claimed,
    // papa NULL (the vacancy the stale /startup-papa cron force-claimed).
    alpha:  { chatId: "claude-14b038a1" },
    zulu:   { chatId: "claude-2bb2ef8a" },
    golf:   { chatId: "claude-04256fb3" },
    romeo:  { chatId: "claude-f2cfea61" },
    sierra: { chatId: "claude-dc3f020e" },
    papa:   null,
  },
};

test("findStaleSlotCrons: papa cron targeting the NULL papa slot is flagged + gets a CronDelete command", () => {
  const tasks = [
    { id: "1b150d99", cron: "17,47 * * * *", recurring: true,
      prompt: "/startup-papa autonomous backend loop (papa, slot:papa). Re-engage productive work...",
      createdBySessionId: "14b038a1-b568-490a-8f31-fb7e113a621b" },
  ];
  const found = findStaleSlotCrons(tasks, CHAT_SLOTS_LIVE);
  assert.equal(found.length, 1, "the orphan papa cron must be flagged");
  assert.equal(found[0].id, "1b150d99");
  assert.equal(found[0].targetSlot, "papa");
  assert.equal(found[0].reason, "target-slot-unclaimed");
  assert.equal(found[0].confidence, "high");
  assert.equal(found[0].command, "CronDelete 1b150d99", "high-confidence target -> concrete delete command");
});

// ---- findStaleSlotCrons: NO FALSE POSITIVE on the live 5-cron fleet -----------

test("findStaleSlotCrons: the live 5-cron fleet (all targeting CLAIMED slots) flags 0", () => {
  // Verbatim-shaped prompts from the live .claude/scheduled_tasks.json.
  const tasks = [
    { id: "7591bf74", recurring: true, createdBySessionId: "ad9c3041-c806-4424-9eed-fea97a4fc64b",
      prompt: "[AUTONOMOUS BUILD LOOP -- operator-armed 2026-06-18, slot:alpha] Continue building." },
    { id: "6925fd37", recurring: true, createdBySessionId: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7",
      prompt: "[ZULU AUTONOMOUS BUILD LOOP -- operator-armed] commit (slot:zulu): title on cad-fusion-live-ms0" },
    { id: "6a9c4a46", recurring: true, createdBySessionId: "04256fb3-d30b-4652-ab9b-142a096f1045",
      prompt: "[AUTONOMOUS BUILD + PC-HEALTH MONITOR -- golf]. snapshot PC health then build one unit." },
    { id: "1acfcab0", recurring: true, createdBySessionId: "f2cfea61-43e1-4a66-a16a-4ff1dfcc2d94",
      prompt: "Autonomous JM CAM tooling continuity (slot:romeo). Re-run audit." },
    { id: "f21f4008", recurring: true, createdBySessionId: "dc3f020e-9a94-4310-adf2-a60d9533cfec",
      prompt: "[AUTONOMOUS BUILD LOOP -- sierra, operator-armed] prefer vault-ops hardening." },
  ];
  const found = findStaleSlotCrons(tasks, CHAT_SLOTS_LIVE);
  assert.equal(found.length, 0, "every live cron targets a claimed slot -> nothing stale");
});

test("findStaleSlotCrons: alpha cron created by a PRIOR (compacted) session still serving claimed alpha is NOT flagged", () => {
  // 7591bf74 was created by ad9c3041 (gone); alpha now owned by 14b038a1.
  // The creator owns no slot -> creator-rebound must NOT fire; target claimed
  // -> target-unclaimed must NOT fire. (Regression: the cron is legitimately
  // serving alpha across a /compact session-id rotation.)
  const tasks = [
    { id: "7591bf74", recurring: true, createdBySessionId: "ad9c3041-c806-4424-9eed-fea97a4fc64b",
      prompt: "[AUTONOMOUS BUILD LOOP slot:alpha] continue" },
  ];
  assert.equal(findStaleSlotCrons(tasks, CHAT_SLOTS_LIVE).length, 0);
});

// ---- findStaleSlotCrons: creator-rebound (force-steal) ------------------------

test("findStaleSlotCrons: creator rebound to alpha but cron targets papa (claimed by peer) -> flagged creator-rebound", () => {
  const slots = {
    slots: {
      alpha: { chatId: "claude-14b038a1" },   // creator now owns alpha
      papa:  { chatId: "claude-aaaa1111" },    // a DIFFERENT live terminal holds papa
    },
  };
  const tasks = [
    { id: "1b150d99", recurring: true, createdBySessionId: "14b038a1-b568-490a-8f31-fb7e113a621b",
      prompt: "/startup-papa autonomous backend loop slot:papa" },
  ];
  const found = findStaleSlotCrons(tasks, slots);
  assert.equal(found.length, 1, "the cron would force-STEAL papa from the peer -> flag it");
  assert.equal(found[0].reason, "creator-rebound");
  assert.equal(found[0].creatorSlot, "alpha");
  assert.equal(found[0].command, "CronDelete 1b150d99");
});

test("findStaleSlotCrons: creator still owns the SAME slot the cron targets -> NOT flagged", () => {
  const slots = { slots: { papa: { chatId: "claude-14b038a1" } } };
  const tasks = [
    { id: "x", recurring: true, createdBySessionId: "14b038a1-aaaa-bbbb-cccc-dddddddddddd",
      prompt: "/startup-papa loop slot:papa" },
  ];
  assert.equal(findStaleSlotCrons(tasks, slots).length, 0);
});

// ---- findStaleSlotCrons: NON-ACTUATING crons are not thrash risks ------------
// CORRECTED INTENT (2026-06-19, slot:golf): a cron that merely LABELS/references a
// slot but does NOT run `/startup-<slot>` / `/checkin-<slot>` never force-claims a
// slot, so it cannot cause the "keep checking back into <slot>" thrash. The old
// test asserted such a cron was flagged (command=null soft review); that was the
// false-positive source -- it told a golf session to review/delete 4 live
// operator-armed build-loop crons. A non-actuating cron is now NEVER flagged.

test("findStaleSlotCrons: non-actuating bare-name continuity cron is NOT flagged (it never force-claims)", () => {
  const slots = { slots: { alpha: { chatId: "claude-14b038a1" } } }; // mike unclaimed
  const tasks = [
    { id: "lowconf1", recurring: true, createdBySessionId: "99999999-0000-0000-0000-000000000000",
      prompt: "[MIKE wire-edm continuity] keep the wire wizard warm" },
  ];
  assert.equal(findStaleSlotCrons(tasks, slots).length, 0,
    "a labeled-but-non-actuating cron cannot thrash -> not flagged");
});

// ---- actuatesSlotClaim: the thrash gate -------------------------------------

test("actuatesSlotClaim: /startup-<slot> -> high-confidence actuation", () => {
  assert.deepEqual(actuatesSlotClaim("/startup-papa autonomous backend loop"), { slot: "papa", confidence: "high" });
});

test("actuatesSlotClaim: /checkin-<slot> -> high-confidence actuation (the other force-claim wrapper)", () => {
  assert.deepEqual(actuatesSlotClaim("STEP 0: /checkin-zulu then build one unit"), { slot: "zulu", confidence: "high" });
});

test("actuatesSlotClaim: slot:<slot> ATTRIBUTION alone is NOT actuation -> null", () => {
  assert.equal(actuatesSlotClaim("[AUTONOMOUS BUILD LOOP -- slot:alpha] Continue building."), null);
});

test("actuatesSlotClaim: bare slot name / build-loop label is NOT actuation -> null", () => {
  assert.equal(actuatesSlotClaim("[ZULU AUTONOMOUS BUILD LOOP] continue building autonomously"), null);
  assert.equal(actuatesSlotClaim("Autonomous JM CAM tooling continuity (slot:romeo). Re-run audit."), null);
});

test("actuatesSlotClaim: non-string / no-actuation inputs -> null", () => {
  assert.equal(actuatesSlotClaim(null), null);
  assert.equal(actuatesSlotClaim(""), null);
  assert.equal(actuatesSlotClaim("run the nightly vault health check"), null);
  assert.equal(actuatesSlotClaim("/startup-notaslot loop"), null, "unknown slot name -> null");
});

test("actuatesSlotClaim: bare `--preferSlot <slot> --force` (no wrapper) IS actuation", () => {
  // The wrappers expand to this; a cron hand-rolling it force-claims just the same.
  assert.deepEqual(actuatesSlotClaim("node chat-slots.mjs claim --preferSlot papa --force true"),
    { slot: "papa", confidence: "high" });
  assert.deepEqual(actuatesSlotClaim("/checkin --preferSlot zulu --force"),
    { slot: "zulu", confidence: "high" });
});

test("actuatesSlotClaim: `--preferSlot <slot>` WITHOUT --force is NOT actuation (advisory mention)", () => {
  // A non-forcing preferSlot mention does not steal a held slot -> not a thrash.
  assert.equal(actuatesSlotClaim("pick a unit, advisory --preferSlot mike for routing"), null);
});

// ---- findStaleSlotCrons: THE LIVE FALSE-POSITIVE this fix closes -------------
// The exact 2026-06-19 state golf hit: 5 operator-armed autonomous BUILD-LOOP
// crons (none actuate /startup or /checkin), with zulu/romeo/sierra UNCLAIMED.
// Pre-fix the advisory flagged 4 of them for review/delete. Post-fix: 0.

test("findStaleSlotCrons: live operator build-loop crons with UNCLAIMED labeled slots -> 0 flagged (the fix)", () => {
  const slotsNow = {
    slots: {
      alpha:   { chatId: "claude-aaaa1111" },
      charlie: { chatId: "claude-cccc3333" },
      golf:    { chatId: "claude-664aa52b" }, // this session
      sierra:  { chatId: "claude-dddd4444" },
      // zulu, romeo intentionally absent (unclaimed)
    },
  };
  const tasks = [
    { id: "7591bf74", recurring: true, createdBySessionId: "ad9c3041-0000-0000-0000-000000000000",
      prompt: "[AUTONOMOUS BUILD LOOP -- operator-armed 2026-06-18, slot:alpha] Continue building." },
    { id: "6925fd37", recurring: true, createdBySessionId: "2bb2ef8a-0000-0000-0000-000000000000",
      prompt: "[ZULU AUTONOMOUS BUILD LOOP -- operator-armed] One build unit, full substrate ladder." },
    { id: "6a9c4a46", recurring: true, createdBySessionId: "04256fb3-0000-0000-0000-000000000000",
      prompt: "[AUTONOMOUS BUILD + PC-HEALTH MONITOR -- golf]. snapshot health then build one unit." },
    { id: "1acfcab0", recurring: true, createdBySessionId: "f2cfea61-0000-0000-0000-000000000000",
      prompt: "Autonomous JM CAM tooling continuity (slot:romeo). Re-run audit." },
    { id: "f21f4008", recurring: true, createdBySessionId: "dc3f020e-0000-0000-0000-000000000000",
      prompt: "[AUTONOMOUS BUILD LOOP -- sierra, operator-armed] prefer vault-ops hardening." },
  ];
  assert.equal(findStaleSlotCrons(tasks, slotsNow).length, 0,
    "none of these actuate a slot claim -> no thrash risk -> 0 flagged");
});

test("findStaleSlotCrons: a /checkin-<slot> cron targeting an unclaimed slot with rebound creator IS still flagged", () => {
  // The real thrash shape must STILL be caught after the gate change.
  const slots = { slots: { alpha: { chatId: "claude-12345678" } } }; // romeo unclaimed
  const tasks = [
    { id: "checkincr", recurring: true, createdBySessionId: "12345678-0000-0000-0000-000000000000",
      prompt: "/checkin-romeo then continue the JM CAM continuity loop" },
  ];
  const found = findStaleSlotCrons(tasks, slots);
  assert.equal(found.length, 1, "/checkin-<slot> actuates a force-claim -> still flagged");
  assert.equal(found[0].targetSlot, "romeo");
  assert.equal(found[0].reason, "target-slot-unclaimed");
  assert.equal(found[0].confidence, "high");
  assert.equal(found[0].command, "CronDelete checkincr", "rebound creator + high actuation -> destructive command");
});

// ---- P2 hardening: destructive command needs positive abandonment evidence ---
// (2026-06-18, slot:alpha) arm-B P2: a slot that is merely momentarily vacant
// (terminal closed, no creator-rebound) should NOT get a high-confidence
// CronDelete -- only a soft REVIEW. The destructive command requires BOTH
// high-confidence parse AND creator-rebound evidence.

test("findStaleSlotCrons: HIGH-confidence target-unclaimed WITHOUT creator-rebound -> flagged, NO destructive command", () => {
  // /startup-mike is high-confidence, but the creator owns no slot (gone, not
  // rebound) and mike is just momentarily vacant -> soft review, not a delete.
  const slots = { slots: { alpha: { chatId: "claude-14b038a1" } } }; // mike unclaimed
  const tasks = [
    { id: "mikecron", recurring: true, createdBySessionId: "deadbeef-0000-0000-0000-000000000000",
      prompt: "/startup-mike wire-edm continuity loop" },
  ];
  const found = findStaleSlotCrons(tasks, slots);
  assert.equal(found.length, 1);
  assert.equal(found[0].targetSlot, "mike");
  assert.equal(found[0].confidence, "high", "target IS high-confidence (/startup-mike)");
  assert.equal(found[0].reason, "target-slot-unclaimed");
  assert.equal(found[0].creatorRebound, false, "creator owns no slot -> no rebound evidence");
  assert.equal(found[0].command, null, "no positive abandonment evidence -> soft review, not a destructive delete");
});

test("findStaleSlotCrons: target-unclaimed WITH creator-rebound keeps the destructive command (papa case)", () => {
  // creator now owns alpha, cron targets the now-vacant papa -> rebound evidence
  // -> the high-confidence delete command IS still emitted. canonicalChatId maps
  // "12345678-..." -> "claude-12345678" to match the chat-slots owner exactly.
  const slots = { slots: { alpha: { chatId: "claude-12345678" } } }; // papa unclaimed
  const tasks = [
    { id: "papacr", recurring: true, createdBySessionId: "12345678-0000-0000-0000-000000000000",
      prompt: "/startup-papa slot:papa loop" },
  ];
  const found = findStaleSlotCrons(tasks, slots);
  assert.equal(found.length, 1);
  assert.equal(found[0].reason, "target-slot-unclaimed");
  assert.equal(found[0].creatorRebound, true, "creator owns alpha != papa -> rebound evidence");
  assert.equal(found[0].command, "CronDelete papacr", "unclaimed + rebound evidence -> destructive command");
});

test("renderAdvisory: high-confidence soft-review (no rebound) says 'may reopen', not 'low-confidence'", () => {
  const txt = renderAdvisory([
    { id: "mikecron", targetSlot: "mike", confidence: "high", reason: "target-slot-unclaimed",
      creatorRebound: false, creatorSlot: null, createdBySessionId: "deadbeef-0000-0000-0000-000000000000", command: null },
  ]);
  assert.ok(txt.includes("REVIEW cron `mikecron`"));
  assert.ok(txt.includes("may reopen"), "high-confidence-no-evidence soft note must NOT mislabel as low-confidence");
  assert.ok(!txt.includes("low-confidence target parse"));
});

// ---- findStaleSlotCrons: one-shot crons are ignored ---------------------------

test("findStaleSlotCrons: recurring:false (one-shot) cron is skipped even if stale", () => {
  const tasks = [
    { id: "oneshot", recurring: false, createdBySessionId: "14b038a1-b568-490a-8f31-fb7e113a621b",
      prompt: "/startup-papa one time" },
  ];
  assert.equal(findStaleSlotCrons(tasks, CHAT_SLOTS_LIVE).length, 0);
});

// ---- findStaleSlotCrons: ground-truth + adversarial safety -------------------

test("findStaleSlotCrons: empty/missing chat-slots -> [] (no mass false-positive on read failure)", () => {
  const tasks = [
    { id: "1b150d99", recurring: true, createdBySessionId: "14b038a1-b568-490a-8f31-fb7e113a621b",
      prompt: "/startup-papa slot:papa loop" },
  ];
  assert.equal(findStaleSlotCrons(tasks, null).length, 0, "null chat-slots -> no ground truth -> silent");
  assert.equal(findStaleSlotCrons(tasks, {}).length, 0);
  assert.equal(findStaleSlotCrons(tasks, { slots: {} }).length, 0);
});

test("findStaleSlotCrons: non-array tasks / junk entries -> [] (no throw)", () => {
  assert.deepEqual(findStaleSlotCrons(null, CHAT_SLOTS_LIVE), []);
  assert.deepEqual(findStaleSlotCrons("nope", CHAT_SLOTS_LIVE), []);
  assert.deepEqual(findStaleSlotCrons([null, 42, {}, { id: "" }], CHAT_SLOTS_LIVE), []);
});

test("findStaleSlotCrons: cron with unresolved target slot is never flagged", () => {
  const tasks = [
    { id: "noslot", recurring: true, createdBySessionId: "14b038a1-b568-490a-8f31-fb7e113a621b",
      prompt: "run the nightly vault health check and report (no slot named)" },
  ];
  assert.equal(findStaleSlotCrons(tasks, CHAT_SLOTS_LIVE).length, 0);
});

// ---- renderAdvisory ----------------------------------------------------------

test("renderAdvisory: empty findings -> '' (silent when clean)", () => {
  assert.equal(renderAdvisory([]), "");
  assert.equal(renderAdvisory(null), "");
});

test("renderAdvisory: high-confidence finding includes the CronDelete command + disable knob", () => {
  const txt = renderAdvisory([
    { id: "1b150d99", targetSlot: "papa", confidence: "high", reason: "target-slot-unclaimed",
      creatorSlot: null, createdBySessionId: "14b038a1-b568-490a-8f31-fb7e113a621b", command: "CronDelete 1b150d99" },
  ]);
  assert.ok(txt.includes("CronDelete 1b150d99"));
  assert.ok(txt.includes("papa"));
  assert.ok(txt.includes("PRISM_STALE_SLOT_CRON_ADVISORY_DISABLE=1"));
});

test("renderAdvisory: low-confidence finding asks for REVIEW, not a bare delete command line", () => {
  const txt = renderAdvisory([
    { id: "lowconf1", targetSlot: "mike", confidence: "low", reason: "target-slot-unclaimed",
      creatorSlot: null, createdBySessionId: "99999999-0000-0000-0000-000000000000", command: null },
  ]);
  assert.ok(txt.includes("REVIEW cron `lowconf1`"));
  assert.ok(txt.includes("verify before `CronDelete lowconf1`"));
});
