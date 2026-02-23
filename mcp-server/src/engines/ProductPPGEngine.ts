/**
 * PRISM Product Engine — Post Processor Generator (PPG)
 * ======================================================
 * MS1: Post Processor Generator — 10 actions
 *
 * Composes GCodeTemplateEngine + DNCTransferEngine + ToolpathCalculations
 * into a unified G-code workflow product: validation, translation,
 * generation, and batch processing across controller dialects.
 *
 * Pipeline: Input G-code/params -> Validate -> Translate/Generate -> Compare -> Output
 *
 * Design principle: Products COMPOSE engines, they don't replace them.
 * Every product action calls 2-6 existing engine functions and merges results.
 */

import {
  generateGCode,
  generateProgram,
  resolveController,
  listControllers,
  listOperations,
  type GCodeResult,
  type GCodeParams,
  type ControllerFamily,
  type GCodeOperation,
} from "./GCodeTemplateEngine.js";

import {
  type ProductTier,
} from "./ProductEngineShared.js";

// ─── PPG History ────────────────────────────────────────────────────────────

const ppgHistory: Array<{ action: string; timestamp: string; controller?: string; summary: string }> = [];

// ─── Controller Syntax Database ─────────────────────────────────────────────

/** G-code syntax patterns per controller family for validation */
export const CONTROLLER_SYNTAX: Record<string, {
  comment_open: string; comment_close: string;
  modal_groups: string[]; canned_cycles: string[];
  line_prefix: string; program_end: string;
  dialect_notes: string[];
}> = {
  fanuc: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Parentheses for comments", "O-number program ID", "G43 H-word tool length comp"],
  },
  haas: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible syntax", "Setting 15 for G/M code checks", "Macro B compatible"],
  },
  siemens: {
    comment_open: ";", comment_close: "",
    modal_groups: ["G0/G1/G2/G3", "G17/G18/G19", "G90/G91", "TRANS/ATRANS", "D (tool offset)"],
    canned_cycles: ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Semicolon comments", "CYCLE81/83/84 canned cycles", "R-parameters", "TRANSMIT for C-axis"],
  },
  heidenhain: {
    comment_open: ";", comment_close: "",
    modal_groups: ["L (linear)", "CC/C (arc center/arc)", "CYCL DEF", "TOOL CALL", "BLK FORM"],
    canned_cycles: ["CYCL DEF 1", "CYCL DEF 200", "CYCL DEF 203", "CYCL DEF 205", "CYCL DEF 207"],
    line_prefix: "", program_end: "END PGM",
    dialect_notes: ["Conversational/plaintext syntax", "CYCL DEF for cycles", "TOOL CALL for tool changes", "FK free contour programming"],
  },
  mazak: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible base", "Mazatrol conversational mode available", "Smooth CNC extensions"],
  },
  okuma: {
    comment_open: "(", comment_close: ")",
    modal_groups: ["G00/G01/G02/G03", "G17/G18/G19", "G90/G91", "G54-G59", "G43/G44/G49"],
    canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86"],
    line_prefix: "N", program_end: "M30",
    dialect_notes: ["Fanuc-compatible base", "OSP-P300 extensions", "Navi-program available"],
  },
};

// ─── PPG Core Functions ─────────────────────────────────────────────────────

