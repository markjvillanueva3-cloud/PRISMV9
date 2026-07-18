/**
 * BillOfMaterialsRollupFormula.test.ts — hotel iter16b.
 * Validates multi-level explosion, bottom-up cost rollup, hotel-soul
 * cycle detection, financial-invariant ledger gate, R12 fail-loud.
 */

import { describe, it, expect } from "vitest";
import {
  explodeBOM,
  rollUpBomCost,
  circularReferenceCheck,
  type BomPart,
} from "../algorithms/BillOfMaterialsRollupFormula.js";

// ── Reference BOM: simple stamping die assembly ──────────────────────────
// DIE-ASSY-001
//   ├── DIE-PLATE-A (1)   leaf $200
//   ├── DIE-PLATE-B (1)   leaf $180
//   └── PUNCH-SET (1)
//        ├── PUNCH-MAIN (4)    leaf $25
//        └── PUNCH-RETAINER (1) leaf $40
//
// Cost rollup:
//   PUNCH-SET = 4*25 + 1*40 = $140
//   DIE-ASSY-001 = 1*200 + 1*180 + 1*140 = $520
const STAMPING_DIE_BOM: BomPart[] = [
  { id: "DIE-ASSY-001", description: "Stamping die assembly", components: [
    { child_id: "DIE-PLATE-A", qty_per_parent: 1 },
    { child_id: "DIE-PLATE-B", qty_per_parent: 1 },
    { child_id: "PUNCH-SET",   qty_per_parent: 1 },
  ]},
  { id: "DIE-PLATE-A", description: "Upper die plate", unit_cost: 200 },
  { id: "DIE-PLATE-B", description: "Lower die plate", unit_cost: 180 },
  { id: "PUNCH-SET", description: "Punch sub-assembly", components: [
    { child_id: "PUNCH-MAIN", qty_per_parent: 4 },
    { child_id: "PUNCH-RETAINER", qty_per_parent: 1 },
  ]},
  { id: "PUNCH-MAIN", description: "Main punch", unit_cost: 25 },
  { id: "PUNCH-RETAINER", description: "Punch retainer", unit_cost: 40 },
];

describe("explodeBOM — multi-level explosion", () => {
  it("produces flattened indented BOM with correct depth", () => {
    const r = explodeBOM(STAMPING_DIE_BOM, "DIE-ASSY-001", 1);
    expect(r.rows.length).toBe(6);  // 6 distinct part references in tree
    expect(r.rows[0].part_id).toBe("DIE-ASSY-001");
    expect(r.rows[0].depth).toBe(0);
    const punchSet = r.rows.find(x => x.part_id === "PUNCH-SET");
    expect(punchSet?.depth).toBe(1);
    const punchMain = r.rows.find(x => x.part_id === "PUNCH-MAIN");
    expect(punchMain?.depth).toBe(2);
  });

  it("propagates qty correctly: PUNCH-MAIN at 4 per PUNCH-SET → 4 per DIE-ASSY", () => {
    const r = explodeBOM(STAMPING_DIE_BOM, "DIE-ASSY-001", 1);
    const punchMain = r.rows.find(x => x.part_id === "PUNCH-MAIN");
    expect(punchMain?.qty_required).toBe(4);
  });

  it("scales by top_qty: ordering 10 dies → 40 main punches needed", () => {
    const r = explodeBOM(STAMPING_DIE_BOM, "DIE-ASSY-001", 10);
    const punchMain = r.rows.find(x => x.part_id === "PUNCH-MAIN");
    expect(punchMain?.qty_required).toBe(40);
  });

  it("total_parts_count counts distinct part ids", () => {
    const r = explodeBOM(STAMPING_DIE_BOM, "DIE-ASSY-001", 1);
    expect(r.total_parts_count).toBe(6);
  });
});

