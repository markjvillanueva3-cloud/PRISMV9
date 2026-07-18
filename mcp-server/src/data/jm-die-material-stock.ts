/**
 * jm-die-material-stock.ts — JM Die wire-EDM INVENTORY SEED + availability gate.
 *
 * Phase B of the print->program pipeline (WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §3).
 * Recon 2026-05-31 found MaterialStockEngine has ZERO JM data and ShopConfiguration's
 * wedm_wire_inventory carries only placeholder remaining_pct. This seed gives the
 * inventory-driven pipeline real JM raw-stock + wire-spool records, and the gate
 * (`checkStockForJob`) answers "can JM cut this part TODAY?" — the core of
 * auto-generating programs from JM inventory.
 *
 * Seed values are JM-shop-plausible starting state; the LIVE path updates them via
 * PurchaseOrderEngine `purchase_order_receive` / `wedm_wire_spool_consumption` /
 * MaterialStockEngine.adjust. Treat as the schema + initial snapshot, not a frozen oracle.
 *
 * @module data/jm-die-material-stock
 */

export type StockStatus = "ok" | "low" | "out_of_stock";

export interface WireSpoolStock {
  wire_type: string;
  diameter_mm: number;
  spool_weight_kg: number;
  remaining_length_m: number;
  remaining_pct: number;
  supplier: string;
  cost_per_m_usd: number;
  min_length_m: number; // reorder trigger
  applications: string[];
}

export interface RawMaterialStock {
  material: string;
  form: "plate" | "block" | "bar";
  dims_mm: { x: number; y: number; thickness: number };
  quantity_on_hand: number;
  supplier: string;
  unit_cost_usd: number;
  min_quantity: number;
}

/** On-hand wire spools (FA-10S, from ShopConfigurationEngine.wedm_wire_inventory + computed lengths). */
export const JM_DIE_WIRE_STOCK: WireSpoolStock[] = [
  {
    wire_type: "MD+ Pro II", diameter_mm: 0.25, spool_weight_kg: 10, remaining_length_m: 24000, remaining_pct: 100,
    supplier: "Bedra", cost_per_m_usd: 0.02, min_length_m: 2000, applications: ["general", "tool-steel", "coated-WC"],
  },
  {
    wire_type: "MV1200S", diameter_mm: 0.20, spool_weight_kg: 5, remaining_length_m: 18700, remaining_pct: 100,
    supplier: "Mitsubishi", cost_per_m_usd: 0.028, min_length_m: 1500, applications: ["fine-detail", "tight-tol", "thin"],
  },
];

/** On-hand raw tool-steel stock (JM Die cuts dies; D2/A2/S7/M2 dominant per tech-tables). */
export const JM_DIE_RAW_STOCK: RawMaterialStock[] = [
  { material: "D2", form: "plate", dims_mm: { x: 305, y: 305, thickness: 25.4 }, quantity_on_hand: 6, supplier: "Crucible", unit_cost_usd: 180, min_quantity: 2 },
  { material: "D2", form: "plate", dims_mm: { x: 305, y: 305, thickness: 50.8 }, quantity_on_hand: 3, supplier: "Crucible", unit_cost_usd: 340, min_quantity: 1 },
  { material: "A2", form: "plate", dims_mm: { x: 305, y: 305, thickness: 25.4 }, quantity_on_hand: 4, supplier: "Crucible", unit_cost_usd: 165, min_quantity: 2 },
  { material: "S7", form: "block", dims_mm: { x: 152, y: 152, thickness: 76.2 }, quantity_on_hand: 2, supplier: "Finkl", unit_cost_usd: 420, min_quantity: 1 },
  { material: "M2", form: "plate", dims_mm: { x: 305, y: 152, thickness: 19.05 }, quantity_on_hand: 1, supplier: "Crucible", unit_cost_usd: 210, min_quantity: 1 },
];

function statusFor(onHand: number, min: number): StockStatus {
  if (onHand <= 0) return "out_of_stock";
  if (onHand <= min) return "low";
  return "ok";
}

/** Available wire diameters on hand (length above the reorder floor). */
export function availableWireDiameters(stock: WireSpoolStock[] = JM_DIE_WIRE_STOCK): number[] {
  return stock.filter((w) => w.remaining_length_m > w.min_length_m).map((w) => w.diameter_mm);
}

/**
 * INVENTORY GATE — "can JM cut this part TODAY?" Pure: checks the requested wire
 * diameter is on-hand with enough length, and a raw blank of the material fits the
 * part envelope. Returns availability + blockers + suggested purchase orders.
 */
export function checkStockForJob(
  job: { material?: string; wire_diameter_mm?: number; part_x_mm?: number; part_y_mm?: number; thickness_mm?: number; wire_length_needed_m?: number },
  stock: { wire?: WireSpoolStock[]; raw?: RawMaterialStock[] } = {},
): { can_cut: boolean; blockers: string[]; suggested_po: string[]; matched_wire?: WireSpoolStock; matched_blank?: RawMaterialStock } {
  const wireStock = stock.wire ?? JM_DIE_WIRE_STOCK;
  const rawStock = stock.raw ?? JM_DIE_RAW_STOCK;
  const blockers: string[] = [];
  const suggested_po: string[] = [];

  // 1. Wire availability
  let matched_wire: WireSpoolStock | undefined;
  if (typeof job.wire_diameter_mm === "number") {
    matched_wire = wireStock.find((w) => w.diameter_mm === job.wire_diameter_mm);
    if (!matched_wire) {
      blockers.push("wire " + job.wire_diameter_mm + "mm not stocked");
      suggested_po.push("PO: order " + job.wire_diameter_mm + "mm wire spool");
    } else {
      const need = typeof job.wire_length_needed_m === "number" ? job.wire_length_needed_m : 0;
      if (matched_wire.remaining_length_m - need <= matched_wire.min_length_m) {
        blockers.push("wire " + job.wire_diameter_mm + "mm below reorder floor after this job (" + matched_wire.remaining_length_m + "m on hand, need " + need + "m)");
        suggested_po.push("PO: reorder " + matched_wire.wire_type + " (" + matched_wire.supplier + ")");
      }
    }
  }

  // 2. Raw blank availability (material + dims fit)
  let matched_blank: RawMaterialStock | undefined;
  if (job.material) {
    const candidates = rawStock.filter((r) => r.material.toUpperCase() === String(job.material).toUpperCase());
    if (candidates.length === 0) {
      blockers.push(job.material + " raw stock not on hand");
      suggested_po.push("PO: order " + job.material + " blank");
    } else {
      matched_blank = candidates.find((r) => {
        const fitsXY = (job.part_x_mm == null || r.dims_mm.x >= job.part_x_mm) && (job.part_y_mm == null || r.dims_mm.y >= job.part_y_mm);
        const fitsThk = job.thickness_mm == null || r.dims_mm.thickness >= job.thickness_mm;
        return fitsXY && fitsThk && statusFor(r.quantity_on_hand, r.min_quantity) !== "out_of_stock";
      });
      if (!matched_blank) {
        blockers.push(job.material + " on hand but no blank fits part (x" + job.part_x_mm + " y" + job.part_y_mm + " t" + job.thickness_mm + ")");
        suggested_po.push("PO: order larger " + job.material + " blank");
      }
    }
  }

  return { can_cut: blockers.length === 0, blockers, suggested_po, matched_wire, matched_blank };
}
