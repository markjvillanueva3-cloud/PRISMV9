/**
 * SetupSheetEngine.ts — R8-MS4 Professional Setup Sheet Generation
 * =================================================================
 *
 * Transforms raw job plan data into professional, printable setup sheets
 * that machinists can tape to the machine. Three output formats:
 *
 *   1. **markdown** — Rich markdown for chat display
 *   2. **printable** — ASCII box-drawing for terminal/plaintext printing
 *   3. **json** — Structured data for CAM integration / post-processors
 *
 * Composes with IntelligenceEngine's setup_sheet for parameter data,
 * and ResponseFormatterEngine for unit formatting.
 *
 * @version 1.0.0 — R8-MS4
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SetupSheetFormat = "markdown" | "printable" | "json";

export interface SetupSheetHeader {
  job_id: string;
  part_description: string;
  material: string;
  iso_group: string;
  machine: string;
  date: string;
  programmer: string;
  program_number: string;
}

export interface SetupSheetOperation {
  sequence: number;
  name: string;
  tool_number: number;
  tool_description: string;
  holder: string;
  speed_rpm: number;
  speed_sfm: number;
  speed_smm: number;
  feed_ipm: number;
  feed_mmpm: number;
  feed_ipt: number;
  feed_mmpt: number;
  doc_in: number;
  doc_mm: number;
  woc_in: number;
  woc_mm: number;
  strategy: string;
  passes: number;
  coolant: string;
  stickout_mm: number;
  stickout_in: number;
  cycle_time_min: number;
  notes: string[];
}

export interface SetupSheetTool {
  number: number;
  description: string;
  used_in_ops: number[];
  estimated_life_min: number;
  diameter_mm: number;
  diameter_in: number;
  flutes: number;
  material: string;
}

export interface SetupSheetSummary {
  total_cycle_time_min: number;
  estimated_setup_time_min: number;
  tool_cost_usd: number;
  estimated_part_cost_usd: number;
  safety_score: number;
  quality_score: number;
}

export interface SetupSheet {
  header: SetupSheetHeader;
  operations: SetupSheetOperation[];
  tools: SetupSheetTool[];
  safety_notes: string[];
  summary: SetupSheetSummary;
  format: SetupSheetFormat;
  rendered: string;
}

// ─── Job ID Generation ──────────────────────────────────────────────────────

let jobCounter = 0;

function generateJobId(): string {
  jobCounter++;
  const date = new Date();
  const yy = date.getFullYear().toString().slice(2);
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const seq = jobCounter.toString().padStart(3, "0");
  return `PRISM-${yy}${mm}${dd}-${seq}`;
}

// ─── Unit Conversion Helpers ────────────────────────────────────────────────

const MM_TO_IN = 0.03937;
const IN_TO_MM = 25.4;

function mmToIn(mm: number): number {
  return Math.round(mm * MM_TO_IN * 10000) / 10000;
}

function mpmToSfm(mpm: number): number {
  return Math.round(mpm * 3.2808);
}

function mmpmToIpm(mmpm: number): number {
  return Math.round(mmpm * MM_TO_IN * 100) / 100;
}

// ─── Build Setup Sheet from Raw Data ────────────────────────────────────────

/**
 * Build a professional setup sheet from raw IntelligenceEngine setup_sheet output.
 * This is the main transformation function.
 */
