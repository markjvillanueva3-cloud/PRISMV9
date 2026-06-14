/**
 * HyperCADSElectrodeEngine — CAD-FUSION-LIVE-MS0 / U-HCS-ELECTRODE
 *
 * Typed electrode-design operations for hyperCAD-S, the OPEN MIND CAD that
 * ships an in-house electrode module (Fusion 360 has no equivalent — this
 * is the primary reason for picking hyperCAD-S as a connector target).
 *
 * Operations:
 *   - pickHolder           — select Erowa / System-3R block holder
 *   - setOrbitStrategy     — set EDM orbit (Sink / Sphere / Square / etc.)
 *   - setDescription       — mark electrode type (Core / Cavity / Insert / ...)
 *   - generateElectrode    — generate electrode from cavity + burn faces
 *   - exportToEdm          — export STEP/DXF/native to sinker EDM
 *   - setupClamping        — assign clamping code + offsets
 *   - burnSequence         — order multi-electrode burn sequence
 *
 * Catalogs (mirror `resources/OPEN MIND/hyperCAD-S/31.0/hyperCAD-S/files/electrode/`):
 *   - 9 electrode descriptions   (electrode_descriptions.xml)
 *   - 11 orbit strategies        (electrode_orbit.xml)
 *   - 4 holder libraries         (electrode_blocks_holders.xml)
 *   - 9 standard Z heights mm    (electrode_blocks_holders.xml)
 *
 * Ships ops through {@link HyperCADSLiveBridgeEngine.executeRaw} — the
 * generated Python snippet imports `prism_hypercads_addin` and calls
 * `dispatch(state, op_envelope)` inside the live hyperCAD-S session.
 *
 * @engine HyperCADSElectrodeEngine
 * @dispatcher prism_cad (electrode actions)
 * @milestone CAD-FUSION-LIVE-MS0 / U-HCS-ELECTRODE
 */

import { z } from "zod";
import {
  hyperCADSLiveBridgeEngine,
  type HyperCADSLiveBridgeEngine,
  type LiveOpResult,
  type LiveBridgeContext,
} from "./HyperCADSLiveBridgeEngine.js";

// ── Canonical catalogs (source: files/electrode/electrode_*.xml) ─────────────

/** 9 electrode descriptions from `electrode_descriptions.xml`. */
export const ELECTRODE_DESCRIPTIONS = [
  "Core electrode",
  "Cavity electrode",
  "Insert electrode",
  "Side electrode",
  "Master electrode",
  "Virtual electrode",
  "Injection electrode",
  "Rotational electrode",
  "User defined electrode",
] as const;
export type ElectrodeDescription = (typeof ELECTRODE_DESCRIPTIONS)[number];

/** 11 orbit strategies from `electrode_orbit.xml`. Vendor spelling preserved. */
export const ELECTRODE_ORBITS = [
  "Sink",
  "Sphere",
  "Square",
  "Widen",
  "Linear",
  "Sink and widen",
  "Sink and shpere",
  "Sink and square",
  "Injection",
  "Half sphere",
  "ISOG",
] as const;
export type ElectrodeOrbit = (typeof ELECTRODE_ORBITS)[number];

/** Holder libraries from `electrode_blocks_holders*.xml`. */
export const HOLDER_LIBRARIES = [
  "Erowa_r",
  "Erowa_s",
  "System-3R_r",
  "System-3R_s",
] as const;
export type HolderLibrary = (typeof HOLDER_LIBRARIES)[number];

/** Standard block Z heights (mm) per hyperCAD-S catalog. */
export const HOLDER_Z_HEIGHTS_MM = [20, 40, 60, 80, 100, 150, 200, 250, 300] as const;
export type HolderZHeightMm = (typeof HOLDER_Z_HEIGHTS_MM)[number];

// ── Zod input schemas ────────────────────────────────────────────────────────

export const PickHolderSchema = z.object({
  library: z.enum(HOLDER_LIBRARIES),
  faceXmm: z.number().positive().optional(),
  faceYmm: z.number().positive().optional(),
  zHeightMm: z.number().positive().optional()
    .refine(
      v => v === undefined || (HOLDER_Z_HEIGHTS_MM as readonly number[]).includes(v),
      { message: `non-standard Z height — known: ${HOLDER_Z_HEIGHTS_MM.join(", ")}mm` },
    ),
  clamping: z.string().regex(/^[0-9]{3}$/).default("000"),
  principalOrientation: z.enum(["X", "Y"]).default("X"),
});
export type PickHolderInput = z.infer<typeof PickHolderSchema>;

