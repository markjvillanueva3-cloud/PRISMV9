// Tests for hermes-unit-plan-requeue.mjs -- pure core + injected-IO orchestration (node:test).
// Reference values mirror the LIVE stuck NEEDS-REWORK units at build time (2026-07-03 verify.json):
// 0027 (rework/extend, 555 chars) redrafts -> VERIFIED; 0037 (rework/SPLIT) -> human;
// 0029 got a produced=false no-op that must NOT burn the cap.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  REDRAFT_CAP, STRUCTURAL_VERDICTS, resetStatusToNotStarted, countProducedRedrafts,
  isAwaitingVerify, disposition, requeue,
} from "./hermes-unit-plan-requeue.mjs";

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

test("resetStatusToNotStarted flips a Drafted status back to Not Started, preserving the rest", () => {
  const before = "# UNIT-0027 Title\n\n**Status**: Drafted (hermes 2026-07-02)\n**Priority**: P1\n\nBody.";
  const after = resetStatusToNotStarted(before);
  assert.match(after, /^\*\*Status\*\*: Not Started$/m);
  assert.doesNotMatch(after, /Drafted/);
  assert.match(after, /# UNIT-0027 Title/);
  assert.match(after, /\*\*Priority\*\*: P1/);
  assert.match(after, /Body\./);
});

test("resetStatusToNotStarted with an EMPTY status value does NOT eat the next line (P2 fix)", () => {
  // the old /\s*.+$/ would let \s* span the newline and delete the Priority line
  const before = "**Status**:\n**Priority**: P1\nbody";
  const after = resetStatusToNotStarted(before);
  assert.match(after, /^\*\*Status\*\*: Not Started$/m);
  assert.match(after, /\*\*Priority\*\*: P1/); // still present -- NOT eaten
});

test("resetStatusToNotStarted returns null when there is no Status line", () => {
  assert.equal(resetStatusToNotStarted("# UNIT-9999\n\nNo status here."), null);
  assert.equal(resetStatusToNotStarted(""), null);
});

test("countProducedRedrafts counts ONLY produced:true rows (no-op spawns never burn the cap)", () => {
  const ledger = [
    JSON.stringify({ unitId: "0029", action: "draft", ok: true }),
    JSON.stringify({ unitId: "0029", action: "redraft-reset", ok: true, produced: false }), // dark-lane no-op
    JSON.stringify({ unitId: "0029", action: "redraft-reset", ok: true, produced: true }),  // real
    JSON.stringify({ unitId: "0029", action: "redraft-reset", ok: true }),                  // legacy (no field) -> NOT counted
    "NOT JSON -- skipped, not thrown",
    JSON.stringify({ unitId: "0037", action: "redraft-reset", ok: true, produced: true }),
  ].join("\n");
  assert.equal(countProducedRedrafts(ledger, "0029"), 1); // only the produced:true row
  assert.equal(countProducedRedrafts(ledger, "0037"), 1);
  assert.equal(countProducedRedrafts(ledger, "9999"), 0);
  assert.equal(countProducedRedrafts("", "0029"), 0);
});

test("isAwaitingVerify: draft newer than verify -> awaiting; else not", () => {
  assert.equal(isAwaitingVerify(2000, 1000), true);   // redraft landed after last verdict
  assert.equal(isAwaitingVerify(1000, 2000), false);  // verdict is newer -> re-target
  assert.equal(isAwaitingVerify(0, 2000), false);     // no draft
  assert.equal(isAwaitingVerify(2000, 0), false);     // no verify
});

test("disposition: NEEDS-REWORK extend under cap, not awaiting/capped -> redraft", () => {
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "extend" }, 0, {}), "redraft");
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "build" }, REDRAFT_CAP - 1, {}), "redraft");
});

test("disposition: awaiting re-verify short-circuits before any redraft", () => {
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "extend" }, 0, { awaiting: true }), "awaiting-verify");
});

test("disposition: structural split/replace -> needs-human (redraft cannot fix)", () => {
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "split" }, 0, {}), "needs-human");
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "replace" }, 0, {}), "needs-human");
  assert.ok(STRUCTURAL_VERDICTS.has("split") && STRUCTURAL_VERDICTS.has("replace"));
});

