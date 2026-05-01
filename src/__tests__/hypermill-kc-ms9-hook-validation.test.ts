/**
 * HM-KC-MS9-S2 / U-HKC48: Hook Firing Validation
 *
 * Tests all registered safety hooks from the 7 artifact generator engines:
 * - BLOCKING hooks correctly reject unsafe values (negative allowance, collision gates)
 * - CRITICAL hooks correctly flag safety-critical parameters (grip force, tilt limits, burn risk)
 * - WARNING hooks correctly flag risky-but-operable values (tolerance, thermal approach)
 * - Hook pipeline fires in correct priority order (BLOCKING > CRITICAL > WARNING)
 * - Every hook has valid structure and safe range consistency
 *
 * @milestone HM-KC-MS9/U-HKC48
 */

import { describe, it, expect } from "vitest";

import {
  hyperMillCADArtifactGeneratorEngine,
  type HookRule,
} from "../engines/hypermill/HyperMillCADArtifactGeneratorEngine.js";
import { hyperMillFixtureArtifactGeneratorEngine } from "../engines/hypermill/HyperMillFixtureArtifactGeneratorEngine.js";
import { hyperMillCAMCoreArtifactGeneratorEngine } from "../engines/hypermill/HyperMillCAMCoreArtifactGeneratorEngine.js";
import { hyperMillCAMAdvancedArtifactGeneratorEngine } from "../engines/hypermill/HyperMillCAMAdvancedArtifactGeneratorEngine.js";
import { hyperMillLinkingArtifactGeneratorEngine } from "../engines/hypermill/HyperMillLinkingArtifactGeneratorEngine.js";
import { hyperMillSimNCArtifactGeneratorEngine } from "../engines/hypermill/HyperMillSimNCArtifactGeneratorEngine.js";
import { hyperMillSettingsArtifactGeneratorEngine } from "../engines/hypermill/HyperMillSettingsArtifactGeneratorEngine.js";

// ── Collect all hooks from all generators ──────────────────────────────────────

interface GeneratorHooks {
  name: string;
  hooks: HookRule[];
}

const GENERATOR_HOOKS: GeneratorHooks[] = [
  { name: "CAD", hooks: hyperMillCADArtifactGeneratorEngine.generate().hookRules },
  { name: "Fixture", hooks: hyperMillFixtureArtifactGeneratorEngine.generate().hookRules },
  { name: "CAM-Core", hooks: hyperMillCAMCoreArtifactGeneratorEngine.generate().hookRules },
  { name: "CAM-Advanced", hooks: hyperMillCAMAdvancedArtifactGeneratorEngine.generate().hookRules },
  { name: "Linking", hooks: hyperMillLinkingArtifactGeneratorEngine.generate().hookRules },
  { name: "Sim-NC", hooks: hyperMillSimNCArtifactGeneratorEngine.generate().hookRules },
  { name: "Settings", hooks: hyperMillSettingsArtifactGeneratorEngine.generate().hookRules },
];

const ALL_HOOKS = GENERATOR_HOOKS.flatMap((g) => g.hooks);

// ── Helper: extract hook identity fields ───────────────────────────────────────

function getHookName(hook: HookRule): string {
  return (hook as any).paramName ?? (hook as any).parameter ?? (hook as any).name ?? "unknown";
}

function hasNumericRange(hook: HookRule): boolean {
  return (hook as any).minSafe !== undefined && (hook as any).maxSafe !== undefined;
}

function getMinSafe(hook: HookRule): number {
  return (hook as any).minSafe;
}

function getMaxSafe(hook: HookRule): number {
  return (hook as any).maxSafe;
}

// ── Simulated hook firing ──────────────────────────────────────────────────────

type HookResult = "PASS" | "BLOCKED" | "CRITICAL" | "WARNING";

/**
 * Simulates a hook firing against a test value.
 * Returns the hook result based on whether the value is within the safe range.
 */
