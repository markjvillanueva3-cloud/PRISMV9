/**
 * OkumaMultusB250IIMillTurnMasterPostEngine smoke tests (U-PPGMU01).
 *
 * The engine is a facade for the canonical Mastercam/Fusion CPS post
 *   "JM DIE/PRISM MODIFIED POST PROCESSORS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps"
 *
 * The `.cps` does the actual G-code emission; this engine surfaces identity,
 * capability + property metadata, and the 11 `usePRISMxxx` intelligence flags.
 * These tests therefore exercise:
 *
 *   1. Pinned constants (path / controller / FORKID / revision tag)
 *   2. parseMetadata() against an injected fixture (no filesystem access)
 *   3. validateCanonical() — ok-path AND drift-warning paths
 *   4. inspectCanonical() with cpsContent injection
 *   5. getStats() shape
 *   6. Failure modes (empty content, non-string content)
 *   7. Live read of the on-disk .cps when present (skipped otherwise)
 *
 * The injected CPS_FIXTURE intentionally mirrors the real v5.2.7 header so
 * any drift in regex extraction surfaces here before the live file is read.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  OkumaMultusB250IIMillTurnMasterPostEngine,
  okumaMultusB250IIMillTurnMasterPostEngine,
  CANONICAL_POST_RELATIVE_PATH,
  CANONICAL_POST_FILENAME,
  CANONICAL_CONTROLLER,
  CANONICAL_FORKID,
  CANONICAL_REVISION_TAG,
  CANONICAL_MINIMUM_RUNTIME_REVISION,
  CANONICAL_DESCRIPTION,
  CANONICAL_VENDOR,
  CANONICAL_EXTENSION,
  CANONICAL_PROGRAM_NAME_IS_INTEGER,
  CANONICAL_PROPERTY_GROUPS,
  CANONICAL_PROPERTY_COUNT_BASELINE,
  PRISM_INTELLIGENCE_FLAGS,
} from "../engines/OkumaMultusB250IIMillTurnMasterPostEngine.js";

// ============================================================================
// FIXTURE — minimal CPS header with every regex target present
// ============================================================================

const CPS_FIXTURE = [
  'var modelType = "okuma multus b250IIw";',
  'description = "Okuma Multus B250IIW Ultra Enhanced";',
  "/**",
  "  $Revision: 44802 Ultra Enhanced Edition v5.2.7 - PRISM Intelligence $",
  "  $Date: 2026-01-30 $",
  "  FORKID {D93DAA65-1C09-402E-9871-3280B561D994}",
  "*/",
  'vendor = "OKUMA";',
  'vendorUrl = "https://www.okuma.com";',
  'legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";',
  "certificationLevel = 2;",
  "minimumRevision = 45909;",
  'extension = "min";',
  "programNameIsInteger = false;",
  "capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;",
  "properties = {",
  "  writeMachine: {",
  '    title: "Write machine",',
  "  },",
  "  writeTools: {",
  '    title: "Write tool list",',
  "  },",
  "  usePRISMCycleTimeEstimate: { title: \"PRISM: Show cycle time estimates\" },",
  "  usePRISMSurfaceFinishPredict: { title: \"PRISM: Surface finish prediction\" },",
  "  usePRISMToolLifeTracking: { title: \"PRISM: Tool life tracking\" },",
  "  usePRISMThermalComp: { title: \"PRISM: Thermal compensation tracking\" },",
  "  usePRISMSpindleWarmup: { title: \"PRISM: Spindle warmup cycle\" },",
  "  usePRISMArcFeedAdjust: { title: \"PRISM: Arc radius feed adjustment\" },",
  "  usePRISMCornerDecel: { title: \"PRISM: Corner deceleration\" },",
  "  usePRISMToolBreakDetect: { title: \"PRISM: Tool break detection setup\" },",
  "  usePRISMChipLoadMonitor: { title: \"PRISM: Chip load monitoring\" },",
  "  usePRISMCuttingForceEstimate: { title: \"PRISM: Cutting force estimates\" },",
  "  usePRISMStabilityHints: { title: \"PRISM: Stability lobe hints\" },",
  "};",
].join("\n");

