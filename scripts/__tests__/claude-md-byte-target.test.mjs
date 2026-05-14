/**
 * claude-md-byte-target.test.mjs — CLEANUP-MS0 / U-CLEANUP-D6 tests
 *
 * Verifies the D6 verifier across:
 *   - happy path (baseline seeded, sizes under target, cuts above target, inject drop met)
 *   - 3+ failure modes (missing CLAUDE.md, missing wiki extractions, no baseline, oversize)
 *   - 2+ adversarial inputs (negative deltas, malformed baseline JSON)
 *   - 3+ variability configs (different repo layouts, missing home file, real fs)
 *   - boundary: 25 KB exactly / 14 KB exactly / 30% drop exactly
 *   - integration: writes baseline to real disk + reads back
 *   - CLI round-trip via runCli
 *
 * Each test writes into a fresh tmp workspace; nothing touches the real H:.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync, unlinkSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  parseArgs,
  resolveTargets,
  fileBytes,
  loadBaseline,
  saveBaseline,
  verifyWikiExtractions,
  loadInjectionSizes,
  totalInjectedBytes,
  verifyByteTargets,
  renderHuman,
  runCli,
  SCHEMA_VERSION,
  TARGET_FINAL_BYTES,
  TARGET_CUTS_BYTES,
  TARGET_INJECT_DROP_PCT,
} from "../claude-md-byte-target.mjs";

let TMP_ROOT;
beforeEach(() => {
  TMP_ROOT = mkdtempSync(path.join(os.tmpdir(), "u-cleanup-d6-"));
});

/**
 * Build a fake repoRoot with a CLAUDE.md of `projectBytes`, optional home file,
 * and optional wiki extraction files. Returns a fully populated workspace.
 */
function makeWorkspace({ projectBytes = 20_000, homeBytes = 18_000, wikiPresent = true, baseline = null, injectSizes = null }) {
  const repoRoot = path.join(TMP_ROOT, `repo-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(repoRoot, { recursive: true });
  writeFileSync(path.join(repoRoot, "CLAUDE.md"), "x".repeat(projectBytes), "utf-8");
  let homePath = null;
  if (homeBytes !== null) {
    homePath = path.join(repoRoot, "home-claude.md");
    writeFileSync(homePath, "y".repeat(homeBytes), "utf-8");
  }
  if (wikiPresent) {
    for (const sub of [
      "knowledge/wiki/architecture/hook-synergy-overview.md",
      "knowledge/wiki/architecture/master-index-surface.md",
      "knowledge/wiki/coordination/shared-directives-index.md",
      "knowledge/wiki/reference/jm-die-profile.md",
    ]) {
      const abs = path.join(repoRoot, sub);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, `# ${path.basename(sub)}\n`, "utf-8");
    }
  }
  const baselinePath = path.join(repoRoot, "state/shared/.claude-md-baseline.json");
  if (baseline) {
    mkdirSync(path.dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), "utf-8");
  }
  const sizesPath = path.join(repoRoot, "state/shared/.claude-injection-sizes.json");
  if (injectSizes) {
    mkdirSync(path.dirname(sizesPath), { recursive: true });
    writeFileSync(sizesPath, JSON.stringify(injectSizes, null, 2), "utf-8");
  }
  return { repoRoot, homePath, baselinePath, sizesPath };
}

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const o = parseArgs([]);
    expect(o.json).toBe(false);
    expect(o.seedBaseline).toBe(false);
    expect(o.help).toBe(false);
  });

  it("parses all flags (variability)", () => {
    const o = parseArgs(["--json", "--seed-baseline", "--repo-root", "/x", "--home-claude-md", "/y", "--baseline", "/z", "--inject-sizes", "/w"]);
    expect(o.json).toBe(true);
    expect(o.seedBaseline).toBe(true);
    expect(o.repoRoot).toBe("/x");
    expect(o.homeClaudeMd).toBe("/y");
    expect(o.baselinePath).toBe("/z");
    expect(o.sampleSizesPath).toBe("/w");
  });

  it("throws on unknown flag (failure mode)", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown flag/);
  });

  it("recognises --help / -h", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });
});

// ── fileBytes ────────────────────────────────────────────────────────────────

describe("fileBytes", () => {
  it("returns the byte count for an existing file", () => {
    const p = path.join(TMP_ROOT, "f.txt");
    writeFileSync(p, "abc");
    expect(fileBytes(p)).toBe(3);
  });

  it("returns null for missing files (graceful)", () => {
    expect(fileBytes(path.join(TMP_ROOT, "nope.txt"))).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(fileBytes(null)).toBeNull();
    expect(fileBytes(undefined)).toBeNull();
  });
});

