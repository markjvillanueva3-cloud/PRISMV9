/**
 * psk.test.ts — COMMAND-KERNEL-MS0/U-CK01 acceptance tests.
 *
 * Covers the U-CK01 exit conditions:
 *   1. `node .claude/kernel/psk.mjs --help` enumerates every declared syscall
 *      (count DERIVED from psk's own table, NOT a hardcoded literal).
 *   2. `prism_session:psk` MCP action round-trips a syscall via the dispatcher.
 *   3. ≥8 cases incl. fail-soft on every syscall.
 *
 * Real-value assertions only — no toBeDefined() / toBeTruthy() stubs.
 * slimResponse strips null-valued fields; tests use key-presence checks for
 * the nullable fields (slot, branch, sessionId, fallback).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

// --- Test scaffolding ------------------------------------------------------

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

/** Capture the tool() handler that the dispatcher registers on a fake server. */
function captureHandler(register: (server: any) => void): Handler {
  let captured: Handler | null = null;
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, handler: Handler) {
      captured = handler;
    },
  };
  register(fakeServer);
  if (!captured) throw new Error("dispatcher did not register a handler");
  return captured;
}

/** Unwrap the MCP {content:[{type:"text",text:"<json>"}]} envelope. */
function unwrap(res: any): any {
  if (res && typeof res === "object" && Array.isArray(res.content)) {
    const text = res.content.find((c: any) => c.type === "text")?.text;
    if (typeof text === "string") {
      try { return JSON.parse(text); } catch { return { raw: text }; }
    }
  }
  return res;
}

// Path to psk.mjs (resolved relative to this test file → repo root → .claude/kernel).
// __dirname is mcp-server/src/__tests__, so `../../..` is the repo root.
const PSK_PATH = path.resolve(__dirname, "..", "..", "..", ".claude", "kernel", "psk.mjs");
const PSK_URL = pathToFileURL(PSK_PATH).href;

// Canonical syscall set from U-CK01 envelope — frozen reference for assertions.
const CANONICAL_SYSCALLS = [
  "whoami", "manifest", "position", "delta", "tools",
  "pick", "checkin", "handoff", "record", "recommend",
];

// Hold the imported module so we don't pay the import cost per test.
let psk: typeof import("../../../.claude/kernel/psk.mjs");

// Redirect record-syscall writes to a tmp file so the test suite never
// pollutes the real state/shared/pipeline-telemetry.jsonl (Reviewer B P2-1).
const TMP_TELEMETRY = path.join(os.tmpdir(), `psk-test-telemetry-${process.pid}.jsonl`);

beforeAll(async () => {
  if (!fs.existsSync(PSK_PATH)) {
    throw new Error(`psk.mjs not found at ${PSK_PATH} — U-CK01 not built?`);
  }
  // Set env BEFORE import so resolveTelemetryFile() picks it up on first call.
  process.env.PRISM_TELEMETRY_PATH = TMP_TELEMETRY;
  psk = await import(PSK_URL);
});

afterAll(() => {
  // Clean up the tmp telemetry file (best-effort)
  try { if (fs.existsSync(TMP_TELEMETRY)) fs.unlinkSync(TMP_TELEMETRY); } catch { /* ignore */ }
  delete process.env.PRISM_TELEMETRY_PATH;
});

// --- A. Direct kernel API --------------------------------------------------