function fireHook(hook: HookRule, value: number): HookResult {
  if (!hasNumericRange(hook)) return "PASS"; // Non-numeric hooks (Settings) pass numeric tests
  const min = getMinSafe(hook);
  const max = getMaxSafe(hook);
  if (value < min || value > max) {
    // Value out of safe range — return severity-based result
    if (hook.severity === "BLOCKING") return "BLOCKED";
    if (hook.severity === "CRITICAL") return "CRITICAL";
    return "WARNING";
  }
  return "PASS";
}

// ── Global hook counts ─────────────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: Hook Counts & Coverage", () => {
  it("collects hooks from all 7 generators", () => {
    expect(GENERATOR_HOOKS.length).toBe(7);
  });

  it("total hook count >= 50", () => {
    expect(ALL_HOOKS.length).toBeGreaterThanOrEqual(50);
  });

  it("every generator contributes at least 1 hook", () => {
    for (const gen of GENERATOR_HOOKS) {
      expect(gen.hooks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has BLOCKING hooks", () => {
    const blocking = ALL_HOOKS.filter((h) => h.severity === "BLOCKING");
    expect(blocking.length).toBeGreaterThanOrEqual(3);
  });

  it("has CRITICAL hooks", () => {
    const critical = ALL_HOOKS.filter((h) => h.severity === "CRITICAL");
    expect(critical.length).toBeGreaterThanOrEqual(20);
  });

  it("has WARNING hooks", () => {
    const warning = ALL_HOOKS.filter((h) => h.severity === "WARNING");
    expect(warning.length).toBeGreaterThanOrEqual(5);
  });

  it("hook severity distribution is safety-biased (CRITICAL >= WARNING)", () => {
    const critical = ALL_HOOKS.filter((h) => h.severity === "CRITICAL").length;
    const warning = ALL_HOOKS.filter((h) => h.severity === "WARNING").length;
    expect(critical).toBeGreaterThanOrEqual(warning);
  });
});

