/**
 * Tests for prism_resource_harvester dispatcher
 * RES-MS0 U-RES03: Dispatcher wiring verification
 */
import { describe, it, expect, vi } from "vitest";

// Test schema imports
describe("resourceHarvesterActionSchemas", () => {
  it("exports schemas for all 6 actions", async () => {
    const { ACTION_RESOURCE_HARVESTER_SCHEMAS } = await import(
      "../schemas/resourceHarvesterActionSchemas.js"
    );
    expect(ACTION_RESOURCE_HARVESTER_SCHEMAS).toBeDefined();
    const actions = Object.keys(ACTION_RESOURCE_HARVESTER_SCHEMAS);
    expect(actions).toContain("scan_folder");
    expect(actions).toContain("classify_file");
    expect(actions).toContain("get_index");
    expect(actions).toContain("start_harvest");
    expect(actions).toContain("harvest_status");
    expect(actions).toContain("harvest_resume");
    expect(actions.length).toBe(6);
  });

  it("scan_folder schema validates correct params", async () => {
    const { ACTION_RESOURCE_HARVESTER_SCHEMAS } = await import(
      "../schemas/resourceHarvesterActionSchemas.js"
    );
    const result = ACTION_RESOURCE_HARVESTER_SCHEMAS.scan_folder.safeParse({
      path: "H:/prism/resources/",
      recursive: true,
      max_depth: 5,
    });
    expect(result.success).toBe(true);
  });

  it("scan_folder schema requires path", async () => {
    const { ACTION_RESOURCE_HARVESTER_SCHEMAS } = await import(
      "../schemas/resourceHarvesterActionSchemas.js"
    );
    const result = ACTION_RESOURCE_HARVESTER_SCHEMAS.scan_folder.safeParse({});
    expect(result.success).toBe(false);
  });

  it("classify_file schema validates correct params", async () => {
    const { ACTION_RESOURCE_HARVESTER_SCHEMAS } = await import(
      "../schemas/resourceHarvesterActionSchemas.js"
    );
    const result = ACTION_RESOURCE_HARVESTER_SCHEMAS.classify_file.safeParse({
      file_path: "H:/prism/resources/test.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("start_harvest schema validates with all params", async () => {
    const { ACTION_RESOURCE_HARVESTER_SCHEMAS } = await import(
      "../schemas/resourceHarvesterActionSchemas.js"
    );
    const result = ACTION_RESOURCE_HARVESTER_SCHEMAS.start_harvest.safeParse({
      source_path: "H:/prism/resources/PDF/",
      file_types: ["pdf", "cps"],
      dry_run: true,
    });
    expect(result.success).toBe(true);
  });

  it("get_index schema validates with optional filters", async () => {
    const { ACTION_RESOURCE_HARVESTER_SCHEMAS } = await import(
      "../schemas/resourceHarvesterActionSchemas.js"
    );
    const result = ACTION_RESOURCE_HARVESTER_SCHEMAS.get_index.safeParse({
      filter_type: "pdf",
      filter_domain: "training",
      limit: 50,
    });
    expect(result.success).toBe(true);
  });

  it("get_index schema validates with no params (all optional)", async () => {
    const { ACTION_RESOURCE_HARVESTER_SCHEMAS } = await import(
      "../schemas/resourceHarvesterActionSchemas.js"
    );
    const result = ACTION_RESOURCE_HARVESTER_SCHEMAS.get_index.safeParse({});
    expect(result.success).toBe(true);
  });
});

// Test dispatcher registration
describe("registerResourceHarvesterDispatcher", () => {
  it("registers prism_resource_harvester tool on server", async () => {
    const { registerResourceHarvesterDispatcher } = await import(
      "../tools/dispatchers/resourceHarvesterDispatcher.js"
    );
    const mockServer = {
      tool: vi.fn(),
    };
    registerResourceHarvesterDispatcher(mockServer);
    expect(mockServer.tool).toHaveBeenCalledTimes(1);
    expect(mockServer.tool.mock.calls[0][0]).toBe("prism_resource_harvester");
  });

  it("tool description mentions all 6 actions", async () => {
    const { registerResourceHarvesterDispatcher } = await import(
      "../tools/dispatchers/resourceHarvesterDispatcher.js"
    );
    const mockServer = {
      tool: vi.fn(),
    };
    registerResourceHarvesterDispatcher(mockServer);
    const description = mockServer.tool.mock.calls[0][1];
    expect(description).toContain("scan_folder");
    expect(description).toContain("classify_file");
    expect(description).toContain("get_index");
    expect(description).toContain("start_harvest");
    expect(description).toContain("harvest_status");
    expect(description).toContain("harvest_resume");
  });
});
