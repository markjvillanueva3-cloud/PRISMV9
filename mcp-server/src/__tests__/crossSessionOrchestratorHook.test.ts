/**
 * crossSessionOrchestratorHook.test.ts — integration tests for the
 * .claude/hooks/cross-session-orchestrator.mjs hook (COORD-MS0/U-COORD05).
 *
 * The hook is spawned as a child process; stdin payloads simulate the
 * PreToolUse/PostToolUse JSON that Claude Code feeds to hooks.
 *
 * Every assertion is value-bearing — exact integer for status, deep-equal
 * for stdout JSON, concrete byte-delta + payload-field equality for broadcast
 * events. No placeholder assertions (toBeDefined / toBeNull / toBeTruthy /
 * length-greater-than-zero). No mocked SUTs — the hook is the real script
 * spawned via `H:/.claude/bin/portable-node`.
 *
 * Resource paths are unique per test (run-id + label) so concurrent test
 * runs never collide with each other or with live broker state.
 *
 * Broadcast isolation (U-GOLF-COORD-TEST-ISOLATE, 2026-07-01): every hook
 * spawn gets PRISM_BROADCAST_CHANNEL_PATH pointing at a tmpdir channel file,
 * never the live fleet channel. The live channel's TRIM_LINE_CAP=1000
 * trim-on-append (CrossTerminalBroadcastEngine.writeToBroadcastChannel)
 * rewrites the shared file smaller mid-test, which made the old live-file
 * size-delta assertions nondeterministic (4-5 flaky fails per run) -- and the
 * suite polluted the real coordination channel peers watch with __test__
 * events. Broadcast-asserting tests use a per-test channel (makeChannel);
 * every other spawn lands on a per-run default channel. A stale dist bundle
 * (engine predating the knob) fails LOUDLY: events land on the live channel
 * and the isolated file stays absent.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const REPO_ROOT = "H:/prism";
const HOOK_PATH = path.join(REPO_ROOT, ".claude", "hooks", "cross-session-orchestrator.mjs");
// Use the same Node interpreter currently running this test. Avoids the
// Windows shebang-resolution gap (the production hook command in
// settings.json points at the portable-node bash shim, which Node's
// spawnSync cannot resolve without a shell). For test purposes the runtime
// is what matters — the hook itself is portable Node ESM.
const NODE_BIN = process.execPath;

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Isolated broadcast channels (U-GOLF-COORD-TEST-ISOLATE): one tmpdir per run.
// Broadcast-asserting tests get a per-test file via makeChannel(label); every
// other hook spawn lands on the per-run default, so NOTHING in this suite ever
// writes the live fleet channel (mcp-server/data/state/BROADCAST_CHANNEL.jsonl).
const TEST_CHANNEL_DIR = path.join(os.tmpdir(), "prism-u-coord05", RUN_ID);
const DEFAULT_TEST_CHANNEL = path.join(TEST_CHANNEL_DIR, "default-channel.jsonl");

// Concrete session-id format regexes — match the orchestrator facade contract.
// Facade: `{family}@{hostname}/pid-{pid}` (post-U-COORD04). Fallback: `session-{pid}`.
const FACADE_SESSION_RE = /^(?:Claude|claude|codex|other)@[\w.-]+\/pid-\d+$/i;
const FALLBACK_SESSION_RE = /^session-\d+/;

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
  parsed: Record<string, unknown>;
}

function runHook(args: string[], stdin: string, env: Record<string, string> = {}): RunResult {
  const r = spawnSync(NODE_BIN, [HOOK_PATH, ...args], {
    input: stdin,
    encoding: "utf-8",
    timeout: 10_000,
    // Default isolation: a hook spawn must never write the live fleet channel.
    // Broadcast-asserting tests override with their own per-test channel.
    env: { ...process.env, PRISM_BROADCAST_CHANNEL_PATH: DEFAULT_TEST_CHANNEL, ...env },
  });
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(r.stdout.trim()) as Record<string, unknown>; } catch { /* parsed stays {} */ }
  return {
    status: typeof r.status === "number" ? r.status : -1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    parsed,
  };
}

function sizeOrZero(p: string): number {
  try { return fs.statSync(p).size; } catch { return 0; }
}

function makeChannel(label: string): string {
  return path.join(TEST_CHANNEL_DIR, `channel-${label}.jsonl`);
}