export const SetOrbitStrategySchema = z.object({
  orbit: z.enum(ELECTRODE_ORBITS),
  undersizeMm: z.number().min(0).default(0.0),
  roughingUndersizeMm: z.number().min(0).optional(),
  finishingUndersizeMm: z.number().min(0).optional(),
}).refine(
  v => v.roughingUndersizeMm === undefined ||
       v.finishingUndersizeMm === undefined ||
       v.roughingUndersizeMm >= v.finishingUndersizeMm,
  {
    message: "roughingUndersizeMm must be ≥ finishingUndersizeMm (rough first, then finish)",
  },
);
export type SetOrbitStrategyInput = z.infer<typeof SetOrbitStrategySchema>;

export const SetDescriptionSchema = z.object({
  description: z.enum(ELECTRODE_DESCRIPTIONS),
});
export type SetDescriptionInput = z.infer<typeof SetDescriptionSchema>;

export const GenerateElectrodeSchema = z.object({
  description: z.enum(ELECTRODE_DESCRIPTIONS).default("Core electrode"),
  cavityBodyId: z.string().min(1).optional(),
  burnFaceIds: z.array(z.string().min(1)).default([]),
  holderLibrary: z.enum(HOLDER_LIBRARIES).default("Erowa_s"),
  orbitStrategy: z.enum(ELECTRODE_ORBITS).default("Sink"),
  undersizeMm: z.number().min(0).default(0.05),
  material: z.string().min(1).default("Cu_OFHC"),
});
export type GenerateElectrodeInput = z.infer<typeof GenerateElectrodeSchema>;

export const ExportToEdmSchema = z.object({
  electrodeId: z.string().min(1),
  format: z.enum(["step", "dxf", "native"]).default("step"),
  path: z.string().min(1).optional(),
});
export type ExportToEdmInput = z.infer<typeof ExportToEdmSchema>;

export const SetupClampingSchema = z.object({
  electrodeId: z.string().min(1),
  clampingCode: z.string().regex(/^[0-9]{3}$/).default("000"),
  holderLibrary: z.enum(HOLDER_LIBRARIES).default("Erowa_s"),
  offsetXmm: z.number().default(0.0),
  offsetYmm: z.number().default(0.0),
  offsetZmm: z.number().default(0.0),
});
export type SetupClampingInput = z.infer<typeof SetupClampingSchema>;

export const BurnSequenceSchema = z.object({
  electrodeIds: z.array(z.string().min(1)).min(1),
  order: z.enum(["depth_descending", "depth_ascending", "user_defined"]).default("depth_descending"),
  roughingPerElectrode: z.boolean().default(true),
  finishingPerElectrode: z.boolean().default(true),
});
export type BurnSequenceInput = z.infer<typeof BurnSequenceSchema>;

// ── Op-envelope serialization ────────────────────────────────────────────────

interface ElectrodeOpEnvelope {
  kind: string;
  args: Record<string, unknown>;
  operationId?: string;
}

/**
 * Build a Python snippet that imports the host add-in and calls dispatch().
 *
 * The script body is intentionally narrow: it injects the op as a JSON
 * literal and lets the add-in's catalog validation reject malformed
 * inputs. This keeps the contract on the host side, not the TS side.
 */
