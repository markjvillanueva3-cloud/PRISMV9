#!/usr/bin/env node
/**
 * PRISM CLI — Direct engine access from command line.
 * Zero AI overhead, pipe-friendly, batch-capable.
 *
 * Usage:
 *   prism sf --material aluminum_6061 --tool-diameter 12 --flutes 4 --operation roughing
 *   prism sim --gcode program.nc --machine "Haas VF-2"
 *   prism quote --part drawing.json --quantity 100
 *   prism calc kienzle_force --kc1_1 1500 --mc 0.25 --ap 3 --fz 0.1
 *   echo '{"material":"steel"}' | prism sf --tool-diameter 10
 */

import { Command } from "commander";
import { formatOutput, type OutputFormat } from "./formatters.js";
import { loadConfig, type CLIConfig } from "./config.js";
import { readStdin } from "./stdin.js";

const VERSION = "1.0.0";

// Global state
let globalConfig: CLIConfig = {};
let globalFormat: OutputFormat = "table";
let globalVerbose = false;
let globalQuiet = false;

export function getGlobalConfig(): CLIConfig { return globalConfig; }
export function getGlobalFormat(): OutputFormat { return globalFormat; }
export function isVerbose(): boolean { return globalVerbose; }
export function isQuiet(): boolean { return globalQuiet; }

/** Merge stdin JSON with explicit CLI flags (flags win). */
export async function mergeStdinParams(explicit: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!process.stdin.isTTY) {
    try {
      const stdinData = await readStdin();
      if (stdinData) {
        const parsed = JSON.parse(stdinData);
        return { ...parsed, ...explicit };
      }
    } catch {
      // Not valid JSON on stdin — ignore
    }
  }
  return explicit;
}

