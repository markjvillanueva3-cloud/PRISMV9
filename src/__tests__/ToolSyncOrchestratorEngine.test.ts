import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolSyncOrchestratorEngine,
  toolSyncOrchestratorEngine,
  type ToolRecord,
  type ConflictEntry,
  type SupportedSystem,
} from "../engines/ToolSyncOrchestratorEngine.js";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ENDMILL: ToolRecord = {
  id: "EM-10-4FL",
  designation: "10mm 4-flute Carbide Endmill",
  manufacturer: "Sandvik",
  type: "end_mill",
  diameter_mm: 10,
  spindle_rpm: 8000,
  feed_mm_min: 2400,
};

const DRILL: ToolRecord = {
  id: "DR-8",
  designation: "8mm Carbide Drill",
  manufacturer: "Kennametal",
  type: "drill",
  diameter_mm: 8,
  spindle_rpm: 4000,
  feed_mm_min: 400,
};

const BALLNOSE: ToolRecord = {
  id: "BN-6-2FL",
  designation: "6mm Ballnose",
  manufacturer: "Seco",
  type: "ball_mill",
  diameter_mm: 6,
};

const SAMPLE_TOOLS: ToolRecord[] = [ENDMILL, DRILL, BALLNOSE];

// ─── Constructor ─────────────────────────────────────────────────────────────