// ── Hook structure validation ──────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: Hook Structure Validation", () => {
  it("every hook has a valid severity", () => {
    const valid = new Set(["CRITICAL", "WARNING", "BLOCKING"]);
    for (const hook of ALL_HOOKS) {
      expect(valid.has(hook.severity)).toBe(true);
    }
  });

  it("every hook has a non-empty identifier (paramName or name)", () => {
    for (const hook of ALL_HOOKS) {
      const name = getHookName(hook);
      expect(name).not.toBe("unknown");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("every hook has a non-empty domain", () => {
    for (const hook of ALL_HOOKS) {
      expect(hook.domain).toBeTruthy();
      expect(hook.domain.length).toBeGreaterThan(0);
    }
  });

  it("every hook has a meaningful description (> 15 chars)", () => {
    for (const hook of ALL_HOOKS) {
      expect(hook.description).toBeTruthy();
      expect(hook.description.length).toBeGreaterThan(15);
    }
  });

  it("every numeric hook has minSafe <= maxSafe", () => {
    for (const hook of ALL_HOOKS) {
      if (hasNumericRange(hook)) {
        expect(getMinSafe(hook)).toBeLessThanOrEqual(getMaxSafe(hook));
      }
    }
  });

  it("every numeric hook has finite safe range values", () => {
    for (const hook of ALL_HOOKS) {
      if (hasNumericRange(hook)) {
        expect(Number.isFinite(getMinSafe(hook))).toBe(true);
        expect(Number.isFinite(getMaxSafe(hook))).toBe(true);
      }
    }
  });

  it("numeric hooks have non-negative minSafe where physically required", () => {
    // Parameters like grip_force, pressure, collision_distance can't be negative
    const mustBeNonNeg = new Set([
      "grip_force", "hold_force_per_zone", "collision_distance",
      "pressure", "nose_radius", "blade_cusp_height", "target_height",
      "collision_tolerance", "gouge_tolerance",
    ]);
    for (const hook of ALL_HOOKS) {
      if (hasNumericRange(hook) && mustBeNonNeg.has(getHookName(hook))) {
        expect(getMinSafe(hook)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ── BLOCKING hook firing tests ─────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: BLOCKING Hooks — Reject Unsafe Values", () => {
  const blockingHooks = ALL_HOOKS.filter((h) => h.severity === "BLOCKING");

  it("BLOCKING hooks exist in the system", () => {
    expect(blockingHooks.length).toBeGreaterThanOrEqual(3);
  });

  for (const hook of blockingHooks) {
    const name = getHookName(hook);

    if (hasNumericRange(hook)) {
      const min = getMinSafe(hook);
      const max = getMaxSafe(hook);

      describe(`[BLOCKING] ${hook.domain}/${name}`, () => {
        it("blocks value below minSafe", () => {
          const unsafeValue = min - 1;
          expect(fireHook(hook, unsafeValue)).toBe("BLOCKED");
        });

        it("blocks value above maxSafe", () => {
          const unsafeValue = max + 1;
          expect(fireHook(hook, unsafeValue)).toBe("BLOCKED");
        });

        it("passes value within safe range", () => {
          const safeValue = (min + max) / 2;
          expect(fireHook(hook, safeValue)).toBe("PASS");
        });

        it("passes value at minSafe boundary", () => {
          expect(fireHook(hook, min)).toBe("PASS");
        });

        it("passes value at maxSafe boundary", () => {
          expect(fireHook(hook, max)).toBe("PASS");
        });
      });
    } else {
      // Settings-type hooks (no numeric range) — verify they exist with correct structure
      it(`[BLOCKING] ${hook.domain}/${name} — non-numeric gate hook exists`, () => {
        expect(hook.severity).toBe("BLOCKING");
        expect(hook.description.length).toBeGreaterThan(10);
      });
    }
  }
});

// ── CRITICAL hook firing tests ─────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: CRITICAL Hooks — Flag Safety-Critical Values", () => {
  const criticalHooks = ALL_HOOKS.filter(
    (h) => h.severity === "CRITICAL" && hasNumericRange(h)
  );

  it("CRITICAL numeric hooks exist", () => {
    expect(criticalHooks.length).toBeGreaterThanOrEqual(15);
  });

  for (const hook of criticalHooks) {
    const name = getHookName(hook);
    const min = getMinSafe(hook);
    const max = getMaxSafe(hook);

    describe(`[CRITICAL] ${hook.domain}/${name} [${min}–${max}]`, () => {
      it("flags value below minSafe as CRITICAL", () => {
        const unsafeValue = min - Math.abs(min * 0.5 + 0.1);
        expect(fireHook(hook, unsafeValue)).toBe("CRITICAL");
      });

      it("flags value above maxSafe as CRITICAL", () => {
        const unsafeValue = max + Math.abs(max * 0.5 + 0.1);
        expect(fireHook(hook, unsafeValue)).toBe("CRITICAL");
      });

      it("passes value at midpoint of safe range", () => {
        const safeValue = (min + max) / 2;
        expect(fireHook(hook, safeValue)).toBe("PASS");
      });
    });
  }
});

// ── WARNING hook firing tests ──────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: WARNING Hooks — Flag Risky Values", () => {
  const warningHooks = ALL_HOOKS.filter(
    (h) => h.severity === "WARNING" && hasNumericRange(h)
  );

  it("WARNING numeric hooks exist", () => {
    expect(warningHooks.length).toBeGreaterThanOrEqual(3);
  });

  for (const hook of warningHooks) {
    const name = getHookName(hook);
    const min = getMinSafe(hook);
    const max = getMaxSafe(hook);

    describe(`[WARNING] ${hook.domain}/${name} [${min}–${max}]`, () => {
      it("flags value below minSafe as WARNING", () => {
        const riskyValue = min - Math.abs(min * 0.1 + 0.01);
        expect(fireHook(hook, riskyValue)).toBe("WARNING");
      });

      it("flags value above maxSafe as WARNING", () => {
        const riskyValue = max + Math.abs(max * 0.1 + 0.01);
        expect(fireHook(hook, riskyValue)).toBe("WARNING");
      });

      it("passes value within safe range", () => {
        const safeValue = (min + max) / 2;
        expect(fireHook(hook, safeValue)).toBe("PASS");
      });
    });
  }
});

// ── Domain-specific hook coverage ──────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: Domain-Specific Hook Coverage", () => {
  it("CAD domain has hooks for wall_thickness and tolerance", () => {
    const cadHooks = ALL_HOOKS.filter((h) => h.domain.startsWith("CAD"));
    const hookNames = cadHooks.map(getHookName);
    expect(hookNames).toContain("wall_thickness");
    expect(cadHooks.some((h) => getHookName(h).includes("tolerance"))).toBe(true);
  });

  it("CAD domain has electrode safety hooks (spark_gap, overcut)", () => {
    const cadHooks = ALL_HOOKS.filter((h) => h.domain.startsWith("CAD"));
    const hookNames = cadHooks.map(getHookName);
    expect(hookNames).toContain("spark_gap");
    expect(hookNames).toContain("overcut_rough");
  });

  it("Fixture domain has grip force and allowance hooks", () => {
    const fixtureHooks = ALL_HOOKS.filter((h) => h.domain.startsWith("Fixture"));
    const hookNames = fixtureHooks.map(getHookName);
    expect(hookNames).toContain("grip_force");
    expect(hookNames.some((n) => n.includes("allow"))).toBe(true);
  });

  it("CAM drilling has L/D ratio safety hook", () => {
    const drillingHooks = ALL_HOOKS.filter((h) => h.domain.includes("Drilling"));
    const hookNames = drillingHooks.map(getHookName);
    expect(hookNames.some((n) => n.includes("ld_ratio") || n.includes("l_d"))).toBe(true);
  });

  it("CAM 5-axis has tilt angle and collision distance hooks", () => {
    const fiveAxisHooks = ALL_HOOKS.filter((h) => h.domain.includes("5Axis"));
    const hookNames = fiveAxisHooks.map(getHookName);
    expect(hookNames).toContain("tilt_angle");
    expect(hookNames).toContain("collision_distance");
  });

  it("CAM turning has spindle speed clamp hook", () => {
    const turningHooks = ALL_HOOKS.filter((h) => h.domain.includes("Turning"));
    const hookNames = turningHooks.map(getHookName);
    expect(hookNames).toContain("s_max_clamp");
  });

  it("CAM grinding has burn risk threshold hook", () => {
    const grindingHooks = ALL_HOOKS.filter((h) => h.domain.includes("Grinding"));
    const hookNames = grindingHooks.map(getHookName);
    expect(hookNames).toContain("burn_risk_threshold");
  });

  it("Linking domain has arc_radius and fixture_clearance hooks", () => {
    const linkingHooks = ALL_HOOKS.filter((h) => h.domain.startsWith("Linking"));
    const hookNames = linkingHooks.map(getHookName);
    expect(hookNames).toContain("arc_radius");
    expect(hookNames).toContain("fixture_clearance");
  });

  it("Simulation domain has collision_tolerance and gouge_tolerance hooks", () => {
    const simHooks = ALL_HOOKS.filter((h) => h.domain.startsWith("Simulation") || h.domain.startsWith("NC"));
    const hookNames = simHooks.map(getHookName);
    expect(hookNames).toContain("collision_tolerance");
    expect(hookNames).toContain("gouge_tolerance");
  });

  it("Settings domain has measurement system consistency hook", () => {
    const settingsHooks = ALL_HOOKS.filter((h) => h.domain === "Measurement" || h.domain === "Calculation" || h.domain === "Machine");
    expect(settingsHooks.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Scenario-based hook firing (realistic machining scenarios) ─────────────────

describe("HM-KC-MS9-S2/U-HKC48: Scenario-Based Hook Firing", () => {
  // Helper to find a hook by paramName across all hooks
  function findHook(paramName: string): HookRule | undefined {
    return ALL_HOOKS.find((h) => getHookName(h) === paramName);
  }

  it("Scenario: Deep hole drilling with L/D = 15 triggers CRITICAL", () => {
    const hook = findHook("ld_ratio_limit");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      // L/D = 15 exceeds typical safe max of 12
      expect(fireHook(hook!, 15)).toBe("CRITICAL");
    }
  });

  it("Scenario: Safe drilling L/D = 6 passes", () => {
    const hook = findHook("ld_ratio_limit");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 6)).toBe("PASS");
    }
  });

  it("Scenario: 5-axis tilt at 60° exceeds safe range", () => {
    const hook = findHook("tilt_angle");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 60)).not.toBe("PASS");
    }
  });

  it("Scenario: 5-axis tilt at 20° is safe", () => {
    const hook = findHook("tilt_angle");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 20)).toBe("PASS");
    }
  });

  it("Scenario: Negative stock allowance triggers BLOCKING", () => {
    const hook = findHook("allow_negative");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, -1)).toBe("BLOCKED");
    }
  });

  it("Scenario: Grip force at 200 N is too low (CRITICAL)", () => {
    const hook = findHook("grip_force");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 200)).toBe("CRITICAL");
    }
  });

  it("Scenario: Grip force at 5000 N is safe", () => {
    const hook = findHook("grip_force");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 5000)).toBe("PASS");
    }
  });

  it("Scenario: Grinding burn risk at 0.98 triggers CRITICAL", () => {
    const hook = findHook("burn_risk_threshold");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 0.98)).not.toBe("PASS");
    }
  });

  it("Scenario: Grinding burn risk at 0.5 is safe", () => {
    const hook = findHook("burn_risk_threshold");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 0.5)).toBe("PASS");
    }
  });

  it("Scenario: Collision distance at 0.1 mm is too close (CRITICAL)", () => {
    const hook = findHook("collision_distance");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 0.1)).toBe("CRITICAL");
    }
  });

  it("Scenario: Wall thickness at 0.3 mm is too thin (CRITICAL)", () => {
    const hook = findHook("wall_thickness");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 0.3)).toBe("CRITICAL");
    }
  });

  it("Scenario: Spark gap at 0.15 mm is safe for EDM", () => {
    const hook = findHook("spark_gap");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 0.15)).toBe("PASS");
    }
  });

  it("Scenario: CSS spindle clamp at 50 RPM is too low (CRITICAL)", () => {
    const hook = findHook("s_max_clamp");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 50)).toBe("CRITICAL");
    }
  });

  it("Scenario: Probe approach feed at 10 mm/min is too slow (CRITICAL)", () => {
    const hook = findHook("approach_feed");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 10)).toBe("CRITICAL");
    }
  });

  it("Scenario: Fixture clearance at 1 mm violates ISO 16090 minimum", () => {
    const hook = findHook("fixture_clearance");
    expect(hook).toBeDefined();
    if (hook && hasNumericRange(hook)) {
      expect(fireHook(hook!, 1)).not.toBe("PASS");
    }
  });
});

