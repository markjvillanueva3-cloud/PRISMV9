#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  collectUnits, buildShippedIds, buildClaimedIds, rankUnits, pickNextUnit, ROOT,
  buildEnvelopeIndex, loadEnvelopeIndex, resolveUnitSlot, isProseAliasOfEnvelope,
} from "./priority-queue.mjs";
import { slotDomain, classifyUnit as classifyUnitDomain } from "../../scripts/lib/domain-classifier.mjs";
import { readCompletedMilestones } from "../../scripts/lib/shipped-units-source-of-truth.mjs";

test("collectUnits — flattens pending + prose + bridge into one list", () => {
  const units = collectUnits({
    pending_units: [{ unit_id: "U-P1", milestone: "M0", title: "p" }],
    unconsolidated_prose: [{ unit_id: "U-PR1", milestone: "M1", title: "prose" }],
    bridge_units: {
      wiring: [{ id: "U-BW1", title: "wire", domain: "X", engine_count: 5, intent: "i" }],
      deep_integration: [{ id: "U-BD1", title: "deep", from: "A", to: "B", intent: "i" }],
    },
  });
  assert.equal(units.length, 4);
  assert.equal(units.find((u) => u._source === "pending").unit_id, "U-P1");
  assert.equal(units.find((u) => u._source === "unconsolidated-prose").unit_id, "U-PR1");
  assert.equal(units.find((u) => u._source === "bridge-wiring").unit_id, "U-BW1");
  assert.equal(units.find((u) => u._source === "bridge-deep").source, "bridge");
});

test("buildShippedIds — only shipped:true units, normalized uppercase", () => {
  const ids = buildShippedIds({
    milestones: {
      A: { units: [{ id: "u-a1", shipped: true }, { id: "U-A2", shipped: false }, { id: "u-a3", shipped: true }] },
    },
  });
  assert.ok(ids.has("U-A1"));
  assert.ok(ids.has("U-A3"));
  assert.equal(ids.has("U-A2"), false);
  assert.equal(ids.size, 2);
});

test("buildClaimedIds — extracts U-... tokens from slot topics (soft filter)", () => {
  // Topics where the unit id is the terminal token (or followed by a
  // non-[A-Z0-9-] separator): the greedy regex captures it. Real PRISM topics
  // rarely embed unit ids today; this filter is reserved for future when slot
  // state carries an explicit unit_id field. Strict claim enforcement lives in
  // commit-ownership-guard at commit time.
  const claimed = buildClaimedIds({
    slots: {
      alpha: { topic: "alpha-U-FOO01" },
      bravo: { topic: "no-unit-here" },
      charlie: { topic: "work on U-BAR-99" },
    },
  });
  assert.ok(claimed.has("U-FOO01"));
  assert.ok(claimed.has("U-BAR-99"));
  assert.equal(claimed.size, 2);
});

test("rankUnits — backend-dev first, then bridge, then app; excludes shipped", () => {
  const units = [
    { unit_id: "U-CAM1", milestone: "CAM-EXHAUST-MS0", title: "cam" },                    // app
    { unit_id: "U-RGS1", milestone: "RGS-TOOL-AUTOINVOKE-MS1", title: "rgs" },             // backend-dev
    { unit_id: "U-SHIPPED", milestone: "CAM-MS0", title: "shipped" },                      // excluded
    { unit_id: "U-BR1", source: "bridge", milestone: "BRIDGE-DEEP", title: "bridge" },     // bridge
  ];
  const ranked = rankUnits(units, new Set(["U-SHIPPED"]));
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].unit_id, "U-RGS1");     // backend-dev first
  assert.equal(ranked[1].unit_id, "U-BR1");      // bridge second
  assert.equal(ranked[2].unit_id, "U-CAM1");     // app last
  assert.equal(ranked[0]._category, "backend-dev");
  assert.equal(ranked[1]._category, "bridge");
  assert.equal(ranked[2]._category, "app-functionality");
});