/** Validate G-code content against controller syntax rules */
export function ppgValidateGCode(gcode: string, controller: string): {
  valid: boolean; errors: string[]; warnings: string[]; line_count: number;
  controller: string; controller_family: string; score: number;
} {
  const ctrl = resolveController(controller);
  const syntax = CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc;
  const lines = gcode.split("\n").filter(l => l.trim().length > 0);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Program end code
  const hasEnd = lines.some(l => l.includes(syntax.program_end));
  if (!hasEnd) errors.push(`Missing program end (${syntax.program_end})`);

  // Check 2: Comment syntax
  if (ctrl.family === "siemens" || ctrl.family === "heidenhain") {
    const parenComments = lines.filter(l => l.includes("(") && l.includes(")"));
    if (parenComments.length > 0) {
      warnings.push(`Found ${parenComments.length} parenthesis comments — ${ctrl.name} uses semicolon comments`);
    }
  } else {
    const semiComments = lines.filter(l => {
      const stripped = l.replace(/\(.*?\)/g, "");
      return stripped.includes(";") && !stripped.startsWith(";");
    });
    if (semiComments.length > 0) {
      warnings.push(`Found ${semiComments.length} semicolon comments — ${ctrl.name} uses parenthesis comments`);
    }
  }

  // Check 3: Canned cycle compatibility
  const gCodes = lines.flatMap(l => {
    const matches = l.match(/G\d{1,3}/gi) || [];
    return matches.map(m => m.toUpperCase());
  });
  if (ctrl.family === "siemens") {
    const fanucCycles = gCodes.filter(g => ["G73", "G76", "G81", "G82", "G83", "G84", "G85", "G86"].includes(g));
    if (fanucCycles.length > 0) {
      errors.push(`Fanuc-style canned cycles (${[...new Set(fanucCycles)].join(", ")}) not valid — use CYCLE81/83/84/86`);
    }
  }
  if (ctrl.family === "heidenhain") {
    const fanucCycles = gCodes.filter(g => /^G[78]\d$/.test(g));
    if (fanucCycles.length > 0) {
      errors.push(`G-code canned cycles (${[...new Set(fanucCycles)].join(", ")}) not valid — use CYCL DEF`);
    }
  }

  // Check 4: Feed rate present
  const hasFeed = lines.some(l => /F[\d.]+/.test(l));
  if (!hasFeed) warnings.push("No feed rate (F-word) found in program");

  // Check 5: Spindle speed present
  const hasSpindle = lines.some(l => /S\d+/.test(l));
  if (!hasSpindle) warnings.push("No spindle speed (S-word) found in program");

  // Check 6: Work offset
  const hasWorkOffset = lines.some(l => /G5[4-9]/.test(l));
  if (!hasWorkOffset) warnings.push("No work offset (G54-G59) found — machine may use G54 default");

  // Check 7: Tool change
  const hasToolChange = lines.some(l => /T\d+/.test(l) && (/M6/i.test(l) || /M06/i.test(l)));
  if (!hasToolChange) warnings.push("No tool change (T## M6) found");

  const score = Math.max(0, 1 - errors.length * 0.25 - warnings.length * 0.05);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    line_count: lines.length,
    controller: ctrl.name,
    controller_family: ctrl.family,
    score: Math.round(score * 100) / 100,
  };
}

/** Translate G-code from source controller to target controller */
export function ppgTranslateGCode(gcode: string, sourceController: string, targetController: string): {
  original_controller: string; target_controller: string;
  translated_gcode: string; changes_made: string[];
  line_count: number; warnings: string[];
} {
  const src = resolveController(sourceController);
  const tgt = resolveController(targetController);
  const srcSyntax = CONTROLLER_SYNTAX[src.family] || CONTROLLER_SYNTAX.fanuc;
  const tgtSyntax = CONTROLLER_SYNTAX[tgt.family] || CONTROLLER_SYNTAX.fanuc;
  const changes: string[] = [];
  const warnings: string[] = [];
  let translated = gcode;

  // Same family — minimal translation
  if (src.family === tgt.family) {
    changes.push(`Same controller family (${src.family}) — minimal translation needed`);
    return {
      original_controller: src.name,
      target_controller: tgt.name,
      translated_gcode: translated,
      changes_made: changes,
      line_count: translated.split("\n").filter(l => l.trim()).length,
      warnings: ["Source and target share the same dialect — only header updated"],
    };
  }

  // Comment translation
  if (srcSyntax.comment_open !== tgtSyntax.comment_open) {
    if (srcSyntax.comment_open === "(") {
      // Fanuc-style -> Siemens/Heidenhain
      translated = translated.replace(/\(([^)]*)\)/g, `${tgtSyntax.comment_open} $1`);
      changes.push(`Converted parenthesis comments to ${tgt.family} semicolon comments`);
    } else {
      // Siemens/Heidenhain -> Fanuc-style
      translated = translated.replace(/;\s*(.*?)$/gm, `(${srcSyntax.comment_open === ";" ? "$1" : "$1"})`);
      changes.push(`Converted semicolon comments to ${tgt.family} parenthesis comments`);
    }
  }

  // Canned cycle translation: Fanuc -> Siemens
  if ((src.family === "fanuc" || src.family === "haas" || src.family === "mazak" || src.family === "okuma") && tgt.family === "siemens") {
    translated = translated.replace(/G81\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const f = args.match(/F([\d.]+)/i)?.[1] || "100";
      changes.push("G81 -> CYCLE81 (standard drilling)");
      return `CYCLE81(${r},0,${z}) F${f}\n`;
    });
    translated = translated.replace(/G83\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const q = args.match(/Q([\d.]+)/i)?.[1] || "3";
      const f = args.match(/F([\d.]+)/i)?.[1] || "100";
      changes.push("G83 -> CYCLE83 (deep-hole drilling with peck)");
      return `CYCLE83(${r},0,${z},${q}) F${f}\n`;
    });
    translated = translated.replace(/G84\s+(.*?)(?:\n|$)/gi, (_, args) => {
      const z = args.match(/Z([-\d.]+)/i)?.[1] || "-10";
      const r = args.match(/R([-\d.]+)/i)?.[1] || "5";
      const pitch = args.match(/(?:F|K)([\d.]+)/i)?.[1] || "1.5";
      changes.push("G84 -> CYCLE84 (tapping)");
      return `CYCLE84(${r},0,${z},${pitch})\n`;
    });
  }

  // Canned cycle translation: Siemens -> Fanuc
  if (src.family === "siemens" && (tgt.family === "fanuc" || tgt.family === "haas" || tgt.family === "mazak" || tgt.family === "okuma")) {
    translated = translated.replace(/CYCLE81\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE81 -> G81 (standard drilling)");
      return `G81 R${parts[0] || "5"} Z${parts[2] || "-10"} F100`;
    });
    translated = translated.replace(/CYCLE83\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE83 -> G83 (peck drilling)");
      return `G83 R${parts[0] || "5"} Z${parts[2] || "-10"} Q${parts[3] || "3"} F100`;
    });
    translated = translated.replace(/CYCLE84\(([^)]*)\)/gi, (_, args) => {
      const parts = args.split(",").map((s: string) => s.trim());
      changes.push("CYCLE84 -> G84 (tapping)");
      return `G84 R${parts[0] || "5"} Z${parts[2] || "-10"} F${parts[3] || "1.5"}`;
    });
  }

  // Heidenhain <-> Fanuc-family (flag as manual)
  if (src.family === "heidenhain" || tgt.family === "heidenhain") {
    if (changes.length === 0 || (changes.length === 1 && changes[0].includes("comment"))) {
      warnings.push("Heidenhain conversational <-> ISO G-code requires careful manual review");
      warnings.push("CYCL DEF / TOOL CALL patterns may not auto-translate — verify output");
    }
  }

  // Program end translation
  if (srcSyntax.program_end !== tgtSyntax.program_end) {
    translated = translated.replace(new RegExp(srcSyntax.program_end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), tgtSyntax.program_end);
    changes.push(`Program end: ${srcSyntax.program_end} -> ${tgtSyntax.program_end}`);
  }

  return {
    original_controller: src.name,
    target_controller: tgt.name,
    translated_gcode: translated,
    changes_made: changes.length > 0 ? changes : ["No structural changes needed"],
    line_count: translated.split("\n").filter(l => l.trim()).length,
    warnings,
  };
}

