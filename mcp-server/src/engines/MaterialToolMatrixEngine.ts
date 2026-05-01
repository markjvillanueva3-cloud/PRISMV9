/**
 * MaterialToolMatrixEngine — U-CAMTEST07
 * =======================================
 *
 * PHASE-8: 3 × 3 (material × tool) slot matrix used by every PHASE-8
 * scenario generator (U-CAMTEST08..13). The matrix itself is 9 abstract
 * slot positions; materialization against a fixture part produces 9
 * concrete (material_id, tool_id) tuples via the part's
 * recommended_materials array and a per-category tool-class table.
 *
 * Per scenario generator: 9 combos × 100 stock setups = 900 scenarios per
 * host. Per category, the materialization is deterministic — same part in
 * + same matrix slots out = same combos out.
 *
 * Tool class table (3 tool slots per part category):
 *   pocket_2d   — roughing_endmill, finishing_endmill, chamfer_mill
 *   contour_2d  — roughing_endmill, finishing_endmill, engraving_mill
 *   drilling    — spot_drill,       drill,             chamfer_mill
 *   threading   — tap_drill,        tap,               thread_mill
 *   surface_3d  — bull_nose,        ball_rougher,      ball_finisher
 *   multi_axis  — bull_nose,        ball_finisher,     swarf_cutter
 *   turning     — od_rougher,       od_finisher,       thread_tool
 *
 * @module engines/MaterialToolMatrixEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST07
 */

import { z } from "zod";
import {
  FixturePartCatalogEngine,
  type FixturePartDescriptor,
  type FixtureCategory,
} from "./FixturePartCatalogEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const MatrixSlotIndexSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type MatrixSlotIndex = z.infer<typeof MatrixSlotIndexSchema>;

export const ToolClassSchema = z.enum([
  "roughing_endmill",
  "finishing_endmill",
  "chamfer_mill",
  "engraving_mill",
  "spot_drill",
  "drill",
  "tap_drill",
  "tap",
  "thread_mill",
  "bull_nose",
  "ball_rougher",
  "ball_finisher",
  "swarf_cutter",
  "od_rougher",
  "od_finisher",
  "thread_tool",
]);
export type ToolClass = z.infer<typeof ToolClassSchema>;

export const MatrixSlotSchema = z.object({
  slot_id: z.string().regex(/^M[123]T[123]$/, "slot_id must match M[1-3]T[1-3]"),
  material_index: MatrixSlotIndexSchema,
  tool_index: MatrixSlotIndexSchema,
});
export type MatrixSlot = z.infer<typeof MatrixSlotSchema>;

export const MaterialToolComboSchema = z.object({
  combo_id: z.string().min(1),
  part_id: z.string().min(1),
  slot: MatrixSlotSchema,
  material_id: z.string().min(1),
  tool_id: z.string().min(1),
  tool_class: ToolClassSchema,
});
export type MaterialToolCombo = z.infer<typeof MaterialToolComboSchema>;

// ── Tool class table ─────────────────────────────────────────────────────────

const TOOL_CLASSES_BY_CATEGORY: Readonly<Record<FixtureCategory, readonly [ToolClass, ToolClass, ToolClass]>> = Object.freeze({
  pocket_2d:   ["roughing_endmill", "finishing_endmill", "chamfer_mill"],
  contour_2d:  ["roughing_endmill", "finishing_endmill", "engraving_mill"],
  drilling:    ["spot_drill",       "drill",             "chamfer_mill"],
  threading:   ["tap_drill",        "tap",               "thread_mill"],
  surface_3d:  ["bull_nose",        "ball_rougher",      "ball_finisher"],
  multi_axis:  ["bull_nose",        "ball_finisher",     "swarf_cutter"],
  turning:     ["od_rougher",       "od_finisher",       "thread_tool"],
});

// ── Matrix slots (frozen 3 × 3 grid) ─────────────────────────────────────────

function buildMatrix(): readonly MatrixSlot[] {
  const slots: MatrixSlot[] = [];
  for (const m of [1, 2, 3] as const) {
    for (const t of [1, 2, 3] as const) {
      const slot: MatrixSlot = {
        slot_id: `M${m}T${t}`,
        material_index: m,
        tool_index: t,
      };
      MatrixSlotSchema.parse(slot);
      Object.freeze(slot);
      slots.push(slot);
    }
  }
  Object.freeze(slots);
  return slots;
}

const MATRIX_SLOTS = buildMatrix();

// ── Materialization ─────────────────────────────────────────────────────────

function pickMaterial(part: FixturePartDescriptor, idx: MatrixSlotIndex): string {
  const mats = part.recommended_materials;
  // The catalog guarantees ≥1 material per part. When fewer than 3 are listed,
  // we cycle through the available materials so every slot resolves to a real
  // material — keeps the 9-combo invariant intact for parts with shorter lists.
  return mats[(idx - 1) % mats.length];
}