export function buildSetupSheet(
  rawData: Record<string, any>,
  options?: {
    format?: SetupSheetFormat;
    units?: "imperial" | "metric" | "dual";
    programmer?: string;
    program_number?: string;
    shop_rate_per_hour?: number;
  },
): SetupSheet {
  const format = options?.format ?? (rawData.format as SetupSheetFormat) ?? "markdown";
  const units = options?.units ?? "dual";
  const shopRate = options?.shop_rate_per_hour ?? 85;

  // Build header
  const header: SetupSheetHeader = {
    job_id: rawData.job_id ?? generateJobId(),
    part_description: rawData.header?.part_description ?? rawData.part_name ?? "Machining Setup",
    material: rawData.header?.material ?? rawData.material ?? "Unknown",
    iso_group: rawData.header?.iso_group ?? "P",
    machine: rawData.header?.machine ?? rawData.machine_id ?? "Not specified",
    date: rawData.header?.date ?? new Date().toISOString().split("T")[0],
    programmer: options?.programmer ?? rawData.programmer ?? "",
    program_number: options?.program_number ?? rawData.program_number ?? "",
  };

  // Build operations
  const rawOps = rawData.operations ?? [];
  const operations: SetupSheetOperation[] = rawOps.map((op: any, i: number) => {
    const phases = op.phases ?? [];
    const mainPhase = phases[0] ?? {};

    const speedMpm = mainPhase.cutting_speed ?? 150;
    const feedMmpt = mainPhase.feed_per_tooth ?? 0.1;
    const apMm = mainPhase.axial_depth ?? 5;
    const aeMm = mainPhase.radial_depth ?? 10;
    const rpm = mainPhase.spindle_speed ?? 3000;
    const feedMmpm = mainPhase.feed_rate ?? 500;
    const toolDia = rawData.tools?.[i]?.diameter_mm ?? 12;

    return {
      sequence: op.sequence ?? i + 1,
      name: `${op.feature ?? "operation"} ${phases.length > 1 ? `(${phases.length} phases)` : ""}`.trim(),
      tool_number: i + 1,
      tool_description: `${rawData.tools?.[i]?.type ?? "End Mill"} D${toolDia}mm ${rawData.tools?.[i]?.flutes ?? 4}F`,
      holder: rawData.tools?.[i]?.holder ?? "ER collet",
      speed_rpm: rpm,
      speed_sfm: mpmToSfm(speedMpm),
      speed_smm: Math.round(speedMpm),
      feed_ipm: mmpmToIpm(feedMmpm),
      feed_mmpm: Math.round(feedMmpm),
      feed_ipt: Math.round(feedMmpt * MM_TO_IN * 10000) / 10000,
      feed_mmpt: feedMmpt,
      doc_in: mmToIn(apMm),
      doc_mm: apMm,
      woc_in: mmToIn(aeMm),
      woc_mm: aeMm,
      strategy: mainPhase.type ?? "conventional",
      passes: phases.length,
      coolant: op.coolant
        ? `${op.coolant.strategy ?? "flood"} @ ${op.coolant.pressure_bar ?? 20} bar`
        : "Flood",
      stickout_mm: rawData.tools?.[i]?.stickout_mm ?? 35,
      stickout_in: mmToIn(rawData.tools?.[i]?.stickout_mm ?? 35),
      cycle_time_min: Math.round((op.cycle_time_min ?? 5) * 100) / 100,
      notes: op.safety_warnings ?? [],
    };
  });

  // Build consolidated tool list
  const toolMap = new Map<string, SetupSheetTool>();
  for (const op of operations) {
    const key = op.tool_description;
    if (toolMap.has(key)) {
      toolMap.get(key)!.used_in_ops.push(op.sequence);
    } else {
      const rawTool = rawData.tools?.[op.sequence - 1];
      const dia = rawTool?.diameter_mm ?? 12;
      toolMap.set(key, {
        number: op.tool_number,
        description: key,
        used_in_ops: [op.sequence],
        estimated_life_min: 45, // Default estimate; real value from tool_life calc
        diameter_mm: dia,
        diameter_in: mmToIn(dia),
        flutes: rawTool?.flutes ?? 4,
        material: rawTool?.material ?? "Carbide",
      });
    }
  }
  const tools = Array.from(toolMap.values());

  // Build safety notes
  const safetyNotes = rawData.safety_notes ?? ["No safety warnings"];

  // Build summary
  const totalCycleTime = rawData.total_cycle_time_min
    ?? operations.reduce((s, o) => s + o.cycle_time_min, 0);
  const setupTime = Math.max(15, operations.length * 5);
  const toolCost = tools.length * 12; // ~$12/tool average
  const machineCost = ((totalCycleTime + setupTime) / 60) * shopRate;

  const summary: SetupSheetSummary = {
    total_cycle_time_min: Math.round(totalCycleTime * 100) / 100,
    estimated_setup_time_min: setupTime,
    tool_cost_usd: Math.round(toolCost * 100) / 100,
    estimated_part_cost_usd: Math.round((machineCost + toolCost) * 100) / 100,
    safety_score: rawData.safety_score ?? 0.85,
    quality_score: rawData.quality_score ?? 0.80,
  };

  // Render
  let rendered: string;
  if (format === "printable") {
    rendered = renderPrintable(header, operations, tools, safetyNotes, summary, units);
  } else if (format === "markdown") {
    rendered = renderMarkdown(header, operations, tools, safetyNotes, summary, units);
  } else {
    rendered = ""; // JSON format — data is the output
  }

  return {
    header,
    operations,
    tools,
    safety_notes: safetyNotes,
    summary,
    format,
    rendered,
  };
}

