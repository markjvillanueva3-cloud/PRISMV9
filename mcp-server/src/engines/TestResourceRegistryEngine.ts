/**
 * TestResourceRegistryEngine — P2P-FULLSTACK-MS0/U-P2PFS58
 *
 * In-memory registry of paired "print + NC program" test fixtures,
 * organized by process family (wire_edm, sinker_edm, lathe, mill, …)
 * and tagged by customer, material, controller, operation, difficulty
 * and coverage-kind (tutorial / regression / adversarial).
 *
 * Purpose: every Print-to-Program pipeline needs a deterministic
 * harness of real-shop artifacts to regress against. Rather than
 * scattering .MIN / .DXF / .STEP files across __tests__/fixtures,
 * this engine centralizes access so:
 *
 *   - pipeline tests can pick "all D2 sinker cavities" in one call
 *   - tutorial flows can fetch a curated "known-good" subset
 *   - calibration suites can filter by difficulty tier
 *   - the web console can browse resources by process + customer
 *
 * The registry is populated at construction from a static seed plus
 * any runtime `register()` calls, so tests can add their own fixtures
 * without mutating shared global state.
 *
 * This is a *registry*, not a loader — it stores metadata + paths.
 * Actual file reads happen downstream (e.g. via WedmProgramIndexEngine
 * or lathe_cad_import engines).
 */

// ============================================================================
// TYPES
// ============================================================================

export type TestProcess =
  | "wire_edm"
  | "sinker_edm"
  | "lathe"
  | "mill"
  | "grinder"
  | "welder"
  | "laser"
  | "waterjet";

export type TestCoverage = "tutorial" | "regression" | "adversarial" | "calibration";

export type TestDifficulty = "beginner" | "intermediate" | "advanced" | "expert";

export interface TestResource {
  id: string;
  process: TestProcess;
  coverage: TestCoverage;
  difficulty: TestDifficulty;
  /** Absolute path or repo-relative path to the print/drawing. */
  print_path?: string;
  /** Absolute path or repo-relative path to the reference NC program. */
  program_path?: string;
  /** Optional STEP / IGES CAD model path. */
  cad_path?: string;
  /** Descriptive label (used in test output + UI). */
  label: string;
  /** Customer (JM Die convention: ALCOA, ITW, OPTIMAS, etc.). */
  customer?: string;
  /** Workpiece material (D2 / M2 / H13 / aluminum_6061 / …). */
  material?: string;
  /** CNC controller dialect (mitsubishi_mv / okuma_osp / fanuc_30i / …). */
  controller?: string;
  /** Primary operation performed by the NC program. */
  operation?: string;
  /** Free-form tags for flexible filtering (e.g. "thin_wall", "through_hole"). */
  tags: string[];
  /** Optional provenance note (where this fixture came from). */
  source_note?: string;
}

export interface RegisterTestResourceInput extends Omit<TestResource, "tags"> {
  tags?: string[];
}

export interface TestResourceFilter {
  process?: TestProcess;
  coverage?: TestCoverage;
  difficulty?: TestDifficulty;
  customer?: string;
  material?: string;
  controller?: string;
  operation?: string;
  tag?: string;
  /** Substring match across label + tags + customer. */
  search?: string;
}

export interface TestResourceStats {
  total: number;
  by_process: Record<TestProcess, number>;
  by_coverage: Record<TestCoverage, number>;
  by_difficulty: Record<TestDifficulty, number>;
  unique_customers: number;
  unique_materials: number;
  unique_controllers: number;
}

// ============================================================================
// SEED DATA
// ============================================================================

/**
 * Curated seed fixtures covering all 5 print-to-program pipelines that
 * now exist. Paths use posix style + the `JM DIE` archive root the
 * self-awareness engine exposes — they are metadata, not file reads.
 * Additional fixtures can be appended at runtime via .register().
 */
