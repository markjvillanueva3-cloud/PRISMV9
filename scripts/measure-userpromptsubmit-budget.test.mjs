/**
 * Tests for measure-userpromptsubmit-budget.mjs — pure-fn coverage.
 *
 * U-MWO08 (slot:bravo 2026-05-26). Real concrete-value assertions only.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BUDGET_BYTES,
  extractUserPromptHooks,
  parseHookOutput,
  probeHook,
  probeHookSteadyState,
  summarizeSteadyProbes,
  renderSteadyReport,
  buildBudgetReport,
  renderReport,
  loadSettings,
} from "./measure-userpromptsubmit-budget.mjs";

describe("BUDGET_BYTES", () => {
  it("is 3 KB per spec", () => {
    assert.equal(BUDGET_BYTES, 3 * 1024);
  });
});

describe("extractUserPromptHooks", () => {
  it("extracts node-invoked .mjs/.cjs/.js scripts", () => {
    const settings = {
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              { type: "command", command: "node H:/prism/.claude/hooks/a.mjs" },
              { type: "command", command: "node H:/prism/.claude/hooks/b.cjs" },
              { type: "command", command: 'node "H:/prism/.claude/hooks/c.js"', timeout: 2000 },
              { type: "command", command: "rm -rf /" },     // no script path — skipped
              { type: "shell", command: "echo foo" },        // not type:command — skipped
            ],
          },
        ],
      },
    };
    const out = extractUserPromptHooks(settings);
    assert.equal(out.length, 3);
    assert.ok(out[0].scriptPath.endsWith("a.mjs"));
    assert.ok(out[1].scriptPath.endsWith("b.cjs"));
    assert.ok(out[2].scriptPath.endsWith("c.js"));
    assert.equal(out[2].timeoutMs, 2000);
  });

  it("returns empty array when no UserPromptSubmit hooks", () => {
    assert.deepEqual(extractUserPromptHooks({}), []);
    assert.deepEqual(extractUserPromptHooks({ hooks: {} }), []);
    assert.deepEqual(extractUserPromptHooks({ hooks: { UserPromptSubmit: [] } }), []);
  });

  it("survives malformed groups", () => {
    const settings = { hooks: { UserPromptSubmit: [null, undefined, {}, { hooks: null }] } };
    assert.deepEqual(extractUserPromptHooks(settings), []);
  });
});

describe("parseHookOutput", () => {
  it("extracts additionalContext byte length", () => {
    const out = parseHookOutput(JSON.stringify({ hookSpecificOutput: { additionalContext: "abc" } }));
    assert.equal(out.ok, true);
    assert.equal(out.contextBytes, 3);
  });

  it("falls back to systemMessage when no additionalContext", () => {
    const out = parseHookOutput(JSON.stringify({ systemMessage: "hello" }));
    assert.equal(out.ok, true);
    assert.equal(out.contextBytes, 5);
  });

  it("returns 0 for parseable JSON with no recognized context", () => {
    const out = parseHookOutput(JSON.stringify({ continue: true }));
    assert.equal(out.ok, true);
    assert.equal(out.contextBytes, 0);
  });

  it("returns ok:false on invalid JSON", () => {
    const out = parseHookOutput("not json at all");
    assert.equal(out.ok, false);
    assert.equal(out.contextBytes, 0);
    assert.ok(typeof out.error === "string");
  });

  it("counts multi-byte UTF-8 correctly", () => {
    // Emoji 🚀 = 4 bytes UTF-8
    const out = parseHookOutput(JSON.stringify({ systemMessage: "🚀" }));
    assert.equal(out.contextBytes, 4);
  });
});

describe("buildBudgetReport", () => {
  it("totals + flags within-budget", () => {
    const probes = [
      { scriptPath: "a.mjs", ok: true, contextBytes: 500 },
      { scriptPath: "b.mjs", ok: true, contextBytes: 800 },
    ];
    const r = buildBudgetReport(probes);
    assert.equal(r.totalBytes, 1300);
    assert.equal(r.overBudget, false);
    assert.equal(r.overByBytes, 0);
    assert.equal(r.probeCount, 2);
    assert.equal(r.succeededCount, 2);
    assert.equal(r.failedCount, 0);
    assert.equal(r.topConsumers[0].scriptPath, "b.mjs");
    assert.equal(r.topConsumers[1].scriptPath, "a.mjs");
  });

  it("flags overBudget when total > 3 KB", () => {
    const probes = [{ scriptPath: "big.mjs", ok: true, contextBytes: 5000 }];
    const r = buildBudgetReport(probes);
    assert.equal(r.overBudget, true);
    assert.equal(r.overByBytes, 5000 - 3072);
  });

  it("counts failed probes separately", () => {
    const probes = [
      { scriptPath: "a.mjs", ok: true, contextBytes: 100 },
      { scriptPath: "b.mjs", ok: false, error: "boom", contextBytes: 0 },
    ];
    const r = buildBudgetReport(probes);
    assert.equal(r.succeededCount, 1);
    assert.equal(r.failedCount, 1);
    assert.equal(r.totalBytes, 100);
  });

  it("topConsumers caps at 5 + excludes zero-byte probes", () => {
    const probes = Array.from({ length: 10 }, (_, i) => ({ scriptPath: `s${i}.mjs`, ok: true, contextBytes: (i + 1) * 100 }));
    probes.push({ scriptPath: "zero.mjs", ok: true, contextBytes: 0 });
    const r = buildBudgetReport(probes);
    assert.equal(r.topConsumers.length, 5);
    assert.equal(r.topConsumers[0].scriptPath, "s9.mjs");   // highest first
    assert.ok(!r.topConsumers.some((c) => c.contextBytes === 0));
  });
});

describe("renderReport", () => {
  it("emits markdown with budget + total + top-consumers table", () => {
    const r = buildBudgetReport([
      { scriptPath: "a.mjs", ok: true, contextBytes: 1500 },
      { scriptPath: "b.mjs", ok: true, contextBytes: 600 },
    ]);
    const md = renderReport(r);
    assert.ok(md.includes("# UserPromptSubmit budget report"));
    assert.ok(md.includes(`Budget: ${BUDGET_BYTES} bytes`));
    assert.ok(md.includes("Total: 2100 bytes"));
    assert.ok(md.includes("✓ within"));
    assert.ok(md.includes("| a.mjs |"));
    assert.ok(md.includes("| b.mjs |"));
  });

  it("renders ✗ OVER when budget exceeded", () => {
    const r = buildBudgetReport([{ scriptPath: "huge.mjs", ok: true, contextBytes: 9999 }]);
    const md = renderReport(r);
    assert.ok(md.includes("✗ OVER"));
  });
});

describe("loadSettings (with mock fs)", () => {
  it("parses settings.json from canonical home location", () => {
    const fsImpl = {
      readFileSync(p) {
        const norm = String(p).replace(/[/\\]+/g, "/");
        if (norm.endsWith("/.claude/settings.json")) return JSON.stringify({ hooks: { UserPromptSubmit: [] } });
        throw new Error(`ENOENT ${p}`);
      },
    };
    const { settings, path: spath } = loadSettings({ fsImpl, home: "/home" });
    assert.deepEqual(settings, { hooks: { UserPromptSubmit: [] } });
    assert.ok(spath.includes("settings.json"));
  });

  it("returns settings=null + error on missing file", () => {
    const fsImpl = {
      readFileSync() { throw new Error("ENOENT"); },
    };
    const { settings, error } = loadSettings({ fsImpl, home: "/home" });
    assert.equal(settings, null);
    assert.ok(typeof error === "string");
  });
});

// --- STEADY-STATE probe (U-INJECTION-STEADY-STATE-PROBE) ---------------------

describe("probeHook (session id passthrough)", () => {
  it("includes session_id in stdin only when provided", () => {
    let captured = null;
    const spawn = (_e, _a, opts) => {
      captured = JSON.parse(opts.input);
      return { status: 0, stdout: JSON.stringify({ hookSpecificOutput: { additionalContext: "x" } }) };
    };
    probeHook("h.mjs", "P", { spawn });
    assert.deepEqual(captured, { prompt: "P" });
    probeHook("h.mjs", "P", { spawn, sessionId: "s-1" });
    assert.deepEqual(captured, { prompt: "P", session_id: "s-1" });
  });
});

describe("probeHookSteadyState", () => {
  it("separates first-emit from throttled steady-state; both calls share the session", () => {
    const sessions = [];
    let call = 0;
    const spawn = (_e, _a, opts) => {
      sessions.push(JSON.parse(opts.input).session_id);
      call += 1;
      const ctx = call === 1 ? "a".repeat(1461) : "b".repeat(126);   // 1461 B first, 126 B throttled
      return { status: 0, stdout: JSON.stringify({ hookSpecificOutput: { additionalContext: ctx } }) };
    };
    const r = probeHookSteadyState("slot-domain.mjs", "P", "sess-X", { spawn });
    assert.equal(r.ok, true);
    assert.equal(r.firstBytes, 1461);
    assert.equal(r.steadyBytes, 126);
    assert.equal(r.savedBytes, 1461 - 126);
    assert.deepEqual(sessions, ["sess-X", "sess-X"]);
  });

  it("ok=false when the second pass fails", () => {
    let call = 0;
    const spawn = () => {
      call += 1;
      return call === 1
        ? { status: 0, stdout: JSON.stringify({ hookSpecificOutput: { additionalContext: "ok" } }) }
        : { status: 1, stdout: "" };
    };
    const r = probeHookSteadyState("h.mjs", "P", "s", { spawn });
    assert.equal(r.ok, false);
    assert.equal(r.firstBytes, 2);
    assert.equal(r.steadyBytes, 0);
  });

  it("savedBytes never negative when steady >= first", () => {
    let call = 0;
    const spawn = () => {
      call += 1;
      const ctx = call === 1 ? "a".repeat(50) : "b".repeat(120);
      return { status: 0, stdout: JSON.stringify({ hookSpecificOutput: { additionalContext: ctx } }) };
    };
    const r = probeHookSteadyState("h.mjs", "P", "s", { spawn });
    assert.equal(r.savedBytes, 0);
  });
});

describe("summarizeSteadyProbes", () => {
  it("totals first vs steady + within-cap + savedByThrottling", () => {
    const probes = [
      { scriptPath: "a.mjs", ok: true, firstBytes: 1461, steadyBytes: 126 },
      { scriptPath: "b.mjs", ok: true, firstBytes: 800, steadyBytes: 800 },
    ];
    const s = summarizeSteadyProbes(probes, { capBytes: 3072, nowIso: "2026-06-11T00:00:00.000Z" });
    assert.equal(s.firstTotalBytes, 2261);
    assert.equal(s.steadyTotalBytes, 926);
    assert.equal(s.savedByThrottling, 2261 - 926);
    assert.equal(s.steadyOverCap, false);
    assert.equal(s.steadyOverByBytes, 0);
    assert.equal(s.schemaVersion, "1.1.0");
    assert.equal(s.measured_at, "2026-06-11T00:00:00.000Z");
    assert.equal(s.topBySteady[0].scriptPath, "b.mjs");
  });

  it("flags steadyOverCap when steady total exceeds cap", () => {
    const probes = [{ scriptPath: "big.mjs", ok: true, firstBytes: 9000, steadyBytes: 5000 }];
    const s = summarizeSteadyProbes(probes, { capBytes: 3072 });
    assert.equal(s.steadyOverCap, true);
    assert.equal(s.steadyOverByBytes, 5000 - 3072);
  });

  it("excludes zero-steady probes from topBySteady + counts failures", () => {
    const probes = [
      { scriptPath: "a.mjs", ok: true, firstBytes: 100, steadyBytes: 100 },
      { scriptPath: "z.mjs", ok: false, firstBytes: 0, steadyBytes: 0 },
    ];
    const s = summarizeSteadyProbes(probes);
    assert.equal(s.failedCount, 1);
    assert.equal(s.succeededCount, 1);
    assert.ok(!s.topBySteady.some((p) => p.steadyBytes === 0));
  });
});

describe("renderSteadyReport", () => {
  it("emits ASCII markdown with first/steady totals + within cap", () => {
    const s = summarizeSteadyProbes(
      [{ scriptPath: "a.mjs", ok: true, firstBytes: 1461, steadyBytes: 126 }],
      { capBytes: 3072, nowIso: "2026-06-11T00:00:00.000Z" },
    );
    const md = renderSteadyReport(s);
    assert.ok(md.includes("# UserPromptSubmit STEADY-STATE budget"));
    assert.ok(md.includes("First-emit total: 1461 bytes"));
    assert.ok(md.includes("STEADY total: 126 bytes"));
    assert.ok(md.includes("within cap"));
    assert.ok(md.includes("| a.mjs |"));
    assert.ok(!md.includes("OVER CAP"));   // within-cap case renders the ASCII word-form, not a glyph
  });

  it("renders OVER CAP when steady exceeds cap", () => {
    const s = summarizeSteadyProbes([{ scriptPath: "big.mjs", ok: true, firstBytes: 9000, steadyBytes: 5000 }], { capBytes: 3072 });
    const md = renderSteadyReport(s);
    assert.ok(md.includes("OVER CAP"));
  });
});
