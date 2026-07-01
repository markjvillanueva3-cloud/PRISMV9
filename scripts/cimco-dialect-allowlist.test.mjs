// cimco-dialect-allowlist.test.mjs — real-behavior tests for the per-dialect G/M allowlist + lint.
// Run: node --test scripts/cimco-dialect-allowlist.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync as wf } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ALLOWLIST_PATH,
  extractCodes,
  buildAllowlist,
  loadAllowlist,
  dialectLint,
  allowlistSummary,
} from "./cimco-dialect-allowlist.mjs";

// ─── extractCodes — comment-safe vocabulary extraction ───────────────────────

test("extractCodes pulls G/M codes from the body, NEVER from comments", () => {
  const nc = "$PART.MIN%\nN10 G0 X1 Z1\nN20 G1 Z-2 F.01 M8\n(THIS G99 M77 IS A COMMENT)\nN30 G83.2 X5\nM30";
  const { g, m } = extractCodes(nc);
  assert.ok(g.has("G0") && g.has("G1") && g.has("G83.2"), "real motion G-codes captured incl decimal");
  assert.ok(m.has("M8") && m.has("M30"));
  assert.ok(!g.has("G99"), "G99 lives only in a comment → NOT captured");
  assert.ok(!m.has("M77"), "M77 lives only in a comment → NOT captured");
});

test("extractCodes normalizes leading zeros (G01→G1, M03→M3) and dedups", () => {
  const { g, m } = extractCodes("G01 G1 G00 M03 M3");
  assert.deepEqual([...g].sort(), ["G0", "G1"]);
  assert.deepEqual([...m].sort(), ["M3"]);
});

test("extractCodes on empty/garbage input is empty, never throws (adversarial)", () => {
  assert.equal(extractCodes("").g.size, 0);
  assert.equal(extractCodes(null).m.size, 0);
  assert.equal(extractCodes("no codes here just words").g.size, 0);
});

// ─── buildAllowlist on a synthetic corpus (deterministic, no real corpus) ────

function fixtureCorpus() {
  const root = mkdtempSync(join(tmpdir(), "jmdialect-"));
  // Native Okuma OSP goldens (detectDialect → okuma-osp via $NAME.MIN%).
  mkdirSync(join(root, "CNC LATHE", "ACME"), { recursive: true });
  wf(join(root, "CNC LATHE", "ACME", "SHAFT.MIN"), "$SHAFT.MIN%\nG0 X10 Z5\nG50 S2000\nG96 S800 M3\nG1 Z-3 F.012\nM2");
  wf(join(root, "CNC LATHE", "ACME", "PIN.MIN"), "$PIN.MIN%\nG0 X2 Z2\nG1 X-0.5 F.005\nG2 X3 Z-1 R0.5\nM2");
  // A Hurco golden (detectDialect → hurco via O1001).
  mkdirSync(join(root, "HURCO CNC PROGRAMS"), { recursive: true });
  wf(join(root, "HURCO CNC PROGRAMS", "PLATE.hnc"), "O1001\nG0 X1 Y1\nG1 Z-2 F10 M8\nG43 H1 Z0.1\nM30");
  return root;
}

test("buildAllowlist mines per-family code vocabularies from a synthetic golden corpus", () => {
  const root = fixtureCorpus();
  const doc = buildAllowlist({ root, write: false });
  assert.ok(doc.families["okuma-osp"], "okuma-osp family mined");
  const osp = doc.families["okuma-osp"];
  assert.equal(osp.sampleCount, 2, "two OSP goldens");
  assert.ok(osp.gCodes.includes("G50") && osp.gCodes.includes("G96") && osp.gCodes.includes("G2"));
  assert.ok(osp.mCodes.includes("M3") && osp.mCodes.includes("M2"));
  // provenance: every code carries a first-seen golden path
  assert.ok(typeof osp.firstSeenG["G50"] === "string" && osp.firstSeenG["G50"].includes("SHAFT"));
  // hurco family present + distinct vocabulary (G43/H not in OSP set)
  assert.ok(doc.families["hurco"]);
  assert.ok(doc.families["hurco"].gCodes.includes("G43"));
  assert.ok(!osp.gCodes.includes("G43"), "G43 is hurco-only here, never bleeds into okuma-osp");
  assert.ok(doc.filesScanned >= 3);
});

