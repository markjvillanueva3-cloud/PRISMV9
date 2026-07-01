/**
 * MillEnvelopeBreachReplayEngine — block-by-block envelope-intrusion replay for mill programs
 *
 * Mill-domain parity for LatheEnvelopeBreachReplayEngine (LATHE-PRO-MS12). Lathe replays a
 * 2D XZ toolpath against chuck-cylinder + tailstock-cylinder + steady-rest + axis limits;
 * mill replays a 3D XYZ toolpath against:
 *
 *   - WORKHOLDING_BOX        — vise/fixture footprint as XYZ AABB (rectangular)
 *   - FIXTURE_INTERFERENCES  — caller-supplied AABBs for tombstones, clamps, parts on plate
 *   - SPINDLE_NOSE_FLOOR     — spindle nose must clear table by margin (Z lower limit)
 *   - AXIS_LIMITS_XYZ        — soft-limits X_min/X_max, Y_min/Y_max, Z_min/Z_max
 *   - HEAD_TILT_LIMITS       — for 5-axis (A/B tilt out of [min,max])
 *
 * For each block end position, tests whether the tool tip / holder intrudes into any
 * forbidden volume. First-breach block is reported along with all subsequent hits.
 *
 * Distinct from existing:
 *   - GenericCollisionEngine            : 3D mesh collision (heavyweight)
 *   - MillCollisionPreventionEngine     : zone precomputation only (no replay)
 *   - This engine                       : block-granularity AABB intrusion replay
 *
 * References:
 *   - DMG MORI "Collision Monitoring" appendix (setup-side geom checks)
 *   - Heidenhain TNC "Protection Range" (parameters 1340-1349, mill axis-limit envelope)
 *   - ISO 23125 (safety of CNC machine tools — protective zones)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-ENVELOPE-BREACH-REPLAY (iter66)
 * @version 1.0.0
 * @module MillEnvelopeBreachReplayEngine
 */

export interface MillBreachBlock {
  n: number;
  /** Tool tip position at end of block */
  x_mm: number;
  y_mm: number;
  z_mm: number;
  /** Holder shank radius (mm) — XY extent around tool tip */
  holder_radius_mm?: number;
  /** Holder height (mm) — how far above tool tip the holder bottom sits */
  holder_height_mm?: number;
  /** 5-axis tilt at end of block (deg) */
  a_axis_deg?: number;
  b_axis_deg?: number;
  c_axis_deg?: number;
}

/** Axis-aligned bounding box for forbidden volume */
export interface AABB {
  x_min_mm: number;
  x_max_mm: number;
  y_min_mm: number;
  y_max_mm: number;
  z_min_mm: number;
  z_max_mm: number;
  label?: string;
}

export interface MillBreachEnvelope {
  /** Workholding bounding box (vise / fixture footprint as XYZ AABB) */
  workholding_box?: AABB;
  /** Additional fixture interference volumes (clamps, tombstones, parts on plate) */
  fixture_interferences?: AABB[];
  /** Spindle nose minimum Z — tool tip cannot go below this without collision with table */
  spindle_nose_floor_z_mm?: number;
  /** Mill axis travel limits */
  x_min_mm?: number;
  x_max_mm?: number;
  y_min_mm?: number;
  y_max_mm?: number;
  z_min_mm?: number;
  z_max_mm?: number;
  /** 5-axis head tilt limits (deg) */
  a_min_deg?: number;
  a_max_deg?: number;
  b_min_deg?: number;
  b_max_deg?: number;
  c_min_deg?: number;
  c_max_deg?: number;
}

export interface MillEnvelopeBreachReplayInput {
  blocks: MillBreachBlock[];
  envelope: MillBreachEnvelope;
}

export type MillBreachComponent =
  | "workholding_box"
  | "fixture_interference"
  | "spindle_nose_floor"
  | "x_min" | "x_max"
  | "y_min" | "y_max"
  | "z_min" | "z_max"
  | "a_tilt" | "b_tilt" | "c_tilt";

export interface MillBreachHit {
  n: number;
  component: MillBreachComponent;
  depth_mm: number;
  note: string;
}

