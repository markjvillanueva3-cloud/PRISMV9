/**
 * WikiErrorLearningBridgeEngine.test.ts — KNOWLEDGE-WIKI-MS0 / U-WIKI04B
 *
 * REAL-fixture coverage:
 *   - Inputs use the actual public-API shapes of CADTrialErrorLearningEngine,
 *     ChainFailureRecoveryEngine, LessonRendererEngine, and ErrorContext.
 *     If those upstream interfaces drift, this suite breaks first.
 *   - 30-day recency window is exercised at boundaries (inside, exact day-30,
 *     day-31, future-dated).
 *   - Cross-ref linking: the `triggers:` frontmatter list must include every
 *     originating engine + decision/chain reference.
 *   - Idempotency: re-running the bridge over identical input writes 0 files.
 *   - Validation: missing required fields produce structured warnings (no
 *     silent skip, no fabricated counts).
 *
 * Tests use temp dirs so they never touch the real wiki/lessons/.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  WikiErrorLearningBridgeEngine,
  LESSON_RECENCY_WINDOW_DAYS,
  MIN_LESSONS_PER_BRIDGE_RUN,
  isWithinWindow,
  slugify,
  type CADFailurePatternInput,
  type ChainFailureInput,
  type RenderedLessonInput,
  type ErrorLogInput,
} from "../engines/WikiErrorLearningBridgeEngine.js";
import { WikiIndexMaintainerEngine } from "../engines/WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine } from "../engines/WikiLogAppenderEngine.js";

// ============================================================================
// FIXTURES
// ============================================================================

interface TestEnv {
  root: string;
  lessonsDir: string;
  indexPath: string;
  jsonlPath: string;
  logPath: string;
  engine: WikiErrorLearningBridgeEngine;
}

function makeEnv(tag: string): TestEnv {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `wiki-error-bridge-${tag}-`));
  const lessonsDir = path.join(root, "knowledge", "wiki", "lessons");
  const indexPath = path.join(root, "knowledge", "wiki", "index.md");
  const jsonlPath = path.join(root, "knowledge", "wiki", "index.jsonl");
  const logPath = path.join(root, "knowledge", "wiki", "log.md");
  fs.mkdirSync(lessonsDir, { recursive: true });
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, "# Wiki Index\n\n_Last updated: 2026-04-27_\n\n");
  fs.writeFileSync(logPath, "# Wiki Log\n\n");
  const engine = new WikiErrorLearningBridgeEngine({
    indexEngine: new WikiIndexMaintainerEngine(indexPath, jsonlPath),
    logEngine: new WikiLogAppenderEngine(logPath),
  });
  return { root, lessonsDir, indexPath, jsonlPath, logPath, engine };
}

function cleanup(env: TestEnv) {
  try { fs.rmSync(env.root, { recursive: true, force: true }); } catch { /* best-effort */ }
}

const REAL_CAD_PATTERN: CADFailurePatternInput = {
  category: "thin_wall",
  failures: 9,
  successes: 31,
  failureRate: 0.225,
  confidence: 0.78,
  exampleErrors: [
    "Wall thickness 0.018\" exceeded for hex slot",
    "Tool deflection caused wall breakthrough",
    "Material flexed during finishing pass",
  ],
  byPartType: {
    "hex-pin": { failures: 6, successes: 12, rate: 0.333 },
  },
  lastSeen: "2026-04-25",
};

const REAL_CHAIN_FAILURE: ChainFailureInput = {
  chainId: "cad-import-chain",
  stepId: "step-3-step-parse",
  stepAction: "parse_step_file",
  errorMessage: "STEP file rejected: invalid header at byte 42",
  errorCode: "STEP_PARSE_INVALID",
  timestamp: "2026-04-26T09:12:00Z",
  health: {
    totalExecutions: 100,
    totalFailures: 9,
    failureRate: 0.09,
    mostFailingStep: "step-3-step-parse",
  },
};

const REAL_RENDERED_LESSON: RenderedLessonInput = {
  lessonId: "kienzle-cutting-force-overview",
  title: "Kienzle cutting force — quick overview",
  summary: "Specific cutting force kc with 1-mh exponent decay vs chip thickness",
  bodyMarkdown: "## Formula\n\n`F_c = b * h * kc`\n\nDerived from MIT 2.008 lecture notes.",
  generatedAt: "2026-04-22T14:00:00Z",
  formulaIds: ["kienzle-baseline", "specific-cutting-pressure"],
};

const REAL_ERROR_LOG: ErrorLogInput = {
  timestamp: "2026-04-15T11:00:00Z",
  message: "Process spawn ENOENT for npm.cmd — PATH missing nodejs/",
  code: "ENOENT",
  context: { tool: "npm", platform: "win32" },
  triggers: ["decision:portable-node-junction"],
};

const STALE_CAD_PATTERN: CADFailurePatternInput = {
  category: "stale_pattern",
  failures: 5,
  successes: 12,
  failureRate: 0.294,
  confidence: 0.5,
  exampleErrors: ["old error"],
  lastSeen: "2026-01-01", // > 30 days before 2026-04-27
};

