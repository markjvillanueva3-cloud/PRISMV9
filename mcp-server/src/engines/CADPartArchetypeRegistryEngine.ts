/**
 * CADPartArchetypeRegistryEngine — CAD-COMPLETE-MS0/U-CADC32
 *
 * Template library of common JM-Die-inspired part archetypes for the
 * hyperCAD-S "draw any part" pipeline. Each archetype is a feature-pattern
 * recipe: a deterministic sequence of sketch + feature operations that the
 * CADDrawAnyPartOrchestratorEngine consumes to produce a parametric solid.
 *
 * Why a registry: most production parts decompose into ≤6 archetypes (boss,
 * rib, slot, keyway, pocket, hole-family). A registry lets the upstream
 * blueprint-OCR + intent-builder pipeline emit archetype tokens instead of
 * raw op-streams, which is denser, easier to learn (PHASE-7 ML target), and
 * trivially round-trip-validatable (CADModelDimensionExtractorEngine reads
 * the same ops back).
 *
 * Pure data + pure lookup — no I/O, no global state, no Date.now().
 */

import { z } from "zod";

// ── Archetype taxonomy ──────────────────────────────────────────────────────

export const ArchetypeKind = z.enum([
  "boss",
  "rib",
  "slot_through",
  "keyway",
  "pocket_rect",
  "hole_simple",
  "hole_counterbore",
  "thread_boss",
]);
export type ArchetypeKind = z.infer<typeof ArchetypeKind>;

