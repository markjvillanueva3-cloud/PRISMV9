/**
 * ollama-route-pretooluse.test.mjs — tests for U1 of GPU-OFFLOAD-MAXIMIZE-MS0.
 *
 * Covers:
 *   - loadRouteConfig: absent, corrupt, valid, malicious minKb:0, invalid mode, invalid model.
 *   - decideRoute cascade short-circuit: auto + unreachable → pass; auto + model not in
 *     allowlist → pass; auto + reachable + model verified → reroute; suggest mode preserved;
 *     source files exempt regardless of mode; small files always pass.
 *   - runRoute env-vs-config precedence: env wins, config wins when env unset.
 *   - Substitute message banner contains [OLLAMA-SUBSTITUTE / sha256= / bytes= markers.
 *
 * Uses node:test (no test runner harness beyond `node --test`). All IO is injected via
 * the function-level dependency-injection seams (readFn, statFn, tagsFetchFn, summarizeFn,
 * configFn, telemetryFn, statsFn) so no real disk or network is touched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadRouteConfig,
  decideRoute,
  classifyReadTarget,
  isDisabled,
  runRoute,
} from "./ollama-route-pretooluse.mjs";

// ── loadRouteConfig ──────────────────────────────────────────────────────────

test("loadRouteConfig: absent file (ENOENT) returns null silently", () => {
  const r = loadRouteConfig({
    configPath: "/does/not/exist/here.json",
    readFn: () => {
      const e = new Error("not found");
      e.code = "ENOENT";
      throw e;
    },
  });
  assert.equal(r, null);
});

test("loadRouteConfig: corrupt JSON returns null + records parse_error telemetry", () => {
  const records = [];
  const r = loadRouteConfig({
    configPath: "/dummy",
    readFn: () => "{ not valid json",
    telemetryFn: (rec) => records.push(rec),
  });
  assert.equal(r, null);
  assert.equal(records.length, 1);
  assert.equal(records[0].event, "config_parse_error");
});

test("loadRouteConfig: valid full config returns it", () => {
  const r = loadRouteConfig({
    configPath: "/dummy",
    readFn: () => JSON.stringify({ mode: "auto", minKb: 24, model: "qwen2.5-coder:32b" }),
  });
  assert.deepEqual(r, { mode: "auto", minKb: 24, model: "qwen2.5-coder:32b" });
});

test("loadRouteConfig: malicious minKb:0 is rejected with telemetry; mode/model preserved", () => {
  const records = [];
  const r = loadRouteConfig({
    configPath: "/dummy",
    readFn: () => JSON.stringify({ mode: "auto", minKb: 0, model: "qwen2.5-coder:32b" }),
    telemetryFn: (rec) => records.push(rec),
  });
  assert.equal(r.minKb, undefined, "minKb:0 must be dropped (DoS guard)");
  assert.equal(r.mode, "auto");
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.equal(records.length, 1);
  assert.equal(records[0].event, "config_bad_minKb");
});

test("loadRouteConfig: invalid mode is rejected with telemetry", () => {
  const records = [];
  const r = loadRouteConfig({
    configPath: "/dummy",
    readFn: () => JSON.stringify({ mode: "whatever" }),
    telemetryFn: (rec) => records.push(rec),
  });
  assert.equal(r.mode, undefined);
  assert.equal(records.length, 1);
  assert.equal(records[0].event, "config_bad_mode");
});

test("loadRouteConfig: invalid model name (spaces) is rejected with telemetry", () => {
  const records = [];
  const r = loadRouteConfig({
    configPath: "/dummy",
    readFn: () => JSON.stringify({ model: "bad model name with spaces" }),
    telemetryFn: (rec) => records.push(rec),
  });
  assert.equal(r.model, undefined);
  assert.equal(records.length, 1);
  assert.equal(records[0].event, "config_bad_model");
});

test("loadRouteConfig: array root returns null (not an object)", () => {
  const r = loadRouteConfig({
    configPath: "/dummy",
    readFn: () => JSON.stringify(["mode", "auto"]),
  });
  assert.equal(r, null);
});

// ── decideRoute cascade ──────────────────────────────────────────────────────

test("decideRoute: auto + ollama unreachable → pass (cascade short-circuit to raw Read)", () => {
  const r = decideRoute({
    filePath: "/repo/state/bulk.json",
    exists: true,
    sizeBytes: 100 * 1024,
    mode: "auto",
    ollamaReachable: false,
    modelOk: false,
    minBytes: 24 * 1024,
  });
  assert.equal(r.action, "pass");
  assert.match(r.reason, /cascade short-circuit/);
});

test("decideRoute: auto + ollama up but model NOT in /api/tags allowlist → pass", () => {
  const r = decideRoute({
    filePath: "/repo/state/bulk.json",
    exists: true,
    sizeBytes: 100 * 1024,
    mode: "auto",
    ollamaReachable: true,
    modelOk: false,
    minBytes: 24 * 1024,
  });
  assert.equal(r.action, "pass");
  assert.match(r.reason, /allowlist.*cascade short-circuit/);
});

test("decideRoute: auto + reachable + model verified → reroute", () => {
  const r = decideRoute({
    filePath: "/repo/state/bulk.json",
    exists: true,
    sizeBytes: 100 * 1024,
    mode: "auto",
    ollamaReachable: true,
    modelOk: true,
    minBytes: 24 * 1024,
  });
  assert.equal(r.action, "reroute");
});

test("decideRoute: suggest mode + reachable → suggest (not reroute)", () => {
  const r = decideRoute({
    filePath: "/repo/state/bulk.json",
    exists: true,
    sizeBytes: 100 * 1024,
    mode: "suggest",
    ollamaReachable: true,
    modelOk: true,
    minBytes: 24 * 1024,
  });
  assert.equal(r.action, "suggest");
});

test("decideRoute: source file (.ts) → pass regardless of mode", () => {
  const r = decideRoute({
    filePath: "/repo/src/engines/Engine.ts",
    exists: true,
    sizeBytes: 100 * 1024,
    mode: "auto",
    ollamaReachable: true,
    modelOk: true,
    minBytes: 24 * 1024,
  });
  assert.equal(r.action, "pass");
  assert.equal(r.kind, "source");
});

test("decideRoute: small file → pass even in auto mode (under threshold)", () => {
  const r = decideRoute({
    filePath: "/repo/state/small.json",
    exists: true,
    sizeBytes: 1024,
    mode: "auto",
    ollamaReachable: true,
    modelOk: true,
    minBytes: 24 * 1024,
  });
  assert.equal(r.action, "pass");
  assert.match(r.reason, /under 24KB/);
});

// ── runRoute env-vs-config precedence + banner ───────────────────────────────

const fakeStatBulk = () => ({ isFile: () => true, size: 100 * 1024 });
const fakeStatSrc = () => ({ isFile: () => true, size: 100 * 1024 });
const fakeTagsOk = async () => ({ ok: true, models: ["qwen2.5-coder:32b"] });
const fakeTagsDown = async () => ({ ok: false, models: [] });
const fakeSummarize = async () => ({ summary: "concise summary text", contentSha: "abcd1234deadbeef" });
const stubStats = () => {};

test("runRoute: env PRISM_OLLAMA_ROUTE_AUTO=1 wins over config mode='suggest'", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({ mode: "suggest" }),
    statsFn: stubStats,
  });
  assert.equal(r.action, "reroute");
});

test("runRoute: env PRISM_OLLAMA_ROUTE_AUTO=0 wins over config mode='auto'", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "0" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({ mode: "auto" }),
    statsFn: stubStats,
  });
  assert.equal(r.action, "suggest");
});

test("runRoute: env unset + config.mode='auto' + reachable + model in allowlist → reroute", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: {},
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({ mode: "auto", model: "qwen2.5-coder:32b" }),
    statsFn: stubStats,
  });
  assert.equal(r.action, "reroute");
});

test("runRoute: config absent (configFn returns null) → defaults preserved (suggest mode)", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: {},
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => null,
    statsFn: stubStats,
  });
  assert.equal(r.action, "suggest");
});

test("runRoute: auto mode + Ollama DOWN → pass-through (raw Read), NOT suggest, NOT substitute", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsDown,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: stubStats,
  });
  assert.equal(r.action, "pass", "cascade short-circuit MUST pass-through (raw Read), not suggest");
});

test("runRoute: auto mode + model NOT in /api/tags → pass-through (raw Read)", async () => {
  const tagsWithoutOurModel = async () => ({ ok: true, models: ["llama3.2:3b", "mistral:7b"] });
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1", PRISM_OLLAMA_ROUTE_MODEL: "qwen2.5-coder:32b" },
    statFn: fakeStatBulk,
    tagsFetchFn: tagsWithoutOurModel,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: stubStats,
  });
  assert.equal(r.action, "pass");
});

test("runRoute: source file Read passes through even in auto mode + all systems up", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/src/engines/Foo.ts" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
    statFn: fakeStatSrc,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: stubStats,
  });
  assert.equal(r.action, "pass");
});

test("runRoute: substitute banner contains [OLLAMA-SUBSTITUTE + sha256= + bytes= markers (fail-loud)", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: stubStats,
  });
  assert.equal(r.action, "reroute");
  assert.match(r.message, /\[OLLAMA-SUBSTITUTE/, "banner must start with [OLLAMA-SUBSTITUTE prefix");
  assert.match(r.message, /sha256=/, "banner must include sha256= marker");
  assert.match(r.message, /bytes=/, "banner must include bytes= marker");
  assert.match(r.message, /route=auto/, "banner must include route=auto marker");
  assert.match(r.message, /model=qwen2\.5-coder:32b/, "banner must include model= marker");
});

test("runRoute: summarize fails (returns null) → fail-OPEN to pass (raw Read)", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: async () => null,
    configFn: () => ({}),
    statsFn: stubStats,
  });
  assert.equal(r.action, "pass", "summarize failure must fail-open to raw Read, not return suggest");
});

test("runRoute: isDisabled=true → immediate pass", async () => {
  const r = await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE: "0" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: stubStats,
  });
  assert.equal(r.action, "pass");
});

// ── statsFn telemetry-unification contract ────────────────────────────────────

test("runRoute: statsFn called with {decision:'reroute', sizeKB} on successful auto substitute", async () => {
  const calls = [];
  await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: (rec) => calls.push(rec),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].decision, "reroute");
  assert.equal(calls[0].sizeKB, 100);
});

test("runRoute: statsFn called with {decision:'suggest', sizeKB} in suggest mode", async () => {
  const calls = [];
  await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: {},
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsOk,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: (rec) => calls.push(rec),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].decision, "suggest");
});

test("runRoute: statsFn called with {decision:'pass', sizeKB} on cascade short-circuit (auto+down)", async () => {
  const calls = [];
  await runRoute({
    stdin: { tool_input: { file_path: "/repo/mcp-server/data/state/bulk.json" } },
    env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
    statFn: fakeStatBulk,
    tagsFetchFn: fakeTagsDown,
    summarizeFn: fakeSummarize,
    configFn: () => ({}),
    statsFn: (rec) => calls.push(rec),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].decision, "pass");
});

// ── classifyReadTarget + isDisabled sanity ───────────────────────────────────

test("classifyReadTarget: .ts source rejected", () => {
  const c = classifyReadTarget("/repo/src/foo.ts");
  assert.equal(c.consumable, false);
  assert.equal(c.kind, "source");
});

test("classifyReadTarget: EXEMPT — ollama-route-config.json itself never substituted", () => {
  const c = classifyReadTarget("/repo/mcp-server/data/state/ollama-route-config.json");
  assert.equal(c.consumable, false);
  assert.equal(c.kind, "exempt");
  assert.match(c.reason, /load-bearing/);
});

test("classifyReadTarget: EXEMPT — MILESTONE_PROGRESS.json never substituted (operator-critical)", () => {
  const c = classifyReadTarget("/repo/state/shared/MILESTONE_PROGRESS.json");
  assert.equal(c.consumable, false);
  assert.equal(c.kind, "exempt");
});

test("classifyReadTarget: EXEMPT — BUILD_STATE.json never substituted", () => {
  const c = classifyReadTarget("/repo/state/shared/BUILD_STATE.json");
  assert.equal(c.consumable, false);
  assert.equal(c.kind, "exempt");
});

test("classifyReadTarget: .jsonl bulk accepted", () => {
  const c = classifyReadTarget("/repo/data/state/events.jsonl");
  assert.equal(c.consumable, true);
});

test("classifyReadTarget: .json under state/ accepted as data-doc", () => {
  const c = classifyReadTarget("/repo/state/shared/dashboard.json");
  assert.equal(c.consumable, true);
  assert.equal(c.kind, "data-doc");
});

test("classifyReadTarget: .json NOT under state/ rejected as doc", () => {
  const c = classifyReadTarget("/repo/src/package.json");
  assert.equal(c.consumable, false);
  assert.equal(c.kind, "doc");
});

test("isDisabled: env PRISM_OLLAMA_ROUTE='0' returns true", () => {
  assert.equal(isDisabled({ PRISM_OLLAMA_ROUTE: "0" }), true);
});

test("isDisabled: env unset returns false", () => {
  assert.equal(isDisabled({}), false);
});
