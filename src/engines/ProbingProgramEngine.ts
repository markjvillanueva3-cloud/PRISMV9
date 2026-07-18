/**
 * ProbingProgramEngine — CK-MS11/U02
 * Generates probing cycle G-code for in-process verification.
 * Supports: Renishaw (O9814), Heidenhain (TOUCH PROBE), Blum.
 */

export interface ProbePoint {
  x: number; y: number; z: number;
  type: "surface" | "bore" | "boss" | "web" | "corner";
  expected_mm: number;
  tolerance_mm: number;
  axis: "X" | "Y" | "Z";
  description?: string;
}

export interface ProbingProgram {
  gcode: string;
  gcode_lines: number;
  probe_points: number;
  estimated_time_s: number;
  controller_format: string;
}

export class ProbingProgramEngine {
  generate(
    points: ProbePoint[],
    config: {
      controller: "fanuc" | "haas" | "siemens" | "heidenhain";
      probe_tool_number?: number;
      safe_z?: number;
      feed_rate?: number;
      work_offset?: string;
    },
  ): ProbingProgram {
    const ctrl = config.controller;
    const toolNum = config.probe_tool_number || 50;
    const safeZ = config.safe_z || 50;
    const feed = config.feed_rate || 500;
    const wcs = config.work_offset || "G54";

    const lines: string[] = [];
    lines.push(`(PROBING PROGRAM — ${points.length} POINTS)`);
    lines.push(`(CONTROLLER: ${ctrl.toUpperCase()})`);
    lines.push("");

    if (ctrl === "heidenhain") {
      lines.push("BEGIN PGM 9000 MM");
      lines.push(`TOOL CALL ${toolNum} Z S0`);
      lines.push(`L Z+${safeZ} R0 FMAX`);
    } else {
      lines.push("O9000");
      lines.push("G90 G40 G80");
      lines.push(`T${toolNum} M06`);
      lines.push(`${wcs}`);
      lines.push(`G43 H${toolNum} Z${safeZ}`);
    }
    lines.push("");

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      lines.push(`(POINT ${i + 1}: ${pt.description || pt.type} ${pt.axis} = ${pt.expected_mm}±${pt.tolerance_mm})`);

      if (ctrl === "heidenhain") {
        // Heidenhain touch probe cycle
        lines.push(`L X+${pt.x.toFixed(3)} Y+${pt.y.toFixed(3)} R0 FMAX`);
        lines.push(`L Z+${(pt.z + 5).toFixed(3)} R0 FMAX`);
        if (pt.type === "surface") {
          lines.push(`TCH PROBE 1.0 Z`);
          lines.push(`TCH PROBE 1.1 SET UP ${(pt.z + 2).toFixed(3)}`);
          lines.push(`TCH PROBE 1.2 F${feed}`);
          lines.push(`TCH PROBE 1.3 MB${(pt.expected_mm - pt.tolerance_mm).toFixed(3)}`);
          lines.push(`TCH PROBE 1.4 MA${(pt.expected_mm + pt.tolerance_mm).toFixed(3)}`);
        } else if (pt.type === "bore") {
          lines.push(`TCH PROBE 5.0 CIRCULAR GROOVE`);
          lines.push(`TCH PROBE 5.1 SET UP ${(pt.z + 2).toFixed(3)}`);
          lines.push(`TCH PROBE 5.2 F${feed}`);
          lines.push(`TCH PROBE 5.3 NOMINAL DIAMETER ${pt.expected_mm.toFixed(3)}`);
        }
      } else if (ctrl === "fanuc" || ctrl === "haas") {
        // Renishaw macro style
        lines.push(`G00 X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)}`);
        lines.push(`G00 Z${(pt.z + 5).toFixed(3)}`);
        if (pt.type === "surface") {
          lines.push(`G65 P9814 Z${pt.expected_mm.toFixed(3)} T${pt.tolerance_mm.toFixed(3)} F${feed}`);
        } else if (pt.type === "bore") {
          lines.push(`G65 P9814 D${pt.expected_mm.toFixed(3)} T${pt.tolerance_mm.toFixed(3)} F${feed}`);
        } else if (pt.type === "web") {
          lines.push(`G65 P9814 X${pt.expected_mm.toFixed(3)} T${pt.tolerance_mm.toFixed(3)} F${feed}`);
        } else {
          lines.push(`G65 P9814 ${pt.axis}${pt.expected_mm.toFixed(3)} T${pt.tolerance_mm.toFixed(3)} F${feed}`);
        }
      } else {
        // Siemens
        lines.push(`G00 X=${pt.x.toFixed(3)} Y=${pt.y.toFixed(3)}`);
        lines.push(`G00 Z=${(pt.z + 5).toFixed(3)}`);
        lines.push(`MEAS=1 G01 ${pt.axis}=${pt.expected_mm.toFixed(3)} F${feed}`);
      }

      lines.push(`G00 Z${safeZ}`);
      lines.push("");
    }

    if (ctrl === "heidenhain") {
      lines.push("END PGM 9000 MM");
    } else {
      lines.push("G00 Z" + safeZ);
      lines.push("M30");
    }

    return {
      gcode: lines.join("\n"),
      gcode_lines: lines.length,
      probe_points: points.length,
      estimated_time_s: points.length * 15,
      controller_format: ctrl,
    };
  }
}

export const probingProgramEngine = new ProbingProgramEngine();
