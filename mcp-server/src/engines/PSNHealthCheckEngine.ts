/**
 * PSNHealthCheckEngine — HZD-PSN-01 (HZP-DASH-PSN-MS0)
 *
 * Pure-core PSN-leg health classifier. Given raw signal data for each of
 * the 11 PSN legs (Obsidian brain · PRISM OS · Wiki · Memories · Tribal ·
 * System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI), returns
 * a normalized health record per leg with status pill + 1-line signal.
 *
 * The CALLER does the I/O (reads from disk into the LegInputs shape); this
 * engine is the deterministic classification stage. Lets the dashboard
 * generator + tests use the same algorithm without disk dependencies.
 *
 * Status taxonomy:
 *   green  = healthy AND recent activity (<24h for most legs)
 *   amber  = stale OR degraded (signal exists but missing freshness/quality target)
 *   red    = error / dormant / missing / broken (caller should act)
 *   unknown = signal source missing on disk; never lies about state
 *
 * Reference: state/shared/specs/HERMES-DASH-DEEP-RESEARCH-2026-05-25.md
 */
import { z } from "zod";

export type LegStatus = "green" | "amber" | "red" | "unknown";

/** Inputs the caller assembles from disk; engine doesn't read filesystem. */
export const LegInputsSchema = z.object({
  obsidian:  z.object({ memoryCount: z.number().int().nonnegative(), lastMemoryAgeMin: z.number().nonnegative() }).optional(),
  prismOs:   z.object({ actionCount: z.number().int().nonnegative(), lastInvocationAgeMin: z.number().nonnegative().nullable() }).optional(),
  wiki:      z.object({ entryCount: z.number().int().nonnegative(), brokenLinkPct: z.number().min(0).max(100) }).optional(),
  memories:  z.object({ indexSizeLines: z.number().int().nonnegative(), truncated: z.boolean() }).optional(),
  tribal:    z.object({ corpusEntryCount: z.number().int().nonnegative(), domainsWithCoverage: z.number().int().min(0).max(4) }).optional(),
  systemViz: z.object({ graphNodeCount: z.number().int().nonnegative(), graphAgeMin: z.number().nonnegative() }).optional(),
  engines:   z.object({ built: z.number().int().nonnegative(), wired: z.number().int().nonnegative(), unwired: z.number().int().nonnegative() }).optional(),
  algorithms:z.object({ count: z.number().int().nonnegative() }).optional(),
  formulas:  z.object({ constantsFileExists: z.boolean(), inlinedViolations: z.number().int().nonnegative() }).optional(),
  nnGnn:     z.object({ auroc: z.number().nullable(), brier: z.number().nullable(), promoted: z.boolean() }).optional(),
  prismAi:   z.object({ engineCount: z.number().int().nonnegative(), memoCoveragePct: z.number().min(0).max(100) }).optional(),
});
export type LegInputs = z.infer<typeof LegInputsSchema>;

export interface LegHealth {
  id: number;
  name: string;
  status: LegStatus;
  signal: string;
}

export interface PSNHealthReport {
  schema_version: "psn-health-1.0.0";
  generated_at: string;
  legs: LegHealth[];
  summary: { green: number; amber: number; red: number; unknown: number };
}

// Thresholds — adjust here for fleet calibration; centralized rather than scattered.
const STALE_MEMORY_MIN     = 24 * 60;    // 24h
const STALE_GRAPH_MIN      = 6 * 60;     // 6h (graph regen target)
const STALE_PRISM_OS_MIN   = 60;         // 1h since any action invoked
const BROKEN_LINK_AMBER    = 2.0;        // 2% broken link ratio amber-zone
const BROKEN_LINK_RED      = 5.0;        // 5% red
const TRIBAL_MIN_DOMAINS   = 3;          // green requires ≥3 of 4 domains covered
const NN_AUROC_PROMOTE     = 0.78;       // matches CLAUDE.md NN promotion gate
const NN_BRIER_PROMOTE     = 0.15;
const MEMO_COVERAGE_AMBER  = 75.0;       // 75% memo coverage = amber threshold
const MEMO_COVERAGE_RED    = 50.0;
const UNWIRED_AMBER_PCT    = 10.0;       // unwired/(built) > 10% = amber
const UNWIRED_RED_PCT      = 25.0;

function classifyObsidian(i: NonNullable<LegInputs["obsidian"]>): { status: LegStatus; signal: string } {
  if (i.memoryCount === 0) return { status: "red", signal: "no memories on disk" };
  if (i.lastMemoryAgeMin > STALE_MEMORY_MIN) {
    return { status: "amber", signal: `${i.memoryCount} memories, newest ${Math.round(i.lastMemoryAgeMin / 60)}h old` };
  }
  return { status: "green", signal: `${i.memoryCount} memories, newest ${Math.round(i.lastMemoryAgeMin)}m old` };
}