export const ArchetypeOp = z.object({
  op: z.string(),
  args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
export type ArchetypeOp = z.infer<typeof ArchetypeOp>;

export const Archetype = z.object({
  kind: ArchetypeKind,
  label: z.string(),
  description: z.string(),
  required_params: z.array(z.string()),
  optional_params: z.array(z.string()),
  op_template: z.array(ArchetypeOp),
});
export type Archetype = z.infer<typeof Archetype>;

// ── Frozen registry (8 starter archetypes, all JM-Die-relevant) ─────────────

export const ARCHETYPE_REGISTRY: ReadonlyArray<Archetype> = Object.freeze<Archetype[]>([
  {
    kind: "boss",
    label: "Cylindrical Boss",
    description: "Circular extruded boss — most common feature on flanges, brackets, mounting plates.",
    required_params: ["diameter", "height"],
    optional_params: ["fillet_radius"],
    op_template: [
      { op: "sketch_circle", args: { diameter: 0 } },
      { op: "feature_extrude", args: { depth: 0 } },
    ],
  },
  {
    kind: "rib",
    label: "Rectangular Rib",
    description: "Stiffening rib — rectangular cross-section extruded along a face. Common on cast brackets.",
    required_params: ["width", "length", "height"],
    optional_params: ["draft_angle"],
    op_template: [
      { op: "sketch_rectangle", args: { width: 0, height: 0 } },
      { op: "feature_extrude", args: { depth: 0 } },
    ],
  },
  {
    kind: "slot_through",
    label: "Through Slot",
    description: "Obround through-slot — fastener clearance with positional adjustment. Standard on bracket flanges.",
    required_params: ["width", "length", "depth"],
    optional_params: [],
    op_template: [
      { op: "sketch_slot", args: { width: 0, length: 0 } },
      { op: "feature_extrude", args: { depth: 0 } },
    ],
  },
  {
    kind: "keyway",
    label: "Shaft Keyway",
    description: "Rectangular keyway — torque-transmission slot on rotating shafts. Standard depth = width/2.",
    required_params: ["width", "length", "depth"],
    optional_params: ["fillet_radius"],
    op_template: [
      { op: "sketch_rectangle", args: { width: 0, height: 0 } },
      { op: "feature_extrude", args: { depth: 0 } },
    ],
  },
  {
    kind: "pocket_rect",
    label: "Rectangular Pocket",
    description: "Blind rectangular pocket — material removal for weight/clearance. Roughed in 2D HSM.",
    required_params: ["width", "length", "depth"],
    optional_params: ["corner_radius", "draft_angle"],
    op_template: [
      { op: "sketch_rectangle", args: { width: 0, height: 0 } },
      { op: "feature_extrude", args: { depth: 0 } },
    ],
  },
  {
    kind: "hole_simple",
    label: "Simple Through Hole",
    description: "Plain cylindrical through-hole — drill or interpolated. No counterbore/csk.",
    required_params: ["diameter", "depth"],
    optional_params: [],
    op_template: [
      { op: "feature_hole", args: { diameter: 0, depth: 0 } },
    ],
  },
  {
    kind: "hole_counterbore",
    label: "Counterbore Hole",
    description: "Stepped hole: clearance ø + larger counterbore for SHCS head recess.",
    required_params: ["clearance_diameter", "counterbore_diameter", "counterbore_depth", "through_depth"],
    optional_params: [],
    op_template: [
      { op: "feature_hole", args: { diameter: 0, depth: 0 } },
      { op: "feature_hole", args: { diameter: 0, depth: 0 } },
    ],
  },
  {
    kind: "thread_boss",
    label: "Threaded Boss",
    description: "Cylindrical boss + threaded hole — fastener anchor. Pitch follows ISO/UN standard.",
    required_params: ["boss_diameter", "boss_height", "thread_diameter", "thread_pitch", "thread_depth"],
    optional_params: [],
    op_template: [
      { op: "sketch_circle", args: { diameter: 0 } },
      { op: "feature_extrude", args: { depth: 0 } },
      { op: "feature_thread", args: { diameter: 0, pitch: 0 } },
    ],
  },
]);

// ── Pure helpers ────────────────────────────────────────────────────────────

export function listKinds(): ReadonlyArray<ArchetypeKind> {
  return ARCHETYPE_REGISTRY.map(a => a.kind);
}

export function getArchetype(kind: ArchetypeKind): Archetype | null {
  return ARCHETYPE_REGISTRY.find(a => a.kind === kind) ?? null;
}

/**
 * Materialize an archetype's op_template with concrete parameter values.
 * R12 fail-loud: throws on missing required params (NEVER silently substitutes zero).
 */
export function materializeArchetype(
  kind: ArchetypeKind,
  params: Readonly<Record<string, number>>,
): ReadonlyArray<ArchetypeOp> {
  const a = getArchetype(kind);
  if (!a) throw new Error(`unknown archetype kind: ${kind}`);
  for (const req of a.required_params) {
    const v = params[req];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      throw new Error(`archetype ${kind}: required param '${req}' missing or non-positive (got ${v})`);
    }
  }
  // Per-archetype materialization rules — explicit mapping, no reflection.
  switch (kind) {
    case "boss":
      return [
        { op: "sketch_circle", args: { diameter: params.diameter } },
        { op: "feature_extrude", args: { depth: params.height } },
      ];
    case "rib":
      return [
        { op: "sketch_rectangle", args: { width: params.width, height: params.length } },
        { op: "feature_extrude", args: { depth: params.height } },
      ];
    case "slot_through":
      return [
        { op: "sketch_slot", args: { width: params.width, length: params.length } },
        { op: "feature_extrude", args: { depth: params.depth } },
      ];
    case "keyway":
      return [
        { op: "sketch_rectangle", args: { width: params.width, height: params.length } },
        { op: "feature_extrude", args: { depth: params.depth } },
      ];
    case "pocket_rect":
      return [
        { op: "sketch_rectangle", args: { width: params.width, height: params.length } },
        { op: "feature_extrude", args: { depth: params.depth } },
      ];
    case "hole_simple":
      return [
        { op: "feature_hole", args: { diameter: params.diameter, depth: params.depth } },
      ];
    case "hole_counterbore":
      return [
        { op: "feature_hole", args: { diameter: params.clearance_diameter, depth: params.through_depth } },
        { op: "feature_hole", args: { diameter: params.counterbore_diameter, depth: params.counterbore_depth } },
      ];
    case "thread_boss":
      return [
        { op: "sketch_circle", args: { diameter: params.boss_diameter } },
        { op: "feature_extrude", args: { depth: params.boss_height } },
        { op: "feature_thread", args: { diameter: params.thread_diameter, pitch: params.thread_pitch } },
      ];
  }
}

export interface ArchetypeRegistrySummary {
  schemaVersion: 1;
  count: number;
  kinds: ReadonlyArray<ArchetypeKind>;
}

export class CADPartArchetypeRegistryEngine {
  list(): ReadonlyArray<Archetype> {
    return ARCHETYPE_REGISTRY;
  }
  kinds(): ReadonlyArray<ArchetypeKind> {
    return listKinds();
  }
  get(kind: ArchetypeKind): Archetype | null {
    return getArchetype(kind);
  }
  materialize(kind: ArchetypeKind, params: Readonly<Record<string, number>>): ReadonlyArray<ArchetypeOp> {
    return materializeArchetype(kind, params);
  }
  summary(): ArchetypeRegistrySummary {
    return {
      schemaVersion: 1,
      count: ARCHETYPE_REGISTRY.length,
      kinds: listKinds(),
    };
  }
}

export const cadPartArchetypeRegistryEngine = new CADPartArchetypeRegistryEngine();
