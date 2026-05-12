/**
 * BOX-MS6: Fusion 360 Cloud Extraction — JM Die Team Programs & Setups
 *
 * Tests all 5 engines in mock mode (no Fusion 360 required):
 *   - FusionCloudConnectorEngine: connection, project listing, file search
 *   - FusionProjectCrawlerEngine: recursive crawl, design summary
 *   - FusionCAMExtractorEngine: CAM data extraction, speed/feed, 5-axis detection
 *   - FusionToolLibraryExtractorEngine: tool library build, PRISM mapping
 *   - FusionSetupDocumentEngine: setup sheet generation, text rendering
 *   - Dispatcher wiring: 6 new actions
 *   - Schema validation
 */
import { describe, it, expect } from "vitest";
import { FusionCloudConnectorEngine } from "../engines/FusionCloudConnectorEngine.js";
import { fusionProjectCrawlerEngine } from "../engines/FusionProjectCrawlerEngine.js";
import { fusionCAMExtractorEngine } from "../engines/FusionCAMExtractorEngine.js";
import { fusionToolLibraryExtractorEngine } from "../engines/FusionToolLibraryExtractorEngine.js";
import { fusionSetupDocumentEngine } from "../engines/FusionSetupDocumentEngine.js";
import {
  BoxFusionConnectSchema,
  BoxFusionCrawlProjectSchema,
  BoxFusionExtractCAMSchema,
  BoxFusionExtractToolsSchema,
  BoxFusionSetupDocSchema,
  BOX_ACTION_SCHEMAS,
} from "../tools/schemas/boxAuditActionSchemas.js";

// ═══════════════════════════════════════════════════════════════
// CLOUD CONNECTOR
// ═══════════════════════════════════════════════════════════════

describe("FusionCloudConnectorEngine", () => {
  const connector = new FusionCloudConnectorEngine({ mode: "mock" });

  it("connects in mock mode", async () => {
    const status = await connector.checkConnection();
    expect(status.connected).toBe(true);
    expect(status.mode).toBe("mock");
    expect(status.projects_available).toBeGreaterThan(0);
  });

  it("lists mock projects", async () => {
    await connector.checkConnection();
    const projects = await connector.listProjects();
    expect(projects.length).toBeGreaterThanOrEqual(2);
    expect(projects[0].name).toBe("JM Die Team");
  });

  it("lists mock folder tree", async () => {
    await connector.checkConnection();
    const tree = await connector.listFolder(0);
    expect(tree.project_name).toBe("JM Die Team");
    expect(tree.subfolders.length).toBeGreaterThan(0);
  });

  it("searches mock files", async () => {
    await connector.checkConnection();
    const files = await connector.searchFiles("PUNCH");
    expect(files.length).toBeGreaterThan(0);
    expect(files[0].name).toContain("PUNCH");
  });

  it("searches with extension filter", async () => {
    await connector.checkConnection();
    const files = await connector.searchFiles("", "f3d");
    expect(files.every(f => f.extension === "f3d")).toBe(true);
  });

  it("gets mock file metadata with CAM", async () => {
    await connector.checkConnection();
    const meta = await connector.getFileMetadata(0, "f001");
    expect(meta.cam.has_cam).toBe(true);
    expect(meta.cam.setups.length).toBeGreaterThan(0);
    expect(meta.design.body_count).toBeGreaterThan(0);
  });

  it("gets mock file versions", async () => {
    await connector.checkConnection();
    const versions = await connector.getFileVersions(0, "f001");
    expect(versions.version_count).toBeGreaterThan(0);
    expect(versions.versions.length).toBe(versions.version_count);
  });

  it("auto mode falls back to mock when bridge unreachable", async () => {
    const autoConnector = new FusionCloudConnectorEngine({ mode: "auto" });
    const status = await autoConnector.checkConnection();
    expect(status.connected).toBe(true);
    expect(status.mode).toBe("mock");
  });
});

// ═══════════════════════════════════════════════════════════════
// PROJECT CRAWLER
// ═══════════════════════════════════════════════════════════════