function classifyPrismOs(i: NonNullable<LegInputs["prismOs"]>): { status: LegStatus; signal: string } {
  if (i.actionCount === 0) return { status: "red", signal: "prism_operating_system has 0 actions" };
  if (i.lastInvocationAgeMin === null) return { status: "amber", signal: `${i.actionCount} actions, no invocation log` };
  if (i.lastInvocationAgeMin > STALE_PRISM_OS_MIN) {
    return { status: "amber", signal: `${i.actionCount} actions, last call ${Math.round(i.lastInvocationAgeMin)}m ago` };
  }
  return { status: "green", signal: `${i.actionCount} actions, last ${Math.round(i.lastInvocationAgeMin)}m ago` };
}

function classifyWiki(i: NonNullable<LegInputs["wiki"]>): { status: LegStatus; signal: string } {
  if (i.entryCount === 0) return { status: "red", signal: "wiki empty" };
  if (i.brokenLinkPct >= BROKEN_LINK_RED) {
    return { status: "red", signal: `${i.entryCount} entries, ${i.brokenLinkPct.toFixed(1)}% broken links` };
  }
  if (i.brokenLinkPct >= BROKEN_LINK_AMBER) {
    return { status: "amber", signal: `${i.entryCount} entries, ${i.brokenLinkPct.toFixed(1)}% broken links` };
  }
  return { status: "green", signal: `${i.entryCount} entries, ${i.brokenLinkPct.toFixed(1)}% broken` };
}

function classifyMemories(i: NonNullable<LegInputs["memories"]>): { status: LegStatus; signal: string } {
  if (i.indexSizeLines === 0) return { status: "red", signal: "MEMORY.md empty" };
  if (i.truncated) return { status: "amber", signal: `${i.indexSizeLines} lines, TRUNCATED` };
  return { status: "green", signal: `${i.indexSizeLines} index lines` };
}

function classifyTribal(i: NonNullable<LegInputs["tribal"]>): { status: LegStatus; signal: string } {
  if (i.corpusEntryCount === 0) return { status: "red", signal: "tribal corpus empty" };
  if (i.domainsWithCoverage < TRIBAL_MIN_DOMAINS) {
    return { status: "amber", signal: `${i.corpusEntryCount} entries, ${i.domainsWithCoverage}/4 domains covered` };
  }
  return { status: "green", signal: `${i.corpusEntryCount} entries, ${i.domainsWithCoverage}/4 domains` };
}

function classifySystemViz(i: NonNullable<LegInputs["systemViz"]>): { status: LegStatus; signal: string } {
  if (i.graphNodeCount === 0) return { status: "red", signal: "system-graph.json missing/empty" };
  if (i.graphAgeMin > STALE_GRAPH_MIN) {
    return { status: "amber", signal: `${i.graphNodeCount} nodes, graph ${Math.round(i.graphAgeMin / 60)}h old` };
  }
  return { status: "green", signal: `${i.graphNodeCount} nodes, ${Math.round(i.graphAgeMin)}m fresh` };
}

function classifyEngines(i: NonNullable<LegInputs["engines"]>): { status: LegStatus; signal: string } {
  if (i.built === 0) return { status: "red", signal: "no engines built" };
  const unwiredPct = (i.unwired / i.built) * 100;
  if (unwiredPct >= UNWIRED_RED_PCT) return { status: "red", signal: `${i.built} built, ${i.unwired} unwired (${unwiredPct.toFixed(1)}%)` };
  if (unwiredPct >= UNWIRED_AMBER_PCT) return { status: "amber", signal: `${i.built} built, ${i.unwired} unwired (${unwiredPct.toFixed(1)}%)` };
  return { status: "green", signal: `${i.built} built, ${i.wired} wired` };
}

function classifyAlgorithms(i: NonNullable<LegInputs["algorithms"]>): { status: LegStatus; signal: string } {
  if (i.count === 0) return { status: "red", signal: "no algorithms registered" };
  return { status: "green", signal: `${i.count} algorithms` };
}

function classifyFormulas(i: NonNullable<LegInputs["formulas"]>): { status: LegStatus; signal: string } {
  if (!i.constantsFileExists) return { status: "red", signal: "constants.ts MISSING" };
  if (i.inlinedViolations > 0) return { status: "red", signal: `${i.inlinedViolations} inlined-constant violations` };
  return { status: "green", signal: "constants.ts canonical, no inlined violations" };
}