const SEED_RESOURCES: TestResource[] = [
  // ── Wire EDM ─────────────────────────────────────────────────────────
  {
    id: "wedm-alcoa-10-32-punch",
    process: "wire_edm",
    coverage: "regression",
    difficulty: "intermediate",
    print_path: "H:/PRISM/JM DIE/WIRE EDM/ALCOA/10-32-punch.DXF",
    program_path: "H:/PRISM/JM DIE/WIRE EDM/ALCOA/10-32-punch.WIRE",
    label: "10-32 UNC punch profile (D2, 60HRC)",
    customer: "ALCOA",
    material: "d2",
    controller: "mitsubishi_mv",
    operation: "profile_cut",
    tags: ["thread_profile", "through_cut", "4_pass"],
    source_note: "ALCOA repeat part — canonical 4-pass D2 regression",
  },
  {
    id: "wedm-itw-m5-x-10-die",
    process: "wire_edm",
    coverage: "tutorial",
    difficulty: "beginner",
    print_path: "H:/PRISM/JM DIE/WIRE EDM/ITW/m5x10-die.DXF",
    program_path: "H:/PRISM/JM DIE/WIRE EDM/ITW/m5x10-die.WIRE",
    label: "M5x10 die (basic profile)",
    customer: "ITW",
    material: "d2",
    controller: "mitsubishi_mv",
    operation: "profile_cut",
    tags: ["tutorial", "simple_profile", "2_pass"],
  },
  {
    id: "wedm-holokrome-hex-drive",
    process: "wire_edm",
    coverage: "adversarial",
    difficulty: "expert",
    print_path: "H:/PRISM/JM DIE/WIRE EDM/HOLO-KROME/hex-drive.DXF",
    program_path: "H:/PRISM/JM DIE/WIRE EDM/HOLO-KROME/hex-drive.WIRE",
    label: "1.8 mm hex-drive socket (tight corners)",
    customer: "HOLO-KROME",
    material: "carbide",
    controller: "mitsubishi_mv",
    operation: "profile_cut",
    tags: ["sharp_corners", "thin_wall", "carbide"],
    source_note: "Known wire-break scenario — corner physics regression",
  },

  // ── Sinker EDM ──────────────────────────────────────────────────────
  {
    id: "sinker-alcoa-1-4-20-cavity",
    process: "sinker_edm",
    coverage: "regression",
    difficulty: "intermediate",
    print_path: "H:/PRISM/JM DIE/SINKER EDM/ALCOA/1-4-20-cavity.DXF",
    program_path: "H:/PRISM/JM DIE/SINKER EDM/ALCOA/1-4-20-cavity.NC",
    label: "1/4-20 UNC cold-head punch cavity (D2)",
    customer: "ALCOA",
    material: "d2",
    controller: "mitsubishi_ea",
    operation: "cavity_burn",
    tags: ["cold_header", "die_cavity", "graphite_electrode"],
  },
  {
    id: "sinker-optimas-m2-relief",
    process: "sinker_edm",
    coverage: "regression",
    difficulty: "advanced",
    print_path: "H:/PRISM/JM DIE/SINKER EDM/OPTIMAS/m2-relief.DXF",
    program_path: "H:/PRISM/JM DIE/SINKER EDM/OPTIMAS/m2-relief.NC",
    label: "M2 relief pocket — Ra 0.8",
    customer: "OPTIMAS",
    material: "m2",
    controller: "mitsubishi_ea",
    operation: "pocket_burn",
    tags: ["fine_finish", "multi_electrode", "orbit"],
  },

  // ── Lathe ───────────────────────────────────────────────────────────
  {
    id: "lathe-fastenal-hex-stud",
    process: "lathe",
    coverage: "regression",
    difficulty: "intermediate",
    print_path: "H:/PRISM/JM DIE/CNC LATHE/FASTENAL/hex-stud.DXF",
    program_path: "H:/PRISM/JM DIE/CNC LATHE/FASTENAL/hex-stud.MIN",
    label: "Hex-head stud turn + thread",
    customer: "FASTENAL",
    material: "4140",
    controller: "okuma_osp",
    operation: "turn_thread",
    tags: ["threading", "chamfer", "contour"],
  },
  {
    id: "lathe-sfs-bushing-shoulder",
    process: "lathe",
    coverage: "tutorial",
    difficulty: "beginner",
    print_path: "H:/PRISM/JM DIE/CNC LATHE/SFS/bushing.DXF",
    program_path: "H:/PRISM/JM DIE/CNC LATHE/SFS/bushing.MIN",
    label: "Basic shouldered bushing",
    customer: "SFS",
    material: "aluminum_6061",
    controller: "okuma_osp",
    operation: "turn_face",
    tags: ["tutorial", "shoulder", "facing"],
  },

  // ── Mill ────────────────────────────────────────────────────────────
  {
    id: "mill-itw-pocket-plate",
    process: "mill",
    coverage: "regression",
    difficulty: "intermediate",
    print_path: "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/pocket-plate.DXF",
    program_path: "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/pocket-plate.NC",
    label: "4-pocket plate (aluminum)",
    customer: "ITW",
    material: "aluminum_6061",
    controller: "haas_ngc",
    operation: "pocket_mill",
    tags: ["adaptive_clear", "peck_drill", "contour"],
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class TestResourceRegistryEngine {
  private readonly items: Map<string, TestResource> = new Map();

  constructor(seed: TestResource[] = SEED_RESOURCES) {
    for (const r of seed) {
      this.items.set(r.id, { ...r, tags: [...r.tags] });
    }
  }

  /**
   * Register a new test resource. Throws on duplicate id.
   */
  register(input: RegisterTestResourceInput): TestResource {
    if (!input.id) throw new Error("TestResource.id is required");
    if (this.items.has(input.id)) {
      throw new Error(`TestResource id "${input.id}" already registered`);
    }
    const resource: TestResource = {
      ...input,
      tags: input.tags ? [...input.tags] : [],
    };
    this.items.set(input.id, resource);
    return resource;
  }

  /** Remove a resource by id. Returns true if it existed. */
  unregister(id: string): boolean {
    return this.items.delete(id);
  }

  /** Fetch by id. Returns undefined if not registered. */
  get(id: string): TestResource | undefined {
    const r = this.items.get(id);
    return r ? { ...r, tags: [...r.tags] } : undefined;
  }

  /** All resources (cloned). */
  list(): TestResource[] {
    return Array.from(this.items.values()).map((r) => ({ ...r, tags: [...r.tags] }));
  }

  /** Resources matching every non-undefined filter field. */
  filter(f: TestResourceFilter): TestResource[] {
    const search = f.search?.toLowerCase();
    const out: TestResource[] = [];
    for (const r of this.items.values()) {
      if (f.process && r.process !== f.process) continue;
      if (f.coverage && r.coverage !== f.coverage) continue;
      if (f.difficulty && r.difficulty !== f.difficulty) continue;
      if (f.customer && r.customer !== f.customer) continue;
      if (f.material && r.material !== f.material) continue;
      if (f.controller && r.controller !== f.controller) continue;
      if (f.operation && r.operation !== f.operation) continue;
      if (f.tag && !r.tags.includes(f.tag)) continue;
      if (search) {
        const hay = `${r.label} ${r.customer ?? ""} ${r.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }
      out.push({ ...r, tags: [...r.tags] });
    }
    return out;
  }

  /** Summary stats — mostly for UI dashboard + coverage monitor. */
  stats(): TestResourceStats {
    const byProcess: Record<TestProcess, number> = {
      wire_edm: 0, sinker_edm: 0, lathe: 0, mill: 0,
      grinder: 0, welder: 0, laser: 0, waterjet: 0,
    };
    const byCoverage: Record<TestCoverage, number> = {
      tutorial: 0, regression: 0, adversarial: 0, calibration: 0,
    };
    const byDifficulty: Record<TestDifficulty, number> = {
      beginner: 0, intermediate: 0, advanced: 0, expert: 0,
    };
    const customers = new Set<string>();
    const materials = new Set<string>();
    const controllers = new Set<string>();
    for (const r of this.items.values()) {
      byProcess[r.process]++;
      byCoverage[r.coverage]++;
      byDifficulty[r.difficulty]++;
      if (r.customer) customers.add(r.customer);
      if (r.material) materials.add(r.material);
      if (r.controller) controllers.add(r.controller);
    }
    return {
      total: this.items.size,
      by_process: byProcess,
      by_coverage: byCoverage,
      by_difficulty: byDifficulty,
      unique_customers: customers.size,
      unique_materials: materials.size,
      unique_controllers: controllers.size,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const testResourceRegistryEngine = new TestResourceRegistryEngine();
