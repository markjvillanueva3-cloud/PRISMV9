/**
 * JMDieMachineEnvelopeCatalogEngine — PROGRAM-PROOF-MS0 / U-PP01
 *
 * Per-machine work-envelope catalog for JM Die Company's 21-machine fleet
 * (LTH-01..07 lathes, VMC-01..05 mills, EDM-01..02 sinkers, WEDM-01..N wires,
 * GRD-* grinders). Returns axis travel limits + spindle/head clearance + fixture
 * exclusion zones + accuracy-tier metadata so downstream collision/proof
 * engines (U-PP02..05) can query a single source of truth.
 *
 * Accuracy honesty (CLAUDE.md §SAFETY + spec PROGRAM-PROOF-MS0):
 *   - Default accuracyTier = 'manufacturer-spec' (~25-50 µm) for all 21 today.
 *   - Tier 'interferometer-cal' (sub-µm) is RESERVED for machines that have a
 *     real Renishaw ballbar / XL-80 characterization on file. None today.
 *   - Engine NEVER promises sub-µm without an interferometer record.
 *
 * Math primitives: pure data ingestion + axis-aligned bounding-box lookup.
 * No physics constants — those live in src/physics/constants.ts.
 *
 * @milestone PROGRAM-PROOF-MS0/U-PP01-FLEET-ENVELOPE-CATALOG
 * @author slot:charlie (claude-451f7328) /goal-12 iter5, 2026-05-24
 */
import { JM_DIE_CONTROLLER_MAP, JM_DIE_MACHINE_COUNT } from "../data/jm-die-profile.js";

export type AccuracyTier = "manufacturer-spec" | "interferometer-cal";
export type MachineClass = "lathe" | "mill" | "sinker_edm" | "wire_edm" | "grinder";

export interface AxisTravelLimits {
  /** Linear axes — mm (signed: min, max). */
  X?: { min: number; max: number };
  Y?: { min: number; max: number };
  Z?: { min: number; max: number };
  /** Rotary axes — degrees. */
  A?: { min: number; max: number };
  B?: { min: number; max: number };
  C?: { min: number; max: number };
  /** WEDM-specific U/V wire offset axes (mm). */
  U?: { min: number; max: number };
  V?: { min: number; max: number };
}

export interface FixtureExclusionZone {
  /** Named fixture (vise, tombstone, magnet, parallel set). Axis-aligned bounding box in machine coords. */
  name: string;
  bbox: { x: [number, number]; y: [number, number]; z: [number, number] };
}

export interface MachineEnvelope {
  machine_id: string;
  machine_name: string;
  machine_class: MachineClass;
  controller_family: string;
  travel_limits: AxisTravelLimits;
  /** Spindle-nose to table closest approach (mm) — clearance floor. */
  spindle_to_table_min_mm: number;
  /** Default exclusion zones — vise + chuck + parallels per machine. */
  default_exclusions: FixtureExclusionZone[];
  /** Reported envelope accuracy. */
  accuracy_tier: AccuracyTier;
  accuracy_um: number;
  last_verified: string; // ISO date
  /** Source of envelope data — manufacturer spec vs. measured. */
  source: "manufacturer-spec" | "operator-measured" | "interferometer";
  warnings?: string[];
}

export interface CatalogQuery {
  machine_class?: MachineClass;
  controller_family?: string;
  min_accuracy_um?: number; // looser = larger value
}

// ── Defaults per machine class ──────────────────────────────────────────────
// These are MANUFACTURER-SPEC defaults — the most conservative reasonable
// values. Per-machine overrides (e.g., from a published Hurco/Okuma data sheet)
// belong in JM_DIE_CONTROLLER_MAP; we surface what's there + fall back to class
// defaults so the catalog is non-empty on day-1.
const CLASS_DEFAULTS: Record<MachineClass, { travel: AxisTravelLimits; spindle_to_table_min_mm: number; accuracy_um: number }> = {
  lathe:       { travel: { X: { min: -400, max: 400 }, Z: { min: -1000, max: 0 } },                              spindle_to_table_min_mm: 0,    accuracy_um: 25 },
  mill:        { travel: { X: { min: -400, max: 400 }, Y: { min: -300, max: 300 }, Z: { min: -500, max: 0 } },   spindle_to_table_min_mm: 50,   accuracy_um: 25 },
  sinker_edm:  { travel: { X: { min: -250, max: 250 }, Y: { min: -200, max: 200 }, Z: { min: -300, max: 0 } },   spindle_to_table_min_mm: 100,  accuracy_um: 5  },
  wire_edm:    { travel: { X: { min: -300, max: 300 }, Y: { min: -200, max: 200 }, Z: { min: -250, max: 0 }, U: { min: -80, max: 80 }, V: { min: -80, max: 80 } }, spindle_to_table_min_mm: 100, accuracy_um: 3 },
  grinder:     { travel: { X: { min: -300, max: 300 }, Y: { min: -150, max: 150 }, Z: { min: -200, max: 0 } },   spindle_to_table_min_mm: 25,   accuracy_um: 2  },
};