// ─── Main PPG Dispatcher ────────────────────────────────────────────────────

export function productPPG(action: string, params: Record<string, any>): any {
  const tier: ProductTier = params.tier || "pro";

  switch (action) {
    case "ppg_validate": {
      const gcode = params.gcode || params.content || "";
      const controller = params.controller || "fanuc";
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to validate)" };

      const result = ppgValidateGCode(gcode, controller);
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Valid=${result.valid}, score=${result.score}, errors=${result.errors.length}` });
      return result;
    }

    case "ppg_translate": {
      const gcode = params.gcode || params.content || "";
      const source = params.source_controller || params.source || "fanuc";
      const target = params.target_controller || params.target || "siemens";
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to translate)" };

      const result = ppgTranslateGCode(gcode, source, target);

      // Auto-validate translated output
      const validation = ppgValidateGCode(result.translated_gcode, target);

      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller: `${source}->${target}`, summary: `${result.changes_made.length} changes, valid=${validation.valid}` });
      return { ...result, validation };
    }

    case "ppg_templates": {
      const controllers = listControllers();
      const operations = listOperations();
      const templates = controllers.flatMap(ctrl =>
        operations.slice(0, tier === "free" ? 4 : operations.length).map(op => ({
          controller: ctrl.name,
          controller_family: ctrl.family,
          operation: op,
          available: true,
        }))
      );
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `${templates.length} templates listed` });
      return { templates, total: templates.length, controllers: controllers.length, operations: operations.length };
    }

    case "ppg_generate": {
      const controller = params.controller || "fanuc";
      const operation = params.operation || "facing";
      const rpm = params.rpm || 3200;
      const feedRate = params.feed_rate || params.vf || 800;

      // Multi-operation mode
      if (params.operations && Array.isArray(params.operations)) {
        const result = generateProgram(controller, params.operations);
        const validation = ppgValidateGCode(result.gcode, controller);
        ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Program: ${params.operations.length} ops, ${result.line_count} lines` });
        return { ...result, validation };
      }

      // Single operation
      const gcParams: GCodeParams = {
        tool_number: params.tool_number || 1,
        rpm,
        feed_rate: feedRate,
        coolant: params.coolant || "flood",
        z_safe: params.z_safe || 5,
        z_depth: params.z_depth || -3,
        work_offset: params.work_offset || "G54",
        peck_depth: params.peck_depth,
        dwell: params.dwell,
        pitch: params.pitch,
        thread_diameter: params.thread_diameter,
        thread_pitch: params.thread_pitch,
        thread_depth: params.thread_depth,
        thread_direction: params.thread_direction,
        pocket_diameter: params.pocket_diameter,
        pocket_depth: params.pocket_depth,
        tool_diameter: params.tool_diameter,
        stepover_percent: params.stepover_percent,
        profile_points: params.profile_points,
        comp_side: params.comp_side,
        x_start: params.x_start,
        y_start: params.y_start,
        x_end: params.x_end,
        y_end: params.y_end,
        program_number: params.program_number,
        program_name: params.program_name,
      };

      const result = generateGCode(controller, operation, gcParams);
      const validation = ppgValidateGCode(result.gcode, controller);
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `${operation}: ${result.line_count} lines` });
      return { ...result, validation };
    }

    case "ppg_controllers": {
      const controllers = listControllers();
      const enriched = controllers.map(ctrl => ({
        ...ctrl,
        syntax: CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc,
      }));
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `${controllers.length} controllers` });
      return { controllers: enriched, total: enriched.length };
    }

    case "ppg_compare": {
      const operation = params.operation || "drilling";
      const rpm = params.rpm || 2000;
      const feedRate = params.feed_rate || params.vf || 500;
      const controllers = params.controllers || ["fanuc", "siemens", "heidenhain"];

      const gcParams: GCodeParams = {
        tool_number: params.tool_number || 1,
        rpm,
        feed_rate: feedRate,
        coolant: params.coolant || "flood",
        z_safe: params.z_safe || 5,
        z_depth: params.z_depth || -15,
        peck_depth: params.peck_depth || 3,
      };

      const results = controllers.map((ctrl: string) => {
        try {
          const result = generateGCode(ctrl, operation, gcParams);
          const validation = ppgValidateGCode(result.gcode, ctrl);
          return {
            controller: result.controller,
            controller_family: result.controller_family,
            gcode: result.gcode,
            line_count: result.line_count,
            validation_score: validation.score,
            warnings: result.warnings,
          };
        } catch (err: any) {
          return { controller: ctrl, error: err.message };
        }
      });

      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: `Compared ${controllers.length} controllers for ${operation}` });
      return { operation, parameters: gcParams, results, controllers_compared: results.length };
    }

    case "ppg_syntax": {
      const controller = params.controller || "fanuc";
      const ctrl = resolveController(controller);
      const syntax = CONTROLLER_SYNTAX[ctrl.family] || CONTROLLER_SYNTAX.fanuc;
      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller, summary: `Syntax ref for ${ctrl.name}` });
      return {
        controller: ctrl.name,
        controller_family: ctrl.family,
        syntax,
        supported_operations: listOperations(),
      };
    }

    case "ppg_batch": {
      const gcode = params.gcode || params.content || "";
      const source = params.source_controller || params.source || "fanuc";
      const targets = params.targets || params.target_controllers || ["siemens", "heidenhain", "haas"];
      if (!gcode) return { error: "Missing required parameter: gcode (G-code string to batch-translate)" };

      if (tier === "free" && targets.length > 2) {
        return { error: "Free tier limited to 2 target controllers per batch. Upgrade to Pro for unlimited batch translation." };
      }

      const results = targets.map((target: string) => {
        const translation = ppgTranslateGCode(gcode, source, target);
        const validation = ppgValidateGCode(translation.translated_gcode, target);
        return {
          target_controller: translation.target_controller,
          translated_gcode: translation.translated_gcode,
          changes_made: translation.changes_made,
          validation_score: validation.score,
          valid: validation.valid,
          warnings: [...translation.warnings, ...validation.warnings],
        };
      });

      ppgHistory.push({ action, timestamp: new Date().toISOString(), controller: source, summary: `Batch: ${source} -> ${targets.length} targets` });
      const resolvedSource = resolveController(source);
      return { source_controller: resolvedSource.name, results, total_targets: results.length };
    }

    case "ppg_history":
      ppgHistory.push({ action, timestamp: new Date().toISOString(), summary: "History requested" });
      return { history: ppgHistory.slice(-50), total: ppgHistory.length };

    case "ppg_get":
      return {
        product: "Post Processor Generator",
        version: "1.0.0",
        actions: ["ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate", "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch", "ppg_history", "ppg_get"],
        controllers: listControllers().length,
        operations: listOperations().length,
        tiers: ["free", "pro", "enterprise"],
        dialect_families: Object.keys(CONTROLLER_SYNTAX).length,
      };

    default:
      return { error: `Unknown PPG action: ${action}` };
  }
}