function buildElectrodeScript(env: ElectrodeOpEnvelope, sessionTag: string): string {
  const payload = JSON.stringify(env);
  // R12: explicit failure — the addin's dispatch returns {ok:false, error}
  // and our caller (executeRaw) surfaces that via LiveOpResult.error.
  return [
    "from __future__ import annotations",
    "import json",
    "import sys",
    "sys.path.insert(0, 'H:/PRISM/resources/OPEN MIND/hyperCAD-S')",
    "import prism_hypercads_addin as addin",
    `_state = addin.AddinState(session_id=${JSON.stringify(sessionTag)})`,
    `_envelope = json.loads(${JSON.stringify(payload)})`,
    "_result = addin.dispatch(_state, _envelope)",
    "print(json.dumps({'electrode_result': _result, 'state': {",
    "  'ops_in': _state.ops_in,",
    "  'ops_succeeded': _state.ops_succeeded,",
    "  'ops_failed': _state.ops_failed,",
    "  'last_error': _state.last_error,",
    "}}))",
  ].join("\n");
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class HyperCADSElectrodeEngine {
  /** Per-electrode-engine op counter used for `operationId` synthesis. */
  private opCounter = 0;

  constructor(
    private bridge: HyperCADSLiveBridgeEngine = hyperCADSLiveBridgeEngine,
  ) {}

  // ── Catalog accessors (read-only) ───────────────────────────────────────────

  listElectrodeDescriptions(): readonly ElectrodeDescription[] {
    return ELECTRODE_DESCRIPTIONS;
  }

  listOrbitStrategies(): readonly ElectrodeOrbit[] {
    return ELECTRODE_ORBITS;
  }

  listHolderLibraries(): readonly HolderLibrary[] {
    return HOLDER_LIBRARIES;
  }

  listHolderZHeightsMm(): readonly HolderZHeightMm[] {
    return HOLDER_Z_HEIGHTS_MM;
  }

  // ── Ops (ship through the live bridge) ─────────────────────────────────────

  async pickHolder(input: PickHolderInput, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const parsed = PickHolderSchema.parse(input);
    return this.ship("electrode_pick_block_holder", {
      library: parsed.library,
      face_x_mm: parsed.faceXmm,
      face_y_mm: parsed.faceYmm,
      z_height_mm: parsed.zHeightMm,
      clamping: parsed.clamping,
      principal_orientation: parsed.principalOrientation,
    }, ctx);
  }

  async setOrbitStrategy(input: SetOrbitStrategyInput, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const parsed = SetOrbitStrategySchema.parse(input);
    return this.ship("electrode_set_orbit_strategy", {
      orbit: parsed.orbit,
      undersize_mm: parsed.undersizeMm,
      roughing_undersize_mm: parsed.roughingUndersizeMm,
      finishing_undersize_mm: parsed.finishingUndersizeMm,
    }, ctx);
  }

  async setDescription(input: SetDescriptionInput, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const parsed = SetDescriptionSchema.parse(input);
    return this.ship("electrode_set_description", { description: parsed.description }, ctx);
  }

  async generateElectrode(input: GenerateElectrodeInput, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const parsed = GenerateElectrodeSchema.parse(input);
    return this.ship("electrode_generate", {
      description: parsed.description,
      cavity_body_id: parsed.cavityBodyId,
      burn_face_ids: parsed.burnFaceIds,
      holder_library: parsed.holderLibrary,
      orbit_strategy: parsed.orbitStrategy,
      undersize_mm: parsed.undersizeMm,
      material: parsed.material,
    }, ctx);
  }

  async exportToEdm(input: ExportToEdmInput, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const parsed = ExportToEdmSchema.parse(input);
    return this.ship("electrode_export_to_edm", {
      electrode_id: parsed.electrodeId,
      format: parsed.format,
      path: parsed.path,
    }, ctx);
  }

  async setupClamping(input: SetupClampingInput, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const parsed = SetupClampingSchema.parse(input);
    return this.ship("electrode_clamping_setup", {
      electrode_id: parsed.electrodeId,
      clamping_code: parsed.clampingCode,
      holder_library: parsed.holderLibrary,
      offset_x_mm: parsed.offsetXmm,
      offset_y_mm: parsed.offsetYmm,
      offset_z_mm: parsed.offsetZmm,
    }, ctx);
  }

  async burnSequence(input: BurnSequenceInput, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const parsed = BurnSequenceSchema.parse(input);
    return this.ship("electrode_burn_sequence", {
      electrode_ids: parsed.electrodeIds,
      order: parsed.order,
      roughing_per_electrode: parsed.roughingPerElectrode,
      finishing_per_electrode: parsed.finishingPerElectrode,
    }, ctx);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async ship(
    kind: string,
    args: Record<string, unknown>,
    ctx?: LiveBridgeContext,
  ): Promise<LiveOpResult> {
    const opId = `electrode-${++this.opCounter}-${Date.now()}`;
    const sessionTag = ctx?.projectName ?? "PRISMElectrode";
    const envelope: ElectrodeOpEnvelope = { kind, args, operationId: opId };
    const script = buildElectrodeScript(envelope, sessionTag);
    const filename = `${sessionTag}-electrode-${opId}.py`;
    return this.bridge.executeRaw(script, { projectName: sessionTag, filename });
  }

  _resetForTests(): void {
    this.opCounter = 0;
  }
}

export const hyperCADSElectrodeEngine = new HyperCADSElectrodeEngine();
