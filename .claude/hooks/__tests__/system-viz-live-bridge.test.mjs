// Tests for .claude/hooks/system-viz-live-bridge.mjs (U-HKA07).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/system-viz-live-bridge.test.mjs
//
// Intent: a graph-relevant edit pings the viz once (and not again within the client
// cooldown); state-dumps / cache / the viz's own dir never ping; a viz that's down
// never throws and never blocks the edit.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  isGraphRelevant,
  isDisabled,
  vizUrl,
  cacheDir,
  cooldownFile,
  shouldFire,
  runBridge,
} from "../system-viz-live-bridge.mjs";

let TMP;
const envFor = (o = {}) => ({ PRISM_VIZ_LIVE_CACHE_DIR: TMP, ...o });
beforeEach(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), "svlb-test-")); });
afterEach(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });

describe("isGraphRelevant", () => {
  it("source / docs / schemas → relevant", () => {
    for (const f of [
      "mcp-server/src/engines/FooEngine.ts", ".claude/hooks/bar.mjs", "scripts/x.mjs",
      "knowledge/wiki/architecture/y.md", "CLAUDE.md", "mcp-server/src/schemas/z.ts", "package.json",
      "H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts",
    ]) expect(isGraphRelevant(f)).toBe(true);
  });
  it("state dumps / cache / the viz's own dir / vcs / build / logs → NOT relevant", () => {
    for (const f of [
      "mcp-server/data/state/BASELINE_INVENTORY.json", "H:/prism/mcp-server/data/state/cron-jobs.json",
      ".claude/cache/file-read-cache.json", "H:/prism/.claude/cache/hook-telemetry.jsonl",
      "state/shared/system-viz/_server.cjs", "state/shared/system-viz/system-graph.json",
      "node_modules/foo/index.js", ".git/config", "dist/bundle.js", "coverage/lcov.info",
      "build.log", "package-lock.lock", "out.map",
    ]) expect(isGraphRelevant(f)).toBe(false);
  });
  it("empty / non-string → not relevant", () => {
    expect(isGraphRelevant("")).toBe(false);
    expect(isGraphRelevant(undefined)).toBe(false);
    expect(isGraphRelevant(42)).toBe(false);
  });
});

describe("isDisabled / vizUrl / cooldownFile", () => {
  it("PRISM_VIZ_LIVE=0 disables", () => {
    expect(isDisabled({ PRISM_VIZ_LIVE: "0" })).toBe(true);
    expect(isDisabled({})).toBe(false);
  });
  it("vizUrl: default + override (trailing slash stripped, /api/refresh appended)", () => {
    expect(vizUrl({})).toBe("http://localhost:8765/api/refresh");
    expect(vizUrl({ PRISM_VIZ_URL: "http://host:9000/" })).toBe("http://host:9000/api/refresh");
    expect(vizUrl({ PRISM_VIZ_URL: "http://host:9000" })).toBe("http://host:9000/api/refresh");
  });
  it("cooldownFile: under cache dir, per session, sanitized sid", () => {
    expect(cacheDir(envFor())).toBe(TMP);
    const p = cooldownFile("../../weird sid", envFor());
    expect(p.startsWith(TMP)).toBe(true);
    expect(path.basename(p)).not.toMatch(/[\\/ ]/);
    expect(cooldownFile("a", envFor())).not.toBe(cooldownFile("b", envFor()));
  });
});

describe("shouldFire", () => {
  it("relevant + no prior fire → fire", () => {
    expect(shouldFire({ filePath: "src/x.ts", lastFireAt: 0, now: 1000, cooldown: 3000 })).toMatchObject({ fire: true });
  });
  it("relevant + within cooldown → don't fire", () => {
    expect(shouldFire({ filePath: "src/x.ts", lastFireAt: 1000, now: 1500, cooldown: 3000 }).fire).toBe(false);
  });
  it("relevant + past cooldown → fire", () => {
    expect(shouldFire({ filePath: "src/x.ts", lastFireAt: 1000, now: 5000, cooldown: 3000 }).fire).toBe(true);
  });
  it("irrelevant path → don't fire even if cooldown elapsed", () => {
    expect(shouldFire({ filePath: "mcp-server/data/state/x.json", lastFireAt: 0, now: 99999, cooldown: 3000 }).fire).toBe(false);
  });
});

