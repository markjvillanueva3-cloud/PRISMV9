/**
 * U-BPA-RAG-RECORDOUTCOME (slot:india) -- round-trip proof that the MCP
 * `blueprint_rag_extract` action persists its extraction (a PREDICTION,
 * accurate:null) to the shared closed-loop ledger via the CANONICAL writer
 * (scripts/lib/blueprint-accuracy-event-writer.mjs), and that the appended row
 * routes to `outcome_record` through the REAL consumer-lib reader (never the
 * `unknown` drop bucket). Exercises the recordOutcome IO wiring added to the
 * cadDispatcher blueprint_rag_extract case, round-tripped THROUGH the prism_cad
 * handler -- NOT the engine singleton (R15: assert through the dispatcher).
 *
 * Coverage: happy (high-conf + corpus source) + floor-independence (low-conf,
 * sourceless) + append-only invariant (2 extracts -> 2 distinct rows) + 2
 * guard-reject failure modes (missing regions / missing request -> ZERO ledger
 * pollution) + adversarial (our row mixed with a foreign unknown-type row: only
 * ours routes, no cross-contamination).
 *
 * The writer reads PRISM_BPA_EVENTS_FILE at its module-eval; the dispatcher
 * lazily imports it on the first recordOutcome call, so setting the env at this
 * test module's top (before any callCad) redirects the ledger to a temp file --
 * which also self-validates the wiring: if the env-redirect did NOT take, the
 * row would land in the real ledger and these assertions on the temp file would
 * fail loud (no false green).
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP_DIR = mkdtempSync(join(tmpdir(), "bpa-rag-recordoutcome-"));
const EVENTS_FILE = join(TMP_DIR, "blueprint-accuracy-events.jsonl");
process.env.PRISM_BPA_EVENTS_FILE = EVENTS_FILE;
// Neutralize the U-BPA-RAG-TRIBAL-DEFAULT default tribal injection here so these
// tests' source scenarios hold as written (esp. the sourceless low_no_prior case);
// the default-injection behavior is covered by cadDispatcher.blueprint-rag-tribal-default.test.ts.
process.env.PRISM_BPV_TRIBAL_CORPUS = join(TMP_DIR, "no-such-corpus.jsonl");

import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
// The REAL reader the writer must satisfy (repo-root .mjs; same cross-boundary
// import convention as AgentOverlay.test.ts -> scripts/lib/agent-overlay.mjs).
import {
  parseEventsBlob,
  applyEvents,
} from "../../../scripts/lib/blueprint-accuracy-consumer-lib.mjs";

function callCad(action: string, params: Record<string, unknown>) {
  let handler:
    | ((a: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>)
    | undefined;
  const server = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
  registerCadDispatcher(server as any);
  if (!handler) throw new Error("prism_cad handler was not registered");
  return handler({ action, params }).then((res) => JSON.parse(res.content[0].text));
}

function readLedgerRows(): string[] {
  if (!existsSync(EVENTS_FILE)) return [];
  return readFileSync(EVENTS_FILE, "utf8").split("\n").filter((l) => l.trim().length > 0);
}

const REQUEST = { pdfPath: "/test.pdf", page: 1, customer: "ALCOA" };
const HIGH_CONF_REGION = { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.85 };
const CORPUS_SOURCE = { corpus: [{ kind: "corpus", id: "c1", title: "ISO 1101", score: 0.9 }] };

describe("cadDispatcher blueprint_rag_extract -> canonical recordOutcome (U-BPA-RAG-RECORDOUTCOME)", () => {
  beforeEach(() => { if (existsSync(EVENTS_FILE)) rmSync(EVENTS_FILE); });
  afterAll(() => { rmSync(TMP_DIR, { recursive: true, force: true }); });

  it("happy: a successful extraction appends ONE outcome_record the real consumer routes (not unknown)", async () => {
    const r = await callCad("blueprint_rag_extract", {
      request: REQUEST,
      backendId: "test-backend",
      precomputedVisionRegions: [HIGH_CONF_REGION],
      precomputedSources: CORPUS_SOURCE,
    });
    expect(r.success).toBe(true);
    expect(typeof r.data?.extractionId).toBe("string");
    expect(r.data.extractionId.length).toBeGreaterThan(0);

    const rows = readLedgerRows();
    expect(rows.length).toBe(1);

    // Round-trip the appended row THROUGH the real reader.
    const { events, malformedCount } = parseEventsBlob(rows.join("\n"));
    expect(malformedCount).toBe(0);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("outcome_record");
    expect(events[0].payload?.kind).toBe("rag_extraction");
    expect(events[0].payload?.accurate).toBe(null);            // unconfirmed prediction
    expect(events[0].payload?.pdf_path).toBe("/test.pdf");
    // SAME extraction recorded as returned (slimResponse is lossless at L0).
    expect(events[0].payload?.extraction_id).toBe(r.data.extractionId);

    const applied = applyEvents({}, events);
    expect(applied.summary.processedCount).toBe(1);
    expect(applied.state.eventCounts.outcome_record).toBe(1);
    expect(applied.state.eventCounts.unknown).toBe(0);
    expect(applied.actions.some((a: { event_type: string }) => a.event_type === "outcome_record")).toBe(true);
  });

  it("floor-independence: a low-confidence, sourceless extraction still records an outcome_record", async () => {
    const r = await callCad("blueprint_rag_extract", {
      request: REQUEST,
      backendId: "test",
      // no precomputedSources -> sourceless allowed iff floor != normal (low_no_prior)
      precomputedVisionRegions: [{ regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.5 }],
    });
    expect(r.success).toBe(true);
    expect(r.data?.confidenceFloor).toBe("low_no_prior");

    const rows = readLedgerRows();
    expect(rows.length).toBe(1);
    const { events } = parseEventsBlob(rows.join("\n"));
    expect(events[0].type).toBe("outcome_record");
    expect(events[0].payload?.kind).toBe("rag_extraction");
    expect(applyEvents({}, events).state.eventCounts.unknown).toBe(0);
  });

  it("append-only invariant: two extractions append two distinct rows (never overwrite)", async () => {
    await callCad("blueprint_rag_extract", {
      request: REQUEST, backendId: "b1",
      precomputedVisionRegions: [HIGH_CONF_REGION], precomputedSources: CORPUS_SOURCE,
    });
    await callCad("blueprint_rag_extract", {
      request: { ...REQUEST, page: 2 }, backendId: "b2",
      precomputedVisionRegions: [HIGH_CONF_REGION], precomputedSources: CORPUS_SOURCE,
    });
    const rows = readLedgerRows();
    expect(rows.length).toBe(2);

    const { events, malformedCount } = parseEventsBlob(rows.join("\n"));
    expect(malformedCount).toBe(0);
    expect(events.length).toBe(2);
    expect(events[0].payload?.extraction_id).not.toBe(events[1].payload?.extraction_id);
    expect(applyEvents({}, events).state.eventCounts.outcome_record).toBe(2);
  });

  it("guard: missing precomputedVisionRegions -> error result + ZERO ledger pollution", async () => {
    const r = await callCad("blueprint_rag_extract", { request: REQUEST, backendId: "b1" });
    expect(r.success).not.toBe(true);
    expect(readLedgerRows().length).toBe(0);
  });

  it("guard: missing request -> error result + ZERO ledger pollution", async () => {
    const r = await callCad("blueprint_rag_extract", {
      backendId: "b1", precomputedVisionRegions: [HIGH_CONF_REGION],
    });
    expect(r.success).not.toBe(true);
    expect(readLedgerRows().length).toBe(0);
  });

  it("adversarial: our recorded row mixed with a foreign unknown-type row -> only ours routes", async () => {
    await callCad("blueprint_rag_extract", {
      request: REQUEST, backendId: "b1",
      precomputedVisionRegions: [HIGH_CONF_REGION], precomputedSources: CORPUS_SOURCE,
    });
    const ours = readLedgerRows();
    expect(ours.length).toBe(1);

    // Inject a foreign, well-formed-JSON but unknown-type row alongside ours.
    const blob = ours.join("\n") + "\n" + JSON.stringify({ type: "totally_unknown_kind", payload: { x: 1 } });
    const { events, malformedCount } = parseEventsBlob(blob);
    expect(malformedCount).toBe(0);
    expect(events.length).toBe(2);

    const applied = applyEvents({}, events);
    expect(applied.state.eventCounts.outcome_record).toBe(1);  // only ours routed
    expect(applied.state.eventCounts.unknown).toBe(1);         // the foreign row binned
    expect(applied.summary.processedCount).toBe(1);            // unknown is not "processed"
  });
});
