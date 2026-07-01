/**
 * graph-guards-gac07-gac08.test.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC07 + U-GAC08
 *
 * Contract tests for the two PreToolUse guard hooks (spawned with piped stdin + env,
 * asserting stdout JSON / exit code). Hermetic: temp graph (mtime override) + temp
 * find-cache fixture; never touches the real 644MB graph or live indexes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HOOKS = dirname(fileURLToPath(import.meta.url)); // this test lives IN .claude/hooks
const G07 = join(HOOKS, "stale-graph-guard.mjs");
const G08 = join(HOOKS, "hallucinated-node-id-guard.mjs");

// run a hook: returns {stdout, code}. exit 2 (block) is surfaced via the thrown error.
function run(hook, input, env = {}) {
  try {
    const stdout = execFileSync(process.execPath, [hook], {
      input: JSON.stringify(input),
      env: { ...process.env, ...env },
      encoding: "utf8",
    });
    return { stdout, code: 0 };
  } catch (e) {
    return { stdout: String(e.stdout || ""), stderr: String(e.stderr || ""), code: e.status };
  }
}

function tmpGraph(ageHours) {
  const d = mkdtempSync(join(tmpdir(), "gg-"));
  const f = join(d, "system-graph.json");
  writeFileSync(f, "{}");
  if (ageHours) { const t = Date.now() / 1000 - ageHours * 3600; utimesSync(f, t, t); }
  return { dir: d, file: f };
}
function tmpFindCache(ids) {
  const d = mkdtempSync(join(tmpdir(), "gfc-"));
  const f = join(d, "find-cache.json");
  writeFileSync(f, JSON.stringify({ nodes: ids.map((id) => ({ id })) }));
  return { dir: d, file: f };
}

describe("stale-graph-guard (U-GAC07)", () => {
  it("warn (default): stale viz tool -> additionalContext, no deny", () => {
    const g = tmpGraph(10);
    const r = run(G07, { tool_name: "master_index_query" }, { PRISM_VIZ_GRAPH_PATH: g.file });
    rmSync(g.dir, { recursive: true, force: true });
    const o = JSON.parse(r.stdout);
    assert.equal(r.code, 0);
    assert.match(o.hookSpecificOutput.additionalContext, /WARNING stale graph/);
    assert.equal(o.decision, undefined);
  });
  it("block mode: stale -> decision deny", () => {
    const g = tmpGraph(10);
    const r = run(G07, { tool_name: "master_index_query" }, { PRISM_VIZ_GRAPH_PATH: g.file, PRISM_STALE_GRAPH_GUARD: "block" });
    rmSync(g.dir, { recursive: true, force: true });
    assert.equal(JSON.parse(r.stdout).decision, "deny");
  });
  it("fresh graph -> {} (no warn/deny)", () => {
    const g = tmpGraph(0);
    const r = run(G07, { tool_name: "master_index_query" }, { PRISM_VIZ_GRAPH_PATH: g.file, PRISM_STALE_GRAPH_GUARD: "block" });
    rmSync(g.dir, { recursive: true, force: true });
    assert.deepEqual(JSON.parse(r.stdout), {});
  });
  it("non-viz tool -> {}", () => {
    const g = tmpGraph(10);
    const r = run(G07, { tool_name: "Bash" }, { PRISM_VIZ_GRAPH_PATH: g.file, PRISM_STALE_GRAPH_GUARD: "block" });
    rmSync(g.dir, { recursive: true, force: true });
    assert.deepEqual(JSON.parse(r.stdout), {});
  });
  it("off mode -> {}", () => {
    const g = tmpGraph(10);
    const r = run(G07, { tool_name: "master_index_query" }, { PRISM_VIZ_GRAPH_PATH: g.file, PRISM_STALE_GRAPH_GUARD: "off" });
    rmSync(g.dir, { recursive: true, force: true });
    assert.deepEqual(JSON.parse(r.stdout), {});
  });
  it("empty/malformed stdin -> {}", () => {
    assert.deepEqual(JSON.parse(run(G07, {}).stdout), {});
  });
});

describe("hallucinated-node-id-guard (U-GAC08)", () => {
  const FC = tmpFindCache(["eng.mill", "disp.prism_ai"]);
  it("advisory default: bash w/ node-id -> additionalContext, zero block", () => {
    const r = run(G08, { tool_name: "Bash", tool_input: { command: "echo eng.mill eng.fake" } });
    const o = JSON.parse(r.stdout);
    assert.equal(r.code, 0);
    assert.match(o.hookSpecificOutput.additionalContext, /Node-id\(s\) referenced/);
  });
  it("non-Bash tool -> {} (does not scan Edit/Write content)", () => {
    assert.deepEqual(JSON.parse(run(G08, { tool_name: "Write", tool_input: { content: "eng.fake" } }).stdout), {});
  });
  it("bash w/ no node-id -> {}", () => {
    assert.deepEqual(JSON.parse(run(G08, { tool_name: "Bash", tool_input: { command: "ls -la" } }).stdout), {});
  });
  it("noisy fs./test./git. tokens NOT matched -> {}", () => {
    assert.deepEqual(JSON.parse(run(G08, { tool_name: "Bash", tool_input: { command: "cat fs.x test.y git.z" } }).stdout), {});
  });
  it("block mode: known id -> {} exit 0", () => {
    const r = run(G08, { tool_name: "Bash", tool_input: { command: "echo eng.mill" } }, { PRISM_NODEID_GUARD_BLOCK: "1", PRISM_VIZ_FINDCACHE_PATH: FC.file });
    assert.equal(r.code, 0);
    assert.deepEqual(JSON.parse(r.stdout), {});
  });
  it("block mode: unknown id -> decision:block stdout + exit 2 + stderr", () => {
    const r = run(G08, { tool_name: "Bash", tool_input: { command: "echo eng.fake999" } }, { PRISM_NODEID_GUARD_BLOCK: "1", PRISM_VIZ_FINDCACHE_PATH: FC.file });
    assert.equal(r.code, 2);
    assert.equal(JSON.parse(r.stdout).decision, "block");
    assert.match(r.stderr, /unknown node-id: eng\.fake999/);
  });
  it("block mode FAIL-OPEN: missing find-cache -> advisory, exit 0 (never blocks)", () => {
    const r = run(G08, { tool_name: "Bash", tool_input: { command: "echo eng.fake" } }, { PRISM_NODEID_GUARD_BLOCK: "1", PRISM_VIZ_FINDCACHE_PATH: "/no/such/find-cache.json" });
    assert.equal(r.code, 0);
    assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /id-set unavailable/);
  });
  it("disabled -> {}", () => {
    assert.deepEqual(JSON.parse(run(G08, { tool_name: "Bash", tool_input: { command: "echo eng.fake" } }, { PRISM_NODEID_GUARD_DISABLE: "1" }).stdout), {});
  });
  it("cleanup", () => { rmSync(FC.dir, { recursive: true, force: true }); assert.ok(true); });
});
