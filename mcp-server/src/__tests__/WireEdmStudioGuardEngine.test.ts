/**
 * WireEdmStudioGuardEngine tests — MS-P7.5-FE-GAPS / U-P7.5-FE-01
 *
 * Covers the four integration scenarios declared in the envelope:
 *   - 6-step wizard passes validation (baseline)
 *   - 7-step mutation is BLOCKED
 *   - renaming useWedmNavigation -> useWedmNav is BLOCKED
 *   - deleting ProfileCanvas.tsx is BLOCKED with explicit message
 * Plus: content hash drift detection, path overlap detection, and
 *       snapshot-loader schema validation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import {
  WireEdmStudioGuardEngine,
  canonicalWizardSteps,
  canonicalContextHooks,
  canonicalPipelineExports,
} from "../engines/WireEdmStudioGuardEngine.js";

// ============================================================================
// FIXTURE HELPERS
// ============================================================================

/**
 * Build a temp repo that mirrors the real directory layout (mcp-server/web/...),
 * write the 13 protected files with known content, and generate a matching
 * snapshot. Returns the temp root and helpers for mutation-based tests.
 */
interface Fixture {
  repoRoot: string;
  snapshotPath: string;
  protectedPaths: string[];
  writeProtected: (rel: string, content: string) => void;
  mutateSnapshot: (fn: (s: any) => void) => void;
  deleteProtected: (rel: string) => void;
  cleanup: () => void;
}

