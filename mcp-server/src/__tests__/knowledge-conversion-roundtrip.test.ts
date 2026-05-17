/**
 * KNOWLEDGE-CONVERSION-MS0 / U-KC-B3 — round-trip wiring verification.
 *
 * The gap the operator caught: a JSON artifact being "pipeline-consumable"
 * (right shape) is not "pipeline-consumed" (a consumer reads it through the
 * production surface). U-KC-B1 + U-KC-B2 emit two artifacts into
 * cad-engine/knowledge_store/. This proves both are reachable THROUGH the
 * prism_knowledge MCP dispatcher's tribal_search action — not merely by
 * calling TribalKnowledgeEngine.search() directly.
 *
 * We capture the closure registerKnowledgeDispatcher(server) hands to
 * server.tool(...) and invoke it as the MCP runtime would, exercising: param
 * normalization, per-action Zod validation, the lazy import of
 * TribalKnowledgeEngine, search(), and the lazy loadDocumentLearnedTips()
 * reader (TribalKnowledgeEngine.ts:685-718) that reads BOTH artifacts off
 * disk. The server object is only the registration shim the real MCP runtime
 * also uses — the system-under-test (dispatcher handler + engine + on-disk
 * loader + artifacts) is fully real and unmocked.
 *
 * Robustness (closes per-file scrutiny Arm A P0-1/P0-2/P0-3):
 *  - P0-1: a beforeAll precondition asserts BOTH artifact files exist on disk
 *    and parse with >0 tips, FAILING LOUD and distinctly if an artifact is
 *    missing — so "artifact never written" can never masquerade as
 *    "search returned nothing".
 *  - P0-2: every course tip's title starts "MIT OCW " and every monolith tip
 *    carries a "monolith" tag BY CONSTRUCTION (verified invariants of the
 *    U-KC-B1/B2 converters). So a query for that token must surface EXACTLY
 *    the artifact's own tip count through the dispatcher — the expected count
 *    is derived from the artifact file itself, not hardcoded, and proves
 *    COMPLETE wiring (every tip reachable), not just "at least one".
 *  - P0-3: the primary wiring proof is the engine-GUARANTEED `doc:<docId>`
 *    tag (TribalKnowledgeEngine.ts:703 deterministically appends it on every
 *    doc-learned tip) plus the overridden `source: document:<docId>`. The
 *    converter-specific provenance tag is asserted as a secondary content
 *    contract, not the load-bearing wiring signal.
 *
 * Pinned engine reader contract: id TK-DL-<docId>-NNN, source overridden to
 * document:<docId>, tags get "document-learned" + doc:<docId>, confidence is
 * item.confidence || 70 (converter floor-at-1 defeats the 0->70 promote).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";

const COURSE_DOC_ID = "mit-ocw-course-tips";
const MONOLITH_DOC_ID = "monolith-data-lane-tips";

/**
 * Engine `search()` sorts by `confidence * log2(usage_count + 2)` then
 * `slice(0, input.limit)`. The doc-learned tip pool is ~7141 tips and the
 * static pool ~600. A limit > total-tips is provably truncation-proof so
 * exact-count reachability assertions cannot flake from low-confidence-tail
 * truncation (converter-floored confidence-1 tips rank lowest and would be
 * the first cut if the limit were tight).
 */
const TRUNCATION_PROOF_LIMIT = 10000;

// repo root: this file is mcp-server/src/__tests__/, artifacts in cad-engine/knowledge_store/
const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../../../..");
const COURSE_FILE = resolve(REPO_ROOT, "cad-engine/knowledge_store", `${COURSE_DOC_ID}.json`);
const MONO_FILE = resolve(REPO_ROOT, "cad-engine/knowledge_store", `${MONOLITH_DOC_ID}.json`);

type ToolHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content?: Array<{ type: string; text: string }>;
  [k: string]: unknown;
}>;

interface RegistrationShim {
  tool(name: string, desc: string, schema: Record<string, unknown>, fn: ToolHandler): void;
}

function captureHandler(): { handler: ToolHandler; schema: Record<string, unknown> } {
  let captured: { handler: ToolHandler; schema: Record<string, unknown> } | null = null;
  const shim: RegistrationShim = {
    tool(name, _desc, schema, fn) {
      if (name === "prism_knowledge") captured = { handler: fn, schema };
    },
  };
  registerKnowledgeDispatcher(shim as unknown as Parameters<typeof registerKnowledgeDispatcher>[0]);
  if (!captured) throw new Error("registerKnowledgeDispatcher did not register prism_knowledge");
  return captured;
}

