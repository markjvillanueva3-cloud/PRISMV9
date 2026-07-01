/**
 * ToolMagazineOptimizationEngine — CNC tool magazine layout & change optimization
 *
 * Models: Tool change time minimization (TSP-based sequencing), magazine slot assignment,
 *         sister tool strategy, tool life tracking, magazine capacity planning.
 * References: Grieco et al. (tool indexing), Dereli & Filiz (magazine optimization),
 *             ISO 13399 (cutting tool data)
 */

export type MagazineType = "disc" | "chain" | "rack" | "turret" | "wheel" | "matrix";
export type ToolChangeStrategy = "nearest_slot" | "pre_position" | "sister_tool" | "life_balanced" | "minimum_index";

export interface ToolMagazineInput {
  magazine_type?: MagazineType;
  total_slots?: number;
  tools_required?: number;
  tool_change_time_s?: number;
  index_time_per_slot_s?: number;
  strategy?: ToolChangeStrategy;
  tool_lives_min?: number[];
  program_tool_sequence?: number[];
  sister_tool_enabled?: boolean;
  spindle_to_magazine_s?: number;
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty?: number;
  source: string;
  warning?: string;
}

export interface ToolMagazineResult {
  total_change_time_s: AtomicValue;
  avg_index_time_s: AtomicValue;
  magazine_utilization_pct: AtomicValue;
  optimal_slot_assignment: number[];
  estimated_tool_changes: AtomicValue;
  sister_tool_slots_needed: AtomicValue;
  time_saved_vs_sequential_s: AtomicValue;
  throughput_gain_pct: AtomicValue;
  recommendations: string[];
}

// Magazine type: [max_slots, base_change_s, index_per_slot_s, bidirectional]
const MAGAZINE_DATA: Record<MagazineType, [number, number, number, boolean]> = {
  disc:   [40, 1.5, 0.08, true],
  chain:  [120, 2.0, 0.05, true],
  rack:   [200, 3.5, 0.03, false],
  turret: [12, 0.3, 0.15, true],
  wheel:  [60, 1.8, 0.06, true],
  matrix: [320, 4.0, 0.02, false],
};

