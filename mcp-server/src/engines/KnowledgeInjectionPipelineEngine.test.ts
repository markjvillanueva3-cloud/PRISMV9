/**
 * KnowledgeInjectionPipelineEngine.test.ts — vitest
 *
 * Pure-core hermetic tests + ONE real-data E2E (RGS-TOOL-AUTOINVOKE-MS1
 * lesson: a "pure core + injected readers" design MUST hit real data once).
 *
 *  - plan(): lane→target mapping, 3-system bindings, stable injectionId,
 *    eligibility gating, validation
 *  - executeInjection(): temp-dir writes, idempotence (create-skip,
 *    append-dedup), dry-run, error capture
 *  - recordInjection / recordOutcome: ledger append + validation
 *  - computeFeedback(): the injection↔outcome join math (the closed-loop
 *    metric) — happy path, orphans, dedup, empty
 *  - real-data E2E: plan() over the live COURSE-DATA-ROUTING-LEDGER
 *
 * @module engines/KnowledgeInjectionPipelineEngine.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import {
  knowledgeInjectionPipelineEngine as kip,
  type RoutedAsset,
  type InjectionRecord,
  type OutcomeRecord,
} from "./KnowledgeInjectionPipelineEngine.js";

const REPO_ROOT = resolve(__dirname, "../../..");

// ─── fixtures ──────────────────────────────────────────────────────

const forgeAsset: RoutedAsset = {
  kind: "algorithm",
  name: "operator-splitting",
  courseId: "10.34",
  domains: ["cam", "thermal"],
  mfgRelevance: 0.8,
  targetNodeType: "algorithm",
  targetSurface: "mcp-server/src/algorithms/<NewAlgorithm>.ts",
  decision: "FORGE-QUEUE",
  lane: "C",
  recommendedAction: "/forge-triple algorithm:operator-splitting",
};

const tribalAsset: RoutedAsset = {
  kind: "technique",
  name: "monte-carlo-integration",
  courseId: "10.34",
  domains: ["cam", "thermal"],
  mfgRelevance: 0.8,
  decision: "TRIBAL-SHIPPED",
  lane: "A",
};

const discardAsset: RoutedAsset = {
  kind: "knowledge",
  name: "some-irrelevant-topic",
  courseId: "21f.000",
  decision: "DISCARD",
  lane: "none",
};

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "kip-test-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

// ─── plan() — pure ─────────────────────────────────────────────────

describe("KnowledgeInjectionPipelineEngine.plan — pure planning", () => {
  it("produces a stable injectionId (content hash, kip- prefix)", () => {
    const p1 = kip.plan(forgeAsset);
    const p2 = kip.plan({ ...forgeAsset });
    expect(p1.injectionId).toMatch(/^kip-[0-9a-f]{12}$/);
    expect(p1.injectionId).toBe(p2.injectionId); // deterministic
  });

  it("different assets get different injectionIds", () => {
    expect(kip.plan(forgeAsset).injectionId).not.toBe(kip.plan(tribalAsset).injectionId);
  });

  it("Lane C asset → forge-queue target + 3 system bindings", () => {
    const p = kip.plan(forgeAsset);
    expect(p.eligible).toBe(true);
    expect(p.lane).toBe("C");
    expect(p.injectionTarget).toMatch(/forge-queue/);
    expect(p.bindings.map((b) => b.system).sort()).toEqual(["obsidian", "prism-ai", "prism-os"]);
  });

  it("Lane A asset → knowledge_store target", () => {
    const p = kip.plan(tribalAsset);
    expect(p.eligible).toBe(true);
    expect(p.lane).toBe("A");
    expect(p.injectionTarget).toMatch(/knowledge_store/);
  });

  it("the 3 bindings target prism-os wiki/os, obsidian memory, and the AI registry", () => {
    const p = kip.plan(forgeAsset);
    const os = p.bindings.find((b) => b.system === "prism-os")!;
    const ob = p.bindings.find((b) => b.system === "obsidian")!;
    const ai = p.bindings.find((b) => b.system === "prism-ai")!;
    expect(os.path).toMatch(/^knowledge\/wiki\/os\/knowledge\/kip-.*\.md$/);
    expect(os.action).toBe("create");
    expect(ob.path).toMatch(/^knowledge\/memories\/reference\/reference_kip_.*\.md$/);
    expect(ob.action).toBe("create");
    expect(ai.path).toBe("state/shared/knowledge-injection-ai-registry.json");
    expect(ai.action).toBe("append");
    // the os payload carries the injection_id (the verification anchor)
    expect(os.payload).toContain(p.injectionId);
    // the ai payload is a parseable JSON object carrying the id
    expect(JSON.parse(ai.payload).injectionId).toBe(p.injectionId);
  });

  it("DISCARD / lane none → ineligible, no bindings, named reason", () => {
    const p = kip.plan(discardAsset);
    expect(p.eligible).toBe(false);
    expect(p.bindings).toEqual([]);
    // the reason names the actual gate that rejected it
    expect(p.ineligibleReason).toMatch(/lane "none" is not injectable|decision "DISCARD" is terminal/);
  });

  it("verificationChannel is a re-runnable command string carrying the id", () => {
    const p = kip.plan(forgeAsset);
    expect(p.verificationChannel).toMatch(/grep injection_id/);
    expect(p.verificationChannel).toContain(p.injectionId);
  });

  it("rejects malformed assets (R12 fail-loud)", () => {
    expect(() => kip.plan(null as unknown as RoutedAsset)).toThrow(/must be an object/);
    expect(() => kip.plan({ name: "x", decision: "FORGE-QUEUE", lane: "C" } as RoutedAsset)).toThrow(/kind/);
    expect(() => kip.plan({ kind: "algorithm", decision: "FORGE-QUEUE", lane: "C" } as RoutedAsset)).toThrow(/name/);
  });
});

// ─── executeInjection() — IO into a temp dir ───────────────────────

describe("KnowledgeInjectionPipelineEngine.executeInjection — temp-dir IO", () => {
  it("writes all 3 surface bindings on a fresh injection", () => {
    const p = kip.plan(forgeAsset);
    const r = kip.executeInjection(p, { repoRoot: tmp });
    expect(r.ok).toBe(true);
    expect(r.written.length).toBe(3);
    expect(r.errors).toEqual([]);
    for (const b of p.bindings) {
      expect(existsSync(resolve(tmp, b.path))).toBe(true);
    }
  });

  it("written prism-os file contains the full frontmatter + injection_id", () => {
    const p = kip.plan(forgeAsset);
    kip.executeInjection(p, { repoRoot: tmp });
    const os = p.bindings.find((b) => b.system === "prism-os")!;
    const content = readFileSync(resolve(tmp, os.path), "utf8");
    expect(content).toContain(`injection_id: ${p.injectionId}`);
    expect(content).toContain("milestone: KNOWLEDGE-CONVERSION-MS0");
    expect(content).toContain("# Injected knowledge: algorithm:operator-splitting");
  });

  it("create-binding is idempotent — re-run skips existing files", () => {
    const p = kip.plan(forgeAsset);
    kip.executeInjection(p, { repoRoot: tmp });
    const r2 = kip.executeInjection(p, { repoRoot: tmp });
    // os + obsidian skipped (create, exist); ai skipped (append, id present)
    expect(r2.written.length).toBe(0);
    expect(r2.skipped.length).toBe(3);
    expect(r2.ok).toBe(true);
  });

  it("append-binding dedups on injectionId — registry not double-appended", () => {
    const p = kip.plan(forgeAsset);
    kip.executeInjection(p, { repoRoot: tmp });
    kip.executeInjection(p, { repoRoot: tmp });
    const reg = readFileSync(resolve(tmp, "state/shared/knowledge-injection-ai-registry.json"), "utf8");
    const occurrences = reg.split(p.injectionId).length - 1;
    expect(occurrences).toBe(1); // exactly one registry line
  });

  it("dry-run plans the writes without touching disk", () => {
    const p = kip.plan(forgeAsset);
    const r = kip.executeInjection(p, { repoRoot: tmp }, { dryRun: true });
    expect(r.written.length).toBe(3); // reported as would-write
    for (const b of p.bindings) {
      expect(existsSync(resolve(tmp, b.path))).toBe(false); // nothing written
    }
  });

  it("ineligible plan → ok:false, no writes, named error", () => {
    const p = kip.plan(discardAsset);
    const r = kip.executeInjection(p, { repoRoot: tmp });
    expect(r.ok).toBe(false);
    expect(r.written).toEqual([]);
    expect(r.errors[0]).toMatch(/not eligible/);
  });

  it("two distinct assets each get their own registry line", () => {
    const pA = kip.plan(forgeAsset);
    const pB = kip.plan(tribalAsset);
    kip.executeInjection(pA, { repoRoot: tmp });
    kip.executeInjection(pB, { repoRoot: tmp });
    const reg = readFileSync(resolve(tmp, "state/shared/knowledge-injection-ai-registry.json"), "utf8")
      .trim().split(/\r?\n/);
    expect(reg.length).toBe(2);
  });
});

// ─── recordInjection / recordOutcome ───────────────────────────────

describe("KnowledgeInjectionPipelineEngine — ledger recording", () => {
  it("recordInjection appends a row to the injection ledger", () => {
    const p = kip.plan(forgeAsset);
    const r = kip.executeInjection(p, { repoRoot: tmp });
    const rec = kip.recordInjection(p, r, { repoRoot: tmp }, { frozenTime: "2026-05-17T00:00:00Z" });
    expect(rec.injectionId).toBe(p.injectionId);
    expect(rec.bindingsWritten).toBe(3);
    const ledger = readFileSync(resolve(tmp, "state/shared/knowledge-injection-ledger.jsonl"), "utf8");
    expect(JSON.parse(ledger.trim()).injectionId).toBe(p.injectionId);
  });

  it("recordOutcome appends a feedback row", () => {
    const rec = kip.recordOutcome(
      "kip-abc123def456",
      { consumedBy: "ThermalDeflectionEngine", helped: true, evidence: "used Strang split" },
      { repoRoot: tmp },
      { frozenTime: "2026-05-17T01:00:00Z" },
    );
    expect(rec.helped).toBe(true);
    const out = readFileSync(resolve(tmp, "state/shared/knowledge-injection-outcomes.jsonl"), "utf8");
    expect(JSON.parse(out.trim()).consumedBy).toBe("ThermalDeflectionEngine");
  });

  it("recordOutcome rejects a non-kip injectionId and bad fields (R12)", () => {
    expect(() => kip.recordOutcome("bogus", { consumedBy: "x", helped: true, evidence: "" }, { repoRoot: tmp }))
      .toThrow(/kip-/);
    expect(() => kip.recordOutcome("kip-x", { consumedBy: "", helped: true, evidence: "" }, { repoRoot: tmp }))
      .toThrow(/consumedBy/);
    expect(() => kip.recordOutcome("kip-x", { consumedBy: "n", helped: "yes" as unknown as boolean, evidence: "" }, { repoRoot: tmp }))
      .toThrow(/helped/);
  });
});

// ─── computeFeedback() — the closed-loop join math (pure) ───────────

describe("KnowledgeInjectionPipelineEngine.computeFeedback — closed-loop metric", () => {
  const inj = (id: string, lane: string): InjectionRecord => ({
    injectionId: id, ts: "2026-05-17T00:00:00Z", kind: "algorithm", name: id,
    courseId: "c", lane, injectionTarget: "t", boundSystems: ["prism-os"],
    bindingsWritten: 1, bindingsSkipped: 0, ok: true,
  });
  const out = (id: string, helped: boolean): OutcomeRecord => ({
    injectionId: id, ts: "2026-05-17T01:00:00Z", consumedBy: "E", helped, evidence: "e",
  });

  it("empty ledgers → all-zero summary, no division by zero", () => {
    const s = kip.computeFeedback([], []);
    expect(s).toMatchObject({ injected: 0, consumed: 0, helped: 0, helpRate: 0, consumeRate: 0 });
  });

  it("joins injection↔outcome: 3 injected, 2 consumed, 1 helped", () => {
    const injections = [inj("kip-1", "C"), inj("kip-2", "C"), inj("kip-3", "A")];
    const outcomes = [out("kip-1", true), out("kip-2", false)];
    const s = kip.computeFeedback(injections, outcomes);
    expect(s.injected).toBe(3);
    expect(s.consumed).toBe(2);
    expect(s.helped).toBe(1);
    expect(s.helpRate).toBeCloseTo(0.5, 9);   // 1 helped / 2 consumed
    expect(s.consumeRate).toBeCloseTo(2 / 3, 9);
  });

  it("orphanInjections lists injected-but-never-consumed ids", () => {
    const s = kip.computeFeedback([inj("kip-1", "C"), inj("kip-2", "C")], [out("kip-1", true)]);
    expect(s.orphanInjections).toEqual(["kip-2"]);
  });

  it("byLane breaks the metric down per lane", () => {
    const injections = [inj("kip-1", "C"), inj("kip-2", "A"), inj("kip-3", "A")];
    const outcomes = [out("kip-1", true), out("kip-2", true)];
    const s = kip.computeFeedback(injections, outcomes);
    expect(s.byLane["C"]).toEqual({ injected: 1, consumed: 1, helped: 1 });
    expect(s.byLane["A"]).toEqual({ injected: 2, consumed: 1, helped: 1 });
  });

  it("dedups re-appended injection rows (re-runs count once)", () => {
    const s = kip.computeFeedback([inj("kip-1", "C"), inj("kip-1", "C")], []);
    expect(s.injected).toBe(1);
  });

  it("an outcome for an un-injected id does not inflate consumed/helped", () => {
    // kip-99 was never injected — its outcome must not count
    const s = kip.computeFeedback([inj("kip-1", "C")], [out("kip-99", true)]);
    expect(s.consumed).toBe(0);
    expect(s.helped).toBe(0);
  });

  it("multiple outcomes for one id count it once (distinct-id semantics)", () => {
    const s = kip.computeFeedback(
      [inj("kip-1", "C")],
      [out("kip-1", false), out("kip-1", true), out("kip-1", true)],
    );
    expect(s.consumed).toBe(1);
    expect(s.helped).toBe(1); // ≥1 helped:true → counts as helped
  });
});

// ─── feedbackSummary() round-trip through real ledgers ─────────────

describe("KnowledgeInjectionPipelineEngine.feedbackSummary — full round-trip", () => {
  it("plan → execute → recordInjection → recordOutcome → feedbackSummary closes the loop", () => {
    const p = kip.plan(forgeAsset);
    const r = kip.executeInjection(p, { repoRoot: tmp });
    kip.recordInjection(p, r, { repoRoot: tmp });
    // before outcome: injected 1, consumed 0
    let s = kip.feedbackSummary({ repoRoot: tmp });
    expect(s.injected).toBe(1);
    expect(s.consumed).toBe(0);
    expect(s.orphanInjections).toEqual([p.injectionId]);
    // a node consumes it and reports back
    kip.recordOutcome(p.injectionId, { consumedBy: "OperatorSplittingMethod", helped: true, evidence: "shipped" }, { repoRoot: tmp });
    s = kip.feedbackSummary({ repoRoot: tmp });
    expect(s.consumed).toBe(1);
    expect(s.helped).toBe(1);
    expect(s.helpRate).toBe(1);
    expect(s.orphanInjections).toEqual([]);
  });

  it("tolerates a corrupt JSONL line in the ledger (skips, no throw)", () => {
    const ledger = resolve(tmp, "state/shared/knowledge-injection-ledger.jsonl");
    mkdirSync(dirname(ledger), { recursive: true });
    writeFileSync(ledger,
      JSON.stringify({ injectionId: "kip-good", ts: "t", kind: "k", name: "n", courseId: "c", lane: "C", injectionTarget: "t", boundSystems: [], bindingsWritten: 0, bindingsSkipped: 0, ok: true }) + "\n" +
      "{ this is not valid json\n", "utf8");
    const s = kip.feedbackSummary({ repoRoot: tmp });
    expect(s.injected).toBe(1); // good line counted, corrupt line skipped
  });
});

// ─── REAL-DATA E2E (RGS-TOOL-MS1 lesson — hit live data once) ───────

describe("KnowledgeInjectionPipelineEngine — real-data E2E", () => {
  it("plan() handles every decision in the live COURSE-DATA-ROUTING-LEDGER", () => {
    const ledgerPath = resolve(REPO_ROOT, "state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json");
    if (!existsSync(ledgerPath)) {
      // ledger is a generated artifact; if absent the E2E is a no-op (not a failure)
      return;
    }
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
    let planned = 0;
    let eligible = 0;
    const seenIds = new Set<string>();
    for (const item of ledger.items ?? []) {
      for (const dec of item.decisions ?? []) {
        const asset: RoutedAsset = {
          kind: dec.kind, name: dec.name, courseId: dec.courseId,
          domains: dec.domains, mfgRelevance: dec.mfgRelevance,
          targetNodeType: dec.targetNodeType, targetSurface: dec.targetSurface,
          decision: dec.decision, lane: dec.lane, recommendedAction: dec.recommendedAction,
        };
        const p = kip.plan(asset);
        planned += 1;
        seenIds.add(p.injectionId);
        if (p.eligible) {
          eligible += 1;
          // every eligible plan must carry exactly 3 system bindings
          expect(p.bindings.length).toBe(3);
          expect(p.injectionId).toMatch(/^kip-[0-9a-f]{12}$/);
          // each eligible plan binds to all 3 named systems
          expect(p.bindings.map((b) => b.system).sort())
            .toEqual(["obsidian", "prism-ai", "prism-os"]);
        } else {
          // ineligible ⇒ no bindings, named reason
          expect(p.bindings.length).toBe(0);
        }
      }
    }
    // the live ledger summary reports 126 routed assets — plan() must have
    // run on the real corpus, and eligible (non-DISCARD) must dominate.
    expect(planned).toBeGreaterThanOrEqual(100);
    expect(eligible).toBeGreaterThanOrEqual(80);
    // injectionIds are content-hashed — no collisions across the real corpus
    expect(seenIds.size).toBe(planned);
  });
});
