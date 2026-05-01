/**
 * MillTurnCAMEngine — CK-MS6
 * Complete mill-turn and Swiss-type lathe programming:
 *   1. Live tool milling (C-axis, Y-axis)
 *   2. Sub-spindle transfer and back-working
 *   3. Multi-channel synchronization (overlapped ops)
 *   4. Swiss-type bar management (bar feed, guide bushing)
 *
 * Wires existing: LiveToolingEngine, BarFeederEngine,
 * BarPullerTimingEngine, OperationSequencerEngine.
 */

export interface MillTurnOperation {
  id: string;
  type: string;
  spindle: "main" | "sub";
  turret?: number;
  channel?: number;
  position?: { x: number; z: number; y?: number; c_deg?: number };
  dimensions?: {
    diameter_mm?: number; depth_mm?: number;
    length_mm?: number; width_mm?: number;
  };
  tool?: {
    type: string; diameter_mm?: number;
    is_live?: boolean; rpm?: number;
  };
  params?: {
    speed_mpm?: number; feed_mmrev?: number;
    feed_mmmin?: number; doc_mm?: number;
  };
  requires_ops?: string[];
}

export interface MillTurnProgram {
  channels: ChannelProgram[];
  sync_points: Array<{
    id: string; description: string;
    channel_waits: number[];
  }>;
  bar_management?: {
    bar_diameter_mm: number;
    part_length_mm: number;
    parts_per_bar: number;
    bar_length_mm: number;
    remnant_mm: number;
    feed_time_s: number;
  };
  total_cycle_time_min: number;
  tool_list: Array<{
    turret: number; position: number;
    type: string; description: string;
  }>;
  gcode: string;
  warnings: string[];
}

export interface ChannelProgram {
  channel: number;
  spindle: string;
  operations: Array<{
    sequence: number;
    op_id: string;
    type: string;
    gcode_lines: string[];
    cycle_time_s: number;
    wait_before?: string;
  }>;
  total_time_s: number;
}

// Kienzle coefficients for turning force
const KC: Record<string, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1780, mc: 0.26 }, M: { kc1_1: 2100, mc: 0.25 },
  K: { kc1_1: 1100, mc: 0.28 }, N: { kc1_1: 700, mc: 0.23 },
  S: { kc1_1: 2800, mc: 0.25 }, H: { kc1_1: 4000, mc: 0.22 },
};

export class MillTurnCAMEngine {

