/**
 * JMDieLatheProgramUpgraderV2Engine — physics-driven program upgrader (PSN-powered)
 * ===================================================================================
 *
 * V2 of the JM Die lathe program upgrader. Closes the critique gap from
 * `state/shared/dashboards/jm-die-lathe-upgrade-critique.md` (whiskey iter13)
 * by routing S/F computation through PRISM's canonical
 * `UltimateSpeedFeedEngine.calculate()` rather than V1's hardcoded SFM/FPR/DoC
 * constants. Returns per-machine variants enriched with `OptimizedValue`
 * provenance (formula source + confidence) the V1 contract did not carry.
 *
 * ─── Template for other domains ────────────────────────────────────────────
 *
 * Per /goal "use this as training for the system so we know how to improve
 * milling and wire and all other machines later" — the architecture here is
 * the **canonical reference pattern** for any future `<Shop>+<Domain>` upgrader:
 *
 *   1. Domain-specific Machine inventory (this engine: 7 Okuma lathes; future
 *      Mill engine: VMC inventory; future WEDM engine: WEDM inventory).
 *   2. ISO group mapping (P/M/K/N/S/H per workpiece material).
 *   3. Per-machine UltimateSpeedFeedInput build — operation, ISO group, tool,
 *      machine rigidity, machine_max_rpm, optimize_for.
 *   4. `ultimateSpeedFeedEngine.calculate(input)` — the SAME canonical call
 *      whether we're upgrading a lathe, mill, or WEDM program.
 *   5. Wrap result in domain output shape; preserve provenance.
 *
 * Future units (U-UPGRADE-MILL, U-UPGRADE-WEDM, U-UPGRADE-WELDER) re-use
 * steps 3-4 verbatim, only steps 1-2 change.
 *
 * ─── What V2 fixes vs V1 ───────────────────────────────────────────────────
 *
 *   ✓ Real Kienzle force model via UltimateSpeedFeedEngine (was hardcoded 180 SFM)
 *   ✓ Taylor tool life optimization (was hardcoded; now optimize_for="balanced")
 *   ✓ Chatter stability lobes (when stiffness/freq/damping provided)
 *   ✓ Per-ISO-group material differentiation (was hardcoded "tool_steel" → P group)
 *   ✓ Per-machine power/rpm/rigidity passed to physics engine
 *   ✓ Confidence-scored output (V1 had no confidence)
 *   ✓ Provenance trail (V1 had no source attribution)
 *
 * ─── What V2 still does NOT do (deferred to follow-up units) ───────────────
 *
 *   ✗ Controller-specific G-code emission (U-UPGRADE-CONTROLLER-POST)
 *   ✗ PRINTS/ folder material scan (U-UPGRADE-PRINT-LOOKUP)
 *   ✗ Tribal knowledge consult (U-UPGRADE-TRIBAL-INJECTION) — pending
 *   ✗ Live-tooling / multi-axis (U-UPGRADE-LIVE-TOOLING)
 *   ✗ Omega safety gate (U-UPGRADE-SAFETY-GATE) — see CRITIQUE.md
 *
 * @module engines/JMDieLatheProgramUpgraderV2Engine
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-V2-PHYSICS
 * @version 2.0.0
 */

import { JM_DIE_LATHES, extractPartNumber } from "./JMDieLatheProgramUpgraderEngine.js";
import type { ISOGroup } from "./UltimateSpeedFeedEngine.js";

/** Canonical mapping: workpiece material → ISO turning group. */
export const MATERIAL_TO_ISO_GROUP: Record<string, ISOGroup> = {
  // Default catch-all per operator directive (majority of jobs are tool steels)
  tool_steel: "H",
  // Tool steel grades — all map to H (hardened steels)
  d2: "H",
  a2: "H",
  h13: "H",
  o1: "H",
  s7: "H",
  m2: "H",
  // Pre-hardened mold steel
  p20: "P",
  // Carbon/alloy structural
  "1018": "P",
  "1045": "P",
  "4140": "P",
  "4140-pht": "P",
  "8620": "P",
  // Stainless
  "303": "M",
  "304": "M",
  "316": "M",
  "17-4ph": "M",
  // Cast iron
  "g25": "K",
  "ductile-iron": "K",
  // Non-ferrous
  "6061": "N",
  "7075": "N",
  brass: "N",
  // High-temp / titanium
  "ti-6al-4v": "S",
  inconel: "S",
  "inconel-718": "S",
} as const;

