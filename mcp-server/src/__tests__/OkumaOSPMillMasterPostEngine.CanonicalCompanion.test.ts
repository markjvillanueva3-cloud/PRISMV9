/**
 * Canonical-companion-post tests for the Okuma OSP mill engine (U-PPGMU05).
 *
 * The OkumaOSPMillMasterPostEngine emits its own G-code at the family level
 * (P300M / P500M handles MB-V / MU-V / Genos M-series 3-axis and 5-axis).
 * JM Die ALSO operates the M460V-5AX-specific PRISM-modified Mastercam/Fusion
 * CPS post for one particular Genos M460V (the 5AX trim, OSP-P300MA-H).
 *
 * These tests pin the engine's `OKUMA_M460V_CANONICAL_*` constants to the
 * exact values declared in `JM DIE/PRISM MODIFIED POST PROCESSORS/
 * OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps` so drift detection works.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  OKUMA_M460V_CANONICAL_POST_RELATIVE_PATH,
  OKUMA_M460V_CANONICAL_POST_FILENAME,
  OKUMA_M460V_CANONICAL_FORKID,
  OKUMA_M460V_CANONICAL_DESCRIPTION,
  OKUMA_M460V_CANONICAL_VENDOR,
  OKUMA_M460V_CANONICAL_REVISION_TAG,
  OKUMA_M460V_CANONICAL_EXTENSION,
  OKUMA_M460V_CANONICAL_MINIMUM_RUNTIME_REVISION,
  OKUMA_M460V_CANONICAL_CONTROLLER,
  OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

describe("OkumaOSPMillMasterPostEngine — canonical companion (U-PPGMU05)", () => {
  it("path points at the M460V-5AX iMachining-enhanced .cps under JM DIE/", () => {
    expect(OKUMA_M460V_CANONICAL_POST_RELATIVE_PATH).toContain("JM DIE");
    expect(OKUMA_M460V_CANONICAL_POST_RELATIVE_PATH).toContain("PRISM MODIFIED POST PROCESSORS");
    expect(OKUMA_M460V_CANONICAL_POST_RELATIVE_PATH.endsWith(OKUMA_M460V_CANONICAL_POST_FILENAME)).toBe(true);
    expect(OKUMA_M460V_CANONICAL_POST_FILENAME).toBe(
      "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps",
    );
  });

  it("identity fields match the .cps declarations exactly", () => {
    expect(OKUMA_M460V_CANONICAL_FORKID).toBe("2F9AB8A9-6D4F-4087-81B1-3E14AE260F81");
    expect(OKUMA_M460V_CANONICAL_DESCRIPTION).toBe("OKUMA M460V-5AX Ultra Enhanced");
    expect(OKUMA_M460V_CANONICAL_VENDOR).toBe("OKUMA");
    expect(OKUMA_M460V_CANONICAL_EXTENSION).toBe("MIN");
    expect(OKUMA_M460V_CANONICAL_MINIMUM_RUNTIME_REVISION).toBe(45917);
    expect(OKUMA_M460V_CANONICAL_REVISION_TAG).toBe("44100 Enhanced Edition");
  });

  it("controller is OSP-P300MA-H (the 5-axis specialty trim, not the base P300M)", () => {
    expect(OKUMA_M460V_CANONICAL_CONTROLLER).toBe("OSP-P300MA-H");
    // Distinct from the family-level designation — catches confusion with
    // the engine's own family support (P300M / P500M).
    expect(OKUMA_M460V_CANONICAL_CONTROLLER).not.toBe("OSP-P300M");
    expect(OKUMA_M460V_CANONICAL_CONTROLLER).not.toBe("OSP-P500M");
  });

  it("PRISM feature families list captures the 5-axis + iMachining + cycle-time set", () => {
    expect(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES.length).toBeGreaterThanOrEqual(20);
    expect(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("five_axis_tcp_g169_g170");
    expect(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("high_precision_mode_g08_p1");
    expect(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("c_axis_rotary_repositioning");
    expect(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("imachining_variable_feed_8_level");
    expect(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("super_nurbs_g131");
    expect(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES).toContain("singularity_avoidance_warning");
    // No duplicates
    expect(new Set(OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES).size).toBe(
      OKUMA_M460V_CANONICAL_PRISM_FEATURE_FAMILIES.length,
    );
  });

  it("OKUMA_M460V_CANONICAL_EXTENSION is uppercase MIN (Okuma post emits .MIN files)", () => {
    // Catches the "lowercase min vs uppercase MIN" confusion. The Multus post
    // declares lowercase "min"; the M460V-5AX post declares uppercase "MIN".
    // Both are Okuma but the case differs by post version.
    expect(OKUMA_M460V_CANONICAL_EXTENSION).toBe("MIN");
    expect(OKUMA_M460V_CANONICAL_EXTENSION).not.toBe("hnc");
    expect(OKUMA_M460V_CANONICAL_EXTENSION).not.toBe("nc");
  });
});

describe("OkumaOSPMillMasterPostEngine — live canonical .cps verification", () => {
  function resolveRepoRoot(): string {
    let dir = process.cwd();
    for (let i = 0; i < 4; i++) {
      if (existsSync(path.join(dir, "JM DIE"))) return dir;
      dir = path.dirname(dir);
    }
    return path.resolve(process.cwd(), "..");
  }

  const repoRoot = resolveRepoRoot();
  const livePath = path.resolve(repoRoot, OKUMA_M460V_CANONICAL_POST_RELATIVE_PATH);
  const liveExists = existsSync(livePath);

  it.skipIf(!liveExists)(
    "live OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps header confirms our pinned identity fields",
    () => {
      const content = readFileSync(livePath, "utf8").slice(0, 32 * 1024);
      const forkidMatch = /FORKID\s*\{([0-9A-Fa-f-]+)\}/.exec(content);
      expect(forkidMatch?.[1]).toBe(OKUMA_M460V_CANONICAL_FORKID);
      const vendorMatch = /^vendor\s*=\s*"([^"]+)"/m.exec(content);
      expect(vendorMatch?.[1]).toBe(OKUMA_M460V_CANONICAL_VENDOR);
      const descMatch = /^description\s*=\s*"([^"]+)"/m.exec(content);
      expect(descMatch?.[1]).toBe(OKUMA_M460V_CANONICAL_DESCRIPTION);
      const extMatch = /^extension\s*=\s*"([^"]+)"/m.exec(content);
      expect(extMatch?.[1]).toBe(OKUMA_M460V_CANONICAL_EXTENSION);
      const minRevMatch = /^minimumRevision\s*=\s*(\d+)/m.exec(content);
      expect(parseInt(minRevMatch?.[1] ?? "0", 10)).toBe(OKUMA_M460V_CANONICAL_MINIMUM_RUNTIME_REVISION);
    },
  );
});