// ============================================================================
// PINNED CONSTANTS
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine — pinned constants", () => {
  it("CANONICAL_POST_RELATIVE_PATH points at the v5.2.7 PRISM-Enhanced post", () => {
    expect(CANONICAL_POST_RELATIVE_PATH).toContain(
      "OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps",
    );
    expect(CANONICAL_POST_RELATIVE_PATH).toContain("JM DIE");
    expect(CANONICAL_POST_RELATIVE_PATH.endsWith(CANONICAL_POST_FILENAME)).toBe(true);
  });

  it("controller is the OSP-P300SA Multus specialty console", () => {
    expect(CANONICAL_CONTROLLER).toBe("OSP-P300SA");
  });

  it("FORKID and revision tag pin the post identity", () => {
    expect(CANONICAL_FORKID).toBe("D93DAA65-1C09-402E-9871-3280B561D994");
    expect(CANONICAL_REVISION_TAG).toContain("v5.2.7");
    expect(CANONICAL_REVISION_TAG).toContain("PRISM Intelligence");
    expect(CANONICAL_MINIMUM_RUNTIME_REVISION).toBe(45909);
  });

  it("PRISM_INTELLIGENCE_FLAGS lists all 11 flags shipped in v5.2.7", () => {
    expect(PRISM_INTELLIGENCE_FLAGS).toHaveLength(11);
    expect(PRISM_INTELLIGENCE_FLAGS).toContain("usePRISMSurfaceFinishPredict");
    expect(PRISM_INTELLIGENCE_FLAGS).toContain("usePRISMCuttingForceEstimate");
    expect(PRISM_INTELLIGENCE_FLAGS).toContain("usePRISMStabilityHints");
    // No flag should appear twice
    const unique = new Set(PRISM_INTELLIGENCE_FLAGS);
    expect(unique.size).toBe(PRISM_INTELLIGENCE_FLAGS.length);
  });

  it("post-audit constants pin the .cps line-2 description, vendor, extension and programNameIsInteger fields", () => {
    expect(CANONICAL_DESCRIPTION).toBe("Okuma Multus B250IIW Ultra Enhanced");
    expect(CANONICAL_VENDOR).toBe("OKUMA");
    expect(CANONICAL_EXTENSION).toBe("min");
    expect(CANONICAL_PROGRAM_NAME_IS_INTEGER).toBe(false);
  });

  it("CANONICAL_PROPERTY_GROUPS lists the 13 .cps property groups in declaration order", () => {
    expect(CANONICAL_PROPERTY_GROUPS).toHaveLength(13);
    // Spot-check that the OSP-P300SA + PRISM enhancement groups are present —
    // these are the audit-confirmed group labels the operator dashboard relies on.
    expect(CANONICAL_PROPERTY_GROUPS).toContain("ospP300SA");
    expect(CANONICAL_PROPERTY_GROUPS).toContain("prismEnhancements");
    expect(CANONICAL_PROPERTY_GROUPS).toContain("spindle2Offset");
    expect(CANONICAL_PROPERTY_GROUPS).toContain("cycleTimeAdvanced");
    expect(CANONICAL_PROPERTY_GROUPS).toContain("fileSize");
    // Configuration is always first; fileSize is always last (operator
    // dashboard renders bottom-up significance).
    expect(CANONICAL_PROPERTY_GROUPS[0]).toBe("configuration");
    expect(CANONICAL_PROPERTY_GROUPS[CANONICAL_PROPERTY_GROUPS.length - 1]).toBe("fileSize");
  });

  it("CANONICAL_PROPERTY_COUNT_BASELINE matches the audited v5.2.7 declaration count", () => {
    expect(CANONICAL_PROPERTY_COUNT_BASELINE).toBe(88);
  });
});