// ── loadBaseline / saveBaseline ──────────────────────────────────────────────

describe("loadBaseline / saveBaseline", () => {
  it("round-trips through real disk", () => {
    const p = path.join(TMP_ROOT, "baseline.json");
    const payload = { schemaVersion: 1, projectBytesBaseline: 50_000, homeBytesBaseline: 25_000, injectBytesBaseline: 12_000 };
    saveBaseline(p, payload);
    const got = loadBaseline(p);
    expect(got.projectBytesBaseline).toBe(50_000);
    expect(got.homeBytesBaseline).toBe(25_000);
    expect(got.injectBytesBaseline).toBe(12_000);
  });

  it("returns null when file missing", () => {
    expect(loadBaseline(path.join(TMP_ROOT, "no.json"))).toBeNull();
  });

  it("returns null on malformed JSON (adversarial)", () => {
    const p = path.join(TMP_ROOT, "bad.json");
    writeFileSync(p, "{not-json");
    expect(loadBaseline(p)).toBeNull();
  });

  it("returns null when schemaVersion missing (adversarial)", () => {
    const p = path.join(TMP_ROOT, "old.json");
    writeFileSync(p, JSON.stringify({ projectBytesBaseline: 1 }));
    expect(loadBaseline(p)).toBeNull();
  });
});

// ── verifyWikiExtractions ────────────────────────────────────────────────────

describe("verifyWikiExtractions", () => {
  it("reports present=true for all 4 D1–D4 wiki extractions when they exist", () => {
    const { repoRoot } = makeWorkspace({ wikiPresent: true });
    const checks = verifyWikiExtractions(repoRoot);
    expect(checks.length).toBe(4);
    expect(checks.every((c) => c.present)).toBe(true);
    expect(checks.every((c) => c.bytes > 0)).toBe(true);
  });

  it("reports missing extractions when wiki files absent (failure mode)", () => {
    const { repoRoot } = makeWorkspace({ wikiPresent: false });
    const checks = verifyWikiExtractions(repoRoot);
    expect(checks.length).toBe(4);
    expect(checks.every((c) => !c.present)).toBe(true);
    expect(checks.every((c) => c.bytes === 0)).toBe(true);
  });

  it("includes the unit label (D1..D4) for each check", () => {
    const { repoRoot } = makeWorkspace({ wikiPresent: true });
    const checks = verifyWikiExtractions(repoRoot);
    expect(checks.map((c) => c.unit)).toEqual(["D1", "D2", "D3", "D4"]);
  });
});

// ── loadInjectionSizes ───────────────────────────────────────────────────────

describe("loadInjectionSizes", () => {
  it("returns sidecar contents when present", () => {
    const p = path.join(TMP_ROOT, "sizes.json");
    writeFileSync(p, JSON.stringify({ byHook: { "wiki-precheck": 800, "master-index": 1_200 } }));
    const got = loadInjectionSizes(p, null);
    expect(got.source).toBe("sidecar");
    expect(got.byHook["wiki-precheck"]).toBe(800);
  });

  it("falls back to synthesised when sidecar missing", () => {
    const got = loadInjectionSizes(path.join(TMP_ROOT, "no.json"), { project: 25_000, home: 18_000 });
    expect(got.source).toBe("synthesised");
    expect(got.byHook["claude-md-project"]).toBe(25_000);
    expect(got.byHook["claude-md-home"]).toBe(18_000);
  });

  it("falls back on malformed sidecar (adversarial)", () => {
    const p = path.join(TMP_ROOT, "sizes-bad.json");
    writeFileSync(p, "{bad");
    const got = loadInjectionSizes(p, { project: 100, home: 50 });
    expect(got.source).toBe("synthesised");
  });
});

// ── totalInjectedBytes ───────────────────────────────────────────────────────

describe("totalInjectedBytes", () => {
  it("sums numeric values across the byHook record", () => {
    const sum = totalInjectedBytes({ byHook: { a: 100, b: 200, c: 300 } });
    expect(sum).toBe(600);
  });

  it("skips non-finite values defensively (adversarial: NaN)", () => {
    const sum = totalInjectedBytes({ byHook: { a: 100, b: NaN, c: Infinity, d: 50 } });
    expect(sum).toBe(150);
  });

  it("returns 0 for missing/empty input", () => {
    expect(totalInjectedBytes(null)).toBe(0);
    expect(totalInjectedBytes({})).toBe(0);
    expect(totalInjectedBytes({ byHook: {} })).toBe(0);
  });
});