describe("runBridge — end to end (postFn injected, never hits the network)", () => {
  function calls() { const c = []; return { fn: async (url) => { c.push(url); return { ok: true, status: "started" }; }, list: c }; }

  it("disabled → not fired", async () => {
    const { fn, list } = calls();
    const r = await runBridge({ stdin: { tool_name: "Edit", tool_input: { file_path: "src/x.ts" }, session_id: "s" }, env: envFor({ PRISM_VIZ_LIVE: "0" }), now: 1e6, postFn: fn });
    expect(r.fired).toBe(false);
    expect(list).toEqual([]);
  });
  it("no file_path → not fired", async () => {
    const { fn } = calls();
    expect((await runBridge({ stdin: { tool_name: "Write", tool_input: {} }, env: envFor(), now: 1e6, postFn: fn })).fired).toBe(false);
  });
  it("graph-relevant Edit → fires once, calls postFn with the /api/refresh url, writes the cooldown file", async () => {
    const { fn, list } = calls();
    const r = await runBridge({ stdin: { tool_name: "Edit", tool_input: { file_path: "H:/prism/mcp-server/src/engines/X.ts" }, session_id: "s1" }, env: envFor(), now: 2e6, postFn: fn });
    expect(r.fired).toBe(true);
    expect(list).toEqual(["http://localhost:8765/api/refresh"]);
    expect(Number(fs.readFileSync(cooldownFile("s1", envFor()), "utf8"))).toBe(2e6);
  });
  it("a second edit within the cooldown → does NOT fire again; after the cooldown → fires", async () => {
    const { fn, list } = calls();
    const env = envFor();
    const sid = "burst";
    await runBridge({ stdin: { tool_name: "Edit", tool_input: { file_path: "src/a.ts" }, session_id: sid }, env, now: 10_000, postFn: fn });           // fires
    await runBridge({ stdin: { tool_name: "MultiEdit", tool_input: { file_path: "src/b.ts" }, session_id: sid }, env, now: 11_000, postFn: fn });      // +1s — within 3s cooldown → skip
    await runBridge({ stdin: { tool_name: "Write", tool_input: { file_path: "src/c.ts" }, session_id: sid }, env, now: 12_000, postFn: fn });          // +2s — still within → skip
    await runBridge({ stdin: { tool_name: "Edit", tool_input: { file_path: "src/d.ts" }, session_id: sid }, env, now: 20_000, postFn: fn });           // +10s — past cooldown → fires
    expect(list.length).toBe(2);
  });
  it("respects PRISM_VIZ_LIVE_COOLDOWN_MS override", async () => {
    const { fn, list } = calls();
    const env = envFor({ PRISM_VIZ_LIVE_COOLDOWN_MS: "100" });
    await runBridge({ stdin: { tool_input: { file_path: "src/a.ts" }, session_id: "cd" }, env, now: 1000, postFn: fn }); // fires
    await runBridge({ stdin: { tool_input: { file_path: "src/b.ts" }, session_id: "cd" }, env, now: 1050, postFn: fn }); // +50ms < 100ms → skip
    await runBridge({ stdin: { tool_input: { file_path: "src/c.ts" }, session_id: "cd" }, env, now: 1200, postFn: fn }); // +200ms > 100ms → fires
    expect(list.length).toBe(2);
  });
  it("irrelevant edit (a state dump) → never fires", async () => {
    const { fn, list } = calls();
    await runBridge({ stdin: { tool_name: "Write", tool_input: { file_path: "mcp-server/data/state/cron-jobs.json" }, session_id: "x" }, env: envFor(), now: 5e6, postFn: fn });
    await runBridge({ stdin: { tool_name: "Edit", tool_input: { file_path: ".claude/cache/foo.json" }, session_id: "x" }, env: envFor(), now: 6e6, postFn: fn });
    expect(list).toEqual([]);
  });
  it("viz is DOWN (postFn rejects-as-error) → still 'fired' (we attempted), never throws, doesn't block", async () => {
    const r = await runBridge({
      stdin: { tool_name: "Edit", tool_input: { file_path: "src/x.ts" }, session_id: "down" }, env: envFor(), now: 7e6,
      postFn: async () => ({ ok: false, error: "AbortError" }),
    });
    expect(r.fired).toBe(true);
    expect(r.post).toMatchObject({ ok: false });
  });
  it("postFn itself throwing is caught by runBridge's caller pattern — runBridge surfaces it as no-throw via the await", async () => {
    // runBridge awaits postFn; if postFn throws, runBridge would reject — the hook's main() catches that.
    // Here we just confirm runBridge propagates rather than crashing the test harness:
    await expect(runBridge({ stdin: { tool_input: { file_path: "src/x.ts" }, session_id: "t" }, env: envFor(), now: 8e6, postFn: async () => { throw new Error("boom"); } })).rejects.toThrow("boom");
  });
  it("garbled / null stdin → not fired, never throws", async () => {
    await expect(runBridge({ stdin: null, env: envFor(), now: 9e6, postFn: async () => ({ ok: true }) })).resolves.toMatchObject({ fired: false });
    await expect(runBridge({ stdin: { tool_input: { file_path: 123 } }, env: envFor(), now: 9e6, postFn: async () => ({ ok: true }) })).resolves.toMatchObject({ fired: false });
  });
  it("tool_input.path (not .file_path) is also honoured", async () => {
    const { fn, list } = calls();
    const r = await runBridge({ stdin: { tool_name: "NotebookEdit", tool_input: { path: "notebooks/x.ipynb" }, session_id: "nb" }, env: envFor(), now: 1.1e7, postFn: fn });
    expect(r.fired).toBe(true);
    expect(list.length).toBe(1);
  });
});
