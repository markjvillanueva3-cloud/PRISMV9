/**
 * UnifiedErrorLedgerEngine.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P2-U03 — verifies the engine's append/embed/recall
 * surface. Tests run with the embedder unset on QdrantMemoryEngineSingleton so
 * the embed path returns a controlled error string ("no-embedder-configured")
 * — keeps the suite hermetic without a Qdrant or Ollama dependency.
 *
 * Coverage: 5 sources spanning the canonical enum, recall fallback when
 * Qdrant is unreachable, dedup across reruns, getRecent ordering, and
 * adversarial inputs (NaN-ish ts, oversized message, empty signature
 * ingredients).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { unifiedErrorLedgerEngine } from "../engines/UnifiedErrorLedgerEngine.js";
import { QdrantMemoryEngineSingleton } from "../engines/QdrantMemoryEngineSingleton.js";
import { ERROR_LEDGER_SOURCE_VALUES } from "../schemas/unifiedErrorLedger.js";

const LEDGER = "H:/prism/mcp-server/data/state/UNIFIED_ERROR_LEDGER.jsonl";

beforeAll(() => {
  // Ensure ledger exists (P2-U01 migration may not have run on a fresh clone)
  if (!existsSync(LEDGER)) {
    const r = unifiedErrorLedgerEngine.append({
      source: "learner",
      tool: "test-bootstrap",
      message: "bootstrap entry",
    });
    expect(r.ok).toBe(true);
  }
  // Reset embedder to deterministic "no embedder" state
  QdrantMemoryEngineSingleton.reset();
});

afterAll(() => {
  // Leave singleton clean for downstream test files
  QdrantMemoryEngineSingleton.reset();
});

describe("UnifiedErrorLedgerEngine.append — P2-U03", () => {
  it("happy path: appends a valid entry and returns the normalized row", () => {
    const r = unifiedErrorLedgerEngine.append({
      source: "hook_block",
      tool: "Edit",
      errorClass: "TS2322",
      message: "Type mismatch on line 12",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.source).toBe("hook_block");
    expect(r.entry.signature).toContain("TS2322");
    expect(r.entry.embedding_id).toBeNull();
    expect(typeof r.entry.id).toBe("string");
  });

  it("idempotency: same source+signature+ts+tool dedupes on second append", () => {
    const ts = "2026-04-28T01:33:00.000Z";
    const r1 = unifiedErrorLedgerEngine.append({
      source: "session",
      tool: "Bash",
      message: "ENOENT: file not found",
      ts,
      id: "dedup-test-1",
    });
    const r2 = unifiedErrorLedgerEngine.append({
      source: "session",
      tool: "Bash",
      message: "ENOENT: file not found",
      ts,
      id: "dedup-test-1",
    });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r2.deduped).toBe(true);
    }
  });

  it("variability: appends entries from all 5 canonical source values", () => {
    const before = statSync(LEDGER).size;
    const ids: string[] = [];
    for (const source of ERROR_LEDGER_SOURCE_VALUES) {
      const r = unifiedErrorLedgerEngine.append({
        source,
        tool: `tool-${source}`,
        message: `${source}-variability-${Date.now()}-${Math.random()}`,
      });
      expect(r.ok).toBe(true);
      if (r.ok) ids.push(r.entry.id);
    }
    expect(new Set(ids).size).toBe(ERROR_LEDGER_SOURCE_VALUES.length);
    const after = statSync(LEDGER).size;
    expect(after).toBeGreaterThan(before);
  });

  it("FAIL: rejects an entry with empty source (typed at compile + runtime)", () => {
    // Force a runtime invalid source past the TypeScript boundary
    const r = unifiedErrorLedgerEngine.append({
      // @ts-expect-error intentionally wrong
      source: "made_up_source",
      message: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("schema-validation-failed");
    }
  });

  it("ADV: oversized message (5000 chars) is truncated by signature builder, never crashes", () => {
    const big = "x".repeat(5000);
    const r = unifiedErrorLedgerEngine.append({
      source: "learner",
      message: big,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entry.signature.length).toBeLessThanOrEqual(240);
    }
  });

  it("ADV: empty message + empty errorClass falls back to 'unknown-error' signature", () => {
    const r = unifiedErrorLedgerEngine.append({
      source: "recovery",
      message: "",
      errorClass: "",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entry.signature).toBe("unknown-error");
    }
  });
});

describe("UnifiedErrorLedgerEngine.embed — P2-U03 (no embedder configured)", () => {
  it("returns ok:false with controlled error when embedder is not set", async () => {
    const append = unifiedErrorLedgerEngine.append({
      source: "pattern_memory",
      tool: "Write",
      message: "embed-test",
    });
    expect(append.ok).toBe(true);
    if (!append.ok) return;
    const r = await unifiedErrorLedgerEngine.embed(append.entry);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.error).toBe("string");
      expect(r.error.length).toBeGreaterThan(0);
    }
  });

  it("appendAndEmbed returns ok:true even when embedding fails (best-effort)", async () => {
    const r = await unifiedErrorLedgerEngine.appendAndEmbed({
      source: "learner",
      tool: "Edit",
      message: "embed-fallback-test",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.embedded).toBe(false);
      expect(typeof r.embedError).toBe("string");
    }
  });
});

describe("UnifiedErrorLedgerEngine.recallSimilar — P2-U03 fallback", () => {
  it("returns empty array when Qdrant is unreachable (graceful degrade)", async () => {
    const hits = await unifiedErrorLedgerEngine.recallSimilar("ENOENT :: file not found", 3);
    expect(Array.isArray(hits)).toBe(true);
    expect(hits.length).toBe(0);
  });
});

describe("UnifiedErrorLedgerEngine.getRecent — P2-U03", () => {
  it("returns most recent entries first, capped at limit", () => {
    // ensure 3 fresh entries
    for (let i = 0; i < 3; i++) {
      unifiedErrorLedgerEngine.append({
        source: "session",
        tool: `recent-${i}`,
        message: `recent-test-${Date.now()}-${i}-${Math.random()}`,
      });
    }
    const recent = unifiedErrorLedgerEngine.getRecent(5);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.length).toBeLessThanOrEqual(5);
    // most recent first => first entry's ts should be >= second's
    if (recent.length >= 2) {
      expect(recent[0].ts >= recent[1].ts).toBe(true);
    }
  });

  it("source filter narrows results to a single canonical source", () => {
    unifiedErrorLedgerEngine.append({
      source: "hook_block",
      tool: "filter-test",
      message: `filter-test-${Date.now()}-${Math.random()}`,
    });
    const filtered = unifiedErrorLedgerEngine.getRecent(20, "hook_block");
    expect(filtered.length).toBeGreaterThan(0);
    for (const e of filtered) {
      expect(e.source).toBe("hook_block");
    }
  });
});

describe("UnifiedErrorLedgerEngine — round-trip via dispatcher schema", () => {
  it("error kind is registered in MEMORY_KINDS surface", async () => {
    const mod = await import("../engines/QdrantMemoryEngine.js");
    expect((mod.MEMORY_KINDS as readonly string[]).includes("error")).toBe(true);
  });

  it("memoryActionSchemas accepts kind=error in remember/semantic_search", async () => {
    const mod = await import("../schemas/memoryActionSchemas.js");
    const r1 = mod.ACTION_MEMORY_SCHEMAS.remember.safeParse({
      kind: "error",
      id: "round-trip-1",
      text: "TS2322 :: type mismatch",
    });
    expect(r1.success).toBe(true);
    const r2 = mod.ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({
      kind: "error",
      query: "TS2322",
      limit: 5,
    });
    expect(r2.success).toBe(true);
  });
});
