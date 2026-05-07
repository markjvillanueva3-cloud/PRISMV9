/**
 * cog-bridge-drain — behavioral tests for queue draining.
 *
 * The script lives at .claude/helpers/cog-bridge-drain.mjs (outside src/) so
 * we invoke it via execSync against a sandbox PRISM_ROOT. The sandbox carries
 * fake .jsonl queue files and a fake `mcp-server/dist/engines/` skeleton with
 * stub modules whose dynamic imports the script will pick up.
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH10-FOLLOWUP
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DRAIN_SCRIPT = path.join(REPO_ROOT, ".claude", "helpers", "cog-bridge-drain.mjs");

const AWARENESS_REL = path.join("state", "shared", "awareness-rebuild-queue.jsonl");
const MEMORY_REL = path.join("state", "shared", "cog-bridge-memory-capture.jsonl");
const DRAIN_LOG_REL = path.join("state", "shared", "cog-bridge-drain.log.jsonl");
const ARCHIVE_REL = path.join("state", "shared", ".cog-bridge-archive");

let sandboxRoot: string;

beforeEach(() => {
  sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cogdrain-"));
  fs.mkdirSync(path.join(sandboxRoot, "state", "shared"), { recursive: true });
});

afterEach(() => {
  if (sandboxRoot && fs.existsSync(sandboxRoot)) {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
});

function runDrain(extraArgs: string[] = []): any {
  const args = ["--json", ...extraArgs];
  const out = execSync(`node "${DRAIN_SCRIPT}" ${args.join(" ")}`, {
    env: { ...process.env, PRISM_ROOT: sandboxRoot },
    encoding: "utf-8",
  });
  return JSON.parse(out);
}

function writeQueue(rel: string, lines: any[]): void {
  const p = path.join(sandboxRoot, rel);
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
}

describe("cog-bridge-drain — empty queues", () => {
  it("processes nothing when both queues are missing, exits 0", () => {
    const r = runDrain();
    expect(r.awareness.processed).toBe(0);
    expect(r.memory.processed).toBe(0);
    expect(r.awareness.rebuilt).toBe(false);
    expect(r.memory.persisted).toBe(0);
    expect(r.memory.errors).toBe(0);
    expect(r.dry_run).toBe(false);
  });

  it("processes nothing when both queues are empty files", () => {
    fs.writeFileSync(path.join(sandboxRoot, AWARENESS_REL), "");
    fs.writeFileSync(path.join(sandboxRoot, MEMORY_REL), "");
    const r = runDrain();
    expect(r.awareness.processed).toBe(0);
    expect(r.memory.processed).toBe(0);
  });

  it("emits a 1.0.0 schema version envelope with ISO ts and elapsed_ms", () => {
    const r = runDrain();
    expect(r.schema_version).toBe("1.0.0");
    expect(typeof r.ts).toBe("string");
    expect(r.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof r.elapsed_ms).toBe("number");
    expect(r.elapsed_ms).toBeGreaterThanOrEqual(0);
  });
});

describe("cog-bridge-drain — dry-run mode", () => {
  it("reports record counts without rotating queues", () => {
    writeQueue(AWARENESS_REL, [
      { ts: "2026-05-07T17:00:00.000Z", file: "/x/EngineA.ts", file_kind: "engine", tool: "Edit" },
      { ts: "2026-05-07T17:00:01.000Z", file: "/x/EngineB.ts", file_kind: "engine", tool: "Write" },
      { ts: "2026-05-07T17:00:02.000Z", file: "/x/EngineA.ts", file_kind: "engine", tool: "Edit" },
    ]);
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z", tool: "prism_orchestrate", action: "cognitive_tot_create_tree", summary: { keys: ["tree"], has_error: false, result_size_bytes: 25 } },
    ]);

    const r = runDrain(["--dry-run"]);
    expect(r.dry_run).toBe(true);
    expect(r.awareness.processed).toBe(3);
    expect(r.memory.processed).toBe(1);
    expect(r.awareness.dry_run).toBe(true);
    expect(r.memory.dry_run).toBe(true);

    // Queue files should still have their data (not rotated)
    const aw = fs.readFileSync(path.join(sandboxRoot, AWARENESS_REL), "utf-8");
    const me = fs.readFileSync(path.join(sandboxRoot, MEMORY_REL), "utf-8");
    expect(aw.split("\n").filter((l) => l.trim()).length).toBe(3);
    expect(me.split("\n").filter((l) => l.trim()).length).toBe(1);
  });

  it("dedupes awareness file paths in preview", () => {
    writeQueue(AWARENESS_REL, [
      { ts: "2026-05-07T17:00:00.000Z", file: "/x/EngineA.ts", file_kind: "engine", tool: "Edit" },
      { ts: "2026-05-07T17:00:01.000Z", file: "/x/EngineA.ts", file_kind: "engine", tool: "Edit" },
      { ts: "2026-05-07T17:00:02.000Z", file: "/x/EngineA.ts", file_kind: "engine", tool: "Edit" },
    ]);
    const r = runDrain(["--dry-run"]);
    expect(r.awareness.processed).toBe(3);
    expect(r.awareness.files.length).toBe(1);
    expect(r.awareness.files[0]).toBe("/x/EngineA.ts");
  });

  it("collects unique file kinds across awareness records", () => {
    writeQueue(AWARENESS_REL, [
      { ts: "2026-05-07T17:00:00.000Z", file: "/x/A.ts", file_kind: "engine", tool: "Edit" },
      { ts: "2026-05-07T17:00:01.000Z", file: "/x/B.ts", file_kind: "dispatcher", tool: "Write" },
      { ts: "2026-05-07T17:00:02.000Z", file: "/x/C.ts", file_kind: "schema", tool: "Edit" },
      { ts: "2026-05-07T17:00:03.000Z", file: "/x/D.ts", file_kind: "engine", tool: "Edit" },
    ]);
    const r = runDrain(["--dry-run"]);
    expect(r.awareness.file_kinds.sort()).toEqual(["dispatcher", "engine", "schema"]);
  });
});

describe("cog-bridge-drain — engine not built", () => {
  it("flags awareness error as engine-not-built when dist/ missing", () => {
    writeQueue(AWARENESS_REL, [
      { ts: "2026-05-07T17:00:00.000Z", file: "/x/A.ts", file_kind: "engine", tool: "Edit" },
    ]);
    const r = runDrain();
    expect(r.awareness.processed).toBe(1);
    expect(r.awareness.rebuilt).toBe(false);
    expect(r.awareness.error).toBe("engine-not-built");
  });

  it("flags memory error as engine-not-built and preserves queue", () => {
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z", tool: "prism_orchestrate", action: "cognitive_tot_create_tree", summary: { keys: ["tree"], has_error: false, result_size_bytes: 25 } },
    ]);
    const r = runDrain();
    expect(r.memory.processed).toBe(1);
    expect(r.memory.persisted).toBe(0);
    expect(r.memory.errors).toBe(1);
    expect(r.memory.error).toBe("engine-not-built");

    // Queue must be preserved when engine missing — records will retry next drain
    const me = fs.readFileSync(path.join(sandboxRoot, MEMORY_REL), "utf-8");
    expect(me.split("\n").filter((l) => l.trim()).length).toBe(1);
  });
});

describe("cog-bridge-drain — engine present, mock awareness rebuild", () => {
  function installFakeAwarenessEngine(): string {
    const enginePath = path.join(sandboxRoot, "mcp-server", "dist", "engines", "AgentSelfAwarenessEngine.js");
    fs.mkdirSync(path.dirname(enginePath), { recursive: true });
    const sentinel = path.join(sandboxRoot, "awareness-built.json");
    fs.writeFileSync(
      enginePath,
      `import * as fs from "node:fs";\n` +
      `export const agentSelfAwarenessEngine = {\n` +
      `  buildAwareness: async (force) => {\n` +
      `    fs.writeFileSync(${JSON.stringify(sentinel)}, JSON.stringify({ called: true, force }));\n` +
      `    return { stats: {}, topCapabilities: [], topEngines: [], refreshedAt: new Date() };\n` +
      `  },\n` +
      `};\n`
    );
    return sentinel;
  }

  it("invokes buildAwareness(true) exactly once for any non-empty queue", () => {
    const sentinel = installFakeAwarenessEngine();
    writeQueue(AWARENESS_REL, [
      { ts: "2026-05-07T17:00:00.000Z", file: "/x/A.ts", file_kind: "engine", tool: "Edit" },
      { ts: "2026-05-07T17:00:01.000Z", file: "/x/B.ts", file_kind: "engine", tool: "Edit" },
      { ts: "2026-05-07T17:00:02.000Z", file: "/x/C.ts", file_kind: "schema", tool: "Edit" },
    ]);
    const r = runDrain();
    expect(r.awareness.processed).toBe(3);
    expect(r.awareness.rebuilt).toBe(true);
    expect(r.awareness.error).toBeNull();

    const sentinelData = JSON.parse(fs.readFileSync(sentinel, "utf-8"));
    expect(sentinelData.called).toBe(true);
    expect(sentinelData.force).toBe(true);
  });

  it("rotates queue: original is empty after drain, snapshot archived", () => {
    installFakeAwarenessEngine();
    writeQueue(AWARENESS_REL, [
      { ts: "2026-05-07T17:00:00.000Z", file: "/x/A.ts", file_kind: "engine", tool: "Edit" },
    ]);
    runDrain();

    const aw = fs.readFileSync(path.join(sandboxRoot, AWARENESS_REL), "utf-8");
    expect(aw).toBe("");

    const archiveDir = path.join(sandboxRoot, ARCHIVE_REL);
    expect(fs.existsSync(archiveDir)).toBe(true);
    const archived = fs.readdirSync(archiveDir);
    expect(archived.length).toBe(1);
    expect(archived[0]).toMatch(/awareness-rebuild-queue\.jsonl\.processing-\d+/);
  });

  it("appends a drain log entry on real drains (not dry-run)", () => {
    installFakeAwarenessEngine();
    writeQueue(AWARENESS_REL, [
      { ts: "2026-05-07T17:00:00.000Z", file: "/x/A.ts", file_kind: "engine", tool: "Edit" },
    ]);
    runDrain();

    const log = fs.readFileSync(path.join(sandboxRoot, DRAIN_LOG_REL), "utf-8");
    const entries = log.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(entries.length).toBe(1);
    expect(entries[0].schema_version).toBe("1.0.0");
    expect(entries[0].awareness.rebuilt).toBe(true);
    expect(entries[0].dry_run).toBe(false);
  });
});

describe("cog-bridge-drain — engine present, mock memory remember", () => {
  function installFakeMemoryEngine(behavior: "ok" | "fail" | "throw" = "ok"): string {
    const enginePath = path.join(sandboxRoot, "mcp-server", "dist", "engines", "QdrantMemoryEngineSingleton.js");
    fs.mkdirSync(path.dirname(enginePath), { recursive: true });
    const sentinel = path.join(sandboxRoot, "remember-calls.jsonl");
    fs.writeFileSync(sentinel, "");

    let body: string;
    if (behavior === "ok") {
      body = `return { ok: true };`;
    } else if (behavior === "fail") {
      body = `return { ok: false, error: "qdrant-down" };`;
    } else {
      body = `throw new Error("boom");`;
    }

    fs.writeFileSync(
      enginePath,
      `import * as fs from "node:fs";\n` +
      `class FakeEngine {\n` +
      `  async remember(rec) {\n` +
      `    fs.appendFileSync(${JSON.stringify(sentinel)}, JSON.stringify(rec) + "\\n");\n` +
      `    ${body}\n` +
      `  }\n` +
      `}\n` +
      `export const QdrantMemoryEngineSingleton = {\n` +
      `  getInstance: () => new FakeEngine(),\n` +
      `};\n`
    );
    return sentinel;
  }

  it("calls remember() once per record, all persisted on success", () => {
    const sentinel = installFakeMemoryEngine("ok");
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z", tool: "prism_orchestrate", action: "cognitive_tot_create_tree", summary: { keys: ["tree"], has_error: false, result_size_bytes: 25 }, session_id: "s1" },
      { ts: "2026-05-07T17:00:01.000Z", tool: "prism_ai", action: "cognitive_mfg_reason", summary: { keys: ["chain", "outcome"], has_error: false, result_size_bytes: 1024 }, session_id: "s1" },
    ]);
    const r = runDrain();
    expect(r.memory.processed).toBe(2);
    expect(r.memory.persisted).toBe(2);
    expect(r.memory.errors).toBe(0);

    const calls = fs.readFileSync(sentinel, "utf-8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(calls.length).toBe(2);
    expect(calls[0].kind).toBe("cognitive_outcome");
    expect(calls[0].id).toMatch(/^cog-cognitive_tot_create_tree-/);
    expect(calls[0].text).toContain("prism_orchestrate::cognitive_tot_create_tree");
    expect(calls[0].metadata.source).toBe("cog-bridge-drain");
    expect(calls[0].metadata.tool).toBe("prism_orchestrate");
    expect(calls[0].metadata.action).toBe("cognitive_tot_create_tree");
    expect(calls[0].metadata.session_id).toBe("s1");
    expect(calls[0].metadata.result_size_bytes).toBe(25);
  });

  it("counts errors when remember() returns ok=false", () => {
    installFakeMemoryEngine("fail");
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z", tool: "prism_orchestrate", action: "cognitive_tot_create_tree", summary: { keys: ["tree"], has_error: false, result_size_bytes: 25 } },
      { ts: "2026-05-07T17:00:01.000Z", tool: "prism_orchestrate", action: "cognitive_mfg_reason", summary: { keys: ["x"], has_error: false, result_size_bytes: 50 } },
    ]);
    const r = runDrain();
    expect(r.memory.processed).toBe(2);
    expect(r.memory.persisted).toBe(0);
    expect(r.memory.errors).toBe(2);
    expect(r.memory.sample.length).toBeGreaterThan(0);
    expect(r.memory.sample[0].error).toBe("qdrant-down");
  });

  it("counts errors when remember() throws", () => {
    installFakeMemoryEngine("throw");
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z", tool: "prism_orchestrate", action: "cognitive_tot_create_tree", summary: { keys: ["tree"], has_error: false, result_size_bytes: 25 } },
    ]);
    const r = runDrain();
    expect(r.memory.processed).toBe(1);
    expect(r.memory.persisted).toBe(0);
    expect(r.memory.errors).toBe(1);
    expect(r.memory.sample[0].error).toBe("boom");
  });
});

describe("cog-bridge-drain — malformed JSON resilience", () => {
  it("skips malformed lines without crashing", () => {
    const p = path.join(sandboxRoot, AWARENESS_REL);
    fs.writeFileSync(
      p,
      JSON.stringify({ ts: "2026-05-07T17:00:00.000Z", file: "/x/A.ts", file_kind: "engine", tool: "Edit" }) + "\n" +
      "{NOT VALID JSON\n" +
      JSON.stringify({ ts: "2026-05-07T17:00:01.000Z", file: "/x/B.ts", file_kind: "engine", tool: "Edit" }) + "\n"
    );
    const r = runDrain(["--dry-run"]);
    expect(r.awareness.processed).toBe(2); // bad line skipped, 2 valid
  });
});

describe("cog-bridge-drain — strict mode exit codes", () => {
  it("exits 0 when no errors even in strict mode", () => {
    const out = execSync(`node "${DRAIN_SCRIPT}" --strict --json`, {
      env: { ...process.env, PRISM_ROOT: sandboxRoot },
      encoding: "utf-8",
    });
    const r = JSON.parse(out);
    expect(r.awareness.processed).toBe(0);
    expect(r.memory.processed).toBe(0);
  });

  it("exits 1 in strict mode when memory engine missing and queue has records", () => {
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z", tool: "prism_orchestrate", action: "cognitive_tot_create_tree", summary: { keys: ["tree"], has_error: false, result_size_bytes: 25 } },
    ]);
    let exitCode = 0;
    try {
      execSync(`node "${DRAIN_SCRIPT}" --strict --json`, {
        env: { ...process.env, PRISM_ROOT: sandboxRoot },
        encoding: "utf-8",
      });
    } catch (e: any) {
      exitCode = e.status;
    }
    expect(exitCode).toBe(1);
  });
});

describe("cog-bridge-drain — cognitive outcome text format", () => {
  function installFakeMemoryEngine(): string {
    const enginePath = path.join(sandboxRoot, "mcp-server", "dist", "engines", "QdrantMemoryEngineSingleton.js");
    fs.mkdirSync(path.dirname(enginePath), { recursive: true });
    const sentinel = path.join(sandboxRoot, "remember-calls.jsonl");
    fs.writeFileSync(sentinel, "");
    fs.writeFileSync(
      enginePath,
      `import * as fs from "node:fs";\n` +
      `class FakeEngine {\n` +
      `  async remember(rec) {\n` +
      `    fs.appendFileSync(${JSON.stringify(sentinel)}, JSON.stringify(rec) + "\\n");\n` +
      `    return { ok: true };\n` +
      `  }\n` +
      `}\n` +
      `export const QdrantMemoryEngineSingleton = { getInstance: () => new FakeEngine() };\n`
    );
    return sentinel;
  }

  it("includes tool, action, has_error, result_size_bytes in serialized text", () => {
    const sentinel = installFakeMemoryEngine();
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z", tool: "prism_ai", action: "cognitive_creative_solve", summary: { keys: ["solution", "score"], has_error: true, result_size_bytes: 4096 }, session_id: "s42" },
    ]);
    runDrain();

    const calls = fs.readFileSync(sentinel, "utf-8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(calls.length).toBe(1);
    expect(calls[0].text).toContain("prism_ai::cognitive_creative_solve");
    expect(calls[0].text).toContain("solution, score");
    expect(calls[0].text).toContain("Has error: true");
    expect(calls[0].text).toContain("4096 bytes");
    expect(calls[0].metadata.has_error).toBe(true);
    expect(calls[0].metadata.result_size_bytes).toBe(4096);
  });

  it("uses fallback strings when fields are missing", () => {
    const sentinel = installFakeMemoryEngine();
    writeQueue(MEMORY_REL, [
      { ts: "2026-05-07T17:00:00.000Z" },
    ]);
    runDrain();

    const calls = fs.readFileSync(sentinel, "utf-8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(calls.length).toBe(1);
    expect(calls[0].text).toContain("unknown::unknown");
    expect(calls[0].text).toContain("Has error: false");
    expect(calls[0].text).toContain("0 bytes");
    expect(calls[0].metadata.tool).toBe("unknown");
    expect(calls[0].metadata.action).toBe("unknown");
    expect(calls[0].metadata.session_id).toBeNull();
  });
});
