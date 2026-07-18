/**
 * quoting-train-cycle.guard-preflight — real-subprocess oracle for the U-QP-BASELINE-GUARD
 * + U-QP-GUARD-VOLUME-AND-SYNTH preflight wired into the train-cycle CLI.
 *
 * Hermetic unit tests prove validateBaseline in isolation; this proves the WIRING —
 * that the CLI actually (a) REFUSES a degenerate baseline (exit 2), (b) ADMITS a
 * high-volume / synthetic baseline but surfaces the advisory LOUDLY on stderr, (c) does
 * NOT false-warn a real-shaped baseline, (d) honors --force-degenerate, and (e) still
 * owns the 0-record / missing-file rejects. The recurring PRISM lesson: a pure-core +
 * injected-readers design MUST ship one real subprocess test (hermetic fakes don't prove
 * production wiring).
 *
 * Assertions key on exit-code-vs-2 (the preflight verdict) + stderr content, NEVER on
 * exit 0 — the admitted paths load the training engine, which may be present (trains) or
 * absent (exits 1); both are !== 2 and both print the preflight advisory first.
 *
 * Run: node --test scripts/quoting-train-cycle.guard-preflight.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-GUARD-VOLUME-AND-SYNTH (slot:charlie 2026-06-01)
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, ".."); // scripts/ sits directly under the repo root
const CLI = join(HERE, "quoting-train-cycle.mjs");
const TMP = mkdtempSync(join(tmpdir(), "qtc-preflight-"));
after(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
});

let seq = 0;
function baselineFile(records, note = "test") {
  const p = join(TMP, `baseline-${seq++}.json`);
  writeFileSync(p, JSON.stringify({ generated_iso: "2026-06-01T00:00:00.000Z", source: note, records }), "utf8");
  return p;
}
function runCycle(args, timeoutMs = 120000) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    input: "",
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", out: (r.stdout ?? "") + (r.stderr ?? "") };
}

// ---- fixtures ----------------------------------------------------------------
function degenerateRecords(n = 12) {
  return Array.from({ length: n }, () => ({
    customer: "Okuma_Multus_B250II",
    part_id: "P",
    actual_revenue_usd: 10,
    estimated_time_in_cut_s: 600,
    machine_rate_usd_per_hr: 95,
    estimated_material_spend_usd: 60,
    machine_class: "lathe",
  }));
}
// synthetic but ADMISSIBLE: real names, fixed markup, quantized 4-value time grid.
function syntheticAdmissibleRecords(n = 30) {
  const times = [300, 600, 1800, 3600];
  const rates = [85, 95, 110];
  const mats = [40, 60, 80];
  return Array.from({ length: n }, (_, i) => {
    const t = times[i % times.length];
    const rate = rates[i % rates.length];
    const mat = mats[i % mats.length];
    const cost = rate * (t / 3600) + mat;
    return {
      customer: `RealCo ${i % 15}`,
      part_id: `P${i}`,
      actual_revenue_usd: +(cost * 1.4).toFixed(2),
      estimated_time_in_cut_s: t,
      machine_rate_usd_per_hr: rate,
      estimated_material_spend_usd: mat,
    };
  });
}
// real-shaped: varied markup + continuous cut-times => NO synthetic warning, no degeneracy.
function realShapedRecords(n = 30) {
  const rates = [85, 95, 110];
  const mats = [40, 60, 80];
  return Array.from({ length: n }, (_, i) => {
    const t = 120 + i * 60; // n distinct cut-times (continuous)
    const rate = rates[i % rates.length];
    const mat = mats[i % mats.length];
    const cost = rate * (t / 3600) + mat;
    const markup = 1.4 * (1 + (((i % 11) - 5) / 5) * 0.6); // scatters realized margin
    return {
      customer: `RealCo ${i % 15}`,
      part_id: `P${i}`,
      actual_revenue_usd: +(cost * markup).toFixed(2),
      estimated_time_in_cut_s: t,
      machine_rate_usd_per_hr: rate,
      estimated_material_spend_usd: mat,
    };
  });
}

// ---- tests -------------------------------------------------------------------
test("preflight T1: degenerate baseline => exit 2 + REFUSE + degeneracy reason", () => {
  const r = runCycle(["--baseline", baselineFile(degenerateRecords()), "--no-write"]);
  assert.equal(r.status, 2, `expected REFUSE exit 2, got ${r.status}\n${r.out}`);
  assert.match(r.stderr, /REFUSE/);
  assert.match(r.stderr, /machine_name_customers|constant_revenue/);
});

test("preflight T2: synthetic but admissible => NOT refused (exit!=2) + LOUD synthetic advisory", () => {
  const r = runCycle(["--baseline", baselineFile(syntheticAdmissibleRecords()), "--no-write"]);
  assert.notEqual(r.status, 2, `synthetic-admissible must NOT be refused; got exit 2\n${r.out}`);
  assert.match(r.stderr, /ADVISORY/);
  assert.match(r.stderr, /synthetic_revenue_dominant/);
});

test("preflight T3: real-shaped baseline (varied markup, continuous times) => admitted, NO synthetic warning", () => {
  const r = runCycle(["--baseline", baselineFile(realShapedRecords()), "--no-write"]);
  assert.notEqual(r.status, 2, `real-shaped must NOT be refused; got exit 2\n${r.out}`);
  assert.doesNotMatch(r.stderr, /synthetic_revenue_dominant/, "must not false-warn a real-shaped baseline");
});

test("preflight T4: --force-degenerate overrides the refuse (exit != 2)", () => {
  const r = runCycle(["--baseline", baselineFile(degenerateRecords()), "--no-write", "--force-degenerate"]);
  assert.notEqual(r.status, 2, `--force-degenerate must bypass REFUSE; got exit 2\n${r.out}`);
});

test("preflight T5 (adversarial): empty records => exit 1 (train-cycle owns the 0-record reject, not the guard)", () => {
  const r = runCycle(["--baseline", baselineFile([]), "--no-write"]);
  assert.equal(r.status, 1, `expected exit 1 for 0 records, got ${r.status}\n${r.out}`);
  assert.match(r.out, /0 records|no records/i);
});

test("preflight T6 (adversarial): missing baseline file => exit 1", () => {
  const r = runCycle(["--baseline", join(TMP, "does-not-exist.json"), "--no-write"]);
  assert.equal(r.status, 1, `expected exit 1 for missing file, got ${r.status}\n${r.out}`);
});

test("preflight T7 (--json): synthetic baseline carries baseline_warnings when the cycle completes", () => {
  const r = runCycle(["--baseline", baselineFile(syntheticAdmissibleRecords()), "--no-write", "--json"]);
  assert.notEqual(r.status, 2, "synthetic-admissible must not be refused under --json");
  // stdout is one JSON line. Parse the LAST non-empty line (engine logs, if any, precede it).
  const line = r.stdout.trim().split("\n").filter(Boolean).pop();
  let json = null;
  try {
    json = JSON.parse(line);
  } catch {
    /* engine may have failed to load in this env -> non-JSON; the field-bearing path is conditional */
  }
  if (json && json.ok === true) {
    assert.ok(
      Array.isArray(json.baseline_warnings) &&
        json.baseline_warnings.some((w) => w.startsWith("synthetic_revenue_dominant")),
      `completed --json result must carry baseline_warnings; got ${JSON.stringify(json.baseline_warnings)}`,
    );
  }
});