// ─── Printable (ASCII Box-Drawing) Renderer ─────────────────────────────────

function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function rpad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : " ".repeat(len - s.length) + s;
}

function renderPrintable(
  header: SetupSheetHeader,
  operations: SetupSheetOperation[],
  tools: SetupSheetTool[],
  safetyNotes: string[],
  summary: SetupSheetSummary,
  units: string,
): string {
  const W = 64; // Inner width
  const line = "+" + "-".repeat(W) + "+";
  const dline = "+" + "=".repeat(W) + "+";
  const lines: string[] = [];

  function row(content: string): string {
    return `| ${pad(content, W - 1)}|`;
  }

  function twoCol(left: string, right: string): string {
    const half = Math.floor((W - 3) / 2);
    return `| ${pad(left, half)} | ${pad(right, half)} |`;
  }

  // === Header
  lines.push(line);
  lines.push(row(`PRISM SETUP SHEET                     Job: ${header.job_id}`));
  lines.push(row("-".repeat(W - 2)));
  lines.push(twoCol(`Part: ${header.part_description}`, `Material: ${header.material} (${header.iso_group})`));
  lines.push(twoCol(`Machine: ${header.machine}`, `Date: ${header.date}`));
  if (header.programmer || header.program_number) {
    lines.push(twoCol(
      `Programmer: ${header.programmer || "N/A"}`,
      `Program: ${header.program_number || "N/A"}`,
    ));
  }
  lines.push(dline);

  // === Operations
  for (const op of operations) {
    lines.push(row(""));
    lines.push(row(`OPERATION ${op.sequence}: ${op.name.toUpperCase()}`));
    lines.push("| " + "-".repeat(W - 2) + " |");

    const speedStr = units === "imperial"
      ? `${op.speed_rpm} RPM (${op.speed_sfm} SFM)`
      : units === "metric"
        ? `${op.speed_rpm} RPM (${op.speed_smm} m/min)`
        : `${op.speed_rpm} RPM (${op.speed_sfm} SFM / ${op.speed_smm} m/min)`;

    const feedStr = units === "imperial"
      ? `${op.feed_ipm} IPM (${op.feed_ipt} IPT)`
      : units === "metric"
        ? `${op.feed_mmpm} mm/min (${op.feed_mmpt} mm/t)`
        : `${op.feed_ipm} IPM / ${op.feed_mmpm} mm/min`;

    const docStr = units === "imperial"
      ? `${op.doc_in}"`
      : units === "metric"
        ? `${op.doc_mm} mm`
        : `${op.doc_in}" / ${op.doc_mm} mm`;

    const wocStr = units === "imperial"
      ? `${op.woc_in}"`
      : units === "metric"
        ? `${op.woc_mm} mm`
        : `${op.woc_in}" / ${op.woc_mm} mm`;

    const stickStr = units === "imperial"
      ? `${op.stickout_in}"`
      : `${op.stickout_mm} mm`;

    lines.push(twoCol(`Tool: T${pad(op.tool_number.toString(), 2)} - ${op.tool_description}`, `Holder: ${op.holder}`));
    lines.push(twoCol(`Speed: ${speedStr}`, `Stick-out: ${stickStr}`));
    lines.push(twoCol(`Feed:  ${feedStr}`, `Coolant: ${op.coolant}`));
    lines.push(twoCol(`DOC:   ${docStr}`, `WOC: ${wocStr}`));
    lines.push(twoCol(`Strategy: ${op.strategy}`, `Passes: ${op.passes}`));

    if (op.notes.length > 0) {
      lines.push(row(""));
      for (const note of op.notes) {
        lines.push(row(`  WARNING: ${note}`));
      }
    }

    lines.push(row(`  Cycle time: ${op.cycle_time_min} min`));
  }

  lines.push(dline);

  // === Tool List
  lines.push(row("TOOL LIST"));
  lines.push("| " + "-".repeat(W - 2) + " |");
  for (const t of tools) {
    const opsStr = t.used_in_ops.join(", ");
    lines.push(twoCol(
      `T${pad(t.number.toString(), 2)}: ${t.description}  Ops: ${opsStr}`,
      `Est. life: ${t.estimated_life_min} min`,
    ));
  }

  lines.push(dline);

  // === Safety Notes
  if (safetyNotes.length > 0 && safetyNotes[0] !== "No safety warnings") {
    lines.push(row("SAFETY NOTES"));
    lines.push("| " + "-".repeat(W - 2) + " |");
    for (const note of safetyNotes) {
      lines.push(row(`  ! ${note}`));
    }
    lines.push(dline);
  }

  // === Summary
  lines.push(row("SUMMARY"));
  lines.push("| " + "-".repeat(W - 2) + " |");
  lines.push(twoCol(
    `Total cycle time: ${summary.total_cycle_time_min} min`,
    `Tool cost: $${summary.tool_cost_usd}`,
  ));
  lines.push(twoCol(
    `Estimated part cost: $${summary.estimated_part_cost_usd}`,
    `Setup time: ${summary.estimated_setup_time_min} min`,
  ));
  lines.push(row(""));
  lines.push(row(`Generated by PRISM Manufacturing Intelligence`));
  lines.push(row(`S(x) = ${summary.safety_score.toFixed(2)} | Omega = ${summary.quality_score.toFixed(2)}`));
  lines.push(line);

  return lines.join("\n");
}

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function renderMarkdown(
  header: SetupSheetHeader,
  operations: SetupSheetOperation[],
  tools: SetupSheetTool[],
  safetyNotes: string[],
  summary: SetupSheetSummary,
  units: string,
): string {
  const lines: string[] = [];

  lines.push(`# PRISM Setup Sheet: ${header.part_description}`);
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Job ID | ${header.job_id} |`);
  lines.push(`| Material | ${header.material} (ISO ${header.iso_group}) |`);
  lines.push(`| Machine | ${header.machine} |`);
  lines.push(`| Date | ${header.date} |`);
  if (header.programmer) lines.push(`| Programmer | ${header.programmer} |`);
  if (header.program_number) lines.push(`| Program | ${header.program_number} |`);
  lines.push("");

  // Operations
  for (const op of operations) {
    lines.push(`## Op ${op.sequence}: ${op.name}`);
    lines.push("");
    lines.push(`| Parameter | Value |`);
    lines.push(`|-----------|-------|`);
    lines.push(`| Tool | T${op.tool_number} - ${op.tool_description} |`);
    lines.push(`| Holder | ${op.holder} |`);

    if (units === "imperial") {
      lines.push(`| Speed | ${op.speed_rpm} RPM (${op.speed_sfm} SFM) |`);
      lines.push(`| Feed | ${op.feed_ipm} IPM (${op.feed_ipt} IPT) |`);
      lines.push(`| DOC | ${op.doc_in}" |`);
      lines.push(`| WOC | ${op.woc_in}" |`);
    } else if (units === "metric") {
      lines.push(`| Speed | ${op.speed_rpm} RPM (${op.speed_smm} m/min) |`);
      lines.push(`| Feed | ${op.feed_mmpm} mm/min (${op.feed_mmpt} mm/t) |`);
      lines.push(`| DOC | ${op.doc_mm} mm |`);
      lines.push(`| WOC | ${op.woc_mm} mm |`);
    } else {
      lines.push(`| Speed | ${op.speed_rpm} RPM (${op.speed_sfm} SFM / ${op.speed_smm} m/min) |`);
      lines.push(`| Feed | ${op.feed_ipm} IPM / ${op.feed_mmpm} mm/min |`);
      lines.push(`| DOC | ${op.doc_in}" / ${op.doc_mm} mm |`);
      lines.push(`| WOC | ${op.woc_in}" / ${op.woc_mm} mm |`);
    }

    lines.push(`| Strategy | ${op.strategy} |`);
    lines.push(`| Coolant | ${op.coolant} |`);
    lines.push(`| Cycle Time | ${op.cycle_time_min} min |`);

    if (op.notes.length > 0) {
      lines.push("");
      for (const note of op.notes) {
        lines.push(`> **Warning:** ${note}`);
      }
    }
    lines.push("");
  }

  // Tool list
  lines.push("## Tool List");
  lines.push("");
  lines.push("| # | Description | Used In | Est. Life |");
  lines.push("|---|-------------|---------|-----------|");
  for (const t of tools) {
    lines.push(`| T${t.number} | ${t.description} | Op ${t.used_in_ops.join(", ")} | ${t.estimated_life_min} min |`);
  }
  lines.push("");

  // Safety
  if (safetyNotes.length > 0 && safetyNotes[0] !== "No safety warnings") {
    lines.push("## Safety Notes");
    lines.push("");
    for (const note of safetyNotes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Cycle Time | ${summary.total_cycle_time_min} min |`);
  lines.push(`| Setup Time | ${summary.estimated_setup_time_min} min |`);
  lines.push(`| Tool Cost | $${summary.tool_cost_usd} |`);
  lines.push(`| Est. Part Cost | $${summary.estimated_part_cost_usd} |`);
  lines.push(`| Safety Score | ${summary.safety_score.toFixed(2)} |`);
  lines.push(`| Quality Score | ${summary.quality_score.toFixed(2)} |`);
  lines.push("");
  lines.push("---");
  lines.push("*Generated by PRISM Manufacturing Intelligence*");

  return lines.join("\n");
}

// ─── Dispatcher Entry Point ─────────────────────────────────────────────────

/**
 * Dispatcher entry for setup sheet generation.
 * Actions:
 *   setup_sheet_format — Transform raw setup data into professional format
 *   setup_sheet_template — Get empty template for manual filling
 */
export function setupSheetEngine(action: string, params: Record<string, any>): any {
  switch (action) {
    case "setup_sheet_format": {
      const sheet = buildSetupSheet(params.data ?? params, {
        format: params.format ?? "markdown",
        units: params.units ?? "dual",
        programmer: params.programmer,
        program_number: params.program_number,
        shop_rate_per_hour: params.shop_rate_per_hour,
      });
      return sheet;
    }

    case "setup_sheet_template": {
      const format = params.format ?? "printable";
      // Generate a blank template
      const blankData: Record<string, any> = {
        header: {
          part_description: "[Part Description]",
          material: "[Material]",
          iso_group: "[ISO]",
          machine: "[Machine]",
          date: new Date().toISOString().split("T")[0],
        },
        operations: [{
          sequence: 1,
          feature: "[Operation Name]",
          phases: [{
            type: "[Strategy]",
            cutting_speed: 0,
            feed_per_tooth: 0,
            axial_depth: 0,
            radial_depth: 0,
            spindle_speed: 0,
            feed_rate: 0,
          }],
          coolant: { strategy: "flood", pressure_bar: 20 },
          cycle_time_min: 0,
          safety_warnings: [],
        }],
        tools: [{
          type: "[Tool Type]",
          diameter_mm: 0,
          flutes: 4,
          material: "Carbide",
          holder: "ER collet",
          stickout_mm: 35,
        }],
        safety_notes: [],
        total_cycle_time_min: 0,
      };

      const sheet = buildSetupSheet(blankData, { format: format as SetupSheetFormat });
      return { template: sheet.rendered, format };
    }

    default:
      throw new Error(`SetupSheetEngine: unknown action "${action}"`);
  }
}
