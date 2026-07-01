/**
 * v11-magazine-integrity.test.mjs — concrete-value tests for the pre-emit
 * magazine integrity gate. Every assertion is exact-value equality.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-MAGAZINE-INTEGRITY-GATE
 * @slot echo · @iter 24 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkToolDescriptor,
  checkAllTools,
  shouldAllowEmit,
  renderReportComment,
  DEFAULT_OFFSET_TOLERANCE_MM,
  DEFAULT_LIFE_THRESHOLD,
} from "./v11-magazine-integrity.mjs";

const pocketDb = {
  T2:  { pocket: 2,  h_offset_mm: 105.250, d_offset_mm: 0.000, sister_pocket: 22, life_fraction: 0.85 },
  T14: { pocket: 14, h_offset_mm: 87.500,  d_offset_mm: 0.000, sister_pocket: 34, life_fraction: 0.65 },
  T19: { pocket: 19, h_offset_mm: 92.100,  d_offset_mm: 0.000, sister_pocket: null, life_fraction: 0.05 },
  T8:  { pocket: 8,  h_offset_mm: 70.000,  d_offset_mm: 0.000, sister_pocket: null, life_fraction: 0.90 },
};

describe("constants", () => {
  it("DEFAULT_OFFSET_TOLERANCE_MM = 0.005", () => {
    assert.equal(DEFAULT_OFFSET_TOLERANCE_MM, 0.005);
  });
  it("DEFAULT_LIFE_THRESHOLD = 0.15", () => {
    assert.equal(DEFAULT_LIFE_THRESHOLD, 0.15);
  });
});

describe("checkToolDescriptor: happy path", () => {
  it("matching pocket + H/D + life → ok=true", () => {
    const r = checkToolDescriptor(
      { tool_number: 2, declared_pocket: 2, declared_h_offset_mm: 105.250, declared_d_offset_mm: 0.000 },
      pocketDb
    );
    assert.equal(r.ok, true);
  });

  it("no declared H/D/pocket (Fusion skipped) + tool in DB → ok=true", () => {
    const r = checkToolDescriptor({ tool_number: 8 }, pocketDb);
    assert.equal(r.ok, true);
  });
});

describe("checkToolDescriptor: wrong_pocket", () => {
  it("declared pocket 3 vs DB pocket 2 → wrong_pocket violation", () => {
    const r = checkToolDescriptor(
      { tool_number: 2, declared_pocket: 3 },
      pocketDb
    );
    assert.equal(r.violations[0].kind, "wrong_pocket");
  });

  it("wrong_pocket means ok=false", () => {
    const r = checkToolDescriptor(
      { tool_number: 2, declared_pocket: 3 },
      pocketDb
    );
    assert.equal(r.ok, false);
  });
});

describe("checkToolDescriptor: offset_drift", () => {
  it("H drift > tolerance flags offset_drift", () => {
    const r = checkToolDescriptor(
      { tool_number: 14, declared_h_offset_mm: 87.600 }, // Δ=0.100 > 0.005
      pocketDb
    );
    assert.equal(r.violations[0].kind, "offset_drift");
  });

  it("H drift < tolerance accepted", () => {
    const r = checkToolDescriptor(
      { tool_number: 14, declared_h_offset_mm: 87.502 }, // Δ=0.002 < 0.005
      pocketDb
    );
    assert.equal(r.ok, true);
  });

  it("custom looser tolerance accepts larger drift", () => {
    const r = checkToolDescriptor(
      { tool_number: 14, declared_h_offset_mm: 87.600 },
      pocketDb,
      { offsetToleranceMm: 0.5 }
    );
    assert.equal(r.ok, true);
  });

  it("D drift flagged separately", () => {
    const r = checkToolDescriptor(
      { tool_number: 14, declared_d_offset_mm: 0.020 },
      pocketDb
    );
    assert.equal(r.violations[0].kind, "offset_drift");
  });
});

describe("checkToolDescriptor: missing_tool", () => {
  it("T99 (not in DB) flagged", () => {
    const r = checkToolDescriptor({ tool_number: 99 }, pocketDb);
    assert.equal(r.violations[0].kind, "missing_tool");
  });

  it("missing_tool means ok=false", () => {
    const r = checkToolDescriptor({ tool_number: 99 }, pocketDb);
    assert.equal(r.ok, false);
  });
});

describe("checkToolDescriptor: insufficient_life", () => {
  it("T19 life=0.05 < threshold 0.15 AND no sister → insufficient_life", () => {
    const r = checkToolDescriptor({ tool_number: 19 }, pocketDb);
    assert.equal(r.violations[0].kind, "insufficient_life");
  });

  it("T14 life=0.65 → no insufficient_life", () => {
    const r = checkToolDescriptor({ tool_number: 14 }, pocketDb);
    assert.equal(r.ok, true);
  });

  it("low life but sister_pocket present → no violation", () => {
    const db2 = { T19: { ...pocketDb.T19, sister_pocket: 39 } };
    assert.equal(checkToolDescriptor({ tool_number: 19 }, db2).ok, true);
  });

  it("custom lifeThreshold suppresses violation", () => {
    const r = checkToolDescriptor({ tool_number: 19 }, pocketDb, { lifeThreshold: 0.01 });
    assert.equal(r.ok, true);
  });
});

describe("checkToolDescriptor: bad descriptor", () => {
  it("null descriptor → bad_descriptor", () => {
    assert.equal(checkToolDescriptor(null, pocketDb).violations[0].kind, "bad_descriptor");
  });

  it("missing tool_number → bad_descriptor", () => {
    assert.equal(checkToolDescriptor({}, pocketDb).violations[0].kind, "bad_descriptor");
  });

  it("tool_number=0 → bad_descriptor", () => {
    assert.equal(checkToolDescriptor({ tool_number: 0 }, pocketDb).violations[0].kind, "bad_descriptor");
  });
});

describe("checkAllTools: aggregate", () => {
  const descriptors = [
    { tool_number: 2 },
    { tool_number: 14 },
    { tool_number: 19 },              // insufficient_life (no sister)
    { tool_number: 99 },              // missing_tool
    { tool_number: 8, declared_h_offset_mm: 71.000 }, // offset_drift
  ];

  it("summary.total = 5", () => {
    assert.equal(checkAllTools(descriptors, pocketDb).summary.total, 5);
  });

  it("summary.ok = 2 (T2 + T14)", () => {
    assert.equal(checkAllTools(descriptors, pocketDb).summary.ok, 2);
  });

  it("summary.failed = 3", () => {
    assert.equal(checkAllTools(descriptors, pocketDb).summary.failed, 3);
  });

  it("missing_tool count = 1", () => {
    assert.equal(checkAllTools(descriptors, pocketDb).summary.violationCounts.missing_tool, 1);
  });

  it("insufficient_life count = 1", () => {
    assert.equal(checkAllTools(descriptors, pocketDb).summary.violationCounts.insufficient_life, 1);
  });

  it("offset_drift count = 1", () => {
    assert.equal(checkAllTools(descriptors, pocketDb).summary.violationCounts.offset_drift, 1);
  });
});

describe("shouldAllowEmit: gate decision", () => {
  const clean = checkAllTools([{ tool_number: 2 }, { tool_number: 14 }], pocketDb);
  const dirty = checkAllTools([{ tool_number: 99 }], pocketDb);

  it("clean report → allow", () => {
    assert.equal(shouldAllowEmit(clean), true);
  });

  it("dirty report → block", () => {
    assert.equal(shouldAllowEmit(dirty), false);
  });

  it("permissive=true overrides block", () => {
    assert.equal(shouldAllowEmit(dirty, { permissive: true }), true);
  });

  it("ignore list lets specific violation through", () => {
    assert.equal(shouldAllowEmit(dirty, { ignore: ["missing_tool"] }), true);
  });

  it("null report → block", () => {
    assert.equal(shouldAllowEmit(null), false);
  });
});

describe("renderReportComment: operator-readable block", () => {
  const dirty = checkAllTools(
    [{ tool_number: 2 }, { tool_number: 99 }, { tool_number: 19 }],
    pocketDb
  );

  it("renders PRISM MAGAZINE INTEGRITY GATE header", () => {
    assert.equal(renderReportComment(dirty).includes("PRISM MAGAZINE INTEGRITY GATE"), true);
  });

  it("renders summary line tools=3", () => {
    assert.equal(renderReportComment(dirty).includes("tools=3"), true);
  });

  it("renders missing_tool violation", () => {
    assert.equal(renderReportComment(dirty).includes("missing_tool"), true);
  });

  it("renders insufficient_life violation", () => {
    assert.equal(renderReportComment(dirty).includes("insufficient_life"), true);
  });

  it("clean report renders 'emit allowed'", () => {
    const clean = checkAllTools([{ tool_number: 2 }], pocketDb);
    assert.equal(renderReportComment(clean).includes("emit allowed"), true);
  });

  it("null report renders unavailable comment", () => {
    assert.equal(renderReportComment(null).includes("unavailable"), true);
  });
});