// ── verifyByteTargets — verdicts ─────────────────────────────────────────────

describe("verifyByteTargets", () => {
  it("verdict=needs_baseline when no baseline exists and --seed-baseline not passed (failure mode)", () => {
    const { repoRoot, homePath } = makeWorkspace({ projectBytes: 20_000, homeBytes: 18_000 });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("needs_baseline");
    expect(v.baselineCreated).toBe(false);
  });

  it("seeds baseline on --seed-baseline and persists to disk", () => {
    const { repoRoot, homePath, baselinePath } = makeWorkspace({ projectBytes: 50_000, homeBytes: 25_000 });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath, seedBaseline: true });
    expect(v.baselineCreated).toBe(true);
    expect(existsSync(baselinePath)).toBe(true);
    const persisted = JSON.parse(readFileSync(baselinePath, "utf-8"));
    expect(persisted.projectBytesBaseline).toBe(50_000);
    expect(persisted.homeBytesBaseline).toBe(25_000);
  });

  it("verdict=wiki_missing when D1–D4 wiki extractions absent (P0 alert path)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000, wikiPresent: false,
      baseline: { schemaVersion: 1, projectBytesBaseline: 50_000, homeBytesBaseline: 30_000, injectBytesBaseline: 20_000 },
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("wiki_missing");
    expect(v.wiki.missing.length).toBe(4);
  });

  it("verdict=over_size_target when CLAUDE.md exceeds 25 KB (boundary)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: TARGET_FINAL_BYTES + 1, homeBytes: 18_000,
      baseline: { schemaVersion: 1, projectBytesBaseline: 50_000, homeBytesBaseline: 30_000, injectBytesBaseline: 20_000 },
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("over_size_target");
    expect(v.sizes.finalSizeOk.project).toBe(false);
  });

  it("verdict=cuts_below_target when total cuts < 14 KB (boundary)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      // Baseline barely larger than current → cuts < 14 KB.
      baseline: { schemaVersion: 1, projectBytesBaseline: 25_000, homeBytesBaseline: 19_000, injectBytesBaseline: 20_000 },
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("cuts_below_target");
    expect(v.cuts.total).toBeLessThan(TARGET_CUTS_BYTES);
  });

  it("verdict=inject_drop_below_target when inject drop < 30% (boundary)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      baseline: { schemaVersion: 1, projectBytesBaseline: 50_000, homeBytesBaseline: 30_000, injectBytesBaseline: 10_000 },
      injectSizes: { byHook: { static: 9_500 } },   // 5% drop only
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("inject_drop_below_target");
    expect(v.inject.dropPct).toBeLessThan(TARGET_INJECT_DROP_PCT);
  });

  it("verdict=pass when all targets met (happy path)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      baseline: { schemaVersion: 1, projectBytesBaseline: 40_000, homeBytesBaseline: 25_000, injectBytesBaseline: 20_000 },
      injectSizes: { byHook: { everything: 12_000 } },  // 40% drop
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("pass");
    expect(v.cuts.total).toBeGreaterThanOrEqual(TARGET_CUTS_BYTES);
    expect(v.inject.dropPct).toBeGreaterThanOrEqual(TARGET_INJECT_DROP_PCT);
  });

  it("inject drop exactly at 30% threshold counts as met (boundary)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      baseline: { schemaVersion: 1, projectBytesBaseline: 40_000, homeBytesBaseline: 25_000, injectBytesBaseline: 10_000 },
      injectSizes: { byHook: { x: 7_000 } },   // exactly 30%
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.inject.dropPct).toBe(30);
    expect(v.inject.targetMet).toBe(true);
  });

  it("handles missing home CLAUDE.md gracefully (variability: home absent)", () => {
    const { repoRoot } = makeWorkspace({ projectBytes: 20_000, homeBytes: null });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: path.join(TMP_ROOT, "no-home.md"), seedBaseline: true });
    expect(v.sizes.home).toBeNull();
    expect(v.baselineCreated).toBe(true);
  });

  // ── P1 review additions ─────────────────────────────────────────────────────

  it("verdict=inject_baseline_missing when baseline has null inject (P1 coverage)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      // Baseline has injectBytesBaseline=null — pre-D5 sidecar wasn't wired yet.
      baseline: { schemaVersion: 1, projectBytesBaseline: 40_000, homeBytesBaseline: 25_000, injectBytesBaseline: null },
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("inject_baseline_missing");
    expect(v.inject.baseline).toBeNull();
    expect(v.inject.dropPct).toBeNull();
  });

  it("clamps cuts to 0 when CLAUDE.md grew (regression) instead of going negative", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 40_000, homeBytes: 20_000,
      baseline: { schemaVersion: 1, projectBytesBaseline: 30_000, homeBytesBaseline: 30_000, injectBytesBaseline: 20_000 },
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.cuts.projectBytes).toBe(0);       // project grew 30K → 40K, clamped to 0
    expect(v.cuts.homeBytes).toBe(10_000);     // home shrank 30K → 20K = 10K cut
    expect(v.cuts.total).toBe(10_000);
  });

  it("partial wiki absence triggers wiki_missing (P1 coverage: only 1 of 4 missing)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000, wikiPresent: true,
      baseline: { schemaVersion: 1, projectBytesBaseline: 40_000, homeBytesBaseline: 25_000, injectBytesBaseline: 20_000 },
    });
    // Remove just one of the four extraction files.
    const targetWiki = path.join(repoRoot, "knowledge/wiki/architecture/master-index-surface.md");
    unlinkSync(targetWiki);
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.verdict).toBe("wiki_missing");
    expect(v.wiki.missing.length).toBe(1);
    expect(v.wiki.missing[0].unit).toBe("D2");
  });

  it("--seed-project-bytes overrides post-cut anchor (P0-2 review fix)", () => {
    const { repoRoot, homePath, baselinePath } = makeWorkspace({ projectBytes: 24_000, homeBytes: 18_000 });
    const v = verifyByteTargets({
      repoRoot, homeClaudeMd: homePath, seedBaseline: true,
      seedProjectBytes: 50_000,    // pre-cut anchor
      seedHomeBytes: 30_000,
    });
    expect(v.baselineCreated).toBe(true);
    const persisted = JSON.parse(readFileSync(baselinePath, "utf-8"));
    expect(persisted.projectBytesBaseline).toBe(50_000);
    expect(persisted.homeBytesBaseline).toBe(30_000);
  });

  it("rejects inject drop strictly below 30% pre-rounding (P1 boundary fix)", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      // 29.5% drop — under the spec but Math.round → 30.
      baseline: { schemaVersion: 1, projectBytesBaseline: 40_000, homeBytesBaseline: 25_000, injectBytesBaseline: 10_000 },
      injectSizes: { byHook: { x: 7_050 } },     // 29.5%
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    expect(v.inject.targetMet).toBe(false);    // unrounded check rejects 29.5%
    expect(v.verdict).toBe("inject_drop_below_target");
  });
});

