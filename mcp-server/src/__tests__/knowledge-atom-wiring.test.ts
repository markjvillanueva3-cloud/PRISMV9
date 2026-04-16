/**
 * knowledge-atom-wiring.test.ts — KAR-MS0 U-KAR04
 * Tests for KnowledgeAtom, WiringManifest, and KnowledgeLineageEngine
 *
 * Coverage targets:
 * - KnowledgeAtom: schema validation, adapters, batch operations
 * - WiringManifest: schema validation, consumer resolution, conflict detection
 * - KnowledgeLineageEngine: lineage tracking, version history, conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  KnowledgeAtom,
  KnowledgeAtomSchema,
  validateAtom,
  parseAtom,
  safeParseAtom,
  normalizeConfidence,
  mapConfidenceString,
  generateAtomId,
  fromKnowledgeTip,
  fromExtractedTip,
  fromKnowledgeEntry,
  fromKnowledgeBaseEntry,
  createAtom,
  validateAtomBatch,
  deduplicateAtoms,
  AUTHORITY_RANK,
} from "../types/KnowledgeAtom.js";

import {
  WiringManifest,
  WiringManifestSchema,
  validateManifest,
  parseManifest,
  findConsumers,
  findWiringRules,
  resolveTargets,
  detectConflicts,
  createDefaultManifest,
} from "../schemas/WiringManifest.js";

import {
  KnowledgeLineageEngine,
  LineageGraph,
} from "../engines/KnowledgeLineageEngine.js";

// ============================================================================
// Test Fixtures
// ============================================================================

const VALID_ATOM: KnowledgeAtom = {
  id: "atom-test-001",
  title: "Kienzle Force Calculation Tip",
  content: "For aluminum face milling, use kc1.1 = 700-800 N/mm² with mc = 0.25",
  type: "tip",
  category: "milling",
  subcategory: "face_milling",
  tags: ["aluminum", "kienzle", "milling"],
  confidence: 0.85,
  source: {
    path: "resources/handbooks/machinery-handbook-31.pdf",
    sourceType: "pdf",
    category: "handbook",
    authority: "handbook",
    authorityRank: 7,
    extractionMethod: "pdf_table_extraction",
    location: "page 1023",
    citation: "Machinery's Handbook 31st Ed., p.1023",
  },
  targets: [
    {
      engine: "SpeedFeedOrchestratorEngine",
      action: "updateFormulaRegistry",
      dataType: "formula",
      priority: 1,
      wired: false,
    },
  ],
  extractedAt: "2026-04-13T12:00:00.000Z",
  usageCount: 0,
  version: 1,
  materialGroups: ["N"],
  operationTypes: ["face_milling"],
};

const VALID_TIP = {
  id: "tip-001",
  title: "Graphite Electrode Roughing",
  body: "Use 0.010\" chipload for graphite roughing, keep RPM under 15000 to prevent dust cloud",
  category: "sinker_edm",
  subcategory: "electrode_milling",
  tags: ["graphite", "electrode", "roughing"],
  confidence: 85,
  source: "operator:john_doe",
  created_at: "2026-04-01T10:00:00.000Z",
  usage_count: 12,
  material_groups: ["graphite"],
  operation_types: ["roughing"],
  auto_tags: ["dust_extraction", "tool_wear"],
};

const VALID_KNOWLEDGE_ENTRY = {
  knowledge_id: "ke-001",
  source: "apprentice-session-42",
  material: "D2",
  topic: "hardened_steel_turning",
  insight: "Reduce DOC by 50% when turning hardened D2 (>58 HRC) to prevent tool chipping",
  formalized_rule: "IF material.hardness > 58 AND material.type == 'D2' THEN doc_factor = 0.5",
  physics_validation: "validated_by_force_calculation",
  confidence: "high" as const,
  timestamp: "2026-04-10T15:30:00.000Z",
};

// ============================================================================
// KnowledgeAtom Tests
// ============================================================================

describe("KnowledgeAtom Schema", () => {
  describe("Validation", () => {
    it("should validate a correct KnowledgeAtom", () => {
      const result = validateAtom(VALID_ATOM);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject atom with missing required fields", () => {
      const invalid = { id: "test", title: "Test" };
      const result = validateAtom(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject atom with invalid confidence (>1)", () => {
      const invalid = { ...VALID_ATOM, confidence: 1.5 };
      const result = validateAtom(invalid);
      expect(result.valid).toBe(false);
    });

    it("should reject atom with invalid confidence (<0)", () => {
      const invalid = { ...VALID_ATOM, confidence: -0.1 };
      const result = validateAtom(invalid);
      expect(result.valid).toBe(false);
    });

    it("should reject atom with invalid knowledge type", () => {
      const invalid = { ...VALID_ATOM, type: "invalid_type" };
      const result = validateAtom(invalid);
      expect(result.valid).toBe(false);
    });

    it("should reject atom with invalid authority level", () => {
      const invalid = {
        ...VALID_ATOM,
        source: { ...VALID_ATOM.source, authority: "invalid_authority" },
      };
      const result = validateAtom(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe("Parsing", () => {
    it("should parse valid atom without throwing", () => {
      expect(() => parseAtom(VALID_ATOM)).not.toThrow();
    });

    it("should throw on invalid atom", () => {
      expect(() => parseAtom({ id: "test" })).toThrow();
    });

    it("should return null for invalid atom in safeParseAtom", () => {
      expect(safeParseAtom({ id: "test" })).toBeNull();
    });

    it("should return atom for valid data in safeParseAtom", () => {
      const result = safeParseAtom(VALID_ATOM);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(VALID_ATOM.id);
    });
  });

  describe("Confidence Normalization", () => {
    it("should normalize 0-100 scale to 0-1", () => {
      expect(normalizeConfidence(85)).toBe(0.85);
      expect(normalizeConfidence(100)).toBe(1);
      expect(normalizeConfidence(0)).toBe(0);
    });

    it("should clamp values already in 0-1 range", () => {
      expect(normalizeConfidence(0.85)).toBe(0.85);
      expect(normalizeConfidence(1)).toBe(1);
    });

    it("should handle edge cases", () => {
      expect(normalizeConfidence(150)).toBe(1); // Clamped
      expect(normalizeConfidence(-10)).toBe(0); // Clamped
    });

    it("should map string confidence to numeric", () => {
      expect(mapConfidenceString("high")).toBe(0.9);
      expect(mapConfidenceString("medium")).toBe(0.7);
      expect(mapConfidenceString("low")).toBe(0.5);
      expect(mapConfidenceString("unknown")).toBe(0.5);
    });
  });

  describe("ID Generation", () => {
    it("should generate deterministic IDs", () => {
      const id1 = generateAtomId("source.pdf", "content text");
      const id2 = generateAtomId("source.pdf", "content text");
      expect(id1).toBe(id2);
    });

    it("should generate different IDs for different inputs", () => {
      const id1 = generateAtomId("source1.pdf", "content");
      const id2 = generateAtomId("source2.pdf", "content");
      expect(id1).not.toBe(id2);
    });

    it("should prefix IDs with 'atom-'", () => {
      const id = generateAtomId("source.pdf", "content");
      expect(id.startsWith("atom-")).toBe(true);
    });
  });

  describe("Adapters", () => {
    it("should convert KnowledgeTip to KnowledgeAtom", () => {
      const atom = fromKnowledgeTip(VALID_TIP);

      expect(atom.id).toBe(VALID_TIP.id);
      expect(atom.title).toBe(VALID_TIP.title);
      expect(atom.content).toBe(VALID_TIP.body);
      expect(atom.type).toBe("tip");
      expect(atom.confidence).toBe(0.85); // Normalized from 85
      expect(atom.source.sourceType).toBe("tribal");
      expect(atom.source.authority).toBe("operator");
    });

    it("should convert ExtractedTip to KnowledgeAtom", () => {
      const tip = {
        title: "Extracted Tip",
        body: "Tip content",
        category: "milling",
        tags: ["test"],
        confidence: 75,
        source: "video-transcript-001",
      };
      const atom = fromExtractedTip(tip);

      expect(atom.title).toBe(tip.title);
      expect(atom.content).toBe(tip.body);
      expect(atom.confidence).toBe(0.75);
      expect(atom.id).toMatch(/^atom-/);
    });

    it("should convert KnowledgeEntry to KnowledgeAtom", () => {
      const atom = fromKnowledgeEntry(VALID_KNOWLEDGE_ENTRY);

      expect(atom.id).toBe(VALID_KNOWLEDGE_ENTRY.knowledge_id);
      expect(atom.title).toBe(VALID_KNOWLEDGE_ENTRY.topic);
      expect(atom.content).toBe(VALID_KNOWLEDGE_ENTRY.insight);
      expect(atom.confidence).toBe(0.9); // "high" maps to 0.9
      expect(atom.source.authority).toBe("expert");
      expect(atom.payload?.formalizedRule).toBe(VALID_KNOWLEDGE_ENTRY.formalized_rule);
    });

    it("should convert KnowledgeBaseEntry to KnowledgeAtom", () => {
      const entry = {
        id: "kb-001",
        name: "Machinery's Handbook",
        topic: "cutting_data",
        description: "Comprehensive cutting data reference",
        source_file: "machinery-handbook.json",
        entry_count: 5000,
        query_types: ["speed_feed", "material"],
        sections: ["chapter1", "chapter2"],
        keywords: ["cutting", "machining", "data"],
      };
      const atom = fromKnowledgeBaseEntry(entry);

      expect(atom.id).toBe(entry.id);
      expect(atom.title).toBe(entry.name);
      expect(atom.source.authority).toBe("handbook");
      expect(atom.payload?.entryCount).toBe(5000);
    });
  });

  describe("Factory Functions", () => {
    it("should create atom with defaults", () => {
      const atom = createAtom({
        title: "Test Atom",
        content: "Test content",
        type: "tip",
        category: "milling",
        sourcePath: "test.pdf",
        sourceType: "pdf",
        authority: "handbook",
      });

      expect(atom.id).toMatch(/^atom-/);
      expect(atom.confidence).toBe(0.7); // Default
      expect(atom.usageCount).toBe(0);
      expect(atom.version).toBe(1);
    });

    it("should create atom with provided confidence", () => {
      const atom = createAtom({
        title: "Test",
        content: "Content",
        type: "formula",
        category: "physics",
        sourcePath: "paper.pdf",
        sourceType: "academic",
        authority: "academic",
        confidence: 0.95,
      });

      expect(atom.confidence).toBe(0.95);
    });
  });

  describe("Batch Operations", () => {
    it("should validate batch of atoms", () => {
      const atoms = [
        VALID_ATOM,
        { ...VALID_ATOM, id: "atom-002" },
        { id: "invalid" }, // Invalid
      ];

      const result = validateAtomBatch(atoms);

      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].index).toBe(2);
    });

    it("should deduplicate atoms by ID", () => {
      const atoms: KnowledgeAtom[] = [
        { ...VALID_ATOM, confidence: 0.8 },
        { ...VALID_ATOM, confidence: 0.9 }, // Same ID, higher confidence
        { ...VALID_ATOM, id: "atom-002", confidence: 0.7 },
      ];

      const deduped = deduplicateAtoms(atoms);

      expect(deduped.length).toBe(2);
      const kept = deduped.find((a) => a.id === VALID_ATOM.id);
      expect(kept?.confidence).toBe(0.9); // Higher confidence kept
    });
  });

  describe("Authority Ranking", () => {
    it("should have correct authority ranks", () => {
      expect(AUTHORITY_RANK.canonical).toBe(10);
      expect(AUTHORITY_RANK.manufacturer).toBe(9);
      expect(AUTHORITY_RANK.academic).toBe(8);
      expect(AUTHORITY_RANK.handbook).toBe(7);
      expect(AUTHORITY_RANK.expert).toBe(6);
      expect(AUTHORITY_RANK.proven).toBe(5);
      expect(AUTHORITY_RANK.operator).toBe(4);
      expect(AUTHORITY_RANK.inferred).toBe(3);
      expect(AUTHORITY_RANK.social).toBe(2);
      expect(AUTHORITY_RANK.unknown).toBe(1);
    });
  });
});

// ============================================================================
// WiringManifest Tests
// ============================================================================

describe("WiringManifest Schema", () => {
  let defaultManifest: WiringManifest;

  beforeEach(() => {
    defaultManifest = createDefaultManifest();
  });

  describe("Validation", () => {
    it("should validate default manifest", () => {
      const result = validateManifest(defaultManifest);
      expect(result.valid).toBe(true);
    });

    it("should reject manifest with missing required fields", () => {
      const result = validateManifest({ schemaVersion: "1.0.0" });
      expect(result.valid).toBe(false);
    });

    it("should reject invalid priority level", () => {
      const invalid = {
        ...defaultManifest,
        wiring_rules: [
          {
            ...defaultManifest.wiring_rules[0],
            targets: [{ consumer_id: "test", priority: "4" }], // Invalid priority
          },
        ],
      };
      const result = validateManifest(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe("Consumer Resolution", () => {
    it("should find consumers by knowledge type and domain", () => {
      const consumers = findConsumers(defaultManifest, "tip", "milling");

      expect(consumers.length).toBeGreaterThan(0);
      expect(consumers[0].accepts).toContain("tip");
    });

    it("should include general domain consumers", () => {
      const consumers = findConsumers(defaultManifest, "formula", "custom_domain");

      // Should still find general-domain consumers
      const hasGeneral = consumers.some((c) => c.domains.includes("general"));
      expect(hasGeneral).toBe(true);
    });

    it("should sort consumers by priority (highest first)", () => {
      const consumers = findConsumers(defaultManifest, "tip", "general");

      for (let i = 1; i < consumers.length; i++) {
        expect(consumers[i - 1].priority).toBeGreaterThanOrEqual(consumers[i].priority);
      }
    });

    it("should filter out disabled consumers", () => {
      const manifest = {
        ...defaultManifest,
        consumers: defaultManifest.consumers.map((c) =>
          c.id === "tribal-knowledge-engine" ? { ...c, enabled: false } : c
        ),
      };

      const consumers = findConsumers(manifest, "tip", "milling");
      const hasTribal = consumers.some((c) => c.id === "tribal-knowledge-engine");
      expect(hasTribal).toBe(false);
    });
  });

  describe("Wiring Rules", () => {
    it("should find rules for source category", () => {
      const rules = findWiringRules(defaultManifest, "handbook");

      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].source_category).toBe("handbook");
    });

    it("should return empty for unknown category", () => {
      const rules = findWiringRules(defaultManifest, "unknown");
      expect(rules.length).toBe(0);
    });
  });

  describe("Target Resolution", () => {
    it("should resolve targets for source/type/domain", () => {
      const targets = resolveTargets(defaultManifest, "handbook", "formula", "general");

      expect(targets.length).toBeGreaterThan(0);
      expect(targets[0].consumer).toBeDefined();
      expect(targets[0].priority).toBeDefined();
    });

    it("should sort targets by priority (1 first)", () => {
      const targets = resolveTargets(defaultManifest, "tool_catalog", "tool", "general");

      for (let i = 1; i < targets.length; i++) {
        expect(parseInt(targets[i - 1].priority)).toBeLessThanOrEqual(
          parseInt(targets[i].priority)
        );
      }
    });
  });

  describe("Conflict Detection", () => {
    it("should detect overlapping priority conflicts", () => {
      // Create manifest with same-priority consumers
      const manifest = {
        ...defaultManifest,
        wiring_rules: [
          {
            source_category: "handbook" as const,
            knowledge_types: ["formula" as const],
            targets: [
              { consumer_id: "formula-registry", priority: "1" as const },
              { consumer_id: "speed-feed-orchestrator", priority: "1" as const },
            ],
            enabled: true,
          },
        ],
      };

      const conflicts = detectConflicts(manifest, "handbook", "formula");

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].conflict_type).toBe("overlapping_priority");
    });
  });
});

// ============================================================================
// KnowledgeLineageEngine Tests
// ============================================================================

describe("KnowledgeLineageEngine", () => {
  let engine: KnowledgeLineageEngine;

  beforeEach(() => {
    engine = new KnowledgeLineageEngine();
    engine.clear(); // Start fresh
  });

  afterEach(() => {
    // Don't persist test data
  });

  describe("Node Registration", () => {
    it("should register source nodes", () => {
      const node = engine.registerSource("test/file.pdf", { pages: 100 });

      expect(node.id).toBe("test/file.pdf");
      expect(node.type).toBe("source");
      expect(node.metadata?.pages).toBe(100);
    });

    it("should update existing source node", () => {
      engine.registerSource("test/file.pdf", { pages: 100 });
      const updated = engine.registerSource("test/file.pdf", { pages: 150 });

      expect(updated.metadata?.pages).toBe(150);
      expect(updated.updatedAt).toBeDefined();
    });

    it("should register atom nodes", () => {
      const node = engine.registerAtom(VALID_ATOM);

      expect(node.id).toBe(VALID_ATOM.id);
      expect(node.type).toBe("atom");
      expect(node.label).toBe(VALID_ATOM.title);
    });

    it("should register consumer nodes", () => {
      const node = engine.registerConsumer("engine-001", "TestEngine", "engine");

      expect(node.id).toBe("engine-001");
      expect(node.type).toBe("consumer");
    });
  });

  describe("Edge Recording", () => {
    it("should record extraction edges", () => {
      const edge = engine.recordExtraction("source.pdf", VALID_ATOM);

      expect(edge.type).toBe("extracted_from");
      expect(edge.from).toBe("source.pdf");
      expect(edge.to).toBe(VALID_ATOM.id);
    });

    it("should record wiring edges", () => {
      engine.registerAtom(VALID_ATOM);
      engine.registerConsumer("engine-001", "TestEngine", "engine");

      const edge = engine.recordWiring(VALID_ATOM.id, "engine-001", "ingest");

      expect(edge.type).toBe("wired_to");
      expect(edge.metadata?.action).toBe("ingest");
    });

    it("should record derivation edges", () => {
      const edge = engine.recordDerivation("atom-001", "atom-002", "aggregation");

      expect(edge.type).toBe("derived_from");
      expect(edge.metadata?.derivationMethod).toBe("aggregation");
    });

    it("should record supersession edges", () => {
      const edge = engine.recordSupersession("old-atom", "new-atom", "newer_source");

      expect(edge.type).toBe("supersedes");
      expect(edge.from).toBe("new-atom");
      expect(edge.to).toBe("old-atom");
    });
  });

  describe("Version Tracking", () => {
    it("should record version history", () => {
      const v1 = engine.recordVersion(VALID_ATOM, "initial extraction");

      expect(v1.version).toBe(1);
      expect(v1.atomId).toBe(VALID_ATOM.id);
      expect(v1.reason).toBe("initial extraction");
    });

    it("should increment version numbers", () => {
      engine.recordVersion(VALID_ATOM);
      const v2 = engine.recordVersion(VALID_ATOM);

      expect(v2.version).toBe(2);
    });

    it("should compute diffs between versions", () => {
      const atom1 = { ...VALID_ATOM };
      const atom2 = { ...VALID_ATOM, content: "Updated content", confidence: 0.95 };

      engine.recordVersion(atom1);
      const v2 = engine.recordVersion(atom2, "updated", atom1);

      expect(v2.diff?.changed).toBeDefined();
      expect(v2.diff?.changed?.some((c) => c.field === "content")).toBe(true);
    });

    it("should retrieve version history", () => {
      engine.recordVersion(VALID_ATOM);
      engine.recordVersion(VALID_ATOM);
      engine.recordVersion(VALID_ATOM);

      const history = engine.getVersionHistory(VALID_ATOM.id);

      expect(history.length).toBe(3);
    });

    it("should retrieve specific version", () => {
      engine.recordVersion(VALID_ATOM);
      engine.recordVersion(VALID_ATOM);

      const v1 = engine.getVersion(VALID_ATOM.id, 1);
      const v2 = engine.getVersion(VALID_ATOM.id, 2);

      expect(v1?.version).toBe(1);
      expect(v2?.version).toBe(2);
    });
  });

  describe("Conflict Resolution", () => {
    it("should detect conflicts from different sources", () => {
      // Record first version
      engine.recordVersion(VALID_ATOM);

      // Detect conflict from different source
      const conflict = engine.detectConflict(
        VALID_ATOM.id,
        "confidence",
        0.95,
        {
          ...VALID_ATOM.source,
          path: "different-source.pdf",
          authority: "manufacturer",
          authorityRank: 9,
        }
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.status).toBe("pending");
    });

    it("should resolve conflict by authority ranking", () => {
      engine.recordVersion(VALID_ATOM);

      const conflict = engine.detectConflict(
        VALID_ATOM.id,
        "content",
        "New content from manufacturer",
        {
          path: "manufacturer.pdf",
          sourceType: "catalog",
          category: "tool_catalog",
          authority: "manufacturer",
          authorityRank: 9,
        }
      );

      if (conflict) {
        // Add another value with lower authority
        conflict.values.push({
          value: "Content from operator",
          source: "operator-notes.txt",
          authority: "operator",
          authorityRank: 4,
          timestamp: new Date().toISOString(),
        });

        const resolved = engine.resolveConflictByAuthority(conflict.id);

        expect(resolved?.status).toBe("resolved");
        expect(resolved?.resolutionMethod).toBe("authority_rank");
        // Manufacturer (rank 9) should win
        expect(resolved?.resolvedValue).toBe("New content from manufacturer");
      }
    });

    it("should resolve conflict by latest", () => {
      const conflict = engine.detectConflict(
        "test-atom",
        "value",
        "value1",
        {
          path: "source1.pdf",
          sourceType: "pdf",
          category: "handbook",
          authority: "handbook",
          authorityRank: 7,
        }
      );

      if (conflict) {
        conflict.values.push({
          value: "value2",
          source: "source2.pdf",
          authority: "handbook",
          authorityRank: 7,
          timestamp: new Date(Date.now() + 1000).toISOString(), // Later
        });

        const resolved = engine.resolveConflictByLatest(conflict.id);

        expect(resolved?.resolutionMethod).toBe("latest");
        expect(resolved?.resolvedValue).toBe("value2");
      }
    });

    it("should resolve conflict manually", () => {
      const conflict = engine.detectConflict(
        "test-atom",
        "value",
        "auto-value",
        {
          path: "source.pdf",
          sourceType: "pdf",
          category: "handbook",
          authority: "handbook",
          authorityRank: 7,
        }
      );

      if (conflict) {
        const resolved = engine.resolveConflictManually(
          conflict.id,
          "manually-chosen-value",
          "Expert review determined this value is correct"
        );

        expect(resolved?.status).toBe("resolved");
        expect(resolved?.resolutionMethod).toBe("manual");
        expect(resolved?.resolvedValue).toBe("manually-chosen-value");
      }
    });

    it("should get pending conflicts", () => {
      // Record initial versions first (conflicts require existing versions)
      const atom1 = { ...VALID_ATOM, id: "atom-1" };
      const atom2 = { ...VALID_ATOM, id: "atom-2" };
      engine.recordVersion(atom1);
      engine.recordVersion(atom2);

      // Now detect conflicts from different sources
      engine.detectConflict("atom-1", "field1", "value1", {
        path: "different-s1.pdf",
        sourceType: "pdf",
        category: "handbook",
        authority: "handbook",
        authorityRank: 7,
      });
      engine.detectConflict("atom-2", "field2", "value2", {
        path: "different-s2.pdf",
        sourceType: "pdf",
        category: "handbook",
        authority: "handbook",
        authorityRank: 7,
      });

      const pending = engine.getPendingConflicts();

      expect(pending.length).toBe(2);
      expect(pending.every((c) => c.status === "pending")).toBe(true);
    });
  });

  describe("Lineage Queries", () => {
    it("should trace atom to source", () => {
      engine.recordExtraction("source1.pdf", VALID_ATOM);

      const traces = engine.traceToSource(VALID_ATOM.id);

      expect(traces.length).toBe(1);
      expect(traces[0].source.id).toBe("source1.pdf");
      expect(traces[0].path).toContain(VALID_ATOM.id);
    });

    it("should find all consumers of an atom", () => {
      engine.registerAtom(VALID_ATOM);
      engine.registerConsumer("consumer-1", "Consumer1", "engine");
      engine.registerConsumer("consumer-2", "Consumer2", "registry");

      engine.recordWiring(VALID_ATOM.id, "consumer-1", "action1");
      engine.recordWiring(VALID_ATOM.id, "consumer-2", "action2");

      const consumers = engine.findConsumers(VALID_ATOM.id);

      expect(consumers.length).toBe(2);
    });

    it("should find all atoms from a source", () => {
      const atom1 = { ...VALID_ATOM, id: "atom-1" };
      const atom2 = { ...VALID_ATOM, id: "atom-2" };

      engine.recordExtraction("source.pdf", atom1);
      engine.recordExtraction("source.pdf", atom2);

      const atoms = engine.findAtomsFromSource("source.pdf");

      expect(atoms.length).toBe(2);
    });

    it("should generate full lineage report", () => {
      engine.recordExtraction("source.pdf", VALID_ATOM);
      engine.registerConsumer("consumer-1", "Consumer1", "engine");
      engine.recordWiring(VALID_ATOM.id, "consumer-1", "ingest");
      engine.recordVersion(VALID_ATOM);

      const report = engine.getLineageReport(VALID_ATOM.id);

      expect(report.atom).toBeDefined();
      expect(report.sources.length).toBe(1);
      expect(report.consumers.length).toBe(1);
      expect(report.versions.length).toBe(1);
    });
  });

  describe("Statistics", () => {
    it("should return graph statistics", () => {
      engine.recordExtraction("source.pdf", VALID_ATOM);
      engine.recordVersion(VALID_ATOM);

      const stats = engine.getStats();

      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.totalEdges).toBeGreaterThan(0);
      expect(stats.totalVersions).toBeGreaterThan(0);
    });

    it("should return authority distribution", () => {
      const atom1 = { ...VALID_ATOM, id: "atom-1", source: { ...VALID_ATOM.source, authority: "handbook" as const } };
      const atom2 = { ...VALID_ATOM, id: "atom-2", source: { ...VALID_ATOM.source, authority: "operator" as const } };

      engine.registerAtom(atom1);
      engine.registerAtom(atom2);

      const dist = engine.getAuthorityDistribution();

      expect(dist["handbook"]).toBe(1);
      expect(dist["operator"]).toBe(1);
    });
  });
});
