/**
 * WEDMArchiveBackfillEngine — MS-P0.5-COORD U-P0.5-COORD-07
 *
 * Cold-boots the coordination substrate by translating the historical WEDM
 * program archive (WEDM_BATCH_ANALYSIS.json, produced by
 * WEDMBatchProgramAnalyzerEngine) into prior observations on the blackboard,
 * synthetic trace entries on the ledger, and prior observations for the
 * neural formula fusion engine.
 *
 * Without backfill, fresh sessions start with an empty blackboard and zero
 * ledger history — the coordination substrate has no memory of the 20k+
 * programs JM Die has already run. Backfill gives those engines a warm
 * start so tips/adaptive weights reflect real shop practice from minute one.
 *
 * Contract:
 *   - Idempotent: records backfill run IDs in WEDM_BACKFILL_STATE.json so
 *     consecutive runs do not re-post the same programs.
 *   - Fails open: any error posting to blackboard/ledger is logged and
 *     skipped, not raised — backfill is best-effort.
 *   - Summary only: does NOT re-parse NC files (that's
 *     WEDMBatchProgramAnalyzerEngine's job). We consume its output.
 *   - Ledger entries are tagged `awareness_used: false` and
 *     `dispatcher: "archive-backfill"` so runtime queries can distinguish
 *     synthetic from live traces.
 */
import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { wedmBlackboardEngine } from "./WEDMBlackboardEngine.js";
import { wedmReasoningTraceLedgerEngine } from "./WEDMReasoningTraceLedgerEngine.js";
import { wedmNeuralFormulaFusionEngine } from "./WEDMNeuralFormulaFusionEngine.js";

export interface ArchiveProgramRecord {
  filePath: string;
  fileName: string;
  customerName: string;
  dialect?: string;
  eCodes?: string[];
  feedRates?: number[];
  passCount?: number;
  qualityScore?: number;
  estimatedThicknessCategory?: string;
  wireBreakRiskLevel?: string;
  hasAdaptiveControl?: boolean;
  hasMultiPass?: boolean;
}

export interface BackfillOptions {
  batchAnalysisPath?: string;
  ttlMs?: number;
  limit?: number;
  dryRun?: boolean;
}

export interface BackfillRunResult {
  runId: string;
  at: string;
  programsConsidered: number;
  programsBackfilled: number;
  blackboardEntriesPosted: number;
  ledgerEntriesRecorded: number;
  formulaObservationsSeeded: number;
  customersCovered: number;
  dialectsCovered: number;
  skippedReasons: Record<string, number>;
}

interface BackfillStateFile {
  schemaVersion: 1;
  completedRunIds: string[];
  backfilledFilePaths: Record<string, string>;
  lastRunAt: string | null;
  totals: {
    runs: number;
    programs: number;
    blackboardEntries: number;
    ledgerEntries: number;
    formulaObservations: number;
  };
}

const DEFAULT_BATCH_ANALYSIS_PATH = path.resolve(
  process.cwd(),
  "data/state/WEDM_BATCH_ANALYSIS.json",
);
const DEFAULT_STATE_PATH = path.resolve(process.cwd(), "data/state/WEDM_BACKFILL_STATE.json");
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const NAMESPACE_PREFIX = "wedm.archive";

function freshState(): BackfillStateFile {
  return {
    schemaVersion: 1,
    completedRunIds: [],
    backfilledFilePaths: {},
    lastRunAt: null,
    totals: {
      runs: 0,
      programs: 0,
      blackboardEntries: 0,
      ledgerEntries: 0,
      formulaObservations: 0,
    },
  };
}

export class WEDMArchiveBackfillEngine {
  private state: BackfillStateFile = freshState();
  private stateLoaded = false;
  private statePath: string = DEFAULT_STATE_PATH;

  private loadState(statePath?: string): void {
    if (statePath) this.statePath = statePath;
    if (this.stateLoaded) return;
    try {
      if (fs.existsSync(statePath)) {
        const raw = fs.readFileSync(statePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.schemaVersion === 1) {
          this.state = parsed as BackfillStateFile;
        }
      }
    } catch (e) {
      log.warn(`[WEDMArchiveBackfill] state load failed: ${String((e as Error).message)}`);
    }
    this.stateLoaded = true;
  }

