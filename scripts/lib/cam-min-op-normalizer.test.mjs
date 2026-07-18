/**
 * Tests for cam-min-op-normalizer.mjs. INCLUDES a real-corpus-data test (not just hermetic
 * fixtures) — the recurring PRISM lesson is "a pure-core + injected-reader MUST ship a real-data
 * E2E or the reader is unproven." The real-data portion reads actual JM .MIN files from the
 * corpus file list and asserts the normalizer extracts sensible op-lists; it skip-LOUDs (never
 * silently passes) if the corpus is absent on this machine.
 *
 *   node --test scripts/lib/cam-min-op-normalizer.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeMinToOps } from "./cam-min-op-normalizer.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILELIST = resolve(__dirname, "../../state/shared/cam-drive/corpus-notes/_filelist.txt");

// Hermetic fixture mirroring the real CAP-3500.MIN structure (NAT comment-led blocks).
const FIXTURE = `$CAP-3500.MIN%
G140
M1
NAT01        (OD RGH. TURN .032R)
T010101
G50 S600
G96 S250 M3 M42
G85 NR001 D.1 U.010 W.005 F.009
NR001 G81
G80
M1
NAT03           (CENTER DRILL 1/2)
T030303
G97 S400 M03
M01
NAT05     (DRILL - .787)
T050505
G97 S500
G1 Z-1.2 F.002
M01
NAT07 (ID BORE FIN .015R)
T070707
G97 S650
M01
NAT09 (OD THREAD)
T060606
G71 X.955 Z-1. B60 D.003 F1 J32 M33 M73
M01
NAT11 (CUTOFF)
T111111
G96 S100
G1 X-.04 F.0015
M2`;

test("hermetic: NAT comment-led blocks classify to the right families in order", () => {
  const r = normalizeMinToOps(FIXTURE);
  const fams = r.ops.map((o) => o.family);
  assert.deepEqual(fams, ["OD_roughing", "drilling_centering", "drilling_centering", "bore_finish", "threading", "parting_cutoff"]);
  assert.equal(r.unknownCount, 0, "every NAT block in the fixture is classified");
  // DRILL with no G74 -> centering, not peck (refine rule)
  assert.equal(r.ops[2].family, "drilling_centering");
  // threading recognized by comment AND would also match the G71 signature
  assert.equal(r.ops[4].family, "threading");
  assert.equal(r.ops[0].confidence, "comment");
});

test("signature fallback: a NAT block with NO comment uses G-code/T-code", () => {
  const noComment = `NAT01\nT010101\nG85 NR1 D.1 U.01 W.005 F.009\nG80\nM1\nNAT02\nT060606\nG71 X1 Z-1 B60 D.003\nM1`;
  const r = normalizeMinToOps(noComment);
  assert.equal(r.ops[0].family, "OD_roughing"); // G85 LAP + T01 roster
  assert.equal(r.ops[0].confidence, "signature");
  assert.equal(r.ops[1].family, "threading");    // G71/G72 signature
});

test("conservative: a NAT block with no recognizable signal -> unknown (never fabricated)", () => {
  const r = normalizeMinToOps(`NAT01  (MYSTERY OP XYZZY)\nG0 X1\nM1`);
  assert.equal(r.opCount, 0);
  assert.equal(r.unknownCount, 1);
  assert.equal(r.unknown[0].comment, "MYSTERY OP XYZZY");
});

test("throws on empty / non-string input (fail-loud)", () => {
  assert.throws(() => normalizeMinToOps(""), /required/);
  assert.throws(() => normalizeMinToOps(null), /required/);
});

test("REAL CORPUS DATA: normalizer extracts sensible op-lists from actual JM .MIN files", () => {
  if (!existsSync(FILELIST)) {
    console.warn(`SKIP-LOUD: corpus file list absent (${FILELIST}) — real-data assertion not run on this machine`);
    return;
  }
  const paths = readFileSync(FILELIST, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (paths.length === 0) {
    console.warn("SKIP-LOUD: corpus file list is empty");
    return;
  }
  // sample across the list (every ~Nth) so we don't only hit one customer folder
  const step = Math.max(1, Math.floor(paths.length / 25));
  const sample = [];
  for (let i = 0; i < paths.length && sample.length < 25; i += step) sample.push(paths[i]);

  let read = 0, totalOps = 0, totalUnknown = 0, withCutoff = 0, withAnyOp = 0;
  for (const p of sample) {
    let text;
    try { text = readFileSync(p, "utf8"); } catch { continue; }
    read++;
    const r = normalizeMinToOps(text);
    totalOps += r.opCount;
    totalUnknown += r.unknownCount;
    if (r.opCount > 0) withAnyOp++;
    if (r.ops.some((o) => o.family === "parting_cutoff")) withCutoff++;
  }

  if (read === 0) {
    console.warn("SKIP-LOUD: file list present but no .MIN readable (other-PC corpus path) — assertion not run");
    return;
  }
  console.log(`real-data: read ${read} .MIN · totalOps ${totalOps} · unknown ${totalUnknown} · withCutoff ${withCutoff}/${read}`);
  // Real-data invariants (loose but meaningful — proves the reader actually works on live files):
  assert.ok(totalOps > 0, "must extract at least some ops across a real sample");
  assert.ok(withAnyOp >= Math.ceil(read * 0.6), `>=60% of real programs should yield >=1 op (got ${withAnyOp}/${read})`);
  const unknownRate = totalUnknown / (totalOps + totalUnknown || 1);
  assert.ok(unknownRate < 0.5, `unknown rate should be <50% on real data (got ${(unknownRate * 100).toFixed(1)}%)`);
  // bar-fed parts almost universally end in a cutoff — expect it in a meaningful share of the sample
  assert.ok(withCutoff >= 1, "at least one real program in the sample should yield parting_cutoff");
});
