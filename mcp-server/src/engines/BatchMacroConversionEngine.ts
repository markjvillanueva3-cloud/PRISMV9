/**
 * BatchMacroConversionEngine — Convert multiple programs to parametric macros
 *
 * Orchestrates the full macro conversion pipeline for batches of programs:
 *   1. Parse programs (via OkumaOSPParserEngine)
 *   2. Generate macro headers (via OkumaMacroHeaderGeneratorEngine)
 *   3. Calculate auto speed/feed (via AutoSpeedFeedCalculatorEngine)
 *   4. Convert to parametric macro (via ProgramMacroConverterEngine)
 *   5. Validate conversion (via MacroValidationEngine)
 *   6. Store results with original→macro mapping
 *
 * @module BatchMacroConversionEngine
 */

import { log } from "../utils/Logger.js";
import type { OkumaProgram } from "./OkumaOSPParserEngine.js";
import { okumaMacroHeaderGeneratorEngine } from "./OkumaMacroHeaderGeneratorEngine.js";
import type { MacroHeaderInput, MacroToolDef, MacroHeaderResult } from "./OkumaMacroHeaderGeneratorEngine.js";
import { programMacroConverterEngine } from "./ProgramMacroConverterEngine.js";
import type { MacroConvertResult } from "./ProgramMacroConverterEngine.js";
import { macroValidationEngine } from "./MacroValidationEngine.js";
import type { MacroValidateResult, MacroVarSet } from "./MacroValidationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Single program conversion result */
export interface ConversionRecord {
  /** Original program filename */
  original_filename: string;
  /** Whether conversion succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Generated header */
  header?: MacroHeaderResult;
  /** Conversion result */
  conversion?: MacroConvertResult;
  /** Validation result */
  validation?: MacroValidateResult;
  /** Final macro text */
  macro_text?: string;
  /** Variable map for reference */
  variable_map?: Array<{ var: string; value: number | string; purpose: string }>;
  /** Summary stats */
  stats?: {
    original_lines: number;
    macro_lines: number;
    dimensions_replaced: number;
    speeds_replaced: number;
    safety_checks_passed: number;
    safety_checks_total: number;
    collision_risks: number;
  };
}

/** Batch conversion input */
export interface BatchConvertInput {
  /** Parsed programs to convert */
  programs: OkumaProgram[];
  /** Unit system for all programs (default: imperial) */
  unit_system?: "imperial" | "metric";
  /** Maximum programs to convert (default: 50) */
  max_programs?: number;
  /** Sort by: "recent" (newest first) or "frequency" (most-used first) */
  sort_by?: "recent" | "frequency" | "line_count";
  /** Skip validation step (faster but less safe) */
  skip_validation?: boolean;
}