/** Output result in the chosen format, or write error and exit. */
export function outputResult(data: unknown, error?: Error): void {
  if (error) {
    const errObj = { error: true, message: error.message };
    if (globalFormat === "json") {
      process.stdout.write(JSON.stringify(errObj, null, 2) + "\n");
    } else {
      process.stderr.write(`Error: ${error.message}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(formatOutput(data, globalFormat) + "\n");
}

const program = new Command();

program
  .name("prism")
  .description("PRISM Manufacturing Intelligence — Direct engine access from command line")
  .version(VERSION)
  .option("-f, --format <format>", "output format: json, table, csv, compact", "table")
  .option("-v, --verbose", "verbose output")
  .option("-q, --quiet", "suppress non-essential output")
  .option("--no-color", "disable ANSI colors")
  .option("--config <path>", "config file path (default: ~/.prism/config.json)")
  .hook("preAction", async (thisCommand) => {
    const opts = thisCommand.opts();
    globalFormat = (opts.format || "table") as OutputFormat;
    globalVerbose = !!opts.verbose;
    globalQuiet = !!opts.quiet;
    globalConfig = await loadConfig(opts.config);
  });

// ── Speed/Feed Command ──
program
  .command("sf")
  .alias("speed-feed")
  .description("Calculate optimal speed and feed using SpeedFeedOrchestratorEngine (67-point physics)")
  .option("-m, --material <material>", "material name or ISO group (e.g., aluminum_6061, P, M)")
  .option("-d, --tool-diameter <mm>", "tool diameter in mm", parseFloat)
  .option("-z, --flutes <n>", "number of flutes", parseInt)
  .option("-o, --operation <type>", "operation: roughing, finishing, drilling, semi_finishing")
  .option("--machine <name>", "machine name for limits lookup")
  .option("--optimize <target>", "productivity, tool_life, surface_finish, balanced, cost", "balanced")
  .option("--ap <mm>", "axial depth of cut", parseFloat)
  .option("--ae <mm>", "radial width of cut", parseFloat)
  .option("--tool-material <mat>", "carbide, hss, ceramic, cbn, pcd", "carbide")
  .option("--coolant <type>", "flood, mist, mql, dry, cryo", "flood")
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { speedFeedOrchestratorEngine } = await import("../engines/SpeedFeedOrchestratorEngine.js");

      const material = (params.material as string) || globalConfig.default_material || "steel";
      const diameter = (params.toolDiameter as number) || 12;
      const flutes = (params.flutes as number) || 4;
      const operation = (params.operation as string) || "roughing";

      const result = speedFeedOrchestratorEngine.compute({
        material,
        tool_diameter_mm: diameter,
        flutes,
        operation: (operation.includes("drill") ? "drilling" : "milling") as "milling" | "drilling",
        cut_type: (operation.includes("finish") ? "finishing" : "roughing") as "roughing" | "finishing" | "semi_finishing",
        axial_depth_mm: params.ap as number | undefined,
        radial_depth_mm: params.ae as number | undefined,
        tool_material: ((params.toolMaterial as string) || "carbide") as "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd",
        coolant_type: ((params.coolant as string) || "flood") as "flood" | "mist" | "MQL" | "dry" | "cryogenic" | "through_tool",
        optimize_for: ((params.optimize as string) || "balanced") as "balanced" | "tool_life" | "productivity" | "surface_finish" | "cost",
      });

      outputResult(result.value);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Simulate Command ──
program
  .command("sim")
  .alias("simulate")
  .description("Run G-code simulation with physics analysis (force, thermal, wear)")
  .option("-g, --gcode <file>", "G-code file path (or pipe via stdin)")
  .option("-m, --machine <name>", "machine name")
  .option("--material <material>", "workpiece material")
  .option("--report", "generate full report")
  .action(async (opts) => {
    try {
      const { readFileSync } = await import("fs");
      let gcode: string;

      if (opts.gcode) {
        gcode = readFileSync(opts.gcode, "utf-8");
      } else if (!process.stdin.isTTY) {
        gcode = (await readStdin()) || "";
      } else {
        throw new Error("Provide --gcode <file> or pipe G-code via stdin");
      }

      const { cncSimulationPipelineEngine } = await import("../engines/CNCSimulationPipelineEngine.js");
      const result = cncSimulationPipelineEngine.simulate({
        gcode_blocks: gcode.split("\n"),
        machine_brand: opts.machine || globalConfig.default_machine,
        material: opts.material || globalConfig.default_material || "aluminum_6061",
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Quote Command ──
program
  .command("quote")
  .alias("estimate")
  .description("Generate manufacturing cost estimate with physics-backed pricing")
  .option("-p, --part <file>", "part definition JSON file")
  .option("-n, --quantity <n>", "production quantity", parseInt, 1)
  .option("-m, --material <material>", "material name")
  .option("--complexity <level>", "simple, medium, complex, very_complex", "medium")
  .option("--rush", "rush pricing")
  .action(async (opts) => {
    try {
      const { readFileSync } = await import("fs");
      let partData: Record<string, unknown> = {};

      if (opts.part) {
        partData = JSON.parse(readFileSync(opts.part, "utf-8"));
      } else if (!process.stdin.isTTY) {
        const stdin = await readStdin();
        if (stdin) partData = JSON.parse(stdin);
      }

      const { quoteEstimatorEngine } = await import("../engines/QuoteEstimatorEngine.js");
      const result = quoteEstimatorEngine.estimate({
        quantity: opts.quantity || 1,
        material: opts.material || (partData.material as string) || globalConfig.default_material || "aluminum_6061",
        complexity: opts.complexity as "simple" | "medium" | "complex" | "very_complex",
        rush: !!opts.rush,
        ...partData,
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Program Command ──
program
  .command("program")
  .alias("program-gen")
  .description("Generate complete CNC program from part definition")
  .option("-p, --part <file>", "part/drawing JSON file")
  .option("-c, --controller <type>", "fanuc, haas, siemens, heidenhain, mazak, okuma")
  .option("-m, --material <material>", "material name")
  .option("--machine <name>", "machine name/brand")
  .option("--optimize <target>", "balanced, max_speed, max_tool_life, min_cost, surface_quality")
  .option("-o, --output <file>", "output G-code file path")
  .action(async (opts) => {
    try {
      const { readFileSync, writeFileSync } = await import("fs");
      let partData: Record<string, unknown> = {};

      if (opts.part) {
        partData = JSON.parse(readFileSync(opts.part, "utf-8"));
      } else if (!process.stdin.isTTY) {
        const stdin = await readStdin();
        if (stdin) partData = JSON.parse(stdin);
      } else {
        throw new Error("Provide --part <file> or pipe part JSON via stdin");
      }

      const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
      const result = await printToProgramPipelineEngine.runFullPipeline({
        ...partData,
        machine_brand: opts.machine || opts.controller,
        optimization_target: opts.optimize || "balanced",
      } as never);

      if (opts.output && result.success) {
        writeFileSync(opts.output, result.program_text, "utf-8");
        if (!globalQuiet) process.stderr.write(`Wrote ${result.program_line_count} lines to ${opts.output}\n`);
      }

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Post-Process Command ──
program
  .command("post")
  .alias("post-process")
  .description("Run G-code through 26-stage post-processor pipeline with controller dialect")
  .option("-g, --gcode <file>", "G-code file (or pipe via stdin)")
  .option("-c, --controller <type>", "target controller: fanuc, siemens, heidenhain, haas, mazak, okuma")
  .option("--machine <name>", "machine name for limits")
  .option("-a, --aggressiveness <n>", "0.0 conservative → 1.0 aggressive", parseFloat, 0.5)
  .option("--optimize <target>", "balanced, max_speed, max_tool_life, min_cost, surface_quality")
  .option("-o, --output <file>", "output optimized G-code file")
  .action(async (opts) => {
    try {
      const { readFileSync, writeFileSync } = await import("fs");
      let gcode: string;

      if (opts.gcode) {
        gcode = readFileSync(opts.gcode, "utf-8");
      } else if (!process.stdin.isTTY) {
        gcode = (await readStdin()) || "";
      } else {
        throw new Error("Provide --gcode <file> or pipe G-code via stdin");
      }

      const { postProcessorPipelineEngine } = await import("../engines/PostProcessorPipelineEngine.js");
      const result = await postProcessorPipelineEngine.process({
        gcode,
        controller: opts.controller || globalConfig.default_controller || "fanuc",
        machine: opts.machine ? { name: opts.machine } : undefined,
        aggressiveness: opts.aggressiveness,
        optimization_target: opts.optimize || "balanced",
        include_analytics: true,
      });

      if (opts.output) {
        writeFileSync(opts.output, result.output_gcode, "utf-8");
        if (!globalQuiet) process.stderr.write(`Post-processed: ${result.stages.filter(s => s.status !== "skipped").length} stages applied → ${opts.output}\n`);
      }

      // In pipe mode, output just the G-code for composability
      if (!process.stdout.isTTY && !opts.output) {
        process.stdout.write(result.output_gcode);
      } else {
        outputResult(result);
      }
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Tool Command ──
program
  .command("tool")
  .description("Tool catalog search and selection (46K+ tools)")
  .option("-t, --type <type>", "tool type: endmill, drill, tap, reamer, etc.")
  .option("-d, --diameter <mm>", "tool diameter", parseFloat)
  .option("--manufacturer <name>", "filter by manufacturer")
  .option("--material <material>", "workpiece material for selection")
  .option("--operation <op>", "operation for smart selection")
  .action(async (opts) => {
    try {
      const { toolCatalogEngine } = await import("../engines/ToolCatalogEngine.js");
      const result = toolCatalogEngine.search({
        type: opts.type,
        diameter_mm: opts.diameter,
        manufacturer: opts.manufacturer,
        iso_group: opts.material, // map material flag to iso_group filter
        operation: opts.operation,
        max_results: 20,
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Playbook Command ──
program
  .command("playbook")
  .alias("pb")
  .description("Machining best practice advisor (296 rules)")
  .option("-o, --operation <op>", "operation type")
  .option("-m, --material <material>", "workpiece material")
  .option("--hardness <hrc>", "material hardness HRC", parseFloat)
  .option("--issue <keyword>", "search by issue/keyword")
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { machiningPlaybookEngine } = await import("../engines/MachiningPlaybookEngine.js");
      const result = machiningPlaybookEngine.advise({
        operation_type: (params.operation as string) || undefined,
        material_iso: (params.material as string) || undefined,
        hardness_hrc: params.hardness as number | undefined,
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Calc Command (universal dispatcher access) ──
program
  .command("calc <action>")
  .description("Run any calcDispatcher action directly (2385+ actions)")
  .option("--list", "list all available actions")
  .allowUnknownOption(true)
  .action(async (action: string, opts, cmd) => {
    try {
      if (action === "--list" || opts.list) {
        const { toolRouterEngine } = await import("../engines/ToolRouterEngine.js");
        const routes = toolRouterEngine.route("list all");
        outputResult({ routes: routes.map(r => ({ action: r.action, target: r.target, reason: r.reason })), count: routes.length });
        return;
      }

      // Parse remaining args as key=value params
      const rawArgs = cmd.args.slice(1); // skip action name
      const params: Record<string, unknown> = await mergeStdinParams({});
      for (const arg of rawArgs) {
        if (arg.startsWith("--")) {
          const [key, ...valParts] = arg.slice(2).split("=");
          const val = valParts.join("=") || "true";
          const camelKey = key.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
          params[camelKey] = isNaN(Number(val)) ? val : Number(val);
        }
      }

      // Route through ToolRouter → best engine
      const { toolRouterEngine } = await import("../engines/ToolRouterEngine.js");
      const route = toolRouterEngine.bestRoute(action);
      if (!route) throw new Error(`Unknown action: ${action}. Use 'prism calc --list' to see available actions.`);

      // Dynamic import of the target engine and call calculate()
      if (!/^[A-Za-z0-9]+Engine$/.test(route.target)) throw new Error(`Invalid engine name: ${route.target}`);
      const engineMod = await import(`../engines/${route.target}.js`) as Record<string, { calculate?: (a: string, p: Record<string, unknown>) => unknown }>;
      const engine = Object.values(engineMod).find(v => v && typeof v === "object" && "calculate" in v);
      if (engine?.calculate) {
        const result = engine.calculate(route.action || action, params);
        outputResult(result);
      } else {
        throw new Error(`Engine '${route.target}' for action '${action}' not directly callable via CLI.`);
      }
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Verify Command (QS-MS6 P4) ──
program
  .command("verify")
  .description("Cross-pipeline physics consistency check against canonical models")
  .option("-m, --material <material>", "material name or ISO group")
  .option("-d, --tool-diameter <mm>", "tool diameter in mm", parseFloat)
  .option("-z, --flutes <n>", "number of flutes", parseInt)
  .option("--ap <mm>", "axial depth of cut", parseFloat)
  .option("--ae <mm>", "radial width of cut", parseFloat)
  .option("--spindle-rpm <n>", "spindle RPM", parseFloat)
  .option("--feed-rate <mmmin>", "feed rate mm/min", parseFloat)
  .option("--tool-stickout <mm>", "tool stickout for deflection", parseFloat)
  .option("--corner-radius <mm>", "corner radius for Ra", parseFloat)
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { unifiedPhysicsVerifierEngine } = await import("../engines/UnifiedPhysicsVerifierEngine.js");

      const result = unifiedPhysicsVerifierEngine.verify({
        material: (params.material as string) || globalConfig.default_material || "steel",
        tool_diameter_mm: (params.toolDiameter as number) || 12,
        flutes: (params.flutes as number) || 4,
        ap_mm: params.ap as number | undefined,
        ae_mm: params.ae as number | undefined,
        spindle_rpm: params.spindleRpm as number | undefined,
        feed_rate_mmmin: params.feedRate as number | undefined,
        tool_stickout_mm: params.toolStickout as number | undefined,
        corner_radius_mm: params.cornerRadius as number | undefined,
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── What-If Command (QS-MS6 P4) ──
program
  .command("what-if")
  .description("Unified what-if delta analysis: compare two scenarios across all physics")
  .option("-m, --material <material>", "target material (what-if scenario)")
  .option("--from <material>", "baseline material to compare from")
  .option("-d, --tool-diameter <mm>", "tool diameter in mm", parseFloat)
  .option("-z, --flutes <n>", "number of flutes", parseInt)
  .option("--ap <mm>", "axial depth of cut", parseFloat)
  .option("--ae <mm>", "radial width of cut", parseFloat)
  .option("-o, --operation <type>", "operation: roughing, finishing, drilling")
  .option("--tool-material <mat>", "carbide, hss, ceramic, cbn, pcd")
  .option("--coolant <type>", "flood, mist, mql, dry, cryo")
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { crossPipelineWhatIfEngine } = await import("../engines/CrossPipelineWhatIfEngine.js");

      const baseMaterial = (params.from as string) || globalConfig.default_material || "steel";
      const targetMaterial = (params.material as string) || "aluminum_6061";
      const diameter = (params.toolDiameter as number) || 12;
      const flutes = (params.flutes as number) || 4;

      const result = crossPipelineWhatIfEngine.analyze({
        baseline: {
          material: baseMaterial,
          tool_diameter_mm: diameter,
          flutes,
          operation: (params.operation as string) || undefined,
          cut_type: (params.operation as string)?.includes("finish") ? "finishing" : "roughing",
          ap_mm: params.ap as number | undefined,
          ae_mm: params.ae as number | undefined,
          tool_material: (params.toolMaterial as string) || undefined,
          coolant_type: (params.coolant as string) || undefined,
        },
        changes: {
          material: targetMaterial,
        },
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Calibrate Command (QS-MS6 P4) ──
program
  .command("calibrate")
  .description("Live physics calibration: submit measured data to update Bayesian priors")
  .option("--force <N>", "measured cutting force [N]", parseFloat)
  .option("--power <kW>", "measured spindle power [kW]", parseFloat)
  .option("--ra <um>", "measured surface roughness Ra [um]", parseFloat)
  .option("--tool-life <min>", "measured tool life [min]", parseFloat)
  .option("-m, --material <material>", "material name")
  .option("-d, --tool-diameter <mm>", "tool diameter in mm", parseFloat)
  .option("-z, --flutes <n>", "number of flutes", parseInt)
  .option("--ap <mm>", "axial depth of cut", parseFloat)
  .option("--ae <mm>", "radial width of cut", parseFloat)
  .option("--fz <mm>", "feed per tooth", parseFloat)
  .option("--spindle-rpm <n>", "spindle RPM", parseFloat)
  .option("--feed-rate <mmmin>", "feed rate mm/min", parseFloat)
  .option("--state", "show current calibration state instead of submitting")
  .option("--reset", "reset calibration state")
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { physicsAutoCalibrationEngine } = await import("../engines/PhysicsAutoCalibrationEngine.js");

      // Show state
      if (params.state) {
        const state = physicsAutoCalibrationEngine.getState();
        outputResult({
          total_measurements: state.total_measurements,
          materials_calibrated: Object.keys(state.materials).length,
          materials: Object.fromEntries(
            Object.entries(state.materials).map(([k, v]: [string, any]) => [k, {
              kc1_1: { mean: v.kc1_1.mean, std: v.kc1_1.std, n: v.kc1_1.n_observations },
              mc: { mean: v.mc.mean, std: v.mc.std, n: v.mc.n_observations },
              taylor_C: { mean: v.taylor_C.mean, std: v.taylor_C.std, n: v.taylor_C.n_observations },
              taylor_n: { mean: v.taylor_n.mean, std: v.taylor_n.std, n: v.taylor_n.n_observations },
            }])
          ),
          last_updated: state.last_updated,
        });
        return;
      }

      // Reset
      if (params.reset) {
        const result = physicsAutoCalibrationEngine.reset();
        outputResult(result);
        return;
      }

      // Submit measurement
      const material = (params.material as string) || globalConfig.default_material || "steel";
      const diameter = (params.toolDiameter as number) || 12;
      const flutes = (params.flutes as number) || 4;
      const ap = (params.ap as number) || 3;
      const rpm = (params.spindleRpm as number) || 5000;
      const feedRate = (params.feedRate as number) || (rpm * flutes * ((params.fz as number) || 0.1));

      const result = physicsAutoCalibrationEngine.submit({
        material,
        tool_diameter_mm: diameter,
        flutes,
        ap_mm: ap,
        ae_mm: params.ae as number | undefined,
        spindle_rpm: rpm,
        feed_rate_mmmin: feedRate,
        measured_force_N: params.force as number | undefined,
        measured_power_kW: params.power as number | undefined,
        measured_Ra_um: params.ra as number | undefined,
        measured_tool_life_min: params.toolLife as number | undefined,
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Predict Command ──
program
  .command("predict")
  .description("Predict tool life, chatter risk, and failure probability using learned models")
  .option("-m, --material <material>", "workpiece material (e.g., steel, aluminum_6061)")
  .option("-d, --tool-diameter <mm>", "tool diameter in mm", parseFloat)
  .option("-o, --operation <type>", "operation: milling, turning, drilling")
  .option("-s, --speed <mpm>", "cutting speed in m/min", parseFloat)
  .option("--feed <mmrev>", "feed in mm/rev", parseFloat)
  .option("--machine <id>", "machine ID for learned bias lookup")
  .option("--depth <mm>", "depth of cut in mm", parseFloat)
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { PredictionFeedbackOrchestratorEngine } = await import("../engines/PredictionFeedbackOrchestratorEngine.js");
      const engine = new PredictionFeedbackOrchestratorEngine();

      const material = (params.material as string) || globalConfig.default_material || "steel";
      const speed = (params.speed as number) || 150;
      const feed = (params.feed as number) || 0.1;
      const depth = (params.depth as number) || 3;
      const diameter = (params.toolDiameter as number) || 12;
      const machineId = (params.machine as string) || "default-machine";
      const operation = (params.operation as string) || "milling";

      // Get tool life prediction
      const toolLifeResult = engine.getLearnedPrediction({
        machineId,
        predictionType: "tool_life",
        material,
        operation,
        parameters: {
          speed_mpm: speed,
          feed_mmrev: feed,
          depth_mm: depth,
        },
      });

      // Get surface finish prediction
      const raResult = engine.getLearnedPrediction({
        machineId,
        predictionType: "surface_roughness",
        material,
        operation,
        parameters: {
          speed_mpm: speed,
          feed_mmrev: feed,
          depth_mm: depth,
          noseRadius_mm: diameter / 2,
        },
      });

      // Get force prediction for chatter risk estimation
      const forceResult = engine.getLearnedPrediction({
        machineId,
        predictionType: "cutting_force",
        material,
        operation,
        parameters: {
          speed_mpm: speed,
          feed_mmrev: feed,
          depth_mm: depth,
        },
      });

      outputResult({
        material,
        operation,
        cutting_conditions: {
          speed_mpm: speed,
          feed_mmrev: feed,
          depth_mm: depth,
          tool_diameter_mm: diameter,
        },
        tool_life: {
          predicted_minutes: toolLifeResult.prediction,
          confidence_interval: toolLifeResult.confidenceInterval,
          confidence: toolLifeResult.confidence,
        },
        surface_roughness: {
          predicted_Ra_um: raResult.prediction,
          confidence_interval: raResult.confidenceInterval,
          confidence: raResult.confidence,
        },
        cutting_force: {
          predicted_N: forceResult.prediction,
          confidence_interval: forceResult.confidenceInterval,
          confidence: forceResult.confidence,
        },
        chatter_risk: forceResult.prediction > 500 ? "HIGH" : forceResult.prediction > 200 ? "MODERATE" : "LOW",
        failure_probability: toolLifeResult.confidence === "high" ? 0.05
          : toolLifeResult.confidence === "medium" ? 0.15
          : toolLifeResult.confidence === "low" ? 0.35 : 0.5,
      });
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Export Command ──
program
  .command("export")
  .alias("setup-sheet")
  .description("Generate setup sheet from G-code file")
  .option("-g, --gcode <file>", "G-code file path (or pipe via stdin)")
  .option("--format <type>", "output format: json, html, text", "json")
  .option("-c, --controller <type>", "controller type: fanuc, siemens, haas, generic", "generic")
  .option("--part-number <pn>", "part number for the setup sheet")
  .option("--operation-name <name>", "operation name for the setup sheet")
  .option("--safety", "include safety notes")
  .option("-o, --output <file>", "output file path")
  .action(async (opts) => {
    try {
      const { readFileSync, writeFileSync } = await import("fs");
      let gcode: string;

      if (opts.gcode) {
        gcode = readFileSync(opts.gcode, "utf-8");
      } else if (!process.stdin.isTTY) {
        gcode = (await readStdin()) || "";
      } else {
        throw new Error("Provide --gcode <file> or pipe G-code via stdin");
      }

      const { setupSheetFromGCodeEngine } = await import("../engines/SetupSheetFromGCodeEngine.js");
      const result = setupSheetFromGCodeEngine.generateSetupSheet(gcode, {
        controller: opts.controller || globalConfig.default_controller || "generic",
        part_number: opts.partNumber,
        operation_name: opts.operationName,
        include_tool_list: true,
        include_offsets: true,
        include_safety: !!opts.safety,
      } as any);

      // Choose output based on requested format
      const outputFormat = opts.format || "json";
      let outputData: unknown;
      if (outputFormat === "html" || outputFormat === "text") {
        outputData = { markdown: result.markdown, setup_sheet: result.setup_sheet };
      } else {
        outputData = result;
      }

      if (opts.output) {
        const content = outputFormat === "text"
          ? result.markdown
          : JSON.stringify(outputData, null, 2);
        writeFileSync(opts.output, content, "utf-8");
        if (!globalQuiet) process.stderr.write(`Setup sheet written to ${opts.output}\n`);
      }

      outputResult(outputData);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Jobs Command ──
program
  .command("jobs")
  .description("Schedule, prioritize, and analyze manufacturing jobs using queuing theory")
  .option("--sort <field>", "sort by: priority, due-date, cost", "priority")
  .option("--status <status>", "filter by: pending, active, complete")
  .option("--arrival-rate <n>", "job arrival rate [jobs/hour]", parseFloat)
  .option("--service-rate <n>", "service/processing rate [jobs/hour]", parseFloat)
  .option("--servers <n>", "number of parallel machines/servers", parseInt)
  .option("--demand <n>", "annual demand [units/year]", parseFloat)
  .option("--setup-cost <n>", "setup cost per batch [$]", parseFloat)
  .option("--holding-cost <n>", "holding cost per unit per year [$/unit/year]", parseFloat)
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { schedulingPhysicsEngine } = await import("../engines/SchedulingPhysicsEngine.js");

      const results: Record<string, unknown> = {};

      // Queue theory analysis if arrival/service rates provided
      const arrivalRate = params.arrivalRate as number;
      const serviceRate = params.serviceRate as number;
      if (arrivalRate && serviceRate) {
        const queueResult = schedulingPhysicsEngine.calculate({
          action: "calc_queue_theory",
          params: {
            arrival_rate: arrivalRate,
            service_rate: serviceRate,
            servers: (params.servers as number) || 1,
          },
        });
        results.queue_analysis = queueResult;
      }

      // Batch economics if demand/costs provided
      const demand = params.demand as number;
      const setupCost = params.setupCost as number;
      const holdingCost = params.holdingCost as number;
      if (demand && setupCost && holdingCost) {
        const batchResult = schedulingPhysicsEngine.calculate({
          action: "calc_batch_economics",
          params: {
            annual_demand: demand,
            setup_cost: setupCost,
            holding_cost: holdingCost,
          },
        });
        results.batch_economics = batchResult;
      }

      // Capacity analysis summary
      if (arrivalRate && serviceRate) {
        const capacityResult = schedulingPhysicsEngine.calculate({
          action: "calc_capacity_analysis",
          params: {
            arrival_rate: arrivalRate,
            service_rate: serviceRate,
            servers: (params.servers as number) || 1,
          },
        });
        results.capacity = capacityResult;
      }

      if (Object.keys(results).length === 0) {
        results.help = "Provide --arrival-rate and --service-rate for queue analysis, " +
          "or --demand, --setup-cost, --holding-cost for batch economics.";
        results.examples = [
          "prism jobs --arrival-rate 5 --service-rate 8 --servers 2",
          "prism jobs --demand 10000 --setup-cost 150 --holding-cost 5",
        ];
      }

      outputResult(results);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Inventory Command ──
program
  .command("inventory")
  .alias("inv")
  .description("Check on-hand tool inventory, conditions, and library stats")
  .option("-s, --search <term>", "search tools by name or material")
  .option("--low-stock", "show tools needing attention (worn, needs_regrind)")
  .option("--expiring", "show tools with high cutting minutes")
  .option("--import-csv <file>", "import tools from CSV file")
  .option("--add-from-catalog <id>", "add tool from built-in catalog by ID")
  .action(async (opts) => {
    try {
      const { userToolLibraryEngine } = await import("../engines/UserToolLibraryEngine.js");

      // CSV import mode
      if (opts.importCsv) {
        const { readFileSync } = await import("fs");
        const csvText = readFileSync(opts.importCsv, "utf-8");
        const importResult = userToolLibraryEngine.importCSV({ csv_text: csvText });
        outputResult(importResult.value);
        return;
      }

      // Add from catalog mode
      if (opts.addFromCatalog) {
        const result = userToolLibraryEngine.addFromCatalog({
          catalog_id: opts.addFromCatalog,
        });
        outputResult(result.value);
        return;
      }

      // Default: show library stats with optional filtering
      // Build a demo library from stdin or show stats helper
      let library: { tools: Array<Record<string, unknown>>; created_at: string; updated_at: string };

      if (!process.stdin.isTTY) {
        const stdinData = await readStdin();
        if (stdinData) {
          const parsed = JSON.parse(stdinData);
          library = parsed.tools ? parsed : { tools: Array.isArray(parsed) ? parsed : [parsed], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        } else {
          library = { tools: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        }
      } else {
        library = { tools: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }

      const stats = userToolLibraryEngine.getLibraryStats({ library: library as any });
      let result: Record<string, unknown> = { ...stats.value };

      // Filter by search term
      if (opts.search) {
        const term = opts.search.toLowerCase();
        const matched = library.tools.filter((t: any) =>
          (t.name || "").toLowerCase().includes(term) ||
          (t.tool_material || "").toLowerCase().includes(term) ||
          (t.coating || "").toLowerCase().includes(term)
        );
        result = { search: opts.search, matched_count: matched.length, tools: matched };
      }

      // Filter low-stock / needing attention
      if (opts.lowStock) {
        const attention = library.tools.filter((t: any) =>
          t.condition === "worn" || t.condition === "needs_regrind"
        );
        result = { low_stock_count: attention.length, tools_needing_attention: attention };
      }

      // Filter expiring (high cutting minutes)
      if (opts.expiring) {
        const expiring = library.tools.filter((t: any) =>
          (t.total_cutting_minutes || 0) > 100
        );
        result = { expiring_count: expiring.length, high_usage_tools: expiring };
      }

      if (library.tools.length === 0 && !opts.search && !opts.lowStock && !opts.expiring) {
        result.help = "Pipe a tool library JSON via stdin, or use --import-csv <file> to import tools. " +
          "Example: echo '{\"tools\":[...]}' | prism inventory";
      }

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Batch Command ──
program
  .command("batch")
  .description("Batch process multiple calculations from a JSON file, or G-code files via --glob")
  .option("-i, --input <file>", "JSON file with array of {action, params} objects")
  .option("-g, --glob <pattern>", "glob pattern to find G-code files (e.g., \"*.nc\")")
  .option("--stop-on-error", "stop processing on first error (default: continue)")
  .option("--parallel", "run calculations in parallel where possible")
  .action(async (opts) => {
    try {
      const { readFileSync, readdirSync } = await import("fs");

      // ── Glob mode: batch-simulate G-code files ──
      if (opts.glob) {
        const { cncSimulationPipelineEngine } = await import("../engines/CNCSimulationPipelineEngine.js");
        const pattern = opts.glob as string;
        // Convert glob to regex: * → [^/]*, ? → ., ** → .*
        const regexStr = "^" + pattern
          .replace(/\./g, "\\.")
          .replace(/\*\*/g, "\u2051")
          .replace(/\*/g, "[^/]*")
          .replace(/\u2051/g, ".*")
          .replace(/\?/g, ".") + "$";
        const regex = new RegExp(regexStr, "i");
        const files = readdirSync(".").filter((f: string) => regex.test(f));
        if (files.length === 0) throw new Error(`No files matched glob pattern: ${pattern}`);

        const batchResults: Array<{ file: string; success: boolean; result?: unknown; error?: string }> = [];
        for (const file of files) {
          try {
            const gcode = readFileSync(file, "utf-8");
            const simResult = cncSimulationPipelineEngine.simulate({
              gcode_blocks: gcode.split("\n"),
              material: globalConfig.default_material || "aluminum_6061",
            });
            batchResults.push({ file, success: true, result: simResult });
          } catch (err) {
            batchResults.push({ file, success: false, error: (err as Error).message });
            if (opts.stopOnError) break;
          }
        }
        outputResult({
          summary: { total: files.length, succeeded: batchResults.filter(r => r.success).length, failed: batchResults.filter(r => !r.success).length },
          results: batchResults,
        });
        return;
      }

      // ── Standard batch mode: JSON array of {action, params} ──
      let requests: Array<{ action: string; params?: Record<string, unknown> }>;

      if (opts.input) {
        requests = JSON.parse(readFileSync(opts.input, "utf-8"));
      } else if (!process.stdin.isTTY) {
        const stdinData = (await readStdin()) || "[]";
        requests = JSON.parse(stdinData);
      } else {
        throw new Error(
          "Provide --input <file>, --glob <pattern>, or pipe JSON array via stdin.\n" +
          'Format: [{"action":"kienzle_force","params":{"kc1_1":1500,"mc":0.25,"ap":3,"fz":0.1}}, ...]'
        );
      }

      if (!Array.isArray(requests)) {
        throw new Error("Input must be a JSON array of {action, params} objects");
      }

      const { toolRouterEngine } = await import("../engines/ToolRouterEngine.js");

      const results: Array<{
        index: number;
        action: string;
        success: boolean;
        result?: unknown;
        error?: string;
        engine?: string;
      }> = [];

      for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        const action = req.action;
        const params = req.params || {};

        try {
          const route = toolRouterEngine.bestRoute(action);
          if (!route) {
            results.push({ index: i, action, success: false, error: `Unknown action: ${action}` });
            if (opts.stopOnError) break;
            continue;
          }

          if (!/^[A-Za-z0-9]+Engine$/.test(route.target)) throw new Error(`Invalid engine name: ${route.target}`);
          const engineMod = await import(`../engines/${route.target}.js`) as Record<string, { calculate?: (a: string, p: Record<string, unknown>) => unknown }>;
          const engine = Object.values(engineMod).find(v => v && typeof v === "object" && "calculate" in v);

          if (engine?.calculate) {
            const calcResult = engine.calculate(route.action || action, params);
            results.push({ index: i, action, success: true, result: calcResult, engine: route.target });
          } else {
            results.push({ index: i, action, success: false, error: `Engine '${route.target}' not directly callable`, engine: route.target });
            if (opts.stopOnError) break;
          }
        } catch (err) {
          results.push({ index: i, action, success: false, error: (err as Error).message });
          if (opts.stopOnError) break;
        }
      }

      const summary = {
        total: requests.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };

      outputResult({ summary, results });
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Troubleshoot Command ──
const troubleshootCmd = program
  .command("troubleshoot")
  .alias("diag")
  .description("Interactive troubleshooting assistant for machining problems");

troubleshootCmd
  .command("start")
  .description("Start guided diagnosis for a machining domain")
  .requiredOption("--domain <domain>", "domain: surface_finish, dimensional, tool_breakage, chatter, chip, thermal, alarm, workholding")
  .action(async (opts) => {
    try {
      const { troubleshootingAssistantEngine } = await import("../engines/TroubleshootingAssistantEngine.js");
      const result = troubleshootingAssistantEngine.startDiagnosis({
        domain: opts.domain,
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

troubleshootCmd
  .command("quick")
  .description("Quick symptom matching — provide comma-separated symptoms")
  .requiredOption("--symptoms <list>", "comma-separated symptoms (e.g., chatter,poor_finish,vibration)")
  .option("-m, --material <material>", "workpiece material")
  .option("-o, --operation <op>", "operation type")
  .action(async (opts) => {
    try {
      const { troubleshootingAssistantEngine } = await import("../engines/TroubleshootingAssistantEngine.js");
      const symptoms = (opts.symptoms as string).split(",").map((s: string) => s.trim());
      const result = troubleshootingAssistantEngine.quickDiagnose({
        symptoms,
        material: opts.material,
        operation: opts.operation,
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

troubleshootCmd
  .command("common")
  .description("Show common problems for a machining domain")
  .requiredOption("--domain <domain>", "domain: surface_finish, dimensional, tool_breakage, chatter, chip, thermal, alarm, workholding")
  .action(async (opts) => {
    try {
      const { troubleshootingAssistantEngine } = await import("../engines/TroubleshootingAssistantEngine.js");
      const result = troubleshootingAssistantEngine.getCommonProblems({
        domain: opts.domain,
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Dashboard Command ──
const dashboardCmd = program
  .command("dashboard")
  .alias("dash")
  .description("Operator dashboard — real-time machine status, alerts, and shift summaries");

dashboardCmd
  .command("status")
  .description("Full machine status overview")
  .option("--machine <id>", "machine identifier")
  .option("--rpm <n>", "current spindle RPM", parseFloat)
  .option("--feed <n>", "current feed rate mm/min", parseFloat)
  .option("--load <n>", "current spindle load %", parseFloat)
  .option("--material <m>", "current workpiece material")
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { operatorDashboardOrchestratorEngine } = await import("../engines/OperatorDashboardOrchestratorEngine.js");
      const result = operatorDashboardOrchestratorEngine.getStatus({
        machine_id: (params.machine as string) || globalConfig.default_machine || "default",
        current_rpm: (params.rpm as number) || 5000,
        current_feed: (params.feed as number) || 1000,
        current_load_pct: (params.load as number) || 50,
        material: (params.material as string) || globalConfig.default_material,
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

dashboardCmd
  .command("alerts")
  .description("Show active alerts filtered by minimum severity")
  .option("--machine <id>", "machine identifier")
  .option("--rpm <n>", "current spindle RPM", parseFloat)
  .option("--feed <n>", "current feed rate mm/min", parseFloat)
  .option("--load <n>", "current spindle load %", parseFloat)
  .option("--min-severity <level>", "minimum severity: info, warning, critical", "warning")
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { operatorDashboardOrchestratorEngine } = await import("../engines/OperatorDashboardOrchestratorEngine.js");
      const result = operatorDashboardOrchestratorEngine.getAlerts({
        machine_id: (params.machine as string) || globalConfig.default_machine || "default",
        current_rpm: (params.rpm as number) || 5000,
        current_feed: (params.feed as number) || 1000,
        current_load_pct: (params.load as number) || 50,
        min_severity: ((params.minSeverity as string) || "warning") as "info" | "warning" | "critical",
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

dashboardCmd
  .command("shift")
  .description("Generate shift summary report (pipe operations JSON via stdin)")
  .option("--machine <id>", "machine identifier")
  .option("--hours <n>", "shift duration in hours", parseFloat, 8)
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      const { operatorDashboardOrchestratorEngine } = await import("../engines/OperatorDashboardOrchestratorEngine.js");

      // Operations can come from stdin JSON or default to a single sample op
      let operations = (params.operations as Array<{ rpm: number; feed: number; duration_min: number; load_pct?: number }>) || [];
      if (operations.length === 0) {
        operations = [{ rpm: 5000, feed: 1000, duration_min: ((params.hours as number) || 8) * 60, load_pct: 50 }];
      }

      const result = operatorDashboardOrchestratorEngine.getShiftSummary({
        machine_id: (params.machine as string) || globalConfig.default_machine || "default",
        shift_hours: (params.hours as number) || 8,
        operations,
      });
      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Substitute Command ──
program
  .command("substitute")
  .alias("sub")
  .description("Tool substitution risk assessment — check safety of swapping tools")
  .requiredOption("--original-diameter <mm>", "original tool diameter in mm", parseFloat)
  .requiredOption("--original-flutes <n>", "original tool flute count", parseInt)
  .requiredOption("--sub-diameter <mm>", "substitute tool diameter in mm", parseFloat)
  .requiredOption("--sub-flutes <n>", "substitute tool flute count", parseInt)
  .option("-m, --material <material>", "workpiece material")
  .option("--depth <mm>", "axial depth of cut in mm", parseFloat)
  .option("--width <mm>", "radial width of cut in mm", parseFloat)
  .option("--feed <mmmin>", "current feed rate mm/min", parseFloat)
  .option("--rpm <n>", "current spindle RPM", parseFloat)
  .option("--tolerance <mm>", "part tolerance in mm", parseFloat)
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      let toolSubstitutionRiskEngine: any;
      try {
        const enginePath = "../engines/" + "ToolSubstitutionRiskEngine.js";
        const mod = await import(/* webpackIgnore: true */ enginePath);
        toolSubstitutionRiskEngine = mod.toolSubstitutionRiskEngine;
      } catch {
        throw new Error("ToolSubstitutionRiskEngine not yet available. Build the engine first.");
      }

      const result = toolSubstitutionRiskEngine.assessSubstitution({
        original: {
          diameter_mm: params.originalDiameter as number,
          flutes: params.originalFlutes as number,
        },
        substitute: {
          diameter_mm: params.subDiameter as number,
          flutes: params.subFlutes as number,
        },
        material: (params.material as string) || globalConfig.default_material || "steel",
        depth_mm: params.depth as number | undefined,
        width_mm: params.width as number | undefined,
        feed_mmmin: params.feed as number | undefined,
        spindle_rpm: params.rpm as number | undefined,
        tolerance_mm: params.tolerance as number | undefined,
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Scrap Command ──
program
  .command("scrap")
  .alias("rca")
  .description("Scrap root cause analysis — diagnose defects from process measurements")
  .requiredOption("--defect <type>", "defect type: oversized, undersized, rough_finish, chatter_marks, burr, out_of_round, taper, tool_breakage")
  .option("--measurements <json>", "JSON object with dimensional measurements")
  .option("--spindle-load <pct>", "spindle load percentage during cut", parseFloat)
  .option("--vibration <g>", "vibration amplitude in g", parseFloat)
  .option("--temp-delta <C>", "temperature rise delta in Celsius", parseFloat)
  .option("--tool-age <min>", "tool cutting time in minutes", parseFloat)
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      let scrapRootCauseEngine: any;
      try {
        const enginePath = "../engines/" + "ScrapRootCauseEngine.js";
        const mod = await import(/* webpackIgnore: true */ enginePath);
        scrapRootCauseEngine = mod.scrapRootCauseEngine;
      } catch {
        throw new Error("ScrapRootCauseEngine not yet available. Build the engine first.");
      }

      let measurements: Record<string, unknown> | undefined;
      if (params.measurements) {
        try {
          measurements = JSON.parse(params.measurements as string);
        } catch {
          throw new Error("--measurements must be valid JSON (e.g., '{\"diameter\":25.02,\"target\":25.00}')");
        }
      }

      const result = scrapRootCauseEngine.analyzeScrapEvent({
        defect_type: params.defect as string,
        measurements,
        spindle_load_pct: params.spindleLoad as number | undefined,
        vibration_g: params.vibration as number | undefined,
        temp_delta_C: params.tempDelta as number | undefined,
        tool_age_min: params.toolAge as number | undefined,
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Profit Command ──
program
  .command("profit")
  .alias("waterfall")
  .description("Job profitability waterfall analysis — revenue to net margin breakdown")
  .requiredOption("--revenue <dollars>", "total job revenue [$]", parseFloat)
  .option("--material <dollars>", "material cost [$]", parseFloat, 0)
  .option("--tooling <dollars>", "tooling cost [$]", parseFloat, 0)
  .option("--labor-hours <n>", "total labor hours", parseFloat, 0)
  .option("--labor-rate <dph>", "labor rate [$/hour]", parseFloat, 45)
  .option("--machine-hours <n>", "total machine hours", parseFloat, 0)
  .option("--machine-rate <dph>", "machine rate [$/hour]", parseFloat, 85)
  .option("--setup-hours <n>", "setup hours", parseFloat, 0)
  .option("--scrap-count <n>", "number of scrapped parts", parseInt, 0)
  .option("--scrap-cost <dollars>", "cost per scrapped part [$]", parseFloat, 0)
  .action(async (opts) => {
    try {
      const params = await mergeStdinParams(opts);
      let jobProfitabilityWaterfallEngine: any;
      try {
        const enginePath = "../engines/" + "JobProfitabilityWaterfallEngine.js";
        const mod = await import(/* webpackIgnore: true */ enginePath);
        jobProfitabilityWaterfallEngine = mod.jobProfitabilityWaterfallEngine;
      } catch {
        throw new Error("JobProfitabilityWaterfallEngine not yet available. Build the engine first.");
      }

      const revenue = params.revenue as number;
      const materialCost = (params.material as number) || 0;
      const toolingCost = (params.tooling as number) || 0;
      const laborHours = (params.laborHours as number) || 0;
      const laborRate = (params.laborRate as number) || 45;
      const machineHours = (params.machineHours as number) || 0;
      const machineRate = (params.machineRate as number) || 85;
      const setupHours = (params.setupHours as number) || 0;
      const scrapCount = (params.scrapCount as number) || 0;
      const scrapCost = (params.scrapCost as number) || 0;

      const result = jobProfitabilityWaterfallEngine.analyzeJob({
        revenue,
        material_cost: materialCost,
        tooling_cost: toolingCost,
        labor_hours: laborHours,
        labor_rate: laborRate,
        machine_hours: machineHours,
        machine_rate: machineRate,
        setup_hours: setupHours,
        scrap_count: scrapCount,
        scrap_cost_per_part: scrapCost,
      });

      outputResult(result);
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Config Command ──
const configCmd = program
  .command("config")
  .description("Manage CLI configuration (~/.prism/config.json)");

configCmd
  .command("show")
  .description("Display current configuration")
  .action(async () => {
    try {
      const { existsSync, readFileSync } = await import("fs");
      const { join } = await import("path");
      const { homedir } = await import("os");
      const configPath = join(homedir(), ".prism", "config.json");
      if (existsSync(configPath)) {
        outputResult(JSON.parse(readFileSync(configPath, "utf-8")));
      } else {
        outputResult({ _info: "No config file found. Using defaults.", format: "table", material_default: "steel_1045", machine_default: "haas_vf2", units: "metric" });
      }
    } catch (e) { outputResult(null, e as Error); }
  });

configCmd
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action(async (key: string, value: string) => {
    try {
      const { existsSync, readFileSync, writeFileSync, mkdirSync } = await import("fs");
      const { join } = await import("path");
      const { homedir } = await import("os");
      const dir = join(homedir(), ".prism");
      const configPath = join(dir, "config.json");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      let config: Record<string, unknown> = {};
      if (existsSync(configPath)) {
        try { config = JSON.parse(readFileSync(configPath, "utf-8")); } catch { /* start fresh */ }
      }
      // Auto-parse numbers and booleans
      const parsed = value === "true" ? true : value === "false" ? false : !isNaN(Number(value)) ? Number(value) : value;
      config[key] = parsed;
      writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      outputResult({ success: true, [key]: parsed, path: configPath });
    } catch (e) { outputResult(null, e as Error); }
  });

configCmd
  .command("reset")
  .description("Reset configuration to defaults")
  .action(async () => {
    try {
      const { writeFileSync, mkdirSync, existsSync } = await import("fs");
      const { join } = await import("path");
      const { homedir } = await import("os");
      const dir = join(homedir(), ".prism");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const defaults = { format: "table", material_default: "steel_1045", machine_default: "haas_vf2", units: "metric" };
      writeFileSync(join(dir, "config.json"), JSON.stringify(defaults, null, 2), "utf-8");
      outputResult({ success: true, message: "Config reset to defaults", config: defaults });
    } catch (e) { outputResult(null, e as Error); }
  });

// ── Pipe Command ──
program
  .command("pipe")
  .description("Pipeline chaining: run multiple engine steps sequentially, feeding output forward")
  .requiredOption("-s, --steps <json>", 'JSON array of steps: [{"command":"sf","params":{...}}, {"command":"sim"}, {"command":"post","params":{...}}]')
  .action(async (opts) => {
    try {
      const steps: Array<{ command: string; params?: Record<string, unknown> }> = JSON.parse(opts.steps);
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error("--steps must be a non-empty JSON array of {command, params} objects");
      }

      let context: Record<string, unknown> = {};
      const pipeResults: Array<{ step: number; command: string; success: boolean; summary?: string }> = [];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const merged = { ...context, ...(step.params || {}) };

        try {
          switch (step.command) {
            case "sf": {
              const { speedFeedOrchestratorEngine } = await import("../engines/SpeedFeedOrchestratorEngine.js");
              const sfResult = speedFeedOrchestratorEngine.compute({
                material: (merged.material as string) || "steel",
                tool_diameter_mm: (merged.tool_diameter_mm as number) || (merged.diameter as number) || 12,
                flutes: (merged.flutes as number) || 4,
                operation: "milling",
                cut_type: ((merged.cut_type as string) || "roughing") as "roughing" | "finishing" | "semi_finishing",
              });
              context = { ...context, ...sfResult.value, _sf: sfResult.value };
              pipeResults.push({ step: i, command: "sf", success: true, summary: `Vc=${sfResult.value.cutting_speed_mpm} RPM=${sfResult.value.spindle_rpm}` });
              break;
            }
            case "sim": {
              const { cncSimulationPipelineEngine } = await import("../engines/CNCSimulationPipelineEngine.js");
              const gcode = (merged.gcode as string) || (merged.gcode_blocks as string[])?.join("\n") || "";
              const simResult = cncSimulationPipelineEngine.simulate({
                gcode_blocks: gcode.split("\n"),
                material: (merged.material as string) || "aluminum_6061",
              });
              context = { ...context, ...simResult, _sim: simResult };
              pipeResults.push({ step: i, command: "sim", success: true, summary: `blocks=${simResult.total_blocks || 0}` });
              break;
            }
            case "post": {
              const { postProcessorPipelineEngine } = await import("../engines/PostProcessorPipelineEngine.js");
              const gcodeInput = (merged.gcode as string) || "";
              const postResult = await postProcessorPipelineEngine.process({
                gcode: gcodeInput,
                controller: ((merged.controller as string) || "fanuc") as "fanuc" | "siemens" | "heidenhain" | "haas" | "mazak" | "okuma",
                aggressiveness: (merged.aggressiveness as number) || 0.5,
                optimization_target: "balanced",
                include_analytics: true,
              });
              context = { ...context, output_gcode: postResult.output_gcode, _post: postResult };
              pipeResults.push({ step: i, command: "post", success: true, summary: `stages=${postResult.stages?.length || 0}` });
              break;
            }
            default:
              pipeResults.push({ step: i, command: step.command, success: false, summary: `Unknown pipe command: ${step.command}. Supported: sf, sim, post` });
          }
        } catch (err) {
          pipeResults.push({ step: i, command: step.command, success: false, summary: (err as Error).message });
        }
      }

      outputResult({
        pipeline: pipeResults,
        final_context_keys: Object.keys(context).filter(k => !k.startsWith("_")),
        final_output: context,
      });
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Benchmark Command ──
program
  .command("benchmark")
  .alias("bench")
  .description("Run PRISM benchmark suite and generate report")
  .option("--layer <n>", "Run specific layer (1-5)", parseInt)
  .option("--part <id>", "Run specific benchmark part scorecard")
  .option("--verbose", "Include detailed per-test results")
  .option("--json", "Output raw JSON instead of formatted text")
  .action(async (opts) => {
    try {
      const { benchmarkReportGeneratorEngine } = await import(
        "../engines/BenchmarkReportGeneratorEngine.js"
      );

      if (opts.part) {
        const card = benchmarkReportGeneratorEngine.scorecard({
          benchmark_id: opts.part,
        });
        outputResult(card);
        return;
      }

      if (opts.json) {
        const report = benchmarkReportGeneratorEngine.generateReport({
          include_layers: opts.layer ? [opts.layer] : undefined,
          verbose: opts.verbose,
        });
        outputResult(report);
      } else {
        const text = benchmarkReportGeneratorEngine.generateTextReport({
          include_layers: opts.layer ? [opts.layer] : undefined,
          verbose: opts.verbose,
        });
        process.stdout.write(text + "\n");
      }
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Classify Command (ACP-MS1) ──
program
  .command("classify")
  .description("Classify a prompt into task type and resolve automation chain")
  .argument("<prompt...>", "the prompt text to classify")
  .action(async (promptParts: string[]) => {
    try {
      const { automationChainEngine } = await import("../engines/AutomationChainEngine.js");
      const prompt = promptParts.join(" ");
      const result = automationChainEngine.classify(prompt);
      const chain = automationChainEngine.getChain(result.task_class);
      outputResult({
        ...result,
        chain_tier: chain.tier,
        chain_steps: chain.steps.map(s => s.description),
        fail_behavior: chain.fail_behavior,
      });
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Chains Command (ACP-MS0A) ──
program
  .command("chains")
  .description("List all automation chains with their tiers and token budgets")
  .action(async () => {
    try {
      const { automationChainEngine } = await import("../engines/AutomationChainEngine.js");
      outputResult(automationChainEngine.listChains());
    } catch (e) {
      outputResult(null, e as Error);
    }
  });

// ── Shell Completions ──
program
  .command("completion")
  .description("Generate shell completion script (bash, zsh, powershell)")
  .argument("<shell>", "shell type: bash, zsh, powershell")
  .action((shell: string) => {
    const commands = program.commands.map(c => c.name()).filter(n => n !== "completion" && n !== "repl");
    const materials = ["steel", "aluminum_6061", "aluminum_7075", "stainless_304", "stainless_316", "titanium_gr5", "inconel_718", "tool_steel", "hardened_steel", "brass", "copper", "tungsten_carbide"];
    const operations = ["roughing", "finishing", "semi_finishing", "drilling"];
    const formats = ["json", "table", "csv", "compact"];
    const controllers = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];

    if (shell === "bash") {
      process.stdout.write(`# PRISM CLI bash completion — add to ~/.bashrc:
#   source <(prism completion bash)
_prism_complete() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[COMP_CWORD-1]}"
  local cmd="\${COMP_WORDS[1]}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${commands.join(" ")}" -- "$cur") )
    return
  fi

  case "$prev" in
    --material|-m)  COMPREPLY=( $(compgen -W "${materials.join(" ")}" -- "$cur") ) ;;
    --operation|-o) COMPREPLY=( $(compgen -W "${operations.join(" ")}" -- "$cur") ) ;;
    --format|-f)    COMPREPLY=( $(compgen -W "${formats.join(" ")}" -- "$cur") ) ;;
    --controller|-c) COMPREPLY=( $(compgen -W "${controllers.join(" ")}" -- "$cur") ) ;;
    --gcode|-g)     COMPREPLY=( $(compgen -f -X '!*.@(nc|NC|gcode|ngc|tap|MIN)' -- "$cur") ) ;;
    *)              COMPREPLY=( $(compgen -W "--material --tool-diameter --flutes --operation --machine --format --optimize --controller --gcode --output --verbose --quiet --help" -- "$cur") ) ;;
  esac
}
complete -F _prism_complete prism
`);
    } else if (shell === "zsh") {
      process.stdout.write(`# PRISM CLI zsh completion — add to ~/.zshrc:
#   source <(prism completion zsh)
_prism() {
  local -a commands=(${commands.map(c => `'${c}'`).join(" ")})
  local -a materials=(${materials.map(m => `'${m}'`).join(" ")})
  local -a operations=(${operations.map(o => `'${o}'`).join(" ")})
  local -a formats=(${formats.map(f => `'${f}'`).join(" ")})
  local -a controllers=(${controllers.map(c => `'${c}'`).join(" ")})

  _arguments \\
    '1:command:($commands)' \\
    '--material[workpiece material]:material:($materials)' \\
    '--tool-diameter[tool diameter mm]:diameter:' \\
    '--flutes[number of flutes]:flutes:' \\
    '--operation[operation type]:operation:($operations)' \\
    '--format[output format]:format:($formats)' \\
    '--controller[CNC controller]:controller:($controllers)' \\
    '--gcode[G-code file]:file:_files -g "*.{nc,NC,gcode,ngc,tap,MIN}"' \\
    '--output[output file]:file:_files' \\
    '--verbose[verbose output]' \\
    '--quiet[suppress output]' \\
    '--help[show help]'
}
compdef _prism prism
`);
    } else if (shell === "powershell") {
      process.stdout.write(`# PRISM CLI PowerShell completion — add to $PROFILE:
#   prism completion powershell | Out-String | Invoke-Expression
Register-ArgumentCompleter -CommandName prism -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  $commands = @(${commands.map(c => `'${c}'`).join(", ")})
  $materials = @(${materials.map(m => `'${m}'`).join(", ")})

  $prev = ($commandAst.ToString() -split '\\s+')[-2]
  switch ($prev) {
    '--material' { $materials | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) } }
    default {
      if ($commandAst.ToString() -notmatch '\\s\\w+\\s') {
        $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
      }
    }
  }
}
`);
    } else {
      process.stderr.write(`Unknown shell: ${shell}. Supported: bash, zsh, powershell\n`);
      process.exit(2);
    }
  });

// ── REPL Mode ──
program
  .command("repl")
  .description("Interactive REPL for rapid-fire calculations. Tab completion, history, $last.")
  .action(async () => {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr, // prompts to stderr so stdout stays clean for piping
      prompt: "prism> ",
      historySize: 200,
    });

    let lastResult: unknown = null;
    process.stderr.write(
      "PRISM REPL — type commands without 'prism' prefix.\n" +
      "  sf --material steel --tool-diameter 10 --flutes 4\n" +
      "  playbook --operation roughing\n" +
      "  Use $last to reference previous result. Type .exit to quit.\n\n"
    );
    rl.prompt();

    rl.on("line", async (line: string) => {
      const input = line.trim();
      if (!input) { rl.prompt(); return; }
      if (input === ".exit" || input === "exit" || input === "quit") {
        rl.close();
        process.exit(0);
      }
      if (input === ".help" || input === "help") {
        process.stderr.write("Commands: sf, sim, post, quote, tool, playbook, calc, verify, what-if, batch, pipe\n");
        process.stderr.write("Special: $last (previous result), .exit (quit)\n");
        rl.prompt();
        return;
      }

      // Inject $last as JSON into args if referenced
      let cmdLine = input;
      if (lastResult && cmdLine.includes("$last")) {
        cmdLine = cmdLine.replace(/\$last/g, JSON.stringify(lastResult));
      }

      // Parse and execute as if it were a CLI command
      const args = ["node", "prism", ...cmdLine.split(/\s+/)];
      try {
        // Create a child program parse for the REPL line
        // We use a simpler approach: write args, capture output
        const { execFileSync } = await import("child_process");
        const result = execFileSync(
          process.argv[0],
          [process.argv[1], "--format", "json", ...cmdLine.split(/\s+/)],
          { encoding: "utf-8", timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
        );
        try {
          lastResult = JSON.parse(result);
          process.stdout.write(formatOutput(lastResult, globalFormat) + "\n");
        } catch {
          process.stdout.write(result);
          lastResult = result;
        }
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string };
        process.stderr.write(`Error: ${e.stderr || e.message || "unknown"}\n`);
      }
      rl.prompt();
    });

    rl.on("close", () => process.exit(0));
  });

// Parse and run
program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
