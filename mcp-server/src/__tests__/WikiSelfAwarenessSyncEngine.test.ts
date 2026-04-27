/**
 * WikiSelfAwarenessSyncEngine tests — KNOWLEDGE-WIKI-MS0 / U-WIKI05
 *
 * Real-fixture discipline: every test exercises the engine against a temp
 * wiki vault on disk (no mocked fs). Slug regex, idempotency, REAL-DATA
 * field validation, and index/log round-trips are exercised end-to-end.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  WikiSelfAwarenessSyncEngine,
  type AGIDecision,
  type DLPattern,
  type SelfAwarenessSnapshot,
  type SONATrajectory,
  slugify,
  SUPPORTED_AGI_SYSTEMS,
  PATTERN_KINDS,
} from "../engines/WikiSelfAwarenessSyncEngine.js";
import { WikiIndexMaintainerEngine } from "../engines/WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine } from "../engines/WikiLogAppenderEngine.js";

// ============================================================================
// FIXTURES — drawn from real PRISM session counts and live JM-Die metrics
// ============================================================================

const REAL_SNAPSHOT: SelfAwarenessSnapshot = {
  timestamp: "2026-04-27T16:00:00Z",
  capabilities: {
    engines: 3012,
    dispatchers: 95,
    actions: 6435,
    registries: 14,
    hooks: 112,
    skills: 61,
  },
  recommendedFeatures: [
    { feature: "duplicationGuardEngine", reason: "Check before creating new engine" },
    { feature: "PRISMCreativeReasoningEngine", reason: "Cross-domain synthesis" },
  ],
  jmDie: {
    customerCount: 100,
    programCount: 24545,
    topCustomers: ["ITW", "Alcoa", "Optimas"],
  },
  confidence: 0.95,
  summary:
    "PRISM as of 2026-04-27 — 3012 engines, 95 dispatchers, 6435 actions; JM Die test shop indexed at 100 customers.",
};

const REAL_AGI_DECISION: AGIDecision = {
  taskId: "U-WIKI05-EXAMPLE",
  system: "mill",
  problem:
    "Choose roughing strategy for Inconel 718 finishing pass given chatter constraints on a Mazak VM-855.",
  mode: "optimal",
  recommendation:
    "Use trochoidal pocketing at 0.025 mm chip-thinning with constant engagement; reduce ae to 8% of D for chatter avoidance.",
  confidence: 0.86,
  alternatives: [
    "Conventional Z-level with full slot — rejected (radial chatter at this stickout).",
    "High-feed face mill — rejected (insufficient corner access).",
  ],
  citations: [
    "wiki:concepts/chatter-prediction",
    "engine:CrossDisciplinaryDeepLearningEngine",
  ],
};

const REAL_DL_PATTERN: DLPattern = {
  id: "lora-mill-finishing-v3",
  kind: "lora",
  name: "LoRA mill finishing v3",
  description:
    "LoRA adapter trained on 12,000 mill finishing toolpaths from JM Die corpus; specialises in chip-load to surface-Ra mapping.",
  accuracy: 0.91,
  samples: 12000,
  metadata: {
    base_model: "qwen2.5-coder:7b",
    rank: 16,
    domain: "mill-finishing",
  },
};

const REAL_DL_PATTERN_DL: DLPattern = {
  id: "cross-disciplinary-thermal-control",
  kind: "dl",
  name: "Cross-disciplinary thermal control mapping",
  description:
    "Deep learning pattern bridging control-theory PID gains with thermal expansion compensation across 5-axis spindles.",
  accuracy: 0.83,
  samples: 4500,
};

const REAL_TRAJECTORY: SONATrajectory = {
  date: "2026-04-27",
  taskId: "U-CAM-FIDX-15",
  steps: 42,
  reward: 0.87,
  success: true,
  outcome: "Successfully wired TebisFunctionIndexEngine across 10 dispatcher actions.",
  metadata: {
    domain: "cam-exhaust",
    agent: "claude:cam-exhaust",
  },
};

const REAL_FAIL_TRAJECTORY: SONATrajectory = {
  date: "2026-04-26",
  taskId: "U-FAILED-EXAMPLE",
  steps: 15,
  reward: -0.4,
  success: false,
  outcome: "Aborted due to schema mismatch — see TSC-CLEANUP-MS0.",
};

// ============================================================================
// HARNESS
// ============================================================================

function freshTempVault(): {
  wikiRoot: string;
  indexPath: string;
  jsonlPath: string;
  logPath: string;
} {
  const wikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-self-awareness-"));
  const indexPath = path.join(wikiRoot, "index.md");
  const jsonlPath = path.join(wikiRoot, "index.jsonl");
  const logPath = path.join(wikiRoot, "log.md");
  fs.writeFileSync(indexPath, "# Wiki Index\n\n");
  fs.writeFileSync(jsonlPath, "");
  fs.writeFileSync(logPath, "# Wiki Log\n\n");
  return { wikiRoot, indexPath, jsonlPath, logPath };
}

function makeEngine(wikiRoot: string, indexPath: string, jsonlPath: string, logPath: string) {
  const indexEngine = new WikiIndexMaintainerEngine(indexPath, jsonlPath);
  const logEngine = new WikiLogAppenderEngine(logPath);
  return new WikiSelfAwarenessSyncEngine({ indexEngine, logEngine });
}

// ============================================================================
// TESTS
// ============================================================================

describe("WikiSelfAwarenessSyncEngine — slug / constants", () => {
  it("slugify lowercases and hyphenates", () => {
    expect(slugify("U-WIKI05 Example")).toStrictEqual("u-wiki05-example");
  });

  it("slugify caps at 80 chars", () => {
    const huge = "x".repeat(120);
    expect(slugify(huge).length).toStrictEqual(80);
  });

  it("SUPPORTED_AGI_SYSTEMS includes mill, turn, wedm, cad, cam, 5axis, lathe, swiss, cross-domain", () => {
    expect(SUPPORTED_AGI_SYSTEMS).toStrictEqual([
      "mill",
      "turn",
      "wedm",
      "cad",
      "cam",
      "5axis",
      "lathe",
      "swiss",
      "cross-domain",
    ]);
  });

  it("PATTERN_KINDS is exactly [lora, dl]", () => {
    expect(PATTERN_KINDS).toStrictEqual(["lora", "dl"]);
  });
});

describe("WikiSelfAwarenessSyncEngine — syncSnapshot", () => {
  let vault: ReturnType<typeof freshTempVault>;
  beforeEach(() => {
    vault = freshTempVault();
  });

  it("emits architecture/prism-self-awareness.md with capability counts", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { snapshot: REAL_SNAPSHOT },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.snapshot?.slug).toStrictEqual("prism-self-awareness");
    expect(report.snapshot?.category).toStrictEqual("architecture");
    expect(report.snapshot?.written).toStrictEqual(true);
    expect(report.filesWritten).toStrictEqual(1);
    const file = path.join(vault.wikiRoot, "architecture", "prism-self-awareness.md");
    expect(fs.existsSync(file)).toStrictEqual(true);
    const body = fs.readFileSync(file, "utf8");
    expect(body).toContain("engines: 3012");
    expect(body).toContain("dispatchers: 95");
    expect(body).toContain("actions: 6435");
    expect(body).toContain("PRISM as of 2026-04-27");
  });

  it("upserts a single architecture-category entry into wiki/index.md", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    await engine.syncAll(
      { snapshot: REAL_SNAPSHOT },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    const idx = fs.readFileSync(vault.indexPath, "utf8");
    expect(idx).toContain("[[prism-self-awareness]]");
    expect(idx).toContain("category:architecture");
  });

  it("drops snapshot missing timestamp and records a warning", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad = { ...REAL_SNAPSHOT, timestamp: "" } as SelfAwarenessSnapshot;
    const report = await engine.syncAll(
      { snapshot: bad },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.snapshot).toStrictEqual(undefined);
    expect(report.skipped).toStrictEqual(1);
    expect(report.warnings.some((w) => w.includes("dropped snapshot"))).toStrictEqual(true);
  });

  it("drops snapshot when capabilities lacks numeric engines/dispatchers/actions", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad = {
      ...REAL_SNAPSHOT,
      capabilities: { engines: 3012, dispatchers: 95 } as SelfAwarenessSnapshot["capabilities"],
    };
    const report = await engine.syncAll(
      { snapshot: bad },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.snapshot).toStrictEqual(undefined);
    expect(report.warnings.some((w) => w.includes("numeric engines/dispatchers/actions"))).toStrictEqual(
      true
    );
  });

  it("preserves jmDie + recommendedFeatures sections in body when present", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    await engine.syncAll(
      { snapshot: REAL_SNAPSHOT },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    const body = fs.readFileSync(
      path.join(vault.wikiRoot, "architecture", "prism-self-awareness.md"),
      "utf8"
    );
    expect(body).toContain("## JM Die test shop");
    expect(body).toContain("Customers indexed: `100`");
    expect(body).toContain("Programs indexed: `24545`");
    expect(body).toContain("## Recommended AI features");
    expect(body).toContain("**duplicationGuardEngine**");
  });
});

describe("WikiSelfAwarenessSyncEngine — syncDecisions", () => {
  let vault: ReturnType<typeof freshTempVault>;
  beforeEach(() => {
    vault = freshTempVault();
  });

  it("emits decisions/agi-mill-{slug}.md with recommendation body", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { decisions: [REAL_AGI_DECISION] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.decisions.length).toStrictEqual(1);
    expect(report.decisions[0].slug).toStrictEqual("agi-mill-u-wiki05-example");
    expect(report.decisions[0].written).toStrictEqual(true);
    const body = fs.readFileSync(report.decisions[0].file, "utf8");
    expect(body).toContain("trochoidal pocketing");
    expect(body).toContain("agi_system: mill");
  });

  it("renders alternatives + citations sections when provided", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { decisions: [REAL_AGI_DECISION] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    const body = fs.readFileSync(report.decisions[0].file, "utf8");
    expect(body).toContain("## Alternatives considered");
    expect(body).toContain("## Citations");
    expect(body).toContain("wiki:concepts/chatter-prediction");
  });

  it("drops decision with unsupported system", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad: AGIDecision = { ...REAL_AGI_DECISION, system: "ufo" as AGIDecision["system"] };
    const report = await engine.syncAll(
      { decisions: [bad] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.decisions.length).toStrictEqual(0);
    expect(report.warnings.some((w) => w.includes("unsupported system"))).toStrictEqual(true);
  });

  it("drops decision with non-finite confidence", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad = { ...REAL_AGI_DECISION, confidence: Number.NaN };
    const report = await engine.syncAll(
      { decisions: [bad] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.decisions.length).toStrictEqual(0);
    expect(report.warnings.some((w) => w.includes("non-finite confidence"))).toStrictEqual(true);
  });

  it("drops decision missing required fields", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad = { ...REAL_AGI_DECISION, recommendation: "" };
    const report = await engine.syncAll(
      { decisions: [bad] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.decisions.length).toStrictEqual(0);
    expect(report.warnings.some((w) => w.includes("missing required fields"))).toStrictEqual(true);
  });

  it("upserts decisions-category entry with confidence rounded into index", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    await engine.syncAll(
      { decisions: [REAL_AGI_DECISION] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    const idx = fs.readFileSync(vault.indexPath, "utf8");
    expect(idx).toContain("[[agi-mill-u-wiki05-example]]");
    expect(idx).toContain("category:decisions");
    expect(idx).toContain("confidence:0.86");
  });
});

describe("WikiSelfAwarenessSyncEngine — syncPatterns", () => {
  let vault: ReturnType<typeof freshTempVault>;
  beforeEach(() => {
    vault = freshTempVault();
  });

  it("emits patterns/lora-{slug}.md with accuracy frontmatter", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { patterns: [REAL_DL_PATTERN] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.patterns.length).toStrictEqual(1);
    expect(report.patterns[0].slug).toStrictEqual("lora-lora-mill-finishing-v3");
    expect(report.patterns[0].confidence).toStrictEqual(0.91);
    const body = fs.readFileSync(report.patterns[0].file, "utf8");
    expect(body).toContain("accuracy: 0.910");
    expect(body).toContain("samples: 12000");
    expect(body).toContain("pattern_kind: lora");
  });

  it("emits patterns/dl-{slug}.md for kind=dl entries", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { patterns: [REAL_DL_PATTERN_DL] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.patterns[0].slug).toStrictEqual("dl-cross-disciplinary-thermal-control");
    expect(report.patterns[0].file.endsWith("dl-cross-disciplinary-thermal-control.md")).toStrictEqual(true);
  });

  it("falls back to confidence 0.7 when accuracy is absent", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const noAccuracy = { ...REAL_DL_PATTERN, accuracy: undefined };
    const report = await engine.syncAll(
      { patterns: [noAccuracy] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.patterns[0].confidence).toStrictEqual(0.7);
  });

  it("drops pattern with unsupported kind", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad: DLPattern = { ...REAL_DL_PATTERN, kind: "transformer" as DLPattern["kind"] };
    const report = await engine.syncAll(
      { patterns: [bad] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.patterns.length).toStrictEqual(0);
    expect(report.warnings.some((w) => w.includes("unsupported kind"))).toStrictEqual(true);
  });

  it("preserves rich metadata in YAML frontmatter", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { patterns: [REAL_DL_PATTERN] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    const body = fs.readFileSync(report.patterns[0].file, "utf8");
    expect(body).toContain('base_model: "qwen2.5-coder:7b"');
    expect(body).toContain("rank: 16");
  });
});

describe("WikiSelfAwarenessSyncEngine — syncTrajectories", () => {
  let vault: ReturnType<typeof freshTempVault>;
  beforeEach(() => {
    vault = freshTempVault();
  });

  it("emits trajectories/sona-{date}-{slug}.md with run record", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { trajectories: [REAL_TRAJECTORY] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.trajectories.length).toStrictEqual(1);
    expect(report.trajectories[0].slug).toStrictEqual("sona-2026-04-27-u-cam-fidx-15");
    const body = fs.readFileSync(report.trajectories[0].file, "utf8");
    expect(body).toContain("steps: 42");
    expect(body).toContain("reward: 0.87");
    expect(body).toContain("success: true");
  });

  it("drops trajectory with malformed date", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad = { ...REAL_TRAJECTORY, date: "April 27 2026" };
    const report = await engine.syncAll(
      { trajectories: [bad] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.trajectories.length).toStrictEqual(0);
    expect(report.warnings.some((w) => w.includes("must be YYYY-MM-DD"))).toStrictEqual(true);
  });

  it("drops trajectory with non-finite reward", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const bad = { ...REAL_TRAJECTORY, reward: Number.POSITIVE_INFINITY };
    const report = await engine.syncAll(
      { trajectories: [bad] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.trajectories.length).toStrictEqual(0);
    expect(report.warnings.some((w) => w.includes("non-finite steps/reward"))).toStrictEqual(true);
  });

  it("assigns confidence 0.9 for success, 0.3 for failure", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      { trajectories: [REAL_TRAJECTORY, REAL_FAIL_TRAJECTORY] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.trajectories.length).toStrictEqual(2);
    const successEntry = report.trajectories.find((t) => t.slug.includes("u-cam-fidx-15"));
    const failEntry = report.trajectories.find((t) => t.slug.includes("u-failed-example"));
    expect(successEntry?.confidence).toStrictEqual(0.9);
    expect(failEntry?.confidence).toStrictEqual(0.3);
  });
});

describe("WikiSelfAwarenessSyncEngine — syncAll composite + idempotency", () => {
  let vault: ReturnType<typeof freshTempVault>;
  beforeEach(() => {
    vault = freshTempVault();
  });

  it("emits one page per source from a fully-populated payload", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const report = await engine.syncAll(
      {
        snapshot: REAL_SNAPSHOT,
        decisions: [REAL_AGI_DECISION],
        patterns: [REAL_DL_PATTERN, REAL_DL_PATTERN_DL],
        trajectories: [REAL_TRAJECTORY],
      },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.snapshot?.slug).toStrictEqual("prism-self-awareness");
    expect(report.decisions.length).toStrictEqual(1);
    expect(report.patterns.length).toStrictEqual(2);
    expect(report.trajectories.length).toStrictEqual(1);
    expect(report.filesWritten).toStrictEqual(5);
    expect(report.warnings.length).toStrictEqual(0);
  });

  it("is idempotent — second run with same input writes zero files", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const payload = {
      snapshot: REAL_SNAPSHOT,
      decisions: [REAL_AGI_DECISION],
      patterns: [REAL_DL_PATTERN],
      trajectories: [REAL_TRAJECTORY],
    };
    const opts = { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" };
    const first = await engine.syncAll(payload, opts);
    expect(first.filesWritten).toStrictEqual(4);
    const second = await engine.syncAll(payload, opts);
    expect(second.filesWritten).toStrictEqual(0);
    expect(second.snapshot?.written).toStrictEqual(false);
    expect(second.decisions.length).toStrictEqual(1);
    expect(second.decisions[0].written).toStrictEqual(false);
    expect(second.patterns.length).toStrictEqual(1);
    expect(second.trajectories.length).toStrictEqual(1);
  });

  it("appends exactly one log line per syncAll run", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    await engine.syncAll(
      { snapshot: REAL_SNAPSHOT, decisions: [REAL_AGI_DECISION] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    const log = fs.readFileSync(vault.logPath, "utf8");
    const matches = log.match(/^## \[/gm) ?? [];
    expect(matches.length).toStrictEqual(1);
    expect(log).toContain("sync:self-awareness");
  });

  it("aggregates warnings across all sources", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const badDecision: AGIDecision = {
      ...REAL_AGI_DECISION,
      system: "ufo" as AGIDecision["system"],
    };
    const badPattern: DLPattern = { ...REAL_DL_PATTERN, name: "" };
    const report = await engine.syncAll(
      {
        snapshot: { ...REAL_SNAPSHOT, summary: "" },
        decisions: [badDecision],
        patterns: [badPattern],
        trajectories: [{ ...REAL_TRAJECTORY, date: "bad-date" }],
      },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.warnings.length).toStrictEqual(4);
    expect(report.skipped).toStrictEqual(4);
    expect(report.filesWritten).toStrictEqual(0);
  });

  it("partial payload with only patterns still upserts to index correctly", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    await engine.syncAll(
      { patterns: [REAL_DL_PATTERN, REAL_DL_PATTERN_DL] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    const idx = fs.readFileSync(vault.indexPath, "utf8");
    expect(idx).toContain("[[lora-lora-mill-finishing-v3]]");
    expect(idx).toContain("[[dl-cross-disciplinary-thermal-control]]");
    expect(idx).toContain("category:patterns");
  });

  it("never logs when zero pages emit (all dropped)", async () => {
    const engine = makeEngine(vault.wikiRoot, vault.indexPath, vault.jsonlPath, vault.logPath);
    const before = fs.readFileSync(vault.logPath, "utf8");
    const report = await engine.syncAll(
      { decisions: [{ ...REAL_AGI_DECISION, recommendation: "" }] },
      { wikiRoot: vault.wikiRoot, today: "2026-04-27", agent: "test" }
    );
    expect(report.filesWritten).toStrictEqual(0);
    expect(report.warnings.length).toStrictEqual(1);
    const after = fs.readFileSync(vault.logPath, "utf8");
    expect(after).toStrictEqual(before);
  });
});
