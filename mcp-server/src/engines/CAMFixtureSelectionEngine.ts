/**
 * CAMFixtureSelectionEngine — CAM-AI-TRAINING-MS0/U-CAMT-FIXTURE
 *
 * Given a stock geometry (bbox + shape) + machine class + op family,
 * recommend the right workholding: precision vise / 3-jaw chuck /
 * 4-jaw chuck / collet-block / magnetic-plate / vacuum-table /
 * tombstone / soft-jaws / sub-plate.
 *
 * Pure logic. Inventory may be passed in for selection; if absent, the
 * engine returns the IDEAL fixture spec to procure.
 *
 * Fixture catalog ranges (vise jaw widths, chuck swing diameters) are
 * standard industry sizes — not fabricated geometry.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camOperationTaxonomyEngine, type CamOperation } from "./CAMOperationTaxonomyEngine.js";
import type { MachineClass } from "./CAMMachineSelectionEngine.js";

export type FixtureFamily =
  | "vise_precision"     // Kurt-style precision vise (6"/8" jaw common)
  | "vise_double"        // double-station vise (2x small parts)
  | "soft_jaws"          // machinable soft jaws on a vise
  | "chuck_3jaw"         // 3-jaw self-centering (turning)
  | "chuck_4jaw"         // 4-jaw independent (turning, off-center)
  | "chuck_collet"       // collet chuck (small turning)
  | "collet_block"       // 5C / R8 collet block (mill prismatic small)
  | "magnetic_plate"     // ferrous flat parts
  | "vacuum_table"       // composite / large flat / thin
  | "tombstone"          // hmc / 5-axis multi-part
  | "trunnion_table"     // 5-axis rotary table
  | "sub_plate"          // pallet-style sub plate with grid taps
  | "rotary_4th"         // 4-axis rotary attachment
  | "wedm_jig"           // wire-edm fixture
  | "edge_clamps"        // toe clamps on a face mill
  | "self_centering_4jaw"; // semi-precision turning

export type StockShape =
  | "rectangular_block"
  | "round_bar"
  | "tube"
  | "thin_plate"
  | "casting_near_net"
  | "composite_plate"
  | "irregular";

export interface StockGeometry {
  shape: StockShape;
  /** Bounding box in mm, all 3 axes. */
  bbox: { x: number; y: number; z: number };
  /** Optional — when known, ferrous material is required for magnetic_plate. */
  ferrous?: boolean;
}

export interface FixtureSpec {
  family: FixtureFamily;
  /** Mm — max part length/diameter the fixture comfortably holds. */
  capacityMm: number;
  /** Mm — minimum part dimension. */
  minSizeMm: number;
  rationale: string;
}

export interface ShopFixtureEntry {
  id: string;
  family: FixtureFamily;
  capacityMm: number;
  minSizeMm: number;
  busy?: boolean;
}

export interface FixtureSelection {
  bestFixtureId: string | null;
  /** When best is null, recommendedSpec is the fixture to procure / set up. */
  recommendedSpec: FixtureSpec | null;
  candidates: Array<{
    fixtureId: string;
    score: number;
    reason: string;
  }>;
}

const TURNING_CLASSES: ReadonlyArray<MachineClass> = ["lathe", "mill_turn"];