function classifyNnGnn(i: NonNullable<LegInputs["nnGnn"]>): { status: LegStatus; signal: string } {
  if (i.auroc === null) return { status: "red", signal: "AUROC UNGRADED (eval deferred)" };
  if (i.promoted) return { status: "green", signal: `AUROC ${i.auroc.toFixed(3)}, Brier ${i.brier?.toFixed(3) ?? "?"} (PROMOTED)` };
  const gateOk = i.auroc >= NN_AUROC_PROMOTE && (i.brier ?? 1) <= NN_BRIER_PROMOTE;
  if (gateOk) return { status: "amber", signal: `AUROC ${i.auroc.toFixed(3)}, Brier ${i.brier?.toFixed(3)} (gate met, awaiting promotion)` };
  return { status: "amber", signal: `AUROC ${i.auroc.toFixed(3)} < ${NN_AUROC_PROMOTE} gate` };
}

function classifyPrismAi(i: NonNullable<LegInputs["prismAi"]>): { status: LegStatus; signal: string } {
  if (i.engineCount === 0) return { status: "red", signal: "no PRISM-AI engines" };
  if (i.memoCoveragePct < MEMO_COVERAGE_RED) {
    return { status: "red", signal: `${i.engineCount} engines, ${i.memoCoveragePct.toFixed(1)}% memo coverage` };
  }
  if (i.memoCoveragePct < MEMO_COVERAGE_AMBER) {
    return { status: "amber", signal: `${i.engineCount} engines, ${i.memoCoveragePct.toFixed(1)}% memo coverage` };
  }
  return { status: "green", signal: `${i.engineCount} engines, ${i.memoCoveragePct.toFixed(1)}% memo coverage` };
}

const LEG_NAMES: readonly { id: number; name: string; key: keyof LegInputs }[] = [
  { id: 1,  name: "Obsidian brain",   key: "obsidian"   },
  { id: 2,  name: "PRISM OS",         key: "prismOs"    },
  { id: 3,  name: "Wiki",             key: "wiki"       },
  { id: 4,  name: "Memories",         key: "memories"   },
  { id: 5,  name: "Tribal",           key: "tribal"     },
  { id: 6,  name: "System Viz",       key: "systemViz"  },
  { id: 7,  name: "Engines",          key: "engines"    },
  { id: 8,  name: "Algorithms",       key: "algorithms" },
  { id: 9,  name: "Formulas",         key: "formulas"   },
  { id: 10, name: "NN/GNN",           key: "nnGnn"      },
  { id: 11, name: "PRISM AI",         key: "prismAi"    },
];

const CLASSIFIERS: Record<keyof LegInputs, (i: never) => { status: LegStatus; signal: string }> = {
  obsidian:   classifyObsidian   as never,
  prismOs:    classifyPrismOs    as never,
  wiki:       classifyWiki       as never,
  memories:   classifyMemories   as never,
  tribal:     classifyTribal     as never,
  systemViz:  classifySystemViz  as never,
  engines:    classifyEngines    as never,
  algorithms: classifyAlgorithms as never,
  formulas:   classifyFormulas   as never,
  nnGnn:      classifyNnGnn      as never,
  prismAi:    classifyPrismAi    as never,
};

export class PSNHealthCheckEngine {
  /**
   * Classify the health of all 11 PSN legs given the assembled signal inputs.
   * Missing legs (no input data) render as { status: "unknown" } — never
   * fail-loud. The caller (generator script) decides what to do about
   * unknowns.
   */
  static check(rawInputs: LegInputs): PSNHealthReport {
    const inputs = LegInputsSchema.parse(rawInputs);
    const legs: LegHealth[] = LEG_NAMES.map((leg) => {
      const data = inputs[leg.key];
      if (!data) {
        return { id: leg.id, name: leg.name, status: "unknown" as const, signal: "input missing — generator failed to assemble" };
      }
      const cls = CLASSIFIERS[leg.key](data as never);
      return { id: leg.id, name: leg.name, status: cls.status, signal: cls.signal };
    });
    const summary = { green: 0, amber: 0, red: 0, unknown: 0 };
    for (const l of legs) summary[l.status]++;
    return { schema_version: "psn-health-1.0.0", generated_at: new Date().toISOString(), legs, summary };
  }

  /** Render a single-line summary for log/audit. */
  static renderSummary(r: PSNHealthReport): string {
    const s = r.summary;
    return `[PSN-HEALTH] green=${s.green} amber=${s.amber} red=${s.red} unknown=${s.unknown}`;
  }
}