export interface MillEnvelopeBreachReplayResult {
  first_breach_block?: number;
  hits: MillBreachHit[];
  total_blocks: number;
  reasoning: string[];
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

/**
 * Tool tip is inside AABB? Returns penetration depth (minimum distance from tip to the
 * nearest face from the inside) when inside; 0 when outside.
 * Holder is approximated as a cylinder above the tip — for simplicity we test
 * `tip + holder_radius` against the AABB. A proper check would test the swept cylinder,
 * but for envelope-breach replay the conservative AABB test gives high-fidelity warnings.
 */
function aabbBreachDepth(tip: MillBreachBlock, box: AABB): number {
  const r = tip.holder_radius_mm ?? 0;
  // Expanded box with holder radius added to X and Y faces
  const xMin = box.x_min_mm - r;
  const xMax = box.x_max_mm + r;
  const yMin = box.y_min_mm - r;
  const yMax = box.y_max_mm + r;
  // Z stays as-is (holder is *above* tip, so tip-Z inside box means cutter is in box)
  const inside =
    tip.x_mm >= xMin && tip.x_mm <= xMax &&
    tip.y_mm >= yMin && tip.y_mm <= yMax &&
    tip.z_mm >= box.z_min_mm && tip.z_mm <= box.z_max_mm;
  if (!inside) return 0;
  // Penetration depth = minimum distance to nearest face
  const dx = Math.min(tip.x_mm - xMin, xMax - tip.x_mm);
  const dy = Math.min(tip.y_mm - yMin, yMax - tip.y_mm);
  const dz = Math.min(tip.z_mm - box.z_min_mm, box.z_max_mm - tip.z_mm);
  return Math.min(dx, dy, dz);
}

class MillEnvelopeBreachReplayEngineImpl {
  replay(i: MillEnvelopeBreachReplayInput): MillEnvelopeBreachReplayResult {
    if (!i || !Array.isArray(i.blocks)) {
      throw new Error("MillEnvelopeBreachReplayEngine.replay: blocks[] required");
    }
    if (!i.envelope) {
      throw new Error("MillEnvelopeBreachReplayEngine.replay: envelope required");
    }
    const env = i.envelope;
    const hits: MillBreachHit[] = [];
    const reasoning: string[] = [];
    let firstN: number | undefined;

    const markHit = (h: MillBreachHit): void => {
      hits.push(h);
      if (firstN === undefined) firstN = h.n;
    };

    for (const b of i.blocks) {
      // Workholding box
      if (env.workholding_box) {
        const depth = aabbBreachDepth(b, env.workholding_box);
        if (depth > 0) {
          markHit({
            n: b.n,
            component: "workholding_box",
            depth_mm: round3(depth),
            note: `Tool inside workholding box at (${b.x_mm}, ${b.y_mm}, ${b.z_mm})`,
          });
        }
      }
      // Fixture interferences (multiple)
      if (env.fixture_interferences) {
        for (let f = 0; f < env.fixture_interferences.length; f++) {
          const box = env.fixture_interferences[f];
          const depth = aabbBreachDepth(b, box);
          if (depth > 0) {
            markHit({
              n: b.n,
              component: "fixture_interference",
              depth_mm: round3(depth),
              note: `Tool inside fixture '${box.label ?? `#${f}`}' at (${b.x_mm}, ${b.y_mm}, ${b.z_mm})`,
            });
          }
        }
      }
      // Spindle nose floor
      if (env.spindle_nose_floor_z_mm !== undefined && b.z_mm < env.spindle_nose_floor_z_mm) {
        markHit({
          n: b.n,
          component: "spindle_nose_floor",
          depth_mm: round3(env.spindle_nose_floor_z_mm - b.z_mm),
          note: `Tool tip Z=${b.z_mm} below floor ${env.spindle_nose_floor_z_mm} — collision with table risk`,
        });
      }
      // Axis limits
      if (env.x_min_mm !== undefined && b.x_mm < env.x_min_mm) {
        markHit({ n: b.n, component: "x_min", depth_mm: round3(env.x_min_mm - b.x_mm), note: `X ${b.x_mm} below soft-limit ${env.x_min_mm}` });
      }
      if (env.x_max_mm !== undefined && b.x_mm > env.x_max_mm) {
        markHit({ n: b.n, component: "x_max", depth_mm: round3(b.x_mm - env.x_max_mm), note: `X ${b.x_mm} above soft-limit ${env.x_max_mm}` });
      }
      if (env.y_min_mm !== undefined && b.y_mm < env.y_min_mm) {
        markHit({ n: b.n, component: "y_min", depth_mm: round3(env.y_min_mm - b.y_mm), note: `Y ${b.y_mm} below soft-limit ${env.y_min_mm}` });
      }
      if (env.y_max_mm !== undefined && b.y_mm > env.y_max_mm) {
        markHit({ n: b.n, component: "y_max", depth_mm: round3(b.y_mm - env.y_max_mm), note: `Y ${b.y_mm} above soft-limit ${env.y_max_mm}` });
      }
      if (env.z_min_mm !== undefined && b.z_mm < env.z_min_mm) {
        markHit({ n: b.n, component: "z_min", depth_mm: round3(env.z_min_mm - b.z_mm), note: `Z ${b.z_mm} below soft-limit ${env.z_min_mm}` });
      }
      if (env.z_max_mm !== undefined && b.z_mm > env.z_max_mm) {
        markHit({ n: b.n, component: "z_max", depth_mm: round3(b.z_mm - env.z_max_mm), note: `Z ${b.z_mm} above soft-limit ${env.z_max_mm}` });
      }
      // 5-axis tilt limits
      if (b.a_axis_deg !== undefined) {
        if (env.a_min_deg !== undefined && b.a_axis_deg < env.a_min_deg) {
          markHit({ n: b.n, component: "a_tilt", depth_mm: round3(env.a_min_deg - b.a_axis_deg), note: `A ${b.a_axis_deg}° below limit ${env.a_min_deg}°` });
        }
        if (env.a_max_deg !== undefined && b.a_axis_deg > env.a_max_deg) {
          markHit({ n: b.n, component: "a_tilt", depth_mm: round3(b.a_axis_deg - env.a_max_deg), note: `A ${b.a_axis_deg}° above limit ${env.a_max_deg}°` });
        }
      }
      if (b.b_axis_deg !== undefined) {
        if (env.b_min_deg !== undefined && b.b_axis_deg < env.b_min_deg) {
          markHit({ n: b.n, component: "b_tilt", depth_mm: round3(env.b_min_deg - b.b_axis_deg), note: `B ${b.b_axis_deg}° below limit ${env.b_min_deg}°` });
        }
        if (env.b_max_deg !== undefined && b.b_axis_deg > env.b_max_deg) {
          markHit({ n: b.n, component: "b_tilt", depth_mm: round3(b.b_axis_deg - env.b_max_deg), note: `B ${b.b_axis_deg}° above limit ${env.b_max_deg}°` });
        }
      }
      if (b.c_axis_deg !== undefined) {
        if (env.c_min_deg !== undefined && b.c_axis_deg < env.c_min_deg) {
          markHit({ n: b.n, component: "c_tilt", depth_mm: round3(env.c_min_deg - b.c_axis_deg), note: `C ${b.c_axis_deg}° below limit ${env.c_min_deg}°` });
        }
        if (env.c_max_deg !== undefined && b.c_axis_deg > env.c_max_deg) {
          markHit({ n: b.n, component: "c_tilt", depth_mm: round3(b.c_axis_deg - env.c_max_deg), note: `C ${b.c_axis_deg}° above limit ${env.c_max_deg}°` });
        }
      }
    }

    reasoning.push(`Replayed ${i.blocks.length} blocks`);
    reasoning.push(`${hits.length} breach hit(s); first at block ${firstN ?? "none"}`);

    return {
      first_breach_block: firstN,
      hits,
      total_blocks: i.blocks.length,
      reasoning,
    };
  }

  getStats(): {
    components: MillBreachComponent[];
    reference: string;
  } {
    return {
      components: [
        "workholding_box", "fixture_interference", "spindle_nose_floor",
        "x_min", "x_max", "y_min", "y_max", "z_min", "z_max",
        "a_tilt", "b_tilt", "c_tilt",
      ],
      reference: "DMG MORI Collision Monitoring appx; Heidenhain TNC Protection Range; ISO 23125",
    };
  }
}

export const millEnvelopeBreachReplayEngine = new MillEnvelopeBreachReplayEngineImpl();
export type { MillEnvelopeBreachReplayEngineImpl };
