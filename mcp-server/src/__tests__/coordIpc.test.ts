// COORD-MS0/U-COORD11 — IPC server + client round-trip tests
//
// Imports the .mjs helpers via pathToFileURL so the .claude/helpers/ files can
// stay outside the TS project root and still get exercised by vitest. The
// helper paths are resolved RELATIVE to this test file (NOT hardcoded to
// "H:/prism") so the suite runs unchanged on any checkout location / OS.

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { pathToFileURL, fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import { connect } from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

// `<repo>/mcp-server/src/__tests__/coordIpc.test.ts` → repo root three levels up.
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const HELPERS_DIR = path.join(REPO_ROOT, ".claude", "helpers");
const SERVER_URL = pathToFileURL(path.join(HELPERS_DIR, "coord-ipc-server.mjs")).href;
const CLIENT_URL = pathToFileURL(path.join(HELPERS_DIR, "coord-ipc-client.mjs")).href;

// Narrow interface for the .mjs surface — typed strictly enough for the
// tests' contract without re-declaring every parameter shape.
interface CoordIpcServer {
  IPC_VERSION: string;
  MAX_REQUEST_BYTES: number;
  IDLE_TIMEOUT_MS: number;
  getIpcPath(tag?: string): string;
  startIpcServer(opts: Record<string, unknown>): Promise<ServerHandle>;
}
interface CoordIpcClient {
  DEFAULT_TIMEOUT_MS: number;
  queryDaemon(
    method: string,
    params?: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<{
    ok: boolean;
    source: "ipc" | "fallback-file" | "fallback-value" | "none";
    result?: unknown;
    error?: string;
    code?: string;
    latencyMs?: number;
    fallbackFileError?: string | null;
  }>;
  isDaemonAlive(opts?: Record<string, unknown>): Promise<boolean>;
}

let serverMod: CoordIpcServer;
let clientMod: CoordIpcClient;

beforeAll(async () => {
  serverMod = (await import(SERVER_URL)) as CoordIpcServer;
  clientMod = (await import(CLIENT_URL)) as CoordIpcClient;
});

// Each test claims its own pipe path so parallel runs / repeats don't collide.
function uniqueTag(name: string) {
  return `test-${name}-${randomUUID().slice(0, 8)}`;
}

interface ServerHandle {
  address: string;
  methods: string[];
  stop: () => Promise<void>;
  stats: () => { activeConnections: number; totalConnections: number };
}

const liveServers: ServerHandle[] = [];

async function spawnServer(overrides: Record<string, unknown> = {}): Promise<ServerHandle> {
  const tag = (overrides.tag as string) ?? uniqueTag("default");
  const ipcPath: string = serverMod.getIpcPath(tag);
  const server = (await serverMod.startIpcServer({
    getStatus: async () => ({ ok: true, kind: "status", agents: [] }),
    getCoordSummary: async () => ({ ok: true, kind: "summary" }),
    getActiveSessions: async () => [],
    path: ipcPath,
    ...overrides,
  })) as ServerHandle;
  liveServers.push(server);
  return server;
}

afterEach(async () => {
  while (liveServers.length > 0) {
    const s = liveServers.pop();
    if (!s) continue;
    try {
      await s.stop();
    } catch {
      // ignore — already torn down
    }
  }
});

describe("coord-ipc-server: pipe path derivation", () => {
  it("produces a platform-appropriate path", () => {
    const p = serverMod.getIpcPath("unit-test");
    if (process.platform === "win32") {
      expect(p.startsWith("\\\\.\\pipe\\prism-coord-")).toBe(true);
    } else {
      expect(p.startsWith(path.join(os.tmpdir(), "prism-coord-"))).toBe(true);
      expect(p.endsWith(".sock")).toBe(true);
    }
  });

  it("derives different paths for different tags", () => {
    const a = serverMod.getIpcPath("tag-a");
    const b = serverMod.getIpcPath("tag-b");
    expect(a).not.toBe(b);
  });

  it("derives the same path for the same tag", () => {
    const a = serverMod.getIpcPath("stable");
    const b = serverMod.getIpcPath("stable");
    expect(a).toBe(b);
  });
});

describe("coord-ipc-server: contract validation", () => {
  it("throws if getStatus is missing", async () => {
    await expect(
      serverMod.startIpcServer({
        getCoordSummary: () => ({}),
        getActiveSessions: () => [],
      }),
    ).rejects.toThrow(/getStatus/);
  });

  it("throws if getCoordSummary is missing", async () => {
    await expect(
      serverMod.startIpcServer({
        getStatus: () => ({}),
        getActiveSessions: () => [],
      }),
    ).rejects.toThrow(/getCoordSummary/);
  });

  it("throws if getActiveSessions is missing", async () => {
    await expect(
      serverMod.startIpcServer({
        getStatus: () => ({}),
        getCoordSummary: () => ({}),
      }),
    ).rejects.toThrow(/getActiveSessions/);
  });

  it("exposes the v1 method set", async () => {
    const s = await spawnServer({ tag: uniqueTag("methods") });
    expect(s.methods).toEqual(
      expect.arrayContaining(["health", "status", "coord_summary", "active_sessions"]),
    );
  });

  it("publishes IPC_VERSION 1.x", () => {
    expect(serverMod.IPC_VERSION).toMatch(/^1\./);
  });
});

describe("coord-ipc-client: round-trip", () => {
  it("returns health from a running server", async () => {
    const s = await spawnServer({ tag: uniqueTag("health") });
    const r = await clientMod.queryDaemon("health", {}, { path: s.address, timeoutMs: 2000 });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("ipc");
    expect(r.result?.ok).toBe(true);
    expect(r.result?.pid).toBe(process.pid);
    expect(r.result?.version).toBe(serverMod.IPC_VERSION);
    expect(typeof r.latencyMs).toBe("number");
    expect(r.latencyMs).toBeGreaterThan(0);
  });

  it("routes to status callback", async () => {
    const s = await spawnServer({
      tag: uniqueTag("status"),
      getStatus: async () => ({ probe: 42, agents: [{ session_key: "claude-204054bf" }] }),
    });
    const r = await clientMod.queryDaemon("status", {}, { path: s.address, timeoutMs: 2000 });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("ipc");
    expect(r.result.probe).toBe(42);
    expect(r.result.agents[0].session_key).toBe("claude-204054bf");
  });

  it("routes to coord_summary callback", async () => {
    const s = await spawnServer({
      tag: uniqueTag("summary"),
      getCoordSummary: async () => ({ alive: 3 }),
    });
    const r = await clientMod.queryDaemon(
      "coord_summary",
      {},
      { path: s.address, timeoutMs: 2000 },
    );
    expect(r.ok).toBe(true);
    expect(r.source).toBe("ipc");
    expect(r.result.alive).toBe(3);
  });

  it("routes to active_sessions callback with window_ms filter", async () => {
    const now = Date.now();
    const s = await spawnServer({
      tag: uniqueTag("sessions"),
      getActiveSessions: async () => [
        { chatId: "fresh", lastSeen: new Date(now - 1000).toISOString() },
        { chatId: "stale", lastSeen: new Date(now - 60 * 60 * 1000).toISOString() },
      ],
    });

    const all = await clientMod.queryDaemon(
      "active_sessions",
      {},
      { path: s.address, timeoutMs: 2000 },
    );
    expect(all.result).toHaveLength(2);

    const filtered = await clientMod.queryDaemon(
      "active_sessions",
      { window_ms: 5000 },
      { path: s.address, timeoutMs: 2000 },
    );
    expect(filtered.result).toHaveLength(1);
    expect(filtered.result[0].chatId).toBe("fresh");
  });

  it("handles 50 serial round-trips without leaking connections", async () => {
    const s = await spawnServer({ tag: uniqueTag("burst") });
    for (let i = 0; i < 50; i += 1) {
      const r = await clientMod.queryDaemon("health", {}, { path: s.address, timeoutMs: 2000 });
      expect(r.ok).toBe(true);
    }
    // Server's 'close' listener may run a tick after the client destroys the
    // socket; poll briefly so the assertion targets eventual state, not the
    // exact instant the loop exits.
    const deadline = Date.now() + 500;
    while (s.stats().activeConnections > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(s.stats().activeConnections).toBe(0);
    expect(s.stats().totalConnections).toBe(50);
  });
});

describe("coord-ipc-client: error paths", () => {
  it("rejects unknown method with ERR_METHOD", async () => {
    const s = await spawnServer({ tag: uniqueTag("unknown") });
    const r = await clientMod.queryDaemon(
      "made_up_method",
      {},
      { path: s.address, timeoutMs: 2000 },
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_METHOD");
  });

  it("rejects oversize requests with ERR_OVERSIZE", async () => {
    // Force the assertion to fire — without this, a server that closes before
    // flushing the error line would let the test resolve with zero assertions.
    expect.assertions(1);
    const s = await spawnServer({ tag: uniqueTag("oversize") });
    const big = "x".repeat(serverMod.MAX_REQUEST_BYTES + 100);
    let assertionFired = false;
    await new Promise<void>((resolve, reject) => {
      const sock = connect(s.address);
      let buffer = "";
      sock.on("connect", () => {
        sock.write(JSON.stringify({ id: "1", method: "health", params: { pad: big } }) + "\n");
      });
      sock.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        if (buffer.includes("\n") && !assertionFired) {
          const line = buffer.split("\n")[0];
          const parsed = JSON.parse(line);
          expect(parsed.code).toBe("ERR_OVERSIZE");
          assertionFired = true;
          sock.destroy();
          resolve();
        }
      });
      sock.on("close", () => {
        if (!assertionFired) reject(new Error("connection closed before ERR_OVERSIZE seen"));
      });
      sock.on("error", () => {
        if (!assertionFired) reject(new Error("socket error before ERR_OVERSIZE seen"));
      });
    });
  });

  it("returns ERR_PARSE on malformed JSON", async () => {
    const s = await spawnServer({ tag: uniqueTag("malformed") });
    const parsed = await new Promise<Record<string, unknown>>((resolve) => {
      const sock = connect(s.address);
      let buffer = "";
      sock.on("connect", () => {
        sock.write("not json at all\n");
      });
      sock.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        if (buffer.includes("\n")) {
          resolve(JSON.parse(buffer.split("\n")[0]));
          sock.destroy();
        }
      });
    });
    expect(parsed.code).toBe("ERR_PARSE");
  });

  it("returns ERR_AUTH when token is required and missing", async () => {
    const s = await spawnServer({ tag: uniqueTag("auth-required"), token: "shhh-secret" });
    const r = await clientMod.queryDaemon("health", {}, { path: s.address, timeoutMs: 2000 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_AUTH");
  });

  it("succeeds when token matches", async () => {
    const s = await spawnServer({ tag: uniqueTag("auth-match"), token: "shhh-secret" });
    const r = await clientMod.queryDaemon(
      "health",
      {},
      { path: s.address, token: "shhh-secret", timeoutMs: 2000 },
    );
    expect(r.ok).toBe(true);
  });
});

describe("coord-ipc-client: fallback behaviour", () => {
  it("falls back to file when pipe path does not exist", async () => {
    const fallbackFile = path.join(os.tmpdir(), `coord-ipc-fallback-${randomUUID()}.json`);
    await fs.writeFile(fallbackFile, JSON.stringify({ origin: "fallback-file" }));
    try {
      const dead = serverMod.getIpcPath(uniqueTag("missing"));
      const r = await clientMod.queryDaemon(
        "status",
        {},
        { path: dead, timeoutMs: 100, fallbackFile },
      );
      expect(r.ok).toBe(true);
      expect(r.source).toBe("fallback-file");
      expect(r.result?.origin).toBe("fallback-file");
    } finally {
      await fs.unlink(fallbackFile).catch(() => {});
    }
  });

  it("falls back to literal value when neither IPC nor file is available", async () => {
    const dead = serverMod.getIpcPath(uniqueTag("missing-2"));
    const r = await clientMod.queryDaemon(
      "status",
      {},
      { path: dead, timeoutMs: 100, fallback: { synth: true } },
    );
    expect(r.ok).toBe(true);
    expect(r.source).toBe("fallback-value");
    expect(r.result).toEqual({ synth: true });
  });

  it("returns ok=false with code when no fallback is supplied", async () => {
    const dead = serverMod.getIpcPath(uniqueTag("missing-3"));
    const r = await clientMod.queryDaemon("status", {}, { path: dead, timeoutMs: 100 });
    expect(r.ok).toBe(false);
    expect(r.source).toBe("none");
    expect(typeof r.code).toBe("string");
  });

  it("isDaemonAlive returns false when daemon is not running", async () => {
    const dead = serverMod.getIpcPath(uniqueTag("alive-no"));
    const alive = await clientMod.isDaemonAlive({ path: dead });
    expect(alive).toBe(false);
  });

  it("isDaemonAlive returns true when daemon is running", async () => {
    const s = await spawnServer({ tag: uniqueTag("alive-yes") });
    const alive = await clientMod.isDaemonAlive({ path: s.address });
    expect(alive).toBe(true);
  });
});

describe("coord-ipc-client: timeout semantics", () => {
  it("times out per-call (no fallback) within a few × the configured timeoutMs", async () => {
    const s = await spawnServer({
      tag: uniqueTag("slow"),
      // Status callback that never resolves — simulate hung backend.
      getStatus: () => new Promise(() => {}),
    });
    const start = Date.now();
    const r = await clientMod.queryDaemon(
      "status",
      {},
      { path: s.address, timeoutMs: 80 },
    );
    const elapsed = Date.now() - start;
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_TIMEOUT");
    // Allow generous headroom for CI: must be at least timeoutMs, no more than 10×.
    expect(elapsed).toBeGreaterThanOrEqual(70);
    expect(elapsed).toBeLessThan(800);
  });
});