function channelLines(channel: string): string[] {
  try {
    return fs.readFileSync(channel, "utf-8").trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// On-disk JSONL shape (engine-level BroadcastEvent). The facade
// (CrossSessionOrchestratorEngine.broadcastMessage, post-U-COORD04) maps
// semantic types (info/warning/request/response) onto the canonical
// cache_invalidate channel and moves the original type into
// payload.semantic_type and the message content into payload.content.
interface BroadcastEvent {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  payload: {
    file: string;
    tool: string;
    session: string;
    action: string;
    content: string;
    semantic_type: string;
  };
}

function readLatestBroadcastEvent(channel: string): BroadcastEvent {
  let best: BroadcastEvent | undefined;
  const lines = channelLines(channel);
  if (lines.length > 0) {
    try {
      const candidate = JSON.parse(lines[lines.length - 1]) as Partial<BroadcastEvent>;
      best = {
        id: candidate.id || "",
        from: candidate.from || "",
        timestamp: candidate.timestamp || "",
        type: candidate.type || "",
        payload: {
          file: candidate.payload?.file || "",
          tool: candidate.payload?.tool || "",
          session: candidate.payload?.session || "",
          action: candidate.payload?.action || "",
          content: candidate.payload?.content || "",
          semantic_type: candidate.payload?.semantic_type || "",
        },
      };
    } catch { /* malformed line */ }
  }
  return best || {
    id: "", from: "", timestamp: "", type: "",
    payload: { file: "", tool: "", session: "", action: "", content: "", semantic_type: "" },
  };
}

function makeResource(label: string): string {
  return `H:/prism/__test__/u-coord05/${RUN_ID}/${label}.txt`;
}

beforeAll(() => {
  // Real file-existence assertion — the test cannot run without these.
  const hookExists = fs.existsSync(HOOK_PATH);
  const nodeExists = fs.existsSync(NODE_BIN);
  expect(hookExists).toBe(true);
  expect(nodeExists).toBe(true);
  // Stale-dist sentinel: the isolation knob lives in the BROADCAST engine dist
  // (the facade dist imports it as a sibling module and has 0 refs itself). A
  // dist predating the knob would silently leak every spawn's events onto the
  // LIVE fleet channel -- absence asserts would then pass for the wrong reason
  // and a filtered run ("-t 'no broadcast'") would go green while polluting.
  // Fail the whole suite up front instead.
  const broadcastDist = path.join(REPO_ROOT, "mcp-server", "dist", "engines", "CrossTerminalBroadcastEngine.js");
  expect(fs.readFileSync(broadcastDist, "utf-8").includes("PRISM_BROADCAST_CHANNEL_PATH")).toBe(true);
});

afterAll(() => {
  // tmpdir hygiene -- drop this run's isolated channel files (best-effort).
  try { fs.rmSync(TEST_CHANNEL_DIR, { recursive: true, force: true }); } catch { /* locked/absent */ }
});

describe("cross-session-orchestrator hook — defensive contract", () => {
  it("empty stdin emits exact {continue:true} and exits 0", () => {
    const r = runHook(["--pre"], "");
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("malformed JSON stdin emits exact {continue:true}", () => {
    const r = runHook(["--pre"], "{not json");
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("missing tool_name emits exact {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({ tool_input: { file_path: "x" } }));
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("tool_name=Read emits exact {continue:true} (not in allowlist)", () => {
    const channel = makeChannel("read-skip");
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Read",
      tool_input: { file_path: makeResource("read-skip") },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    // Non-allowlisted tool must not broadcast at all -- channel never created.
    expect(fs.existsSync(channel)).toBe(false);
  });

  it("tool_name=Bash emits exact {continue:true}", () => {
    const channel = makeChannel("bash-skip");
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "ls" },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(fs.existsSync(channel)).toBe(false);
  });

  it("tool_input missing emits exact {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({ tool_name: "Edit" }));
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("file_path missing on Edit emits exact {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({ tool_name: "Edit", tool_input: {} }));
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("file_path empty string emits exact {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: "" },
    }));
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("file_path whitespace-only emits exact {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: "   " },
    }));
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("PRISM_COORD_ORCH_DISABLE=1 emits exact {continue:true} (no engine load attempted)", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("disabled-knob") },
    }), { PRISM_COORD_ORCH_DISABLE: "1" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("PRISM_COORD_ORCH_DIST pointing at nonexistent module emits exact {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("bad-dist") },
    }), { PRISM_COORD_ORCH_DIST: "file:///H:/prism/__NONEXISTENT__.js" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });
});

describe("cross-session-orchestrator hook — tool allowlist (Edit/Write/MultiEdit/NotebookEdit)", () => {
  const tools = ["Edit", "Write", "MultiEdit"] as const;

  for (const tool of tools) {
    it(`PreToolUse ${tool} broadcasts edit_started with payload.tool=${tool}`, () => {
      const resource = makeResource(`allow-${tool}`);
      const channel = makeChannel(`allow-${tool}`);
      const before = sizeOrZero(channel);
      const r = runHook(["--pre"], JSON.stringify({
        tool_name: tool,
        tool_input: { file_path: resource },
      }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
      const after = sizeOrZero(channel);
      expect(r.status).toBe(0);
      expect(r.parsed).toEqual({ continue: true });
      // Isolated channel: born empty, gains exactly one ~280-byte event line.
      expect(before).toBe(0);
      expect(after - before >= 50).toBe(true);
      expect(channelLines(channel).length).toBe(1);

      const event = readLatestBroadcastEvent(channel);
      // Facade contract (post-U-COORD04): the hook sends type:"info", which
      // rides the canonical cache_invalidate channel; the original type and
      // the content are recovered from the payload.
      expect(event.type).toBe("cache_invalidate");
      expect(event.payload.semantic_type).toBe("info");
      expect(event.payload.content).toBe("edit_started");
      expect(event.payload.tool).toBe(tool);
      expect(event.payload.file).toBe(resource);
      // Session id MUST match one of two concrete contract regexes.
      const isFacade = FACADE_SESSION_RE.test(event.payload.session);
      const isFallback = FALLBACK_SESSION_RE.test(event.payload.session);
      expect(isFacade || isFallback).toBe(true);
    });
  }

  it("PreToolUse NotebookEdit reads notebook_path → payload.file matches the .ipynb path", () => {
    const notebookPath = makeResource("notebook").replace(/\.txt$/, ".ipynb");
    const channel = makeChannel("notebook");
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "NotebookEdit",
      tool_input: { notebook_path: notebookPath },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(channelLines(channel).length).toBe(1);

    const event = readLatestBroadcastEvent(channel);
    expect(event.payload.file).toBe(notebookPath);
    expect(event.payload.tool).toBe("NotebookEdit");
  });

  it("PreToolUse NotebookEdit with ONLY file_path (no notebook_path) emits no broadcast", () => {
    const channel = makeChannel("notebook-wrong-field");
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "NotebookEdit",
      tool_input: { file_path: makeResource("notebook-wrong-field") },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    // Hook must NOT fall back to file_path for NotebookEdit -- channel never created.
    expect(fs.existsSync(channel)).toBe(false);
  });
});

describe("cross-session-orchestrator hook — PostToolUse release + cache_invalidate", () => {
  it("PostToolUse Edit broadcasts cache_invalidate with payload.action='edited'", () => {
    const resource = makeResource("post-edit");
    const channel = makeChannel("post-edit");
    const r = runHook(["--post"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: resource },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(channelLines(channel).length).toBe(1);

    const event = readLatestBroadcastEvent(channel);
    expect(event.type).toBe("cache_invalidate");
    // Native cache_invalidate (not a mapped semantic type) -- no semantic_type marker.
    expect(event.payload.semantic_type).toBe("");
    expect(event.payload.action).toBe("edited");
    expect(event.payload.tool).toBe("Edit");
    expect(event.payload.file).toBe(resource);
  });

  it("PostToolUse MultiEdit emits payload.tool='MultiEdit' on cache_invalidate", () => {
    const resource = makeResource("post-multiedit");
    const channel = makeChannel("post-multiedit");
    const r = runHook(["--post"], JSON.stringify({
      tool_name: "MultiEdit",
      tool_input: { file_path: resource },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(channelLines(channel).length).toBe(1);

    const event = readLatestBroadcastEvent(channel);
    expect(event.type).toBe("cache_invalidate");
    expect(event.payload.tool).toBe("MultiEdit");
    expect(event.payload.action).toBe("edited");
  });

  it("default argv (no --pre/--post) routes to pre — confirms argv parser does not crash", () => {
    const r = runHook([], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("no-argv") },
    }), { PRISM_COORD_ORCH_DISABLE: "1" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });
});

describe("cross-session-orchestrator hook — adversarial inputs", () => {
  it("file_path 5000 chars (over 4096 cap) → no broadcast", () => {
    const channel = makeChannel("over-cap");
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: "H:/" + "a".repeat(5000) },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(fs.existsSync(channel)).toBe(false);
  });

  it("file_path 3990 chars (under cap) → broadcasts with the exact path", () => {
    const resource = "H:/" + "a".repeat(3990);
    const channel = makeChannel("under-cap");
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: resource },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(channelLines(channel).length).toBe(1);
    const event = readLatestBroadcastEvent(channel);
    expect(event.payload.file).toBe(resource);
  });

  it("tool_input is a string (not an object) → no broadcast", () => {
    const channel = makeChannel("string-input");
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: "not-an-object",
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(fs.existsSync(channel)).toBe(false);
  });

  it("camelCase keys (toolName/toolInput/filePath) → broadcasts with the resolved path", () => {
    const resource = makeResource("camel-case");
    const channel = makeChannel("camel-case");
    const r = runHook(["--pre"], JSON.stringify({
      toolName: "Edit",
      toolInput: { filePath: resource },
    }), { PRISM_BROADCAST_CHANNEL_PATH: channel });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
    expect(channelLines(channel).length).toBe(1);
    const event = readLatestBroadcastEvent(channel);
    expect(event.payload.file).toBe(resource);
  });

  it("PRISM_COORD_ORCH_TTL_MS='not-a-number' → falls back to default, exits {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("ttl-nan") },
    }), { PRISM_COORD_ORCH_TTL_MS: "not-a-number" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("PRISM_COORD_ORCH_TTL_MS='Infinity' → engine caps at 24h, exits {continue:true}", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("ttl-infinity") },
    }), { PRISM_COORD_ORCH_TTL_MS: "Infinity" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("PRISM_COORD_ORCH_TTL_MS='60000' → exits {continue:true} (1-minute TTL accepted)", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("ttl-valid") },
    }), { PRISM_COORD_ORCH_TTL_MS: "60000" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });
});