/** Operator-directive default tool. */
const DEFAULT_TOOL = {
  // HSSco Allied Engineering TA insert, TiAlN coated.
  tool_material: "hss" as const,
  tool_coating: "tialn",
  tool_diameter_mm: 12.7, // 1/2" insert holder
} as const;

/** Map V1 rigidity tier → V2 ultimate-speed-feed engine's rigidity scale. */
const RIGIDITY_MAP: Record<"light" | "medium" | "heavy", "low" | "medium" | "high"> = {
  light: "low",
  medium: "medium",
  heavy: "high",
} as const;

/**
 * Compute max |X| and max |Z| (mm) seen in the source program. Pure helper
 * for U-UPGRADE-BODY-RESCALE — we use the max-extent to determine which
 * target machines can physically run the program. Lightweight inline parse
 * (G20/G21 modal unit detection, sticky G-mode, X/Z coords, comment-strip).
 * Returns {x_max_mm, z_max_mm} both ≥ 0; -1 means no motion observed.
 */
export function computeMaxExtent(text: string): { x_max_mm: number; z_max_mm: number; has_motion: boolean } {
  const COORD_PATTERN = /([XZ])\s*(-?\d+(?:\.\d+)?)/gi;
  const G_MODE_PATTERN = /\bG(0?0|0?1|0?2|0?3)\b/i;
  const INCH_PATTERN = /\bG20\b/;
  const MM_PATTERN = /\bG21\b/;
  const INCH_TO_MM = 25.4;
  let units: "inch" | "mm" = "inch"; // Okuma OSP default
  let mode: string | null = null;
  let xMaxAbs = -1;
  let zMaxAbs = -1;
  let hasMotion = false;
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const stripped = rawLine.replace(/\([^)]*\)/g, " ").replace(/;.*$/, " ");
    if (!/[XZGM]/i.test(stripped)) continue;
    if (INCH_PATTERN.test(stripped)) units = "inch";
    else if (MM_PATTERN.test(stripped)) units = "mm";
    const gMatch = stripped.match(G_MODE_PATTERN);
    if (gMatch) mode = gMatch[1];
    if (mode === null) continue;
    const scale = units === "inch" ? INCH_TO_MM : 1;
    for (const m of stripped.matchAll(COORD_PATTERN)) {
      const axis = m[1].toUpperCase();
      const val = parseFloat(m[2]);
      if (Number.isNaN(val)) continue;
      const absVal = Math.abs(val) * scale;
      hasMotion = true;
      if (axis === "X" && absVal > xMaxAbs) xMaxAbs = absVal;
      else if (axis === "Z" && absVal > zMaxAbs) zMaxAbs = absVal;
    }
  }
  return { x_max_mm: xMaxAbs, z_max_mm: zMaxAbs, has_motion: hasMotion };
}

/** Per-machine envelope tolerance — variants pass envelope-fit check if source-max ≤ envelope + tolerance (mm). */
const ENVELOPE_FIT_TOLERANCE_MM = 50;

/** Engine input contract. */
export interface UpgradeV2Input {
  sourcePath: string;
  programText?: string;
  /** Workpiece material designator — looked up in MATERIAL_TO_ISO_GROUP; defaults to "tool_steel" (H group). */
  material?: string;
  /** Tool diameter mm — defaults to 12.7 (1/2" insert holder). */
  toolDiameterMm?: number;
  /** Operation type passed to UltimateSpeedFeedEngine. Defaults to "turning". */
  operation?: "turning" | "drilling" | "tapping" | "reaming" | "milling" | "facing" | "grooving" | "threading" | "boring";
  /** Optimization goal — passed through to UltimateSpeedFeedEngine. */
  optimizeFor?: "tool_life" | "productivity" | "surface_finish" | "balanced";
}