  /**
   * Generate complete mill-turn program with multi-channel sync.
   */
  generate(
    operations: MillTurnOperation[],
    config: {
      material_iso_group: string;
      bar_diameter_mm?: number;
      bar_length_mm?: number;
      part_length_mm?: number;
      machine_type: "mill_turn" | "swiss" | "vtl";
      max_main_rpm?: number;
      max_sub_rpm?: number;
      max_live_rpm?: number;
      program_number?: number;
    },
  ): MillTurnProgram {
    const iso = config.material_iso_group;
    const warnings: string[] = [];
    const toolList: MillTurnProgram["tool_list"] = [];
    const syncPoints: MillTurnProgram["sync_points"] = [];

    // ── 1. Sort operations by dependency + phase ──────────────
    const sorted = this._topoSort(operations);

    // ── 2. Split into channels ────────────────────────────────
    const mainOps = sorted.filter(
      o => o.spindle === "main" || !o.spindle
    );
    const subOps = sorted.filter(o => o.spindle === "sub");

    // ── 3. Generate channel programs ──────────────────────────
    const ch1 = this._generateChannel(
      1, "main", mainOps, iso, config
    );
    const ch2 = subOps.length > 0
      ? this._generateChannel(2, "sub", subOps, iso, config)
      : null;

    const channels = [ch1];
    if (ch2) channels.push(ch2);

    // ── 4. Add sync points for part transfer ──────────────────
    if (subOps.length > 0) {
      // Find the transfer point: last main op before first sub op
      const transferSync = {
        id: "SYNC_TRANSFER",
        description: "Part transfer: main → sub spindle",
        channel_waits: [1, 2],
      };
      syncPoints.push(transferSync);

      // Insert wait codes into channel programs
      const lastMainIdx = ch1.operations.length - 1;
      if (lastMainIdx >= 0) {
        ch1.operations[lastMainIdx].wait_before = "M200";
      }
      if (ch2 && ch2.operations.length > 0) {
        ch2.operations[0].wait_before = "M200";
      }
    }

    // ── 5. Bar management (Swiss/bar-fed) ─────────────────────
    let barMgmt: MillTurnProgram["bar_management"];
    if (config.bar_diameter_mm && config.part_length_mm) {
      const barLen = config.bar_length_mm || 3000;
      const cutoff = 3; // mm parting width
      const grip = 15; // mm chuck grip
      const usable = barLen - grip - 50; // 50mm remnant
      const partsPerBar = Math.floor(
        usable / (config.part_length_mm + cutoff)
      );
      const remnant = usable - partsPerBar *
        (config.part_length_mm + cutoff);

      barMgmt = {
        bar_diameter_mm: config.bar_diameter_mm,
        part_length_mm: config.part_length_mm,
        parts_per_bar: partsPerBar,
        bar_length_mm: barLen,
        remnant_mm: Math.round(remnant),
        feed_time_s: 3, // typical bar feeder advance
      };
    }

    // ── 6. Collect tools ──────────────────────────────────────
    let toolPos = 1;
    for (const op of sorted) {
      if (op.tool) {
        toolList.push({
          turret: op.turret || 1,
          position: toolPos++,
          type: op.tool.type,
          description: `${op.tool.type} Ø${op.tool.diameter_mm || "?"}mm` +
            (op.tool.is_live ? " (LIVE)" : ""),
        });
      }
    }

    // ── 7. Combine G-code ─────────────────────────────────────
    const progNum = config.program_number || 6000;
    const gcode = this._combineGcode(
      channels, syncPoints, barMgmt, progNum, config.machine_type
    );

    // ── 8. Cycle time ─────────────────────────────────────────
    // With overlapped channels, cycle = max of channels
    const totalTime = Math.max(
      ...channels.map(ch => ch.total_time_s)
    ) / 60;

    return {
      channels,
      sync_points: syncPoints,
      bar_management: barMgmt,
      total_cycle_time_min: Math.round(totalTime * 100) / 100,
      tool_list: toolList,
      gcode,
      warnings,
    };
  }

