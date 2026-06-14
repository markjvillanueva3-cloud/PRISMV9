// tier: T4
// Tests for .claude/hooks/ollama-route-pretooluse.mjs (U-HKA04).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/ollama-route-pretooluse.test.mjs
//
// Intent: only bulk-data reads get routed; source/small/edited files are left
// alone; default mode merely SUGGESTS the local-LLM path; auto mode substitutes
// an Ollama summary but FAILS OPEN (Ollama down/slow ⇒ the Read just proceeds).

import { describe, it, expect } from "vitest";
import {
  isDisabled,
  classifyReadTarget,
  decideRoute,
  isGistSafe,
  runRoute,
} from "../ollama-route-pretooluse.mjs";

const KB = 1024;
const statOf = (bytes, isFile = true) => () => ({ isFile: () => isFile, size: bytes });
const statMissing = () => { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); };

describe("isDisabled", () => {
  it("PRISM_OLLAMA_ROUTE=0 disables; anything else enabled", () => {
    expect(isDisabled({ PRISM_OLLAMA_ROUTE: "0" })).toBe(true);
    expect(isDisabled({})).toBe(false);
    expect(isDisabled({ PRISM_OLLAMA_ROUTE: "1" })).toBe(false);
  });
});

describe("classifyReadTarget — bulk data vs source/doc (variability axis)", () => {
  it("source files are never consumable", () => {
    for (const f of ["a/b/c.ts", "x.tsx", "y.py", "z.rs", "w/foo.go", "Component.vue", "build.sh"]) {
      expect(classifyReadTarget(f)).toMatchObject({ consumable: false, kind: "source" });
    }
  });
  it("bulk extensions are consumable regardless of path", () => {
    for (const f of ["debug.log", "events.jsonl", "rows.csv", "x.tsv", "scratch.txt", "build.out"]) {
      expect(classifyReadTarget(f).consumable).toBe(true);
    }
  });
  it(".json/.md/.xml count as bulk data ONLY under a report/state path", () => {
    expect(classifyReadTarget("mcp-server/data/state/BASELINE_INVENTORY.json").consumable).toBe(true);
    expect(classifyReadTarget("state/shared/BUILD_STATE.json").consumable).toBe(true);
    expect(classifyReadTarget("roadmap-drift-report.json").consumable).toBe(true);
    expect(classifyReadTarget("package.json").consumable).toBe(false);
    expect(classifyReadTarget("mcp-server/tsconfig.json").consumable).toBe(false);
    expect(classifyReadTarget("knowledge/wiki/architecture/_stats.md").consumable).toBe(false);
    expect(classifyReadTarget("state/shared/handoffs/X.md").consumable).toBe(true); // under state/
  });
  it("extensionless files: bulk only under a report/state/log path", () => {
    expect(classifyReadTarget("logs/server").consumable).toBe(true);
    expect(classifyReadTarget("Makefile").consumable).toBe(false);
    expect(classifyReadTarget("bin/portable-node").consumable).toBe(false);
  });
  it("unrecognised types and empty paths → not consumable", () => {
    expect(classifyReadTarget("icon.png").consumable).toBe(false);
    expect(classifyReadTarget("archive.zip").consumable).toBe(false);
    expect(classifyReadTarget("")).toMatchObject({ consumable: false });
    expect(classifyReadTarget(undefined)).toMatchObject({ consumable: false });
  });
});