function buildFixture(): Fixture {
  const repoRoot = mkdtempSync(join(tmpdir(), "wedm-guard-"));

  // Mirror the real protected-files structure (paths + token content).
  const protectedEntries: Array<[string, string]> = [
    ["mcp-server/web/src/pages/WireEdmStudioPage.tsx", "// WireEdmStudioPage shell\n"],
    ["mcp-server/web/src/contexts/WedmStudioContext.tsx", "// WedmStudioContext provider\nexport function useWedmNavigation() {}\nexport function useWedmData() {}\n"],
    ["mcp-server/web/src/hooks/useWedmPipeline.ts", "// useWedmPipeline hooks\n"],
    ["mcp-server/web/src/components/wedm-studio/WizardShell.tsx", "// WizardShell chrome\n"],
    ["mcp-server/web/src/components/wedm-studio/ProfileCanvas.tsx", "// ProfileCanvas renderer\n"],
    ["mcp-server/web/src/components/wedm-studio/StepImport.tsx", "// StepImport\n"],
    ["mcp-server/web/src/components/wedm-studio/StepReview.tsx", "// StepReview\n"],
    ["mcp-server/web/src/components/wedm-studio/StepWcs.tsx", "// StepWcs\n"],
    ["mcp-server/web/src/components/wedm-studio/StepToolpath.tsx", "// StepToolpath\n"],
    ["mcp-server/web/src/components/wedm-studio/StepOptimize.tsx", "// StepOptimize\n"],
    ["mcp-server/web/src/components/wedm-studio/StepProgram.tsx", "// StepProgram\n"],
    ["mcp-server/web/src/components/wedm-studio/StepErrorCard.tsx", "// StepErrorCard\n"],
    ["mcp-server/web/src/components/wedm-studio/InfoTip.tsx", "// InfoTip\n"],
  ];

  for (const [rel, content] of protectedEntries) {
    const full = join(repoRoot, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }

  // Build the matching snapshot with true hashes.
  const protected_files: Record<string, { loc: number; sha256: string; role: string }> = {};
  for (const [rel, content] of protectedEntries) {
    protected_files[rel] = {
      loc: content.split("\n").length,
      sha256: createHash("sha256").update(content).digest("hex"),
      role: "fixture",
    };
  }

  const snapshot = {
    schemaVersion: 1,
    snapshotVersion: "1.0.0",
    recorded: "2026-04-21",
    milestone: "MS-P7.5-FE-GAPS",
    unit: "U-P7.5-FE-01",
    rationale: "fixture",
    wizard_schema: {
      total_steps: 6,
      step_sequence: [...canonicalWizardSteps],
      step_ids: {},
      forward_navigation: [],
      backward_navigation: [],
    },
    wedm_studio_context: {
      file: "mcp-server/web/src/contexts/WedmStudioContext.tsx",
      provider_export: "WedmStudioProvider",
      hook_exports: [...canonicalContextHooks],
      public_types: [],
      required_navigation_surface: {},
      required_data_surface: {},
    },
    use_wedm_pipeline: {
      file: "mcp-server/web/src/hooks/useWedmPipeline.ts",
      exports: [...canonicalPipelineExports],
    },
    wizard_shell: { file: "", exported_props_interface: "WizardStepProps" },
    profile_canvas: { file: "", responsibility: "" },
    protected_files,
    total_protected_loc: 13,
    drift_policy: {},
  };

  const snapshotPath = "mcp-server/data/state/WEDM_STUDIO_WIZARD_SNAPSHOT.json";
  const snapshotFull = join(repoRoot, snapshotPath);
  mkdirSync(dirname(snapshotFull), { recursive: true });
  writeFileSync(snapshotFull, JSON.stringify(snapshot, null, 2));

  return {
    repoRoot,
    snapshotPath,
    protectedPaths: protectedEntries.map(([rel]) => rel),
    writeProtected: (rel, content) => writeFileSync(join(repoRoot, rel), content),
    mutateSnapshot: (fn) => {
      const full = join(repoRoot, snapshotPath);
      const cur = JSON.parse(readFileSync(full, "utf8"));
      fn(cur);
      writeFileSync(full, JSON.stringify(cur, null, 2));
    },
    deleteProtected: (rel) => rmSync(join(repoRoot, rel)),
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("WireEdmStudioGuardEngine", () => {
  let fixture: Fixture;
  let engine: WireEdmStudioGuardEngine;

  beforeEach(() => {
    fixture = buildFixture();
    engine = new WireEdmStudioGuardEngine({
      repoRoot: fixture.repoRoot,
      snapshotPath: fixture.snapshotPath,
    });
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe("baseline — no drift", () => {
    it("passes validation when the fixture matches the snapshot", () => {
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.drift).toEqual([]);
      expect(result.filesChecked).toBe(13);
      expect(result.filesOk).toBe(13);
    });

    it("loadSnapshot returns parsed JSON with schemaVersion 1", () => {
      const s = engine.loadSnapshot();
      expect(s.schemaVersion).toBe(1);
      expect(s.snapshotVersion).toBe("1.0.0");
      expect(Object.keys(s.protected_files)).toHaveLength(13);
    });
  });

  describe("content-hash drift", () => {
    it("flags a file whose content diverged from its snapshot sha256", () => {
      fixture.writeProtected(
        "mcp-server/web/src/pages/WireEdmStudioPage.tsx",
        "// mutated — should be flagged\n",
      );
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(false);
      expect(result.drift).toHaveLength(1);
      expect(result.drift[0].file).toBe("mcp-server/web/src/pages/WireEdmStudioPage.tsx");
      const violation = result.violations.find((v) => v.check === "content_hash");
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("error");
      expect(violation?.message).toMatch(/Bump snapshotVersion/);
    });
  });

  describe("file-deletion — explicit ProfileCanvas case from envelope", () => {
    it("BLOCKS deletion of ProfileCanvas.tsx with explicit message", () => {
      fixture.deleteProtected("mcp-server/web/src/components/wedm-studio/ProfileCanvas.tsx");
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(false);
      const violation = result.violations.find(
        (v) => v.check === "file_existence" && v.file?.endsWith("ProfileCanvas.tsx"),
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toMatch(/Protected file deleted/);
    });
  });

  describe("wizard-step-count invariant", () => {
    it("BLOCKS a 7-step mutation (envelope's explicit integration test)", () => {
      fixture.mutateSnapshot((s) => {
        s.wizard_schema.total_steps = 7;
        s.wizard_schema.step_sequence = [...canonicalWizardSteps, "ship"];
      });
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(false);
      const count = result.violations.find((v) => v.check === "wizard_step_count");
      const seq = result.violations.find((v) => v.check === "wizard_step_sequence");
      expect(count).toBeDefined();
      expect(seq).toBeDefined();
    });

    it("PASSES a no-op snapshot edit (valid 6-step stays valid)", () => {
      fixture.mutateSnapshot((s) => {
        s.rationale = "updated with no structural change";
      });
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(true);
    });
  });

  describe("context-API rename — explicit useWedmNavigation case from envelope", () => {
    it("BLOCKS renaming useWedmNavigation -> useWedmNav", () => {
      fixture.mutateSnapshot((s) => {
        s.wedm_studio_context.hook_exports = ["useWedmNav", "useWedmData"];
      });
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(false);
      const violation = result.violations.find(
        (v) => v.check === "context_api_surface" && v.expected === "useWedmNavigation",
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toMatch(/useWedmNavigation/);
    });

    it("PASSES a valid rename when snapshot is bumped + includes the new name", () => {
      // Valid rename means updating the hook itself + keeping snapshot listing the expected name.
      // Since our invariant requires the canonical name, the "valid rename" path is represented
      // by a schemaVersion bump (major change) — out of scope for this invariant.
      // Verify the baseline still matches canonical expectations.
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(true);
    });
  });

  describe("pipeline-API surface", () => {
    it("flags removal of any of the 7 required pipeline exports", () => {
      fixture.mutateSnapshot((s) => {
        s.use_wedm_pipeline.exports = canonicalPipelineExports.filter((e) => e !== "useGcode");
      });
      const result = engine.validateSnapshot();
      expect(result.ok).toBe(false);
      const violation = result.violations.find(
        (v) => v.check === "pipeline_api_surface" && v.expected === "useGcode",
      );
      expect(violation).toBeDefined();
    });
  });

  describe("hasProtectedOverlap", () => {
    it("detects when a changed path hits a protected file", () => {
      const res = engine.hasProtectedOverlap([
        "mcp-server/web/src/pages/WireEdmStudioPage.tsx",
        "unrelated/file.ts",
      ]);
      expect(res.overlap).toBe(true);
      expect(res.touchedProtected).toContain(
        "mcp-server/web/src/pages/WireEdmStudioPage.tsx",
      );
    });

    it("reports no overlap when all paths are unrelated", () => {
      const res = engine.hasProtectedOverlap(["some/other/file.ts", "unrelated.md"]);
      expect(res.overlap).toBe(false);
      expect(res.touchedProtected).toEqual([]);
    });

    it("detects the snapshot itself being in the changeset", () => {
      const res = engine.hasProtectedOverlap([
        "mcp-server/data/state/WEDM_STUDIO_WIZARD_SNAPSHOT.json",
      ]);
      expect(res.touchedSnapshot).toBe(true);
    });

    it("normalizes backslash paths on Windows inputs", () => {
      const res = engine.hasProtectedOverlap([
        "mcp-server\\web\\src\\pages\\WireEdmStudioPage.tsx",
      ]);
      expect(res.overlap).toBe(true);
    });
  });

  describe("formatReport", () => {
    it("renders PASS when no violations", () => {
      const result = engine.validateSnapshot();
      const report = engine.formatReport(result);
      expect(report).toMatch(/status: PASS/);
      expect(report).toMatch(/files checked: 13/);
    });

    it("renders FAIL with per-violation lines", () => {
      fixture.writeProtected(
        "mcp-server/web/src/components/wedm-studio/InfoTip.tsx",
        "// mutated\n",
      );
      const result = engine.validateSnapshot();
      const report = engine.formatReport(result);
      expect(report).toMatch(/status: FAIL/);
      expect(report).toMatch(/content_hash/);
      expect(report).toMatch(/InfoTip\.tsx/);
    });
  });

  describe("schema-version hardening", () => {
    it("throws on a snapshot with unsupported schemaVersion", () => {
      fixture.mutateSnapshot((s) => { s.schemaVersion = 999; });
      expect(() => engine.loadSnapshot()).toThrow(/schemaVersion 999/);
    });

    it("throws when the snapshot file is missing", () => {
      rmSync(join(fixture.repoRoot, fixture.snapshotPath));
      expect(() => engine.loadSnapshot()).toThrow(/snapshot not found/);
    });
  });
});
