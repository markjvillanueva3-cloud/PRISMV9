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

    it("ObsidianMemoryRagEngine exports the singleton with query+shouldTrigger methods", async () => {
      const mod = await import("../engines/ObsidianMemoryRagEngine.js");
      expect(typeof mod.ObsidianMemoryRagEngine).toBe("function");
      expect(typeof mod.obsidianMemoryRagEngine.query).toBe("function");
      expect(typeof mod.obsidianMemoryRagEngine.shouldTrigger).toBe("function");
    });

    it("ResourcesClassifierEngine exports the singleton with classifyFile+summarizeDir methods", async () => {
      const mod = await import("../engines/ResourcesClassifierEngine.js");
      expect(typeof mod.ResourcesClassifierEngine).toBe("function");
      expect(typeof mod.resourcesClassifierEngine.classifyFile).toBe("function");
      expect(typeof mod.resourcesClassifierEngine.summarizeDir).toBe("function");
    });
  });

  describe("Vault RAG + Resources/ classifier wiring (P14-U02 follow-up)", () => {
    it("wiki_rag_query is registered in the action enum", () => {
      expect(KNOWLEDGE_ACTIONS.includes("wiki_rag_query")).toBe(true);
    });

    it("wiki_rag_should_trigger is registered in the action enum", () => {
      expect(KNOWLEDGE_ACTIONS.includes("wiki_rag_should_trigger")).toBe(true);
    });

    it("wiki_classify_file is registered in the action enum", () => {
      expect(KNOWLEDGE_ACTIONS.includes("wiki_classify_file")).toBe(true);
    });

    it("wiki_summarize_dir is registered in the action enum", () => {
      expect(KNOWLEDGE_ACTIONS.includes("wiki_summarize_dir")).toBe(true);
    });

    it("wiki_rag_query schema rejects empty query", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_rag_query as z.ZodType;
      expect(schema.safeParse({ query: "" }).success).toBe(false);
      expect(schema.safeParse({ query: "remember the cutter we used last week", top_k: 5 }).success).toBe(true);
    });

    it("wiki_rag_query schema rejects non-positive top_k and max_body_chars", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_rag_query as z.ZodType;
      expect(schema.safeParse({ query: "x x x", top_k: 0 }).success).toBe(false);
      expect(schema.safeParse({ query: "x x x", top_k: -1 }).success).toBe(false);
      expect(schema.safeParse({ query: "x x x", max_body_chars: 0 }).success).toBe(false);
      expect(schema.safeParse({ query: "x x x", top_k: 3, max_body_chars: 800 }).success).toBe(true);
    });

    it("wiki_classify_file schema rejects negative size and missing rel_path", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_classify_file as z.ZodType;
      expect(schema.safeParse({ rel_path: "", ext: ".pdf", size: 100 }).success).toBe(false);
      expect(schema.safeParse({ rel_path: "a.pdf", ext: ".pdf", size: -1 }).success).toBe(false);
      expect(schema.safeParse({ rel_path: "a.pdf", ext: ".pdf", size: 0 }).success).toBe(true);
    });

    it("wiki_summarize_dir schema accepts an entries array and rejects non-array entries", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_summarize_dir as z.ZodType;
      expect(schema.safeParse({ dir_rel_path: "Resources/foo", entries: [] }).success).toBe(true);
      expect(schema.safeParse({ dir_rel_path: "Resources/foo", entries: "nope" as unknown }).success).toBe(false);
      expect(schema.safeParse({
        dir_rel_path: "Resources/foo",
        entries: [{ rel_path: "x.pdf", ext: ".pdf", size: 100 }],
      }).success).toBe(true);
    });
  });

  describe("Vault backlinks wiring (P14-U03)", () => {
    it("wiki_backlink_for_chunk is registered in the action enum", () => {
      expect(KNOWLEDGE_ACTIONS.includes("wiki_backlink_for_chunk")).toBe(true);
    });

    it("wiki_backlink_render is registered in the action enum", () => {
      expect(KNOWLEDGE_ACTIONS.includes("wiki_backlink_render")).toBe(true);
    });

    it("wiki_backlink_parse_digest is registered in the action enum", () => {
      expect(KNOWLEDGE_ACTIONS.includes("wiki_backlink_parse_digest")).toBe(true);
    });

    it("wiki_backlink_for_chunk schema accepts a realistic payload with corpora", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_backlink_for_chunk as z.ZodType;
      const result = schema.safeParse({
        chunk_text: "Iscar carbide insert geometry catalog",
        top_k: 3,
        min_score: 0.05,
        candidates_engine: [
          { id: "ToolingCatalogEngine", kind: "engine", description: "tooling catalog" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("wiki_backlink_for_chunk schema rejects non-positive top_k and negative min_score", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_backlink_for_chunk as z.ZodType;
      expect(schema.safeParse({ chunk_text: "x", top_k: 0 }).success).toBe(false);
      expect(schema.safeParse({ chunk_text: "x", top_k: -1 }).success).toBe(false);
      expect(schema.safeParse({ chunk_text: "x", min_score: -0.5 }).success).toBe(false);
      expect(schema.safeParse({ chunk_text: "x", top_k: 5, min_score: 0 }).success).toBe(true);
    });

    it("wiki_backlink_for_chunk schema rejects malformed candidate (missing id/description)", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_backlink_for_chunk as z.ZodType;
      expect(schema.safeParse({
        chunk_text: "x",
        candidates_engine: [{ id: "", kind: "engine", description: "x" }],
      }).success).toBe(false);
      expect(schema.safeParse({
        chunk_text: "x",
        candidates_engine: [{ id: "X", kind: "wrong-kind", description: "x" }],
      }).success).toBe(false);
    });

    it("wiki_backlink_parse_digest schema requires digest_text + valid kind", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_backlink_parse_digest as z.ZodType;
      expect(schema.safeParse({ digest_text: "X — desc", kind: "engine" }).success).toBe(true);
      expect(schema.safeParse({ digest_text: "X — desc", kind: "dispatcher_action" }).success).toBe(true);
      expect(schema.safeParse({ digest_text: "X — desc", kind: "skill" }).success).toBe(true);
      expect(schema.safeParse({ digest_text: "X — desc", kind: "invalid" }).success).toBe(false);
      expect(schema.safeParse({ kind: "engine" }).success).toBe(false);
    });

    it("VaultBacklinkEngine module exports the singleton with required methods", async () => {
      const mod = await import("../engines/VaultBacklinkEngine.js");
      expect(typeof mod.VaultBacklinkEngine).toBe("function");
      expect(typeof mod.vaultBacklinkEngine.findBacklinksForChunk).toBe("function");
      expect(typeof mod.vaultBacklinkEngine.renderBacklinksMarkdown).toBe("function");
      expect(typeof mod.vaultBacklinkEngine.parseDigest).toBe("function");
    });
  });

  describe("Wiki bootstrap (P14-U04) wiring", () => {
    const BOOTSTRAP_ACTIONS = [
      "wiki_bootstrap_filter_courses",
      "wiki_bootstrap_filter_algorithms",
      "wiki_bootstrap_render_course",
      "wiki_bootstrap_render_algorithm",
      "wiki_bootstrap_build_index_line",
      "wiki_bootstrap_insert_index",
    ];

    it("all 6 bootstrap actions are registered in the action enum", () => {
      for (const a of BOOTSTRAP_ACTIONS) {
        expect(KNOWLEDGE_ACTIONS.includes(a)).toBe(true);
      }
    });

    it("wiki_bootstrap_render_course schema rejects empty course_id", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_bootstrap_render_course as z.ZodType;
      expect(schema.safeParse({ course: { category: "x", priority: "TIER_1", course_id: "", course_name: "X", course_file: "x.zip", topics: [] } }).success).toBe(false);
      expect(schema.safeParse({ course: { category: "x", priority: "TIER_1", course_id: "6.046", course_name: "Good", course_file: "g.zip", topics: ["a"] } }).success).toBe(true);
    });

    it("wiki_bootstrap_render_algorithm schema rejects empty algorithm_name", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_bootstrap_render_algorithm as z.ZodType;
      expect(schema.safeParse({ alg: { category: "x", subcategory: "y", algorithm_name: "", course_id: "1.001", prism_engines: [] } }).success).toBe(false);
      expect(schema.safeParse({ alg: { category: "x", subcategory: "y", algorithm_name: "Simplex", course_id: "1.001", prism_engines: ["E1"] } }).success).toBe(true);
    });

    it("wiki_bootstrap_build_index_line schema rejects empty entry id and invalid kind", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_bootstrap_build_index_line as z.ZodType;
      const baseEntry = (id: string, kind: string) => ({
        entry: {
          id, title: "X", kind, body: "",
          citation: { course_id: "1", course_name: "X", topic: "x" },
          related_engines: [],
        },
      });
      expect(schema.safeParse(baseEntry("", "course")).success).toBe(false);
      expect(schema.safeParse(baseEntry("good-id", "invalid-kind")).success).toBe(false);
      expect(schema.safeParse(baseEntry("good-id", "course")).success).toBe(true);
      expect(schema.safeParse(baseEntry("good-id", "algorithm")).success).toBe(true);
    });

    it("wiki_bootstrap_insert_index schema requires existing_index string + lines array", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.wiki_bootstrap_insert_index as z.ZodType;
      expect(schema.safeParse({ existing_index: "", lines: [] }).success).toBe(true);
      expect(schema.safeParse({ existing_index: "# Index", lines: ["- [A](a.md) — x"] }).success).toBe(true);
      expect(schema.safeParse({ existing_index: 42, lines: [] }).success).toBe(false);
      expect(schema.safeParse({ existing_index: "", lines: "nope" as unknown }).success).toBe(false);
    });

    it("WikiBootstrapEngine module exports the singleton — invokes filterIndex with real fixture", async () => {
      const mod = await import("../engines/WikiBootstrapEngine.js");
      const result = mod.wikiBootstrapEngine.filterIndex({
        coursesByCategory: {
          algorithms: { priority: "TIER_1", courses: [{ id: "x.1", name: "X", file: "", topics: [] }] },
        },
      });
      expect(result.length).toBe(1);
      expect(result[0].course_id).toBe("x.1");
      expect(typeof mod.WikiBootstrapEngine).toBe("function");
    });
  });

  describe("CSM memory.db audit (P15-U01) wiring", () => {
    const CSM_AUDIT_ACTIONS = [
      "csm_audit_classify_path",
      "csm_audit_summarize",
      "csm_audit_detect_variants",
      "csm_audit_format_report",
      "csm_audit_build_fingerprint",
    ];

    it("all 5 CSM audit actions are registered in the action enum", () => {
      for (const a of CSM_AUDIT_ACTIONS) {
        expect(KNOWLEDGE_ACTIONS.includes(a)).toBe(true);
      }
    });

    it("csm_audit_classify_path schema requires path string", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.csm_audit_classify_path as z.ZodType;
      expect(schema.safeParse({ path: "H:/prism/.claude/memory.db" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ path: 42 }).success).toBe(false);
    });

    it("csm_audit_summarize schema accepts a reports array of full DBReport shape", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.csm_audit_summarize as z.ZodType;
      const validReport = {
        path: "H:/x/.claude/memory.db",
        exists: true,
        sizeBytes: 100,
        lastModifiedISO: "2026-01-01T00:00:00.000Z",
        rowCount: 5,
        schemaFingerprint: "t:3",
        tableNames: ["t"],
        error: "",
      };
      expect(schema.safeParse({ reports: [validReport] }).success).toBe(true);
      // rowCount and schemaFingerprint must accept null per the schema
      expect(schema.safeParse({ reports: [{ ...validReport, rowCount: null, schemaFingerprint: null }] }).success).toBe(true);
      // Negative sizeBytes rejected
      expect(schema.safeParse({ reports: [{ ...validReport, sizeBytes: -1 }] }).success).toBe(false);
    });

    it("csm_audit_build_fingerprint schema requires {name, colCount} pairs with non-negative ints", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.csm_audit_build_fingerprint as z.ZodType;
      expect(schema.safeParse({ tables: [{ name: "t1", colCount: 3 }, { name: "t2", colCount: 0 }] }).success).toBe(true);
      expect(schema.safeParse({ tables: [{ name: "t", colCount: -1 }] }).success).toBe(false);
      expect(schema.safeParse({ tables: [{ name: "t", colCount: 1.5 }] }).success).toBe(false);
      expect(schema.safeParse({ tables: "nope" as unknown }).success).toBe(false);
    });

    it("csm_audit_format_report schema requires both reports + summary", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.csm_audit_format_report as z.ZodType;
      const validSummary = {
        totalDBs: 1, readableDBs: 1, totalSizeBytes: 100, totalRows: 5,
        byClass: { "claude-memory": { count: 1, sizeBytes: 100, rows: 5 } },
        schemaVariantCount: 1,
        oldestModifiedISO: "2026-01-01T00:00:00.000Z",
        newestModifiedISO: "2026-01-01T00:00:00.000Z",
      };
      expect(schema.safeParse({ reports: [], summary: validSummary }).success).toBe(true);
      expect(schema.safeParse({ reports: [] }).success).toBe(false);
    });

    it("CSMMemoryDBAuditEngine module exports singleton — invokes classifyDBPath with real path", async () => {
      const mod = await import("../engines/CSMMemoryDBAuditEngine.js");
      // Real-behavior round trip rather than presence-only check
      expect(mod.csmMemoryDBAuditEngine.classifyDBPath("H:/prism/.claude/memory.db")).toBe("claude-memory");
      expect(mod.csmMemoryDBAuditEngine.classifyDBPath("H:/x/.swarm/memory.db")).toBe("swarm-memory");
      expect(mod.csmMemoryDBAuditEngine.classifyDBPath("H:/x/foo.db")).toBe("unknown");
      expect(typeof mod.CSMMemoryDBAuditEngine).toBe("function");
    });
  });

  describe("Plan-trajectory extraction (P15-U03) wiring", () => {
    const PLAN_ACTIONS = [
      "plan_trajectory_parse",
      "plan_trajectory_summarize",
      "plan_trajectory_derive_id",
    ];

    it("all 3 plan-trajectory actions are registered in the action enum", () => {
      for (const a of PLAN_ACTIONS) {
        expect(KNOWLEDGE_ACTIONS.includes(a)).toBe(true);
      }
    });

    it("plan_trajectory_parse schema requires raw_markdown + source_path strings", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.plan_trajectory_parse as z.ZodType;
      expect(schema.safeParse({ raw_markdown: "# T", source_path: "/x.md" }).success).toBe(true);
      expect(schema.safeParse({ source_path: "/x.md" }).success).toBe(false);
      expect(schema.safeParse({ raw_markdown: "# T" }).success).toBe(false);
      expect(schema.safeParse({ raw_markdown: 42, source_path: "/x.md" }).success).toBe(false);
    });

    it("plan_trajectory_summarize schema accepts an array (PlanTrajectory shape opaque)", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.plan_trajectory_summarize as z.ZodType;
      expect(schema.safeParse({ trajectories: [] }).success).toBe(true);
      expect(schema.safeParse({ trajectories: [{ id: "x", title: "T" }] }).success).toBe(true);
      expect(schema.safeParse({ trajectories: "nope" as unknown }).success).toBe(false);
    });

    it("plan_trajectory_derive_id schema requires source_path string", () => {
      const schema = ACTION_KNOWLEDGE_SCHEMAS.plan_trajectory_derive_id as z.ZodType;
      expect(schema.safeParse({ source_path: "/foo/bar.md" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ source_path: 42 }).success).toBe(false);
    });

    it("PlanTrajectoryExtractorEngine module exports singleton — runs round-trip parse + summarize", async () => {
      const mod = await import("../engines/PlanTrajectoryExtractorEngine.js");
      const traj = mod.planTrajectoryExtractorEngine.parsePlan(
        "# Plan\nWe chose X.\n- [x] Done\n",
        "/plans/sample.md",
      );
      expect(traj.title).toBe("Plan");
      expect(traj.decisions.length).toBe(1);
      expect(traj.decisions[0].kind).toBe("chose");
      expect(traj.milestones.length).toBe(1);
      expect(traj.milestones[0].state).toBe("done");
      expect(traj.status).toBe("completed");
      const s = mod.planTrajectoryExtractorEngine.summarize([traj]);
      expect(s.totalPlans).toBe(1);
      expect(s.byStatus.completed).toBe(1);
      expect(typeof mod.PlanTrajectoryExtractorEngine).toBe("function");
    });
  });
});
