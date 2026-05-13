/**
 * dashboard-archive-rotate.test.ts — CLEANUP-MS0 / U-CLEANUP-G13
 *
 * Verifies the annual gzip-bundle rotation of
 * `state/shared/dashboards/.archive/<YYYY>/` to `<backup>/<YYYY>.tar.gz`.
 *
 * Coverage:
 *   - parseArgs: defaults + every flag (including --current-year + --retain-years)
 *   - rotate: missing source dir = success no-op
 *   - rotate: current-year directory is skipped
 *   - rotate: prior years are bundled, source removed, dest exists
 *   - rotate: idempotent — re-run sees `already-bundled`, source untouched
 *   - rotate: retention sweep deletes <YYYY>.tar.gz where YYYY < currentYear-retainYears
 *   - rotate: dry-run touches no disk state
 *   - rotate: tar non-zero exit captured in errors, partial dest cleaned up
 *
 * Tar is injected via the `runTar` hook so tests don't depend on the system
 * tar binary (and don't actually create real archive bytes).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync, existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  rotate, parseArgs,
} from "../../../scripts/dashboard-archive-rotate.mjs";

/** Test seam: simulates `tar -czf <dest> -C <src> .` by writing a placeholder. */
function fakeTarOk(args: string[]) {
  // args: ["-czf", "<dest>", "-C", "<src>", "."]
  const dest = args[1];
  writeFileSync(dest, "FAKE-TAR-GZ");
  return { status: 0, stderr: "", stdout: "" };
}

function fakeTarFail(_args: string[]) {
  return { status: 2, stderr: "fake-tar-error", stdout: "" };
}

describe("dashboard-archive-rotate / parseArgs", () => {
  it("returns defaults", () => {
    const a = parseArgs([]);
    expect(a.source).toBe("H:/prism/state/shared/dashboards/.archive");
    expect(a.backup).toBe("H:/prism-backups/dashboard-archives");
    expect(a.retainYears).toBe(2);
    expect(a.currentYear).toBe(null);
    expect(a.dryRun).toBe(false);
    expect(a.json).toBe(true);
  });

  it("parses every flag", () => {
    const a = parseArgs([
      "--source", "/tmp/s",
      "--backup", "/tmp/b",
      "--retain-years", "5",
      "--current-year", "2030",
      "--dry-run",
      "--no-json",
    ]);
    expect(a.source).toBe("/tmp/s");
    expect(a.backup).toBe("/tmp/b");
    expect(a.retainYears).toBe(5);
    expect(a.currentYear).toBe(2030);
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(false);
  });

  it("falls back to default on invalid retain-years", () => {
    const a = parseArgs(["--retain-years", "nope"]);
    expect(a.retainYears).toBe(2);
  });

  it("ignores out-of-range current-year", () => {
    const a = parseArgs(["--current-year", "999"]);
    expect(a.currentYear).toBe(null);
    const b = parseArgs(["--current-year", "10000"]);
    expect(b.currentYear).toBe(null);
  });
});