describe("FusionProjectCrawlerEngine", () => {
  const connector = new FusionCloudConnectorEngine({ mode: "mock" });

  it("crawls JM Die project and finds designs", async () => {
    await connector.checkConnection();
    const tree = await fusionProjectCrawlerEngine.crawl(connector, 0);
    expect(tree.project_name).toBe("JM Die Team");
    expect(tree.total_files).toBeGreaterThan(0);
    expect(tree.total_designs).toBeGreaterThan(0);
    expect(tree.mode).toBe("mock");
  });

  it("detects designs with CAM", async () => {
    await connector.checkConnection();
    const tree = await fusionProjectCrawlerEngine.crawl(connector, 0);
    expect(tree.designs_with_cam).toBeGreaterThan(0);
    const camDesigns = tree.designs.filter(d => d.has_cam);
    expect(camDesigns.length).toBe(tree.designs_with_cam);
  });

  it("extracts operation and tool counts per design", async () => {
    await connector.checkConnection();
    const tree = await fusionProjectCrawlerEngine.crawl(connector, 0);
    const withCam = tree.designs.find(d => d.has_cam);
    expect(withCam).toBeDefined();
    expect(withCam!.operation_count).toBeGreaterThan(0);
    expect(withCam!.tool_count).toBeGreaterThan(0);
    expect(withCam!.setup_count).toBeGreaterThan(0);
  });

  it("builds folder structure", async () => {
    await connector.checkConnection();
    const tree = await fusionProjectCrawlerEngine.crawl(connector, 0);
    expect(tree.folder_structure.length).toBeGreaterThan(0);
  });

  it("extracts strategy names", async () => {
    await connector.checkConnection();
    const tree = await fusionProjectCrawlerEngine.crawl(connector, 0);
    const withCam = tree.designs.find(d => d.has_cam);
    expect(withCam!.strategies.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// CAM EXTRACTOR
// ═══════════════════════════════════════════════════════════════

describe("FusionCAMExtractorEngine", () => {
  const connector = new FusionCloudConnectorEngine({ mode: "mock" });

  it("extracts CAM data from a single file", async () => {
    await connector.checkConnection();
    const result = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    expect(result.has_cam).toBe(true);
    expect(result.setups.length).toBeGreaterThan(0);
    expect(result.total_operations).toBeGreaterThan(0);
    expect(result.tools_used.length).toBeGreaterThan(0);
  });

  it("calculates chip loads and surface speed", async () => {
    await connector.checkConnection();
    const result = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    const sfData = result.speed_feed_data;
    expect(sfData.length).toBeGreaterThan(0);
    const entry = sfData.find(s => s.chip_load_mm !== null);
    expect(entry).toBeDefined();
    expect(entry!.chip_load_mm).toBeGreaterThan(0);
    expect(entry!.surface_speed_m_min).toBeGreaterThan(0);
  });

  it("batch extracts from multiple files", async () => {
    await connector.checkConnection();
    const batch = await fusionCAMExtractorEngine.batchExtract(connector, 0, [
      { id: "f001", name: "PUNCH HOLDER.f3d" },
      { id: "f002", name: "STRIPPER PLATE.f3d" },
      { id: "f003", name: "DIE BLOCK.f3d" },
    ]);
    expect(batch.total_files).toBe(3);
    expect(batch.files_with_cam).toBe(3);
    expect(batch.aggregate.total_operations).toBeGreaterThan(0);
    expect(batch.aggregate.unique_tools).toBeGreaterThan(0);
    expect(batch.aggregate.unique_strategies.length).toBeGreaterThan(0);
  });

  it("extracts strategy names", async () => {
    await connector.checkConnection();
    const result = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    expect(result.strategies_used.length).toBeGreaterThan(0);
    expect(result.strategies_used).toContain("adaptive_clearing");
  });
});

// ═══════════════════════════════════════════════════════════════
// TOOL LIBRARY EXTRACTOR
// ═══════════════════════════════════════════════════════════════

describe("FusionToolLibraryExtractorEngine", () => {
  it("builds tool library from CAM data", () => {
    const result = fusionToolLibraryExtractorEngine.buildFromCAMData([
      { tool: { description: "1/2 EM 4FL", type: "flat end mill", diameter_mm: 12.7, flute_count: 4 }, program: "PART1.f3d", speed_feed: { rpm: 6000, feed_mm_min: 2400 } },
      { tool: { description: "1/2 EM 4FL", type: "flat end mill", diameter_mm: 12.7, flute_count: 4 }, program: "PART2.f3d", speed_feed: { rpm: 5500, feed_mm_min: 2200 } },
      { tool: { description: "#7 Drill", type: "drill", diameter_mm: 5.105, flute_count: 2 }, program: "PART1.f3d", speed_feed: { rpm: 3500, feed_mm_min: 700 } },
    ]);

    expect(result.library.tools.length).toBe(2);
    expect(result.duplicate_count).toBe(1);

    const em = result.library.tools.find(t => t.type === "flat end mill");
    expect(em).toBeDefined();
    expect(em!.usage_count).toBe(2);
    expect(em!.usage_programs).toContain("PART1.f3d");
    expect(em!.usage_programs).toContain("PART2.f3d");
    expect(em!.speed_feed_presets.length).toBe(2);
  });

  it("maps Fusion tool types to PRISM types", () => {
    const result = fusionToolLibraryExtractorEngine.buildFromCAMData([
      { tool: { description: "Ball EM", type: "ball end mill", diameter_mm: 6.0, flute_count: 2 }, program: "P1.f3d" },
      { tool: { description: "Face", type: "face mill", diameter_mm: 50.0, flute_count: 5 }, program: "P1.f3d" },
      { tool: { description: "Tap", type: "tap", diameter_mm: 6.0, flute_count: 3 }, program: "P1.f3d" },
    ]);

    const mappings = result.prism_mappings;
    expect(mappings.find(m => m.prism_tool_type === "endmill_ball")).toBeDefined();
    expect(mappings.find(m => m.prism_tool_type === "facemill")).toBeDefined();
    expect(mappings.find(m => m.prism_tool_type === "tap")).toBeDefined();
    expect(mappings.every(m => m.confidence > 0.5)).toBe(true);
  });

  it("detects unmapped tool types", () => {
    const result = fusionToolLibraryExtractorEngine.buildFromCAMData([
      { tool: { description: "Custom", type: "exotic_widget", diameter_mm: 10, flute_count: 1 }, program: "P1.f3d" },
    ]);
    expect(result.unmapped_count).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// SETUP DOCUMENT GENERATOR
// ═══════════════════════════════════════════════════════════════

describe("FusionSetupDocumentEngine", () => {
  const connector = new FusionCloudConnectorEngine({ mode: "mock" });

  it("generates setup document from CAM extraction", async () => {
    await connector.checkConnection();
    const extraction = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    const doc = fusionSetupDocumentEngine.generate(extraction);

    expect(doc.filename).toBe("PUNCH HOLDER.f3d");
    expect(doc.setups.length).toBeGreaterThan(0);
    expect(doc.summary.total_setups).toBeGreaterThan(0);
    expect(doc.summary.total_operations).toBeGreaterThan(0);
    expect(doc.summary.total_tools).toBeGreaterThan(0);
    expect(doc.summary.estimated_cycle_min).toBeGreaterThan(0);
  });

  it("generates tool list per setup", async () => {
    await connector.checkConnection();
    const extraction = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    const doc = fusionSetupDocumentEngine.generate(extraction);

    for (const setup of doc.setups) {
      expect(setup.tool_list.length).toBeGreaterThan(0);
      expect(setup.operations.length).toBeGreaterThan(0);
      for (const tool of setup.tool_list) {
        expect(tool.station).toBeGreaterThan(0);
        expect(tool.diameter_mm).toBeGreaterThan(0);
      }
    }
  });

  it("renders text report", async () => {
    await connector.checkConnection();
    const extraction = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    const doc = fusionSetupDocumentEngine.generate(extraction);
    const text = fusionSetupDocumentEngine.renderText(doc);

    expect(text).toContain("SETUP SHEET");
    expect(text).toContain("PUNCH HOLDER");
    expect(text).toContain("Setup 1");
    expect(text).toContain("TOTAL:");
  });

  it("infers fixture and datum from setup name", async () => {
    await connector.checkConnection();
    const extraction = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    const doc = fusionSetupDocumentEngine.generate(extraction);

    for (const setup of doc.setups) {
      expect(setup.fixture.length).toBeGreaterThan(0);
      expect(setup.datum).toMatch(/G5\d/);
    }
  });

  it("adds notes for adaptive clearing and micro tools", async () => {
    await connector.checkConnection();
    const extraction = await fusionCAMExtractorEngine.extract(connector, 0, "f001", "PUNCH HOLDER.f3d");
    const doc = fusionSetupDocumentEngine.generate(extraction);

    // Mock data includes adaptive clearing
    const hasAdaptiveNote = doc.setups.some(s =>
      s.notes.some(n => n.includes("Adaptive"))
    );
    expect(hasAdaptiveNote).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════

describe("BOX-MS6 Schemas", () => {
  it("BoxFusionConnectSchema accepts valid modes", () => {
    expect(BoxFusionConnectSchema.safeParse({}).success).toBe(true);
    expect(BoxFusionConnectSchema.safeParse({ mode: "mock" }).success).toBe(true);
    expect(BoxFusionConnectSchema.safeParse({ mode: "live" }).success).toBe(true);
  });

  it("BoxFusionCrawlProjectSchema validates project_index", () => {
    expect(BoxFusionCrawlProjectSchema.safeParse({}).success).toBe(true);
    expect(BoxFusionCrawlProjectSchema.safeParse({ project_index: -1 }).success).toBe(false);
  });

  it("BoxFusionExtractCAMSchema requires files array", () => {
    expect(BoxFusionExtractCAMSchema.safeParse({ files: [] }).success).toBe(false);
    expect(BoxFusionExtractCAMSchema.safeParse({
      files: [{ id: "f1", name: "test.f3d" }],
    }).success).toBe(true);
  });

  it("BoxFusionExtractToolsSchema validates tool structure", () => {
    expect(BoxFusionExtractToolsSchema.safeParse({ cam_tools: [] }).success).toBe(false);
    expect(BoxFusionExtractToolsSchema.safeParse({
      cam_tools: [{
        tool: { description: "EM", type: "flat end mill", diameter_mm: 10, flute_count: 4 },
        program: "test.f3d",
      }],
    }).success).toBe(true);
  });

  it("BOX_ACTION_SCHEMAS includes MS6 actions", () => {
    expect(BOX_ACTION_SCHEMAS.box_fusion_connect).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_fusion_list_projects).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_fusion_crawl_project).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_fusion_extract_cam).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_fusion_extract_tools).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_fusion_setup_doc).toBeDefined();
  });
});