describe("ToolSyncOrchestratorEngine", () => {
  let eng: ToolSyncOrchestratorEngine;

  beforeEach(() => {
    eng = new ToolSyncOrchestratorEngine();
  });

  // ── singleton ─────────────────────────────────────────────────────────────

  it("exports singleton", () => {
    expect(toolSyncOrchestratorEngine).toBeInstanceOf(ToolSyncOrchestratorEngine);
  });

  // ── syncToSystems ─────────────────────────────────────────────────────────

  describe("syncToSystems", () => {
    it("returns one SyncResult per system", () => {
      const systems: SupportedSystem[] = ["universal", "nx"];
      const results = eng.syncToSystems(SAMPLE_TOOLS, systems);
      expect(results).toHaveLength(2);
      expect(results.map(r => r.system)).toEqual(expect.arrayContaining(["universal", "nx"]));
    });

    it("returns success or error with a timestamp", () => {
      const results = eng.syncToSystems(SAMPLE_TOOLS, ["universal"]);
      const r = results[0];
      expect(r).toHaveProperty("tools_synced");
      expect(r).toHaveProperty("status");
      expect(r).toHaveProperty("timestamp");
      expect(typeof r.timestamp).toBe("string");
    });

    it("exports tools successfully for hypermill", () => {
      const results = eng.syncToSystems(SAMPLE_TOOLS, ["hypermill"]);
      expect(results[0].status).toBe("success");
      expect(results[0].system).toBe("hypermill");
      expect(results[0].tools_synced).toBe(SAMPLE_TOOLS.length);
      expect(results[0].exported_format).toBe("hmt_sqlite");
    });

    it("returns error for invalid systems list", () => {
      const results = eng.syncToSystems(SAMPLE_TOOLS, ["invalidSystem" as SupportedSystem]);
      expect(results[0].status).toBe("error");
    });

    it("handles empty tools list", () => {
      const results = eng.syncToSystems([], ["universal"]);
      expect(results).toHaveLength(1);
      expect(results[0].system).toBe("universal");
    });

    it("handles all supported systems", () => {
      const systems: SupportedSystem[] = ["fusion360", "mastercam", "hypermill", "nx", "universal"];
      const results = eng.syncToSystems(SAMPLE_TOOLS, systems);
      expect(results).toHaveLength(5);
      const statuses = results.map(r => r.status);
      expect(statuses).not.toContain(undefined);
    });
  });

  // ── detectDrift ───────────────────────────────────────────────────────────

  describe("detectDrift", () => {
    it("detects added tools (in PRISM, not in CAM)", () => {
      const prism: ToolRecord[] = [ENDMILL, DRILL, BALLNOSE];
      const cam: ToolRecord[] = [ENDMILL];
      const drift = eng.detectDrift("fusion360", prism, cam);
      expect(drift.added).toHaveLength(2);
      const addedIds = drift.added.map(t => t.id);
      expect(addedIds).toContain("DR-8");
      expect(addedIds).toContain("BN-6-2FL");
    });

    it("detects removed tools (in CAM, not in PRISM)", () => {
      const prism: ToolRecord[] = [ENDMILL];
      const cam: ToolRecord[] = [ENDMILL, DRILL];
      const drift = eng.detectDrift("mastercam", prism, cam);
      expect(drift.removed).toContain("DR-8");
    });

    it("detects modified tools (same id, different params)", () => {
      const camEndmill = { ...ENDMILL, spindle_rpm: 9999 };
      const drift = eng.detectDrift("nx", [ENDMILL], [camEndmill]);
      expect(drift.modified).toHaveLength(1);
      expect(drift.modified[0].tool_id).toBe("EM-10-4FL");
      expect(drift.modified[0].conflict_fields).toContain("spindle_rpm");
    });

    it("counts unchanged tools correctly", () => {
      const drift = eng.detectDrift("universal", [ENDMILL, DRILL], [ENDMILL, DRILL]);
      expect(drift.unchanged_count).toBe(2);
      expect(drift.added).toHaveLength(0);
      expect(drift.removed).toHaveLength(0);
      expect(drift.modified).toHaveLength(0);
    });

    it("computes drift_score as fraction of catalog", () => {
      const prism: ToolRecord[] = [ENDMILL, DRILL, BALLNOSE];
      const cam: ToolRecord[] = [ENDMILL];
      const drift = eng.detectDrift("fusion360", prism, cam);
      expect(drift.drift_score).toBeGreaterThan(0);
      expect(drift.drift_score).toBeLessThanOrEqual(1);
    });

    it("returns zero drift_score for identical catalogs", () => {
      const drift = eng.detectDrift("universal", SAMPLE_TOOLS, SAMPLE_TOOLS);
      expect(drift.drift_score).toBe(0);
    });

    it("populates prism_data and cam_data on conflicts", () => {
      const camEndmill = { ...ENDMILL, spindle_rpm: 7500 };
      const drift = eng.detectDrift("mastercam", [ENDMILL], [camEndmill]);
      const conflict = drift.modified[0];
      expect(conflict.prism_data).toHaveProperty("spindle_rpm", 8000);
      expect(conflict.cam_data).toHaveProperty("spindle_rpm", 7500);
    });
  });

  // ── resolveConflicts ──────────────────────────────────────────────────────

  describe("resolveConflicts", () => {
    it("PRISM wins on physics fields (spindle_rpm)", () => {
      const conflict: ConflictEntry = {
        tool_id: "EM-10-4FL",
        prism_data: { spindle_rpm: 8000 },
        cam_data: { spindle_rpm: 7500 },
        conflict_fields: ["spindle_rpm"],
      };
      const [res] = eng.resolveConflicts([conflict]);
      expect(res.resolution).toBe("prism_wins");
      expect(res.winning_data).toEqual({ spindle_rpm: 8000 });
    });

    it("flags manual_review for user-editable fields (designation)", () => {
      const conflict: ConflictEntry = {
        tool_id: "EM-10-4FL",
        prism_data: { designation: "10mm Endmill" },
        cam_data: { designation: "My Custom Label" },
        conflict_fields: ["designation"],
      };
      const [res] = eng.resolveConflicts([conflict]);
      expect(res.resolution).toBe("manual_review");
    });

    it("flags manual_review for unknown fields", () => {
      const conflict: ConflictEntry = {
        tool_id: "DR-8",
        prism_data: { custom_xyz: "a" },
        cam_data: { custom_xyz: "b" },
        conflict_fields: ["custom_xyz"],
      };
      const [res] = eng.resolveConflicts([conflict]);
      expect(res.resolution).toBe("manual_review");
    });

    it("returns no_action for empty conflict_fields", () => {
      const conflict: ConflictEntry = {
        tool_id: "BN-6-2FL",
        prism_data: {},
        cam_data: {},
        conflict_fields: [],
      };
      const [res] = eng.resolveConflicts([conflict]);
      expect(res.resolution).toBe("no_action");
    });

    it("resolves multiple conflicts independently", () => {
      const conflicts: ConflictEntry[] = [
        { tool_id: "T1", prism_data: { feed_mm_min: 100 }, cam_data: { feed_mm_min: 80 }, conflict_fields: ["feed_mm_min"] },
        { tool_id: "T2", prism_data: { designation: "A" }, cam_data: { designation: "B" }, conflict_fields: ["designation"] },
      ];
      const results = eng.resolveConflicts(conflicts);
      expect(results).toHaveLength(2);
      expect(results[0].resolution).toBe("prism_wins");
      expect(results[1].resolution).toBe("manual_review");
    });
  });

  // ── getSyncStatus ─────────────────────────────────────────────────────────

  describe("getSyncStatus", () => {
    it("returns status for all 5 systems by default", () => {
      const statuses = eng.getSyncStatus();
      expect(statuses).toHaveLength(5);
    });

    it("returns status for specified systems only", () => {
      const statuses = eng.getSyncStatus(["fusion360", "mastercam"]);
      expect(statuses).toHaveLength(2);
      const names = statuses.map(s => s.system);
      expect(names).toContain("fusion360");
      expect(names).toContain("mastercam");
    });

    it("marks hypermill as supported", () => {
      const statuses = eng.getSyncStatus(["hypermill"]);
      expect(statuses[0].supported).toBe(true);
    });

    it("marks other systems as supported", () => {
      const statuses = eng.getSyncStatus(["fusion360", "mastercam", "nx", "universal"]);
      statuses.forEach(s => expect(s.supported).toBe(true));
    });

    it("each status has required fields", () => {
      const statuses = eng.getSyncStatus();
      for (const s of statuses) {
        expect(s).toHaveProperty("system");
        expect(s).toHaveProperty("drift_count");
        expect(s).toHaveProperty("health");
        expect(s).toHaveProperty("tool_count_prism");
        expect(s).toHaveProperty("tool_count_cam");
        expect(s).toHaveProperty("supported");
        expect(["healthy", "stale", "unknown", "error"]).toContain(s.health);
      }
    });
  });

  // ── generateSyncReport ────────────────────────────────────────────────────

  describe("generateSyncReport", () => {
    it("returns a non-empty markdown string", () => {
      const report = eng.generateSyncReport();
      expect(typeof report).toBe("string");
      expect(report.length).toBeGreaterThan(100);
    });

    it("includes all system names", () => {
      const report = eng.generateSyncReport();
      expect(report).toContain("fusion360");
      expect(report).toContain("mastercam");
      expect(report).toContain("hypermill");
      expect(report).toContain("nx");
      expect(report).toContain("universal");
    });

    it("includes conflict resolution policy section", () => {
      const report = eng.generateSyncReport();
      expect(report).toContain("Conflict Resolution Policy");
      expect(report).toContain("PRISM wins");
    });

    it("includes header and summary", () => {
      const report = eng.generateSyncReport();
      expect(report).toContain("Tool Sync Orchestrator");
      expect(report).toContain("Summary");
    });

    it("scopes report to specified systems", () => {
      const report = eng.generateSyncReport(["fusion360"]);
      expect(report).toContain("fusion360");
    });
  });

  // ── pullFromSystem ────────────────────────────────────────────────────────

  describe("pullFromSystem", () => {
    it("imports valid tools", () => {
      const { imported, skipped } = eng.pullFromSystem("mastercam", SAMPLE_TOOLS);
      expect(imported).toHaveLength(3);
      expect(skipped).toBe(0);
    });

    it("skips tools with no id and no designation", () => {
      const badTool: ToolRecord = { id: "" as any };
      delete (badTool as any).id;
      const { imported, skipped, warnings } = eng.pullFromSystem("fusion360", [badTool]);
      expect(skipped).toBe(1);
      expect(warnings).toHaveLength(1);
      expect(imported).toHaveLength(0);
    });

    it("annotates imported tools with _imported_from and _import_ts", () => {
      const { imported } = eng.pullFromSystem("nx", [ENDMILL]);
      expect(imported[0]._imported_from).toBe("nx");
      expect(typeof imported[0]._import_ts).toBe("string");
    });

    it("generates fallback id if missing", () => {
      const toolNoId: ToolRecord = { id: undefined as any, designation: "My Tool", manufacturer: "Acme" };
      const { imported } = eng.pullFromSystem("universal", [toolNoId]);
      expect(imported[0].id).toBeTruthy();
      expect(typeof imported[0].id).toBe("string");
    });
  });
});