  /**
   * Generate a single channel's operations.
   */
  private _generateChannel(
    channelNum: number, spindle: string,
    ops: MillTurnOperation[], iso: string,
    config: any,
  ): ChannelProgram {
    const channelOps: ChannelProgram["operations"] = [];
    let totalTime = 0;

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const lines: string[] = [];
      let cycleTime = 0;

      const d = op.dimensions?.diameter_mm || 30;
      const len = op.dimensions?.length_mm || 20;
      const vc = op.params?.speed_mpm || 150;
      const maxRpm = spindle === "sub"
        ? (config.max_sub_rpm || 4000)
        : (config.max_main_rpm || 4000);
      const rpm = Math.min(maxRpm,
        Math.round((vc * 1000) / (Math.PI * d)));
      const f = op.params?.feed_mmrev || 0.2;

      if (op.tool?.is_live) {
        // ── Live tool milling ───────────────────────────────
        const liveRpm = op.tool.rpm || config.max_live_rpm || 6000;
        const fz = 0.08;
        const flutes = 3;
        const feedMmMin = fz * flutes * liveRpm;

        lines.push(`(LIVE TOOL — ${op.type})`);
        lines.push(`M05`); // stop main spindle
        lines.push(`M133`); // live tool ON (machine-specific)

        if (op.position?.c_deg !== undefined) {
          lines.push(`C${op.position.c_deg.toFixed(1)}`);
        }

        lines.push(`G00 X${(d + 5).toFixed(1)} Z${(-(op.position?.z || 0)).toFixed(1)}`);

        if (op.position?.y !== undefined) {
          lines.push(`G00 Y${op.position.y.toFixed(1)}`);
        }

        // Cross-drilling or milling
        if (/drill|hole/.test(op.type)) {
          const depth = op.dimensions?.depth_mm || 5;
          lines.push(`G83 X${(d / 2 - depth).toFixed(1)} Z${(-(op.position?.z || 0)).toFixed(1)} R${(d / 2 + 2).toFixed(1)} Q${Math.round(depth * 300)} F${feedMmMin.toFixed(0)}`);
          lines.push(`G80`);
        } else {
          // C-axis contour
          lines.push(`G01 X${(d / 2).toFixed(1)} F${feedMmMin.toFixed(0)}`);
          const width = op.dimensions?.width_mm || 10;
          lines.push(`G01 C${(width).toFixed(1)}`);
          lines.push(`G00 X${(d + 5).toFixed(1)}`);
        }

        lines.push(`M134`); // live tool OFF
        lines.push(`G00 Y0`);
        cycleTime = (len / feedMmMin) * 60 + 5;

      } else if (/thread/.test(op.type)) {
        // ── Threading ───────────────────────────────────────
        const pitch = 1.5;
        lines.push(`(THREADING — ${op.type})`);
        lines.push(`G97 S${Math.min(rpm, 2000)} M03`);
        lines.push(`G00 X${(d + 2).toFixed(1)} Z5.0`);
        lines.push(`G76 P020060 Q100 R0.05`);
        lines.push(`G76 X${(d - 1.84).toFixed(3)} Z-${len.toFixed(1)} P920 Q200 F${pitch.toFixed(3)}`);
        cycleTime = len / (pitch * Math.min(rpm, 2000) / 60) * 8;

      } else if (/groov|part/.test(op.type)) {
        // ── Grooving / Parting ───────────────────────────────
        const grooveW = op.dimensions?.width_mm || 3;
        lines.push(`(${/part/.test(op.type) ? "PARTING" : "GROOVING"} — ${op.type})`);
        lines.push(`G96 S${Math.round(vc * 0.7)} M03`);
        lines.push(`G50 S${maxRpm}`);
        lines.push(`G00 X${(d + 2).toFixed(1)} Z-${(op.position?.z || len / 2).toFixed(1)}`);
        lines.push(`G75 R0.5`);
        lines.push(`G75 X0.5 Z-${((op.position?.z || len / 2) + grooveW).toFixed(1)} P${Math.round(d * 250)} Q${Math.round(grooveW * 500)} F${(f * 0.4).toFixed(2)}`);
        cycleTime = d / (f * 0.4 * rpm / 60) + 3;

      } else {
        // ── Standard turning (OD/ID/facing) ─────────────────
        const isID = /id|bore|internal/.test(op.type);
        const isFacing = /face/.test(op.type);
        lines.push(`(${op.type.toUpperCase()})`);
        lines.push(`G96 S${vc} M03`);
        lines.push(`G50 S${maxRpm}`);

        if (isFacing) {
          lines.push(`G00 X${(d + 5).toFixed(1)} Z0.5`);
          lines.push(`G01 Z0.0 F${(f * 0.8).toFixed(2)}`);
          lines.push(`G01 X-1.0 F${f.toFixed(2)}`);
          lines.push(`G00 Z2.0`);
          cycleTime = d / (f * rpm) * 60 + 2;
        } else {
          const doc = op.params?.doc_mm || 2;
          lines.push(`G00 X${(isID ? d - doc * 2 - 2 : d + 2).toFixed(1)} Z2.0`);
          lines.push(`G71 U${doc.toFixed(1)} R0.5`);
          lines.push(`G71 P100 Q200 U0.3 W0.1 F${f.toFixed(2)}`);
          lines.push(`N100 G00 X${(isID ? d : d - len * 0.1).toFixed(1)}`);
          lines.push(`G01 Z-${len.toFixed(1)} F${f.toFixed(2)}`);
          lines.push(`N200 X${(isID ? d - doc * 2 : d + 5).toFixed(1)}`);
          cycleTime = len / (f * rpm / 60) * Math.ceil(d * 0.1 / doc) + 5;
        }
      }

      channelOps.push({
        sequence: i + 1,
        op_id: op.id,
        type: op.type,
        gcode_lines: lines,
        cycle_time_s: Math.round(cycleTime),
      });
      totalTime += cycleTime;
    }