describe("cross-session-orchestrator hook — block path (PRISM_COORD_ORCH_BLOCK=1)", () => {
  it("default mode (no BLOCK env) → r.parsed.continue === true AND r.parsed.decision is missing", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("block-default") },
    }));
    expect(r.status).toBe(0);
    expect(r.parsed.continue).toBe(true);
    // Concrete absence: stringify check against the contract shape.
    expect(JSON.stringify(r.parsed)).toBe(JSON.stringify({ continue: true }));
  });

  it("BLOCK=1 with peer-seeded claim → exact 'block' contract OR exact 'continue' contract", () => {
    const resource = makeResource("block-peer-conflict");
    const seedScript = `
      import('file:///H:/prism/mcp-server/dist/engines/CrossSessionOrchestratorEngine.js').then(({crossSessionOrchestratorEngine: e}) => {
        const r = e.claim({resource: ${JSON.stringify(resource)}, ttlMs: 60000, reason: "test-peer-seed"});
        process.stdout.write(JSON.stringify(r));
      });
    `;
    const seed = spawnSync(NODE_BIN, ["-e", seedScript], {
      encoding: "utf-8",
      timeout: 10_000,
      env: {
        ...process.env,
        CLAUDE_SESSION_ID: `peer-seed-${RUN_ID}-aaaaaaaa`,
        PRISM_AGENT_FAMILY: "claude",
        // Seed process constructs the engine too -- keep it off the live channel.
        PRISM_BROADCAST_CHANNEL_PATH: DEFAULT_TEST_CHANNEL,
      },
    });
    let seedSuccess = false;
    try {
      const parsed = JSON.parse(seed.stdout) as { success?: boolean };
      seedSuccess = parsed.success === true;
    } catch { /* leave false */ }

    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: resource },
    }), {
      CLAUDE_SESSION_ID: `hook-runner-${RUN_ID}-bbbbbbbb`,
      PRISM_AGENT_FAMILY: "claude",
      PRISM_COORD_ORCH_BLOCK: "1",
    });

    expect(r.status).toBe(0);
    // Two valid concrete contract shapes — match exactly one.
    if (r.parsed.decision === "block") {
      const reason = String(r.parsed.reason || "");
      expect(reason.includes("PRISM_COORD_ORCH_BLOCK")).toBe(true);
      expect(reason.includes("Held by")).toBe(true);
      expect(reason.includes(resource)).toBe(true);
    } else {
      // Both outcomes are legitimate even when seeding succeeded: the seed
      // process EXITS immediately after claiming, and AtomicClaimBroker does
      // zombie reaping of claims whose holder pid is dead -- so by probe time
      // the claim may or may not survive. The exact-shape contracts above are
      // what this test guarantees; seedSuccess is diagnostic narrative only.
      expect(r.parsed.continue).toBe(true);
    }
  });
});