// ============================================================================
// TESTS
// ============================================================================

describe("slugify", () => {
  it("converts mixed-case + punctuation to lowercase dashes", () => {
    expect(slugify("CAD: Thin_Wall!")).toStrictEqual("cad-thin-wall");
  });
});

describe("isWithinWindow", () => {
  it("accepts dates inside the 30-day window", () => {
    expect(isWithinWindow("2026-04-15", "2026-04-27", 30)).toStrictEqual(true);
  });

  it("accepts the boundary at exactly 30 days", () => {
    expect(isWithinWindow("2026-03-28", "2026-04-27", 30)).toStrictEqual(true);
  });

  it("rejects 31 days back", () => {
    expect(isWithinWindow("2026-03-27", "2026-04-27", 30)).toStrictEqual(false);
  });

  it("accepts future-dated entries", () => {
    expect(isWithinWindow("2026-05-10", "2026-04-27", 30)).toStrictEqual(true);
  });

  it("rejects when timestamps are unparseable", () => {
    expect(isWithinWindow("not-a-date", "2026-04-27", 30)).toStrictEqual(false);
  });
});

describe("WikiErrorLearningBridgeEngine constants", () => {
  it("matches the milestone-mandated 30-day recency window", () => {
    expect(LESSON_RECENCY_WINDOW_DAYS).toStrictEqual(30);
  });

  it("matches the milestone-mandated >= 5 lessons floor", () => {
    expect(MIN_LESSONS_PER_BRIDGE_RUN).toStrictEqual(5);
  });
});