describe("decideRoute — the pure routing decision", () => {
  const min = 24 * KB;
  it("non-existent file → pass", () => {
    expect(decideRoute({ filePath: "x.log", exists: false, sizeBytes: 0, mode: "suggest", ollamaReachable: false, minBytes: min }).action).toBe("pass");
  });
  it("too small → pass", () => {
    expect(decideRoute({ filePath: "x.log", exists: true, sizeBytes: 10 * KB, mode: "suggest", ollamaReachable: false, minBytes: min }).action).toBe("pass");
  });
  it("big but a source file → pass", () => {
    expect(decideRoute({ filePath: "huge/Engine.ts", exists: true, sizeBytes: 200 * KB, mode: "suggest", ollamaReachable: true, minBytes: min }).action).toBe("pass");
  });
  it("big + bulk-data + suggest mode → suggest", () => {
    expect(decideRoute({ filePath: "build.log", exists: true, sizeBytes: 200 * KB, mode: "suggest", ollamaReachable: false, minBytes: min }).action).toBe("suggest");
  });
  it("big + bulk-data + auto mode + ollama up → reroute", () => {
    expect(decideRoute({ filePath: "events.jsonl", exists: true, sizeBytes: 200 * KB, mode: "auto", ollamaReachable: true, minBytes: min }).action).toBe("reroute");
  });
  it("big + bulk-data + auto mode + ollama DOWN → falls back to suggest", () => {
    expect(decideRoute({ filePath: "events.jsonl", exists: true, sizeBytes: 200 * KB, mode: "auto", ollamaReachable: false, minBytes: min }).action).toBe("suggest");
  });
});

describe("runRoute — end to end (IO injected)", () => {
  const base = { reachableFn: async () => true };
  it("no file_path in stdin → pass", async () => {
    expect((await runRoute({ stdin: { tool_name: "Read", tool_input: {} }, env: {}, ...base, statFn: statOf(999 * KB) })).action).toBe("pass");
  });
  it("disabled via PRISM_OLLAMA_ROUTE=0 → pass", async () => {
    expect((await runRoute({ stdin: { tool_input: { file_path: "big.log" } }, env: { PRISM_OLLAMA_ROUTE: "0" }, ...base, statFn: statOf(999 * KB) })).action).toBe("pass");
  });
  it("small file → pass", async () => {
    expect((await runRoute({ stdin: { tool_input: { file_path: "tiny.log" } }, env: {}, ...base, statFn: statOf(2 * KB) })).action).toBe("pass");
  });
  it("big source file → pass (never interfere with code reads)", async () => {
    expect((await runRoute({ stdin: { tool_input: { file_path: "src/BigEngine.ts" } }, env: {}, ...base, statFn: statOf(500 * KB) })).action).toBe("pass");
  });
  it("big .log, default mode → suggest, message points at /ollama-summarize", async () => {
    const r = await runRoute({ stdin: { tool_input: { file_path: "H:/prism/build.log" } }, env: {}, ...base, statFn: statOf(120 * KB) });
    expect(r.action).toBe("suggest");
    expect(r.message).toMatch(/\/ollama-summarize/);
    expect(r.sizeKB).toBe(120);
  });
  it("big .jsonl, auto mode, ollama up, summariser returns text → reroute with the gist", async () => {
    const r = await runRoute({
      stdin: { tool_input: { file_path: "state/shared/events.jsonl" } },
      env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
      statFn: statOf(300 * KB),
      reachableFn: async () => true,
      summarizeFn: async () => "• 3 streams • DLQ empty • last event 5m ago",
    });
    expect(r.action).toBe("reroute");
    expect(r.message).toMatch(/DLQ empty/);
    expect(r.message).toMatch(/NOT loaded into context/);
  });
  it("auto mode but the summariser fails (ollama hiccup) → pass (FAIL OPEN — the Read proceeds)", async () => {
    const r = await runRoute({
      stdin: { tool_input: { file_path: "state/shared/events.jsonl" } },
      env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
      statFn: statOf(300 * KB),
      reachableFn: async () => true,
      summarizeFn: async () => null,
    });
    expect(r.action).toBe("pass");
  });
  it("auto mode but ollama unreachable → falls back to suggest (doesn't even call the summariser)", async () => {
    let called = false;
    const r = await runRoute({
      stdin: { tool_input: { file_path: "state/shared/events.jsonl" } },
      env: { PRISM_OLLAMA_ROUTE_AUTO: "1" },
      statFn: statOf(300 * KB),
      reachableFn: async () => false,
      summarizeFn: async () => { called = true; return "x"; },
    });
    expect(r.action).toBe("suggest");
    expect(called).toBe(false);
  });
  it("stat throws (file vanished between turns) → pass, no throw", async () => {
    expect((await runRoute({ stdin: { tool_input: { file_path: "gone.log" } }, env: {}, ...base, statFn: statMissing })).action).toBe("pass");
  });
  it("garbled / null stdin → pass, never throws", async () => {
    await expect(runRoute({ stdin: null, env: {}, ...base, statFn: statOf(1) })).resolves.toMatchObject({ action: "pass" });
    await expect(runRoute({ stdin: { tool_input: { file_path: 123 } }, env: {}, ...base, statFn: statOf(1) })).resolves.toMatchObject({ action: "pass" });
  });
  it("PRISM_OLLAMA_ROUTE_MIN_KB override moves the threshold", async () => {
    const env = { PRISM_OLLAMA_ROUTE_MIN_KB: "100" };
    expect((await runRoute({ stdin: { tool_input: { file_path: "x.log" } }, env, ...base, statFn: statOf(80 * KB) })).action).toBe("pass");      // under 100KB
    expect((await runRoute({ stdin: { tool_input: { file_path: "x.log" } }, env, ...base, statFn: statOf(150 * KB) })).action).toBe("suggest"); // over 100KB
  });
});

// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-AUTO-ROUTE-ALLOWLIST: curated gist-only
// allowlist. Auto mode may summary-substitute ONLY logs/dumps/archives;
// decision-bearing data (digests/inventory/state/audit) stays suggest-only.
describe("isGistSafe — curated auto-route allowlist", () => {
  it("raw log/text/dump extensions are gist-safe", () => {
    expect(isGistSafe("/p/logs/session.log")).toBe(true);
    expect(isGistSafe("/p/notes/scratch.txt")).toBe(true);
    expect(isGistSafe("/p/run.out")).toBe(true);
  });

  it("files under a logs/ or archive/ path are gist-safe", () => {
    expect(isGistSafe("H:/prism/logs/whatever.bak")).toBe(true);
    expect(isGistSafe("H:/prism/archive/old-run")).toBe(true);
    expect(isGistSafe("/x/core.dump.bin")).toBe(true); // dump marker
  });

  it("structured / decision-bearing data is NEVER gist-safe (exact-value class)", () => {
    expect(isGistSafe("H:/prism/PRISM-INVENTORY-LATEST.md")).toBe(false);
    expect(isGistSafe("/p/state/build-state-digest.json")).toBe(false);
    expect(isGistSafe("/p/state/AGENT_CHAT.jsonl")).toBe(false);
    expect(isGistSafe("/p/state/audit-report.csv")).toBe(false);
    // even a .json physically under logs/ stays exact-value
    expect(isGistSafe("H:/prism/logs/metrics-snapshot.json")).toBe(false);
  });

  it("empty / non-string input is not gist-safe", () => {
    expect(isGistSafe("")).toBe(false);
    expect(isGistSafe(null)).toBe(false);
  });
});

describe("decideRoute — auto mode honours the gist allowlist", () => {
  const D = (filePath, mode) =>
    decideRoute({ filePath, exists: true, sizeBytes: 50 * KB, mode, ollamaReachable: true, modelOk: true, minBytes: 8 * KB });

  it("auto mode REROUTES a gist-safe log", () => {
    expect(D("H:/prism/logs/session.log", "auto").action).toBe("reroute");
  });

  it("auto mode DOWNGRADES an exact-value data-doc to suggest (never silently summarized)", () => {
    const d = D("H:/prism/state/shared/some-audit-report.json", "auto");
    expect(d.action).toBe("suggest");
    expect(d.reason).toMatch(/curated gist allowlist/);
  });

  it("suggest mode is unchanged for both file classes (back-compat)", () => {
    expect(D("H:/prism/logs/session.log", "suggest").action).toBe("suggest");
    expect(D("H:/prism/state/shared/some-audit-report.json", "suggest").action).toBe("suggest");
  });
});
