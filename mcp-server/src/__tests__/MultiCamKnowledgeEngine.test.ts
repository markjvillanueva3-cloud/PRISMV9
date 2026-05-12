/**
 * MultiCamKnowledgeEngine Tests
 */

import { describe, it, expect } from "vitest";
import {
  multiCamKnowledgeEngine,
  MultiCamKnowledgeEngine,
} from "../engines/MultiCamKnowledgeEngine.js";

describe("MultiCamKnowledgeEngine", () => {
  describe("Singleton + class", () => {
    it("exports singleton", () => {
      expect(multiCamKnowledgeEngine).toBeInstanceOf(MultiCamKnowledgeEngine);
    });
  });

  describe("listArchives + getArchive", () => {
    it("lists 8 CAM systems", () => {
      const archives = multiCamKnowledgeEngine.listArchives();
      expect(archives).toHaveLength(8);
    });

    it("retrieves Mastercam archive", () => {
      const a = multiCamKnowledgeEngine.getArchive("mastercam");
      expect(a).not.toBeNull();
      expect(a?.file_extensions).toContain(".mcx-8");
      expect(a?.file_format).toBe("ole_cfbf");
    });

    it("retrieves HyperMill archive", () => {
      const a = multiCamKnowledgeEngine.getArchive("hypermill");
      expect(a).not.toBeNull();
      expect(a?.estimated_count).toBeGreaterThan(1000);
    });

    it("retrieves SolidWorks CAM archive", () => {
      const a = multiCamKnowledgeEngine.getArchive("solidworks_cam");
      expect(a).not.toBeNull();
      expect(a?.file_extensions).toContain(".sldprt");
    });

    it("retrieves Inventor archive", () => {
      const a = multiCamKnowledgeEngine.getArchive("inventor");
      expect(a).not.toBeNull();
      expect(a?.file_extensions).toContain(".ipt");
      expect(a?.file_extensions).toContain(".iam");
    });

    it("retrieves Fusion 360 archive", () => {
      const a = multiCamKnowledgeEngine.getArchive("fusion360");
      expect(a).not.toBeNull();
      expect(a?.file_extensions).toContain(".cps");
    });
  });

  describe("query", () => {
    it("filters by specific system", () => {
      const r = multiCamKnowledgeEngine.query({ system: "mastercam" });
      expect(r).toHaveLength(1);
      expect(r[0].system).toBe("mastercam");
    });

    it("filters by offline capability", () => {
      const r = multiCamKnowledgeEngine.query({ supports_offline: true });
      expect(r.length).toBe(8);
    });

    it("filters by minimum count", () => {
      const r = multiCamKnowledgeEngine.query({ min_count: 1000 });
      expect(r.every((a) => a.estimated_count >= 1000)).toBe(true);
    });
  });

  describe("offline extraction policy", () => {
    it("all 8 systems support offline extraction", () => {
      const offline = multiCamKnowledgeEngine.getOfflineCapableSystems();
      expect(offline).toHaveLength(8);
    });

    it("zero systems require vendor login", () => {
      const loginReq = multiCamKnowledgeEngine.getLoginRequiredSystems();
      expect(loginReq).toHaveLength(0);
    });

    it("Inventor is extractable without login", () => {
      expect(multiCamKnowledgeEngine.canExtractWithoutLogin("inventor")).toBe(true);
    });

    it("SolidWorks is extractable without login", () => {
      expect(multiCamKnowledgeEngine.canExtractWithoutLogin("solidworks_cam")).toBe(true);
    });
  });

  describe("getExtractionRouting", () => {
    it("routes HyperMill to existing PP engine", () => {
      const r = multiCamKnowledgeEngine.getExtractionRouting("hypermill");
      expect(r.recommended_engine).toContain("HyperMill");
    });

    it("routes SolidWorks + Inventor to shared OLE CFBF extractor", () => {
      const sw = multiCamKnowledgeEngine.getExtractionRouting("solidworks_cam");
      const inv = multiCamKnowledgeEngine.getExtractionRouting("inventor");
      expect(sw.recommended_engine).toContain("OleCfbf");
      expect(inv.recommended_engine).toContain("OleCfbf");
    });

    it("routes text G-code systems to MillProgramLearningEngine", () => {
      const haas = multiCamKnowledgeEngine.getExtractionRouting("haas_visual");
      const hurco = multiCamKnowledgeEngine.getExtractionRouting("hurco_winmax");
      expect(haas.recommended_engine).toContain("MillProgramLearningEngine");
      expect(hurco.recommended_engine).toContain("MillProgramLearningEngine");
    });

    it("returns offline_capable=true for all known systems", () => {
      for (const sys of multiCamKnowledgeEngine.listArchives().map((a) => a.system)) {
        expect(multiCamKnowledgeEngine.getExtractionRouting(sys).offline_capable).toBe(true);
      }
    });
  });

  describe("getStats", () => {
    it("reports total files across all systems", () => {
      const s = multiCamKnowledgeEngine.getStats();
      expect(s.total_files).toBeGreaterThan(8000);
      expect(s.total_systems).toBe(8);
    });

    it("reports OLE CFBF system count (Mastercam/SolidWorks/Inventor)", () => {
      const s = multiCamKnowledgeEngine.getStats();
      expect(s.ole_cfbf_systems).toBeGreaterThanOrEqual(3);
    });

    it("reports text G-code system count (Haas/Hurco/Okuma/Fusion)", () => {
      const s = multiCamKnowledgeEngine.getStats();
      expect(s.text_gcode_systems).toBeGreaterThanOrEqual(3);
    });

    it("offline_capable equals total_systems (no login required)", () => {
      const s = multiCamKnowledgeEngine.getStats();
      expect(s.offline_capable).toBe(s.total_systems);
      expect(s.login_required).toBe(0);
    });
  });

  describe("getSelfAwareness", () => {
    it("exposes login policy clearly", () => {
      const a = multiCamKnowledgeEngine.getSelfAwareness();
      expect(a.login_policy).toContain("NONE");
      expect(a.login_policy.toLowerCase()).toContain("offline");
    });

    it("lists Inventor-specific capability", () => {
      const a = multiCamKnowledgeEngine.getSelfAwareness();
      expect(a.cam_systems).toContain("inventor");
    });

    it("lists OLE CFBF as core capability", () => {
      const a = multiCamKnowledgeEngine.getSelfAwareness();
      expect(a.offline_capabilities.join(" ")).toContain("OLE CFBF");
    });
  });
});