describe("dashboard-archive-rotate / rotate", () => {
  let dir: string;
  let source: string;
  let backup: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dar-test-"));
    source = join(dir, "archive");
    backup = join(dir, "backup");
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ }
  });

  it("missing source dir is a success no-op", () => {
    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarOk, nowYear: 2026 },
    );
    expect(result.ok).toBe(true);
    expect(result.scannedYears).toEqual([]);
    expect(result.bundled).toEqual([]);
    expect(result.skipped.some((s: any) => s.reason === "source-missing")).toBe(true);
  });

  it("skips current-year directory; bundles older years", () => {
    // Layout: archive/2024, archive/2025, archive/2026 (current — skipped)
    mkdirSync(join(source, "2024"), { recursive: true });
    writeFileSync(join(source, "2024", "data.json"), "{}");
    mkdirSync(join(source, "2025"), { recursive: true });
    writeFileSync(join(source, "2025", "data.json"), "{}");
    mkdirSync(join(source, "2026"), { recursive: true });
    writeFileSync(join(source, "2026", "data.json"), "{}");

    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarOk, nowYear: 2026 },
    );
    expect(result.errors).toEqual([]);
    expect(result.scannedYears).toEqual([2024, 2025, 2026]);
    expect(result.bundled.map((b: any) => b.year).sort()).toEqual([2024, 2025]);
    expect(result.skipped.some((s: any) => s.year === 2026 && s.reason === "current-or-future-year")).toBe(true);
    // Bundled destinations exist
    expect(existsSync(join(backup, "2024.tar.gz"))).toBe(true);
    expect(existsSync(join(backup, "2025.tar.gz"))).toBe(true);
    // Source year dirs removed
    expect(existsSync(join(source, "2024"))).toBe(false);
    expect(existsSync(join(source, "2025"))).toBe(false);
    // Current-year preserved
    expect(existsSync(join(source, "2026"))).toBe(true);
  });

  it("idempotent: re-run skips already-bundled, leaves source alone", () => {
    mkdirSync(join(source, "2024"), { recursive: true });
    writeFileSync(join(source, "2024", "data.json"), "{}");

    // Pre-populate backup with a "previous run's" tar.gz
    mkdirSync(backup, { recursive: true });
    writeFileSync(join(backup, "2024.tar.gz"), "PREVIOUS");

    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarOk, nowYear: 2026 },
    );
    expect(result.errors).toEqual([]);
    expect(result.bundled.length).toBe(0);
    expect(result.skipped.some((s: any) => s.year === 2024 && s.reason === "already-bundled")).toBe(true);
    // Source untouched (operator decides what to do with possibly-newer content)
    expect(existsSync(join(source, "2024"))).toBe(true);
    // Backup untouched
    expect(existsSync(join(backup, "2024.tar.gz"))).toBe(true);
  });

  it("retention sweep deletes tar.gz files older than currentYear - retainYears", () => {
    mkdirSync(backup, { recursive: true });
    // Pre-populate with 4 years of bundles
    for (const y of [2020, 2021, 2022, 2023]) {
      writeFileSync(join(backup, `${y}.tar.gz`), "OLD");
    }
    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarOk, nowYear: 2026 },
    );
    // retainCutoff = 2026 - 2 = 2024 → keep >= 2024, purge < 2024
    expect(result.purged.map((p: any) => p.year).sort()).toEqual([2020, 2021, 2022, 2023]);
    for (const y of [2020, 2021, 2022, 2023]) {
      expect(existsSync(join(backup, `${y}.tar.gz`))).toBe(false);
    }
  });

  it("retention sweep keeps recent bundles", () => {
    mkdirSync(backup, { recursive: true });
    writeFileSync(join(backup, "2024.tar.gz"), "RECENT");
    writeFileSync(join(backup, "2025.tar.gz"), "RECENT");
    writeFileSync(join(backup, "2020.tar.gz"), "OLD");
    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarOk, nowYear: 2026 },
    );
    expect(result.purged.map((p: any) => p.year)).toEqual([2020]);
    expect(existsSync(join(backup, "2024.tar.gz"))).toBe(true);
    expect(existsSync(join(backup, "2025.tar.gz"))).toBe(true);
    expect(existsSync(join(backup, "2020.tar.gz"))).toBe(false);
  });

  it("dry-run touches nothing", () => {
    mkdirSync(join(source, "2024"), { recursive: true });
    writeFileSync(join(source, "2024", "data.json"), "{}");
    mkdirSync(backup, { recursive: true });
    writeFileSync(join(backup, "2020.tar.gz"), "WOULD-DELETE");

    const before = {
      sourceDirs: readdirSync(source),
      backupFiles: readdirSync(backup),
    };
    const result = rotate(
      { source, backup, retainYears: 2, dryRun: true, json: true },
      { runTar: fakeTarOk, nowYear: 2026 },
    );
    const after = {
      sourceDirs: readdirSync(source),
      backupFiles: readdirSync(backup),
    };
    expect(after).toEqual(before);
    // Plan reports the would-do work
    expect(result.bundled.length).toBe(1);
    expect(result.bundled[0].dryRun).toBe(true);
    expect(result.purged.length).toBe(1);
  });

  it("tar failure: captures error, removes partial dest, leaves source intact", () => {
    mkdirSync(join(source, "2024"), { recursive: true });
    writeFileSync(join(source, "2024", "data.json"), "{}");

    // fakeTarFail returns non-zero AND doesn't write the dest — but to simulate
    // the cleanup branch, pre-write a partial dest, then run with fakeTarFail.
    mkdirSync(backup, { recursive: true });
    // No partial dest pre-existing → confirms we don't crash on missing-dest cleanup.

    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarFail, nowYear: 2026 },
    );
    expect(result.bundled.length).toBe(0);
    expect(result.errors.some(e => /tar 2024 failed/.test(e))).toBe(true);
    // Source preserved on failure
    expect(existsSync(join(source, "2024"))).toBe(true);
    expect(result.ok).toBe(false);
  });

  it("tar failure with partial dest removes it before reporting", () => {
    mkdirSync(join(source, "2024"), { recursive: true });
    writeFileSync(join(source, "2024", "data.json"), "{}");
    mkdirSync(backup, { recursive: true });

    // fakeTar that writes a partial dest then returns non-zero
    const fakeTarPartial = (args: string[]) => {
      writeFileSync(args[1], "PARTIAL");
      return { status: 1, stderr: "interrupted", stdout: "" };
    };
    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarPartial, nowYear: 2026 },
    );
    expect(result.errors.length).toBeGreaterThan(0);
    // Partial dest cleaned up
    expect(existsSync(join(backup, "2024.tar.gz"))).toBe(false);
  });

  it("ignores non-year directory names in source", () => {
    mkdirSync(join(source, "2024"), { recursive: true });
    writeFileSync(join(source, "2024", "x"), "");
    mkdirSync(join(source, "notes"), { recursive: true });
    writeFileSync(join(source, "notes", "readme"), "");
    mkdirSync(join(source, "12345"), { recursive: true }); // 5 digits — not YYYY
    writeFileSync(join(source, "12345", "x"), "");

    const result = rotate(
      { source, backup, retainYears: 2, dryRun: false, json: true },
      { runTar: fakeTarOk, nowYear: 2026 },
    );
    expect(result.scannedYears).toEqual([2024]);
  });
});
