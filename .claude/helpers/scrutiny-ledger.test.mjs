/**
 * scrutiny-ledger — behavioural tests against the per-session scrutiny store.
 * Sandboxes a fresh project root per test to avoid cross-test pollution.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let sandboxRoot;
let originalCwd;

beforeEach(() => {
  originalCwd = process.cwd();
  sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "scrutiny-"));
  fs.mkdirSync(path.join(sandboxRoot, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(sandboxRoot, ".claude", "settings.json"), "{}");
  fs.mkdirSync(path.join(sandboxRoot, "mcp-server", "data", "state"), { recursive: true });
  process.chdir(sandboxRoot);
});

afterEach(() => {
  process.chdir(originalCwd);
  if (sandboxRoot && fs.existsSync(sandboxRoot)) fs.rmSync(sandboxRoot, { recursive: true, force: true });
});

async function loadLedger() {
  return await import("./scrutiny-ledger.mjs?cb=" + Date.now());
}

describe("deriveSessionId — stable derivation", () => {
  it("returns explicit session_id when provided", async () => {
    const { deriveSessionId } = await loadLedger();
    expect(deriveSessionId({ session_id: "abc-123" })).toBe("abc-123");
  });

  it("hashes transcript_path when session_id missing", async () => {
    const { deriveSessionId } = await loadLedger();
    const id = deriveSessionId({ transcript_path: "/tmp/foo/bar.jsonl" });
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    // Same input → same hash
    const id2 = deriveSessionId({ transcript_path: "/tmp/foo/bar.jsonl" });
    expect(id2).toBe(id);
    // Different input → different hash
    const id3 = deriveSessionId({ transcript_path: "/tmp/foo/baz.jsonl" });
    expect(id3).not.toBe(id);
  });

  it("falls back to 'unknown-session' on empty payload", async () => {
    const { deriveSessionId } = await loadLedger();
    expect(deriveSessionId({})).toBe("unknown-session");
    expect(deriveSessionId(null)).toBe("unknown-session");
  });

  it("ignores empty session_id and falls back", async () => {
    const { deriveSessionId } = await loadLedger();
    expect(deriveSessionId({ session_id: "" })).toBe("unknown-session");
  });
});

describe("recordScrutiny + getEntry — persistence", () => {
  it("creates an entry with selfReviewed=true on first call", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    const entry = getEntry("s1");
    expect(entry.sessionId).toBe("s1");
    expect(entry.selfReviewed).toBe(true);
    expect(entry.agentReviewed).toBe(false);
    expect(entry.blockCount).toBe(0);
  });

  it("merges marks across calls (idempotent set-true semantics)", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    recordScrutiny("s1", { agentReviewed: true });
    const entry = getEntry("s1");
    expect(entry.selfReviewed).toBe(true);
    expect(entry.agentReviewed).toBe(true);
  });

  it("records notes truncated to 500 chars", async () => {
    const { recordScrutiny, getEntry } = await loadLedger();
    recordScrutiny("s1", { notes: "x".repeat(800) });
    const entry = getEntry("s1");
    expect(entry.notes.length).toBe(500);
  });

  it("getEntry returns null for unknown session", async () => {
    const { getEntry } = await loadLedger();
    expect(getEntry("nonexistent")).toBe(null);
  });
});

describe("isCleared — gate logic", () => {
  it("returns false when entry missing", async () => {
    const { isCleared } = await loadLedger();
    expect(isCleared("s1")).toBe(false);
  });

  it("returns false when only self reviewed", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    expect(isCleared("s1")).toBe(false);
  });

  it("returns false when only agent reviewed", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { agentReviewed: true });
    expect(isCleared("s1")).toBe(false);
  });

  it("returns true only when both marks set", async () => {
    const { recordScrutiny, isCleared } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true, agentReviewed: true });
    expect(isCleared("s1")).toBe(true);
  });
});

describe("bumpBlockCount — escape-hatch counter", () => {
  it("increments from 0 to 1 on first bump", async () => {
    const { bumpBlockCount, getEntry } = await loadLedger();
    expect(bumpBlockCount("s1")).toBe(1);
    expect(getEntry("s1").blockCount).toBe(1);
  });

  it("increments monotonically across calls", async () => {
    const { bumpBlockCount } = await loadLedger();
    expect(bumpBlockCount("s1")).toBe(1);
    expect(bumpBlockCount("s1")).toBe(2);
    expect(bumpBlockCount("s1")).toBe(3);
  });

  it("does not interfere with selfReviewed/agentReviewed marks", async () => {
    const { bumpBlockCount, recordScrutiny, getEntry } = await loadLedger();
    bumpBlockCount("s1");
    recordScrutiny("s1", { selfReviewed: true });
    bumpBlockCount("s1");
    const entry = getEntry("s1");
    expect(entry.selfReviewed).toBe(true);
    expect(entry.blockCount).toBe(2);
  });
});

describe("clearSession — manual reset", () => {
  it("removes the entry and returns true", async () => {
    const { recordScrutiny, clearSession, getEntry } = await loadLedger();
    recordScrutiny("s1", { selfReviewed: true });
    expect(clearSession("s1")).toBe(true);
    expect(getEntry("s1")).toBe(null);
  });

  it("returns false for unknown session", async () => {
    const { clearSession } = await loadLedger();
    expect(clearSession("never-existed")).toBe(false);
  });
});

describe("MAX_BLOCKS_PER_SESSION — invariant", () => {
  it("is exposed and equals 3", async () => {
    const { MAX_BLOCKS_PER_SESSION } = await loadLedger();
    expect(MAX_BLOCKS_PER_SESSION).toBe(3);
  });
});

describe("multiple sessions — isolation", () => {
  it("entries for different sessions don't collide", async () => {
    const { recordScrutiny, isCleared, getEntry } = await loadLedger();
    recordScrutiny("alpha", { selfReviewed: true, agentReviewed: true });
    recordScrutiny("beta", { selfReviewed: true });
    expect(isCleared("alpha")).toBe(true);
    expect(isCleared("beta")).toBe(false);
    expect(getEntry("alpha").sessionId).toBe("alpha");
    expect(getEntry("beta").sessionId).toBe("beta");
  });
});