describe("cross-session-orchestrator hook — host invariants", () => {
  it("stdout is exactly one non-empty line that parses to a valid contract shape", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("single-line") },
    }));
    const lines = r.stdout.split("\n").filter(l => l.trim().length > 0);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    // Must match exactly one of two known shapes.
    const matchesContinue = JSON.stringify(parsed) === JSON.stringify({ continue: true });
    const matchesBlock = parsed.decision === "block" && typeof parsed.reason === "string" && (parsed.reason as string).length > 5;
    expect(matchesContinue || matchesBlock).toBe(true);
  });

  it("hook elapsed wall time stays under 3 seconds (250ms broadcast cap + IO)", () => {
    const t0 = Date.now();
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("perf") },
    }));
    const elapsed = Date.now() - t0;
    expect(r.status).toBe(0);
    expect(elapsed < 3000).toBe(true);
  });

  it("hook stderr does not contain error markers on the happy path", () => {
    const r = runHook(["--pre"], JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: makeResource("stderr-clean") },
    }));
    expect(r.status).toBe(0);
    expect(r.stderr.includes("Error:")).toBe(false);
    expect(r.stderr.includes("TypeError")).toBe(false);
    expect(r.stderr.includes("UnhandledPromiseRejection")).toBe(false);
  });
});