test("preflight T8 (--json): completed cycle carries real_distribution_match (advisory, against=line)", () => {
  // U-QP-EXTPRICE-CALIB wiring oracle: the train-cycle feeds the model's per-part-job FMV predictions
  // (report.predicted_fmv_usd_all) through OutboundPriceIndexEngine.compareToPredicted({against:"line"})
  // and surfaces the result under real_distribution_match. Proves the wire end-to-end (the engine is
  // 35-unit-tested in isolation; this proves it actually reaches the CLI --json output at the right grain).
  const r = runCycle(["--baseline", baselineFile(syntheticAdmissibleRecords()), "--no-write", "--json"]);
  assert.notEqual(r.status, 2, "synthetic-admissible must not be refused under --json");
  const line = r.stdout.trim().split("\n").filter(Boolean).pop();
  let json = null;
  try {
    json = JSON.parse(line);
  } catch {
    /* engine/dist may be absent in this env -> non-JSON; the field-bearing path is conditional (like T7) */
  }
  if (json && json.ok === true) {
    assert.ok("real_distribution_match" in json, "completed --json result must carry the real_distribution_match key (advisory)");
    const rm = json.real_distribution_match;
    // When the real outbound ext_price reference is present (dist built + jm-sold-orders.json), the
    // match computes; assert it used the UNITS-CORRECT per-line grain and is flagged advisory.
    if (rm && rm.ok === true) {
      assert.equal(rm.against, "line", "FMV predictions must compare against the per-line ext_price grain (units-correct)");
      assert.match(String(rm.verdict), /^(aligned|predicted-high|predicted-low)$/, `unexpected verdict ${rm.verdict}`);
      assert.equal(rm.advisory, true, "real_distribution_match must be flagged advisory (never alters the factor)");
      assert.ok(rm.real_n > 0, "a present reference must have real_n > 0");
    }
  }
});

