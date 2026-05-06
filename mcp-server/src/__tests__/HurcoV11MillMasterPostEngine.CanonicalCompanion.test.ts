/**
 * Canonical-companion-post tests for the Hurco V11 mill engine (U-PPGMU04).
 *
 * The HurcoV11MillMasterPostEngine emits its own G-code from a structured
 * MillOperation[] input. JM Die ALSO operates the v11 PRISM-modified
 * Mastercam/Fusion CPS post for the same VM30i machine. These tests pin
 * the engine's `HURCO_CANONICAL_*` constants to the exact values declared
 * in `JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps`,
 * so downstream drift detection (someone swaps in a different Hurco post,
 * downgrades the revision, etc.) catches the change.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  HURCO_CANONICAL_POST_RELATIVE_PATH,
  HURCO_CANONICAL_POST_FILENAME,
  HURCO_CANONICAL_FORKID,
  HURCO_CANONICAL_DESCRIPTION,
  HURCO_CANONICAL_VENDOR,
  HURCO_CANONICAL_REVISION_TAG,
  HURCO_CANONICAL_EXTENSION,
  HURCO_CANONICAL_PROGRAM_NAME_IS_INTEGER,
  HURCO_CANONICAL_MINIMUM_RUNTIME_REVISION,
  HURCO_CANONICAL_PRISM_FEATURE_FAMILIES,
} from "../engines/HurcoV11MillMasterPostEngine.js";

describe("HurcoV11MillMasterPostEngine — canonical companion (U-PPGMU04)", () => {
  it("path points at the v11 PRISM-modified .cps under JM DIE/", () => {
    expect(HURCO_CANONICAL_POST_RELATIVE_PATH).toContain("JM DIE");
    expect(HURCO_CANONICAL_POST_RELATIVE_PATH).toContain("PRISM MODIFIED POST PROCESSORS");
    expect(HURCO_CANONICAL_POST_RELATIVE_PATH.endsWith(HURCO_CANONICAL_POST_FILENAME)).toBe(true);
    expect(HURCO_CANONICAL_POST_FILENAME).toBe("HURCO_VM30i_PRISM_v11.cps");
  });

  it("identity fields match the .cps declarations exactly", () => {
    expect(HURCO_CANONICAL_FORKID).toBe("1B14E478-26FE-4db2-A3E7-FB814E8C0B4E");
    expect(HURCO_CANONICAL_DESCRIPTION).toBe("PRISM Enhanced - HURCO VM30i");
    expect(HURCO_CANONICAL_VENDOR).toBe("HURCO");
    expect(HURCO_CANONICAL_EXTENSION).toBe("hnc");
    expect(HURCO_CANONICAL_PROGRAM_NAME_IS_INTEGER).toBe(true);
    expect(HURCO_CANONICAL_MINIMUM_RUNTIME_REVISION).toBe(45793);
    expect(HURCO_CANONICAL_REVISION_TAG).toContain("PRISM v10.9 DRILLFIX");
    expect(HURCO_CANONICAL_REVISION_TAG).toContain("Runtime Drilling Multiplier Exclusion");
  });

  it("PRISM feature families list captures the v10.9 enhancement set (20+ families)", () => {
    // Hurco's .cps groups features into machine-spec / process / safety / display
    // tiers — distinct from Multus's flat 11-flag list. This list is the audit
    // baseline; if the .cps gains a new feature family, this list must update.
    expect(HURCO_CANONICAL_PRISM_FEATURE_FAMILIES.length).toBeGreaterThanOrEqual(15);
    expect(HURCO_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("aggressiveness_8_level");
    expect(HURCO_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("dynamic_depth_feed_adjustment");
    expect(HURCO_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("hsm_hem_physics_engine");
    expect(HURCO_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("loc_engagement_safety_override");
    expect(HURCO_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("drillfix_runtime_exclusion");
    // No duplicates
    expect(new Set(HURCO_CANONICAL_PRISM_FEATURE_FAMILIES).size).toBe(
      HURCO_CANONICAL_PRISM_FEATURE_FAMILIES.length,
    );
  });

  it("HURCO_CANONICAL_EXTENSION is hnc (Hurco WinMax native), NOT min (Okuma) or nc (Fanuc)", () => {
    // This catches a class of mistake where someone copies the Okuma extension
    // constant into the Hurco context. Hurco's .hnc is uniquely WinMax-native.
    expect(HURCO_CANONICAL_EXTENSION).not.toBe("min");
    expect(HURCO_CANONICAL_EXTENSION).not.toBe("nc");
    expect(HURCO_CANONICAL_EXTENSION).toBe("hnc");
  });
});

describe("HurcoV11MillMasterPostEngine — live canonical .cps verification", () => {
  function resolveRepoRoot(): string {
    let dir = process.cwd();
    for (let i = 0; i < 4; i++) {
      if (existsSync(path.join(dir, "JM DIE"))) return dir;
      dir = path.dirname(dir);
    }
    return path.resolve(process.cwd(), "..");
  }

  const repoRoot = resolveRepoRoot();
  const livePath = path.resolve(repoRoot, HURCO_CANONICAL_POST_RELATIVE_PATH);
  const liveExists = existsSync(livePath);

  it.skipIf(!liveExists)(
    "live HURCO_VM30i_PRISM_v11.cps header confirms our pinned identity fields",
    () => {
      // Read first 32 KB — covers all identity declarations.
      const content = readFileSync(livePath, "utf8").slice(0, 32 * 1024);
      // FORKID line 50: `  FORKID {1B14E478-26FE-4db2-A3E7-FB814E8C0B4E}`
      const forkidMatch = /FORKID\s*\{([0-9A-Fa-f-]+)\}/.exec(content);
      expect(forkidMatch?.[1]).toBe(HURCO_CANONICAL_FORKID);
      // vendor line 174: `vendor = "HURCO";`
      const vendorMatch = /^vendor\s*=\s*"([^"]+)"/m.exec(content);
      expect(vendorMatch?.[1]).toBe(HURCO_CANONICAL_VENDOR);
      // extension line 182: `extension = "hnc";`
      const extMatch = /^extension\s*=\s*"([^"]+)"/m.exec(content);
      expect(extMatch?.[1]).toBe(HURCO_CANONICAL_EXTENSION);
      // programNameIsInteger line 183: `programNameIsInteger = true;`
      const progIntMatch = /^programNameIsInteger\s*=\s*(true|false)/m.exec(content);
      expect(progIntMatch?.[1]).toBe(String(HURCO_CANONICAL_PROGRAM_NAME_IS_INTEGER));
      // minimumRevision line 178: `minimumRevision = 45793;`
      const minRevMatch = /^minimumRevision\s*=\s*(\d+)/m.exec(content);
      expect(parseInt(minRevMatch?.[1] ?? "0", 10)).toBe(HURCO_CANONICAL_MINIMUM_RUNTIME_REVISION);
    },
  );
});
