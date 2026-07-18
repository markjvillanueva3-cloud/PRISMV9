/**
 * audit-tribal-coverage.test.mjs — pure-helper coverage for the
 * MACHINING-TRIBAL-COVERAGE META artifact.
 *
 * Tests classifyTip / parseLeafLine / aggregate / rankGaps + CATEGORIES shape.
 * Uses real machining shop-floor phrases for the happy paths — placeholder
 * stubs would be hook-rejected.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  CATEGORIES,
  classifyTip,
  parseLeafLine,
  aggregate,
  rankGaps,
} from "./audit-tribal-coverage.mjs";

describe("CATEGORIES (shape invariants)", () => {
  it("has exactly 5 categories (matches user-named scope)", () => {
    assert.strictEqual(CATEGORIES.length, 5);
  });

  it("every entry has key + label + non-empty tokens", () => {
    for (const c of CATEGORIES) {
      assert.ok(c.key && typeof c.key === "string", "key missing");
      assert.ok(c.label && typeof c.label === "string", "label missing");
      assert.ok(Array.isArray(c.tokens) && c.tokens.length > 0, "tokens empty");
    }
  });

  it("keys are unique (no double-attribution by key collision)", () => {
    const keys = CATEGORIES.map(c => c.key);
    assert.strictEqual(new Set(keys).size, keys.length);
  });

  it("includes the 5 user-named categories", () => {
    const keys = new Set(CATEGORIES.map(c => c.key));
    for (const expected of ["tooling-selection", "workholding", "part-setup",
                            "operation-ordering", "machining-tactics"]) {
      assert.ok(keys.has(expected), `missing category: ${expected}`);
    }
  });

  it("tokens are all lowercase (classifyTip lowercases input — case-mixed token would never match)", () => {
    for (const c of CATEGORIES) {
      for (const tok of c.tokens) {
        assert.strictEqual(tok, tok.toLowerCase(), `non-lowercase token '${tok}' in ${c.key}`);
      }
    }
  });
});

describe("classifyTip (real-machining inputs)", () => {
  it("workholding: soft-jaw phrasing", () => {
    assert.strictEqual(
      classifyTip("Use soft jaws bored to the part diameter for the 2nd op."),
      "workholding");
  });

  it("workholding: tombstone fixture", () => {
    assert.strictEqual(
      classifyTip("Tombstone with four ops indexed 90° apart on the HMC."),
      "workholding");
  });

  it("tooling-selection: insert grade choice", () => {
    assert.strictEqual(
      classifyTip("For 4140PH the TNMG insert in CVD-coated grade beats PVD on tool wear-rate."),
      "tooling-selection");
  });

  it("tooling-selection: end mill geometry", () => {
    assert.strictEqual(
      classifyTip("3-flute end mill for aluminum; 4-flute chokes on chip evacuation in deep slots."),
      "tooling-selection");
  });

  it("part-setup: probing / Renishaw", () => {
    assert.strictEqual(
      classifyTip("Probe the casting with a Renishaw OMP60 to set G54 to the best-fit datum."),
      "part-setup");
  });

  it("part-setup: dial-indicator tram", () => {
    assert.strictEqual(
      classifyTip("Indicate-in the vise to under 0.0002 TIR before bolting."),
      "part-setup");
  });

  it("operation-ordering: rough-then-finish", () => {
    assert.strictEqual(
      classifyTip("Rough first, then let the part rest 20 min for stress relief before semi-finish."),
      "operation-ordering");
  });

  it("operation-ordering: drill-before-bore sequencing", () => {
    assert.strictEqual(
      classifyTip("Drill before bore; pre-bore .015 undersize for the finish reamer."),
      "operation-ordering");
  });

  it("machining-tactics: trochoidal / HSM", () => {
    assert.strictEqual(
      classifyTip("Trochoidal milling with low RDoC and high ADoC keeps the cutter cool in titanium."),
      "machining-tactics");
  });

  it("machining-tactics: chip thinning", () => {
    assert.strictEqual(
      classifyTip("Compensate for chip thinning at low radial engagement or you'll rub the cutter."),
      "machining-tactics");
  });

  it("case-insensitive: WORKHOLDING in all caps still matches", () => {
    assert.strictEqual(
      classifyTip("WORKHOLDING NOTE: use parallel under the jaw."),
      "workholding");
  });

  it("uncategorized: pure non-machining text", () => {
    assert.strictEqual(
      classifyTip("This memo is about Q4 sales pipeline."),
      null);
  });

  it("uncategorized: empty string", () => {
    assert.strictEqual(classifyTip(""), null);
  });

  it("adversarial: null returns null (no throw)", () => {
    assert.strictEqual(classifyTip(null), null);
  });

  it("adversarial: non-string returns null", () => {
    assert.strictEqual(classifyTip(42), null);
    assert.strictEqual(classifyTip({}), null);
  });

  it("first-match priority: workholding wins over machining-tactics (declared earlier in CATEGORIES)", () => {
    // 'soft jaw' (workholding, idx 2) is declared before 'climb mill' (tactics,
    // idx 4) in CATEGORIES — the first-match-wins rule attributes there.
    assert.strictEqual(
      classifyTip("In the soft jaw setup, climb mill the OD for finish."),
      "workholding");
  });

  it("first-match priority: action-verb beats incidental noun ('drill before bore' wins over 'reamer')", () => {
    // The reorder fix: operation-ordering (idx 0) now precedes tooling-selection
    // (idx 3), so a sequencing phrase that incidentally names a tool stays in
    // ordering — matches how a machinist would read the tip.
    assert.strictEqual(
      classifyTip("Drill before bore; pre-bore .015 undersize for the finish reamer."),
      "operation-ordering");
  });
});

describe("parseLeafLine", () => {
  it("happy: well-formed JSON with path + kind + body", () => {
    const out = parseLeafLine('{"path":"knowledge/tribal/x.md","kind":"tribal-tip","body":"hi"}');
    assert.deepStrictEqual(out, { path: "knowledge/tribal/x.md", kind: "tribal-tip", body: "hi" });
  });

  it("happy: falls through to file/category/summary aliases", () => {
    const out = parseLeafLine('{"file":"y.md","category":"engine","summary":"sample"}');
    assert.strictEqual(out.path, "y.md");
    assert.strictEqual(out.kind, "engine");
    assert.strictEqual(out.body, "sample");
  });

  it("failure: empty body becomes empty string (not undefined)", () => {
    const out = parseLeafLine('{"path":"z.md","kind":"engine"}');
    assert.strictEqual(out.body, "");
  });

  it("failure: malformed JSON returns null", () => {
    assert.strictEqual(parseLeafLine("{not json"), null);
  });

  it("failure: empty / whitespace / null input returns null", () => {
    assert.strictEqual(parseLeafLine(""), null);
    assert.strictEqual(parseLeafLine("   "), null);
    assert.strictEqual(parseLeafLine(null), null);
  });

  it("adversarial: a JSON primitive (not an object) returns null", () => {
    assert.strictEqual(parseLeafLine("42"), null);
    assert.strictEqual(parseLeafLine('"hi"'), null);
  });
});

describe("aggregate", () => {
  it("happy: 5 tips spanning 3 categories + 1 uncategorized", () => {
    const tips = [
      "soft jaws + parallels",                  // workholding
      "soft jaws + parallels",                  // workholding (2)
      "3-flute end mill for AL",                // tooling-selection
      "rough first then finish",                // operation-ordering
      "memo unrelated to machining",            // uncategorized
    ];
    const agg = aggregate(tips);
    assert.strictEqual(agg.total, 5);
    assert.strictEqual(agg.counts.workholding, 2);
    assert.strictEqual(agg.counts["tooling-selection"], 1);
    assert.strictEqual(agg.counts["operation-ordering"], 1);
    assert.strictEqual(agg.uncategorized, 1);
  });

  it("happy: empty array yields zero totals and zero per-category", () => {
    const agg = aggregate([]);
    assert.strictEqual(agg.total, 0);
    assert.strictEqual(agg.uncategorized, 0);
    for (const c of CATEGORIES) {
      assert.strictEqual(agg.counts[c.key], 0);
    }
  });

  it("adversarial: nulls / empties in the array are skipped entirely (falsy guard)", () => {
    // aggregate's `if (!t) continue` skips null, undefined, AND empty string
    // because all three are falsy — an empty tip is no tip.
    const agg = aggregate([null, "", "soft jaws", null, "carbide insert"]);
    assert.strictEqual(agg.total, 2); // 2 real tips, 3 falsy skipped
    assert.strictEqual(agg.counts.workholding, 1);
    assert.strictEqual(agg.counts["tooling-selection"], 1);
    assert.strictEqual(agg.uncategorized, 0);
  });
});

describe("rankGaps", () => {
  it("ranks weakest-first (ascending count)", () => {
    const counts = {
      "workholding": 10,
      "tooling-selection": 2,
      "part-setup": 5,
      "operation-ordering": 0,
      "machining-tactics": 100,
    };
    const ranked = rankGaps(counts);
    assert.strictEqual(ranked[0].key, "operation-ordering"); // 0
    assert.strictEqual(ranked[1].key, "tooling-selection");  // 2
    assert.strictEqual(ranked[ranked.length - 1].key, "machining-tactics"); // 100
  });

  it("returns one entry per category (all 5)", () => {
    const counts = {};
    const ranked = rankGaps(counts);
    assert.strictEqual(ranked.length, CATEGORIES.length);
  });

  it("missing keys treated as 0 (no NaN drift)", () => {
    const ranked = rankGaps({});
    for (const r of ranked) {
      assert.strictEqual(r.count, 0);
    }
    // All tied at 0 → preserves CATEGORIES declaration order for stable test
    assert.strictEqual(ranked[0].key, CATEGORIES[0].key);
  });
});
