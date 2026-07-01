/**
 * Tests for COMBO-EFFICIENCY-MS0 / P1-U01 (take-rate fix on master-index
 * suggestions) — additions to mcp-route-suggest.mjs.
 *
 * Scope:
 *   - _REDUNDANT_CLASSIFIERS set membership
 *   - isCompanionCovered() pure function
 *   - nonRedundantFires() with various stats shapes (happy, missing
 *     byClassifier, partial coverage, all zero, adversarial)
 *   - appendActionHints() suppresses redundant + respects knob
 *   - formatTakeRateAdvisory() uses non-redundant denominator + knob restore
 *
 * Coverage philosophy: this unit changes the BEHAVIOR of two exported pure
 * functions whose output is consumed by the PreToolUse hook. Tests
 * deliberately exercise the boundary between "redundant" (covered by sibling
 * pre-fetch hook) and "genuinely unmet" (no companion injector).
 *
 * Run: node --test .claude/hooks/__tests__/mcp-route-suggest-redundancy.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  _REDUNDANT_CLASSIFIERS,
  _PREFERRED_ACTION_FOR_CLASSIFIER,
  isCompanionCovered,
  nonRedundantFires,
  formatActionHint,
  appendActionHints,
  formatTakeRateAdvisory,
} from "../mcp-route-suggest.mjs";

// ─── _REDUNDANT_CLASSIFIERS set ────────────────────────────────────────────

describe("_REDUNDANT_CLASSIFIERS membership", () => {
  test("contains the 5 sibling-covered classifiers", () => {
    assert.ok(_REDUNDANT_CLASSIFIERS.has("isBroadGrep"));
    assert.ok(_REDUNDANT_CLASSIFIERS.has("isBroadGlob"));
    assert.ok(_REDUNDANT_CLASSIFIERS.has("isLargeRead"));
    assert.ok(_REDUNDANT_CLASSIFIERS.has("isLargeWrite"));
    assert.ok(_REDUNDANT_CLASSIFIERS.has("isVerboseBash"));
  });

  test("excludes the 3 genuinely-uncovered classifiers", () => {
    // No companion pre-fetch injector for these — keep the nudge.
    assert.ok(!_REDUNDANT_CLASSIFIERS.has("doctrineSurface"));
    assert.ok(!_REDUNDANT_CLASSIFIERS.has("backendAuditChain"));
    assert.ok(!_REDUNDANT_CLASSIFIERS.has("isBroadWebSearch"));
  });

  test("size matches the documented count (5)", () => {
    assert.equal(_REDUNDANT_CLASSIFIERS.size, 5);
  });

  test("every redundant classifier is mapped in _PREFERRED_ACTION_FOR_CLASSIFIER", () => {
    // Invariant: we wouldn't suppress a nudge for a classifier that doesn't
    // have a preferred action in the first place — that would be a silent
    // drop. Re-run if a future classifier is added/removed.
    for (const c of _REDUNDANT_CLASSIFIERS) {
      assert.ok(_PREFERRED_ACTION_FOR_CLASSIFIER[c], `missing preferred action for redundant classifier ${c}`);
    }
  });
});

// ─── isCompanionCovered ────────────────────────────────────────────────────

describe("isCompanionCovered", () => {
  test("returns true for each redundant classifier", () => {
    for (const c of _REDUNDANT_CLASSIFIERS) {
      assert.equal(isCompanionCovered(c), true);
    }
  });

  test("returns false for non-redundant classifiers", () => {
    assert.equal(isCompanionCovered("doctrineSurface"), false);
    assert.equal(isCompanionCovered("backendAuditChain"), false);
    assert.equal(isCompanionCovered("isBroadWebSearch"), false);
  });

  test("returns false for unknown / empty / non-string input", () => {
    assert.equal(isCompanionCovered("notARealClassifier"), false);
    assert.equal(isCompanionCovered(""), false);
    assert.equal(isCompanionCovered(null), false);
    assert.equal(isCompanionCovered(undefined), false);
    assert.equal(isCompanionCovered(42), false);
    assert.equal(isCompanionCovered({}), false);
  });
});

// ─── nonRedundantFires ─────────────────────────────────────────────────────

describe("nonRedundantFires", () => {
  test("subtracts redundant byClassifier fires from totalFires", () => {
    const stats = {
      totalFires: 1774,
      byClassifier: {
        isBroadGrep: 800,
        isLargeRead: 200,
        doctrineSurface: 234,
        backendAuditChain: 540,
      },
    };
    // redundant: 800 (grep) + 200 (read) = 1000; non-redundant = 1774 - 1000 = 774.
    assert.equal(nonRedundantFires(stats), 774);
  });

  test("returns totalFires when no byClassifier is present (defensive default)", () => {
    assert.equal(nonRedundantFires({ totalFires: 100 }), 100);
  });

  test("treats missing/invalid byClassifier entries as zero", () => {
    const stats = {
      totalFires: 100,
      byClassifier: { isBroadGrep: "not-a-number", isLargeRead: null, doctrineSurface: 30 },
    };
    // Both redundant entries are invalid → count as 0; non-redundant = 100.
    assert.equal(nonRedundantFires(stats), 100);
  });

  test("subtracts all 5 redundant when all present", () => {
    const stats = {
      totalFires: 1000,
      byClassifier: {
        isBroadGrep: 100,
        isBroadGlob: 100,
        isLargeRead: 100,
        isLargeWrite: 100,
        isVerboseBash: 100,
        doctrineSurface: 500,
      },
    };
    assert.equal(nonRedundantFires(stats), 500);
  });

  test("clamps at zero (negative not possible — math floor protects against bad data)", () => {
    // Pathological: totalFires < sum of redundant byClassifier (data drift).
    const stats = {
      totalFires: 50,
      byClassifier: { isBroadGrep: 100 },
    };
    assert.equal(nonRedundantFires(stats), 0);
  });

  test("returns 0 for null / non-object / missing totalFires", () => {
    assert.equal(nonRedundantFires(null), 0);
    assert.equal(nonRedundantFires(undefined), 0);
    assert.equal(nonRedundantFires("string"), 0);
    assert.equal(nonRedundantFires({}), 0);
    assert.equal(nonRedundantFires({ totalFires: NaN }), 0);
    assert.equal(nonRedundantFires({ totalFires: Infinity }), 0);
  });
});

// ─── appendActionHints — suppress-redundant behavior ───────────────────────

describe("appendActionHints — redundancy suppression", () => {
  // Use real classifier-trigger substrings so _classifierFromMessage matches.
  // These substrings are sourced from mcp-route-suggest.mjs:_classifierFromMessage().
  const MSG_GREP        = "💡 broad Grep — narrow search first";
  const MSG_BASH        = "💡 verbose Bash — prefer rtk wrapper";
  const MSG_READ        = "💡 large digest/index — use offset/limit";
  const MSG_DOCTRINE    = "💡 Doctrine/command surface: verify the command bridge before teaching a new manual workflow";
  // Substring "Backend audit:" is what _classifierFromMessage matches on for backendAuditChain.
  const MSG_AUDIT       = "💡 Backend audit: chain available for this edit";

  test("SUPPRESSES nudge hint for redundant classifier (isBroadGrep)", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;  // default-on
    const out = appendActionHints([MSG_GREP]);
    // Suppressed → original message preserved, no "Take this route now" appended.
    assert.equal(out[0], MSG_GREP);
    assert.ok(!out[0].includes("Take this route now"));
  });

  test("SUPPRESSES nudge hint for isVerboseBash (also redundant)", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const out = appendActionHints([MSG_BASH]);
    assert.equal(out[0], MSG_BASH);
    assert.ok(!out[0].includes("Take this route now"));
  });

  test("KEEPS nudge hint for doctrineSurface (NOT redundant)", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const out = appendActionHints([MSG_DOCTRINE]);
    assert.ok(out[0].includes("Take this route now"));
    assert.ok(out[0].includes("dispatcher_map_compact"));
  });

  test("KEEPS nudge hint for backendAuditChain (NOT redundant)", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const out = appendActionHints([MSG_AUDIT]);
    assert.ok(out[0].includes("Take this route now"));
    assert.ok(out[0].includes("code_search"));
  });

  test("knob PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT=0 restores legacy behavior (hint shown)", () => {
    process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT = "0";
    try {
      const out = appendActionHints([MSG_GREP]);
      // Knob off → original behavior: hint appended even for redundant classifier.
      assert.ok(out[0].includes("Take this route now"));
      assert.ok(out[0].includes("master_index_query"));
    } finally {
      delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    }
  });

  test("knob set to anything except '0' uses suppression (case-strict)", () => {
    process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT = "false";  // not '0' → still suppress
    try {
      const out = appendActionHints([MSG_GREP]);
      assert.ok(!out[0].includes("Take this route now"));
    } finally {
      delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    }
  });

  test("messages without recognized classifier pass through unchanged", () => {
    const out = appendActionHints(["💡 some unrelated hook message"]);
    assert.equal(out[0], "💡 some unrelated hook message");
  });

  test("non-array input returns unchanged (defensive)", () => {
    assert.equal(appendActionHints(null), null);
    assert.equal(appendActionHints("not-an-array"), "not-an-array");
  });

  test("mixed batch: redundant suppressed, non-redundant kept", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const out = appendActionHints([MSG_GREP, MSG_DOCTRINE, MSG_BASH, MSG_AUDIT]);
    assert.ok(!out[0].includes("Take this route now"), "grep suppressed");
    assert.ok(out[1].includes("Take this route now"),  "doctrine kept");
    assert.ok(!out[2].includes("Take this route now"), "bash suppressed");
    assert.ok(out[3].includes("Take this route now"),  "audit kept");
  });
});

// ─── formatTakeRateAdvisory — non-redundant denominator ────────────────────

describe("formatTakeRateAdvisory — non-redundant denominator", () => {
  test("uses nonRedundantFires when knob default-ON", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const stats = {
      totalFires: 1000,
      byClassifier: { isBroadGrep: 900, doctrineSurface: 100 },
      takeupTotals: { totalTakeups: 0 },
    };
    // non-redundant = 100; take-rate = 0/100 = 0% → below threshold → advisory shown.
    const out = formatTakeRateAdvisory(stats);
    assert.match(out, /0\/100/);  // shows non-redundant denominator
    assert.match(out, /0\.0%/);
  });

  test("knob PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT=0 uses totalFires (legacy)", () => {
    process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT = "0";
    try {
      const stats = {
        totalFires: 1000,
        byClassifier: { isBroadGrep: 900, doctrineSurface: 100 },
        takeupTotals: { totalTakeups: 0 },
      };
      const out = formatTakeRateAdvisory(stats);
      assert.match(out, /0\/1000/);  // legacy denominator
    } finally {
      delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    }
  });

  test("returns null when non-redundant fires < minFires threshold", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    // After excluding redundant, only 3 fires remain → < minFires(5) → null.
    const stats = {
      totalFires: 100,
      byClassifier: { isBroadGrep: 97, doctrineSurface: 3 },
      takeupTotals: { totalTakeups: 0 },
    };
    assert.equal(formatTakeRateAdvisory(stats), null);
  });

  test("returns null when non-redundant rate >= threshold (silent on healthy)", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const stats = {
      totalFires: 100,
      byClassifier: { isBroadGrep: 50, doctrineSurface: 50 },
      // non-redundant = 50 fires. takeups = 25 → rate = 50% → above 20% threshold → silent.
      takeupTotals: { totalTakeups: 25 },
    };
    assert.equal(formatTakeRateAdvisory(stats), null);
  });

  test("returns null on null / missing-totals input", () => {
    assert.equal(formatTakeRateAdvisory(null), null);
    assert.equal(formatTakeRateAdvisory({}), null);
    assert.equal(formatTakeRateAdvisory({ totalFires: "bad" }), null);
  });

  test("respects custom threshold + minFires args", () => {
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const stats = {
      totalFires: 100,
      byClassifier: { isBroadGrep: 50, doctrineSurface: 50 }, // 50 redundant + 50 non-redundant
      takeupTotals: { totalTakeups: 10 },
    };
    // non-redundant fires = 100 - 50 = 50; rate = 10/50 = 20%.
    // default threshold 0.20 → 0.20 >= 0.20 → null (boundary, silent on exactly-at).
    // custom threshold 0.25 → 0.20 < 0.25 → advisory shown with denominator 50.
    assert.equal(formatTakeRateAdvisory(stats, 0.20), null);
    const out = formatTakeRateAdvisory(stats, 0.25);
    assert.match(out, /10\/50/);
  });
});

// ─── Integration: known-baseline shape from the spec ───────────────────────

describe("U-P1-U01 integration with spec baseline", () => {
  test("baseline shape (5/25 12:30 CDT) shows the right take-rate after filter", () => {
    // Spec baseline at COMBO-EFFICIENCY-MS0 scope: 1774 total fires / 0 takes.
    // Assumed (informed estimate from session history) per-classifier split:
    //   isBroadGrep:       600
    //   isVerboseBash:     400
    //   isLargeRead:       300
    //   isLargeWrite:      40
    //   isBroadGlob:       60
    //   doctrineSurface:   234  (matches the real session telemetry shape)
    //   backendAuditChain: 140
    delete process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT;
    const stats = {
      totalFires: 1774,
      byClassifier: {
        isBroadGrep: 600, isVerboseBash: 400, isLargeRead: 300, isLargeWrite: 40, isBroadGlob: 60,
        doctrineSurface: 234, backendAuditChain: 140,
      },
      takeupTotals: { totalTakeups: 0 },
    };
    // redundant = 600+400+300+40+60 = 1400; non-redundant = 1774-1400 = 374.
    assert.equal(nonRedundantFires(stats), 374);
    // Advisory denominator drops from 1774 to 374 (still 0% take-rate, but
    // measured against the genuinely-uncovered surface only).
    const out = formatTakeRateAdvisory(stats);
    assert.match(out, /0\/374/);
  });
});
