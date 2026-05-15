/**
 * prism_hook — hook_telemetry_persist / hook_telemetry_load / hook_telemetry_status
 *
 * Wire verification for the pillar-telemetry-recovery U-PTR01 actions:
 *   - ACTIONS tuple contains all three action names
 *   - ACTION schema map registers all three schemas
 *   - dispatcher file has a switch case for each (source-grep)
 *   - in-process round-trip: registerHookDispatcher → server.tool() → execute
 *     each action with real params and assert observable side-effects on disk
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { HOOK_ACTION_SCHEMAS } from "../schemas/hookActionSchemas.js";
import { registerHookDispatcher } from "../tools/dispatchers/hookDispatcher.js";
import { hookTelemetryEngine } from "../engines/HookTelemetryEngine.js";

const NEW_ACTIONS = [
  "hook_telemetry_persist",
  "hook_telemetry_load",
  "hook_telemetry_status",
] as const;

// ── source-grep helpers ──────────────────────────────────────────────────────
const DISPATCHER_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/hookDispatcher.ts"),
  "utf8",
);

function countOccurrences(haystack: string, regex: RegExp): number {
  const m = haystack.match(regex);
  return m ? m.length : 0;
}

// ── fake MCP server that captures the tool handler ──────────────────────────
function buildHandler(): (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown> {
  let captured: ((input: unknown) => Promise<unknown>) | null = null;
  const fakeServer = {
    tool(
      _name: string,
      _desc: string,
      _schema: unknown,
      handler: (input: unknown) => Promise<unknown>,
    ) {
      captured = handler;
    },
  };
  registerHookDispatcher(fakeServer);
  if (!captured) throw new Error("registerHookDispatcher did not register a handler");
  const fn = captured as unknown as (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
  return fn;
}

// ── parse a dispatcher response that may be {content:[{text}]} or raw ──
function parseResponse(raw: unknown): unknown {
  if (raw && typeof raw === "object") {
    const r = raw as { content?: Array<{ type: string; text: string }>; success?: boolean };
    if (Array.isArray(r.content) && r.content[0]?.text) {
      try {
        return JSON.parse(r.content[0].text);
      } catch {
        return r.content[0].text;
      }
    }
    return r;
  }
  return raw;
}

// ── test fixtures ────────────────────────────────────────────────────────────
function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-hook-wire-"));
}
function rmDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

describe("prism_hook — telemetry persistence wire", () => {
  describe("source-grep: dispatcher contract", () => {
    it("ACTIONS tuple contains all three new actions", () => {
      for (const a of NEW_ACTIONS) {
        // Quoted in the ACTIONS tuple
        const tupleRegex = new RegExp(`"${a}"`, "g");
        expect(countOccurrences(DISPATCHER_SOURCE, tupleRegex)).toBeGreaterThanOrEqual(1);
        // And appears AGAIN as a case label
        const caseRegex = new RegExp(`case\\s+"${a}"\\s*:`, "g");
        expect(countOccurrences(DISPATCHER_SOURCE, caseRegex)).toBeGreaterThanOrEqual(1);
      }
    });

    it("uses lazy import for HookTelemetryEngine in every new case", () => {
      // The existing hook_telemetry_metrics case already imports; with 3 new cases
      // we expect 4 total `await import(".../HookTelemetryEngine.js")` occurrences.
      const importRegex = /await\s+import\(["']\.\.\/\.\.\/engines\/HookTelemetryEngine\.js["']\)/g;
      expect(countOccurrences(DISPATCHER_SOURCE, importRegex)).toBeGreaterThanOrEqual(4);
    });

    it("registers a Zod schema for each new action with .safeParse method", () => {
      for (const a of NEW_ACTIONS) {
        const schema = HOOK_ACTION_SCHEMAS[a];
        // Verify it's actually a Zod schema (not just present)
        expect(typeof schema.safeParse).toBe("function");
        // Each schema must accept empty params (passthrough/optional fields)
        const empty = schema.safeParse({});
        expect(empty.success).toBe(true);
      }
    });

    it("hook_telemetry_persist schema accepts a custom path", () => {
      const result = HOOK_ACTION_SCHEMAS.hook_telemetry_persist.safeParse({ path: "/tmp/foo.json" });
      expect(result.success).toBe(true);
    });

    it("hook_telemetry_persist schema rejects empty-string path", () => {
      const result = HOOK_ACTION_SCHEMAS.hook_telemetry_persist.safeParse({ path: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("in-process round-trip", () => {
    let tmpDir: string;
    let handle: (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;

    beforeEach(() => {
      tmpDir = makeTempDir();
      hookTelemetryEngine.reset();
      // Each test gets a fresh handler bound to the live singleton
      handle = buildHandler();
    });

    afterEach(() => {
      // Clear out any persistPath the test may have configured
      hookTelemetryEngine.setPersistPath(null);
      hookTelemetryEngine.reset();
      rmDir(tmpDir);
    });

    it("hook_telemetry_persist writes a snapshot to the supplied path", async () => {
      // Seed the singleton with one recorded invocation
      const inv = hookTelemetryEngine.recordStart("wire-test-hook");
      hookTelemetryEngine.recordEnd(inv, true, false);

      const target = path.join(tmpDir, "wire-persist.json");
      const raw = await handle({ action: "hook_telemetry_persist", params: { path: target } });
      const body = parseResponse(raw) as { ok: boolean; path: string; bytesWritten?: number };

      expect(body.ok).toBe(true);
      expect(body.path).toBe(target);
      expect(body.bytesWritten).toBeGreaterThan(0);
      expect(fs.existsSync(target)).toBe(true);

      const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.hooks["wire-test-hook"].invocations).toBe(1);
    });

    it("hook_telemetry_load restores a snapshot into the live singleton", async () => {
      // Seed a snapshot via the engine, reset state, load via dispatcher
      const inv = hookTelemetryEngine.recordStart("wire-load-hook");
      hookTelemetryEngine.recordEnd(inv, true, false);
      const target = path.join(tmpDir, "wire-load.json");
      hookTelemetryEngine.persist(target);

      // Clear state — load must repopulate from disk
      hookTelemetryEngine.reset();
      expect(hookTelemetryEngine.getHookStats("wire-load-hook")).toBeNull();

      const raw = await handle({ action: "hook_telemetry_load", params: { path: target } });
      const body = parseResponse(raw) as {
        ok: boolean;
        loadedHooks: number;
        loadedAlerts: number;
      };
      expect(body.ok).toBe(true);
      expect(body.loadedHooks).toBe(1);

      const stats = hookTelemetryEngine.getHookStats("wire-load-hook");
      expect(stats).not.toBeNull();
      expect(stats!.invocations).toBe(1);
      expect(stats!.successes).toBe(1);
    });

    it("hook_telemetry_load on missing file returns ok:false with file-not-found", async () => {
      const missing = path.join(tmpDir, "does-not-exist.json");
      const raw = await handle({ action: "hook_telemetry_load", params: { path: missing } });
      const body = parseResponse(raw) as { ok: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(body.error).toBe("file not found");
    });

    it("hook_telemetry_status reports persistenceEnabled=false by default", async () => {
      // Confirm the singleton has no persistPath at test start
      hookTelemetryEngine.setPersistPath(null);
      const raw = await handle({ action: "hook_telemetry_status" });
      const body = parseResponse(raw) as {
        persistPath?: string | null;
        persistenceEnabled: boolean;
        envVar: string;
        disabledByEnv: boolean;
        debounceMsEnv: string;
      };
      // slimResponse strips null values from the response → accept either
      // shape rather than over-specify. The persistenceEnabled flag is the
      // load-bearing signal callers actually consume.
      expect(body.persistPath ?? null).toBeNull();
      expect(body.persistenceEnabled).toBe(false);
      expect(body.envVar).toBe("PRISM_HOOK_TELEMETRY_PATH");
      expect(body.debounceMsEnv).toBe("PRISM_HOOK_TELEMETRY_DEBOUNCE_MS");
    });

    it("hook_telemetry_status reports persistenceEnabled=true after setPersistPath", async () => {
      const target = path.join(tmpDir, "status.json");
      hookTelemetryEngine.setPersistPath(target);
      const raw = await handle({ action: "hook_telemetry_status" });
      const body = parseResponse(raw) as {
        persistPath: string | null;
        persistenceEnabled: boolean;
      };
      expect(body.persistPath).toBe(target);
      expect(body.persistenceEnabled).toBe(true);
    });

    it("schema map and ACTIONS tuple stay in sync (anti-regression)", () => {
      // The real MCP server applies z.enum(ACTIONS) at the request boundary,
      // which my fake-server bypass cannot exercise. Instead, lock the
      // invariant that callers depend on: the schema map and the ACTIONS
      // tuple agree on what's a valid action.
      const schemaKeys = new Set(Object.keys(HOOK_ACTION_SCHEMAS));
      // Each of the three new actions IS registered as a schema
      expect(schemaKeys.has("hook_telemetry_persist")).toBe(true);
      expect(schemaKeys.has("hook_telemetry_load")).toBe(true);
      expect(schemaKeys.has("hook_telemetry_status")).toBe(true);
      // A typo or removed action MUST NOT be in either surface
      expect(schemaKeys.has("hook_telemetry_nonexistent")).toBe(false);
      // ACTIONS tuple agrees
      const actionsLine = DISPATCHER_SOURCE.match(/const ACTIONS = \[[\s\S]*?\] as const;/);
      expect(actionsLine).not.toBeNull();
      expect(actionsLine![0]).toContain('"hook_telemetry_persist"');
      expect(actionsLine![0]).toContain('"hook_telemetry_load"');
      expect(actionsLine![0]).toContain('"hook_telemetry_status"');
      expect(actionsLine![0]).not.toContain('"hook_telemetry_nonexistent"');
    });

    it("hook_telemetry_persist with no params and no env returns ok:false (no path)", async () => {
      // Ensure persistPath is cleared
      hookTelemetryEngine.setPersistPath(null);
      const savedEnv = process.env.PRISM_HOOK_TELEMETRY_PATH;
      delete process.env.PRISM_HOOK_TELEMETRY_PATH;
      try {
        const raw = await handle({ action: "hook_telemetry_persist" });
        const body = parseResponse(raw) as { ok: boolean; error?: string };
        expect(body.ok).toBe(false);
        expect(body.error).toBe("no persistPath configured");
      } finally {
        if (savedEnv !== undefined) process.env.PRISM_HOOK_TELEMETRY_PATH = savedEnv;
      }
    });
  });
});