test("rankUnits — drops looks_completed units", () => {
  const units = [
    { unit_id: "U-A", milestone: "M", title: "a", looks_completed: true },
    { unit_id: "U-B", milestone: "M", title: "b" },
  ];
  const ranked = rankUnits(units, new Set());
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].unit_id, "U-B");
});

test("rankUnits — tiebreaker: same priority → milestone asc then unit_id asc", () => {
  const units = [
    { unit_id: "U-B", milestone: "Z-MS0", title: "b" },
    { unit_id: "U-A", milestone: "Z-MS0", title: "a" },
    { unit_id: "U-C", milestone: "A-MS0", title: "c" },
  ];
  const ranked = rankUnits(units, new Set());
  // All app — sort by milestone asc, then unit_id asc
  assert.equal(ranked[0].unit_id, "U-C");  // A-MS0
  assert.equal(ranked[1].unit_id, "U-A");  // Z-MS0 / U-A
  assert.equal(ranked[2].unit_id, "U-B");  // Z-MS0 / U-B
});

test("rankUnits — tolerates empty / no exclude", () => {
  assert.equal(rankUnits([], new Set()).length, 0);
  assert.equal(rankUnits([], null).length, 0);
});

test("rankUnits — completedMilestones (3rd arg) excludes units of complete milestones", () => {
  // The bug this closes: a unit can carry an id (`H1`) that the unit-id
  // excludeIds set can never match, while its milestone IS known-complete.
  const units = [
    { unit_id: "H1", milestone: "HOOK-SYNERGY-MS0", title: "non-U id, complete milestone" },
    { unit_id: "U-LIVE", milestone: "LIVE-MS0", title: "live" },
  ];
  const ranked = rankUnits(units, new Set(), new Set(["HOOK-SYNERGY-MS0"]));
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].unit_id, "U-LIVE");
});

test("rankUnits — completedMilestones match is normalized (case + trim)", () => {
  const units = [{ unit_id: "X1", milestone: "  hook-synergy-ms0  ", title: "x" }];
  const ranked = rankUnits(units, new Set(), new Set(["HOOK-SYNERGY-MS0"]));
  assert.equal(ranked.length, 0, "padded/lowercase milestone still matches the normalized done-set");
});

test("rankUnits — completedMilestones accepts a plain array too", () => {
  const units = [{ unit_id: "U-A", milestone: "DONE-MS0", title: "a" }];
  const ranked = rankUnits(units, new Set(), ["DONE-MS0"]);
  assert.equal(ranked.length, 0);
});

test("rankUnits — omitting completedMilestones is backward-compatible (no milestone filter)", () => {
  // Two-arg call must behave byte-identically to pre-fix: NO milestone filter.
  const units = [
    { unit_id: "H1", milestone: "HOOK-SYNERGY-MS0", title: "a" },
    { unit_id: "U-B", milestone: "LIVE-MS0", title: "b" },
  ];
  assert.equal(rankUnits(units, new Set()).length, 2, "two-arg rankUnits must not filter by milestone");
});

test("rankUnits — unit with no milestone field is never milestone-excluded", () => {
  const units = [{ unit_id: "U-NOMS", title: "no milestone" }];
  const ranked = rankUnits(units, new Set(), new Set(["SOME-MS0"]));
  assert.equal(ranked.length, 1, "missing milestone → cannot match the done-set, stays eligible");
});

// ─── pickNextUnit slot-domain filter (integration over live inventory) ────
// These assert the JULIETT-12CHAT-ALLOCATION invariant, NOT specific unit-ids
// (which drift as work ships). Skip-loud if the consolidated inventory is
// absent (a hermetic-only checkout) rather than fail spuriously.