describe("rollUpBomCost — bottom-up + financial invariant", () => {
  it("PUNCH-SET sub-assembly cost: 4*25 + 1*40 = $140", () => {
    const r = rollUpBomCost(STAMPING_DIE_BOM, "PUNCH-SET", 1);
    expect(r.unit_cost).toBe(140);
    expect(r.total_cost).toBe(140);
  });

  it("DIE-ASSY-001 full rollup: 200 + 180 + 140 = $520 per assy", () => {
    const r = rollUpBomCost(STAMPING_DIE_BOM, "DIE-ASSY-001", 1);
    expect(r.unit_cost).toBe(520);
    expect(r.total_cost).toBe(520);
  });

  it("scales with top_qty: 10 dies × $520 = $5,200 total", () => {
    const r = rollUpBomCost(STAMPING_DIE_BOM, "DIE-ASSY-001", 10);
    expect(r.total_cost).toBe(5_200);
  });

  it("HOTEL-SOUL: by_level sum equals total_cost (within $0.01/$)", () => {
    const r = rollUpBomCost(STAMPING_DIE_BOM, "DIE-ASSY-001", 10);
    const levelSum = r.by_level.reduce((s, l) => s + l.cost, 0);
    expect(Math.abs(levelSum - r.total_cost)).toBeLessThan(1);
    expect(r.ledger_balanced).toBe(true);
  });

  it("by_level breakdown reaches correct leaves at deepest level", () => {
    const r = rollUpBomCost(STAMPING_DIE_BOM, "DIE-ASSY-001", 1);
    // Leaves at depth 1: DIE-PLATE-A ($200), DIE-PLATE-B ($180) = $380
    // Leaves at depth 2: PUNCH-MAIN (4×$25=$100), PUNCH-RETAINER ($40) = $140
    const depth1 = r.by_level.find(l => l.depth === 1);
    const depth2 = r.by_level.find(l => l.depth === 2);
    expect(depth1?.cost).toBe(380);
    expect(depth2?.cost).toBe(140);
  });
});

describe("BOM — hotel-soul cycle gate", () => {
  it("circularReferenceCheck flags A→B→A as cycle", () => {
    const cyclic: BomPart[] = [
      { id: "A", components: [{ child_id: "B", qty_per_parent: 1 }] },
      { id: "B", components: [{ child_id: "A", qty_per_parent: 1 }] },
    ];
    const msg = circularReferenceCheck(cyclic, "A");
    expect(msg).not.toBe(null);
    expect(msg!).toMatch(/cycle detected/);
  });

  it("circularReferenceCheck returns null for acyclic BOM", () => {
    const msg = circularReferenceCheck(STAMPING_DIE_BOM, "DIE-ASSY-001");
    expect(msg).toBe(null);
  });

  it("explodeBOM throws on cycle BEFORE rolling", () => {
    const cyclic: BomPart[] = [
      { id: "X", components: [{ child_id: "Y", qty_per_parent: 1 }] },
      { id: "Y", components: [{ child_id: "X", qty_per_parent: 1 }] },
    ];
    expect(() => explodeBOM(cyclic, "X", 1)).toThrow(/cycle detected/);
  });

  it("rollUpBomCost throws on cycle BEFORE summing", () => {
    const cyclic: BomPart[] = [
      { id: "P", components: [{ child_id: "Q", qty_per_parent: 1 }] },
      { id: "Q", components: [{ child_id: "P", qty_per_parent: 1 }] },
    ];
    expect(() => rollUpBomCost(cyclic, "P", 1)).toThrow(/cycle detected/);
  });

  it("rejects self-reference (part directly in own components)", () => {
    expect(() => explodeBOM([
      { id: "SELF", components: [{ child_id: "SELF", qty_per_parent: 1 }] },
    ], "SELF", 1)).toThrow(/self-reference/);
  });
});

describe("BOM — R12 fail-loud", () => {
  it("rejects empty catalog", () => {
    expect(() => explodeBOM([], "X", 1)).toThrow(/empty catalog/);
  });

  it("rejects unknown root_id", () => {
    expect(() => explodeBOM(STAMPING_DIE_BOM, "GHOST", 1)).toThrow(/not found in catalog/);
  });

  it("rejects unknown child_id reference", () => {
    expect(() => explodeBOM([
      { id: "ROOT", components: [{ child_id: "MISSING", qty_per_parent: 1 }] },
    ], "ROOT", 1)).toThrow(/unknown child_id 'MISSING'/);
  });

  it("rejects duplicate part id", () => {
    expect(() => explodeBOM([
      { id: "DUP", unit_cost: 10 },
      { id: "DUP", unit_cost: 20 },
    ], "DUP", 1)).toThrow(/duplicate id 'DUP'/);
  });

  it("rejects negative unit_cost", () => {
    expect(() => explodeBOM([
      { id: "BAD", unit_cost: -1 },
    ], "BAD", 1)).toThrow(/>= 0/);
  });

  it("rejects non-positive qty_per_parent", () => {
    expect(() => explodeBOM([
      { id: "P", components: [{ child_id: "C", qty_per_parent: 0 }] },
      { id: "C", unit_cost: 1 },
    ], "P", 1)).toThrow(/> 0/);
  });

  it("rejects non-positive top_qty", () => {
    expect(() => explodeBOM(STAMPING_DIE_BOM, "DIE-ASSY-001", 0)).toThrow(/> 0/);
  });
});