describe("WikiErrorLearningBridgeEngine.bridge — happy path with all four streams", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("happy"); });
  afterEach(() => cleanup(env));

  it("writes one lesson file per inbound record", async () => {
    const result = await env.engine.bridge(
      {
        cadPatterns: [REAL_CAD_PATTERN],
        chainFailures: [REAL_CHAIN_FAILURE],
        renderedLessons: [REAL_RENDERED_LESSON],
        errorLogs: [REAL_ERROR_LOG],
      },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    expect(result.lessons.length).toStrictEqual(4);
    expect(result.written).toStrictEqual(4);
  });

  it("each lesson file is named lesson-{slug}.md", async () => {
    await env.engine.bridge(
      {
        cadPatterns: [REAL_CAD_PATTERN],
        chainFailures: [REAL_CHAIN_FAILURE],
      },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    const cadFile = path.join(env.lessonsDir, "lesson-cad-thin-wall.md");
    expect(fs.existsSync(cadFile)).toStrictEqual(true);
  });

  it("preserves trigger cross-refs in the lesson frontmatter", async () => {
    await env.engine.bridge(
      { cadPatterns: [REAL_CAD_PATTERN] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    const body = fs.readFileSync(
      path.join(env.lessonsDir, "lesson-cad-thin-wall.md"),
      "utf8"
    );
    expect(body.includes("- engine:CADTrialErrorLearningEngine")).toStrictEqual(true);
    expect(body.includes("- category:thin_wall")).toStrictEqual(true);
  });

  it("preserves chain id + step id triggers for chain failures", async () => {
    await env.engine.bridge(
      { chainFailures: [REAL_CHAIN_FAILURE] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    const lessons = fs.readdirSync(env.lessonsDir).filter((f) => f.startsWith("lesson-chain-"));
    expect(lessons.length).toStrictEqual(1);
    const body = fs.readFileSync(path.join(env.lessonsDir, lessons[0]), "utf8");
    expect(body.includes("- chain:cad-import-chain")).toStrictEqual(true);
    expect(body.includes("- step:step-3-step-parse")).toStrictEqual(true);
  });

  it("rendered lessons carry formula triggers from upstream", async () => {
    await env.engine.bridge(
      { renderedLessons: [REAL_RENDERED_LESSON] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    const body = fs.readFileSync(
      path.join(env.lessonsDir, "lesson-rendered-kienzle-cutting-force-overview.md"),
      "utf8"
    );
    expect(body.includes("- formula:kienzle-baseline")).toStrictEqual(true);
    expect(body.includes("- formula:specific-cutting-pressure")).toStrictEqual(true);
  });
});

describe("WikiErrorLearningBridgeEngine.bridge — recency window enforcement", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("window"); });
  afterEach(() => cleanup(env));

  it("drops CAD patterns whose lastSeen is outside the 30-day window", async () => {
    const result = await env.engine.bridge(
      { cadPatterns: [REAL_CAD_PATTERN, STALE_CAD_PATTERN] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    expect(result.lessons.length).toStrictEqual(1);
    expect(result.outOfWindow).toStrictEqual(1);
    expect(
      fs.existsSync(path.join(env.lessonsDir, "lesson-cad-stale-pattern.md"))
    ).toStrictEqual(false);
  });

  it("respects a custom narrower window when provided", async () => {
    const result = await env.engine.bridge(
      { cadPatterns: [REAL_CAD_PATTERN] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27", windowDays: 1 }
    );
    expect(result.outOfWindow).toStrictEqual(1);
    expect(result.lessons.length).toStrictEqual(0);
  });
});

describe("WikiErrorLearningBridgeEngine.bridge — validation", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("valid"); });
  afterEach(() => cleanup(env));

  it("drops CAD patterns missing failures + failureRate with a warning", async () => {
    const broken: Partial<CADFailurePatternInput> = {
      category: "broken",
      successes: 5,
      confidence: 0.5,
      exampleErrors: [],
    };
    const result = await env.engine.bridge(
      { cadPatterns: [broken as CADFailurePatternInput] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    expect(result.lessons.length).toStrictEqual(0);
    expect(result.warnings.length >= 1).toStrictEqual(true);
  });

  it("drops chain failures missing required identifiers with a warning", async () => {
    const broken: Partial<ChainFailureInput> = {
      stepAction: "x",
      errorMessage: "x",
      timestamp: "2026-04-27T00:00:00Z",
    };
    const result = await env.engine.bridge(
      { chainFailures: [broken as ChainFailureInput] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    expect(result.lessons.length).toStrictEqual(0);
    expect(result.warnings.length >= 1).toStrictEqual(true);
  });

  it("drops error logs missing message or timestamp", async () => {
    const broken: Partial<ErrorLogInput> = { code: "X" };
    const result = await env.engine.bridge(
      { errorLogs: [broken as ErrorLogInput] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    expect(result.lessons.length).toStrictEqual(0);
    expect(result.warnings.length >= 1).toStrictEqual(true);
  });
});

describe("WikiErrorLearningBridgeEngine.bridge — idempotency", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("idem"); });
  afterEach(() => cleanup(env));

  it("second bridge run rewrites zero files", async () => {
    const input = {
      cadPatterns: [REAL_CAD_PATTERN],
      chainFailures: [REAL_CHAIN_FAILURE],
      renderedLessons: [REAL_RENDERED_LESSON],
      errorLogs: [REAL_ERROR_LOG],
    };
    const first = await env.engine.bridge(input, {
      lessonsDir: env.lessonsDir, today: "2026-04-27",
    });
    expect(first.written).toStrictEqual(4);
    const second = await env.engine.bridge(input, {
      lessonsDir: env.lessonsDir, today: "2026-04-27",
    });
    expect(second.written).toStrictEqual(0);
    expect(second.skipped).toStrictEqual(4);
  });
});

describe("WikiErrorLearningBridgeEngine.bridge — exit-condition floor", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("floor"); });
  afterEach(() => cleanup(env));

  it("meetsMinimum is true when >= 5 lessons are produced", async () => {
    const fiveCad: CADFailurePatternInput[] = [
      { ...REAL_CAD_PATTERN, category: "cat-a", lastSeen: "2026-04-26" },
      { ...REAL_CAD_PATTERN, category: "cat-b", lastSeen: "2026-04-25" },
      { ...REAL_CAD_PATTERN, category: "cat-c", lastSeen: "2026-04-24" },
      { ...REAL_CAD_PATTERN, category: "cat-d", lastSeen: "2026-04-23" },
      { ...REAL_CAD_PATTERN, category: "cat-e", lastSeen: "2026-04-22" },
    ];
    const result = await env.engine.bridge(
      { cadPatterns: fiveCad },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    expect(result.lessons.length).toStrictEqual(5);
    expect(result.meetsMinimum).toStrictEqual(true);
  });

  it("meetsMinimum is false when fewer than 5 lessons are produced", async () => {
    const result = await env.engine.bridge(
      { cadPatterns: [REAL_CAD_PATTERN] },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    expect(result.meetsMinimum).toStrictEqual(false);
  });
});

describe("WikiErrorLearningBridgeEngine.bridge — index + log integration", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("integ"); });
  afterEach(() => cleanup(env));

  it("appends exactly one audit log line per bridge run", async () => {
    await env.engine.bridge(
      {
        cadPatterns: [REAL_CAD_PATTERN],
        chainFailures: [REAL_CHAIN_FAILURE],
      },
      { lessonsDir: env.lessonsDir, today: "2026-04-27", agent: "claude:bridge-test" }
    );
    const log = fs.readFileSync(env.logPath, "utf8");
    const entries = log.match(/^## \[2026-04-27\] bridge:lessons/gm) ?? [];
    expect(entries.length).toStrictEqual(1);
    expect(log.includes("by:claude:bridge-test")).toStrictEqual(true);
  });

  it("upserts every lesson slug into wiki/index.md", async () => {
    await env.engine.bridge(
      {
        cadPatterns: [REAL_CAD_PATTERN],
        chainFailures: [REAL_CHAIN_FAILURE],
        renderedLessons: [REAL_RENDERED_LESSON],
      },
      { lessonsDir: env.lessonsDir, today: "2026-04-27" }
    );
    const index = fs.readFileSync(env.indexPath, "utf8");
    const slugCount = (index.match(/\[\[lesson-/g) ?? []).length;
    expect(slugCount).toStrictEqual(3);
  });
});
