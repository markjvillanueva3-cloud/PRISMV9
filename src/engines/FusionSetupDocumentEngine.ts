/**
 * FusionSetupDocumentEngine — U-BOX57
 *
 * Generates structured setup documentation from Fusion 360 CAM data.
 * For each CAM setup, produces: fixture info, datum scheme, stock definition,
 * operation sequence, tool list with S/F, and estimated cycle time.
 *
 * @module engines/FusionSetupDocumentEngine
 */

import { log } from "../utils/Logger.js";
import type { CAMExtractionResult, CAMSetupExtract } from "./FusionCAMExtractorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SetupDocument {
  filename: string;
  document_name: string;
  generated_at: string;
  setups: SetupSheet[];
  summary: {
    total_setups: number;
    total_operations: number;
    total_tools: number;
    estimated_cycle_min: number;
  };
}

export interface SetupSheet {
  setup_name: string;
  setup_type: string;
  setup_number: number;
  fixture: string;
  datum: string;
  stock: string;
  operations: OperationRow[];
  tool_list: ToolListEntry[];
  estimated_cycle_min: number;
  notes: string[];
}

export interface OperationRow {
  seq: number;
  name: string;
  type: string;
  strategy: string;
  tool_desc: string;
  rpm: number | null;
  feed: number | null;
  doc_mm: number | null;
  woc_mm: number | null;
}

export interface ToolListEntry {
  station: number;
  description: string;
  type: string;
  diameter_mm: number;
  flute_count: number;
  holder: string;
  gauge_length_mm: number | null;
}

// ============================================================================
// ENGINE
// ============================================================================

export class FusionSetupDocumentEngine {
  /**
   * Generate setup documentation from CAM extraction results.
   */
  generate(extraction: CAMExtractionResult): SetupDocument {
    const sheets: SetupSheet[] = [];
    let totalCycleMin = 0;
    let totalOps = 0;
    const allTools = new Map<string, ToolListEntry>();
    let station = 1;

    for (let i = 0; i < extraction.setups.length; i++) {
      const setup = extraction.setups[i];
      const sheet = this._generateSheet(setup, i + 1, station);
      sheets.push(sheet);
      totalCycleMin += sheet.estimated_cycle_min;
      totalOps += sheet.operations.length;

      for (const t of sheet.tool_list) {
        allTools.set(`${t.type}_${t.diameter_mm}`, t);
      }
      station += sheet.tool_list.length;
    }

    const doc: SetupDocument = {
      filename: extraction.filename,
      document_name: extraction.document_name,
      generated_at: new Date().toISOString(),
      setups: sheets,
      summary: {
        total_setups: sheets.length,
        total_operations: totalOps,
        total_tools: allTools.size,
        estimated_cycle_min: Math.round(totalCycleMin * 10) / 10,
      },
    };

    log.debug(`[FusionSetupDocument] Generated doc for ${extraction.filename}: ` +
      `${sheets.length} setups, ${totalOps} ops, ~${doc.summary.estimated_cycle_min} min`);

    return doc;
  }

  /**
   * Render setup document as formatted text (for display or printing).
   */
  renderText(doc: SetupDocument): string {
    const lines: string[] = [];
    lines.push("=" .repeat(60));
    lines.push(`SETUP SHEET: ${doc.document_name}`);
    lines.push(`File: ${doc.filename}`);
    lines.push(`Generated: ${doc.generated_at}`);
    lines.push("=" .repeat(60));
    lines.push("");

    for (const sheet of doc.setups) {
      lines.push(`--- Setup ${sheet.setup_number}: ${sheet.setup_name} ---`);
      lines.push(`Type: ${sheet.setup_type} | Fixture: ${sheet.fixture} | Datum: ${sheet.datum}`);
      lines.push(`Stock: ${sheet.stock}`);
      lines.push("");
      lines.push("  #  Operation          Strategy         Tool                 RPM    Feed   DOC    WOC");
      lines.push("  " + "-".repeat(95));

      for (const op of sheet.operations) {
        const name = op.name.padEnd(18).slice(0, 18);
        const strat = op.strategy.padEnd(16).slice(0, 16);
        const tool = op.tool_desc.padEnd(20).slice(0, 20);
        const rpm = op.rpm != null ? String(op.rpm).padStart(6) : "     -";
        const feed = op.feed != null ? String(Math.round(op.feed)).padStart(6) : "     -";
        const doc_s = op.doc_mm != null ? op.doc_mm.toFixed(1).padStart(6) : "     -";
        const woc = op.woc_mm != null ? op.woc_mm.toFixed(1).padStart(6) : "     -";
        lines.push(`  ${String(op.seq).padStart(2)}  ${name} ${strat} ${tool} ${rpm} ${feed} ${doc_s} ${woc}`);
      }

      lines.push("");
      lines.push(`  Tool List:`);
      for (const t of sheet.tool_list) {
        lines.push(`    T${String(t.station).padStart(2)}: ${t.description} (${t.type}, D=${t.diameter_mm}mm, ${t.flute_count}FL)`);
      }

      if (sheet.notes.length > 0) {
        lines.push(`  Notes:`);
        for (const n of sheet.notes) lines.push(`    - ${n}`);
      }

      lines.push(`  Estimated cycle: ${sheet.estimated_cycle_min.toFixed(1)} min`);
      lines.push("");
    }

    lines.push(`TOTAL: ${doc.summary.total_setups} setups, ${doc.summary.total_operations} ops, ` +
      `${doc.summary.total_tools} tools, ~${doc.summary.estimated_cycle_min} min`);

    return lines.join("\n");
  }