// ============================================================================
// parseMetadata — fixture path (no FS)
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata", () => {
  it("extracts identity + capability fields from the v5.2.7 fixture", () => {
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(CPS_FIXTURE);

    expect(meta.description).toBe("Okuma Multus B250IIW Ultra Enhanced");
    expect(meta.vendor).toBe("OKUMA");
    expect(meta.vendorUrl).toBe("https://www.okuma.com");
    expect(meta.legalNotice).toContain("Autodesk");
    expect(meta.certificationLevel).toBe(2);
    expect(meta.minimumRuntimeRevision).toBe(45909);
    expect(meta.extension).toBe("min");
    expect(meta.programNameIsInteger).toBe(false);
    expect(meta.forkid).toBe(CANONICAL_FORKID);
    expect(meta.revisionTag).toContain("v5.2.7");
    expect(meta.modelType).toBe("okuma multus b250IIw");
    expect(meta.capabilities).toEqual(
      expect.arrayContaining(["CAPABILITY_MILLING", "CAPABILITY_TURNING"]),
    );
  });

  it("counts every property declaration and isolates the 11 PRISM flags", () => {
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(CPS_FIXTURE);

    // Fixture declares 13 properties total: writeMachine, writeTools, + 11 PRISM flags
    expect(meta.propertyCount).toBe(13);
    expect(meta.prismFlagsDeclared).toHaveLength(11);
    expect(meta.prismFlagsDeclared).toEqual(
      expect.arrayContaining([...PRISM_INTELLIGENCE_FLAGS]),
    );
  });

  it("throws on empty content", () => {
    expect(() => OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata("")).toThrow(
      /non-empty string/,
    );
  });

  it("throws on non-string input (runtime guard)", () => {
    expect(() =>
      // @ts-expect-error — runtime rejection of non-string
      OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(null),
    ).toThrow(/non-empty string/);
  });
});

// ============================================================================
// validateCanonical — ok and drift paths
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical", () => {
  it("returns ok:true with zero warnings on canonical fixture", () => {
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(CPS_FIXTURE);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("flags FORKID drift (someone swapped in a different Okuma post)", () => {
    const drifted = CPS_FIXTURE.replace(
      "FORKID {D93DAA65-1C09-402E-9871-3280B561D994}",
      "FORKID {00000000-0000-0000-0000-000000000000}",
    );
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(drifted);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes("FORKID"))).toBe(true);
  });

  it("flags revision-tag drift (older v4 build was substituted)", () => {
    const drifted = CPS_FIXTURE.replace(
      "44802 Ultra Enhanced Edition v5.2.7 - PRISM Intelligence",
      "30000 v4 PRISM Intelligence",
    );
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(drifted);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes("revision tag"))).toBe(true);
  });

  it("flags missing PRISM intelligence flags individually", () => {
    const drifted = CPS_FIXTURE.replace(
      "  usePRISMSurfaceFinishPredict: { title: \"PRISM: Surface finish prediction\" },",
      "",
    );
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(drifted);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes("usePRISMSurfaceFinishPredict"))).toBe(true);
  });

  it("flags loss of milling or turning capability", () => {
    const drifted = CPS_FIXTURE.replace(
      "capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;",
      "capabilities = CAPABILITY_TURNING;",
    );
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(drifted);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes("CAPABILITY_MILLING"))).toBe(true);
  });

  it("flags description swap (someone substituted an unrelated Okuma post)", () => {
    // U-PPGMU02-FOLLOWUP: an unrelated Okuma post (e.g. a Multus U3000 or
    // an LB250II-M) would have a different description while still passing
    // the vendor=OKUMA check. The description constant catches that.
    const drifted = CPS_FIXTURE.replace(
      'description = "Okuma Multus B250IIW Ultra Enhanced";',
      'description = "Okuma Multus U3000W";',
    );
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(drifted);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes("description"))).toBe(true);
  });

  it("flags extension drift (Mastercam emitting Fanuc .NC instead of Okuma .min)", () => {
    const drifted = CPS_FIXTURE.replace('extension = "min";', 'extension = "nc";');
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(drifted);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes("extension"))).toBe(true);
  });

  it("flags programNameIsInteger drift (Fanuc-style integer-only names)", () => {
    const drifted = CPS_FIXTURE.replace(
      "programNameIsInteger = false;",
      "programNameIsInteger = true;",
    );
    const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(drifted);
    const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes("programNameIsInteger"))).toBe(true);
  });
});