test("preflight T9 (--json): real_distribution_match carries reference-reliability fields (U-QP-OUTBOUND-REF-RELIABILITY)", () => {
  // The reliability guard must reach the CLI --json so a consumer can tell whether median_ratio/verdict
  // are calibrated or DIRECTIONAL (too-few samples / OCR $1 spike). Conditional on the engine being
  // importable (like T7/T8); the invariant below is the load-bearing R9 intent check.
  const r = runCycle(["--baseline", baselineFile(syntheticAdmissibleRecords()), "--no-write", "--json"]);
  assert.notEqual(r.status, 2, "synthetic-admissible must not be refused under --json");
  const line = r.stdout.trim().split("\n").filter(Boolean).pop();
  let json = null;
  try {
    json = JSON.parse(line);
  } catch {
    /* engine/dist may be absent in this env -> non-JSON; the field-bearing path is conditional */
  }
  if (json && json.ok === true) {
    const rm = json.real_distribution_match;
    if (rm && rm.ok === true) {
      assert.equal(typeof rm.reference_reliable, "boolean", "real_distribution_match must carry a boolean reference_reliable");
      assert.match(
        String(rm.reliability_verdict),
        /^(ok|insufficient-reference|degenerate-reference)$/,
        `unexpected reliability_verdict ${rm.reliability_verdict}`,
      );
      // Honesty invariant: reliable IFF verdict is exactly "ok" — the boolean can never disagree with the verdict.
      assert.equal(
        rm.reference_reliable,
        rm.reliability_verdict === "ok",
        "reference_reliable must equal (reliability_verdict === 'ok')",
      );
    }
  }
});

// ---- U-QP-BASELINE-FALLBACK wiring oracles (charlie 2026-06-02) ----------------
// These prove the guard-aware fallback resolver is actually wired into the CLI: when
// the CONFIGURED baseline is degenerate, the loop falls back to an admissible corpus
// and TRAINS (revives the dead loop) rather than exiting 2 — but only when fallback is
// enabled (--fallback-corpus / bare default), never when the operator forces strict.
// Assertions key on exit-code-vs-2 + stderr FALLBACK/REFUSE markers, NEVER on exit 0
// (the admitted path loads the engine, which may train [0] or be absent [1]; both !=2).

test("fallback T10: degenerate configured + admissible --fallback-corpus => trains on fallback (exit != 2) + FALLBACK advisory", () => {
  const fb = baselineFile(realShapedRecords(), "fallback-corpus");
  const r = runCycle(["--baseline", baselineFile(degenerateRecords()), "--fallback-corpus", fb, "--no-write"]);
  assert.notEqual(r.status, 2, `degenerate configured + admissible fallback must NOT refuse; got exit 2\n${r.out}`);
  assert.match(r.stderr, /FALLBACK:/, "must emit the LOUD fallback advisory naming the bypassed configured baseline");
  assert.match(r.stderr, /REFUSED by the poison-guard/, "advisory must state WHY the configured baseline was bypassed");
  assert.doesNotMatch(r.stderr, /REFUSE: configured baseline is degenerate and no fallback/, "must not also emit the no-fallback REFUSE");
});