test("pickNextUnit — slot=echo returns only cam-domain units (or cross-domain flagged)", () => {
  const picks = pickNextUnit({ slot: "echo", topN: 5 });
  if (picks.length === 0) return;                          // inventory missing — skip-loud
  const camDomain = slotDomain("echo");
  assert.equal(camDomain, "cam");
  for (const p of picks) {
    const inDomain = classifyUnitDomain(p).domain === "cam";
    // Either it's a cam unit, OR it's flagged cross-domain (R12 fallback when
    // no in-domain work exists). It must NEVER be a silent off-domain pick.
    assert.ok(inDomain || p._crossDomain === true,
      `pick ${p.unit_id} must be cam-domain or flagged _crossDomain (got domain=${classifyUnitDomain(p).domain})`);
    assert.equal(p._slotDomain, "cam", "every slot-scoped pick carries _slotDomain");
  }
});

test("pickNextUnit — slot=alpha returns mill-domain (different slot, different lane)", () => {
  const picks = pickNextUnit({ slot: "alpha", topN: 3 });
  if (picks.length === 0) return;
  for (const p of picks) {
    assert.equal(p._slotDomain, "mill");
    assert.ok(classifyUnitDomain(p).domain === "mill" || p._crossDomain === true);
  }
});

test("pickNextUnit — no slot returns global ranking (no _slotDomain stamp)", () => {
  const picks = pickNextUnit({ topN: 3 });
  if (picks.length === 0) return;
  for (const p of picks) {
    assert.equal(p._slotDomain, undefined, "global pick must NOT carry _slotDomain");
    assert.equal(p._crossDomain, undefined);
  }
});

test("pickNextUnit — unknown slot falls back to global (no filter, no stamp)", () => {
  const picks = pickNextUnit({ slot: "no-such-slot-xyz", topN: 3 });
  if (picks.length === 0) return;
  for (const p of picks) {
    assert.equal(p._slotDomain, undefined, "unknown slot must behave like global");
  }
});

test("pickNextUnit — topN clamps to >=1 and respects the cap", () => {
  const one = pickNextUnit({ slot: "echo", topN: 1 });
  const five = pickNextUnit({ slot: "echo", topN: 5 });
  if (one.length === 0) return;
  assert.ok(one.length <= 1);
  assert.ok(five.length <= 5);
  assert.ok(five.length >= one.length);
});

test("pickNextUnit — LOUD GUARD: real inventory present ⇒ picker MUST return work", () => {
  // Reviewer B P1: the other pickNextUnit tests early-return on empty picks
  // for hermetic-checkout portability. That makes a "picker always returns []"
  // regression pass vacuously. This guard converts that silent-skip into a
  // loud failure: if the consolidated inventory file exists on disk, the
  // picker MUST yield at least one unit (echo=cam has live work today).
  const invPath = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
  if (!fs.existsSync(invPath)) return;                     // genuinely no inventory — legitimately skip
  const picks = pickNextUnit({ slot: "echo", topN: 1 });
  assert.ok(picks.length > 0,
    "ROADMAP-CONSOLIDATED.json exists but pickNextUnit returned [] — picker REGRESSION (broken path/schema/collectUnits)");
});

// ─── U-KP2P-03: envelope-backed slot ownership + prose-alias dedupe ──────────

test("buildEnvelopeIndex — maps unit slots + milestone unit-ids, skips empty milestones", () => {
  const idx = buildEnvelopeIndex([
    { id: "DOMAIN-PIPELINE-MS0", units: [
      { id: "U-DPM0-WIRE-PRINT_OCR", slot: "charlie" },
      { id: "U-DPM0-P2P-X", slot: "kilo" },
      { id: "U-DPM0-NOSLOT" },                       // no slot field
    ] },
    { id: "MS-TRAIN-DEEP", units: [{ id: "U-MS-TRAIN-DEEP-01" }, { id: "U-MS-TRAIN-DEEP-02" }] },
    { id: "EMPTY-MS0", units: [] },                  // empty units → excluded entirely
    { id: "STUB-MS0" },                              // no units key → excluded
  ]);
  assert.equal(idx.unitSlot.get("U-DPM0-WIRE-PRINT_OCR"), "charlie");
  assert.equal(idx.unitSlot.get("U-DPM0-P2P-X"), "kilo");
  assert.equal(idx.unitSlot.has("U-DPM0-NOSLOT"), false, "a unit with no slot field is absent from unitSlot");
  assert.ok(idx.milestoneUnitIds.get("MS-TRAIN-DEEP").has("U-MS-TRAIN-DEEP-01"));
  assert.equal(idx.milestoneUnitIds.has("EMPTY-MS0"), false, "empty-units milestone excluded");
  assert.equal(idx.milestoneUnitIds.has("STUB-MS0"), false, "no-units milestone excluded");
});

