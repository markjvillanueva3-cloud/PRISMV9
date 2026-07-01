/**
 * wizard-bridge-absorption.test.mjs — concrete-value tests for the 3
 * domain wizard configurations + LIVE integration over iter38 bridge.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-WIZARD-ABSORB-3
 * @slot echo · @iter 42 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ABSORPTION_SCHEMA_VERSION,
  MIN_TOOL_DIAMETER_MM,
  MIN_WIRE_DIAMETER_MM,
  MIN_BAR_DIAMETER_MM,
  MILL_WIZARD_STEPS,
  LATHE_WIZARD_STEPS,
  WIRE_EDM_WIZARD_STEPS,
  ALL_WIZARD_CONFIGS,
  validateIsoGroup,
  validatePositiveNumber,
  validateMinimum,
  buildDomainWizard,
  listAbsorbedDomains,
  totalAbsorbedSteps,
  stepCountsByDomain,
} from "./wizard-bridge-absorption.mjs";

import {
  createWizard,
  advance,
  currentStep,
  summarizeProgress,
  WIZARD_DOMAINS,
} from "./wizard-node-bridge.mjs";

describe("constants", () => {
  it("ABSORPTION_SCHEMA_VERSION = 1", () => {
    assert.equal(ABSORPTION_SCHEMA_VERSION, 1);
  });
  it("MIN_TOOL_DIAMETER_MM = 0.1 (smallest sensible end mill)", () => {
    assert.equal(MIN_TOOL_DIAMETER_MM, 0.1);
  });
  it("MIN_WIRE_DIAMETER_MM = 0.02 (smallest commercial EDM wire)", () => {
    assert.equal(MIN_WIRE_DIAMETER_MM, 0.02);
  });
  it("MIN_BAR_DIAMETER_MM = 1.0", () => {
    assert.equal(MIN_BAR_DIAMETER_MM, 1.0);
  });
});

describe("step counts (absorbed contract)", () => {
  it("MILL_WIZARD_STEPS has 12 entries", () => {
    assert.equal(MILL_WIZARD_STEPS.length, 12);
  });
  it("LATHE_WIZARD_STEPS has 10 entries", () => {
    assert.equal(LATHE_WIZARD_STEPS.length, 10);
  });
  it("WIRE_EDM_WIZARD_STEPS has 11 entries", () => {
    assert.equal(WIRE_EDM_WIZARD_STEPS.length, 11);
  });
  it("totalAbsorbedSteps = 33", () => {
    assert.equal(totalAbsorbedSteps(), 33);
  });
  it("stepCountsByDomain matches per-domain lengths", () => {
    const c = stepCountsByDomain();
    assert.equal(c.mill, 12);
    assert.equal(c.lathe, 10);
    assert.equal(c.wire_edm, 11);
  });
  it("ALL_WIZARD_CONFIGS keys = ['lathe','mill','wire_edm']", () => {
    assert.deepEqual(Object.keys(ALL_WIZARD_CONFIGS).sort(), ["lathe", "mill", "wire_edm"]);
  });
});

describe("validateIsoGroup", () => {
  it("'P' → true", () => {
    assert.equal(validateIsoGroup("P"), true);
  });
  it("'S' → true (superalloys)", () => {
    assert.equal(validateIsoGroup("S"), true);
  });
  it("'X' → false (not a canonical group)", () => {
    assert.equal(validateIsoGroup("X"), false);
  });
  it("null → false", () => {
    assert.equal(validateIsoGroup(null), false);
  });
  it("number 1 → false (not string)", () => {
    assert.equal(validateIsoGroup(1), false);
  });
});

describe("validatePositiveNumber", () => {
  it("5 → true", () => {
    assert.equal(validatePositiveNumber(5), true);
  });
  it("0 → false", () => {
    assert.equal(validatePositiveNumber(0), false);
  });
  it("-3 → false", () => {
    assert.equal(validatePositiveNumber(-3), false);
  });
  it("'5' (string-coercible) → true", () => {
    assert.equal(validatePositiveNumber("5"), true);
  });
  it("NaN → false", () => {
    assert.equal(validatePositiveNumber(NaN), false);
  });
});

describe("validateMinimum factory", () => {
  it("validateMinimum(0.1)(0.5) → true", () => {
    assert.equal(validateMinimum(0.1)(0.5), true);
  });
  it("validateMinimum(0.1)(0.1) → true (boundary inclusive)", () => {
    assert.equal(validateMinimum(0.1)(0.1), true);
  });
  it("validateMinimum(0.1)(0.05) → false", () => {
    assert.equal(validateMinimum(0.1)(0.05), false);
  });
  it("validateMinimum(0.1)(NaN) → false", () => {
    assert.equal(validateMinimum(0.1)(NaN), false);
  });
});

describe("MILL_WIZARD_STEPS shape invariants", () => {
  it("first step id = 'material_iso'", () => {
    assert.equal(MILL_WIZARD_STEPS[0].id, "material_iso");
  });
  it("last step kind = 'emit'", () => {
    assert.equal(MILL_WIZARD_STEPS[MILL_WIZARD_STEPS.length - 1].kind, "emit");
  });
  it("has safety_review step (validation kind)", () => {
    const s = MILL_WIZARD_STEPS.find((x) => x.id === "safety_review");
    assert.equal(s.kind, "validation");
  });
  it("tool_diameter_mm validator rejects 0.05 (< MIN)", () => {
    const s = MILL_WIZARD_STEPS.find((x) => x.id === "tool_diameter_mm");
    assert.equal(s.validator(0.05), false);
  });
  it("tool_diameter_mm validator accepts 12.7", () => {
    const s = MILL_WIZARD_STEPS.find((x) => x.id === "tool_diameter_mm");
    assert.equal(s.validator(12.7), true);
  });
});

describe("LATHE_WIZARD_STEPS shape invariants", () => {
  it("first step id = 'material_iso'", () => {
    assert.equal(LATHE_WIZARD_STEPS[0].id, "material_iso");
  });
  it("has chuck_jaws step accepting [3,4,6] only", () => {
    const s = LATHE_WIZARD_STEPS.find((x) => x.id === "chuck_jaws");
    assert.equal(s.validator(3), true);
    assert.equal(s.validator(4), true);
    assert.equal(s.validator(6), true);
    assert.equal(s.validator(5), false);
  });
  it("css_mode validator requires boolean", () => {
    const s = LATHE_WIZARD_STEPS.find((x) => x.id === "css_mode");
    assert.equal(s.validator(true), true);
    assert.equal(s.validator(false), true);
    assert.equal(s.validator("yes"), false);
  });
});

describe("WIRE_EDM_WIZARD_STEPS shape invariants", () => {
  it("wire_diameter_mm validator rejects 0.01 (< MIN)", () => {
    const s = WIRE_EDM_WIZARD_STEPS.find((x) => x.id === "wire_diameter_mm");
    assert.equal(s.validator(0.01), false);
  });
  it("wire_diameter_mm validator accepts 0.25 (canonical brass)", () => {
    const s = WIRE_EDM_WIZARD_STEPS.find((x) => x.id === "wire_diameter_mm");
    assert.equal(s.validator(0.25), true);
  });
  it("pass_count validator: 4 → true, 7 → false (max 6)", () => {
    const s = WIRE_EDM_WIZARD_STEPS.find((x) => x.id === "pass_count");
    assert.equal(s.validator(4), true);
    assert.equal(s.validator(7), false);
    assert.equal(s.validator(0), false);
  });
  it("taper_angle_deg is optional (required=false)", () => {
    const s = WIRE_EDM_WIZARD_STEPS.find((x) => x.id === "taper_angle_deg");
    assert.equal(s.required, false);
  });
});

describe("listAbsorbedDomains + matches WIZARD_DOMAINS", () => {
  it("listAbsorbedDomains = ['lathe','mill','wire_edm']", () => {
    assert.deepEqual(listAbsorbedDomains(), ["lathe", "mill", "wire_edm"]);
  });
  it("every absorbed domain is in WIZARD_DOMAINS (iter38 contract)", () => {
    for (const d of listAbsorbedDomains()) {
      assert.equal(WIZARD_DOMAINS.includes(d), true);
    }
  });
});

describe("buildDomainWizard", () => {
  it("'mill' + iter38 createWizard → 12-step wizard", () => {
    const w = buildDomainWizard("mill", createWizard);
    assert.equal(w.domain, "mill");
    assert.equal(w.steps.length, 12);
  });
  it("'lathe' → 10-step wizard", () => {
    const w = buildDomainWizard("lathe", createWizard);
    assert.equal(w.steps.length, 10);
  });
  it("'wire_edm' → 11-step wizard", () => {
    const w = buildDomainWizard("wire_edm", createWizard);
    assert.equal(w.steps.length, 11);
  });
  it("invalid domain 'fusion' → null", () => {
    assert.equal(buildDomainWizard("fusion", createWizard), null);
  });
  it("non-function createWizardFn → null", () => {
    assert.equal(buildDomainWizard("mill", "not-fn"), null);
  });
  it("wizardId default = '<domain>-default'", () => {
    const w = buildDomainWizard("mill", createWizard);
    assert.equal(w.wizardId, "mill-default");
  });
});

describe("LIVE: end-to-end through iter38 wizard-node-bridge", () => {
  it("LIVE mill: walk through 3 questions, then jump check via summarizeProgress", () => {
    let w = buildDomainWizard("mill", createWizard);
    assert.equal(currentStep(w).id, "material_iso");
    w = advance(w, "P");
    assert.equal(currentStep(w).id, "stock_x_mm");
    w = advance(w, 100);
    assert.equal(currentStep(w).id, "stock_y_mm");
    const p = summarizeProgress(w);
    assert.equal(p.current, 2);
    assert.equal(p.total, 12);
  });
  it("LIVE mill: invalid material_iso='X' blocks advance", () => {
    let w = buildDomainWizard("mill", createWizard);
    w = advance(w, "X"); // invalid ISO
    assert.equal(w.status, "blocked");
    assert.equal(w.currentIndex, 0); // didn't advance
  });
  it("LIVE mill: invalid tool_diameter_mm=0.05 blocks at tool step", () => {
    let w = buildDomainWizard("mill", createWizard);
    w = advance(w, "P");
    w = advance(w, 100);
    w = advance(w, 100);
    w = advance(w, 50);
    w = advance(w, 0.05); // below MIN_TOOL_DIAMETER_MM
    assert.equal(w.status, "blocked");
    assert.equal(currentStep(w).id, "tool_diameter_mm");
  });
  it("LIVE lathe: 6-jaw chuck accepted, 5-jaw rejected", () => {
    let w = buildDomainWizard("lathe", createWizard);
    w = advance(w, "P");
    w = advance(w, 25);
    w = advance(w, 300);
    const wGood = advance(w, 6);
    assert.equal(wGood.status, "in_progress");
    const wBad = advance(w, 5);
    assert.equal(wBad.status, "blocked");
  });
  it("LIVE wire_edm: pass_count=4 OK, =7 rejected", () => {
    let w = buildDomainWizard("wire_edm", createWizard);
    w = advance(w, "P");
    w = advance(w, 25);
    w = advance(w, 0.25);
    w = advance(w, "brass");
    w = advance(w, 12);
    const wGood = advance(w, 4);
    assert.equal(wGood.status, "in_progress");
    const wBad = advance(w, 7);
    assert.equal(wBad.status, "blocked");
  });
  it("LIVE wire_edm: thickness=0 blocks at thickness step", () => {
    let w = buildDomainWizard("wire_edm", createWizard);
    w = advance(w, "P");
    w = advance(w, 0);
    assert.equal(w.status, "blocked");
    assert.equal(currentStep(w).id, "thickness_mm");
  });
  it("LIVE every domain wizard creates without error (3 domains × 1 happy-path each)", () => {
    for (const d of listAbsorbedDomains()) {
      const w = buildDomainWizard(d, createWizard);
      assert.notEqual(w, null);
      assert.equal(w.status, "in_progress");
    }
  });
});