test("fallback T11: degenerate configured + --no-fallback (with a fallback available) => strict REFUSE (exit 2)", () => {
  const fb = baselineFile(realShapedRecords(), "fallback-corpus");
  const r = runCycle(["--baseline", baselineFile(degenerateRecords()), "--fallback-corpus", fb, "--no-fallback", "--no-write"]);
  assert.equal(r.status, 2, `--no-fallback must force strict REFUSE even when a fallback exists; got ${r.status}\n${r.out}`);
  assert.match(r.stderr, /REFUSE/);
  assert.doesNotMatch(r.stderr, /FALLBACK:/, "--no-fallback must not fall back");
});

test("fallback T12: degenerate configured + --force-degenerate (with a fallback available) => trains on the DEGENERATE configured, not the fallback (exit != 2)", () => {
  const fb = baselineFile(realShapedRecords(), "fallback-corpus");
  const r = runCycle(["--baseline", baselineFile(degenerateRecords()), "--fallback-corpus", fb, "--force-degenerate", "--no-write"]);
  assert.notEqual(r.status, 2, `--force-degenerate must bypass REFUSE; got exit 2\n${r.out}`);
  // force-degenerate means "train on THIS baseline" → strict, so no fallback advisory.
  assert.doesNotMatch(r.stderr, /FALLBACK:/, "--force-degenerate trains the configured baseline as-is; it must NOT silently fall back");
});

test("fallback T13: missing configured + admissible --fallback-corpus => FALLBACK (not the missing-file exit-1 reject)", () => {
  const fb = baselineFile(realShapedRecords(), "fallback-corpus");
  const r = runCycle(["--baseline", join(TMP, "nope.json"), "--fallback-corpus", fb, "--no-write"]);
  // Exit code is engine-presence-dependent (0 trains / 1 engine-absent) — assert on the
  // provenance markers instead: fell back, did NOT hit the missing-file reject.
  assert.match(r.stderr, /FALLBACK:/, "a missing configured baseline must fall back, not reject, when a fallback is available");
  assert.match(r.stderr, /missing\/unreadable\/empty/, "advisory must state the configured baseline was missing (not guard-refused)");
  assert.doesNotMatch(r.out, /no trainable records/, "must not emit the all-candidates-empty reject when a fallback admits");
});

test("fallback T14 (--json): degenerate configured + admissible --fallback-corpus carries baseline_fallback provenance (UNCONDITIONAL — emitted before the engine loads)", () => {
  const fb = baselineFile(realShapedRecords(), "fallback-corpus");
  const configured = baselineFile(degenerateRecords());
  const r = runCycle(["--baseline", configured, "--fallback-corpus", fb, "--no-write", "--json"]);
  assert.notEqual(r.status, 2, "fallback path must not refuse under --json");
  // The baseline provenance is spread into BOTH the success AND the engine-load-failure
  // --json, so it is present whether or not the training engine could import in this env.
  // Find the result line robustly (it carries "baseline_source") rather than blindly
  // popping the last line — engine logs may print to stdout after it.
  const jsonLine = r.stdout.trim().split("\n").filter(Boolean).reverse().find((l) => l.includes('"baseline_source"'));
  let json = null;
  try {
    json = JSON.parse(jsonLine);
  } catch {
    /* fall through to the assertion below — a missing result line is a real failure here */
  }
  assert.ok(json, `--json must emit a result line carrying baseline_source (got stdout:\n${r.stdout}\nstderr:\n${r.stderr})`);
  assert.equal(json.baseline_source, fb, "baseline_source must reflect the fallback corpus actually resolved");
  assert.ok(json.baseline_fallback && typeof json.baseline_fallback === "object", "must carry baseline_fallback provenance when a fallback was used");
  assert.equal(json.baseline_fallback.used, fb, "baseline_fallback.used must name the fallback corpus");
  assert.equal(json.baseline_fallback.configured, configured, "baseline_fallback.configured must name the bypassed baseline");
  assert.equal(json.baseline_fallback.configured_refused, true, "the configured baseline was guard-refused → configured_refused:true");
});