  // ────────────────────────────────────────────────────────────────

  private _generateSheet(setup: CAMSetupExtract, setupNum: number, startStation: number): SetupSheet {
    const operations: OperationRow[] = [];
    const toolList: ToolListEntry[] = [];
    const toolMap = new Map<string, number>(); // tool key → station
    let station = startStation;
    const notes: string[] = [];

    for (let i = 0; i < setup.operations.length; i++) {
      const op = setup.operations[i];
      let toolStation = 0;

      if (op.tool) {
        const key = `${op.tool.type}_${op.tool.diameter_mm}`;
        if (toolMap.has(key)) {
          toolStation = toolMap.get(key)!;
        } else {
          toolStation = station++;
          toolMap.set(key, toolStation);
          toolList.push({
            station: toolStation,
            description: op.tool.description,
            type: op.tool.type,
            diameter_mm: op.tool.diameter_mm,
            flute_count: op.tool.flute_count,
            holder: "ER collet",
            gauge_length_mm: null,
          });
        }
      }

      operations.push({
        seq: i + 1,
        name: op.name,
        type: op.type,
        strategy: op.strategy,
        tool_desc: op.tool?.description ?? "N/A",
        rpm: op.speed_rpm,
        feed: op.feed_mm_min,
        doc_mm: op.stepdown_mm,
        woc_mm: op.stepover_mm,
      });
    }

    // Estimate cycle time: rough approximation based on operation count and type
    const cycleMin = operations.reduce((sum, op) => {
      if (op.type.includes("face")) return sum + 1.5;
      if (op.type.includes("adaptive") || op.type.includes("pocket")) return sum + 4.0;
      if (op.type.includes("contour")) return sum + 2.0;
      if (op.type.includes("drill")) return sum + 0.5;
      if (op.type.includes("bore")) return sum + 1.0;
      return sum + 2.0;
    }, 0);

    // Add notes for special operations
    if (operations.some(o => o.strategy === "adaptive_clearing")) {
      notes.push("Adaptive clearing used — verify toolpath simulation before first run");
    }
    if (toolList.some(t => t.diameter_mm < 3)) {
      notes.push("Micro tools present — check runout and stickout before running");
    }

    return {
      setup_name: setup.setup_name,
      setup_type: setup.setup_type,
      setup_number: setupNum,
      fixture: this._inferFixture(setup),
      datum: this._inferDatum(setupNum),
      stock: "Per drawing + 0.5mm stock allowance",
      operations,
      tool_list: toolList,
      estimated_cycle_min: Math.round(cycleMin * 10) / 10,
      notes,
    };
  }

  private _inferFixture(setup: CAMSetupExtract): string {
    const name = setup.setup_name.toLowerCase();
    if (name.includes("top") || name.includes("op1")) return "Vise (parallel jaw)";
    if (name.includes("side")) return "Vise (side clamping)";
    if (name.includes("rotary") || name.includes("4th")) return "4th axis rotary";
    if (name.includes("fixture")) return "Dedicated fixture";
    return "Vise (6\" Kurt)";
  }

  private _inferDatum(setupNum: number): string {
    return `G5${setupNum + 3} (Setup ${setupNum})`;
  }
}

// Singleton
export const fusionSetupDocumentEngine = new FusionSetupDocumentEngine();
