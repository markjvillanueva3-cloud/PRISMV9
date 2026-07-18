/**
 * multi-endpoint-wiring-audit.ts — Multi-endpoint wiring analyzer
 *
 * Scans every dispatcher under src/tools/dispatchers/ to build a bidirectional
 * map (engine <-> dispatcher) of which engine is reachable through which
 * endpoint. Identifies engines that are:
 *
 *   1) wired to exactly one dispatcher but whose name/keywords match domains
 *      owned by OTHER dispatchers (logical multi-use candidates), and
 *   2) wired to zero dispatchers (orphans, already surfaced elsewhere but
 *      re-reported here for completeness), and
 *   3) wired to >=2 dispatchers (proves the pattern; sanity control).
 *
 * Output: mcp-server/data/state/MULTI_ENDPOINT_WIRING_AUDIT.json
 *
 * Measurement-only: does NOT edit any dispatcher. Safe to run concurrently
 * with USSH-OPUS47 wiring passes.
 *
 * Usage: npx tsx mcp-server/scripts/multi-endpoint-wiring-audit.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

// ─── Paths ──────────────────────────────────────────────────────────────────

function resolveDir(rel: string): string {
  if (existsSync(rel)) return rel;
  const mcp = path.join("mcp-server", rel);
  if (existsSync(mcp)) return mcp;
  throw new Error(`cannot resolve ${rel} from cwd=${process.cwd()}`);
}

const DISPATCHERS_DIR = resolveDir("src/tools/dispatchers");
const ENGINES_DIR = resolveDir("src/engines");
const STATE_DIR = (() => {
  const candidate = existsSync("mcp-server/data/state") ? "mcp-server/data/state" : "data/state";
  mkdirSync(candidate, { recursive: true });
  return candidate;
})();

// ─── Domain keyword map per dispatcher ──────────────────────────────────────
// Derived from the dispatcher filename stem. A dispatcher's "domain keywords"
// are the tokens another engine's name could reasonably share before being
// a plausible multi-use candidate.

const DISPATCHER_DOMAIN_KEYWORDS: Record<string, string[]> = {
  adaptiveControl: ["adaptive", "control"],
  agent: ["agent"],
  aiReasoning: ["ai", "reasoning", "intelligence", "learning", "neural", "cognitive", "metacog", "synthesis", "inference"],
  algorithm: ["algorithm"],
  atcs: ["atcs", "autonomous"],
  auth: ["auth", "authorization", "permission", "security", "rbac"],
  autoPilot: ["autopilot", "pilot"],
  automation: ["automation", "automate"],
  autonomous: ["autonomous"],
  bridge: ["bridge"],
  business: ["business", "quote", "cost", "oee", "capacity", "invoice"],
  cadAutomation: ["cad", "automation"],
  cad: ["cad", "drawing", "geometry", "dxf", "dwg", "iges", "parasolid", "step"],
  cadDrawingKnowledge: ["cad", "drawing", "knowledge"],
  cadRegression: ["cad", "regression"],
  calc: ["calc", "force", "cutting", "kienzle", "taylor", "deflection", "thermal", "speed", "feed", "wear", "chatter", "stability", "surface"],
  cam: ["cam", "toolpath", "strategy", "mastercam", "hypermill", "fusion"],
  cncOps: ["cnc", "ops", "operation"],
  compliance: ["compliance", "audit", "iso"],
  context: ["context"],
  cpl: ["cpl"],
  data: ["data"],
  dev: ["dev", "build", "test", "quality", "inventory"],
  diagnosis: ["diagnosis", "diagnostic"],
  document: ["document", "doc"],
  documentLearning: ["document", "learning"],
  edm: ["edm", "wire", "sinker", "spark"],
  export: ["export"],
  feasibility: ["feasibility", "feasible"],
  fluidThermal: ["fluid", "thermal", "coolant"],
  forming: ["form", "forming"],
  generator: ["generator", "generate"],
  grinding: ["grind", "grinding"],
  gsd: ["gsd"],
  guard: ["guard", "safety"],
  holePattern: ["hole", "pattern", "drill"],
  hook: ["hook"],
  inbox: ["inbox"],
  industry: ["industry"],
  infra: ["infra"],
  integration: ["integration"],
  intelligence: ["intelligence", "ai", "reasoning"],
  knowledge: ["knowledge", "tribal"],
  knowledgeExt: ["knowledge", "ext"],
  l2: ["l2"],
  machineLive: ["machine", "live"],
  machineSetup: ["machine", "setup"],
  machiningKb: ["machining", "knowledge"],
  manus: ["manus"],
  materialProcessing: ["material", "processing"],
  mechanical: ["mechanical"],
  memory: ["memory", "session"],
  monitoring: ["monitor", "monitoring", "telemetry"],
  multiOp: ["multi", "op"],
  multiaxisProgram: ["multiaxis", "five", "5axis", "program"],
  nlHook: ["nl", "hook", "language"],
  omega: ["omega"],
  operatingSystem: ["operating", "system"],
  orchestrate: ["orchestrate", "coordinator", "swarm", "workflow"],
  parts: ["part", "parts"],
  pfp: ["pfp"],
  pp: ["pp", "post", "processor"],
  processControl: ["process", "control"],
  product: ["product"],
  provenPipeline: ["proven", "pipeline"],
  quality: ["quality", "spc", "fai", "metrology", "inspection"],
  ralph: ["ralph"],
  realtime: ["realtime", "real"],
  resourceHarvester: ["resource", "harvester", "harvest"],
  resourceHarvesting: ["resource", "harvest", "harvesting"],
  safety: ["safety", "guard"],
  scheduling: ["scheduling", "schedule"],
  scientificMath: ["scientific", "math"],
  secondaryOps: ["secondary", "ops"],
  security: ["security", "auth", "permission"],
  session: ["session", "memory"],
  shopPractice: ["shop", "practice"],
  simulateTask: ["simulate", "simulation"],
  skillScript: ["skill", "script"],
  sp: ["sp"],
  telemetry: ["telemetry", "monitor"],
  tenant: ["tenant"],
  thread: ["thread", "threading"],
  threadingPipeline: ["threading", "pipeline"],
  toolpath: ["toolpath", "path"],
  turning: ["turning", "lathe", "okuma", "fanuc"],
  turningProgram: ["turning", "program"],
  validate: ["validate", "validation"],
  vibrationPhysics: ["vibration", "physics"],
  welding: ["welding", "weld"],
  "5axis": ["5axis", "five", "multiaxis"],
};

// ─── Engine name tokenizer ──────────────────────────────────────────────────

function splitCamel(name: string): string[] {
  return name
    .replace(/Engine$/i, "")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// ─── Scan dispatchers ───────────────────────────────────────────────────────

interface DispatcherRef {
  dispatcher: string;
  engines: Set<string>;
}

function scanDispatchers(): DispatcherRef[] {
  const files = readdirSync(DISPATCHERS_DIR).filter((f) => f.endsWith("Dispatcher.ts"));
  const enginePattern = /["']\.\.\/\.\.\/engines\/([A-Za-z0-9]+)\.js["']/g;
  const refs: DispatcherRef[] = [];
  for (const file of files) {
    const dispatcherName = file.replace(/Dispatcher\.ts$/, "");
    const content = readFileSync(path.join(DISPATCHERS_DIR, file), "utf8");
    const engines = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = enginePattern.exec(content)) !== null) {
      engines.add(m[1]);
    }
    refs.push({ dispatcher: dispatcherName, engines });
  }
  return refs;
}

// ─── Scan engines on disk ───────────────────────────────────────────────────

function scanEngines(): string[] {
  const files = readdirSync(ENGINES_DIR)
    .filter((f) => f.endsWith("Engine.ts"))
    .map((f) => f.replace(/\.ts$/, ""));
  return files.sort();
}

// ─── Analysis ───────────────────────────────────────────────────────────────

interface CandidateHit { dispatcher: string; overlap: string[]; }
interface EngineRecord {
  engine: string;
  wiredTo: string[];
  candidates: CandidateHit[];
  keywords: string[];
}

function analyze(): { records: EngineRecord[]; dispatchers: DispatcherRef[]; totalEngines: number } {
  const dispatchers = scanDispatchers();
  const engines = scanEngines();

  const reverse = new Map<string, Set<string>>();
  for (const d of dispatchers) {
    for (const e of d.engines) {
      if (!reverse.has(e)) reverse.set(e, new Set());
      reverse.get(e)!.add(d.dispatcher);
    }
  }

  const records: EngineRecord[] = [];
  for (const engine of engines) {
    const wired = [...(reverse.get(engine) ?? [])].sort();
    const keywords = splitCamel(engine);
    const candidates: CandidateHit[] = [];
    for (const [dispName, dispKeywords] of Object.entries(DISPATCHER_DOMAIN_KEYWORDS)) {
      if (wired.includes(dispName)) continue;
      const overlap = keywords.filter((k) => dispKeywords.includes(k));
      if (overlap.length >= 1) {
        candidates.push({ dispatcher: dispName, overlap });
      }
    }
    candidates.sort((a, b) => b.overlap.length - a.overlap.length || a.dispatcher.localeCompare(b.dispatcher));
    records.push({ engine, wiredTo: wired, candidates, keywords });
  }

  return { records, dispatchers, totalEngines: engines.length };
}

// ─── Report ─────────────────────────────────────────────────────────────────

interface CandidateEntry { engine: string; wiredTo: string[]; candidates: Array<{ dispatcher: string; overlap: string[] }>; }
interface Report {
  schemaVersion: number;
  generatedAt: string;
  milestone: "MASTER-AI-SYSTEM-ROADMAP-2026-04-15";
  unit: "multi-endpoint-wiring-audit";
  totals: {
    dispatchers: number;
    engineFiles: number;
    orphan: number;
    singleWire: number;
    multiWire: number;
    orphanWithCandidate: number;
    singleWireWithCandidate: number;
  };
  topMultiWired: Array<{ engine: string; wiredTo: string[] }>;
  orphanCandidates: CandidateEntry[];
  singleWireMultiUseCandidates: CandidateEntry[];
  note: string;
}

function main(): void {
  const { records, dispatchers, totalEngines } = analyze();

  const orphan = records.filter((r) => r.wiredTo.length === 0);
  const single = records.filter((r) => r.wiredTo.length === 1);
  const multi = records.filter((r) => r.wiredTo.length >= 2);
  const orphanWith = orphan.filter((r) => r.candidates.length > 0);
  const singleWith = single.filter((r) => r.candidates.length > 0);

  const topMulti = multi
    .slice()
    .sort((a, b) => b.wiredTo.length - a.wiredTo.length)
    .slice(0, 25)
    .map((r) => ({ engine: r.engine, wiredTo: r.wiredTo }));

  // Rank candidates: prefer larger maximum overlap, then more candidate dispatchers.
  const rank = (r: EngineRecord): number => {
    const best = r.candidates[0]?.overlap.length ?? 0;
    return best * 10 + r.candidates.length;
  };

  const orphanRanked: CandidateEntry[] = orphanWith
    .slice()
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, 200)
    .map((r) => ({ engine: r.engine, wiredTo: r.wiredTo, candidates: r.candidates.slice(0, 5) }));

  const singleRanked: CandidateEntry[] = singleWith
    .slice()
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, 100)
    .map((r) => ({ engine: r.engine, wiredTo: r.wiredTo, candidates: r.candidates.slice(0, 5) }));

  const report: Report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    milestone: "MASTER-AI-SYSTEM-ROADMAP-2026-04-15",
    unit: "multi-endpoint-wiring-audit",
    totals: {
      dispatchers: dispatchers.length,
      engineFiles: totalEngines,
      orphan: orphan.length,
      singleWire: single.length,
      multiWire: multi.length,
      orphanWithCandidate: orphanWith.length,
      singleWireWithCandidate: singleWith.length,
    },
    topMultiWired: topMulti,
    orphanCandidates: orphanRanked,
    singleWireMultiUseCandidates: singleRanked,
    note:
      "Candidates = dispatchers whose domain keywords share >=1 token with the engine name. " +
      "Orphan candidates = engines wired to zero dispatchers with at least one plausible target. " +
      "Single-wire multi-use candidates = engines wired to exactly one dispatcher that plausibly " +
      "belong in others too. Keyword overlap is necessary but not sufficient — every candidate " +
      "requires human review before wiring. Intended as a work-queue, not a prescription. Safe to " +
      "run concurrently with active wiring chats.",
  };

  const outPath = path.join(STATE_DIR, "MULTI_ENDPOINT_WIRING_AUDIT.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  process.stdout.write(
    `multi-endpoint-wiring-audit: ${totalEngines} engines × ${dispatchers.length} dispatchers | ` +
    `orphan=${orphan.length} single=${single.length} multi=${multi.length}\n` +
    `orphan+candidate=${orphanWith.length} single+candidate=${singleWith.length}\n` +
    `report: ${outPath}\n`,
  );
}

main();
