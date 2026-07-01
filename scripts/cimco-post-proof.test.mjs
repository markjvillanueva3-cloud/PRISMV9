// cimco-post-proof.test.mjs — real-behavior tests for the JM post-proof readiness ledger.
// Run: node --test scripts/cimco-post-proof.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  resolveGoldenDirs,
  groupByBaseName,
  detectVolatile,
  volatileMask,
  classifyProofMethod,
  buildProofLedger,
  renderMd,
  run,
  bodySimilarity,
  NAME_COLLISION_THRESHOLD,
} from "./cimco-post-proof.mjs";

// ─── pure helpers ────────────────────────────────────────────────────────────

test("groupByBaseName collapses space/extension/case variants (drift detection)", () => {
  const g = groupByBaseName(["x/ALL STAR .NC", "x/ALL STAR.NC", "y/B-0506-6.NC"]);
  assert.equal(g["ALLSTAR"].length, 2); // "ALL STAR .NC" and "ALL STAR.NC" collapse to one base
  assert.equal(g["B-0506-6"].length, 1);
});

test("detectVolatile finds DATE/TIME/file-path header lines (block byte-equivalence)", () => {
  const nc = "%\nO1\n(DATE=DD-MM-YY - 16-07-20 TIME=HH:MM - 10:42)\n(NC FILE - C:\\USERS\\X\\ALL STAR.NC)\nG0 X1";
  const found = detectVolatile(nc);
  assert.ok(found.includes("date"));
  assert.ok(found.includes("time"));
  assert.ok(found.includes("filepath"));
  assert.equal(detectVolatile("%\nO1\nG0 X1").length, 0); // clean program → no volatile headers
});

test("volatileMask neutralizes header churn so a header-only re-save compares equal", async () => {
  const { compareNC } = await import("./lib/nc-normalize.mjs");
  const a = "%\nO1\n(DATE=DD-MM-YY - 16-07-20 TIME=HH:MM - 10:42)\nG0 X1\nM30\n%";
  const b = "%\nO1\n(DATE=DD-MM-YY - 02-06-26 TIME=HH:MM - 14:05)\nG0 X1\nM30\n%"; // only the date/time differ
  assert.equal(compareNC(a, b).equal, false, "raw: header churn makes them differ");
  assert.equal(compareNC(a, b, { volatileCommentMask: volatileMask() }).equal, true, "masked: pure copy is equal");
});

test("classifyProofMethod is honest: real proof gated, EDM routed to PRISM", () => {
  const mill = classifyProofMethod({ type: "mill", status: "needs-authoring", cimcoMatch: null });
  assert.equal(mill.method, "golden-integrity-audit");
  assert.ok(mill.blockers.some((b) => /live app|headless/.test(b)));
  assert.ok(mill.blockers.some((b) => /CAM source/.test(b)));
  const edm = classifyProofMethod({ type: "sinker_edm" });
  assert.equal(edm.method, "prism-discharge-physics");
});

test("resolveGoldenDirs routes by machine + uses a fixture root (no real corpus needed)", () => {
  // non-existent root → no dirs resolve (graceful)
  const dirs = resolveGoldenDirs({ machine_name: "Haas VF-2", type: "mill" }, "/no/such/root");
  assert.deepEqual(dirs, []);
});

// ─── buildProofLedger on a synthetic fixture root ────────────────────────────