test("buildEnvelopeIndex — supports nested phases[].units, unit_id alias, tolerates junk", () => {
  const idx = buildEnvelopeIndex([
    { id: "PHASED-MS0", phases: [{ units: [{ unit_id: "U-PH-1", slot: "ECHO" }] }] },
    null, 42, { units: [{ id: "U-X" }] },            // no id → skipped, no crash
  ]);
  assert.equal(idx.unitSlot.get("U-PH-1"), "echo", "nested phase unit indexed, slot normalized lowercase");
  assert.ok(idx.milestoneUnitIds.has("PHASED-MS0"));
});

test("resolveUnitSlot — own slot wins, else envelope fallback, else null (unassigned)", () => {
  const idx = buildEnvelopeIndex([{ id: "M", units: [{ id: "U-ENV", slot: "bravo" }] }]);
  assert.equal(resolveUnitSlot({ unit_id: "U-OWN", slot: "Delta" }, idx), "delta", "explicit own slot wins, lowercased");
  assert.equal(resolveUnitSlot({ unit_id: "U-ENV" }, idx), "bravo", "no own slot → envelope units[] entry");
  assert.equal(resolveUnitSlot({ unit_id: "U-NOWHERE" }, idx), null, "slot nowhere → null (unassigned, any slot may pick)");
  assert.equal(resolveUnitSlot({}, idx), null);
});

test("isProseAliasOfEnvelope — flags prose units aliasing an enveloped milestone", () => {
  const idx = buildEnvelopeIndex([{ id: "MS-TRAIN-DEEP", units: [{ id: "U-MS-TRAIN-DEEP-01" }] }]);
  // prose-sourced, milestone HAS an envelope, id is NOT a real envelope id → alias
  assert.equal(isProseAliasOfEnvelope(
    { unit_id: "U-TRAIN-P2P-01", milestone: "MS-TRAIN-DEEP", _source: "unconsolidated-prose" }, idx), true);
  // prose-sourced but id IS the envelope's real id → not an alias
  assert.equal(isProseAliasOfEnvelope(
    { unit_id: "U-MS-TRAIN-DEEP-01", milestone: "MS-TRAIN-DEEP", _source: "unconsolidated-prose" }, idx), false);
  // pending-sourced (envelope-origin) unit → never flagged regardless of id
  assert.equal(isProseAliasOfEnvelope(
    { unit_id: "U-TRAIN-P2P-01", milestone: "MS-TRAIN-DEEP", _source: "pending" }, idx), false);
  // prose unit whose milestone has NO envelope → genuine unconsolidated work, kept
  assert.equal(isProseAliasOfEnvelope(
    { unit_id: "U-ORPHAN-1", milestone: "NO-SUCH-ENVELOPE-MS0", _source: "unconsolidated-prose" }, idx), false);
});