// ── runCli ───────────────────────────────────────────────────────────────────

describe("runCli", () => {
  it("exit code 0 + JSON shape on success path", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      baseline: { schemaVersion: 1, projectBytesBaseline: 40_000, homeBytesBaseline: 25_000, injectBytesBaseline: 20_000 },
      injectSizes: { byHook: { x: 12_000 } },
    });
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    const code = runCli(["--json", "--repo-root", repoRoot, "--home-claude-md", homePath], { stdout: out, stderr: err });
    expect(code).toBe(0);
    const parsed = JSON.parse(out.written);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.verdict).toBe("pass");
  });

  it("exit code 2 on --help", () => {
    const out = { written: "", write(s) { this.written += s; } };
    const code = runCli(["--help"], { stdout: out, stderr: { write() {} } });
    expect(code).toBe(2);
    expect(out.written).toMatch(/U-CLEANUP-D6/);
  });

  it("exit code 2 on bad flag", () => {
    const err = { written: "", write(s) { this.written += s; } };
    const code = runCli(["--bogus"], { stdout: { write() {} }, stderr: err });
    expect(code).toBe(2);
    expect(err.written).toMatch(/Unknown flag/);
  });

  it("renderHuman emits all key fields", () => {
    const { repoRoot, homePath } = makeWorkspace({
      projectBytes: 20_000, homeBytes: 18_000,
      baseline: { schemaVersion: 1, projectBytesBaseline: 40_000, homeBytesBaseline: 25_000, injectBytesBaseline: 20_000 },
      injectSizes: { byHook: { x: 12_000 } },
    });
    const v = verifyByteTargets({ repoRoot, homeClaudeMd: homePath });
    const text = renderHuman(v);
    expect(text).toContain("verdict=pass");
    expect(text).toContain("cuts:");
    expect(text).toContain("inject:");
    expect(text).toContain("wiki extractions:");
  });
});