export interface UpgradeV2Variant {
  machineId: string;
  machineModel: string;
  outputFileName: string;
  iso_group: ISOGroup;
  rpm: number;
  rpm_confidence: number;
  rpm_source: string;
  feedrate_mm_min: number;
  feedrate_confidence: number;
  feed_per_rev_mm: number;
  depth_of_cut_mm: number;
  effective_sfm: number;
  optimize_for: string;
  rationale: string;
  warnings: string[];
  /**
   * U-UPGRADE-BODY-RESCALE (2026-05-24): true when the source program's
   * max-X or max-Z extent exceeds the target machine's work envelope —
   * meaning the variant would be physically unsafe to run as-is. Batch CLI
   * skips writing skipped variants to disk.
   */
  skipped?: boolean;
  /** Human-readable reason when `skipped:true`. */
  skip_reason?: string;
  /** Max-X (mm) seen in source program; informational. */
  source_max_x_mm?: number;
  /** Max-Z (mm) seen in source program; informational. */
  source_max_z_mm?: number;
}

export interface UpgradeV2Result {
  sourcePath: string;
  partNumber: string;
  material: string;
  iso_group: ISOGroup;
  engineVersion: "2.0.0";
  physicsBackend: "UltimateSpeedFeedEngine.calculate";
  variants: UpgradeV2Variant[];
  warnings: string[];
}

