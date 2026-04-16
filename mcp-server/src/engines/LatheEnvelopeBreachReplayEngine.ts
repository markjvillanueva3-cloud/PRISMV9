/**
 * LatheEnvelopeBreachReplayEngine
 * =================================
 *
 * Block-by-block envelope-intrusion replay for turning programs.
 *
 * Walks the simulated XZ toolpath against a forbidden-volume envelope
 * made up of:
 *   - chuck + jaw bounding cylinder (z ≤ chuck_face_z, r ≤ chuck_od/2)
 *   - tailstock body (z ≥ tailstock_face_z, r ≤ tailstock_od/2)
 *   - steady rest clamp ring (optional)
 *   - turret tool length + holder (approximated as a swept rectangle)
 *
 * For each block position, tests whether the tool tip / holder
 * intrudes into any forbidden volume. The *first breach* block is
 * reported along with all subsequent hits for completeness.
 *
 * Distinct from existing:
 *   - LatheCollisionZoneEngine    : static zone precomputation only
 *   - VideoReplayOrchestratorEng. : video UI replay, not geometry
 *   - CollisionEngine (generic)   : generic 3D mesh collision
 *   - This engine                 : block-granularity lathe-specific
 *                                   forbidden-volume intrusion replay
 *
 * References:
 *   - DMG MORI "Collision Monitoring" appendix (setup-side geom checks)
 *   - Okuma OSP Parameter: Interference Check Area
 *
 * @module engines/LatheEnvelopeBreachReplayEngine
 * @milestone LATHE-PRO-MS12
 */

export interface LatheBreachBlock {
  n: number;
  /** Tool tip position at end of block (X=diameter, Z=axial) */
  x_mm: number;
  z_mm: number;
  /** Holder/shank extent outward in +X from tip (mm) */
  holder_extent_x_mm?: number;
  /** Holder extent behind tip in -Z direction (mm) */
  holder_extent_z_mm?: number;
}

export interface LatheBreachEnvelope {
  chuck_face_z_mm: number;
  chuck_od_mm: number;
  jaw_protrusion_z_mm?: number;

  tailstock_face_z_mm?: number;
  tailstock_od_mm?: number;

  steady_rest_z_mm?: number;
  steady_rest_od_mm?: number;

  /** Cross-slide travel limit X mm (diameter) */
  x_max_mm?: number;
  /** Z travel limit mm */
  z_max_mm?: number;
}

export interface LatheEnvelopeBreachReplayInput {
  blocks: LatheBreachBlock[];
  envelope: LatheBreachEnvelope;
}

export interface LatheBreachHit {
  n: number;
  component: "chuck" | "tailstock" | "steady_rest" | "x_limit" | "z_limit";
  depth_mm: number;
  note: string;
}

export interface LatheEnvelopeBreachReplayResult {
  first_breach_block?: number;
  hits: LatheBreachHit[];
  total_blocks: number;
  reasoning: string[];
}

class LatheEnvelopeBreachReplayEngineImpl {
  replay(i: LatheEnvelopeBreachReplayInput): LatheEnvelopeBreachReplayResult {
    const hits: LatheBreachHit[] = [];
    const env = i.envelope;
    const jawProt = env.jaw_protrusion_z_mm ?? 0;
    const chuckR = env.chuck_od_mm / 2;
    const tailR = (env.tailstock_od_mm ?? 0) / 2;
    const steadyR = (env.steady_rest_od_mm ?? 0) / 2;

    const reasoning: string[] = [];
    let firstN: number | undefined;

    for (const b of i.blocks) {
      const r = b.x_mm / 2;
      const extendX = b.holder_extent_x_mm ?? 0;
      const extendZ = b.holder_extent_z_mm ?? 0;

      // Chuck zone: z < chuck_face + jaw_protrusion AND (r - holder) < chuck radius
      if (b.z_mm - extendZ < env.chuck_face_z_mm + jawProt && r - extendX < chuckR) {
        hits.push({
          n: b.n,
          component: "chuck",
          depth_mm: round3(chuckR - (r - extendX)),
          note: `Tool/holder inside chuck zone (z=${b.z_mm}, r=${r})`,
        });
        if (firstN === undefined) firstN = b.n;
      }

      // Tailstock
      if (env.tailstock_face_z_mm !== undefined && env.tailstock_od_mm !== undefined) {
        if (b.z_mm + extendZ > env.tailstock_face_z_mm && r - extendX < tailR) {
          hits.push({
            n: b.n,
            component: "tailstock",
            depth_mm: round3(tailR - (r - extendX)),
            note: `Holder inside tailstock zone (z=${b.z_mm})`,
          });
          if (firstN === undefined) firstN = b.n;
        }
      }

      // Steady rest (narrow Z band)
      if (env.steady_rest_z_mm !== undefined && env.steady_rest_od_mm !== undefined) {
        if (Math.abs(b.z_mm - env.steady_rest_z_mm) < 5 && r - extendX < steadyR) {
          hits.push({
            n: b.n,
            component: "steady_rest",
            depth_mm: round3(steadyR - (r - extendX)),
            note: "Holder inside steady rest ring",
          });
          if (firstN === undefined) firstN = b.n;
        }
      }

      // Axis travel limits
      if (env.x_max_mm !== undefined && b.x_mm > env.x_max_mm) {
        hits.push({
          n: b.n,
          component: "x_limit",
          depth_mm: round3(b.x_mm - env.x_max_mm),
          note: `X ${b.x_mm} exceeds axis travel ${env.x_max_mm}`,
        });
        if (firstN === undefined) firstN = b.n;
      }
      if (env.z_max_mm !== undefined && b.z_mm > env.z_max_mm) {
        hits.push({
          n: b.n,
          component: "z_limit",
          depth_mm: round3(b.z_mm - env.z_max_mm),
          note: `Z ${b.z_mm} exceeds axis travel ${env.z_max_mm}`,
        });
        if (firstN === undefined) firstN = b.n;
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

  getStats(): { components: string[]; reference: string } {
    return {
      components: ["chuck", "tailstock", "steady_rest", "x_limit", "z_limit"],
      reference: "DMG MORI Collision Monitoring appx; Okuma OSP Interference Check Area",
    };
  }
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheEnvelopeBreachReplayEngine = new LatheEnvelopeBreachReplayEngineImpl();
export type { LatheEnvelopeBreachReplayEngineImpl };
