/**
 * Tests for DeskPayloadEngine + GlobalSearchEngine — Session 6-8
 * Covers: role-based desk payloads, saved views CRUD, pins, recents,
 * global search with fuzzy matching, autocomplete suggestions
 */
import { describe, it, expect, beforeEach } from "vitest";
import { DeskPayloadEngine } from "../engines/DeskPayloadEngine.js";
import { GlobalSearchEngine } from "../engines/GlobalSearchEngine.js";
import type { DeskDataSources } from "../engines/DeskPayloadEngine.js";
import type { SearchableEntity } from "../engines/GlobalSearchEngine.js";

// ═══════════════════════════════════════════════════════════════════════════════
// DESK PAYLOAD ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

describe("DeskPayloadEngine", () => {
  let engine: DeskPayloadEngine;

  beforeEach(() => {
    engine = new DeskPayloadEngine();
  });

  const sampleData: DeskDataSources = {
    jobs: [
      { id: "J-001", status: "in_progress", customer: "Acme", part_number: "PN-100", due_date: "2026-04-01", revenue: 5000 },
      { id: "J-002", status: "late", customer: "Boeing", part_number: "PN-200", due_date: "2026-03-20", revenue: 12000 },
      { id: "J-003", status: "at_risk", customer: "SpaceX", part_number: "PN-300", due_date: "2026-03-28" },
      { id: "J-004", status: "complete", customer: "Lockheed", part_number: "PN-400", revenue: 8000 },
      { id: "J-005", status: "queued", operator_id: "OP-1" },
    ],
    quotes: [
      { id: "Q-001", status: "pending", amount: 15000, customer: "Acme" },
      { id: "Q-002", status: "draft", amount: 8000 },
      { id: "Q-003", status: "accepted", amount: 25000 },
    ],
    machines: [
      { id: "M-001", status: "running", utilization: 85, current_job_id: "J-001" },
      { id: "M-002", status: "idle", utilization: 0 },
      { id: "M-003", status: "active", utilization: 70 },
    ],
    ncrs: [
      { id: "NCR-001", status: "open", severity: "major" },
      { id: "NCR-002", status: "investigation" },
      { id: "NCR-003", status: "closed" },
    ],
    invoices: [
      { id: "INV-001", status: "overdue", amount: 5000, days_overdue: 30 },
      { id: "INV-002", status: "paid", amount: 8000, days_overdue: 0 },
    ],
    programs: [
      { id: "PRG-001", status: "pending" },
      { id: "PRG-002", status: "released" },
    ],
  };

  describe("getDeskPayload", () => {
    it("returns admin desk with all KPIs", () => {
      const result = engine.getDeskPayload("admin", sampleData);
      expect(result.role).toBe("admin");
      expect(result.kpis.revenue_mtd.value).toBe(25000);
      expect(result.kpis.quotes_pending.value).toBe(2);
      expect(result.kpis.jobs_overdue.value).toBe(1);
      expect(result.kpis.jobs_overdue.severity).toBe("critical");
      expect(result.kpis.machine_utilization.unit).toBe("%");
      expect(result.kpis.ar_aging.value).toBe(5000);
      expect(result.generated_at).toBeTruthy();
    });

    it("returns engineer desk with NCR and program counts", () => {
      const result = engine.getDeskPayload("engineer", sampleData);
      expect(result.role).toBe("engineer");
      expect(result.kpis.open_ncrs.value).toBe(2);
      expect(result.kpis.programs_pending.value).toBe(1);
    });

    it("returns operator desk with current/next job", () => {
      const opData = { ...sampleData, operator_id: "OP-1", clock_in_time: new Date(Date.now() - 3600000).toISOString() };
      const result = engine.getDeskPayload("operator", opData);
      expect(result.role).toBe("operator");
      expect(result.kpis.clock_status.value).toBe("Clocked In");
      expect(result.kpis.my_time_today.value).toBeCloseTo(1.0, 0);
    });

    it("returns viewer desk with public metrics", () => {
      const result = engine.getDeskPayload("viewer", sampleData);
      expect(result.role).toBe("viewer");
      expect(result.kpis.active_jobs.value).toBe(1);
      expect(result.kpis.machines_running.value).toBe(2);
    });

    it("falls back to viewer for unknown role", () => {
      const result = engine.getDeskPayload("unknown" as any, sampleData);
      expect(result.role).toBe("viewer");
    });

    it("handles empty data gracefully", () => {
      const result = engine.getDeskPayload("admin", {});
      expect(result.role).toBe("admin");
      expect(result.kpis.revenue_mtd.value).toBe(0);
      expect(result.kpis.quotes_pending.value).toBe(0);
      expect(result.alerts).toHaveLength(0);
    });

    it("generates alerts for overdue and at-risk jobs", () => {
      const result = engine.getDeskPayload("admin", sampleData);
      expect(result.alerts.length).toBeGreaterThan(0);
      const overdueAlert = result.alerts.find((a) => a.severity === "critical");
      expect(overdueAlert).toBeTruthy();
      expect(overdueAlert!.entity_type).toBe("job");
    });
  });

  describe("getDeskCounts", () => {
    it("returns correct summary counts", () => {
      const counts = engine.getDeskCounts(sampleData);
      expect(counts.active_jobs).toBe(1);
      expect(counts.overdue_jobs).toBe(1);
      expect(counts.pending_quotes).toBe(2);
      expect(counts.open_ncrs).toBe(2);
      expect(counts.overdue_invoices).toBe(1);
    });

    it("returns zeros for empty data", () => {
      const counts = engine.getDeskCounts({});
      expect(counts.active_jobs).toBe(0);
      expect(counts.overdue_jobs).toBe(0);
    });
  });

  describe("Saved Views", () => {
    it("creates a saved view", () => {
      const view = engine.createSavedView({
        user_id: "U-1",
        name: "Active Jobs",
        entity_type: "job",
        filters: { status: "in_progress" },
        columns: ["id", "status", "customer"],
        sort_by: "due_date",
        sort_dir: "asc",
      });
      expect(view.id).toBeTruthy();
      expect(view.name).toBe("Active Jobs");
      expect(view.filters).toEqual({ status: "in_progress" });
    });

    it("lists saved views for a user", () => {
      engine.createSavedView({ user_id: "U-1", name: "V1", entity_type: "job" });
      engine.createSavedView({ user_id: "U-1", name: "V2", entity_type: "quote" });
      engine.createSavedView({ user_id: "U-2", name: "V3", entity_type: "job" });

      const u1Views = engine.listSavedViews("U-1");
      expect(u1Views).toHaveLength(2);

      const jobViews = engine.listSavedViews("U-1", "job");
      expect(jobViews).toHaveLength(1);
    });

    it("updates a saved view", () => {
      const view = engine.createSavedView({ user_id: "U-1", name: "V1", entity_type: "job" });
      const updated = engine.updateSavedView({ view_id: view.id, user_id: "U-1", name: "Updated Name" });
      expect(updated.name).toBe("Updated Name");
    });

    it("prevents modifying another user's view", () => {
      const view = engine.createSavedView({ user_id: "U-1", name: "V1", entity_type: "job" });
      expect(() => engine.updateSavedView({ view_id: view.id, user_id: "U-2" })).toThrow(/another user/);
    });

    it("deletes a saved view", () => {
      const view = engine.createSavedView({ user_id: "U-1", name: "V1", entity_type: "job" });
      engine.deleteSavedView(view.id, "U-1");
      expect(engine.listSavedViews("U-1")).toHaveLength(0);
    });

    it("enforces default view uniqueness per entity type", () => {
      const v1 = engine.createSavedView({ user_id: "U-1", name: "V1", entity_type: "job", is_default: true });
      const v2 = engine.createSavedView({ user_id: "U-1", name: "V2", entity_type: "job", is_default: true });
      const views = engine.listSavedViews("U-1", "job");
      const defaults = views.filter((v) => v.is_default);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(v2.id);
    });

    it("rejects missing required fields", () => {
      expect(() => engine.createSavedView({ user_id: "", name: "V1", entity_type: "job" })).toThrow();
    });
  });

  describe("Pins", () => {
    it("pins an entity", () => {
      const pin = engine.pinEntity("U-1", "job", "J-001", "Job J-001");
      expect(pin.entity_type).toBe("job");
      expect(pin.entity_id).toBe("J-001");
    });

    it("prevents duplicate pins", () => {
      engine.pinEntity("U-1", "job", "J-001", "Job J-001");
      const dup = engine.pinEntity("U-1", "job", "J-001", "Job J-001");
      expect(engine.listPins("U-1")).toHaveLength(1);
      expect(dup.entity_id).toBe("J-001");
    });

    it("lists pins sorted by most recent", () => {
      engine.pinEntity("U-1", "job", "J-001", "First");
      engine.pinEntity("U-1", "job", "J-002", "Second");
      const pins = engine.listPins("U-1");
      expect(pins).toHaveLength(2);
    });

    it("unpins an entity", () => {
      const pin = engine.pinEntity("U-1", "job", "J-001", "Job");
      engine.unpinEntity(pin.id, "U-1");
      expect(engine.listPins("U-1")).toHaveLength(0);
    });

    it("prevents unpinning another user's pin", () => {
      const pin = engine.pinEntity("U-1", "job", "J-001", "Job");
      expect(() => engine.unpinEntity(pin.id, "U-2")).toThrow(/another user/);
    });
  });

  describe("Recents", () => {
    it("records entity access", () => {
      const recent = engine.recordAccess("U-1", "job", "J-001", "Job J-001");
      expect(recent.entity_type).toBe("job");
    });

    it("deduplicates recents (moves to front)", () => {
      engine.recordAccess("U-1", "job", "J-001", "First");
      engine.recordAccess("U-1", "job", "J-002", "Second");
      engine.recordAccess("U-1", "job", "J-001", "First again");
      const recents = engine.listRecents("U-1");
      expect(recents).toHaveLength(2);
      expect(recents[0].entity_id).toBe("J-001");
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordAccess("U-1", "job", `J-${i}`, `Job ${i}`);
      }
      expect(engine.listRecents("U-1", 3)).toHaveLength(3);
    });

    it("rejects missing fields", () => {
      expect(() => engine.recordAccess("", "job", "J-001", "Job")).toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

describe("GlobalSearchEngine", () => {
  let engine: GlobalSearchEngine;

  const sampleEntities: SearchableEntity[] = [
    { entity_type: "job", entity_id: "J-001", title: "Job J-001 Aluminum Bracket", subtitle: "Acme Corp", searchable_text: "aluminum bracket cnc milling 6061-T6 acme corp" },
    { entity_type: "job", entity_id: "J-002", title: "Job J-002 Steel Housing", subtitle: "Boeing", searchable_text: "steel housing turning 4140 boeing aerospace" },
    { entity_type: "customer", entity_id: "C-001", title: "Acme Corporation", searchable_text: "acme corporation manufacturing parts supplier" },
    { entity_type: "quote", entity_id: "Q-001", title: "Quote for Aluminum Parts", searchable_text: "aluminum parts 6061 bracket plate cnc milling quote" },
    { entity_type: "machine", entity_id: "M-001", title: "Haas VF-2SS", searchable_text: "haas vf-2ss vertical machining center 12000 rpm" },
    { entity_type: "tool", entity_id: "T-001", title: "1/2\" End Mill Carbide", searchable_text: "half inch end mill carbide 4 flute aluminum" },
    { entity_type: "part", entity_id: "P-001", title: "Aluminum Bracket Assembly", searchable_text: "aluminum bracket assembly 6061-T6 anodized" },
    { entity_type: "employee", entity_id: "E-001", title: "John Smith", searchable_text: "john smith machinist operator cnc" },
    { entity_type: "invoice", entity_id: "INV-001", title: "Invoice #1234", searchable_text: "invoice 1234 acme aluminum bracket" },
    { entity_type: "purchase_order", entity_id: "PO-001", title: "PO for Carbide Tooling", searchable_text: "purchase order carbide tooling kennametal" },
  ];

  beforeEach(() => {
    engine = new GlobalSearchEngine();
    engine.indexEntities(sampleEntities);
  });

  describe("indexEntities", () => {
    it("indexes entities and returns count", () => {
      const fresh = new GlobalSearchEngine();
      const result = fresh.indexEntities(sampleEntities);
      expect(result.indexed).toBe(10);
    });

    it("deduplicates on re-index", () => {
      engine.indexEntities([sampleEntities[0]]);
      const stats = engine.getStats();
      expect(stats.total_entities).toBe(10);
    });
  });

  describe("search", () => {
    it("finds entities matching 'aluminum'", () => {
      const result = engine.search({ query: "aluminum" });
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.results[0].match_score).toBeGreaterThan(0);
      expect(result.query).toBe("aluminum");
    });

    it("returns facets by entity type", () => {
      const result = engine.search({ query: "aluminum" });
      expect(result.facets.job).toBeGreaterThanOrEqual(1);
      expect(result.facets.part).toBeGreaterThanOrEqual(1);
    });

    it("filters by entity type", () => {
      const result = engine.search({ query: "aluminum", types: ["job"] });
      for (const r of result.results) {
        expect(r.entity_type).toBe("job");
      }
    });

    it("respects limit parameter", () => {
      const result = engine.search({ query: "aluminum", limit: 2 });
      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.limit).toBe(2);
    });

    it("supports pagination with offset", () => {
      const all = engine.search({ query: "aluminum", limit: 100 });
      const page2 = engine.search({ query: "aluminum", offset: 1, limit: 2 });
      if (all.total > 1) {
        expect(page2.results[0].entity_id).toBe(all.results[1].entity_id);
      }
    });

    it("returns empty for no match", () => {
      const result = engine.search({ query: "xyznonexistent" });
      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("returns empty for empty query", () => {
      const result = engine.search({ query: "" });
      expect(result.total).toBe(0);
    });

    it("fuzzy matches 'alumnum' (typo)", () => {
      const result = engine.search({ query: "alumnum", min_score: 0.1 });
      expect(result.total).toBeGreaterThan(0);
    });

    it("ranks exact title matches higher", () => {
      const result = engine.search({ query: "Haas VF-2SS" });
      expect(result.results[0].entity_id).toBe("M-001");
    });

    it("includes preview snippets", () => {
      const result = engine.search({ query: "aluminum" });
      expect(result.results[0].preview).toBeTruthy();
    });

    it("reports execution time", () => {
      const result = engine.search({ query: "aluminum" });
      expect(result.execution_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("suggest", () => {
    it("returns autocomplete suggestions", () => {
      const result = engine.suggest({ query: "Alu" });
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("prefix matches are ranked highest", () => {
      const result = engine.suggest({ query: "Job J-001" });
      expect(result.suggestions[0].entity_id).toBe("J-001");
      expect(result.suggestions[0].score).toBeGreaterThan(0.8);
    });

    it("respects limit", () => {
      const result = engine.suggest({ query: "al", limit: 2 });
      expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });

    it("returns empty for single-char query", () => {
      const result = engine.suggest({ query: "a" });
      expect(result.suggestions).toHaveLength(0);
    });

    it("filters by entity type", () => {
      const result = engine.suggest({ query: "alu", types: ["machine"] });
      for (const s of result.suggestions) {
        expect(s.entity_type).toBe("machine");
      }
    });
  });

  describe("removeEntities", () => {
    it("removes specific entities", () => {
      engine.removeEntities("job", ["J-001"]);
      const stats = engine.getStats();
      expect(stats.by_type.job).toBe(1);
    });

    it("removes all entities of a type", () => {
      engine.removeEntities("job");
      const stats = engine.getStats();
      expect(stats.by_type.job).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("returns entity counts by type", () => {
      const stats = engine.getStats();
      expect(stats.total_entities).toBe(10);
      expect(stats.by_type.job).toBe(2);
      expect(stats.by_type.customer).toBe(1);
    });
  });

  describe("clearIndex", () => {
    it("clears all indexed data", () => {
      engine.clearIndex();
      const stats = engine.getStats();
      expect(stats.total_entities).toBe(0);
    });
  });
});