export class CAMFixtureSelectionEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMFixtureSelectionEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Picks the right workholding (vise / chuck / vacuum / tombstone) for a (stock, op, machine) triple.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "recommend",  description: "Recommend ideal fixture spec",       actions: ["cam_fixture_recommend"] },
      { name: "select",     description: "Pick fixture from shop inventory",   actions: ["cam_fixture_select"] },
      { name: "families",   description: "List FixtureFamily enum",            actions: ["cam_fixture_families"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMFixtureSelectionEngine", note: "use typed methods" };
  }

  /** Recommend ideal fixture for (stock, op, machineClass). */
  recommend(stock: StockGeometry, op: CamOperation, machineClass: MachineClass): FixtureSpec | null {
    const spec = camOperationTaxonomyEngine.getSpec(op);
    if (!spec) return null;
    const isTurning = TURNING_CLASSES.includes(machineClass);
    const isWedm = machineClass === "wire_edm";
    const isHmc = machineClass === "hmc";
    const is5axis = machineClass === "vmc_5axis";

    // Wire EDM — dedicated jig
    if (isWedm) {
      return {
        family: "wedm_jig",
        capacityMm: 400,
        minSizeMm: 2,
        rationale: "wire-edm requires dedicated jig (clamp from above; submerged)",
      };
    }

    // Turning machines
    if (isTurning) {
      // For round bar, diameter = max(x, y) — NOT z (which is bar length).
      const diameter = stock.shape === "round_bar"
        ? Math.max(stock.bbox.x, stock.bbox.y)
        : Math.max(stock.bbox.x, stock.bbox.y, stock.bbox.z);
      if (stock.shape === "round_bar" && diameter <= 50) {
        return { family: "chuck_collet", capacityMm: 50, minSizeMm: 3, rationale: "round bar ≤50mm fits collet — best concentricity" };
      }
      if (stock.shape === "round_bar") {
        return { family: "chuck_3jaw", capacityMm: 400, minSizeMm: 6, rationale: "round bar — 3-jaw self-centering is the standard" };
      }
      if (stock.shape === "casting_near_net" || stock.shape === "irregular") {
        return { family: "chuck_4jaw", capacityMm: 400, minSizeMm: 10, rationale: "casting / irregular — 4-jaw independent for off-center setup" };
      }
      return { family: "chuck_3jaw", capacityMm: 400, minSizeMm: 6, rationale: "default turning — 3-jaw" };
    }

    // 5-axis trunnion preferred
    if (is5axis) {
      return { family: "trunnion_table", capacityMm: 400, minSizeMm: 5, rationale: "5-axis — trunnion table for full A/C tilt" };
    }

    // HMC tombstone for multi-part
    if (isHmc) {
      return { family: "tombstone", capacityMm: 600, minSizeMm: 20, rationale: "hmc — tombstone enables 4-side multi-part" };
    }

    // Milling — by stock shape
    if (stock.shape === "thin_plate" || stock.shape === "composite_plate") {
      return { family: "vacuum_table", capacityMm: 1000, minSizeMm: 50, rationale: "thin / composite plate — vacuum table avoids clamp deflection" };
    }
    if (stock.shape === "thin_plate" && stock.ferrous) {
      return { family: "magnetic_plate", capacityMm: 1000, minSizeMm: 50, rationale: "ferrous thin plate — magnetic chuck (no clamps)" };
    }
    const maxXY = Math.max(stock.bbox.x, stock.bbox.y);
    if (maxXY <= 100 && stock.shape === "rectangular_block") {
      return { family: "vise_precision", capacityMm: 150, minSizeMm: 5, rationale: "small rectangular block — 6\" precision vise" };
    }
    if (maxXY <= 200 && stock.shape === "rectangular_block") {
      return { family: "vise_precision", capacityMm: 200, minSizeMm: 5, rationale: "medium block — 8\" precision vise" };
    }
    if (maxXY > 400) {
      return { family: "edge_clamps", capacityMm: 2000, minSizeMm: 100, rationale: "large block — edge / toe clamps on sub-plate" };
    }
    return { family: "vise_precision", capacityMm: 250, minSizeMm: 5, rationale: "default milling — precision vise" };
  }

  /** Pick best fixture from shop inventory. */
  select(
    stock: StockGeometry,
    op: CamOperation,
    machineClass: MachineClass,
    inventory: ReadonlyArray<ShopFixtureEntry>,
  ): FixtureSelection {
    const ideal = this.recommend(stock, op, machineClass);
    if (!ideal) return { bestFixtureId: null, recommendedSpec: null, candidates: [] };
    const maxDim = Math.max(stock.bbox.x, stock.bbox.y, stock.bbox.z);
    const candidates = inventory.map((f) => {
      let score = 0;
      const reasons: string[] = [];
      if (f.family === ideal.family) {
        score += 10;
        reasons.push("family-match");
      }
      if (maxDim >= f.minSizeMm && maxDim <= f.capacityMm) {
        score += 5;
        reasons.push("size-fits");
      }
      if (maxDim > f.capacityMm) {
        score -= 10;
        reasons.push("over-capacity");
      }
      if (!f.busy) {
        score += 2;
        reasons.push("available");
      }
      return { fixtureId: f.id, score, reason: reasons.length > 0 ? reasons.join(",") : "no-match" };
    }).sort((a, b) => b.score - a.score);
    const best = candidates.find((c) => c.reason.includes("family-match") && c.reason.includes("size-fits")) ?? null;
    return {
      bestFixtureId: best?.fixtureId ?? null,
      recommendedSpec: best ? null : ideal,
      candidates,
    };
  }

  /** All 16 documented FixtureFamily values. */
  families(): ReadonlyArray<FixtureFamily> {
    return [
      "vise_precision", "vise_double", "soft_jaws",
      "chuck_3jaw", "chuck_4jaw", "chuck_collet", "self_centering_4jaw",
      "collet_block", "magnetic_plate", "vacuum_table",
      "tombstone", "trunnion_table", "sub_plate", "rotary_4th",
      "wedm_jig", "edge_clamps",
    ];
  }
}

export const camFixtureSelectionEngine = new CAMFixtureSelectionEngine();
