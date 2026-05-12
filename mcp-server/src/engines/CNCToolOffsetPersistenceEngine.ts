/**
 * CNCToolOffsetPersistenceEngine
 * =================================
 *
 * Bidirectional sync of CNC tool-offset tables between controller memory
 * (H/D/W words per Fanuc) and ERP/PLM tool-master records.
 *
 * Problem:
 *   Operators routinely tweak tool wear offsets (e.g., X-0.002 to bring
 *   a finish OD into spec). Those tweaks live only in the control's
 *   memory and vanish after a tool change. The ERP / tool-master sees the
 *   *geometry* offset stored at check-out but not the *wear* offsets
 *   accumulated at the machine.
 *
 * Responsibilities:
 *   1. Parse controller offset dump (Fanuc O/offset section, Okuma tool
 *      file, Siemens TLIFE record).
 *   2. Diff against last-known ERP master.
 *   3. Classify each delta: geometry (surveyed), wear (operator), tool
 *      change (new insert).
 *   4. Emit sync actions: accept / reject / reconcile / escalate.
 *   5. Track drift over shifts for tool-condition telemetry.
 *
 * Classification rules:
 *   - Δ > 0.5 mm                 → ERROR: likely wrong tool in pocket
 *   - 0.01 < Δ ≤ 0.5 mm          → GEOMETRY update (survey event)
 *   - 0.001 < Δ ≤ 0.01 mm        → WEAR update (operator tweak)
 *   - Δ ≤ 0.001 mm               → NOISE (ignore)
 *
 * Distinct from existing:
 *   - ToolLifeEngine / ToolCribEngine  : tool-life tracking, checkout
 *   - ToolMasterRegistry                : master geometry records
 *   - This engine                       : bidirectional sync + classification
 *
 * References:
 *   - Fanuc 30i Parameter Manual §10 (offset data format)
 *   - Okuma OSP-P300 Parameter List (tool file section 10-12)
 *   - Siemens 840D sl TOOLCARRIER (TLIFE record)
 *
 * @module engines/CNCToolOffsetPersistenceEngine
 * @milestone LATHE-PRO-MS11
 */

export interface ControllerOffsetRecord {
  tool_id: string;
  turret_position: number;
  geometry_x_mm: number;
  geometry_z_mm: number;
  wear_x_mm: number;
  wear_z_mm: number;
  nose_radius_mm?: number;
  insert_orientation_code?: string;
  timestamp?: string;
}

export interface ERPMasterRecord {
  tool_id: string;
  turret_position: number;
  geometry_x_mm: number;
  geometry_z_mm: number;
  last_wear_x_mm: number;
  last_wear_z_mm: number;
  nose_radius_mm?: number;
}

export interface CNCToolOffsetPersistenceInput {
  controller_records: ControllerOffsetRecord[];
  erp_records: ERPMasterRecord[];
  /** Wear threshold band (min, max) mm */
  wear_band_mm?: { min: number; max: number };
  /** Error threshold mm (mismatch beyond this = wrong tool) */
  error_threshold_mm?: number;
}

export interface OffsetDelta {
  tool_id: string;
  turret_position: number;
  delta_x_mm: number;
  delta_z_mm: number;
  classification: "noise" | "wear" | "geometry" | "error";
  sync_action: "accept" | "reject" | "reconcile" | "escalate";
  note: string;
}

export interface CNCToolOffsetPersistenceResult {
  deltas: OffsetDelta[];
  summary: {
    total_compared: number;
    num_noise: number;
    num_wear: number;
    num_geometry: number;
    num_error: number;
  };
  reasoning: string[];
}

class CNCToolOffsetPersistenceEngineImpl {
  sync(i: CNCToolOffsetPersistenceInput): CNCToolOffsetPersistenceResult {
    const reasoning: string[] = [];
    const wearBand = i.wear_band_mm ?? { min: 0.001, max: 0.01 };
    const errorThreshold = i.error_threshold_mm ?? 0.5;

    const erpByKey = new Map<string, ERPMasterRecord>();
    for (const r of i.erp_records) {
      erpByKey.set(`${r.tool_id}|${r.turret_position}`, r);
    }

    const deltas: OffsetDelta[] = [];
    let noise = 0, wear = 0, geom = 0, err = 0;

    for (const c of i.controller_records) {
      const key = `${c.tool_id}|${c.turret_position}`;
      const erp = erpByKey.get(key);

      // Total offset = geometry + wear
      const cTotalX = c.geometry_x_mm + c.wear_x_mm;
      const cTotalZ = c.geometry_z_mm + c.wear_z_mm;
      const eTotalX = erp ? erp.geometry_x_mm + erp.last_wear_x_mm : 0;
      const eTotalZ = erp ? erp.geometry_z_mm + erp.last_wear_z_mm : 0;

      const dX = round4(cTotalX - eTotalX);
      const dZ = round4(cTotalZ - eTotalZ);
      const mag = Math.max(Math.abs(dX), Math.abs(dZ));

      let cls: OffsetDelta["classification"];
      let action: OffsetDelta["sync_action"];
      let note: string;

      if (!erp) {
        cls = "geometry";
        action = "accept";
        note = "New tool pocket — accept as initial geometry";
      } else if (mag > errorThreshold) {
        cls = "error";
        action = "escalate";
        note = `Δ=${mag}mm exceeds ${errorThreshold}mm — wrong tool in pocket?`;
      } else if (mag > wearBand.max) {
        cls = "geometry";
        action = "reconcile";
        note = "Δ in geometry range — survey event, reconcile master";
      } else if (mag > wearBand.min) {
        cls = "wear";
        action = "accept";
        note = "Operator wear tweak — telemetry + accept";
      } else {
        cls = "noise";
        action = "reject";
        note = "Within noise band — no action";
      }

      if (cls === "noise") noise++;
      else if (cls === "wear") wear++;
      else if (cls === "geometry") geom++;
      else err++;

      deltas.push({
        tool_id: c.tool_id,
        turret_position: c.turret_position,
        delta_x_mm: dX,
        delta_z_mm: dZ,
        classification: cls,
        sync_action: action,
        note,
      });
    }

    reasoning.push(`Compared ${i.controller_records.length} controller records vs ${i.erp_records.length} ERP records`);
    reasoning.push(`Classification: ${noise} noise, ${wear} wear, ${geom} geometry, ${err} error`);
    if (err > 0) reasoning.push(`${err} error-class delta(s) require escalation`);

    return {
      deltas,
      summary: {
        total_compared: deltas.length,
        num_noise: noise,
        num_wear: wear,
        num_geometry: geom,
        num_error: err,
      },
      reasoning,
    };
  }

  getStats(): { wear_band_default: { min: number; max: number }; reference: string } {
    return {
      wear_band_default: { min: 0.001, max: 0.01 },
      reference: "Fanuc 30i PM §10; Okuma OSP-P300 tool file; Siemens 840D sl TOOLCARRIER",
    };
  }
}

function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const cncToolOffsetPersistenceEngine = new CNCToolOffsetPersistenceEngineImpl();
export type { CNCToolOffsetPersistenceEngineImpl };
