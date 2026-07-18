/**
 * turning-rag-advisory.test.ts -- slot:whiskey (Lathe Wizard, U-LW-RAG-ADVISORY)
 * ============================================================================
 * The head (generateProgram) now retrieves REAL tips from the 3,700-tip tribal corpus
 * (LatheTribalIntegrationEngine.sourceCorpusTips) as advisory RAG context, replacing a fabricated-string
 * stub. The advisory is purely ADDITIVE -- it never alters the spine's emitted program_text -- and is
 * fail-soft (a corpus failure yields [] and never aborts generation).
 *
 * Intent (R9): rag_advisory is mapped from the REAL corpus (not fabricated); it NEVER changes the emitted
 * G-code (the operator-safety invariant); a corpus failure is contained (generation still succeeds); and
 * the public retrieveRAGContext (dispatcher path) returns the same mapped entries.
 *
 * Hermeticity: every test spies the tribal SINGLETON's sourceCorpusTips so the heavy live corpus is never
 * hit (no file I/O, deterministic).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { latheTribalIntegrationEngine } from "../engines/LatheTribalIntegrationEngine.js";

const okumaPart = () =>
  ({
    part_number: "RAG-ADVISORY",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// two real-shaped TribalTips the corpus would return
const fakeTips = () =>
  [
    { id: "t1", content: "For 1018 OD turning, a 0.4mm nose radius balances finish and edge life.",
      category: "speed_feed", confidence: 0.9, source_customer: "ACME" },
    { id: "t2", content: "Chamfer the bar end before parting to avoid a center pip.",
      category: "parting", confidence: 0.7, source_program: "P1234" },
  ] as unknown as ReturnType<typeof latheTribalIntegrationEngine.sourceCorpusTips>;

describe("U-LW-RAG-ADVISORY -- real tribal corpus wired into the head (RAG advisory)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generateProgram surfaces rag_advisory mapped from the REAL corpus (not the fabricated stub)", () => {
    vi.spyOn(latheTribalIntegrationEngine, "sourceCorpusTips").mockReturnValue(fakeTips());
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(Array.isArray(r.rag_advisory)).toBe(true);
    expect(r.rag_advisory.length).toBe(2);
    expect(r.rag_advisory[0]).toMatchObject({ id: "t1", category: "speed_feed", confidence: 0.9, source: "ACME" });
    expect(r.rag_advisory[0].content).toContain("nose radius");
    // the old fabricated-stub format must NEVER appear
    expect(r.rag_advisory.every((e) => !/Knowledge related to:/.test(e.content))).toBe(true);
  });

  it("ADVISORY-ONLY: rag_advisory NEVER alters the emitted program_text (operator-safety invariant)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    vi.spyOn(latheTribalIntegrationEngine, "sourceCorpusTips").mockReturnValue(fakeTips());
    const spine = latheOrchestrationEngine.calculate("x", okumaPart()); // spine never computes RAG
    const head = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(head.rag_advisory.length).toBeGreaterThan(0); // advisory present...
    expect(stripTs(head.program_text)).toBe(stripTs(spine.program_text)); // ...G-code byte-identical
  });

  it("FAIL-SOFT: a corpus failure yields [] and NEVER aborts generation", () => {
    vi.spyOn(latheTribalIntegrationEngine, "sourceCorpusTips").mockImplementation(() => {
      throw new Error("corpus unavailable");
    });
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.success).toBe(true); // generation completes despite corpus failure
    expect(r.program_text.length).toBeGreaterThan(50);
    expect(r.rag_advisory).toEqual([]);
  });

  it("retrieveRAGContext (the dispatcher path) returns the mapped advisory entries", () => {
    vi.spyOn(latheTribalIntegrationEngine, "sourceCorpusTips").mockReturnValue(fakeTips());
    const entries = latheAIOrchestrationEngine.retrieveRAGContext(okumaPart());
    expect(entries.map((e) => e.id)).toEqual(["t1", "t2"]);
    expect(entries[1].confidence).toBe(0.7);
    expect(entries[1].source).toBe("P1234"); // falls back to source_program when no source_customer
  });

  it("skip_rag_advisory:true is a perf opt-out -- returns [] WITHOUT touching the corpus", () => {
    const spy = vi.spyOn(latheTribalIntegrationEngine, "sourceCorpusTips").mockReturnValue(fakeTips());
    const input = { ...(okumaPart() as object), skip_rag_advisory: true } as unknown as Parameters<
      typeof latheOrchestrationEngine.calculate
    >[1];
    const r = latheAIOrchestrationEngine.generateProgram(input);
    expect(r.rag_advisory).toEqual([]);
    expect(spy).not.toHaveBeenCalled(); // corpus never queried -- the opt-out short-circuits
    expect(r.success).toBe(true); // generation still completes
  });
});
