/**
 * NeuralRoutingEngine — U-OCN03 test suite (OCTOPUS-NEURAL-MS0).
 *
 * Covers:
 *   1. cold_start (empty ledger)               — engine-edit → 3-of-3 hardcoded
 *   2. cold_start (< 50 entries)               — safety-critical → 5-of-5
 *   3. cold_start: test-only                    — 1-of-1 (claude-a) hardcoded
 *   4. cold_start: docs-only                    — 1-of-1 hardcoded
 *   5. cold_start: config-change                — 2-of-3 hardcoded
 *   6. cold_start: unrecognized class           — conservative 3-of-3 default
 *   7. ledger_knn happy path                    — 60 entries, 1-of-1 supported → returns 1-of-1
 *   8. poisoning defense                        — 60 entries with 1-of-1 but pass-rate < floor → fallback
 *   9. distribution shift                       — novel changeClass with no near neighbors → fallback
 *  10. fingerprint match                        — identical fingerprint → strong attractor
 *  11. tentacle vote                            — neighbor consensus on tentacle set surfaces
 *  12. validate: rejects bad input
 *  13. dispatcher round-trip (prism_ai:neural_route_decision)
 *
 * @module __tests__/NeuralRoutingEngine.test
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN03
 */

import { describe, it, expect } from "vitest";
import { NeuralRoutingEngine, type LedgerEntry } from "../engines/NeuralRoutingEngine.js";

/** Build a ledger entry with sensible defaults; override per-test. */
function entry(o: Partial<LedgerEntry>): LedgerEntry {
  return {
    sessionId: o.sessionId ?? `sess-${Math.random().toString(36).slice(2)}`,
    cleared: o.cleared ?? true,
    changeClass: o.changeClass ?? "engine-edit",
    fileTypes: o.fileTypes ?? ["ts"],
    peerCount: o.peerCount ?? 1,
    filesCount: o.filesCount ?? 3,
    fingerprint: o.fingerprint,
    passingTentacles: o.passingTentacles ?? ["codex", "claude-a", "claude-b"],
    quorum: o.quorum ?? "3-of-3",
    timestamp: o.timestamp ?? "2026-05-12T00:00:00Z",
  };
}