export class ToolMagazineOptimizationEngine {
  calculate(input: ToolMagazineInput = {}): ToolMagazineResult {
    const magType = input.magazine_type ?? "chain";
    const [maxSlots, baseChange, indexPerSlot, bidirectional] = MAGAZINE_DATA[magType];
    const totalSlots = input.total_slots ?? maxSlots;
    const toolsReq = input.tools_required ?? 15;
    const changeTime = input.tool_change_time_s ?? baseChange;
    const indexTime = input.index_time_per_slot_s ?? indexPerSlot;
    const strategy = input.strategy ?? "nearest_slot";
    const sisterEnabled = input.sister_tool_enabled ?? false;
    const spindleToMag = input.spindle_to_magazine_s ?? 0.5;

    const seq = input.program_tool_sequence ??
      Array.from({ length: 30 }, (_, i) => (i % toolsReq) + 1);

    const recs: string[] = [];

    // Magazine utilization
    const utilization = Math.min((toolsReq / totalSlots) * 100, 100);
    if (utilization > 90) recs.push("Magazine >90% full — consider larger magazine or tool consolidation");
    if (utilization < 30) recs.push("Magazine under-utilized — smaller magazine may reduce index time");

    // Sequential baseline: tools placed in slots 1..N, always index from current to next
    let seqTotal = 0;
    for (let i = 1; i < seq.length; i++) {
      const from = seq[i - 1];
      const to = seq[i];
      if (from !== to) {
        const dist = Math.abs(to - from);
        const indexDist = bidirectional ? Math.min(dist, totalSlots - dist) : dist;
        seqTotal += changeTime + indexDist * indexTime + spindleToMag * 2;
      }
    }

    // Optimized slot assignment: nearest-neighbor greedy for slot placement
    // Build adjacency frequency from sequence
    const adjFreq: Record<string, number> = {};
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] !== seq[i - 1]) {
        const key = `${Math.min(seq[i - 1], seq[i])}-${Math.max(seq[i - 1], seq[i])}`;
        adjFreq[key] = (adjFreq[key] || 0) + 1;
      }
    }

    // Sort pairs by frequency descending
    const pairs = Object.entries(adjFreq).sort((a, b) => b[1] - a[1]);

    // Assign slots: most frequent pairs get adjacent slots
    const slotMap: Record<number, number> = {};
    let nextSlot = 1;
    for (const [pair] of pairs) {
      const [a, b] = pair.split("-").map(Number);
      if (!slotMap[a]) slotMap[a] = nextSlot++;
      if (!slotMap[b]) {
        // Place adjacent if possible
        const aSlot = slotMap[a];
        const candidate = aSlot + 1 <= totalSlots ? aSlot + 1 : aSlot - 1;
        if (!Object.values(slotMap).includes(candidate) && candidate > 0) {
          slotMap[b] = candidate;
        } else {
          slotMap[b] = nextSlot++;
        }
      }
    }
    // Assign remaining tools
    for (let t = 1; t <= toolsReq; t++) {
      if (!slotMap[t]) slotMap[t] = nextSlot++;
    }

    // Calculate optimized change time
    let optTotal = 0;
    let totalChanges = 0;
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] !== seq[i - 1]) {
        totalChanges++;
        const fromSlot = slotMap[seq[i - 1]] || seq[i - 1];
        const toSlot = slotMap[seq[i]] || seq[i];
        const dist = Math.abs(toSlot - fromSlot);
        const indexDist = bidirectional ? Math.min(dist, totalSlots - dist) : dist;

        let effectiveChange = changeTime;
        if (strategy === "pre_position") effectiveChange *= 0.7;
        if (strategy === "minimum_index") effectiveChange *= 0.85;

        optTotal += effectiveChange + indexDist * indexTime + spindleToMag * 2;
      }
    }

    const timeSaved = Math.max(seqTotal - optTotal, 0);
    const throughputGain = seqTotal > 0 ? (timeSaved / seqTotal) * 100 : 0;

    // Sister tool calculation
    let sisterSlots = 0;
    if (sisterEnabled && input.tool_lives_min) {
      const programTime = seq.length * 2; // rough estimate: 2 min per tool use
      for (const life of input.tool_lives_min) {
        if (life > 0 && programTime > life) {
          sisterSlots += Math.ceil(programTime / life) - 1;
        }
      }
      if (sisterSlots > 0) {
        recs.push(`${sisterSlots} sister tool slots needed for unattended operation`);
      }
    }

    if (strategy === "nearest_slot") recs.push("Consider pre-position strategy for additional 10-30% time savings");
    if (totalChanges > 50) recs.push("High tool change count — consider combined operations to reduce changes");

    const avgIndex = totalChanges > 0 ? optTotal / totalChanges : 0;
    const optSlots = Array.from({ length: toolsReq }, (_, i) => slotMap[i + 1] || i + 1);

    return {
      total_change_time_s: { value: Math.round(optTotal * 100) / 100, unit: "s", source: "ToolMagazineOptimization — greedy adjacency + bidirectional indexing" },
      avg_index_time_s: { value: Math.round(avgIndex * 100) / 100, unit: "s", source: "ToolMagazineOptimization — per-change average" },
      magazine_utilization_pct: { value: Math.round(utilization * 10) / 10, unit: "%", source: "tools_required / total_slots" },
      optimal_slot_assignment: optSlots,
      estimated_tool_changes: { value: totalChanges, unit: "changes", source: "program_tool_sequence analysis" },
      sister_tool_slots_needed: { value: sisterSlots, unit: "slots", source: "tool_lives vs program duration" },
      time_saved_vs_sequential_s: { value: Math.round(timeSaved * 100) / 100, unit: "s", source: "sequential baseline vs optimized" },
      throughput_gain_pct: { value: Math.round(throughputGain * 10) / 10, unit: "%", source: "time_saved / sequential_total" },
      recommendations: recs,
    };
  }
}

export const toolMagazineOptimizationEngine = new ToolMagazineOptimizationEngine();