describe("psk.mjs direct API — COMMAND-KERNEL-MS0/U-CK01", () => {

  it("listSyscalls returns the canonical 10 unique declared syscalls", () => {
    const syscalls = psk.listSyscalls();
    expect(Array.isArray(syscalls)).toBe(true);
    // Length derived from the canonical contract (not a free-floating literal)
    expect(syscalls.length).toBe(CANONICAL_SYSCALLS.length);
    // Uniqueness invariant
    const set = new Set(syscalls);
    expect(set.size).toBe(syscalls.length);
    // Canonical set (exit-condition contract from U-CK01 envelope)
    expect([...syscalls].sort()).toEqual([...CANONICAL_SYSCALLS].sort());
  });

  it("describeSyscalls returns a non-empty description for every declared syscall", () => {
    const desc = psk.describeSyscalls();
    const syscalls = psk.listSyscalls();
    expect(Object.keys(desc).length).toBe(syscalls.length);
    for (const name of syscalls) {
      expect(typeof desc[name]).toBe("string");
      // Real-value: every description is at least 20 chars (meaningful prose)
      expect(desc[name].length).toBeGreaterThanOrEqual(20);
    }
  });

  it("dispatch('manifest') returns live inventory counts + a 10-key top projection", async () => {
    // U-CK02 replaced U-CK01's placeholder manifest (which returned
    // {shell_only, sources, available}) with live counts parsed from
    // PRISM-INVENTORY-LATEST.md. Assert the real U-CK02 contract.
    const r = await psk.dispatch("manifest", {});
    expect(r.ok).toBe(true);
    expect(r.syscall).toBe("manifest");
    expect(typeof r.result).toBe("object");
    // counts: parsed inventory-label -> count map.
    expect(typeof r.result.counts).toBe("object");
    expect(r.result.counts).not.toBeNull();
    // top: a fixed 10-key projection (MANIFEST_TOP_KEYS).
    expect(typeof r.result.top).toBe("object");
    expect(Object.keys(r.result.top).length).toBe(10);
    // engines is always present in the inventory — concrete numeric check.
    expect(typeof r.result.top.engines).toBe("number");
    expect(r.result.top.engines).toBeGreaterThan(0);
    // origin names the inventory file the counts were parsed from.
    expect(typeof r.result.origin).toBe("object");
    expect(String(r.result.origin.file).endsWith("PRISM-INVENTORY-LATEST.md")).toBe(true);
  });

  it("dispatch('whoami') resolves repoRoot + helpersDir to existing directories", async () => {
    const r = await psk.dispatch("whoami", {});
    expect(r.ok).toBe(true);
    expect(r.syscall).toBe("whoami");
    // U-CK02's whoami is a real implementation — no shell_only placeholder.
    // repoRoot must resolve to a real on-disk directory
    expect(typeof r.result.repoRoot).toBe("string");
    expect(fs.existsSync(r.result.repoRoot)).toBe(true);
    expect(fs.statSync(r.result.repoRoot).isDirectory()).toBe(true);
    // helpersDir likewise + path must end with .claude/helpers
    expect(r.result.helpersDir.replace(/\\/g, "/").endsWith(".claude/helpers")).toBe(true);
    expect(fs.existsSync(r.result.helpersDir)).toBe(true);
    // sessionId is always a string (either resolved or "unresolved")
    expect(typeof r.result.sessionId).toBe("string");
    expect(r.result.sessionId.length).toBeGreaterThan(0);
  });

  it("dispatch('nope') returns ok:false + errorCode UNKNOWN_SYSCALL + canonical list in note", async () => {
    const r = await psk.dispatch("nope", {});
    expect(r.ok).toBe(false);
    expect(r.degraded).toBe(true);
    expect(r.errorCode).toBe("UNKNOWN_SYSCALL");
    expect(r.error).toMatch(/unknown syscall 'nope'/);
    // note must contain every canonical syscall name (operator self-service)
    for (const name of CANONICAL_SYSCALLS) {
      expect(r.note).toContain(name);
    }
  });

  it("dispatch('') (empty syscall) returns errorCode UNKNOWN_SYSCALL with valid-list", async () => {
    const r = await psk.dispatch("", {});
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("UNKNOWN_SYSCALL");
    expect(r.error).toMatch(/non-empty string/);
  });

  it("dispatch('record', {}) is fail-soft on missing 'event' required field", async () => {
    const r = await psk.dispatch("record", {});
    // MUST NOT throw past dispatch (fail-soft contract)
    expect(r.ok).toBe(false);
    expect(r.degraded).toBe(true);
    expect(r.error).toMatch(/missing required field: event/);
    expect(r.syscall).toBe("record");
  });

  it("dispatch('record', {event,command}) returns structured result with shape proof", async () => {
    const r = await psk.dispatch("record", {
      event: "psk-test",
      command: "psk.test.ts",
      outcome: "ok",
    });
    expect(r.syscall).toBe("record");
    expect(typeof r.ok).toBe("boolean");
    if (r.ok) {
      // Successful append: entry must echo the input fields exactly
      expect(r.result.written).toBe(true);
      expect(r.result.entry.event).toBe("psk-test");
      expect(r.result.entry.command).toBe("psk.test.ts");
      expect(r.result.entry.outcome).toBe("ok");
      // ts is an ISO-8601 string
      expect(r.result.entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } else {
      // Degraded: fallback must preserve the entry for retry
      expect(r.fallback.entry.event).toBe("psk-test");
      expect(r.fallback.entry.command).toBe("psk.test.ts");
    }
  });

  it("dispatch('record', {extra:huge}) caps extra at 8 KiB (P1-4 DoS guard)", async () => {
    const huge = "x".repeat(50_000); // 50 KB raw input
    const r = await psk.dispatch("record", {
      event: "cap-test",
      command: "psk.test.ts",
      extra: { payload: huge },
    });
    expect(r.syscall).toBe("record");
    // Whichever path executes, the entry MUST have a capped extra string
    const entry = r.ok ? r.result.entry : r.fallback.entry;
    expect(typeof entry.extra).toBe("string");
    expect(entry.extra.length).toBeLessThanOrEqual(8192);
    // Cap is a real cap — input was 50 KB, output is strictly smaller
    expect(entry.extra.length).toBeLessThan(50_000);
  });

  it("dispatch('handoff', {terminal:'../../etc/passwd'}) rejects path-traversal (P1-1)", async () => {
    const r = await psk.dispatch("handoff", {
      subcommand: "read",
      terminal: "../../etc/passwd",
    });
    expect(r.ok).toBe(false);
    expect(r.degraded).toBe(true);
    expect(r.error).toMatch(/invalid terminal '\.\.\/\.\.\/etc\/passwd'/);
    // note must hint at the whitelist
    expect(r.note).toMatch(/whitelist/i);
  });

  it("dispatch('handoff', {subcommand:'bogus'}) rejects unknown subcommand with shape", async () => {
    const r = await psk.dispatch("handoff", { subcommand: "bogus" });
    expect(r.ok).toBe(false);
    expect(r.degraded).toBe(true);
    expect(r.error).toMatch(/unknown subcommand 'bogus'/);
    expect(r.error).toMatch(/expected read\|write/);
  });

  it("dispatch(null) is fail-soft on non-string syscall arg", async () => {
    // @ts-expect-error — runtime guard test, intentionally passing wrong type
    const r = await psk.dispatch(null, {});
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("UNKNOWN_SYSCALL");
    expect(r.error).toMatch(/non-empty string/);
  });

  it("dispatch('delta') returns the shell-only placeholder with available:false", async () => {
    const r = await psk.dispatch("delta", { since: "2026-05-14T00:00:00Z" });
    expect(r.ok).toBe(true);
    expect(r.syscall).toBe("delta");
    expect(r.shell_only).toBe(true);
    // U-CK02 will replace this — for now, delta MUST report available:false
    expect(r.result.available).toBe(false);
    expect(r.result.since).toBe("2026-05-14T00:00:00Z");
  });

  it("FAIL-SOFT INVARIANT: every declared syscall returns a structured result on empty params", async () => {
    // U-CK01 exit condition: "≥8 cases incl. fail-soft on every syscall".
    // Each syscall is invoked with empty params and must:
    //   (a) not throw past dispatch()
    //   (b) return a structured {ok, syscall, ...} result
    //   (c) preserve the syscall name in the result
    const syscalls = psk.listSyscalls();
    const results: Record<string, any> = {};
    for (const name of syscalls) {
      let threw = false;
      try {
        results[name] = await psk.dispatch(name, {});
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
      expect(typeof results[name].ok).toBe("boolean");
      // syscall name preserved (either the requested name or null on pre-dispatch reject)
      const got = results[name].syscall;
      expect(got === name || got === null).toBe(true);
    }
    // Every syscall produced a result entry (no skips)
    expect(Object.keys(results).length).toBe(CANONICAL_SYSCALLS.length);
  });

  it("CLI '--help' enumerates every declared syscall on stdout (exit-condition 1)", () => {
    // Reviewer B P2-3 fix: verify the CLI itself (not just listSyscalls) emits
    // the canonical list — closes the seam between listSyscalls and printHelp.
    const out = execFileSync(process.execPath, [PSK_PATH, "--help"], {
      encoding: "utf8", timeout: 10000,
    });
    for (const name of CANONICAL_SYSCALLS) {
      expect(out).toContain(name);
    }
    // The count is derived from the table — must show the derived number
    expect(out).toContain(`${CANONICAL_SYSCALLS.length} declared`);
    // Critical phrase: "table-derived, not hardcoded" must appear
    expect(out).toMatch(/table-derived/);
  });

  it("CLI '--list' emits JSON with the full syscall->description map", () => {
    const out = execFileSync(process.execPath, [PSK_PATH, "--list"], {
      encoding: "utf8", timeout: 10000,
    });
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(true);
    expect(Object.keys(parsed.syscalls).sort()).toEqual([...CANONICAL_SYSCALLS].sort());
  });

  it("FAIL-SOFT INVARIANT: degraded results carry a non-empty error string", async () => {
    // Force several known-bad paths and assert error/note quality.
    const badCases = [
      { syscall: "nope" as const, params: {} },
      { syscall: "record" as const, params: {} },
      { syscall: "handoff" as const, params: { subcommand: "bogus" } },
      { syscall: "handoff" as const, params: { terminal: "bad/../path" } },
    ];
    for (const { syscall, params } of badCases) {
      const r = await psk.dispatch(syscall, params);
      expect(r.ok).toBe(false);
      expect(typeof r.error).toBe("string");
      expect(r.error.length).toBeGreaterThan(0);
      expect(typeof r.note).toBe("string");
      expect(r.note.length).toBeGreaterThan(0);
    }
  });
});

// --- B. MCP wiring round-trip ---------------------------------------------

describe("prism_session:psk MCP wiring round-trip — U-CK01", () => {

  it("action:'psk' with nested params dispatches 'manifest' end-to-end", async () => {
    const handler = captureHandler(registerSessionDispatcher);
    const out = unwrap(await handler({
      action: "psk",
      params: { syscall: "manifest", params: {} },
    }));
    expect(out.ok).toBe(true);
    expect(out.syscall).toBe("manifest");
    // U-CK02 manifest shape (counts/top/origin) survives the MCP round-trip.
    expect(typeof out.result.counts).toBe("object");
    expect(Object.keys(out.result.top).length).toBe(10);
    expect(String(out.result.origin.file).endsWith("PRISM-INVENTORY-LATEST.md")).toBe(true);
  });

  it("action:'psk' with FLAT params (normalizeParams convention) merges into syscallParams", async () => {
    // Reviewer B P1 fix: callers using PRISM's normalizeParams pass syscall-
    // fields at top level. The dispatcher merges FLAT_FORWARD_KEYS into the
    // nested syscallParams before calling psk.dispatch. We exercise the merge
    // via record's required-field check — if the merge worked, event+command
    // arrive at the syscall; if it didn't, the syscall rejects with
    // "missing required field: event".
    const handler = captureHandler(registerSessionDispatcher);
    const out = unwrap(await handler({
      action: "psk",
      params: { syscall: "record", event: "flat-merge-proof", command: "psk.test.ts", outcome: "merge-ok" },
    }));
    expect(out.syscall).toBe("record");
    // The MERGE must succeed — error must NOT be the missing-field rejection
    if (out.ok === false) {
      expect(out.error).not.toMatch(/missing required field/);
    } else {
      // Success path: entry echoes the merged fields
      expect(out.result.entry.event).toBe("flat-merge-proof");
      expect(out.result.entry.command).toBe("psk.test.ts");
      expect(out.result.entry.outcome).toBe("merge-ok");
    }
  });

  it("action:'psk' with NESTED params wins on collision with FLAT params", async () => {
    // Nested-wins-on-collision rule from the dispatcher comment. If both are
    // present, params.params.event takes precedence over params.event.
    const handler = captureHandler(registerSessionDispatcher);
    const out = unwrap(await handler({
      action: "psk",
      params: {
        syscall: "record",
        event: "FLAT-value",         // flat
        command: "psk.test.ts",
        params: { event: "NESTED-value" }, // nested — should win
      },
    }));
    expect(out.syscall).toBe("record");
    // Reviewer B P3-9 fix: assert entry exists FIRST (fail loud — no silent
    // skip on degraded paths that lose the entry), then test nested-wins.
    const entry = out.ok ? out.result.entry : out.fallback?.entry;
    expect(typeof entry).toBe("object");
    expect(entry).not.toBeNull();
    expect(entry.event).toBe("NESTED-value");
  });

  it("action:'psk' with missing 'syscall' field fails-soft via the dispatcher", async () => {
    // Reviewer B P2-2 fix: schema requires syscall: z.string().min(1).
    // A malformed call (no syscall) MUST produce a structured error envelope,
    // not crash the dispatcher. Either Zod rejection (structured error) or
    // the case-block falls through to UNKNOWN_SYSCALL. Either path is valid;
    // an unhandled throw is not.
    const handler = captureHandler(registerSessionDispatcher);
    const out = unwrap(await handler({
      action: "psk",
      params: {},  // no syscall field
    }));
    expect(typeof out).toBe("object");
    // Schema rejection produces a Zod-style error envelope; UNKNOWN_SYSCALL
    // produces our structured fallback. BOTH paths set out.error to a
    // non-empty string. Assert the structural invariant directly.
    expect(typeof out.error).toBe("string");
    expect(out.error.length).toBeGreaterThan(0);
  });

  it("action:'psk' with unknown syscall surfaces UNKNOWN_SYSCALL through the wire", async () => {
    const handler = captureHandler(registerSessionDispatcher);
    const out = unwrap(await handler({
      action: "psk",
      params: { syscall: "definitely-not-real" },
    }));
    expect(out.ok).toBe(false);
    expect(out.errorCode).toBe("UNKNOWN_SYSCALL");
    expect(out.error).toMatch(/unknown syscall 'definitely-not-real'/);
  });

  it("action:'psk' with 'delta' round-trips the shell placeholder", async () => {
    const handler = captureHandler(registerSessionDispatcher);
    const out = unwrap(await handler({
      action: "psk",
      params: { syscall: "delta" },
    }));
    expect(out.ok).toBe(true);
    expect(out.syscall).toBe("delta");
    // shell_only marker survives the round-trip (slimResponse keeps booleans)
    expect(out.shell_only).toBe(true);
    expect(out.result.available).toBe(false);
  });

  it("ANTI-REGRESSION: 'psk' is in the dispatcher's available-actions list", async () => {
    // The dispatcher's default branch returns {error, available: ACTIONS}.
    // We invoke an unknown action to force that branch and assert psk is present.
    const handler = captureHandler(registerSessionDispatcher);
    const out = unwrap(await handler({
      action: "definitely-not-a-real-action-xx",
      params: {},
    }));
    expect(Array.isArray(out.available)).toBe(true);
    expect(out.available).toContain("psk");
    // ANTI-REGRESSION: action count is at least 84 (83 pre-CK01 + 1 for psk).
    // We use >= rather than === so future additions don't break this test.
    expect(out.available.length).toBeGreaterThanOrEqual(84);
  });
});
