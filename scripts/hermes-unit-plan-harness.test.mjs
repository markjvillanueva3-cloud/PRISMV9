// Tests for the pure core of hermes-unit-plan-harness.mjs (node:test, no LLM calls).
// Real reference values: happy path + failure modes + adversarial inputs per R15.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseUnitFile, mergeQueueFragments, orderQueue,
  buildPrompt, appendProgressLog, markDrafted, draftHeader, DOMAIN_MEMORY_GALAXY,
  failCappedIds, darkStreak, oneLine, unwrapClaims, validateCap, runLaneLadder, gapCoverage,
} from "./hermes-unit-plan-harness.mjs";

const UNIT_MD = `# UNIT-0003 -- Material Behavior Modeling (Core Physics)

**Unit ID**: 0003
**Domain**: Physics & Material Science
**Title**: Material Behavior Modeling (Core Physics)
**Status**: Not Started
**Priority**: P0

## Description
Build the core material behavior engine.
`;

test("parseUnitFile extracts id/domain/title/status/priority", () => {
  const u = parseUnitFile(UNIT_MD, "UNIT-0003-DOMAIN1-MATERIAL-BEHAVIOR.md");
  assert.equal(u.id, "0003");
  assert.equal(u.domain, 1);
  assert.equal(u.title, "UNIT-0003 -- Material Behavior Modeling (Core Physics)");
  assert.equal(u.status, "Not Started");
  assert.equal(u.priority, "P0");
});

test("parseUnitFile degrades on missing fields, never throws", () => {
  const u = parseUnitFile("just prose, no frontmatter fields", "UNIT-0099-DOMAIN7-X.md");
  assert.equal(u.id, "0099");
  assert.equal(u.domain, 7);
  assert.equal(u.status, null);
  assert.equal(u.priority, null);
  assert.equal(u.title, "UNIT-0099-DOMAIN7-X.md"); // falls back to filename
});

test("mergeQueueFragments: valid fragment parsed, id normalized to 4 digits", () => {
  const { byId, errors } = mergeQueueFragments([{
    name: "queue-domain-1a.json",
    text: JSON.stringify({ schemaVersion: "1.0.0", units: [{ id: "3", roiScore: 8, verdict: "extend" }] }),
  }]);
  assert.equal(errors.length, 0);
  assert.equal(byId.get("0003").verdict, "extend");
});

test("mergeQueueFragments failure modes: bad JSON, wrong schema, missing id, duplicate id", () => {
  const { byId, errors } = mergeQueueFragments([
    { name: "a.json", text: "{not json" },
    { name: "b.json", text: JSON.stringify({ schemaVersion: "2.0.0", units: [] }) },
    { name: "c.json", text: JSON.stringify({ schemaVersion: "1.0.0", units: [{ roiScore: 5 }] }) },
    { name: "d.json", text: JSON.stringify({ schemaVersion: "1.0.0", units: [{ id: "0004", roiScore: 9 }, { id: "0004", roiScore: 1 }] }) },
  ]);
  assert.equal(errors.length, 4);
  assert.equal(byId.size, 1);
  assert.equal(byId.get("0004").roiScore, 9); // first wins
});

const mkUnit = (id, status = "Not Started", priority = "P1") =>
  ({ id, file: `UNIT-${id}-X.md`, domain: 1, title: `t${id}`, status, priority });

test("orderQueue: ROI desc, then priority, then id; skips covered/drafted/in-progress", () => {
  const units = [mkUnit("0002"), mkUnit("0003", "Not Started", "P0"), mkUnit("0004"), mkUnit("0005", "Drafted (hermes 2026-07-02)"), mkUnit("0006")];
  const byId = new Map([
    ["0002", { id: "0002", roiScore: 4, verdict: "extend" }],
    ["0004", { id: "0004", roiScore: 9, verdict: "build" }],
    ["0006", { id: "0006", roiScore: 9, verdict: "already-covered" }],
  ]);
  const { actionable, skipped } = orderQueue(units, byId, () => false);
  // 0004 roi=9 first; 0002 roi=4; 0003 roi=0 (no fragment entry, P0)
  assert.deepEqual(actionable.map(u => u.id), ["0004", "0002", "0003"]);
  assert.ok(skipped.find(s => s.unit.id === "0005" && /status:/.test(s.reason)));
  assert.ok(skipped.find(s => s.unit.id === "0006" && s.reason === "already-covered"));
});