import { mkdtempSync, mkdirSync, writeFileSync as wf } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("buildProofLedger runs the real compareNC drift audit + flags content drift vs header-only churn", () => {
  const root = mkdtempSync(join(tmpdir(), "jmgold-"));
  mkdirSync(join(root, "CNC MILL HAAS", "ALL STAR"), { recursive: true });
  // two same-base files: one is a header-only re-save (masked-equal via the Mastercam dialect), the other genuinely differs
  wf(join(root, "CNC MILL HAAS", "ALL STAR", "ALL STAR .NC"), "%\nO1\n(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)\nG0 X1\nM30\n%");
  wf(join(root, "CNC MILL HAAS", "ALL STAR", "ALL STAR.NC"), "%\nO1\n(DATE=DD-MM-YY - 02-06-26 TIME=HH:MM - 09:12)\nG0 X1\nM30\n%"); // header-only churn
  mkdirSync(join(root, "CNC MILL HAAS", "PART2"), { recursive: true });
  wf(join(root, "CNC MILL HAAS", "PART2", "PART2.NC"), "%\nO2\nG0 X1\nM30\n%");
  wf(join(root, "CNC MILL HAAS", "PART2", "PART2 .NC"), "%\nO2\nG0 X9\nM30\n%"); // genuine content drift (X1 vs X9)

  const simMap = {
    machines: [
      { machine_id: "VMC-03", machine_name: "Haas VF-2", controller_family: "haas", controller_model: "PRE-NGC", type: "mill", status: "native-cimco-match", cimcoMatch: { displayName: "Haas VF-2TR", unit: "unknown" } },
      { machine_id: "EDM-01", machine_name: "Mitsubishi EA12S", controller_family: "mitsubishi", controller_model: "FP80S", type: "sinker_edm", status: "not-applicable", cimcoMatch: null },
    ],
  };
  const ledger = buildProofLedger(simMap, { root });
  const haas = ledger.machines.find((m) => m.machine_id === "VMC-03");
  assert.equal(haas.driftGroups, 2, "ALLSTAR + PART2");
  assert.equal(haas.driftWithRealDiff, 1, "only PART2 (X1 vs X9) is genuine content drift; ALLSTAR is header-only");
  assert.ok(haas.volatileHeaderTypes.includes("date"));
  assert.ok(haas.goldenCount >= 4);
  // dialect-aware classification: ALLSTAR (date-only churn) is volatile-header-only; PART2 (X1 vs X9) is semantic-drift
  const allstar = haas.driftDetail.find((d) => d.base === "ALLSTAR");
  const part2 = haas.driftDetail.find((d) => d.base === "PART2");
  assert.equal(allstar.classification, "volatile-header-only");
  assert.equal(part2.classification, "semantic-drift");

  const edm = ledger.machines.find((m) => m.machine_id === "EDM-01");
  assert.equal(edm.proofMethod, "prism-discharge-physics");

  // markdown renders without throwing and includes the doctrine
  const md = renderMd(ledger);
  assert.match(md, /Post-Proof Readiness/);
  assert.match(md, /VMC-03/);
});

// ─── bodySimilarity + name-collision classification (U-CIMCO-DRIFT-GROUPING-FIX) ──

test("bodySimilarity: identical=1, disjoint=0, partial in-between; ignores $NAME.MIN% + comments", () => {
  const a = "$WIDGET.MIN%\nNAT01\nG0 X1\nG1 Z-1\nM30";
  assert.equal(bodySimilarity(a, a), 1, "identical → 1");
  // Same body, only the $NAME.MIN% echo + a paren comment differ → still ~1 (those lines are dropped).
  const aPrime = "$OTHERNAME.MIN%\n(A COMMENT)\nNAT01\nG0 X1\nG1 Z-1\nM30";
  assert.ok(bodySimilarity(a, aPrime) === 1, "name/comment-only difference → similarity 1");
  // Totally different programs (different parts) → low.
  const b = "$THING.MIN%\nNAT09\nG0 X88\nG1 Z-44\nG2 X5\nM30";
  assert.ok(bodySimilarity(a, b) < NAME_COLLISION_THRESHOLD, `different parts → < ${NAME_COLLISION_THRESHOLD}`);
});