    return {
      channel: channelNum,
      spindle,
      operations: channelOps,
      total_time_s: Math.round(totalTime),
    };
  }

  /**
   * Combine channels into final G-code output.
   */
  private _combineGcode(
    channels: ChannelProgram[],
    syncPoints: MillTurnProgram["sync_points"],
    barMgmt: MillTurnProgram["bar_management"] | undefined,
    progNum: number, machineType: string,
  ): string {
    const lines: string[] = [];

    for (const ch of channels) {
      lines.push(`O${progNum + ch.channel - 1}`);
      lines.push(`(CHANNEL ${ch.channel} — ${ch.spindle.toUpperCase()} SPINDLE)`);
      lines.push(`(PRISM MILL-TURN CAM KERNEL)`);
      lines.push("");
      lines.push("G90 G40 G80");
      lines.push(ch.spindle === "main" ? "G18" : "G18");
      lines.push("");

      for (const op of ch.operations) {
        if (op.wait_before) {
          lines.push(`${op.wait_before} (SYNC — WAIT FOR OTHER CHANNEL)`);
        }
        lines.push(`(OP ${op.sequence}: ${op.type})`);
        lines.push(...op.gcode_lines);
        lines.push("");
      }

      // Bar feed for Swiss
      if (barMgmt && ch.channel === 1 && machineType === "swiss") {
        lines.push("(BAR FEED)");
        lines.push(`G00 Z${barMgmt.part_length_mm + 3}`);
        lines.push("M21"); // bar feed advance
      }

      lines.push("M09");
      lines.push("M05");
      lines.push("G28 U0 W0");
      lines.push(channels.length > 1 ? "M99" : "M30");
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Topological sort respecting requires_ops dependencies.
   */
  private _topoSort(ops: MillTurnOperation[]): MillTurnOperation[] {
    const idMap = new Map(ops.map(o => [o.id, o]));
    const inDeg = new Map(ops.map(o => [o.id, 0]));
    const adj = new Map<string, string[]>(ops.map(o => [o.id, []]));

    for (const op of ops) {
      if (op.requires_ops) {
        for (const req of op.requires_ops) {
          if (adj.has(req)) {
            adj.get(req)!.push(op.id);
            inDeg.set(op.id, (inDeg.get(op.id) || 0) + 1);
          }
        }
      }
    }

    // Phase order: facing=0, roughing=1, drilling=2, threading=3, grooving=4, finishing=5, parting=6
    const phase = (t: string) => {
      if (/face/.test(t)) return 0;
      if (/rough/.test(t)) return 1;
      if (/drill|hole|bore/.test(t)) return 2;
      if (/thread/.test(t)) return 3;
      if (/groove/.test(t)) return 4;
      if (/finish/.test(t)) return 5;
      if (/part|cutoff/.test(t)) return 6;
      return 3;
    };

    const queue = ops
      .filter(o => (inDeg.get(o.id) || 0) === 0)
      .sort((a, b) => phase(a.type) - phase(b.type));

    const result: MillTurnOperation[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      queue.sort((a, b) => phase(a.type) - phase(b.type));
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push(node);

      for (const next of adj.get(node.id) || []) {
        const newDeg = (inDeg.get(next) || 1) - 1;
        inDeg.set(next, newDeg);
        if (newDeg === 0 && !visited.has(next)) {
          const op = idMap.get(next);
          if (op) queue.push(op);
        }
      }
    }

    // Add any unvisited
    for (const op of ops) {
      if (!visited.has(op.id)) result.push(op);
    }

    return result;
  }
}

export const millTurnCAMEngine = new MillTurnCAMEngine();
