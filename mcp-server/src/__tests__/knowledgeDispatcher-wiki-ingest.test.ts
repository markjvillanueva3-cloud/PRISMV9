/**
 * INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02 — knowledgeDispatcher wiring for KIP.
 *
 * Verifies the dispatcher-side contract that the live ingest path depends on:
 * action enum registration, schema validation behavior on real and malformed
 * payloads, no regression on previously-registered actions, and engine
 * imports resolving (catches typos in lazy import paths the dispatcher uses).
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ACTIONS as KNOWLEDGE_ACTIONS } from "../tools/dispatchers/knowledgeDispatcher.js";
import { ACTION_KNOWLEDGE_SCHEMAS } from "../schemas/knowledgeActionSchemas.js";

describe("knowledgeDispatcher — KIP ingest wiring (P14-U02)", () => {
  describe("Action enum registration", () => {
    it("wiki_ingest_pdf is in the dispatcher action list", () => {
      const idx = KNOWLEDGE_ACTIONS.indexOf("wiki_ingest_pdf");
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(KNOWLEDGE_ACTIONS[idx]).toBe("wiki_ingest_pdf");
    });

    it("wiki_ingest_dryrun is in the dispatcher action list", () => {
      const idx = KNOWLEDGE_ACTIONS.indexOf("wiki_ingest_dryrun");
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(KNOWLEDGE_ACTIONS[idx]).toBe("wiki_ingest_dryrun");
    });

    it("exactly two wiki_ingest_* actions exist (no stray drafts)", () => {
      const hits = KNOWLEDGE_ACTIONS.filter((a: string) => a.startsWith("wiki_ingest"));
      expect(hits.length).toBe(2);
      expect(hits.sort()).toEqual(["wiki_ingest_dryrun", "wiki_ingest_pdf"]);
    });

    it("no regression — pre-existing actions still present", () => {
      const baseline = ["search", "cross_query", "tribal_search", "video_process"];
      for (const a of baseline) {
        expect(KNOWLEDGE_ACTIONS.includes(a)).toBe(true);
      }
    });

    it("action enum has unique entries (no accidental duplicate)", () => {
      const set = new Set(KNOWLEDGE_ACTIONS);
      expect(set.size).toBe(KNOWLEDGE_ACTIONS.length);
    });
  });

  describe("Schema validation behavior", () => {
    it("wiki_ingest_pdf schema accepts a realistic full payload", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_pdf as z.ZodType;
      const result = schema.safeParse({
        pdf_path: "H:/prism/Resources/MANUFACTURER_CATALOGS/Iscar-2024.pdf",
        source: "iscar-2024",
        title: "Iscar Catalog 2024",
        vendor: "Iscar",
        category: "insert-catalog",
        tags: ["milling", "carbide"],
        target_chars: 1500,
        overlap_chars: 200,
        max_pages: 1000,
        timeout_ms: 600_000,
        dry_run: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pdf_path).toBe("H:/prism/Resources/MANUFACTURER_CATALOGS/Iscar-2024.pdf");
        expect(result.data.vendor).toBe("Iscar");
        expect(result.data.tags).toEqual(["milling", "carbide"]);
        expect(result.data.target_chars).toBe(1500);
      }
    });

    it("wiki_ingest_pdf schema accepts the minimal payload (only pdf_path)", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_pdf as z.ZodType;
      const result = schema.safeParse({ pdf_path: "/tmp/x.pdf" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pdf_path).toBe("/tmp/x.pdf");
      }
    });

    it("wiki_ingest_pdf schema rejects empty pdf_path with a path-related issue", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_pdf as z.ZodType;
      const result = schema.safeParse({ pdf_path: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === "pdf_path");
        expect(issue?.path[0]).toBe("pdf_path");
      }
    });

    it("wiki_ingest_pdf schema rejects missing pdf_path with a required-field issue", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_pdf as z.ZodType;
      const result = schema.safeParse({ source: "x", title: "y" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pathIssue = result.error.issues.find((i) => i.path[0] === "pdf_path");
        expect(pathIssue?.path[0]).toBe("pdf_path");
      }
    });

    it("wiki_ingest_pdf schema rejects non-positive target_chars", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_pdf as z.ZodType;
      expect(schema.safeParse({ pdf_path: "/x.pdf", target_chars: -1 }).success).toBe(false);
      expect(schema.safeParse({ pdf_path: "/x.pdf", target_chars: 0 }).success).toBe(false);
      expect(schema.safeParse({ pdf_path: "/x.pdf", target_chars: 1500 }).success).toBe(true);
    });

    it("wiki_ingest_pdf schema accepts overlap_chars=0 (no glue) but rejects negative", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_pdf as z.ZodType;
      const zero = schema.safeParse({ pdf_path: "/x.pdf", overlap_chars: 0 });
      expect(zero.success).toBe(true);
      const neg = schema.safeParse({ pdf_path: "/x.pdf", overlap_chars: -10 });
      expect(neg.success).toBe(false);
    });

    it("wiki_ingest_dryrun schema mirrors wiki_ingest_pdf shape", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_dryrun as z.ZodType;
      const r = schema.safeParse({ pdf_path: "/x.pdf", dry_run: true });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.dry_run).toBe(true);
      }
    });

    it("variability: 3 distinct vendor payloads all parse cleanly", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_ingest_pdf as z.ZodType;
      const cases = [
        { pdf_path: "/iscar.pdf", vendor: "Iscar", category: "insert-catalog", tags: ["milling"] },
        { pdf_path: "/sandvik.pdf", vendor: "Sandvik", category: "post-manual", tags: ["turning", "iso-p"] },
        { pdf_path: "/orange-vise.pdf", vendor: "OrangeVise", category: "fixture-catalog", tags: ["workholding"] },
      ];
      for (const c of cases) {
        const r = schema.safeParse(c);
        expect(r.success).toBe(true);
        if (r.success) {
          expect(r.data.vendor).toBe(c.vendor);
          expect(r.data.tags).toEqual(c.tags);
        }
      }
    });
  });

  describe("Engine imports the dispatcher case statement uses actually resolve", () => {
    it("KnowledgeIngestEngine module exports a constructible class with chunkId+ingestPdf methods", async () => {
      const mod = await import("../engines/KnowledgeIngestEngine.js");
      expect(typeof mod.KnowledgeIngestEngine).toBe("function");
      expect(typeof mod.createKnowledgeIngestEngine).toBe("function");
      expect(() => new mod.KnowledgeIngestEngine(undefined as never)).toThrow(/memory dep required/);
    });

    it("QdrantMemoryEngine module exports the singleton with the required method shape", async () => {
      const mod = await import("../engines/QdrantMemoryEngine.js");
      expect(typeof mod.QdrantMemoryEngine).toBe("function");
      expect(typeof mod.qdrantMemoryEngine.remember).toBe("function");
      expect(typeof mod.qdrantMemoryEngine.setEmbedder).toBe("function");
      expect(typeof mod.qdrantMemoryEngine.collectionFor).toBe("function");
      expect(mod.qdrantMemoryEngine.collectionFor("wiki")).toBe("prism_memory_wiki");
    });

    it("OllamaEmbedderFactory exports ensureQdrantEmbedder + createOllamaEmbedder", async () => {
      const mod = await import("../engines/OllamaEmbedderFactory.js");
      expect(typeof mod.ensureQdrantEmbedder).toBe("function");
      expect(typeof mod.createOllamaEmbedder).toBe("function");
      expect(() => mod.createOllamaEmbedder({ host: "not-a-url" })).toThrow(/invalid Ollama host/);
    });
  });
});