async function tribalSearch(
  handler: ToolHandler,
  params: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const resp = await handler({ action: "tribal_search", params });
  expect(Array.isArray(resp.content)).toBe(true);
  expect(resp.content![0]?.type).toBe("text");
  const parsed = JSON.parse(resp.content![0].text);
  expect(Array.isArray(parsed)).toBe(true);
  return parsed;
}

/** Read an artifact's own tip count — the expected reachable count is derived
 *  from the artifact itself, never hardcoded (P0-2). */
function artifactTipCount(file: string, label: string): number {
  expect(existsSync(file), `${label} artifact MUST exist on disk: ${file}`).toBe(true);
  const raw = JSON.parse(readFileSync(file, "utf8"));
  expect(Array.isArray(raw.tips), `${label} artifact must have a tips[] array`).toBe(true);
  expect(raw.tips.length).toBeGreaterThan(0);
  return raw.tips.length;
}

describe("KNOWLEDGE-CONVERSION-MS0 U-KC-B3 — round-trip through prism_knowledge:tribal_search", () => {
  let handler: ToolHandler;
  let schema: Record<string, unknown>;
  let courseArtifactCount = 0;
  let monoArtifactCount = 0;

  beforeAll(() => {
    // P0-1 precondition: both artifacts MUST exist on disk and parse. If an
    // artifact was never written/was deleted, this fails LOUD here — distinct
    // from a search miss in a later test.
    courseArtifactCount = artifactTipCount(COURSE_FILE, "U-KC-B1 course-tips");
    monoArtifactCount = artifactTipCount(MONO_FILE, "U-KC-B2 monolith-data-lane");
    const cap = captureHandler();
    handler = cap.handler;
    schema = cap.schema;
  });

  it("registers prism_knowledge with tribal_search in its Zod action enum", () => {
    const actionEnum = schema.action as { _def?: { values?: string[] }; options?: string[] };
    const opts: string[] = actionEnum?._def?.values ?? actionEnum?.options ?? [];
    expect(opts.length).toBeGreaterThan(5);
    expect(opts).toContain("tribal_search");
    expect(opts).toContain("tribal_stats");
  });

  it("course-tips artifact (U-KC-B1): EVERY tip reachable through the dispatcher", async () => {
    // Every course tip title starts "MIT OCW " (U-KC-B1 invariant), so a
    // query for that token must surface EXACTLY the artifact's tip count.
    // The engine sorts by confidence*log2(usage_count+2) then slice(0,limit);
    // TRUNCATION_PROOF_LIMIT is provably > total tips (~7141 doc + ~600 static),
    // so the exact-count assertion cannot flake from confidence-1 tail truncation.
    const tips = await tribalSearch(handler, { query: "MIT OCW", limit: TRUNCATION_PROOF_LIMIT });
    const courseTips = tips.filter((t) => t.source === `document:${COURSE_DOC_ID}`);
    expect(courseTips.length).toBe(courseArtifactCount); // COMPLETE wiring, not "≥1"
    const sample = courseTips[0];
    // Primary wiring proof: engine-guaranteed reader contract.
    expect(sample.id as string).toMatch(/^TK-DL-mit-ocw-course-tips-\d{3}$/);
    expect(sample.source).toBe(`document:${COURSE_DOC_ID}`);
    expect(sample.tags as string[]).toContain(`doc:${COURSE_DOC_ID}`);
    expect(sample.tags as string[]).toContain("document-learned");
    // Secondary content contract (U-KC-B1).
    expect(typeof sample.title).toBe("string");
    expect((sample.title as string).startsWith("MIT OCW ")).toBe(true);
    expect(sample.tags as string[]).toContain("mit-ocw");
    expect((sample.body as string).length).toBeGreaterThan(0);
  });

  it("monolith-data-lane artifact (U-KC-B2): EVERY tip reachable through the dispatcher", async () => {
    // Every monolith tip carries a "monolith" tag (U-KC-B2 invariant).
    const tips = await tribalSearch(handler, { query: "monolith", limit: TRUNCATION_PROOF_LIMIT });
    const monoTips = tips.filter((t) => t.source === `document:${MONOLITH_DOC_ID}`);
    expect(monoTips.length).toBe(monoArtifactCount); // COMPLETE wiring
    const sample = monoTips[0];
    // Primary wiring proof: engine-guaranteed reader contract (P0-3).
    expect(sample.id as string).toMatch(/^TK-DL-monolith-data-lane-tips-\d{3}$/);
    expect(sample.source).toBe(`document:${MONOLITH_DOC_ID}`);
    expect(sample.tags as string[]).toContain(`doc:${MONOLITH_DOC_ID}`);
    expect(sample.tags as string[]).toContain("document-learned");
    // Secondary content contract (U-KC-B2): body names the legacy module and
    // a converter provenance tag survives the engine source-override. Asserted
    // across ALL monolith tips so a fragile single-sample pattern can't pass.
    for (const t of monoTips) {
      expect(t.body as string).toMatch(/Legacy monolith data-lane module/);
      expect((t.tags as string[]).some((x) => x.startsWith("monolith:PRISM_"))).toBe(true);
    }
  });

  it("BOTH artifacts coexist in ONE engine instance (the actual wiring gap)", async () => {
    const course = await tribalSearch(handler, { query: "MIT OCW", limit: TRUNCATION_PROOF_LIMIT });
    const mono = await tribalSearch(handler, { query: "monolith", limit: TRUNCATION_PROOF_LIMIT });
    const courseCount = course.filter((t) => t.source === `document:${COURSE_DOC_ID}`).length;
    const monoCount = mono.filter((t) => t.source === `document:${MONOLITH_DOC_ID}`).length;
    expect(courseCount).toBe(courseArtifactCount);
    expect(monoCount).toBe(monoArtifactCount);
  });

  it("confidence floor (1) survives the engine's `confidence || 70` falsy-promote", async () => {
    const tips = await tribalSearch(handler, { query: "monolith", limit: TRUNCATION_PROOF_LIMIT });
    const docTips = tips.filter((t) => t.source === `document:${MONOLITH_DOC_ID}`);
    expect(docTips.length).toBe(monoArtifactCount);
    for (const t of docTips) {
      expect(typeof t.confidence).toBe("number");
      expect(t.confidence as number).toBeGreaterThanOrEqual(1);
      expect(t.confidence as number).toBeLessThanOrEqual(100);
    }
    // Live ledger has score-0 modules → converter floors them to 1. If ANY tip
    // reads confidence 1, the floor round-tripped (a raw 0 would have been
    // promoted to 70 by the engine reader and could never appear as 1).
    const floored = docTips.filter((t) => t.confidence === 1);
    expect(floored.length).toBeGreaterThan(0);
  });

  it("negative control: a nonsense query returns NO doc-learned tips (search actually filters)", async () => {
    const tips = await tribalSearch(handler, {
      query: "zzzqqq_nonexistent_token_9f3e7a1b_xyzzy",
      limit: 400,
    });
    const docHits = tips.filter(
      (t) =>
        t.source === `document:${COURSE_DOC_ID}` ||
        t.source === `document:${MONOLITH_DOC_ID}`,
    );
    expect(docHits.length).toBe(0);
  });

  it("snake_case min_confidence is honored through the dispatcher normalization+validation layer", async () => {
    const all = await tribalSearch(handler, { query: "monolith", limit: TRUNCATION_PROOF_LIMIT });
    const allDoc = all.filter((t) => t.source === `document:${MONOLITH_DOC_ID}`);
    const gated = await tribalSearch(handler, { query: "monolith", limit: TRUNCATION_PROOF_LIMIT, min_confidence: 95 });
    const gatedDoc = gated.filter((t) => t.source === `document:${MONOLITH_DOC_ID}`);
    expect(allDoc.length).toBe(monoArtifactCount);
    // The floored confidence-1 tips MUST be pruned by a 95 threshold.
    expect(gatedDoc.length).toBeLessThan(allDoc.length);
    for (const t of gatedDoc) expect(t.confidence as number).toBeGreaterThanOrEqual(95);
  });

  it("an out-of-schema numeric query does not leak doc-learned tips (surface is gated)", async () => {
    // The dispatcher runs Zod validation before the engine. A numeric query
    // (schema demands string) must NOT round-trip into a successful search that
    // surfaces doc-learned tips — reject OR zero tips, never a crash and never
    // an unvalidated pass-through.
    const resp = await handler({ action: "tribal_search", params: { query: 12345 } });
    const text = resp.content?.[0]?.text;
    expect(typeof text).toBe("string");
    const parsed = JSON.parse(text as string);
    const arr = Array.isArray(parsed) ? parsed : [];
    const leaked = arr.filter(
      (t: Record<string, unknown>) =>
        t.source === `document:${COURSE_DOC_ID}` ||
        t.source === `document:${MONOLITH_DOC_ID}`,
    );
    expect(leaked.length).toBe(0);
  });
});