describe("NeuralRoutingEngine — U-OCN03 routing on scrutiny ledger", () => {
  // 1. cold-start: empty ledger → engine-edit fires 3-of-3 rule
  it("cold_start (empty ledger): engine-edit → 3-of-3 with default tentacles", () => {
    const eng = new NeuralRoutingEngine({ ledgerPath: "/nonexistent-file-on-purpose.json" });
    eng.setLedgerForTesting([]);
    const d = eng.route({ changeClass: "engine-edit", fileTypes: ["ts"], peerCount: 2 });
    expect(d.source).toBe("cold_start");
    expect(d.recommendedQuorum).toBe("3-of-3");
    expect(d.recommendedTentacles).toEqual(["codex", "claude-a", "claude-b"]);
    expect(d.ledgerSizeAtTime).toBe(0);
    expect(d.basedOnEntries).toBe(0);
    expect(d.rationale).toContain("Cold-start");
    expect(d.rationale).toContain("threshold 50");
  });

  // 2. cold-start: safety-critical → 5-of-5
  it("cold_start: safety-critical → 5-of-5 with full tentacle pool", () => {
    const eng = new NeuralRoutingEngine();
    eng.setLedgerForTesting([]);
    const d = eng.route({ changeClass: "safety-critical", fileTypes: ["ts"], peerCount: 0 });
    expect(d.source).toBe("cold_start");
    expect(d.recommendedQuorum).toBe("5-of-5");
    expect(d.recommendedTentacles).toEqual(["codex", "claude-a", "claude-b", "kimi-k2", "gemini"]);
    expect(d.confidence).toBeGreaterThan(0.5);
  });

  // 3. cold-start: test-only → 1-of-1
  it("cold_start: test-only → 1-of-1 (claude-a)", () => {
    const eng = new NeuralRoutingEngine();
    eng.setLedgerForTesting([]);
    const d = eng.route({ changeClass: "test-only", fileTypes: ["test.ts"], peerCount: 1 });
    expect(d.recommendedQuorum).toBe("1-of-1");
    expect(d.recommendedTentacles).toEqual(["claude-a"]);
    expect(d.source).toBe("cold_start");
  });

  // 4. cold-start: docs-only → 1-of-1
  it("cold_start: docs-only → 1-of-1", () => {
    const eng = new NeuralRoutingEngine();
    eng.setLedgerForTesting([]);
    const d = eng.route({ changeClass: "docs-only", fileTypes: ["md"], peerCount: 0 });
    expect(d.recommendedQuorum).toBe("1-of-1");
  });

  // 5. cold-start: config-change → 2-of-3
  it("cold_start: config-change → 2-of-3", () => {
    const eng = new NeuralRoutingEngine();
    eng.setLedgerForTesting([]);
    const d = eng.route({ changeClass: "config-change", fileTypes: ["json"], peerCount: 0 });
    expect(d.recommendedQuorum).toBe("2-of-3");
  });

  // 6. cold-start: unrecognized class → conservative 3-of-3
  it("cold_start: unrecognized class → conservative 3-of-3 default", () => {
    const eng = new NeuralRoutingEngine();
    eng.setLedgerForTesting([]);
    const d = eng.route({ changeClass: "weird-new-thing", fileTypes: ["ts"], peerCount: 0 });
    expect(d.recommendedQuorum).toBe("3-of-3");
    expect(d.rationale).toContain("conservative");
  });

  // 7. ledger_knn happy path: 60 entries supporting 1-of-1 for test-only changes with high pass rate
  it("ledger_knn happy: 60 entries of cleared 1-of-1 on test-only → returns 1-of-1 with high confidence", () => {
    const eng = new NeuralRoutingEngine();
    // 60 entries: 50 are cleared test-only/1-of-1, 10 are other.
    const ledger: LedgerEntry[] = [];
    for (let i = 0; i < 50; i++) {
      ledger.push(entry({
        changeClass: "test-only",
        fileTypes: ["test.ts"],
        peerCount: 1,
        cleared: true,
        quorum: "1-of-1",
        passingTentacles: ["claude-a"],
      }));
    }
    for (let i = 0; i < 10; i++) {
      ledger.push(entry({ changeClass: "engine-edit", quorum: "3-of-3" }));
    }
    eng.setLedgerForTesting(ledger);
    const d = eng.route({ changeClass: "test-only", fileTypes: ["test.ts"], peerCount: 1 });
    expect(d.source).toBe("ledger_knn");
    expect(d.recommendedQuorum).toBe("1-of-1");
    expect(d.recommendedTentacles).toEqual(["claude-a"]);
    expect(d.confidence).toBeGreaterThanOrEqual(0.7);
    expect(d.basedOnEntries).toBe(5); // default k=5
  });

  // 8. poisoning defense: 60 entries claim 1-of-1 PASS for engine-edit but pass-rate too low → fallback
  it("poisoning defense: low neighbor pass-rate blocks non-conservative recommendation", () => {
    const eng = new NeuralRoutingEngine();
    // 60 entries: all engine-edit/1-of-1 but most failed (cleared:false)
    const ledger: LedgerEntry[] = [];
    for (let i = 0; i < 55; i++) {
      ledger.push(entry({
        changeClass: "engine-edit",
        fileTypes: ["ts"],
        peerCount: 1,
        cleared: false,                       // ← failed
        quorum: "1-of-1",
        passingTentacles: ["claude-a"],
      }));
    }
    for (let i = 0; i < 5; i++) {
      ledger.push(entry({
        changeClass: "engine-edit",
        fileTypes: ["ts"],
        peerCount: 1,
        cleared: true,                        // ← only 5 cleared
        quorum: "1-of-1",
      }));
    }
    eng.setLedgerForTesting(ledger);
    const d = eng.route({ changeClass: "engine-edit", fileTypes: ["ts"], peerCount: 1 });
    // The 5 nearest neighbors all happen to have quorum=1-of-1, but pass-rate among them = 0
    // (all 5 failed since they're indistinguishable from the 55 failed ones — distance ties).
    // Pass-rate 0 < floor 0.6 → fallback to 3-of-3 conservative.
    expect(d.source).toBe("conservative_fallback");
    expect(d.recommendedQuorum).toBe("3-of-3");
    expect(d.confidence).toBe(0.5);
    expect(d.rationale).toContain("Falling back to 3-of-3");
  });

  // 9. distribution shift: novel changeClass with no near neighbors → falls back conservatively
  it("distribution shift: novel changeClass farther from all neighbors → still recommends conservatively when k-NN is unsure", () => {
    const eng = new NeuralRoutingEngine();
    // 60 entries all about safety-critical 5-of-5; ask about test-only.
    const ledger: LedgerEntry[] = [];
    for (let i = 0; i < 60; i++) {
      ledger.push(entry({
        changeClass: "safety-critical",
        fileTypes: ["ts"],
        peerCount: 0,
        cleared: true,
        quorum: "5-of-5",
        passingTentacles: ["codex", "claude-a", "claude-b", "kimi-k2", "gemini"],
      }));
    }
    eng.setLedgerForTesting(ledger);
    const d = eng.route({ changeClass: "test-only", fileTypes: ["md"], peerCount: 5 });
    // Neighbors all voted 5-of-5 (conservative), so engine returns 5-of-5 from k-NN —
    // it ISN'T a fallback. The defense applies to non-conservative quorums; 5-of-5 is
    // conservative-and-then-some so passes through.
    expect(["ledger_knn", "conservative_fallback"]).toContain(d.source);
    expect(["3-of-3", "5-of-5"]).toContain(d.recommendedQuorum);
  });

  // 10. fingerprint match: identical fingerprint as a past cleared entry → strong attractor
  it("fingerprint match: identical fingerprint pulls neighbor decision regardless of other features", () => {
    const eng = new NeuralRoutingEngine();
    const fp = "fp-test-abc-12345";
    // Bulk ledger of distant entries, plus one cleared entry with the matching fingerprint.
    const ledger: LedgerEntry[] = [];
    for (let i = 0; i < 50; i++) {
      ledger.push(entry({
        changeClass: "safety-critical",
        fileTypes: ["ts"],
        peerCount: 0,
        cleared: true,
        quorum: "5-of-5",
      }));
    }
    // Add 5 fingerprint-matching cleared entries with quorum=2-of-3.
    for (let i = 0; i < 5; i++) {
      ledger.push(entry({
        changeClass: "config-change",
        fileTypes: ["json"],
        peerCount: 1,
        cleared: true,
        quorum: "2-of-3",
        passingTentacles: ["codex", "claude-a"],
        fingerprint: fp,
      }));
    }
    eng.setLedgerForTesting(ledger);
    const d = eng.route({ changeClass: "config-change", fileTypes: ["json"], peerCount: 1, fingerprint: fp });
    expect(d.source).toBe("ledger_knn");
    expect(d.recommendedQuorum).toBe("2-of-3");
  });

  // 11. tentacle vote: neighbor consensus on tentacle set
  it("tentacle vote: most-frequent tentacle set among matching neighbors surfaces", () => {
    const eng = new NeuralRoutingEngine();
    const ledger: LedgerEntry[] = [];
    // 60 cleared test-only/1-of-1 entries, all voted 'codex' (not the default 'claude-a').
    for (let i = 0; i < 60; i++) {
      ledger.push(entry({
        changeClass: "test-only",
        fileTypes: ["test.ts"],
        peerCount: 1,
        cleared: true,
        quorum: "1-of-1",
        passingTentacles: ["codex"], // ← codex, not claude-a
      }));
    }
    eng.setLedgerForTesting(ledger);
    const d = eng.route({ changeClass: "test-only", fileTypes: ["test.ts"], peerCount: 1 });
    expect(d.recommendedTentacles).toEqual(["codex"]);
  });

  // 12. validate
  it("validate: rejects empty changeClass / bad peerCount / bad filesCount", () => {
    const eng = new NeuralRoutingEngine();
    eng.setLedgerForTesting([]);
    expect(() => eng.route({ changeClass: "", fileTypes: [], peerCount: 0 })).toThrow(/changeClass/);
    expect(() => eng.route({ changeClass: "x", fileTypes: [], peerCount: -1 })).toThrow(/peerCount/);
    expect(() => eng.route({ changeClass: "x", fileTypes: [], peerCount: 0, filesCount: -1 })).toThrow(/filesCount/);
    expect(() => eng.route({ changeClass: "x", fileTypes: "not-array" as never, peerCount: 0 })).toThrow(/fileTypes/);
  });

  // 13. tie-break at low k: explicit k=3
  it("k override: smaller k surfaces tightest neighborhood", () => {
    const eng = new NeuralRoutingEngine({ k: 3 });
    const ledger: LedgerEntry[] = [];
    for (let i = 0; i < 50; i++) {
      ledger.push(entry({
        changeClass: "test-only",
        fileTypes: ["test.ts"],
        cleared: true,
        quorum: "1-of-1",
        passingTentacles: ["claude-a"],
      }));
    }
    eng.setLedgerForTesting(ledger);
    const d = eng.route({ changeClass: "test-only", fileTypes: ["test.ts"], peerCount: 1 });
    expect(d.basedOnEntries).toBe(3);
    expect(d.recommendedQuorum).toBe("1-of-1");
  });

  // 14. graceful missing-ledger: instantiating with nonexistent path doesn't throw
  it("missing ledger file: route() returns cold_start gracefully (no throw)", () => {
    const eng = new NeuralRoutingEngine({ ledgerPath: "/this/path/definitely/does/not/exist.json" });
    const d = eng.route({ changeClass: "engine-edit", fileTypes: ["ts"], peerCount: 1 });
    expect(d.source).toBe("cold_start");
    expect(d.ledgerSizeAtTime).toBe(0);
  });
});

// ─── dispatcher round-trip ─────────────────────────────────────────────────
describe("prism_ai:neural_route_decision — dispatcher round-trip (U-OCN03 wiring)", () => {
  it("dispatches through executeAIReasoningAction → success:true with routing decision", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const out = await executeAIReasoningAction("neural_route_decision" as never, {
      change_class: "engine-edit",
      file_types: ["ts"],
      peer_count: 2,
      files_count: 4,
    });
    expect(out.success).toBe(true);
    const data = out.data as { recommendedQuorum: string; source: string; recommendedTentacles: string[] };
    // This is the dispatcher WIRING round-trip: it reads the LIVE octopus consensus ledger
    // (populated by PSN-OCTOPUS-FLEET-SYNERGY-MS0), so `source` depends on ambient ledger state
    // and cannot be pinned here. Assert the wiring contract that holds regardless of ledger state;
    // deterministic cold-start is covered hermetically above (injected empty ledgerPath).
    expect(["cold_start", "ledger_knn", "conservative_fallback"]).toContain(data.source);
    expect(["1-of-1", "2-of-3", "3-of-3", "5-of-5"]).toContain(data.recommendedQuorum);
    expect(data.recommendedTentacles.length).toBeGreaterThan(0);
  });
});
