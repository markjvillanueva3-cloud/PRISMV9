/**
 * CADToSTEPPipelineEngine — end-to-end format-agnostic CAD→STEP pipeline.
 *
 * Orchestrates the full ground-truth ingestion pipeline for the 20,006-file CAD
 * corpus: identify format → select bridge/strategy → open → exportSTEP →
 * validate STEP output (AP214/AP242 schema sniff) → close → emit structured
 * result. Failures fall through an ordered strategy chain (native bridge →
 * native-parser fallback → manual-trigger) so a single missing CAD application
 * does not orphan a file.
 *
 * Composes (does NOT duplicate):
 *   - CADAutomationRouter (E1307)        — primary format → bridge dispatch
 *   - CADAutomationMockLayer (E1306)     — fixture-backed mock support
 *   - FCStdNativeParserEngine (E2502)    — fallback diagnostics for .FCStd
 *   - F3DSQLiteParserEngine              — fallback diagnostics for .f3d
 *
 * Mock mode: PRISM_CAD_MOCK=1 short-circuits bridge spawn and synthesizes a
 * minimal AP242-conforming STEP header at outputPath so the validation step
 * exercises identical code paths on CI without requiring a CAD installation.
 *
 * Duplication check: keywords [cad, step, pipeline, ap214, ap242, ground-truth]
 *   → No existing CADToSTEPPipelineEngine found.
 *   → CADAutomationRouter does extension dispatch but NOT validation/fallback.
 *   → No engine validates STEP file headers for AP214/AP242 schema markers.
 *
 * @engine CADToSTEPPipelineEngine
 * @shortcode E2503
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT03
 * @classification STANDARD (orchestration, no physics constants)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import {
  cadAutomationRouter,
  type CADBridgeKind,
} from "./CADAutomationRouter.js";
import type { SupportedCADExt } from "./CADAutomationMockLayer.js";

// ── AtomicValue<T> (matching project pattern) ────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
}

// ── Domain types ─────────────────────────────────────────────────────────────

export type CADStrategy =
  | "native-bridge"
  | "native-parser-fallback"
  | "manual-trigger";

/** STEP schema flavor detected from FILE_SCHEMA header. */
export type StepSchemaName =
  | "AP214"
  | "AP242"
  | "AP203"
  | "AP203E2"
  | "unknown";

export interface StepValidationResult {
  /** True when file contains an ISO-10303 STEP header with a recognized schema. */
  valid: boolean;
  /** Detected schema name from FILE_SCHEMA token. */
  schema: StepSchemaName;
  /** Raw FILE_SCHEMA value as it appears in the file (verbatim). */
  rawSchema?: string;
  /** Bytes inspected (cap = 8192). */
  inspectedBytes: number;
  /** Diagnostic notes (missing markers, malformed sections). */
  issues: string[];
}

export interface PipelineAttempt {
  strategy: CADStrategy;
  ok: boolean;
  durationMs: number;
  error?: string;
}

export interface PipelineResult {
  filePath: string;
  outputPath: string;
  bridge: CADBridgeKind | null;
  ext: SupportedCADExt | null;
  strategyUsed: CADStrategy | null;
  attempts: PipelineAttempt[];
  validation: StepValidationResult;
  totalDurationMs: number;
  success: boolean;
  error?: string;
}

export interface BatchSummary {
  total: number;
  ok: number;
  failed: number;
  byStrategy: Partial<Record<CADStrategy, number>>;
  byExt: Partial<Record<SupportedCADExt, { ok: number; failed: number }>>;
  results: PipelineResult[];
}

// ── Constants ────────────────────────────────────────────────────────────────

/** ISO-10303 STEP header bytes that every legitimate STEP file begins with. */
const STEP_MAGIC = "ISO-10303-21";

/** Maximum header bytes to read when sniffing schema. */
const HEADER_INSPECT_BYTES = 8192;