test("disposition: drafter-fail-capped -> needs-human even at 0 produced attempts (no silent no-op loop)", () => {
  // an un-draftable unit (too large / lanes dark >= FAIL_CAP) has 0 PRODUCED redrafts forever;
  // without the failCapped route it would loop invisibly (scrutiny arm C P1).
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "extend" }, 0, { failCapped: true }), "needs-human");
  // failCapped wins over a would-be redraft, but structural/awaiting still take precedence
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "extend" }, 0, { failCapped: true, awaiting: true }), "awaiting-verify");
});

test("disposition: at/over the PRODUCED cap -> needs-human (bounds the loop)", () => {
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "extend" }, REDRAFT_CAP, {}), "needs-human");
  assert.equal(disposition({ verdict: "NEEDS-REWORK", gapVerdict: "extend" }, REDRAFT_CAP + 3, {}), "needs-human");
});

test("disposition: non-rework verdicts skipped; REDRAFT_CAP is a small positive bound", () => {
  assert.equal(disposition({ verdict: "VERIFIED", gapVerdict: "extend" }, 0, {}), "skip");
  assert.equal(disposition(null, 0, {}), "skip");
  assert.ok(Number.isInteger(REDRAFT_CAP) && REDRAFT_CAP >= 1 && REDRAFT_CAP <= 5);
});

// ---------------------------------------------------------------------------
// Injected-IO orchestration (temp fixture dir + fake spawnFn) -- the P2 "orchestration untested" fix
// ---------------------------------------------------------------------------

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "requeue-test-"));
  const workDir = path.join(root, "work");
  const unitsDir = path.join(root, "units");
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(unitsDir, { recursive: true });
  const paths = { workDir, unitsDir, ledger: path.join(root, "ledger.jsonl"), lockDir: path.join(root, ".lock") };
  const writeVerify = (id, obj) => fs.writeFileSync(path.join(workDir, `UNIT-${id}-verify.json`), JSON.stringify({ id, ...obj }));
  const writeSpec = (id, status) => fs.writeFileSync(path.join(unitsDir, `UNIT-${id}-x.md`), `# UNIT-${id}\n\n**Status**: ${status}\n**Priority**: P1\n\nspec body`);
  // A genuinely-stuck draft is OLDER than its verify verdict (the verify graded it) -> stamp an old
  // mtime so it is NOT mistaken for a fresh redraft awaiting re-verification (the awaiting gate).
  const writeDraft = (id, body) => {
    const p = path.join(workDir, `UNIT-${id}-draft.md`);
    fs.writeFileSync(p, body);
    const old = 1_000_000; // ~1970, safely older than the just-written verify.json
    fs.utimesSync(p, old, old);
  };
  const specText = (id) => fs.readFileSync(path.join(unitsDir, fs.readdirSync(unitsDir).find(f => f.startsWith(`UNIT-${id}`))), "utf8");
  const ledgerRows = () => { try { return fs.readFileSync(paths.ledger, "utf8").trim().split(/\n/).filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } };
  const cleanup = () => { try { fs.rmSync(root, { recursive: true, force: true }); } catch {} };
  return { root, paths, writeVerify, writeSpec, writeDraft, specText, ledgerRows, cleanup };
}

test("requeue --apply: a produced redraft resets Status, backs up the draft, ledgers produced:true", () => {
  const fx = makeFixture();
  try {
    fx.writeVerify("0027", { verdict: "NEEDS-REWORK", gapVerdict: "extend", critical: ["c"], metrics: { bodyChars: 555 } });
    fx.writeSpec("0027", "Drafted (hermes 2026-07-02)");
    fx.writeDraft("0027", "thin 555-char seed");
    // fake drafter: emits a fresh draft + reports produced
    const spawnFn = (id) => { fs.writeFileSync(path.join(fx.paths.workDir, `UNIT-${id}-draft.md`), "x".repeat(6000)); return { exit: 0, produced: true, tail: `OK UNIT-${id} via ollama` }; };
    const out = requeue({ apply: true, paths: fx.paths, spawnFn, nowMs: 1000, cap: 3 });

    assert.equal(out.redrafted, 1);
    assert.match(fx.specText("0027"), /^\*\*Status\*\*: Not Started$/m); // reset for the drafter
    assert.ok(fs.existsSync(path.join(fx.paths.workDir, "UNIT-0027-draft.thin-1000.bak")));       // seed preserved
    assert.equal(fs.readFileSync(path.join(fx.paths.workDir, "UNIT-0027-draft.md"), "utf8").length, 6000); // fresh draft
    const rows = fx.ledgerRows().filter(r => r.action === "redraft-reset");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].produced, true);
    assert.equal(rows[0].ok, true);
  } finally { fx.cleanup(); }
});