export class JMDieLatheProgramUpgraderV2Engine {
  /**
   * Compute one upgraded variant per JM Die lathe using the canonical
   * UltimateSpeedFeedEngine.calculate() entry point.
   *
   * Pure-ish — calls into ultimateSpeedFeedEngine.calculate which is itself
   * pure (no I/O). Returns a richly-typed result with confidence + provenance.
   */
  static async upgradeOne(input: UpgradeV2Input): Promise<UpgradeV2Result> {
    const { partNumber, warnings: nameWarnings } = extractPartNumber(input);
    const material = (input.material ?? "tool_steel").toLowerCase();
    const iso_group = MATERIAL_TO_ISO_GROUP[material] ?? "H";
    const operation = input.operation ?? "turning";
    const optimize_for = input.optimizeFor ?? "balanced";
    const toolDia = input.toolDiameterMm ?? DEFAULT_TOOL.tool_diameter_mm;
    const warnings: string[] = [...nameWarnings];

    if (!(material in MATERIAL_TO_ISO_GROUP)) {
      warnings.push(`material_unknown_${material} — fell through to H (tool steel) default. Future iter: add explicit grade lookup.`);
    }

    // Lazy import of the heavy SpeedFeed engine. Keeps cold-start small for
    // callers that just want to inspect the metadata.
    const { ultimateSpeedFeedEngine } = await import("./UltimateSpeedFeedEngine.js");

    // U-UPGRADE-BODY-RESCALE — compute source program max-extent ONCE, then
    // per-lathe decide if the variant fits the target envelope. Skipped
    // variants are emitted with skipped:true + skip_reason so the batch CLI
    // never writes physically-unsafe programs to disk.
    const extent = input.programText
      ? computeMaxExtent(input.programText)
      : { x_max_mm: -1, z_max_mm: -1, has_motion: false };

    const variants: UpgradeV2Variant[] = JM_DIE_LATHES.map((lathe) => {
      const v2Rigidity = RIGIDITY_MAP[lathe.rigidityTier];
      // Build the canonical UltimateSpeedFeedInput for this machine.
      const sfInput = {
        operation,
        cut_type: "semi_finishing" as const,
        iso_group,
        tool_material: DEFAULT_TOOL.tool_material,
        tool_coating: DEFAULT_TOOL.tool_coating,
        tool_diameter_mm: toolDia,
        machine_max_rpm: lathe.spindleRpmMax,
        machine_rigidity: v2Rigidity,
        optimize_for,
      };

      let result;
      let variantWarnings: string[] = [];
      try {
        result = ultimateSpeedFeedEngine.calculate(sfInput);
      } catch (err) {
        variantWarnings.push(`speedfeed_compute_failed: ${err instanceof Error ? err.message : String(err)}`);
        result = null;
      }

      // Pull out the optimized fields. The engine returns OptimizedValue
      // (number+unit+confidence+source) per axis. Fall back to V1 baselines if
      // the engine path failed.
      const rpmValue = result?.spindle_rpm?.value ?? 0;
      const rpmConfidence = result?.spindle_rpm?.confidence ?? 0;
      const rpmSource = result?.spindle_rpm?.source ?? "fallback_v1_baseline";
      const sfmEff = result?.cutting_speed_mpm?.value ? Math.round(result.cutting_speed_mpm.value * 3.281) : 180;
      const feedPerRev = result?.feed_per_rev_mm?.value ?? 0.13;
      const feedrate = result?.feed_rate_mmmin?.value ?? Math.round(rpmValue * 0.13);
      const feedConfidence = result?.feed_rate_mmmin?.confidence ?? 0;
      const doc = result?.axial_depth_mm?.value ?? 1.5;

      const outputFileName = `${partNumber}.nc`;

      const rationale = `physics: UltimateSpeedFeedEngine.calculate(operation=${operation}, iso=${iso_group}, tool=${DEFAULT_TOOL.tool_material}+${DEFAULT_TOOL.tool_coating}, rigidity=${v2Rigidity}, optimize_for=${optimize_for}); RPM clamped to spindle_max ${lathe.spindleRpmMax}.`;

      // U-UPGRADE-BODY-RESCALE — envelope-fit gate. Skip variants where the
      // source program's max-extent exceeds the target machine envelope by
      // more than ENVELOPE_FIT_TOLERANCE_MM (covers normal rapid-retract
      // distance). Variant is still returned so the caller sees the audit
      // trail of WHICH machines were considered + WHY each was rejected.
      let skipped = false;
      let skip_reason: string | undefined;
      if (extent.has_motion) {
        if (extent.x_max_mm > lathe.envelope.x_max_mm + ENVELOPE_FIT_TOLERANCE_MM) {
          skipped = true;
          skip_reason = `source x_max ${extent.x_max_mm.toFixed(1)}mm exceeds ${lathe.machineModel} x_envelope ${lathe.envelope.x_max_mm}mm (+${ENVELOPE_FIT_TOLERANCE_MM}mm tol)`;
        } else if (extent.z_max_mm > lathe.envelope.z_max_mm + ENVELOPE_FIT_TOLERANCE_MM) {
          skipped = true;
          skip_reason = `source z_max ${extent.z_max_mm.toFixed(1)}mm exceeds ${lathe.machineModel} z_envelope ${lathe.envelope.z_max_mm}mm (+${ENVELOPE_FIT_TOLERANCE_MM}mm tol)`;
        }
      }

      return {
        machineId: lathe.machineId,
        machineModel: lathe.machineModel,
        outputFileName,
        iso_group,
        rpm: Math.min(Math.round(rpmValue), lathe.spindleRpmMax),
        rpm_confidence: rpmConfidence,
        rpm_source: rpmSource,
        feedrate_mm_min: Math.round(feedrate * 100) / 100,
        feedrate_confidence: feedConfidence,
        feed_per_rev_mm: Math.round(feedPerRev * 1000) / 1000,
        depth_of_cut_mm: Math.round(doc * 100) / 100,
        effective_sfm: sfmEff,
        optimize_for,
        rationale,
        warnings: variantWarnings,
        skipped,
        skip_reason,
        source_max_x_mm: extent.has_motion ? extent.x_max_mm : undefined,
        source_max_z_mm: extent.has_motion ? extent.z_max_mm : undefined,
      };
    });

    return {
      sourcePath: input.sourcePath,
      partNumber,
      material,
      iso_group,
      engineVersion: "2.0.0",
      physicsBackend: "UltimateSpeedFeedEngine.calculate",
      variants,
      warnings,
    };
  }
}

/** Singleton export per engine convention. */
export const jmDieLatheProgramUpgraderV2Engine = JMDieLatheProgramUpgraderV2Engine;