  private saveState(): void {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), "utf8");
    } catch (e) {
      log.warn(`[WEDMArchiveBackfill] state save failed: ${String((e as Error).message)}`);
    }
  }

  private loadBatchAnalysis(p: string): { programs: ArchiveProgramRecord[] } | null {
    if (!fs.existsSync(p)) return null;
    try {
      const raw = fs.readFileSync(p, "utf8");
      const parsed = JSON.parse(raw);
      const programs = Array.isArray(parsed?.programs) ? parsed.programs : [];
      return { programs };
    } catch (e) {
      log.warn(
        `[WEDMArchiveBackfill] failed to read ${p}: ${String((e as Error).message)}`,
      );
      return null;
    }
  }

  private classifyMaterial(r: ArchiveProgramRecord): string {
    const hint = `${r.customerName ?? ""} ${r.fileName ?? ""}`.toLowerCase();
    if (hint.includes("carbide")) return "carbide";
    if (hint.includes("d2")) return "D2";
    if (hint.includes("m2")) return "M2";
    if (hint.includes("s7")) return "S7";
    if (hint.includes("a2")) return "A2";
    if (hint.includes("h13")) return "H13";
    return "tool-steel";
  }

  run(opts: BackfillOptions = {}): BackfillRunResult {
    this.loadState();

    const analysisPath = opts.batchAnalysisPath ?? DEFAULT_BATCH_ANALYSIS_PATH;
    const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
    const dryRun = opts.dryRun === true;

    const runId = `backfill-${Date.now().toString(36)}`;
    const runAt = new Date().toISOString();
    const skipped: Record<string, number> = {};
    let blackboardEntries = 0;
    let ledgerEntries = 0;
    let formulaObservations = 0;
    let programsBackfilled = 0;
    const customers = new Set<string>();
    const dialects = new Set<string>();

    const data = this.loadBatchAnalysis(analysisPath);
    if (!data) {
      skipped["batch-analysis-missing"] = 1;
      return {
        runId,
        at: runAt,
        programsConsidered: 0,
        programsBackfilled: 0,
        blackboardEntriesPosted: 0,
        ledgerEntriesRecorded: 0,
        formulaObservationsSeeded: 0,
        customersCovered: 0,
        dialectsCovered: 0,
        skippedReasons: skipped,
      };
    }

    let considered = 0;
    for (const prog of data.programs) {
      if (opts.limit && considered >= opts.limit) break;
      considered++;

      if (!prog || typeof prog !== "object" || !prog.filePath) {
        skipped["invalid-record"] = (skipped["invalid-record"] ?? 0) + 1;
        continue;
      }

      if (this.state.backfilledFilePaths[prog.filePath] && !dryRun) {
        skipped["already-backfilled"] = (skipped["already-backfilled"] ?? 0) + 1;
        continue;
      }

      const material = this.classifyMaterial(prog);
      const namespace = `${NAMESPACE_PREFIX}.mat.${material.toLowerCase()}`;
      const keyBase = `program.${prog.fileName.replace(/\s+/g, "_")}`;

      if (prog.dialect) dialects.add(prog.dialect);
      if (prog.customerName) customers.add(prog.customerName);

      try {
        if (!dryRun) {
          wedmBlackboardEngine.post(
            namespace,
            `${keyBase}.summary`,
            {
              dialect: prog.dialect,
              passCount: prog.passCount,
              feedRates: prog.feedRates,
              qualityScore: prog.qualityScore,
              hasAdaptiveControl: prog.hasAdaptiveControl,
              hasMultiPass: prog.hasMultiPass,
              estimatedThicknessCategory: prog.estimatedThicknessCategory,
            },
            "observation",
            "archive-backfill",
            {
              ttlMs: ttl,
              confidence:
                typeof prog.qualityScore === "number" ? prog.qualityScore / 100 : 0.6,
            },
          );
          blackboardEntries++;
        }

        if (!dryRun && prog.wireBreakRiskLevel && prog.wireBreakRiskLevel !== "low") {
          wedmBlackboardEngine.post(
            namespace,
            `${keyBase}.wire_break_risk`,
            { level: prog.wireBreakRiskLevel },
            "warning",
            "archive-backfill",
            { ttlMs: ttl, confidence: 0.55 },
          );
          blackboardEntries++;
        }

        if (!dryRun) {
          wedmReasoningTraceLedgerEngine.recordTraceSync({
            dispatcher: "archive-backfill",
            action: "ingest-program",
            keywords: [material.toLowerCase(), prog.dialect ?? "unknown-dialect"],
            awareness_used: false,
            inputs_summary: {
              filePath: prog.filePath,
              customer: prog.customerName,
              fileName: prog.fileName,
            },
            outputs_summary: {
              qualityScore: prog.qualityScore,
              passCount: prog.passCount,
              feedRates: prog.feedRates,
            },
            confidence:
              typeof prog.qualityScore === "number" ? prog.qualityScore / 100 : 0.6,
          });
          ledgerEntries++;
        }

        if (
          !dryRun &&
          prog.feedRates &&
          prog.feedRates.length > 0 &&
          typeof prog.passCount === "number"
        ) {
          const finite = prog.feedRates.filter((f) => Number.isFinite(f) && f > 0);
          if (finite.length > 0) {
            const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
            wedmNeuralFormulaFusionEngine.recordObservation(
              [{ source: "archive-historical", value: mean }],
              mean,
              { target: "feed-rate", material, operation: "wire_edm" },
            );
            formulaObservations++;
          }
        }

        if (!dryRun) {
          this.state.backfilledFilePaths[prog.filePath] = runId;
        }
        programsBackfilled++;
      } catch (e) {
        skipped["post-error"] = (skipped["post-error"] ?? 0) + 1;
        log.warn(
          `[WEDMArchiveBackfill] failed on ${prog.fileName}: ${String((e as Error).message)}`,
        );
      }
    }

    if (!dryRun) {
      this.state.completedRunIds.push(runId);
      this.state.lastRunAt = runAt;
      this.state.totals.runs++;
      this.state.totals.programs += programsBackfilled;
      this.state.totals.blackboardEntries += blackboardEntries;
      this.state.totals.ledgerEntries += ledgerEntries;
      this.state.totals.formulaObservations += formulaObservations;
      this.saveState();
    }

    return {
      runId,
      at: runAt,
      programsConsidered: considered,
      programsBackfilled,
      blackboardEntriesPosted: blackboardEntries,
      ledgerEntriesRecorded: ledgerEntries,
      formulaObservationsSeeded: formulaObservations,
      customersCovered: customers.size,
      dialectsCovered: dialects.size,
      skippedReasons: skipped,
    };
  }

  getState(): Readonly<BackfillStateFile> {
    this.loadState();
    return this.state;
  }

  hasBeenBackfilled(filePath: string): boolean {
    this.loadState();
    return !!this.state.backfilledFilePaths[filePath];
  }

  resetForTests(): void {
    this.state = freshState();
    this.stateLoaded = true;
    this.statePath = DEFAULT_STATE_PATH;
  }

  overrideStatePathForTests(p: string): void {
    this.statePath = p;
    this.state = freshState();
    this.stateLoaded = false;
  }
}

export const wedmArchiveBackfillEngine = new WEDMArchiveBackfillEngine();