function pickToolClass(category: FixtureCategory, idx: MatrixSlotIndex): ToolClass {
  return TOOL_CLASSES_BY_CATEGORY[category][idx - 1];
}

function makeCombo(part: FixturePartDescriptor, slot: MatrixSlot): MaterialToolCombo {
  const material_id = pickMaterial(part, slot.material_index);
  const tool_class = pickToolClass(part.category, slot.tool_index);
  const tool_id = `tool_${part.category}_${tool_class}`;
  const combo_id = `combo_${part.part_id}_${slot.slot_id}`;
  const combo: MaterialToolCombo = {
    combo_id,
    part_id: part.part_id,
    slot,
    material_id,
    tool_id,
    tool_class,
  };
  return MaterialToolComboSchema.parse(combo);
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class MaterialToolMatrixEngine {
  static readonly EXPECTED_SLOTS = 9;
  static readonly MATRIX_SLOTS = MATRIX_SLOTS;
  static readonly TOOL_CLASSES_BY_CATEGORY = TOOL_CLASSES_BY_CATEGORY;

  /** All 9 abstract slot positions (defensive copy). */
  static slots(): MatrixSlot[] {
    return MATRIX_SLOTS.map(s => s);
  }

  /** Tool classes for one category (defensive 3-tuple). */
  static toolClassesFor(category: FixtureCategory): [ToolClass, ToolClass, ToolClass] {
    const arr = TOOL_CLASSES_BY_CATEGORY[category];
    return [arr[0], arr[1], arr[2]];
  }

  /** Materialize all 9 combos for one part (looked up by id). */
  static comboesForPart(part_id: string): MaterialToolCombo[] {
    const part = FixturePartCatalogEngine.get(part_id);
    if (part === null) return [];
    return MATRIX_SLOTS.map(s => makeCombo(part, s));
  }

  /** Materialize one combo by part_id + slot_id. Null when either is unknown. */
  static getCombo(part_id: string, slot_id: string): MaterialToolCombo | null {
    const part = FixturePartCatalogEngine.get(part_id);
    if (part === null) return null;
    const slot = MATRIX_SLOTS.find(s => s.slot_id === slot_id);
    if (slot === undefined) return null;
    return makeCombo(part, slot);
  }

  /** Throws when part_id or slot_id unknown. */
  static mustGetCombo(part_id: string, slot_id: string): MaterialToolCombo {
    const c = MaterialToolMatrixEngine.getCombo(part_id, slot_id);
    if (c === null) {
      throw new Error(`MaterialToolMatrix: no combo for part_id="${part_id}", slot_id="${slot_id}"`);
    }
    return c;
  }

  /** Materialize the full catalog: every part × every slot. */
  static allCombos(): MaterialToolCombo[] {
    const out: MaterialToolCombo[] = [];
    for (const part of FixturePartCatalogEngine.list()) {
      for (const slot of MATRIX_SLOTS) {
        out.push(makeCombo(part, slot));
      }
    }
    return out;
  }

  /** parts × slots = 20 × 9 = 180. */
  static expectedComboCount(): number {
    return FixturePartCatalogEngine.count() * MATRIX_SLOTS.length;
  }

  static auditMatrix(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (MATRIX_SLOTS.length !== MaterialToolMatrixEngine.EXPECTED_SLOTS) {
      errors.push(`expected ${MaterialToolMatrixEngine.EXPECTED_SLOTS} slots, got ${MATRIX_SLOTS.length}`);
    }
    const ids = new Set<string>();
    for (const s of MATRIX_SLOTS) {
      if (ids.has(s.slot_id)) errors.push(`duplicate slot_id "${s.slot_id}"`);
      ids.add(s.slot_id);
    }
    // Every category must have exactly 3 distinct tool classes.
    for (const cat of Object.keys(TOOL_CLASSES_BY_CATEGORY) as FixtureCategory[]) {
      const tcs = TOOL_CLASSES_BY_CATEGORY[cat];
      if (tcs.length !== 3) errors.push(`category ${cat} has ${tcs.length} tool classes, expected 3`);
      const distinct = new Set(tcs);
      if (distinct.size !== 3) errors.push(`category ${cat} has duplicate tool classes`);
    }
    // Materialized total must match expectation.
    const allCount = MaterialToolMatrixEngine.allCombos().length;
    const expected = MaterialToolMatrixEngine.expectedComboCount();
    if (allCount !== expected) errors.push(`allCombos length ${allCount} ≠ expected ${expected}`);
    return { ok: errors.length === 0, errors };
  }
}

export const materialToolMatrixEngine = MaterialToolMatrixEngine;