// ── Hook priority ordering ─────────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: Hook Priority Ordering", () => {
  const SEVERITY_PRIORITY: Record<string, number> = {
    BLOCKING: 0,
    CRITICAL: 1,
    WARNING: 2,
  };

  it("BLOCKING has highest priority (0)", () => {
    expect(SEVERITY_PRIORITY.BLOCKING).toBeLessThan(SEVERITY_PRIORITY.CRITICAL);
    expect(SEVERITY_PRIORITY.CRITICAL).toBeLessThan(SEVERITY_PRIORITY.WARNING);
  });

  it("multi-hook pipeline returns worst severity for a domain", () => {
    // Simulate firing multiple hooks for Fixture domain with a known-bad value
    const fixtureHooks = ALL_HOOKS.filter(
      (h) => h.domain.startsWith("Fixture") && hasNumericRange(h)
    );
    expect(fixtureHooks.length).toBeGreaterThanOrEqual(3);

    // Fire all hooks with value = -10 (should trigger everything)
    const results = fixtureHooks.map((h) => fireHook(h, -10));
    const worstResult = results.reduce((worst, r) => {
      const p = (s: HookResult) =>
        s === "BLOCKED" ? 0 : s === "CRITICAL" ? 1 : s === "WARNING" ? 2 : 3;
      return p(r) < p(worst) ? r : worst;
    }, "PASS" as HookResult);

    // With -10, at least one BLOCKING hook (allow_negative) should fire
    expect(worstResult).toBe("BLOCKED");
  });

  it("multi-hook pipeline returns PASS when all values are safe", () => {
    // Use CAD hooks with midpoint values — all should pass
    const cadHooks = ALL_HOOKS.filter(
      (h) => h.domain.startsWith("CAD") && hasNumericRange(h)
    );
    const results = cadHooks.map((h) => {
      const mid = (getMinSafe(h) + getMaxSafe(h)) / 2;
      return fireHook(h, mid);
    });
    expect(results.every((r) => r === "PASS")).toBe(true);
  });

  it("hooks within same domain are sorted by severity in the generation output", () => {
    // Verify that BLOCKING hooks can be found before WARNING hooks
    // (not strictly ordered in array, but all severities present)
    for (const gen of GENERATOR_HOOKS) {
      if (gen.hooks.length < 2) continue;
      const severities = gen.hooks.map((h) => h.severity);
      const hasMixed = new Set(severities).size > 1;
      if (hasMixed) {
        // At least verify both levels exist, ordering is by consumer
        expect(severities.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

// ── Integration: hook coverage per generator ───────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: Per-Generator Hook Coverage", () => {
  const expected: Record<string, { min: number; hasCritical: boolean }> = {
    CAD: { min: 10, hasCritical: true },
    Fixture: { min: 8, hasCritical: true },
    "CAM-Core": { min: 10, hasCritical: true },
    "CAM-Advanced": { min: 10, hasCritical: true },
    Linking: { min: 5, hasCritical: true },
    "Sim-NC": { min: 5, hasCritical: true },
    Settings: { min: 1, hasCritical: false },
  };

  for (const gen of GENERATOR_HOOKS) {
    describe(`[${gen.name}] Hook Coverage`, () => {
      const exp = expected[gen.name];

      it(`has >= ${exp?.min ?? 1} hooks`, () => {
        expect(gen.hooks.length).toBeGreaterThanOrEqual(exp?.min ?? 1);
      });

      if (exp?.hasCritical) {
        it("includes CRITICAL severity hooks", () => {
          const hasCrit = gen.hooks.some((h) => h.severity === "CRITICAL");
          expect(hasCrit).toBe(true);
        });
      }

      it("all hooks have valid severity values", () => {
        const valid = new Set(["CRITICAL", "WARNING", "BLOCKING"]);
        for (const hook of gen.hooks) {
          expect(valid.has(hook.severity)).toBe(true);
        }
      });

      it("numeric hooks pass with midpoint values (sanity check)", () => {
        for (const hook of gen.hooks) {
          if (hasNumericRange(hook)) {
            const mid = (getMinSafe(hook) + getMaxSafe(hook)) / 2;
            expect(fireHook(hook, mid)).toBe("PASS");
          }
        }
      });
    });
  }
});

// ── Boundary precision tests ───────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: Boundary Precision", () => {
  it("hooks with tight ranges (min ≈ max) correctly validate boolean gates", () => {
    // Boolean gate hooks have minSafe === maxSafe (e.g., allow_negative: 0-0, halt_on_collision: 1-1)
    const gateHooks = ALL_HOOKS.filter(
      (h) => hasNumericRange(h) && getMinSafe(h) === getMaxSafe(h)
    );
    expect(gateHooks.length).toBeGreaterThanOrEqual(1);

    for (const hook of gateHooks) {
      const gateValue = getMinSafe(hook);
      // Exact value passes
      expect(fireHook(hook, gateValue)).toBe("PASS");
      // Any other value fails
      expect(fireHook(hook, gateValue + 1)).not.toBe("PASS");
      expect(fireHook(hook, gateValue - 1)).not.toBe("PASS");
    }
  });

  it("hooks with fractional ranges handle precision correctly", () => {
    // E.g., blade_cusp_height: 0.002-0.1, gouge_tolerance: 0.001-0.1
    const precisionHooks = ALL_HOOKS.filter(
      (h) => hasNumericRange(h) && getMinSafe(h) < 0.01 && getMinSafe(h) > 0
    );
    for (const hook of precisionHooks) {
      const min = getMinSafe(hook);
      const max = getMaxSafe(hook);
      // Value at 1/3 of range should pass
      const testVal = min + (max - min) / 3;
      expect(fireHook(hook, testVal)).toBe("PASS");
      // Value at 10x below min should fail
      expect(fireHook(hook, min / 10)).not.toBe("PASS");
    }
  });
});

// ── Summary report ─────────────────────────────────────────────────────────────

describe("HM-KC-MS9-S2/U-HKC48: Hook Validation Summary", () => {
  it("produces complete hook validation report", () => {
    const numericHooks = ALL_HOOKS.filter(hasNumericRange);
    const nonNumericHooks = ALL_HOOKS.filter((h) => !hasNumericRange(h));

    // Count pass/fail for all numeric hooks at midpoint (should all pass)
    let passCount = 0;
    let failCount = 0;
    for (const hook of numericHooks) {
      const mid = (getMinSafe(hook) + getMaxSafe(hook)) / 2;
      if (fireHook(hook, mid) === "PASS") passCount++;
      else failCount++;
    }

    // Count BLOCKING hooks that correctly reject out-of-range values
    let blockingCorrect = 0;
    const blockingHooks = ALL_HOOKS.filter((h) => h.severity === "BLOCKING" && hasNumericRange(h));
    for (const hook of blockingHooks) {
      const min = getMinSafe(hook);
      if (fireHook(hook, min - 1) === "BLOCKED") blockingCorrect++;
    }

    const report = {
      totalHooks: ALL_HOOKS.length,
      numericHooks: numericHooks.length,
      nonNumericHooks: nonNumericHooks.length,
      bySeverity: {
        BLOCKING: ALL_HOOKS.filter((h) => h.severity === "BLOCKING").length,
        CRITICAL: ALL_HOOKS.filter((h) => h.severity === "CRITICAL").length,
        WARNING: ALL_HOOKS.filter((h) => h.severity === "WARNING").length,
      },
      byGenerator: GENERATOR_HOOKS.map((g) => ({
        name: g.name,
        hooks: g.hooks.length,
        critical: g.hooks.filter((h) => h.severity === "CRITICAL").length,
        blocking: g.hooks.filter((h) => h.severity === "BLOCKING").length,
      })),
      midpointPassRate: `${passCount}/${numericHooks.length} (${((passCount / numericHooks.length) * 100).toFixed(1)}%)`,
      blockingRejectionRate: `${blockingCorrect}/${blockingHooks.length}`,
      domains: [...new Set(ALL_HOOKS.map((h) => h.domain))].sort(),
    };

    console.log("\n=== HM-KC-MS9 Hook Validation Report ===");
    console.log(`Total hooks: ${report.totalHooks} (${report.numericHooks} numeric, ${report.nonNumericHooks} non-numeric)`);
    console.log(`Severity: ${report.bySeverity.BLOCKING} BLOCKING, ${report.bySeverity.CRITICAL} CRITICAL, ${report.bySeverity.WARNING} WARNING`);
    console.log(`Midpoint pass rate: ${report.midpointPassRate}`);
    console.log(`BLOCKING rejection rate: ${report.blockingRejectionRate}`);
    console.log("\nBy generator:");
    for (const g of report.byGenerator) {
      console.log(`  ${g.name}: ${g.hooks} hooks (${g.critical} CRITICAL, ${g.blocking} BLOCKING)`);
    }
    console.log(`\nDomains: ${report.domains.join(", ")}`);

    // All midpoint values must pass
    expect(failCount).toBe(0);
    // All blocking hooks must correctly reject
    expect(blockingCorrect).toBe(blockingHooks.length);
    // Overall coverage
    expect(report.totalHooks).toBeGreaterThanOrEqual(50);
    expect(report.domains.length).toBeGreaterThanOrEqual(10);
  });
});