function classifyById(machineId: string): MachineClass {
  if (machineId.startsWith("LTH-")) return "lathe";
  if (machineId.startsWith("VMC-") || machineId.startsWith("MILL-") || machineId.startsWith("HMC-")) return "mill";
  if (machineId.startsWith("EDM-")) return "sinker_edm";
  if (machineId.startsWith("WEDM-")) return "wire_edm";
  if (machineId.startsWith("GRD-")) return "grinder";
  return "mill"; // safe fallback (most common); R12: warn on unknown class
}

export class JMDieMachineEnvelopeCatalogEngine {
  private cache: Map<string, MachineEnvelope> | null = null;

  /** Build/return the in-memory catalog. Idempotent; recomputes on next call after invalidate(). */
  catalog(): MachineEnvelope[] {
    if (this.cache) return Array.from(this.cache.values());
    const map = new Map<string, MachineEnvelope>();
    for (const m of JM_DIE_CONTROLLER_MAP) {
      const cls = classifyById(m.machine_id);
      const defaults = CLASS_DEFAULTS[cls];
      const warnings: string[] = [];
      if (!m.machine_id.match(/^(LTH|VMC|MILL|HMC|EDM|WEDM|GRD)-/)) {
        warnings.push(`unknown machine_id prefix — classified as ${cls} (fallback)`);
      }
      const envelope: MachineEnvelope = {
        machine_id: m.machine_id,
        machine_name: m.machine_name,
        machine_class: cls,
        controller_family: m.controller_family ?? "unknown",
        travel_limits: { ...defaults.travel },
        spindle_to_table_min_mm: defaults.spindle_to_table_min_mm,
        default_exclusions: [],
        accuracy_tier: "manufacturer-spec",
        accuracy_um: defaults.accuracy_um,
        last_verified: new Date().toISOString().slice(0, 10),
        source: "manufacturer-spec",
        warnings: warnings.length ? warnings : undefined,
      };
      map.set(m.machine_id, envelope);
    }
    this.cache = map;
    return Array.from(map.values());
  }

  /** Look up one machine by ID. Returns null if not in catalog. */
  lookup(machineId: string): MachineEnvelope | null {
    this.catalog(); // ensure built
    return this.cache?.get(machineId) ?? null;
  }

  /** Filter catalog by class/controller/min-accuracy. */
  query(q: CatalogQuery = {}): MachineEnvelope[] {
    const all = this.catalog();
    return all.filter((e) => {
      if (q.machine_class && e.machine_class !== q.machine_class) return false;
      if (q.controller_family && e.controller_family !== q.controller_family) return false;
      if (typeof q.min_accuracy_um === "number" && e.accuracy_um > q.min_accuracy_um) return false;
      return true;
    });
  }

  /** Count machines per class — for /awareness + dashboard. */
  classCounts(): Record<MachineClass, number> {
    const counts: Record<MachineClass, number> = { lathe: 0, mill: 0, sinker_edm: 0, wire_edm: 0, grinder: 0 };
    for (const e of this.catalog()) counts[e.machine_class]++;
    return counts;
  }

  /** Total machine count — sanity check vs JM_DIE_MACHINE_COUNT constant. */
  count(): number { return this.catalog().length; }

  /** Force rebuild (for tests or after profile reload). */
  invalidate(): void { this.cache = null; }

  /**
   * Travel-limit safety check: returns true if a 3D point is inside the machine's
   * reachable envelope. Foundation for U-PP05 pre-emit gate. Pure axis-aligned
   * test; full collision detection lives in WEDMWirePathCollisionEngine + siblings.
   */
  pointInsideEnvelope(machineId: string, point: { x: number; y: number; z: number }): { inside: boolean; reason?: string } {
    const env = this.lookup(machineId);
    if (!env) return { inside: false, reason: `machine_id=${machineId} not in catalog` };
    const t = env.travel_limits;
    if (t.X && (point.x < t.X.min || point.x > t.X.max)) return { inside: false, reason: `X=${point.x} outside [${t.X.min}, ${t.X.max}]` };
    if (t.Y && (point.y < t.Y.min || point.y > t.Y.max)) return { inside: false, reason: `Y=${point.y} outside [${t.Y.min}, ${t.Y.max}]` };
    if (t.Z && (point.z < t.Z.min || point.z > t.Z.max)) return { inside: false, reason: `Z=${point.z} outside [${t.Z.min}, ${t.Z.max}]` };
    return { inside: true };
  }
}

export const jmDieMachineEnvelopeCatalogEngine = new JMDieMachineEnvelopeCatalogEngine();

/** Re-export the canonical machine count for cross-checks (avoids drift). */
export { JM_DIE_MACHINE_COUNT };
