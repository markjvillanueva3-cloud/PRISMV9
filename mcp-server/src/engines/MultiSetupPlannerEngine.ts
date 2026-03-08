/**
 * MultiSetupPlannerEngine — CAMK-MS3/U05
 * Part orientation and fixturing optimization for multi-setup programs.
 *
 * Models:
 * - Visibility analysis: which surfaces are accessible per orientation
 * - Stability analysis: fixture force equilibrium (simplified static balance)
 * - Datum chain analysis: tolerance stack-up across setups (Monte Carlo)
 * - Setup count minimization: set cover problem (greedy approximation)
 *
 * References:
 * - Boerma & Kals (1989): Fixture design with FIXES
 * - Rong & Zhu (1999): Computer-Aided Fixture Design, Ch. 4-6
 * - Whitney (2004): Mechanical Assemblies, Ch. 7 — Tolerance analysis
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface Surface {
  id: string;
  normal: { x: number; y: number; z: number };
  area_mm2: number;
  tolerance_mm?: number;
  roughness_ra_um?: number;
  is_datum?: boolean;
  feature_type?: string;           // "pocket" | "hole" | "face" | "slot" | "contour"
}

interface Orientation {
  id: string;
  direction: { x: number; y: number; z: number };
  label: string;                   // e.g. "+Z", "-X", "+Y"
}

interface Setup {
  id: string;
  orientation: Orientation;
  accessible_surfaces: string[];   // surface IDs
  fixture_face: string;            // surface ID used for fixturing
  datum_id?: string;
  algorithm_assignments: { surface_id: string; algorithm: string }[];
  estimated_time_sec: number;
  stability_score: number;         // 0-100
}

interface DatumChainLink {
  from_setup: string;
  to_setup: string;
  datum_surface: string;
  transfer_tolerance_mm: number;
}

interface MultiSetupInput {
  surfaces: Surface[];
  available_orientations?: Orientation[];
  max_setups?: number;              // default 6
  datum_transfer_tolerance_mm?: number; // default 0.02
  monte_carlo_samples?: number;     // default 1000
}

interface MultiSetupResult {
  setups: Setup[];
  setup_count: number;
  datum_chain: DatumChainLink[];
  total_tolerance_stack_mm: number;
  monte_carlo_tolerance_mm: number;  // 3σ statistical tolerance
  uncovered_surfaces: string[];
  coverage_pct: number;
  optimization_notes: string[];
}

// ── Standard orientations ──────────────────────────────────────────────────

const STANDARD_ORIENTATIONS: Orientation[] = [
  { id: "top", direction: { x: 0, y: 0, z: 1 }, label: "+Z (top)" },
  { id: "bottom", direction: { x: 0, y: 0, z: -1 }, label: "-Z (bottom)" },
  { id: "front", direction: { x: 0, y: -1, z: 0 }, label: "-Y (front)" },
  { id: "back", direction: { x: 0, y: 1, z: 0 }, label: "+Y (back)" },
  { id: "left", direction: { x: -1, y: 0, z: 0 }, label: "-X (left)" },
  { id: "right", direction: { x: 1, y: 0, z: 0 }, label: "+X (right)" },
];

// ── Algorithm assignment rules ─────────────────────────────────────────────

function selectAlgorithm(surface: Surface): string {
  if (!surface.feature_type) return "CFSF";
  switch (surface.feature_type) {
    case "pocket": return surface.tolerance_mm && surface.tolerance_mm < 0.05 ? "PTDC" : "TGAR";
    case "hole": return "VCER";
    case "face": return "CFSF";
    case "slot": return "SFCR";
    case "contour": return "HRAF";
    default: return "MTHZD";
  }
}

// ── Engine ──────────────────────────────────────────────────────────────────

class MultiSetupPlannerEngine {
  /**
   * Check if a surface is accessible from a given orientation.
   * Surface is accessible if its normal has positive dot product with
   * the approach direction (tool can reach it).
   */
  isAccessible(surface: Surface, orientation: Orientation): boolean {
    const dot =
      surface.normal.x * orientation.direction.x +
      surface.normal.y * orientation.direction.y +
      surface.normal.z * orientation.direction.z;
    return dot > 0.1; // threshold for accessibility (not perfectly perpendicular)
  }

  /**
   * Fixture stability score (simplified).
   * Higher score = better stability when fixturing on given surface.
   * Based on surface area and orientation (larger flat surfaces = more stable).
   */
  stabilityScore(fixtureSurface: Surface, orientation: Orientation): number {
    // Dot product of fixture surface normal with gravity (-Z)
    const gravityDot = Math.abs(
      fixtureSurface.normal.x * 0 +
      fixtureSurface.normal.y * 0 +
      fixtureSurface.normal.z * (-1)
    );
    // Area contribution (larger = more stable)
    const areaScore = Math.min(fixtureSurface.area_mm2 / 1000, 50);
    // Alignment with approach direction (perpendicular to approach = good)
    const approachDot = Math.abs(
      fixtureSurface.normal.x * orientation.direction.x +
      fixtureSurface.normal.y * orientation.direction.y +
      fixtureSurface.normal.z * orientation.direction.z
    );
    // Fixture surface should be opposite to approach direction
    const fixScore = approachDot > 0.8 ? 0 : (1 - approachDot) * 30;

    return Math.min(100, gravityDot * 20 + areaScore + fixScore);
  }

  /**
   * Greedy set cover: select minimum orientations to cover all surfaces.
   */
  greedySetCover(
    surfaces: Surface[],
    orientations: Orientation[],
    maxSetups: number,
  ): { orientation: Orientation; covered: string[] }[] {
    const uncovered = new Set(surfaces.map(s => s.id));
    const result: { orientation: Orientation; covered: string[] }[] = [];

    while (uncovered.size > 0 && result.length < maxSetups) {
      // Find orientation that covers most uncovered surfaces
      let bestOrientation: Orientation | null = null;
      let bestCovered: string[] = [];

      for (const orient of orientations) {
        const covered = surfaces
          .filter(s => uncovered.has(s.id) && this.isAccessible(s, orient))
          .map(s => s.id);
        if (covered.length > bestCovered.length) {
          bestCovered = covered;
          bestOrientation = orient;
        }
      }

      if (!bestOrientation || bestCovered.length === 0) break;

      result.push({ orientation: bestOrientation, covered: bestCovered });
      for (const id of bestCovered) uncovered.delete(id);
    }

    return result;
  }

  /**
   * Select best fixture face for a setup.
   */
  selectFixtureFace(surfaces: Surface[], orientation: Orientation): Surface {
    // Find surface opposite to approach direction (good for clamping)
    const candidates = surfaces.filter(s => {
      const dot =
        s.normal.x * orientation.direction.x +
        s.normal.y * orientation.direction.y +
        s.normal.z * orientation.direction.z;
      return dot < -0.5; // facing away from tool
    });

    if (candidates.length === 0) {
      // Fall back to largest surface
      return surfaces.reduce((best, s) => s.area_mm2 > best.area_mm2 ? s : best, surfaces[0]);
    }

    // Pick largest suitable surface
    return candidates.reduce((best, s) => s.area_mm2 > best.area_mm2 ? s : best, candidates[0]);
  }

  /**
   * Monte Carlo tolerance stack-up analysis.
   * Simulates datum transfer errors across setups.
   */
  monteCarloTolerance(
    datumChain: DatumChainLink[],
    samples: number,
  ): { mean_mm: number; std_mm: number; p99_mm: number } {
    if (datumChain.length === 0) return { mean_mm: 0, std_mm: 0, p99_mm: 0 };

    const results: number[] = [];
    for (let s = 0; s < samples; s++) {
      let totalError = 0;
      for (const link of datumChain) {
        // Each transfer adds normally-distributed error
        const error = this.normalRandom() * link.transfer_tolerance_mm;
        totalError += error;
      }
      results.push(Math.abs(totalError));
    }

    results.sort((a, b) => a - b);
    const mean = results.reduce((s, v) => s + v, 0) / results.length;
    const std = Math.sqrt(results.reduce((s, v) => s + (v - mean) ** 2, 0) / results.length);
    const p99Idx = Math.floor(results.length * 0.99);
    return { mean_mm: mean, std_mm: std, p99_mm: results[p99Idx] };
  }

  /**
   * Box-Muller normal random.
   */
  private normalRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Full multi-setup planning.
   */
  plan(input: MultiSetupInput): MultiSetupResult {
    const {
      surfaces,
      available_orientations = STANDARD_ORIENTATIONS,
      max_setups = 6,
      datum_transfer_tolerance_mm = 0.02,
      monte_carlo_samples = 1000,
    } = input;

    if (surfaces.length === 0) {
      return {
        setups: [], setup_count: 0, datum_chain: [],
        total_tolerance_stack_mm: 0, monte_carlo_tolerance_mm: 0,
        uncovered_surfaces: [], coverage_pct: 100,
        optimization_notes: ["No surfaces to machine"],
      };
    }

    // Greedy set cover for minimum setups
    const coverResult = this.greedySetCover(surfaces, available_orientations, max_setups);

    const surfaceMap = new Map(surfaces.map(s => [s.id, s]));

    // Build setups
    const setups: Setup[] = coverResult.map((cr, idx) => {
      const accessibleSurfaces = cr.covered.map(id => surfaceMap.get(id)!);
      const fixtureFace = this.selectFixtureFace(surfaces, cr.orientation);
      const stability = this.stabilityScore(fixtureFace, cr.orientation);

      // Find datum surface (prefer marked datums, then largest)
      const datum = accessibleSurfaces.find(s => s.is_datum)
        ?? accessibleSurfaces.reduce((best, s) => s.area_mm2 > best.area_mm2 ? s : best, accessibleSurfaces[0]);

      // Algorithm assignments
      const assignments = accessibleSurfaces.map(s => ({
        surface_id: s.id,
        algorithm: selectAlgorithm(s),
      }));

      // Estimated time (rough: 30s per surface, scaled by area)
      const time = accessibleSurfaces.reduce((s, surf) =>
        s + 30 + surf.area_mm2 / 100, 0);

      return {
        id: `setup_${idx + 1}`,
        orientation: cr.orientation,
        accessible_surfaces: cr.covered,
        fixture_face: fixtureFace.id,
        datum_id: datum?.id,
        algorithm_assignments: assignments,
        estimated_time_sec: time,
        stability_score: stability,
      };
    });

    // Build datum chain
    const datumChain: DatumChainLink[] = [];
    for (let i = 1; i < setups.length; i++) {
      datumChain.push({
        from_setup: setups[i - 1].id,
        to_setup: setups[i].id,
        datum_surface: setups[i].datum_id ?? "unknown",
        transfer_tolerance_mm: datum_transfer_tolerance_mm,
      });
    }

    // Worst-case tolerance stack (linear)
    const worstCase = datumChain.length * datum_transfer_tolerance_mm;

    // Monte Carlo tolerance (statistical)
    const mcResult = this.monteCarloTolerance(datumChain, monte_carlo_samples);

    // Coverage check
    const coveredIds = new Set(coverResult.flatMap(cr => cr.covered));
    const uncovered = surfaces.filter(s => !coveredIds.has(s.id)).map(s => s.id);
    const coverage = surfaces.length > 0
      ? (coveredIds.size / surfaces.length) * 100 : 100;

    // Notes
    const notes: string[] = [];
    if (setups.length > 3) notes.push(`${setups.length} setups needed — consider design-for-manufacturing to reduce`);
    if (uncovered.length > 0) notes.push(`${uncovered.length} surfaces inaccessible from standard orientations`);
    if (worstCase > 0.1) notes.push(`Worst-case tolerance stack ${worstCase.toFixed(3)}mm — use precision fixtures`);
    if (setups.some(s => s.stability_score < 30)) notes.push("Low stability setup detected — review fixture design");

    return {
      setups,
      setup_count: setups.length,
      datum_chain: datumChain,
      total_tolerance_stack_mm: worstCase,
      monte_carlo_tolerance_mm: mcResult.p99_mm,
      uncovered_surfaces: uncovered,
      coverage_pct: coverage,
      optimization_notes: notes,
    };
  }

  /**
   * Quick check: how many setups needed?
   */
  quickCheck(surfaces: Surface[]): { setup_count: number; coverage_pct: number } {
    const result = this.plan({ surfaces, monte_carlo_samples: 100 });
    return { setup_count: result.setup_count, coverage_pct: result.coverage_pct };
  }
}

export const multiSetupPlannerEngine = new MultiSetupPlannerEngine();
export { MultiSetupPlannerEngine };