test("buildProofLedger: a same-base-name pair of DIFFERENT parts is a name-collision, NOT true drift", () => {
  const root = mkdtempSync(join(tmpdir(), "jmcoll-"));
  // CASE1250 reused across two customer subdirs — DIFFERENT parts (low body overlap).
  mkdirSync(join(root, "CNC LATHE", "WSR"), { recursive: true });
  mkdirSync(join(root, "CNC LATHE", "THOMASON"), { recursive: true });
  wf(join(root, "CNC LATHE", "WSR", "CASE1250.MIN"), "$CASEWSR.MIN%\nNAT01\nG0 X20 Z20\nG50 S800\nG1 Z-1.5 F.01\nM30");
  wf(join(root, "CNC LATHE", "THOMASON", "CASE1250.MIN"), "$CASETHOM.MIN%\nNAT07\nG0 X3 Z1\nG96 S1200 M3\nG1 X-0.5 F.005\nG2 X9 Z-4\nM30");
  // A genuine same-program re-save in ONE dir (high overlap, only $NAME differs) → volatile-header-only.
  mkdirSync(join(root, "CNC LATHE", "ACME"), { recursive: true });
  wf(join(root, "CNC LATHE", "ACME", "SLEEVE.MIN"), "$SLEEVE.MIN%\nNAT01\nG0 X1 Z1\nG1 Z-2 F.01\nM30");
  wf(join(root, "CNC LATHE", "ACME", "SLEEVE .MIN"), "$SLEEVECOPY.MIN%\nNAT01\nG0 X1 Z1\nG1 Z-2 F.01\nM30");

  const simMap = {
    machines: [
      { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M", controller_family: "okuma", controller_model: "OSP", type: "lathe", status: "generic-template", cimcoMatch: { displayName: "Cimco Lathe 3 Axis C", unit: "inch" } },
    ],
  };
  const ledger = buildProofLedger(simMap, { root });
  const lth = ledger.machines.find((m) => m.machine_id === "LTH-01");
  const caseGroup = lth.driftDetail.find((d) => d.base === "CASE1250");
  const sleeveGroup = lth.driftDetail.find((d) => d.base === "SLEEVE");

  // CASE1250 across customers → semantic-drift classification BUT flagged as a name collision (not true drift).
  assert.equal(caseGroup.classification, "semantic-drift");
  assert.equal(caseGroup.nameCollision, true, "different parts sharing a filename = name collision");
  assert.ok(caseGroup.similarity < NAME_COLLISION_THRESHOLD);
  // SLEEVE re-save (only $NAME echo differs) → masked-equal → volatile-header-only, NOT a collision.
  assert.equal(sleeveGroup.classification, "volatile-header-only");
  assert.equal(sleeveGroup.nameCollision, false);

  // Rollup: the collision is excluded from TRUE copy-drift; counted under nameCollisions.
  assert.equal(lth.driftWithRealDiff, 0, "no TRUE copy-drift (the only semantic-drift was a name collision)");
  assert.equal(lth.nameCollisions, 1);
  assert.equal(ledger.rollup.nameCollisions, 1);
  // markdown surfaces the collisions column
  assert.match(renderMd(ledger), /name collisions/i);
});

// ─── live corpus integration (graceful-skip) ─────────────────────────────────

test("integration: run() against the real JM corpus produces a bounded, honest ledger", (t) => {
  if (!existsSync("state/shared/cimco/jm-fleet-sim-map.json") || !existsSync("JM DIE/CNC MILL HAAS"))
    return t.skip("sim map or JM corpus not present");
  const ledger = run({ write: false });
  assert.ok(ledger.jmMachineCount >= 15);
  const haas = ledger.machines.find((m) => /Haas VF-2/.test(m.machine_name));
  assert.ok(haas, "Haas VF-2 present");
  assert.ok(haas.goldenCount >= 1, "Haas VF-2 resolves real golden programs");
  assert.ok(haas.driftGroups >= 1, "Haas corpus has same-base-name groups (real compareNC drift audit ran)");
  // every machine carries an honest proof-method + blockers (no faked proof)
  for (const m of ledger.machines) assert.ok(typeof m.proofMethod === "string" && m.proofMethod.length > 0);
});
