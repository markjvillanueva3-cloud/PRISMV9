/**
 * BashCommandClassifierEngine — tests + prism_dev `bash_classify` wiring E2E.
 *
 * WIRE-UNWIRED-MS0 (2026-05-16): this engine was a truly-unwired backend
 * dev-tool (no dispatcher, no test, no consumer). These tests verify both the
 * engine's classification logic against reference values from its PATTERNS
 * table AND the round-trip through the devDispatcher `bash_classify` action.
 *
 * Coverage: happy path · ≥3 failure modes · ≥2 adversarial inputs ·
 * ≥3 category-variability cases · dispatcher round-trip E2E. Every assertion
 * pins a concrete expected value from the engine's PATTERNS table.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  BashCommandClassifierEngine,
  bashCommandClassifierEngine,
} from "../engines/BashCommandClassifierEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

// ───────────────────────── engine-direct tests ──────────────────────────

describe("BashCommandClassifierEngine — classify()", () => {
  it("happy path: classifies a grep command as search with a Grep alternative", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify('grep -rn "foo" .');
    // Reference values: PATTERNS entry /^(grep|rg)\s/ → search, est 800, Grep alt savings 500.
    expect(r.category).toBe("search");
    expect(r.estimatedOutputTokens).toBe(800);
    expect(r.alternative).toEqual({
      type: "tool",
      name: "Grep",
      usage: "Use Grep tool with pattern and path",
      tokenSavings: 500,
    });
    // savings 500 > 400 → high waste risk.
    expect(r.wasteRisk).toBe("high");
    expect(r.reason).toBe("Use Grep instead — saves ~500 tokens");
  });

  it("variability — read: cat → read category with Read alternative (medium risk)", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("cat src/foo.ts");
    expect(r.category).toBe("read");
    expect(r.estimatedOutputTokens).toBe(2000);
    expect(r.alternative!.name).toBe("Read");
    expect(r.alternative!.tokenSavings).toBe(200);
    // savings 200 ≤ 400 → medium risk.
    expect(r.wasteRisk).toBe("medium");
  });

  it("variability — git: `git status` → git category, no alternative, no waste", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("git status");
    expect(r.category).toBe("git");
    expect(r.estimatedOutputTokens).toBe(800);
    expect(r.alternative).toBeNull();
    expect(r.wasteRisk).toBe("none");
    expect(r.reason).toBe("No better alternative available");
  });

  it("variability — test: `npx vitest run` → test category, /test skill alternative", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("npx vitest run foo.test.ts");
    expect(r.category).toBe("test");
    expect(r.estimatedOutputTokens).toBe(2000);
    expect(r.alternative!.type).toBe("skill");
    expect(r.alternative!.name).toBe("/test");
    expect(r.wasteRisk).toBe("high");
  });

  it("variability — inspect: `ls -la` → inspect category with no alternative", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("ls -la src/");
    expect(r.category).toBe("inspect");
    expect(r.estimatedOutputTokens).toBe(300);
    expect(r.alternative).toBeNull();
  });

  it("count category survives compounding (count is not rewritten to compound)", () => {
    const engine = new BashCommandClassifierEngine();
    // `grep ... | wc -l` matches the count pattern; the `&&` makes it compound,
    // but the engine deliberately keeps the `count` category for count commands.
    const r = engine.classify('cd src && grep -rn "x" . | wc -l');
    expect(r.category).toBe("count");
    expect(r.estimatedOutputTokens).toBe(50);
  });

  it("compound: a chained non-count command is reclassified to `compound`", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify('cd src && grep -rn "x" .');
    // matches /(?:^|&&\s*)(grep|rg)\s/ → search, then isCompound rewrites to compound.
    expect(r.category).toBe("compound");
    expect(r.estimatedOutputTokens).toBe(800);
  });

  // ── failure modes ──
  it("failure mode — empty string: classified as `other`, no alternative", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("");
    expect(r.category).toBe("other");
    expect(r.alternative).toBeNull();
    expect(r.wasteRisk).toBe("none");
    expect(r.estimatedOutputTokens).toBe(500);
    expect(r.reason).toBe("Standard bash command, no alternative needed");
  });

  it("failure mode — whitespace-only string: trimmed to empty → `other`", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("   \t  ");
    expect(r.category).toBe("other");
    expect(r.command).toBe("");
    expect(r.estimatedOutputTokens).toBe(500);
  });

  it("failure mode — unknown command: `docker ps` matches no pattern → `other`", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("docker ps");
    expect(r.category).toBe("other");
    expect(r.alternative).toBeNull();
    expect(r.estimatedOutputTokens).toBe(500);
  });

  // ── adversarial inputs ──
  it("adversarial — oversize command (200 chars) is truncated to 80 chars with ellipsis", () => {
    const engine = new BashCommandClassifierEngine();
    const long = "echo " + "x".repeat(200);
    const r = engine.classify(long);
    expect(r.command.length).toBe(80);
    expect(r.command.slice(-3)).toBe("...");
  });

  it("adversarial — regex-special characters classify as search without throwing", () => {
    const engine = new BashCommandClassifierEngine();
    // Brackets/parens/backslashes could break naive regex handling; a throw here
    // would fail the test, so a concrete result assertion proves no-throw too.
    const r = engine.classify("grep '([{\\\\.*+?' src/");
    expect(r.category).toBe("search");
    expect(r.estimatedOutputTokens).toBe(800);
  });

  it("adversarial — multi-line command: leading `git status` still classifies as git", () => {
    const engine = new BashCommandClassifierEngine();
    const r = engine.classify("git status\nrm -rf /");
    // ^git matches at string start; no `&&`/`;` → not compound.
    expect(r.category).toBe("git");
    expect(r.estimatedOutputTokens).toBe(800);
  });
});

describe("BashCommandClassifierEngine — report() / reset() / count", () => {
  it("report() aggregates totals and sorts categories by token cost", () => {
    const engine = new BashCommandClassifierEngine();
    engine.classify('grep -rn "foo" .'); // search, 800 tokens, saveable 500
    engine.classify("cat foo.ts"); // read, 2000 tokens, saveable 200
    engine.classify("git status"); // git, 800 tokens, saveable 0
    const rep = engine.report();
    expect(rep.commands).toHaveLength(3);
    // totalEstimatedTokens = 800 + 2000 + 800
    expect(rep.totalEstimatedTokens).toBe(3600);
    // totalSaveable = 500 + 200 + 0
    expect(rep.totalSaveable).toBe(700);
    // topCategories sorted desc by tokens → read (2000) first, then search/git (800 each).
    expect(rep.topCategories[0]).toEqual({ category: "read", count: 1, tokens: 2000 });
    // recommendations: one per distinct alternative, sorted by savings → Grep then Read.
    expect(rep.recommendations).toHaveLength(2);
    expect(rep.recommendations[0]).toBe("Switch to Grep — saves ~500 tokens total");
  });

  it("report() on a fresh engine returns zeroed totals and no recommendations", () => {
    const engine = new BashCommandClassifierEngine();
    const rep = engine.report();
    expect(rep.commands).toHaveLength(0);
    expect(rep.totalEstimatedTokens).toBe(0);
    expect(rep.totalSaveable).toBe(0);
    expect(rep.recommendations).toHaveLength(0);
  });

  it("reset() clears accumulated history and the count getter", () => {
    const engine = new BashCommandClassifierEngine();
    engine.classify("git status");
    engine.classify("ls -la .");
    expect(engine.count).toBe(2);
    engine.reset();
    expect(engine.count).toBe(0);
    expect(engine.report().commands).toHaveLength(0);
  });

  it("exported singleton classifies through the same logic as a fresh instance", () => {
    const r = bashCommandClassifierEngine.classify("ls -la /tmp");
    expect(r.category).toBe("inspect");
    expect(r.estimatedOutputTokens).toBe(300);
  });
});

// ───────────────────── devDispatcher round-trip E2E ─────────────────────

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDevDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("devDispatcher · bash_classify wiring (E2E round-trip)", () => {
  let handler: Handler;

  beforeAll(async () => {
    vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
    const s = createServer();
    handler = await s.handler;
  });

  it("classifies a single `command` and returns a slimmed report", async () => {
    const r = await call(handler, "bash_classify", { command: 'grep -rn "foo" .' });
    expect(r.success).toBe(true);
    expect(r.count).toBe(1);
    expect(r.classifications[0].category).toBe("search");
    expect(r.classifications[0].alternative.name).toBe("Grep");
    expect(r.totalEstimatedTokens).toBe(800);
  });

  it("classifies a `commands` batch and reports an aggregate", async () => {
    const r = await call(handler, "bash_classify", {
      commands: ["git status", "cat src/x.ts", "npx vitest run"],
    });
    expect(r.success).toBe(true);
    expect(r.count).toBe(3);
    expect(r.classifications).toHaveLength(3);
    // totals: git 800 + read 2000 + test 2000
    expect(r.totalEstimatedTokens).toBe(4800);
  });

  it("a no-alternative command keeps concrete fields; slimResponse drops the null alternative", async () => {
    const r = await call(handler, "bash_classify", { command: "git status" });
    expect(r.classifications[0]).toMatchObject({
      category: "git",
      estimatedOutputTokens: 800,
      wasteRisk: "none",
      reason: "No better alternative available",
    });
    // slimResponse removes null values — the `alternative` key is absent entirely.
    expect("alternative" in r.classifications[0]).toBe(false);
  });

  it("failure mode — no command and no commands → structured error", async () => {
    const r = await call(handler, "bash_classify", {});
    expect(r.error).toMatch(/bash_classify requires/i);
  });

  it("failure mode — empty `commands` array → structured error (nothing to classify)", async () => {
    const r = await call(handler, "bash_classify", { commands: [] });
    expect(r.error).toMatch(/bash_classify requires/i);
  });

  it("failure mode — empty-string `command` is rejected by the Zod schema (.min(1))", async () => {
    const r = await call(handler, "bash_classify", { command: "" });
    // validateActionParams rejects before the case runs.
    expect(r.error).toMatch(/invalid params for bash_classify/i);
  });

  it("adversarial — whitespace-only `command` passes the schema but the case rejects it", async () => {
    const r = await call(handler, "bash_classify", { command: "   " });
    // "   " has length ≥ 1 (schema OK) but trims to empty → case returns an error.
    expect(r.error).toMatch(/bash_classify requires/i);
  });

  it("adversarial — oversize command round-trips and is truncated in the result", async () => {
    const r = await call(handler, "bash_classify", {
      command: "echo " + "z".repeat(300),
    });
    expect(r.success).toBe(true);
    expect(r.classifications[0].command.length).toBe(80);
    expect(r.classifications[0].command.slice(-3)).toBe("...");
  });
});
