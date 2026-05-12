/**
 * ContextIntegrityEngine.verifyChain() — hash chain verification (CPP-MS5-U-CPP34)
 *
 * Walks a list of pipeline stage artifacts and produces a verifiable SHA-256
 * hash chain + a 0-100 score. The wiring hook (post-pipeline-integrity-check.mjs)
 * invokes this and persists the result to state/shared/PIPELINE_INTEGRITY.json.
 *
 * Tests cover: chain correctness, empty-artifact detection (the "3-byte dead
 * file" failure from the CPP analysis), score boundaries, deterministic
 * hashing via DI, and the summary text.
 *
 * @milestone CPP-MS5-U-CPP34
 */

import { describe, it, expect } from "vitest";
import {
  ContextIntegrityEngine,
  type ChainArtifact,
} from "../engines/ContextIntegrityEngine.js";

const engine = new ContextIntegrityEngine();

// Simple deterministic hasher: concat all chars → 16-char hex of char codes.
// Not cryptographically meaningful; gives tests a predictable fixed point.
const fakeHasher = (input: string): string => {
  let acc = 0n;
  for (const ch of input) acc = (acc * 131n + BigInt(ch.charCodeAt(0))) & 0xffffffffffffffffn;
  return acc.toString(16).padStart(16, "0");
};

describe("ContextIntegrityEngine.verifyChain() (CPP-MS5-U-CPP34)", () => {
  const fullChain: ChainArtifact[] = [
    { stage: "compaction_survival", path: "/a/s.md", contents: "SURVIVAL-BLOCK-A" },
    { stage: "handoff", path: "/a/h.md", contents: "HANDOFF-BLOCK-B" },
    { stage: "session_start", path: "/a/ss.md", contents: "SESSION-START-BLOCK-C" },
    { stage: "first_task", path: "/a/ft.md", contents: "FIRST-TASK-BLOCK-D" },
  ];

  it("returns valid=true + score=100 for a healthy 4-stage chain", () => {
    const result = engine.verifyChain(fullChain, fakeHasher);
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
    expect(result.links).toHaveLength(4);
    expect(result.firstEmptyAt).toBeNull();
    expect(result.summary).toContain("chain OK");
  });

  it("first link has priorHash empty, every later link reuses the prior eventHash", () => {
    const result = engine.verifyChain(fullChain, fakeHasher);
    expect(result.links[0].priorHash).toBe("");
    expect(result.links[1].priorHash).toBe(result.links[0].eventHash);
    expect(result.links[2].priorHash).toBe(result.links[1].eventHash);
    expect(result.links[3].priorHash).toBe(result.links[2].eventHash);
  });

  it("is deterministic — same input produces same hashes", () => {
    const a = engine.verifyChain(fullChain, fakeHasher);
    const b = engine.verifyChain(fullChain, fakeHasher);
    expect(a.links.map((l) => l.eventHash)).toEqual(b.links.map((l) => l.eventHash));
  });

  it("flags empty artifact (3-byte dead file) and breaks validity", () => {
    const withEmpty: ChainArtifact[] = [
      fullChain[0],
      { stage: "handoff", path: "/a/h.md", contents: "" },
      fullChain[2],
    ];
    const result = engine.verifyChain(withEmpty, fakeHasher);
    expect(result.valid).toBe(false);
    expect(result.firstEmptyAt).toBe(1);
    expect(result.links[1].empty).toBe(true);
    expect(result.summary).toContain("BROKEN");
    expect(result.summary).toContain("handoff");
  });

  it("counts whitespace-only artifacts as empty", () => {
    const withWhitespace: ChainArtifact[] = [
      { stage: "compaction_survival", path: "/a/s.md", contents: "   \n\t  " },
      fullChain[1],
    ];
    const result = engine.verifyChain(withWhitespace, fakeHasher);
    expect(result.valid).toBe(false);
    expect(result.firstEmptyAt).toBe(0);
    expect(result.links[0].empty).toBe(true);
  });

  it("score floors at 0 and never goes negative", () => {
    const allEmpty: ChainArtifact[] = [
      { stage: "a", path: "/a", contents: "" },
      { stage: "b", path: "/b", contents: "" },
      { stage: "c", path: "/c", contents: "" },
      { stage: "d", path: "/d", contents: "" },
      { stage: "e", path: "/e", contents: "" },
      { stage: "f", path: "/f", contents: "" },
      { stage: "g", path: "/g", contents: "" },
      { stage: "h", path: "/h", contents: "" },
      { stage: "i", path: "/i", contents: "" },
      { stage: "j", path: "/j", contents: "" },
      { stage: "k", path: "/k", contents: "" },
    ];
    const result = engine.verifyChain(allEmpty, fakeHasher);
    expect(result.score).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("records lengthBytes for observability (detects small artifacts)", () => {
    const chain: ChainArtifact[] = [
      { stage: "handoff", path: "/h", contents: "abc" },
      { stage: "task", path: "/t", contents: "x".repeat(100) },
    ];
    const result = engine.verifyChain(chain, fakeHasher);
    expect(result.links[0].lengthBytes).toBe(3);
    expect(result.links[1].lengthBytes).toBe(100);
  });

  it("empty artifact list returns valid=false and summary explains", () => {
    const result = engine.verifyChain([], fakeHasher);
    expect(result.valid).toBe(false);
    expect(result.links).toHaveLength(0);
    expect(result.summary).toContain("chain empty");
  });

  it("two consecutive empties both marked but firstEmptyAt reports only the first", () => {
    const chain: ChainArtifact[] = [
      fullChain[0],
      { stage: "handoff", path: "/h", contents: "" },
      { stage: "start", path: "/s", contents: "" },
    ];
    const result = engine.verifyChain(chain, fakeHasher);
    expect(result.firstEmptyAt).toBe(1);
    expect(result.links[1].empty).toBe(true);
    expect(result.links[2].empty).toBe(true);
    expect(result.summary).toMatch(/2\/3 artifact\(s\) empty/);
  });

  it("default node:crypto hasher produces valid 64-char hex (sha256)", () => {
    // No fake hasher → falls back to sha256.
    const result = engine.verifyChain(fullChain);
    for (const link of result.links) {
      expect(link.eventHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("changing any artifact mid-chain changes every downstream eventHash", () => {
    const a = engine.verifyChain(fullChain, fakeHasher);
    const tampered: ChainArtifact[] = [
      fullChain[0],
      { ...fullChain[1], contents: "TAMPERED" },
      fullChain[2],
      fullChain[3],
    ];
    const b = engine.verifyChain(tampered, fakeHasher);
    expect(b.links[0].eventHash).toBe(a.links[0].eventHash);
    expect(b.links[1].eventHash).not.toBe(a.links[1].eventHash);
    expect(b.links[2].eventHash).not.toBe(a.links[2].eventHash);
    expect(b.links[3].eventHash).not.toBe(a.links[3].eventHash);
  });

  it("stage and path round-trip onto the link", () => {
    const result = engine.verifyChain(fullChain, fakeHasher);
    expect(result.links.map((l) => l.stage)).toEqual([
      "compaction_survival", "handoff", "session_start", "first_task",
    ]);
    expect(result.links[0].path).toBe("/a/s.md");
  });
});