// ─── dialectLint — the static proving signal ─────────────────────────────────

test("dialectLint flags codes unobserved in the family goldens, honestly framed as REVIEW (not invalid)", () => {
  const root = fixtureCorpus();
  const allowlist = buildAllowlist({ root, write: false });
  // A candidate OSP post that emits G71 (a canned cycle never seen in these goldens).
  const candidate = "$NEWPART.MIN%\nG0 X5 Z5\nG96 S700 M3\nG71 P10 Q20\nG1 Z-4 F.01\nM2";
  const r = dialectLint(candidate, { allowlist });
  assert.equal(r.classified, "okuma-osp");
  assert.equal(r.hasAllowlist, true);
  assert.ok(r.unobservedG.includes("G71"), "G71 not in goldens → surfaced");
  assert.equal(r.review, true);
  assert.match(r.note, /REVIEW/);
  assert.match(r.note, /unobserved/i); // honest: unobserved ≠ invalid
});

test("dialectLint passes a candidate whose codes are all observed (no novel codes)", () => {
  const root = fixtureCorpus();
  const allowlist = buildAllowlist({ root, write: false });
  const candidate = "$REORDER.MIN%\nG0 X10 Z5\nG96 S800 M3\nG1 Z-3 F.012\nM2"; // all from SHAFT.MIN
  const r = dialectLint(candidate, { allowlist });
  assert.equal(r.review, false);
  assert.equal(r.unobservedG.length, 0);
  assert.equal(r.unobservedM.length, 0);
});

test("dialectLint FAILS LOUD on a family with no allowlist — never a silent pass (adversarial)", () => {
  const root = fixtureCorpus();
  const allowlist = buildAllowlist({ root, write: false });
  // Force a family that wasn't mined → hasAllowlist:false + explicit not-a-pass note.
  const r = dialectLint("G0 X1\nM30", { family: "heidenhain", allowlist });
  assert.equal(r.hasAllowlist, false);
  assert.equal(r.review, false);
  assert.match(r.note, /NOT a pass/);
});

test("loadAllowlist throws on missing/corrupt file (fail-loud, never fabricates)", () => {
  assert.throws(() => loadAllowlist("state/shared/cimco/__none__.json"), /not found/);
  const d = mkdtempSync(join(tmpdir(), "al-bad-"));
  const p = join(d, "x.json");
  wf(p, '{"families":{}}');
  assert.throws(() => loadAllowlist(p), /non-empty object/);
});

// ─── real corpus + shipped artifact (graceful-skip) ──────────────────────────

test("integration: shipped dialect-allowlists.json loads, validates, and carries okuma-osp", (t) => {
  if (!existsSync(ALLOWLIST_PATH)) return t.skip("dialect-allowlists.json not present");
  const doc = loadAllowlist(); // throws if invalid
  // JM fleet is Okuma-heavy on lathes — okuma-osp must be mined with real codes.
  assert.ok(doc.families["okuma-osp"], "okuma-osp family present");
  assert.ok(doc.families["okuma-osp"].gCodes.length > 0, "okuma-osp has observed G-codes");
  assert.ok(doc.filesScanned > 0);
  const sum = allowlistSummary(doc);
  assert.ok(Object.keys(sum.families).length >= 1);
});

test("integration: build against the real JM corpus produces a bounded honest allowlist", (t) => {
  if (!existsSync("JM DIE/CNC LATHE") && !existsSync("JM DIE/CNC MILL HAAS")) return t.skip("JM corpus not present");
  const doc = buildAllowlist({ root: "JM DIE", write: false, perDirCap: 120 });
  assert.ok(doc.filesScanned > 0, "scanned real goldens");
  // every mined family carries a positive sampleCount + sorted code arrays
  for (const [, v] of Object.entries(doc.families)) {
    assert.ok(v.sampleCount > 0);
    assert.ok(Array.isArray(v.gCodes));
  }
});
