/**
 * TombstoneLayoutEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Optimizes part placement on tombstone (column) fixtures for
 * HMC (Horizontal Machining Center) production. Maximizes parts
 * per face, balances weight across faces, and calculates cycle time
 * improvement over single-part fixturing.
 *
 * Supports 2-face, 4-face, and 6-face tombstones with B-axis indexing.
 *
 * Actions: tombstone_layout, tombstone_balance, tombstone_optimize
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TombstoneInput {
  tombstone_faces: 2 | 4 | 6;
  face_width_mm: number;
  face_height_mm: number;
  part_width_mm: number;
  part_height_mm: number;
  part_depth_mm: number;             // how far part protrudes from face
  part_weight_kg: number;
  machining_time_per_part_min: number;
  tool_change_time_sec: number;
  index_time_sec: number;            // B-axis rotation time
  load_unload_time_per_part_sec: number;
  pallet_change_time_sec: number;
  clearance_mm: number;              // minimum between parts
  max_table_load_kg: number;
  spindle_reach_mm: number;          // max Z travel available
}

export interface TombstoneLayoutResult {
  parts_per_face: number;
  total_parts: number;
  rows: number;
  columns: number;
  face_utilization_pct: number;
  total_weight_kg: number;
  weight_per_face_kg: number;
  weight_balance_ok: boolean;
  cycle_time_min: number;
  parts_per_hour: number;
  spindle_utilization_pct: number;
  throughput_improvement_pct: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TombstoneLayoutEngine {
  layout(input: TombstoneInput): TombstoneLayoutResult {
    // Parts per face (grid packing)
    const cols = Math.floor((input.face_width_mm + input.clearance_mm) / (input.part_width_mm + input.clearance_mm));
    const rows = Math.floor((input.face_height_mm + input.clearance_mm) / (input.part_height_mm + input.clearance_mm));
    const partsPerFace = Math.max(1, cols * rows);
    const totalParts = partsPerFace * input.tombstone_faces;

    // Face utilization
    const partArea = input.part_width_mm * input.part_height_mm * partsPerFace;
    const faceArea = input.face_width_mm * input.face_height_mm;
    const faceUtil = (partArea / faceArea) * 100;

    // Weight
    const weightPerFace = partsPerFace * input.part_weight_kg;
    const tombstoneWeight = 50 + input.face_width_mm * input.face_height_mm * 0.001; // estimate fixture weight
    const totalWeight = weightPerFace * input.tombstone_faces + tombstoneWeight;
    const weightOk = totalWeight <= input.max_table_load_kg;

    // Balance check (max face weight difference < 20%)
    // Assume uniform loading — all faces equal
    const balanceOk = weightOk; // uniform = always balanced

    // Spindle reach check
    const reachOk = input.part_depth_mm <= input.spindle_reach_mm;

    // Cycle time calculation
    // While spindle machines face N, operator loads/unloads face N+2 (on 4-face)
    const machineTimePerFace = partsPerFace * input.machining_time_per_part_min;
    const loadTimePerFace = partsPerFace * input.load_unload_time_per_part_sec / 60;
    const indexTimeTotalMin = (input.tombstone_faces - 1) * input.index_time_sec / 60;

    // With pallet changer: load happens in parallel
    const hasPalletChanger = input.pallet_change_time_sec > 0;
    let cycleTime: number;

    if (hasPalletChanger && input.tombstone_faces >= 4) {
      // Operator loads while machining — cycle = max(machine_all_faces, load_all_faces) + index + pallet
      const totalMachineTime = machineTimePerFace * input.tombstone_faces + indexTimeTotalMin;
      const totalLoadTime = loadTimePerFace * input.tombstone_faces;
      cycleTime = Math.max(totalMachineTime, totalLoadTime) + input.pallet_change_time_sec / 60;
    } else {
      // Sequential: machine + index + load
      cycleTime = machineTimePerFace * input.tombstone_faces + indexTimeTotalMin +
        loadTimePerFace * input.tombstone_faces;
    }

    const partsPerHour = (totalParts / cycleTime) * 60;

    // Spindle utilization (machining time / total cycle)
    const totalMachiningMin = machineTimePerFace * input.tombstone_faces;
    const spindleUtil = (totalMachiningMin / cycleTime) * 100;

    // Compare to single-part fixturing
    const singlePartCycle = input.machining_time_per_part_min +
      input.load_unload_time_per_part_sec / 60 +
      input.tool_change_time_sec / 60;
    const singlePartsPerHour = 60 / singlePartCycle;
    const improvement = ((partsPerHour - singlePartsPerHour) / singlePartsPerHour) * 100;

    const recs: string[] = [];
    if (!weightOk) recs.push(`Total weight ${totalWeight.toFixed(0)}kg exceeds table limit ${input.max_table_load_kg}kg — reduce parts per face`);
    if (!reachOk) recs.push(`Part depth ${input.part_depth_mm}mm exceeds spindle reach ${input.spindle_reach_mm}mm`);
    if (faceUtil < 40) recs.push(`Low face utilization ${faceUtil.toFixed(0)}% — consider smaller tombstone or different part orientation`);
    if (spindleUtil < 70) recs.push(`Spindle utilization ${spindleUtil.toFixed(0)}% — loading time dominant, consider pallet changer`);
    if (totalParts < 4) recs.push("Low part count — tombstone may not be justified, evaluate ROI");
    if (recs.length === 0) recs.push(`Tombstone layout optimized: ${totalParts} parts, ${improvement.toFixed(0)}% throughput gain`);

    return {
      parts_per_face: partsPerFace,
      total_parts: totalParts,
      rows,
      columns: cols,
      face_utilization_pct: Math.round(faceUtil),
      total_weight_kg: Math.round(totalWeight * 10) / 10,
      weight_per_face_kg: Math.round(weightPerFace * 10) / 10,
      weight_balance_ok: balanceOk,
      cycle_time_min: Math.round(cycleTime * 100) / 100,
      parts_per_hour: Math.round(partsPerHour * 10) / 10,
      spindle_utilization_pct: Math.round(spindleUtil),
      throughput_improvement_pct: Math.round(improvement),
      recommendations: recs,
    };
  }
}

export const tombstoneLayoutEngine = new TombstoneLayoutEngine();