// ============================================================================
// inspectCanonical with injected content + getStats
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine — facade methods", () => {
  it("inspectCanonical wires loadCpsContent + parseMetadata + validateCanonical", () => {
    const result = okumaMultusB250IIMillTurnMasterPostEngine.inspectCanonical({
      cpsContent: CPS_FIXTURE,
    });

    expect(result.metadata.vendor).toBe("OKUMA");
    expect(result.metadata.forkid).toBe(CANONICAL_FORKID);
    expect(result.validation.ok).toBe(true);
    expect(result.validation.warnings).toEqual([]);
  });

  it("getStats surfaces the canonical post identity for the capability census", () => {
    const stats = okumaMultusB250IIMillTurnMasterPostEngine.getStats();

    expect(stats.engine).toBe("OkumaMultusB250IIMillTurnMasterPostEngine");
    expect(stats.canonical_post).toBe(CANONICAL_POST_RELATIVE_PATH);
    expect(stats.controller).toBe(CANONICAL_CONTROLLER);
    expect(stats.forkid).toBe(CANONICAL_FORKID);
    expect(stats.capabilities).toEqual(["milling", "turning"]);
    expect(stats.prism_intelligence_flags).toBe(11);
    expect(stats.scaffold).toBe(true);
  });
});

// ============================================================================
// LIVE READ — only when the canonical .cps is on disk in this checkout
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine — live canonical read", () => {
  // Resolve relative to the repo root (process.cwd() is the test runner cwd —
  // typically `mcp-server/`). Walk up until we hit a directory that has
  // `JM DIE/`, OR fall back to two levels up.
  function resolveRepoRoot(): string {
    let dir = process.cwd();
    for (let i = 0; i < 4; i++) {
      if (existsSync(path.join(dir, "JM DIE"))) return dir;
      dir = path.dirname(dir);
    }
    return path.resolve(process.cwd(), "..");
  }

  const repoRoot = resolveRepoRoot();
  const livePath = path.resolve(repoRoot, CANONICAL_POST_RELATIVE_PATH);
  const liveExists = existsSync(livePath);

  it.skipIf(!liveExists)(
    "parses the on-disk v5.2.7 .cps and validates against the canonical contract",
    () => {
      const content = readFileSync(livePath, "utf8");
      const meta = OkumaMultusB250IIMillTurnMasterPostEngine.parseMetadata(content);
      expect(meta.vendor).toBe("OKUMA");
      expect(meta.forkid).toBe(CANONICAL_FORKID);
      expect(meta.modelType).toBe("okuma multus b250IIw");
      expect(meta.capabilities).toEqual(
        expect.arrayContaining(["CAPABILITY_MILLING", "CAPABILITY_TURNING"]),
      );
      // Live file has additional non-PRISM properties — count is ≥ 13
      expect(meta.propertyCount).toBeGreaterThanOrEqual(13);
      expect(meta.prismFlagsDeclared).toHaveLength(11);

      const result = OkumaMultusB250IIMillTurnMasterPostEngine.validateCanonical(meta);
      expect(result.ok).toBe(true);
      expect(result.warnings).toEqual([]);
    },
  );
});