test("requeue --apply: a NO-OP spawn (produced:false, dark lanes) does NOT burn the cap", () => {
  const fx = makeFixture();
  try {
    fx.writeVerify("0029", { verdict: "NEEDS-REWORK", gapVerdict: "extend", critical: [], metrics: { bodyChars: 400 } });
    fx.writeSpec("0029", "Drafted (hermes 2026-07-02)");
    fx.writeDraft("0029", "seed");
    const darkSpawn = () => ({ exit: 0, produced: false, tail: "both lanes dark" }); // no draft emitted
    // fire twice -- both no-ops
    requeue({ apply: true, paths: fx.paths, spawnFn: darkSpawn, nowMs: 1000, cap: 3 });
    requeue({ apply: true, paths: fx.paths, spawnFn: darkSpawn, nowMs: 2000, cap: 3 });
    // 2 redraft-reset rows, but BOTH produced:false -> countProducedRedrafts == 0 -> still redraftable
    const rows = fx.ledgerRows().filter(r => r.action === "redraft-reset");
    assert.equal(rows.length, 2);
    assert.equal(countProducedRedrafts(fs.readFileSync(fx.paths.ledger, "utf8"), "0029"), 0);
    // a third run still sees it as redraftable (would-redraft in preview), NOT needs-human
    const preview = requeue({ apply: false, paths: fx.paths, spawnFn: darkSpawn, nowMs: 3000, cap: 3 });
    assert.equal(preview.actions.find(a => a.id === "0029").action, "would-redraft");
  } finally { fx.cleanup(); }
});

test("requeue: structural split -> needs-human + durable NEEDS-HUMAN.md, never redrafted", () => {
  const fx = makeFixture();
  try {
    fx.writeVerify("0037", { verdict: "NEEDS-REWORK", gapVerdict: "split", critical: ["c"], metrics: { bodyChars: 958 } });
    fx.writeSpec("0037", "Drafted (hermes 2026-07-02)");
    let spawned = false;
    const out = requeue({ apply: true, paths: fx.paths, spawnFn: () => { spawned = true; return { produced: true }; }, nowMs: 1000, cap: 3 });
    assert.equal(spawned, false); // never spawns a redraft
    assert.equal(out.actions.find(a => a.id === "0037").action, "needs-human");
    const nh = fs.readFileSync(path.join(fx.paths.workDir, "NEEDS-HUMAN.md"), "utf8");
    assert.match(nh, /0037/);
    assert.match(nh, /structural:split/);
  } finally { fx.cleanup(); }
});

test("requeue: over the produced cap -> needs-human (bounds the loop with real ledger)", () => {
  const fx = makeFixture();
  try {
    fx.writeVerify("0024", { verdict: "NEEDS-REWORK", gapVerdict: "extend", critical: [], metrics: { bodyChars: 300 } });
    fx.writeSpec("0024", "Drafted");
    // seed the ledger with REDRAFT_CAP produced attempts already
    fs.writeFileSync(fx.paths.ledger, Array.from({ length: REDRAFT_CAP }, () =>
      JSON.stringify({ unitId: "0024", action: "redraft-reset", ok: true, produced: true })).join("\n") + "\n");
    let spawned = false;
    const out = requeue({ apply: true, paths: fx.paths, spawnFn: () => { spawned = true; return { produced: true }; }, nowMs: 1000, cap: 3 });
    assert.equal(spawned, false);
    assert.equal(out.actions.find(a => a.id === "0024").action, "needs-human");
    assert.match(out.actions.find(a => a.id === "0024").reason, /redraft-cap/);
  } finally { fx.cleanup(); }
});