test("pickNextUnit — slot=kilo excludes a peer-slot unit (U-DPM0-WIRE-PRINT_OCR is slot:charlie)", () => {
  const invPath = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
  if (!fs.existsSync(invPath)) return;                     // hermetic checkout — skip-loud
  // Oracle: confirm the live envelope index genuinely sees this unit as
  // charlie-owned, so the exclusion below is meaningful (not vacuous).
  const liveSlot = resolveUnitSlot({ unit_id: "U-DPM0-WIRE-PRINT_OCR" }, loadEnvelopeIndex());
  if (liveSlot !== "charlie") return;                      // envelope changed — skip rather than mis-assert
  const picks = pickNextUnit({ slot: "kilo", topN: 300 });
  const leak = picks.filter((p) => String(p.unit_id || "").toUpperCase() === "U-DPM0-WIRE-PRINT_OCR");
  assert.equal(leak.length, 0,
    "U-DPM0-WIRE-PRINT_OCR (envelope slot:charlie) must NOT surface in a slot=kilo pick");
});

test("pickNextUnit — no fabricated prose-alias ids leak (U-TRAIN-P2P-NN vs envelope U-MS-TRAIN-DEEP-NN)", () => {
  const invPath = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
  if (!fs.existsSync(invPath)) return;                     // hermetic checkout — skip-loud
  // MS-TRAIN-DEEP has a real envelope; its prose-extracted U-TRAIN-P2P-NN
  // aliases must be deduped out of EVERY pick (global + slot-scoped).
  const global = pickNextUnit({ topN: 500 });
  const kilo = pickNextUnit({ slot: "kilo", topN: 300 });
  const aliasRe = /TRAIN-P2P/i;
  const gLeak = global.filter((p) => aliasRe.test(String(p.unit_id || "")));
  const kLeak = kilo.filter((p) => aliasRe.test(String(p.unit_id || "")));
  assert.equal(gLeak.length, 0, `prose-alias ids leaked into global pick: ${gLeak.map((p) => p.unit_id).join(", ")}`);
  assert.equal(kLeak.length, 0, `prose-alias ids leaked into slot=kilo pick: ${kLeak.map((p) => p.unit_id).join(", ")}`);
});

test("pickNextUnit — R12 cross-domain fallback still fires after the slot filter", () => {
  // Spec U-KP2P-03 step 5: the slot filter must NOT break the existing
  // cross-domain fallback. echo=cam has live work, so it returns in-domain;
  // the invariant we assert is that a slot-scoped pick is never empty when the
  // inventory is present (fallback to global if the lane is dry).
  const invPath = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
  if (!fs.existsSync(invPath)) return;
  const picks = pickNextUnit({ slot: "echo", topN: 1 });
  assert.ok(picks.length > 0,
    "slot-scoped pick must still yield work (in-domain or R12 cross-domain) — slot filter must not empty it");
  for (const p of picks) {
    // every cam-domain pick OR a flagged cross-domain fallback — never a silent off-lane pick
    assert.ok(p._slotDomain === "cam");
  }
});

test("pickNextUnit — REGRESSION: no picked unit belongs to a complete milestone", () => {
  // Fail-on-revert oracle for the milestone-keyed filter. Self-consistent: it
  // uses the SAME readCompletedMilestones() the picker uses, then asserts the
  // picker actually applied it. Before the filter, complete milestones like
  // HOOK-SYNERGY-MS0 (envelope status:complete) leaked their units (H1..H10)
  // into the top of --pick because ROADMAP-CONSOLIDATED's id namespace never
  // matched the envelope's U-HOOK-* shipped set. If the rankUnits 3rd-arg
  // wiring in pickNextUnit is removed, this breaks loud.
  const invPath = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
  if (!fs.existsSync(invPath)) return;                     // hermetic checkout — skip-loud
  const picks = pickNextUnit({ topN: 200 });               // global ranking, generous depth
  if (picks.length === 0) return;
  const done = readCompletedMilestones();
  const norm = (s) => String(s || "").trim().toUpperCase();
  const leaked = picks.filter((p) => p.milestone && done.has(norm(p.milestone)));
  assert.equal(leaked.length, 0,
    `complete-milestone units leaked into pickup: ${leaked.map((p) => `${p.unit_id}@${p.milestone}`).join(", ")}`);
});