/** Synthetic STEP header written in mock mode so validation round-trip works. */
const MOCK_STEP_HEADER = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('PRISM mock export'),'2;1');
FILE_NAME('mock.step','2026-01-01T00:00:00',('PRISM'),(''),'PRISM','PRISM','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 242 1 1 4 }'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;
`;

/** Strategy precedence per format. Primary first, fallbacks in order. */
const STRATEGY_CHAIN_BY_EXT: Record<SupportedCADExt, readonly CADStrategy[]> = {
  ".sldprt": ["native-bridge", "manual-trigger"],
  ".sldasm": ["native-bridge", "manual-trigger"],
  ".ipt": ["native-bridge", "manual-trigger"],
  ".iam": ["native-bridge", "manual-trigger"],
  ".FCStd": ["native-bridge", "native-parser-fallback", "manual-trigger"],
  ".FCStd1": ["native-bridge", "native-parser-fallback", "manual-trigger"],
  ".mcam": ["native-bridge", "manual-trigger"],
  ".mcx": ["native-bridge", "manual-trigger"],
  ".mcx-8": ["native-bridge", "manual-trigger"],
  ".f3d": ["native-bridge", "native-parser-fallback", "manual-trigger"],
  ".f3z": ["native-bridge", "native-parser-fallback", "manual-trigger"],
  ".hmc": ["native-bridge", "manual-trigger"],
};

// ── Zod input schemas ────────────────────────────────────────────────────────

const RunPipelineInputSchema = z
  .object({
    filePath: z.string().min(1, "filePath must be a non-empty string"),
    outputPath: z.string().min(1, "outputPath must be a non-empty string"),
    /** When true, parent directory of outputPath must exist. Default true. */
    requireOutputParent: z.boolean().optional().default(true),
    /** When true, validate the STEP after export. Default true. */
    validate: z.boolean().optional().default(true),
  })
  .strict();

const BatchInputSchema = z
  .object({
    items: z
      .array(
        z.object({
          filePath: z.string().min(1),
          outputPath: z.string().min(1),
        }),
      )
      .min(1, "Batch requires at least one item"),
    /** Continue on individual failure. Default true. */
    continueOnError: z.boolean().optional().default(true),
  })
  .strict();

export type RunPipelineInput = z.input<typeof RunPipelineInputSchema>;
export type BatchInput = z.input<typeof BatchInputSchema>;

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * CADToSTEPPipelineEngine — orchestrates CAD-to-STEP conversion across all six
 * supported CAD systems with strategy chaining and STEP header validation.
 */
export class CADToSTEPPipelineEngine {
  private get isMock(): boolean {
    return process.env["PRISM_CAD_MOCK"] === "1";
  }

  /**
   * Returns the ordered strategy chain for a given CAD extension.
   * Primary strategy first, then fallbacks.
   * @param ext CAD file extension (canonical case, e.g. ".FCStd")
   * @throws Error when ext is not supported
   */
  selectStrategy(ext: SupportedCADExt): readonly CADStrategy[] {
    const chain = STRATEGY_CHAIN_BY_EXT[ext];
    if (!chain) {
      throw new Error(
        `[CADToSTEPPipelineEngine] No strategy chain registered for ${ext}`,
      );
    }
    return chain;
  }

  /**
   * List every CAD extension this pipeline can process.
   * Delegates to CADAutomationRouter so the two stay in lock-step.
   */
  listSupportedExtensions(): readonly SupportedCADExt[] {
    return cadAutomationRouter.listSupportedExtensions();
  }

  /**
   * Run the full identify → open → exportSTEP → validate → close pipeline.
   * Tries each strategy in order until one succeeds.
   *
   * @param input file/output paths + flags (validated via Zod)
   * @returns structured PipelineResult — never throws on bridge failure;
   *          unsupported-extension and Zod errors DO throw (programmer errors).
   */
  async runPipeline(input: RunPipelineInput): Promise<PipelineResult> {
    const parsed = RunPipelineInputSchema.parse(input);
    const filePath = parsed.filePath;
    const outputPath = parsed.outputPath;
    const startedAt = Date.now();

    if (parsed.requireOutputParent) {
      const parent = path.dirname(outputPath);
      if (!fs.existsSync(parent)) {
        return this.makeFailureResult({
          filePath,
          outputPath,
          totalDurationMs: Date.now() - startedAt,
          error: `Output parent directory does not exist: ${parent}`,
          attempts: [],
        });
      }
    }

    let routing: { bridge: CADBridgeKind; ext: SupportedCADExt };
    try {
      const decision = cadAutomationRouter.route(filePath);
      routing = { bridge: decision.bridge, ext: decision.ext };
    } catch (err) {
      return this.makeFailureResult({
        filePath,
        outputPath,
        totalDurationMs: Date.now() - startedAt,
        error: `Routing failed: ${(err as Error).message}`,
        attempts: [],
      });
    }

    const chain = this.selectStrategy(routing.ext);
    const attempts: PipelineAttempt[] = [];
    let strategyUsed: CADStrategy | null = null;
    let success = false;
    let lastErr: string | undefined;

    for (const strategy of chain) {
      const attemptStart = Date.now();
      try {
        await this.executeStrategy(strategy, filePath, outputPath);
        attempts.push({
          strategy,
          ok: true,
          durationMs: Date.now() - attemptStart,
        });
        strategyUsed = strategy;
        success = true;
        break;
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        attempts.push({
          strategy,
          ok: false,
          durationMs: Date.now() - attemptStart,
          error: message,
        });
        lastErr = message;
        log.warn(
          `[CADToSTEPPipelineEngine] strategy ${strategy} failed for ${filePath}: ${message}`,
        );
      }
    }

    const validation = parsed.validate && success
      ? this.validateSTEP(outputPath)
      : this.emptyValidation();

    return {
      filePath,
      outputPath,
      bridge: routing.bridge,
      ext: routing.ext,
      strategyUsed,
      attempts,
      validation,
      totalDurationMs: Date.now() - startedAt,
      success: success && (parsed.validate ? validation.valid : true),
      error: success ? undefined : lastErr,
    };
  }

  /**
   * Validate a STEP file's header for ISO-10303 marker + recognized AP schema.
   * Inspects up to {@link HEADER_INSPECT_BYTES} bytes from the file head.
   *
   * @param stepFilePath absolute or relative path to candidate STEP file
   */
  validateSTEP(stepFilePath: string): StepValidationResult {
    if (!fs.existsSync(stepFilePath)) {
      return {
        valid: false,
        schema: "unknown",
        inspectedBytes: 0,
        issues: [`File does not exist: ${stepFilePath}`],
      };
    }
    let stat: fs.Stats;
    try {
      stat = fs.statSync(stepFilePath);
    } catch (err) {
      return {
        valid: false,
        schema: "unknown",
        inspectedBytes: 0,
        issues: [`stat failed: ${(err as Error).message}`],
      };
    }
    if (!stat.isFile()) {
      return {
        valid: false,
        schema: "unknown",
        inspectedBytes: 0,
        issues: [`Not a regular file: ${stepFilePath}`],
      };
    }
    const bytesToRead = Math.min(stat.size, HEADER_INSPECT_BYTES);
    const buf = Buffer.alloc(bytesToRead);
    const fd = fs.openSync(stepFilePath, "r");
    let read = 0;
    try {
      read = fs.readSync(fd, buf, 0, bytesToRead, 0);
    } finally {
      fs.closeSync(fd);
    }
    const text = buf.subarray(0, read).toString("utf8");
    return this.parseStepHeader(text, read);
  }

  /**
   * Run the pipeline over a batch of CAD files.
   * @param input { items, continueOnError }
   */
  async runBatch(input: BatchInput): Promise<BatchSummary> {
    const parsed = BatchInputSchema.parse(input);
    const results: PipelineResult[] = [];
    const byStrategy: Partial<Record<CADStrategy, number>> = {};
    const byExt: Partial<Record<SupportedCADExt, { ok: number; failed: number }>> = {};
    let ok = 0;
    let failed = 0;

    for (const item of parsed.items) {
      const r = await this.runPipeline({
        filePath: item.filePath,
        outputPath: item.outputPath,
      });
      results.push(r);
      if (r.success) {
        ok++;
        if (r.strategyUsed) {
          byStrategy[r.strategyUsed] = (byStrategy[r.strategyUsed] ?? 0) + 1;
        }
        if (r.ext) {
          const slot = byExt[r.ext] ?? { ok: 0, failed: 0 };
          slot.ok++;
          byExt[r.ext] = slot;
        }
      } else {
        failed++;
        if (r.ext) {
          const slot = byExt[r.ext] ?? { ok: 0, failed: 0 };
          slot.failed++;
          byExt[r.ext] = slot;
        }
        if (!parsed.continueOnError) break;
      }
    }

    return {
      total: parsed.items.length,
      ok,
      failed,
      byStrategy,
      byExt,
      results,
    };
  }

  // ── Strategy execution ─────────────────────────────────────────────────────

  private async executeStrategy(
    strategy: CADStrategy,
    filePath: string,
    outputPath: string,
  ): Promise<void> {
    switch (strategy) {
      case "native-bridge":
        return this.runNativeBridgeStrategy(filePath, outputPath);
      case "native-parser-fallback":
        return this.runNativeParserFallback(filePath, outputPath);
      case "manual-trigger":
        return this.runManualTrigger(filePath, outputPath);
    }
  }

  /** Primary path: route through CADAutomationRouter to the matching bridge. */
  private async runNativeBridgeStrategy(
    filePath: string,
    outputPath: string,
  ): Promise<void> {
    await cadAutomationRouter.open(filePath);
    try {
      const exported = await cadAutomationRouter.exportSTEP(filePath, outputPath);
      if (!exported || !exported.value) {
        throw new Error("Bridge returned empty exportSTEP envelope");
      }
      // In mock mode the router does not touch disk — synthesize a STEP file so
      // the downstream validation step exercises the same code path as live.
      if (this.isMock) {
        fs.writeFileSync(outputPath, MOCK_STEP_HEADER, "utf8");
      } else if (!fs.existsSync(outputPath)) {
        throw new Error(
          `Bridge reported success but no file at ${outputPath}`,
        );
      }
    } finally {
      try {
        await cadAutomationRouter.close(filePath);
      } catch (closeErr) {
        log.warn(
          `[CADToSTEPPipelineEngine] close warn: ${(closeErr as Error).message}`,
        );
      }
    }
  }

  /**
   * Fallback for formats that have a native PRISM parser (.FCStd, .f3d).
   * The native parsers extract feature trees, NOT STEP geometry — so this
   * strategy intentionally raises a structured error indicating that STEP
   * synthesis from a feature tree alone is not implemented in-process; a
   * downstream caller should escalate to manual-trigger or wire an OCCT
   * dependency. Throwing keeps the chain advancing to the next strategy.
   */
  private async runNativeParserFallback(
    filePath: string,
    _outputPath: string,
  ): Promise<void> {
    throw new Error(
      `Native-parser fallback for ${path.extname(filePath)} cannot synthesize STEP without an OCCT-equivalent kernel; advance to manual-trigger`,
    );
  }

  /**
   * Last-resort fallback: emit a marker file describing the queued manual
   * export so an operator can complete it offline. Never silently succeeds —
   * the caller learns exactly which file is queued.
   */
  private async runManualTrigger(
    filePath: string,
    outputPath: string,
  ): Promise<void> {
    const marker = `${outputPath}.manual-pending.json`;
    const payload = {
      schemaVersion: 1,
      filePath,
      outputPath,
      queuedAt: new Date().toISOString(),
      reason: "All automated strategies failed; operator action required",
    };
    fs.writeFileSync(marker, JSON.stringify(payload, null, 2), "utf8");
    throw new Error(
      `Manual-trigger strategy queued ${path.basename(filePath)}; operator must complete export. Marker: ${marker}`,
    );
  }

  // ── STEP header parsing ────────────────────────────────────────────────────

  private parseStepHeader(text: string, inspectedBytes: number): StepValidationResult {
    const issues: string[] = [];
    if (!text.includes(STEP_MAGIC)) {
      return {
        valid: false,
        schema: "unknown",
        inspectedBytes,
        issues: [`Missing ISO-10303-21 magic in first ${inspectedBytes} bytes`],
      };
    }
    const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
    if (!schemaMatch) {
      issues.push("FILE_SCHEMA token not found");
      return {
        valid: false,
        schema: "unknown",
        inspectedBytes,
        issues,
      };
    }
    const rawSchema = schemaMatch[1] ?? "";
    const schema = this.classifySchema(rawSchema);
    if (schema === "unknown") {
      issues.push(`Unrecognized schema string: ${rawSchema}`);
    }
    return {
      valid: schema !== "unknown",
      schema,
      rawSchema,
      inspectedBytes,
      issues,
    };
  }

  private classifySchema(raw: string): StepSchemaName {
    const upper = raw.toUpperCase();
    if (upper.includes("242")) return "AP242";
    if (upper.includes("214")) return "AP214";
    if (upper.includes("203E2") || upper.includes("203 E2")) return "AP203E2";
    if (upper.includes("203")) return "AP203";
    // AUTOMOTIVE_DESIGN historically maps to AP214; PDM_SCHEMA → AP214 dialect.
    if (upper.includes("AUTOMOTIVE_DESIGN")) {
      // discriminate by year/version markers if present
      if (upper.includes("242")) return "AP242";
      return "AP214";
    }
    return "unknown";
  }

  private emptyValidation(): StepValidationResult {
    return {
      valid: false,
      schema: "unknown",
      inspectedBytes: 0,
      issues: ["validation skipped"],
    };
  }

  private makeFailureResult(args: {
    filePath: string;
    outputPath: string;
    totalDurationMs: number;
    error: string;
    attempts: PipelineAttempt[];
  }): PipelineResult {
    return {
      filePath: args.filePath,
      outputPath: args.outputPath,
      bridge: null,
      ext: null,
      strategyUsed: null,
      attempts: args.attempts,
      validation: this.emptyValidation(),
      totalDurationMs: args.totalDurationMs,
      success: false,
      error: args.error,
    };
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const cadToSTEPPipelineEngine = new CADToSTEPPipelineEngine();