test("requeue: a drafter-fail-capped unit -> needs-human, NEVER re-spawned (arm C P1: no silent loop)", () => {
  const fx = makeFixture();
  try {
    fx.writeVerify("0030", { verdict: "NEEDS-REWORK", gapVerdict: "extend", critical: ["c"], metrics: { bodyChars: 400 } });
    fx.writeSpec("0030", "Not Started");
    // seed 3 CONSECUTIVE failed drafts -> failCappedIds (cap 3) includes 0030 (un-draftable)
    fs.writeFileSync(fx.paths.ledger, [
      JSON.stringify({ unitId: "0030", action: "draft", ok: false }),
      JSON.stringify({ unitId: "0030", action: "draft", ok: false }),
      JSON.stringify({ unitId: "0030", action: "draft", ok: false }),
    ].join("\n") + "\n");
    let spawned = false;
    const out = requeue({ apply: true, paths: fx.paths, spawnFn: () => { spawned = true; return { produced: false }; }, nowMs: 1000, cap: 3 });
    assert.equal(spawned, false); // never re-spawns an un-draftable unit -> loop terminates
    assert.equal(out.actions.find(a => a.id === "0030").action, "needs-human");
    assert.match(out.actions.find(a => a.id === "0030").reason, /fail-capped/);
    assert.match(fs.readFileSync(path.join(fx.paths.workDir, "NEEDS-HUMAN.md"), "utf8"), /0030/);
  } finally { fx.cleanup(); }
});

test("requeue: a fresh draft newer than its verdict -> awaiting-verify (no wasted redraft)", () => {
  const fx = makeFixture();
  try {
    // write verify FIRST, then a NEWER draft (draft mtime > verify mtime)
    fx.writeVerify("0028", { verdict: "NEEDS-REWORK", gapVerdict: "extend", critical: [], metrics: { bodyChars: 500 } });
    // ensure the draft is strictly newer
    const draftPath = path.join(fx.paths.workDir, "UNIT-0028-draft.md");
    fs.writeFileSync(draftPath, "fresh redraft awaiting verify");
    const later = Date.now() / 1000 + 60;
    fs.utimesSync(draftPath, later, later);
    let spawned = false;
    const out = requeue({ apply: true, paths: fx.paths, spawnFn: () => { spawned = true; return { produced: true }; }, nowMs: 1000, cap: 3 });
    assert.equal(spawned, false);
    assert.equal(out.actions.find(a => a.id === "0028").action, "awaiting-verify");
  } finally { fx.cleanup(); }
});

test("requeue --apply: the lock serializes -- a held lock makes a second run a clean no-op", () => {
  const fx = makeFixture();
  try {
    fx.writeVerify("0027", { verdict: "NEEDS-REWORK", gapVerdict: "extend", critical: [], metrics: { bodyChars: 500 } });
    fx.writeSpec("0027", "Drafted");
    // pre-create the lock dir (simulate a concurrent holder) with a DIFFERENT, live pid
    fs.mkdirSync(fx.paths.lockDir, { recursive: true });
    fs.writeFileSync(path.join(fx.paths.lockDir, "pid"), String(process.pid + 1));
    let spawned = false;
    const out = requeue({ apply: true, paths: fx.paths, spawnFn: () => { spawned = true; return { produced: true }; }, nowMs: 1000, cap: 3 });
    assert.equal(spawned, false);
    assert.equal(out.locked, false);
    assert.match(out.actions[0].reason, /lock/);
  } finally { fx.cleanup(); }
});

test("requeue preview (no --apply) never mutates: no spawn, no Status change, no ledger", () => {
  const fx = makeFixture();
  try {
    fx.writeVerify("0027", { verdict: "NEEDS-REWORK", gapVerdict: "extend", critical: [], metrics: { bodyChars: 500 } });
    fx.writeSpec("0027", "Drafted (hermes 2026-07-02)");
    let spawned = false;
    const out = requeue({ apply: false, paths: fx.paths, spawnFn: () => { spawned = true; return { produced: true }; }, nowMs: 1000 });
    assert.equal(spawned, false);
    assert.match(fx.specText("0027"), /Drafted/); // unchanged
    assert.equal(fx.ledgerRows().length, 0);
    assert.equal(out.actions.find(a => a.id === "0027").action, "would-redraft");
  } finally { fx.cleanup(); }
});