/** Batch conversion result */
export interface BatchConvertResult {
  /** Individual conversion results */
  records: ConversionRecord[];
  /** Summary */
  summary: {
    total_programs: number;
    successful: number;
    failed: number;
    total_dimensions_replaced: number;
    total_speeds_replaced: number;
    total_collision_risks: number;
    avg_conversion_coverage: number;
    programs_with_safety_issues: number;
  };
  /** Original→macro filename mapping */
  mapping: Array<{ original: string; macro_name: string; success: boolean }>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class BatchMacroConversionEngine {
  /**
   * Convert a batch of parsed Okuma programs to parametric macros.
   *
   * @param input - Programs and conversion options
   * @returns Batch results with individual records and summary
   */
  convertBatch(input: BatchConvertInput): BatchConvertResult {
    const unitSystem = input.unit_system ?? "imperial";
    const maxPrograms = input.max_programs ?? 50;
    const skipValidation = input.skip_validation ?? false;

    // Sort programs
    let programs = [...input.programs];
    if (input.sort_by === "line_count") {
      programs.sort((a, b) => b.lineCount - a.lineCount);
    }
    // Limit to max
    programs = programs.slice(0, maxPrograms);

    const records: ConversionRecord[] = [];
    const mapping: BatchConvertResult["mapping"] = [];

    for (const prog of programs) {
      const record = this._convertSingle(prog, unitSystem, skipValidation);
      records.push(record);
      mapping.push({
        original: prog.filename,
        macro_name: `MACRO-${prog.filename}`,
        success: record.success,
      });
    }

    // Compute summary
    const successful = records.filter(r => r.success).length;
    const totalDims = records.reduce((s, r) => s + (r.stats?.dimensions_replaced ?? 0), 0);
    const totalSpeeds = records.reduce((s, r) => s + (r.stats?.speeds_replaced ?? 0), 0);
    const totalCollisions = records.reduce((s, r) => s + (r.stats?.collision_risks ?? 0), 0);
    const coverages = records.filter(r => r.conversion).map(r => r.conversion!.stats.conversion_coverage);
    const avgCoverage = coverages.length > 0
      ? Math.round(coverages.reduce((a, b) => a + b, 0) / coverages.length)
      : 0;
    const safetyIssuePrograms = records.filter(r =>
      r.validation && !r.validation.valid,
    ).length;

    log.info(`[BatchMacroConversion] ${successful}/${programs.length} programs converted successfully, ${totalCollisions} collision risks`);

    return {
      records,
      summary: {
        total_programs: programs.length,
        successful,
        failed: programs.length - successful,
        total_dimensions_replaced: totalDims,
        total_speeds_replaced: totalSpeeds,
        total_collision_risks: totalCollisions,
        avg_conversion_coverage: avgCoverage,
        programs_with_safety_issues: safetyIssuePrograms,
      },
      mapping,
    };
  }

  /**
   * Convert a single program (public for direct use).
   */
  convertSingle(
    program: OkumaProgram,
    unitSystem: "imperial" | "metric" = "imperial",
    skipValidation = false,
  ): ConversionRecord {
    return this._convertSingle(program, unitSystem, skipValidation);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _convertSingle(
    program: OkumaProgram,
    unitSystem: "imperial" | "metric",
    skipValidation: boolean,
  ): ConversionRecord {
    try {
      // 1. Infer part geometry from program
      const geometry = this._inferGeometry(program);

      // 2. Build tool definitions from parsed tool sections
      const tools = this._buildToolDefs(program, unitSystem);

      // 3. Generate macro header
      const headerInput: MacroHeaderInput = {
        program_name: program.filename.replace(/\.\w+$/, ""),
        unit_system: unitSystem,
        stock_diameter: geometry.stock_diameter,
        part_length: geometry.part_length,
        finish_od: geometry.finish_od,
        finish_id: geometry.finish_id,
        drill_size: geometry.drill_size,
        tools,
        bar_feeder: program.hasBarFeeder,
        c_axis: program.hasCAxis,
      };

      const header = okumaMacroHeaderGeneratorEngine.generate(headerInput);

      // 4. Convert program to macro
      const conversion = programMacroConverterEngine.convert({
        program,
        header,
        stock_diameter: geometry.stock_diameter,
        finish_od: geometry.finish_od,
        finish_id: geometry.finish_id,
        part_length: geometry.part_length,
        unit_system: unitSystem,
      });

      // 5. Validate (unless skipped)
      let validation: MacroValidateResult | undefined;
      if (!skipValidation) {
        const vars: MacroVarSet = {};
        for (const v of header.variable_map) {
          if (typeof v.value === "number") {
            vars[v.var] = v.value;
          }
        }

        validation = macroValidationEngine.validate({
          macro_lines: conversion.converted_lines,
          original_lines: program.rawLines,
          original_vars: vars,
        });
      }

      return {
        original_filename: program.filename,
        success: true,
        header,
        conversion,
        validation,
        macro_text: conversion.converted_text,
        variable_map: header.variable_map,
        stats: {
          original_lines: program.rawLines.length,
          macro_lines: conversion.converted_lines.length,
          dimensions_replaced: conversion.stats.dimensions_replaced,
          speeds_replaced: conversion.stats.speeds_replaced,
          safety_checks_passed: validation?.stats.passed ?? 0,
          safety_checks_total: validation?.stats.total_checks ?? 0,
          collision_risks: validation?.collision_risks.length ?? 0,
        },
      };
    } catch (err: any) {
      log.warn(`[BatchMacroConversion] Failed to convert ${program.filename}: ${err.message}`);
      return {
        original_filename: program.filename,
        success: false,
        error: err.message ?? String(err),
      };
    }
  }

  /** Infer part geometry from parsed program data */
  private _inferGeometry(program: OkumaProgram): {
    stock_diameter: number;
    part_length: number;
    finish_od?: number;
    finish_id?: number;
    drill_size?: number;
  } {
    // Try to extract from existing variables
    const varMap = new Map<string, number>();
    for (const v of program.variables) {
      const num = typeof v.value === "number" ? v.value : parseFloat(String(v.value));
      if (!isNaN(num)) varMap.set(v.name.toUpperCase(), num);
    }

    // V1 = stock diameter (from macro convention)
    let stockDia = varMap.get("V1") ?? 0;
    let partLen = varMap.get("V5") ?? 0;
    let finishOD = varMap.get("V2");
    let finishID = varMap.get("V3");
    let drillSize = varMap.get("V20");

    // If no variables, infer from program content
    if (stockDia === 0) {
      // Find the largest X value in rapid moves (likely stock diameter)
      let maxX = 0;
      for (const line of program.rawLines) {
        const trimmed = line.trim().toUpperCase();
        if (/G0/.test(trimmed)) {
          const xm = trimmed.match(/X([\d.]+)/);
          if (xm) {
            const x = parseFloat(xm[1]);
            if (x < 15 && x > maxX) maxX = x; // Skip retract positions
          }
        }
      }
      stockDia = maxX > 0 ? maxX : 2.0; // Default to 2" if can't determine
    }

    // Infer part length from largest negative Z
    if (partLen === 0) {
      let maxNegZ = 0;
      for (const line of program.rawLines) {
        const zm = line.trim().match(/Z(-[\d.]+)/);
        if (zm) {
          const absZ = Math.abs(parseFloat(zm[1]));
          if (absZ > maxNegZ) maxNegZ = absZ;
        }
      }
      partLen = maxNegZ > 0 ? maxNegZ : 1.0;
    }

    return {
      stock_diameter: stockDia,
      part_length: partLen,
      finish_od: finishOD,
      finish_id: finishID,
      drill_size: drillSize,
    };
  }

  /** Build MacroToolDef array from parsed tool sections */
  private _buildToolDefs(program: OkumaProgram, unitSystem: string): MacroToolDef[] {
    return program.toolSections.map(section => {
      // Determine operation type
      const ops = section.operations;
      let opType: MacroToolDef["operation"] = "od_rough";
      if (ops.length > 0) {
        const firstOp = ops[0].type;
        if (firstOp === "od_rough" || firstOp === "od_finish" || firstOp === "id_rough" ||
          firstOp === "id_finish" || firstOp === "face" || firstOp === "drill" ||
          firstOp === "peck_drill" || firstOp === "bore" || firstOp === "bore_finish" ||
          firstOp === "groove" || firstOp === "cutoff" || firstOp === "thread") {
          opType = firstOp as MacroToolDef["operation"];
        }
      }

      return {
        station: section.toolNumber,
        operation: opType,
        sfm: section.cssValue ?? 600,
        feed: 0.012, // Default feed — will be extracted from program
        max_rpm: section.maxRPM,
        comment: section.comment,
      };
    });
  }
}

export const batchMacroConversionEngine = new BatchMacroConversionEngine();