test("orderQueue: no fragments -> priority then id order; draftExists skips", () => {
  const units = [mkUnit("0010", "Not Started", "P2"), mkUnit("0009", "Not Started", "P0"), mkUnit("0011", "Not Started", "P0")];
  const { actionable, skipped } = orderQueue(units, new Map(), (id) => id === "0011");
  assert.deepEqual(actionable.map(u => u.id), ["0009", "0010"]);
  assert.equal(skipped[0].reason, "draft-exists");
});

test("orderQueue: claimed units are skipped (operator ownership reservation)", () => {
  const units = [mkUnit("0003", "Not Started", "P0"), mkUnit("0018", "Not Started", "P1")];
  const { actionable, skipped } = orderQueue(units, new Map(), () => false, { "0003": "oscar" });
  assert.deepEqual(actionable.map(u => u.id), ["0018"]);
  assert.ok(skipped.find(s => s.unit.id === "0003" && s.reason === "claimed:oscar"));
});

test("orderQueue: missing priority falls back after ranked (?? 9)", () => {
  const units = [{ id: "0030", file: "f", domain: 1, title: "t", status: "Not Started", priority: null },
                 mkUnit("0031", "Not Started", "P2")];
  const { actionable } = orderQueue(units, new Map(), () => false);
  assert.deepEqual(actionable.map(u => u.id), ["0031", "0030"]); // P2 (rank 2) before null (rank 9)
});

test("failCappedIds: >= cap consecutive trailing failures; a success resets the streak", () => {
  const rows = [
    { action: "draft", unitId: "0002", ok: false },
    { action: "draft", unitId: "0002", ok: false },
    { action: "draft", unitId: "0002", ok: false },
    { action: "draft", unitId: "0005", ok: false },
    { action: "draft", unitId: "0005", ok: true }, // reset
    { action: "draft", unitId: "0005", ok: false },
  ].map(r => JSON.stringify(r)).join("\n");
  const capped = failCappedIds(rows, 3);
  assert.ok(capped.has("0002"));   // 3 straight fails
  assert.ok(!capped.has("0005"));  // success reset -> only 1 trailing fail
});

test("failCappedIds: ignores non-draft rows and malformed lines, never throws", () => {
  const rows = "not json\n" + JSON.stringify({ action: "other", unitId: "0002", ok: false }) + "\n" +
    [{ action: "draft", unitId: "0009", ok: false }, { action: "draft", unitId: "0009", ok: false }].map(r => JSON.stringify(r)).join("\n");
  const capped = failCappedIds(rows, 2);
  assert.ok(capped.has("0009"));
  assert.equal(capped.has("0002"), false); // "other" action not counted
});

test("darkStreak: trailing all-lane-failed rows across units; ok breaks it", () => {
  const mk = (id, ok) => JSON.stringify({ action: "draft", unitId: id, ok });
  assert.equal(darkStreak([mk("0002", false), mk("0003", false), mk("0004", false)].join("\n")), 3);
  assert.equal(darkStreak([mk("0002", false), mk("0003", true), mk("0004", false)].join("\n")), 1);
  assert.equal(darkStreak(""), 0);
});

test("oneLine collapses newlines/whitespace (sanitize externally-controlled interpolation)", () => {
  assert.equal(oneLine("grok\n\n  reasoning\r\nmodel"), "grok reasoning model");
  assert.equal(oneLine(null), "");
  assert.equal(oneLine("  spaced  "), "spaced");
});

