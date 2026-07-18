/**
 * U-BPA-RAG-TRIBAL-DEFAULT (slot:india) -- round-trip proof that
 * blueprint_rag_extract injects the blueprint-EXTRACTION tribal corpus BY DEFAULT
 * when the caller supplies no precomputedSources.tribal, and that a caller-supplied
 * tribal set OVERRIDES the default. Exercised THROUGH the prism_cad handler.
 *
 * Both env vars are redirected to temp: PRISM_BPV_TRIBAL_CORPUS (deterministic
 * fixture corpus the default loader reads) and PRISM_BPA_EVENTS_FILE (so the
 * recordOutcome IO wired into the same case does not pollute the real ledger).
 */
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "bpa-rag-tribal-"));
const CORPUS = join(TMP, "blueprint-vision-tribal-corpus.jsonl");
writeFileSync(CORPUS, [
  JSON.stringify({ id: "t1", slug: "verify-names", kind: "failure-mode", tip: "Verify engine names on disk." }),
  JSON.stringify({ id: "t2", slug: "split-ocr", kind: "process", tip: "Split a multi-print PDF before OCR." }),
  JSON.stringify({ id: "t3", slug: "conf-floor", kind: "convention", tip: "Per-field 0.70 confidence floor." }),
].join("\n") + "\n", "utf8");
process.env.PRISM_BPV_TRIBAL_CORPUS = CORPUS;
process.env.PRISM_BPA_EVENTS_FILE = join(TMP, "events.jsonl"); // isolate recordOutcome side-effect

import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

function callCad(action: string, params: Record<string, unknown>) {
  let handler:
    | ((a: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>)
    | undefined;
  const server = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
  registerCadDispatcher(server as any);
  if (!handler) throw new Error("prism_cad handler was not registered");
  return handler({ action, params }).then((res) => JSON.parse(res.content[0].text));
}

const REQUEST = { pdfPath: "/test.pdf", page: 1, customer: "ALCOA" };
const REGION = { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.85 };

describe("cadDispatcher blueprint_rag_extract -> default tribal injection (U-BPA-RAG-TRIBAL-DEFAULT)", () => {
  afterAll(() => { rmSync(TMP, { recursive: true, force: true }); });

  it("default: with NO precomputedSources.tribal, the extraction.sources include the corpus tribal tips", async () => {
    const r = await callCad("blueprint_rag_extract", {
      request: REQUEST,
      backendId: "test-backend",
      precomputedVisionRegions: [REGION],
      // no precomputedSources -> default tribal injection should fire
    });
    expect(r.success).toBe(true);
    const tribal = (r.data.sources as Array<{ kind: string; id: string; title: string }>).filter((s) => s.kind === "tribal");
    expect(tribal.length).toBe(3);
    const ids = tribal.map((s) => s.id).sort();
    expect(ids).toEqual(["t1", "t2", "t3"]);
    expect(tribal.every((s) => typeof s.title === "string" && s.title.length > 0)).toBe(true);
  });

  it("override: a caller-supplied precomputedSources.tribal wins; the default corpus is NOT injected", async () => {
    const r = await callCad("blueprint_rag_extract", {
      request: REQUEST,
      backendId: "test-backend",
      precomputedVisionRegions: [REGION],
      precomputedSources: { tribal: [{ kind: "tribal", id: "caller-1", title: "caller-supplied tip", score: 0.9 }] },
    });
    expect(r.success).toBe(true);
    const tribal = (r.data.sources as Array<{ kind: string; id: string }>).filter((s) => s.kind === "tribal");
    const ids = tribal.map((s) => s.id);
    expect(ids).toContain("caller-1");          // caller override present
    expect(ids).not.toContain("t1");            // default corpus NOT injected
    expect(ids).not.toContain("t2");
    expect(ids).not.toContain("t3");
  });

  it("default tribal sources carry valid RetrievedSource shape (kind tribal + non-empty title + score in [0,1])", async () => {
    const r = await callCad("blueprint_rag_extract", {
      request: REQUEST,
      backendId: "test-backend",
      precomputedVisionRegions: [REGION],
    });
    const tribal = (r.data.sources as Array<{ kind: string; id: string; title: string; score: number }>).filter((s) => s.kind === "tribal");
    expect(tribal.length).toBeGreaterThanOrEqual(1);
    for (const s of tribal) {
      expect(s.kind).toBe("tribal");
      expect(typeof s.id).toBe("string");
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    }
  });
});
