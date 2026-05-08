/**
 * ContradictionDetectorEngine.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S3/U-CONTRADICTION-DETECTOR — exit_criteria coverage:
 *   1. Direct contradiction → conflict, confidence ≥ 0.7
 *   2. Numerical contradiction (same key, different values) → ≥ 0.7
 *   3. Unrelated content → no false positives
 *   4. Determinism on same vault state
 *   5. NLI hook layering + null-fallback
 *
 * 14 it() cases (envelope minimum 12).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContradictionDetectorEngine,
  contradictionDetectorEngine,
  type Conflict,
} from "../engines/ContradictionDetectorEngine.js";

let tmpRoot: string;
let engine: ContradictionDetectorEngine;

function writeNote(rel: string, body: string): string {
  const full = join(tmpRoot, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf8");
  return full;
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "cde-test-"));
  engine = new ContradictionDetectorEngine();
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("ContradictionDetectorEngine — heuristic detection", () => {
  it("direct negation across files: 'kienzle is not reliable' vs 'kienzle is reliable' → direct conflict, conf >= 0.7", async () => {
    writeNote("priors/a.md", "# Notes on kienzle\nThe kienzle method is not reliable for thin walls under one mm.");
    const newPath = writeNote("inbox/new.md", "# New observation\nThe kienzle method is reliable when calibrated against measured data.");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    const direct = result.conflicts.filter((c) => c.conflictType === "direct");
    expect(direct.length).toBeGreaterThan(0);
    expect(direct[0].confidence).toBeGreaterThanOrEqual(0.7);
    expect(direct[0].otherFile.endsWith("a.md")).toBe(true);
  });

  it("numerical mismatch on same key (feedrate 120 vs feedrate 240) → numerical conflict, conf >= 0.7", async () => {
    writeNote("priors/feeds.md", "# Feeds\nfeedrate: 120\nspindle: 8000\n");
    const newPath = writeNote("inbox/new.md", "# Updated feeds\nfeedrate: 240\nspindle: 8000\n");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    const numerical = result.conflicts.filter((c) => c.conflictType === "numerical");
    expect(numerical.length).toBe(1);
    expect(numerical[0].confidence).toBeGreaterThanOrEqual(0.7);
    expect(numerical[0].assertion.includes("120")).toBe(true);
    expect(numerical[0].assertion.includes("240")).toBe(true);
  });

  it("unrelated content produces no conflicts (no false positives on orthogonal topics)", async () => {
    writeNote("priors/a.md", "# Workholding\nVacuum tables work well for thin sheet aluminum parts.");
    writeNote("priors/b.md", "# Coolant\nFlood coolant evacuates chips effectively in deep slotting.");
    const newPath = writeNote("inbox/new.md", "# Programming\nFanuc post-processors require parameter 6050 for sub-program calls.");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(result.conflicts).toEqual([]);
  });

  it("empty new memory body returns empty conflicts (no throw)", async () => {
    writeNote("priors/a.md", "# Some notes\nfeedrate: 100\n");
    const newPath = writeNote("inbox/empty.md", "");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(result.conflicts).toEqual([]);
    expect(result.candidates_examined).toBe(0);
  });

  it("non-existent newMemoryPath returns empty conflicts (no throw)", async () => {
    writeNote("priors/a.md", "# x\nfeedrate: 100\n");
    const result = await engine.detectConflicts(join(tmpRoot, "does-not-exist.md"), { vaultRoot: tmpRoot });
    expect(result.conflicts).toEqual([]);
    expect(result.candidates_examined).toBe(0);
  });

  it("vault containing only the new memory returns empty conflicts (cannot contradict itself)", async () => {
    const newPath = writeNote("inbox/only.md", "# Solo\nThis is the first note.\nfeedrate: 100\n");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(result.conflicts).toEqual([]);
  });

  it("vault with multiple stable beliefs + one conflicting → only the conflicting one returned", async () => {
    writeNote("priors/a.md", "# Stable A\nVacuum tables suit thin sheets.");
    writeNote("priors/b.md", "# Stable B\nClamps suit thick parts.");
    writeNote("priors/c.md", "# Conflicting\nfeedrate: 120\n");
    const newPath = writeNote("inbox/new.md", "# Update\nfeedrate: 240\n");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].otherFile.endsWith("c.md")).toBe(true);
    expect(result.conflicts[0].conflictType).toBe("numerical");
  });

  it("determinism: two consecutive runs on the same vault state return identical conflict arrays", async () => {
    writeNote("priors/a.md", "# A\nfeedrate: 100\nspindle: 8000\n");
    writeNote("priors/b.md", "# B\nfeedrate: 100\nstepover: 0.6\n");
    writeNote("priors/c.md", "# C\nThe coolant is not water-soluble for this alloy.\n");
    const newPath = writeNote("inbox/new.md", "# New\nfeedrate: 200\nThe coolant is water-soluble for this alloy.\n");
    const r1 = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    const r2 = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(r2.conflicts).toEqual(r1.conflicts);
    expect(r2.candidates_examined).toBe(r1.candidates_examined);
  });

  it("multiple numerical conflicts on different keys are all reported", async () => {
    writeNote("priors/a.md", "# A\nfeedrate: 100\nspindle: 8000\n");
    const newPath = writeNote("inbox/new.md", "# New\nfeedrate: 200\nspindle: 12000\n");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    const numericals = result.conflicts.filter((c) => c.conflictType === "numerical");
    expect(numericals.length).toBe(2);
    const keysCovered = numericals.flatMap((c) => [c.assertion]).join("\n");
    expect(keysCovered.includes("feedrate")).toBe(true);
    expect(keysCovered.includes("spindle")).toBe(true);
  });

  it("identical numerical values across files do NOT produce a conflict", async () => {
    writeNote("priors/a.md", "# A\nfeedrate: 100\n");
    const newPath = writeNote("inbox/new.md", "# New\nfeedrate: 100\nspindle: 8000\n");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(result.conflicts.filter((c) => c.conflictType === "numerical")).toEqual([]);
  });

  it("prior daily-brief files (brief-YYYY-MM-DD.md) are excluded from comparison", async () => {
    writeNote("inbox/brief-2026-05-07.md", "# Yesterday brief\nThe coolant is not water-soluble.");
    const newPath = writeNote("inbox/new.md", "# New\nThe coolant is water-soluble.");
    const result = await engine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(result.candidates_examined).toBe(0);
    expect(result.conflicts).toEqual([]);
  });

  it("optional Ollama NLI hook layers implicit conflicts on top of heuristic results", async () => {
    writeNote("priors/a.md", "# Old\nThe coolant approach used here is mineral-oil based.");
    const newPath = writeNote("inbox/new.md", "# New\nWe should switch fluids entirely; mineral oil is wrong for this material.");
    const result = await engine.detectConflicts(newPath, {
      vaultRoot: tmpRoot,
      nliCall: async (premise, _hypothesis) => {
        if (premise.includes("mineral-oil")) {
          return { label: "CONTRADICT", score: 0.85 };
        }
        return { label: "NEUTRAL", score: 0.5 };
      },
    });
    expect(result.nli_used).toBe(true);
    const implicit = result.conflicts.filter((c) => c.conflictType === "implicit");
    expect(implicit.length).toBe(1);
    expect(implicit[0].confidence).toBeCloseTo(0.85, 5);
  });

  it("NLI hook that returns null (Ollama unreachable) does NOT throw — heuristics still return", async () => {
    writeNote("priors/a.md", "# Prior\nThe kienzle method is not reliable for thin walls.");
    const newPath = writeNote("inbox/new.md", "# New\nThe kienzle method is reliable when calibrated.");
    const result = await engine.detectConflicts(newPath, {
      vaultRoot: tmpRoot,
      nliCall: async () => null,
    });
    expect(result.nli_used).toBe(false);
    expect(result.conflicts.some((c: Conflict) => c.conflictType === "direct")).toBe(true);
  });

  it("singleton contradictionDetectorEngine produces equivalent output to a fresh class instance", async () => {
    writeNote("priors/a.md", "# A\nfeedrate: 100\n");
    const newPath = writeNote("inbox/new.md", "# New\nfeedrate: 200\n");
    const fresh = new ContradictionDetectorEngine();
    const r1 = await contradictionDetectorEngine.detectConflicts(newPath, { vaultRoot: tmpRoot });
    const r2 = await fresh.detectConflicts(newPath, { vaultRoot: tmpRoot });
    expect(r2.conflicts).toEqual(r1.conflicts);
    expect(r2.candidates_examined).toBe(r1.candidates_examined);
  });
});