test("markDrafted re-flips an already-Drafted unit (idempotent shape, new date)", () => {
  const once = markDrafted("**Status**: Not Started\n", "2026-07-02");
  const twice = markDrafted(once, "2026-07-03");
  assert.ok(twice.includes("**Status**: Drafted (hermes 2026-07-03)"));
  assert.equal((twice.match(/\*\*Status\*\*:/g) || []).length, 1); // still exactly one Status line
});

test("buildPrompt includes unit body + gap + memory; omits gap section when absent", () => {
  const withAll = buildPrompt({ unitBody: UNIT_MD, gapText: "GAPGAP", memoryHead: "MEMMEM", title: "T" });
  assert.ok(withAll.includes("GAPGAP") && withAll.includes("MEMMEM") && withAll.includes("Material Behavior"));
  const noGap = buildPrompt({ unitBody: UNIT_MD, gapText: null, memoryHead: null, title: "T" });
  assert.ok(!noGap.includes("gap analysis (authoritative"));
  assert.ok(noGap.includes("[UNVERIFIED]")); // safety instruction always present
});

test("appendProgressLog: seeds header once, O_APPENDs each line (clobber-safe, no read-back)", () => {
  const p = path.join(os.tmpdir(), `prism-unitplan-progress-${process.pid}-${Date.now()}.md`);
  try {
    appendProgressLog(p, "- 2026-07-02: UNIT-0019 drafted");
    appendProgressLog(p, "- 2026-07-02: UNIT-0020 drafted");
    const body = fs.readFileSync(p, "utf8");
    assert.ok(body.startsWith("# Hermes Unit Plan Harness")); // header seeded
    assert.equal((body.match(/^# Hermes Unit Plan Harness/gm) || []).length, 1); // seeded ONCE, not per-append
    assert.ok(body.includes("- 2026-07-02: UNIT-0019 drafted"));
    assert.ok(body.includes("- 2026-07-02: UNIT-0020 drafted")); // second append did not clobber the first
    assert.ok(body.indexOf("UNIT-0019") < body.indexOf("UNIT-0020")); // chronological
  } finally { fs.rmSync(p, { force: true }); }
});

test("appendProgressLog: collapses a multi-line line so one draft is exactly one row", () => {
  const p = path.join(os.tmpdir(), `prism-unitplan-progress-ml-${process.pid}-${Date.now()}.md`);
  try {
    appendProgressLog(p, "- UNIT-0021\ndrafted\nvia ollama");
    const rows = fs.readFileSync(p, "utf8").trimEnd().split("\n").filter(l => l.startsWith("- "));
    assert.equal(rows.length, 1);
    assert.equal(rows[0], "- UNIT-0021 drafted via ollama");
  } finally { fs.rmSync(p, { force: true }); }
});

test("markDrafted flips only the Status line; null when absent", () => {
  const out = markDrafted(UNIT_MD, "2026-07-02");
  assert.ok(out.includes("**Status**: Drafted (hermes 2026-07-02)"));
  assert.ok(out.includes("**Priority**: P0")); // untouched
  assert.equal(markDrafted("no status line here", "2026-07-02"), null);
});

test("draftHeader carries the UNREVIEWED safety banner + unit id", () => {
  const h = draftHeader("0003", "hermes", "grok-4.3", "2026-07-02");
  assert.ok(/UNREVIEWED/.test(h) && /UNIT-0003/.test(h) && /never wire numeric thresholds/i.test(h));
});

test("domain->galaxy memory map covers all 8 plan domains", () => {
  for (let d = 1; d <= 8; d++) assert.ok(DOMAIN_MEMORY_GALAXY[d], `domain ${d} unmapped`);
});

test("unwrapClaims accepts wrapper OR flat map; junk -> {}", () => {
  assert.deepEqual(unwrapClaims({ claims: { "0003": "oscar" } }), { "0003": "oscar" });
  assert.deepEqual(unwrapClaims({ "0003": "oscar" }), { "0003": "oscar" });
  assert.deepEqual(unwrapClaims(null), {});
  assert.deepEqual(unwrapClaims("nope"), {});
  assert.deepEqual(unwrapClaims({ claims: "bad" }), { claims: "bad" }); // non-object inner -> treat whole as flat
});

test("gapCoverage: counts units with/without a gap file, lists the missing ids", () => {
  const units = [mkUnit("0018"), mkUnit("0006"), mkUnit("0013"), { file: "x", domain: 1, title: "no-id", status: "Not Started", priority: "P1" }];
  const have = new Set(["0018"]); // only 0018 has a gap file; 0006 (whiskey) + 0013 (foxtrot) don't
  const cov = gapCoverage(units, (id) => have.has(id));
  assert.equal(cov.total, 3);           // the id-less unit is ignored
  assert.equal(cov.withGap, 1);
  assert.equal(cov.withoutGap, 2);
  assert.deepEqual(cov.missingIds, ["0006", "0013"]);
});

test("validateCap bounds: integer 1..20 ok; garbage/out-of-range rejected", () => {
  assert.deepEqual(validateCap("2"), { ok: true, cap: 2 });
  assert.deepEqual(validateCap(undefined), { ok: true, cap: 2 }); // default
  assert.equal(validateCap("abc").ok, false);
  assert.equal(validateCap("-1").ok, false);
  assert.equal(validateCap("0").ok, false);
  assert.equal(validateCap("21").ok, false);
  assert.equal(validateCap("2.5").ok, false);
});

test("runLaneLadder: first lane wins (Hermes healthy -> no fallback)", async () => {
  const calls = [];
  const { out, laneErrors } = await runLaneLadder("p", [
    { name: "hermes", fn: async (p) => { calls.push("hermes"); return { text: "H:" + p, lane: "hermes" }; } },
    { name: "ollama", fn: async () => { calls.push("ollama"); return { text: "O", lane: "ollama" }; } },
  ]);
  assert.equal(out.lane, "hermes");
  assert.deepEqual(calls, ["hermes"]); // ollama never touched
  assert.deepEqual(laneErrors, []);
});

test("runLaneLadder: Hermes throws -> falls through to Ollama (the no-downtime path)", async () => {
  const { out, laneErrors } = await runLaneLadder("p", [
    { name: "hermes", fn: async () => { throw new Error("chat HTTP 404"); } },
    { name: "ollama", fn: async () => ({ text: "O", lane: "ollama" }) },
  ]);
  assert.equal(out.lane, "ollama");
  assert.deepEqual(laneErrors, ["hermes: chat HTTP 404"]);
});

test("runLaneLadder: both lanes dark -> out null with BOTH errors (fail-open, exit 0 upstream)", async () => {
  const { out, laneErrors } = await runLaneLadder("p", [
    { name: "hermes", fn: async () => { throw new Error("401"); } },
    { name: "ollama", fn: async () => { throw new Error("503"); } },
  ]);
  assert.equal(out, null);
  assert.deepEqual(laneErrors, ["hermes: 401", "ollama: 503"]);
});

test("runLaneLadder: a lane returning falsy is treated as a failure, not a success", async () => {
  const { out, laneErrors } = await runLaneLadder("p", [
    { name: "hermes", fn: async () => null },      // empty completion
    { name: "ollama", fn: async () => ({ text: "O", lane: "ollama" }) },
  ]);
  assert.equal(out.lane, "ollama");
  assert.equal(laneErrors[0], "hermes: empty result");
});

test("failCappedIds/darkStreak read tolerate a truncated leading line (tail-slice artifact)", () => {
  // when readOptional tail-slices, the first line may be a partial JSON fragment -> must be skipped, not throw
  const rows = 'artial","ok":false}\n' +
    JSON.stringify({ action: "draft", unitId: "0009", ok: false }) + "\n" +
    JSON.stringify({ action: "draft", unitId: "0009", ok: false }) + "\n" +
    JSON.stringify({ action: "draft", unitId: "0009", ok: false });
  assert.ok(failCappedIds(rows, 3).has("0009"));
  assert.equal(darkStreak(rows), 3);
});
