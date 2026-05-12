/**
 * TebisCAMBridgeEngine Tests
 *
 * Tests for Tebis CAM bridge functionality:
 * - Project extraction
 * - NC output parsing
 * - XML import
 * - Collision validation
 * - PRISM export
 * - Template matching
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  tebisCAMBridgeEngine,
  TebisCAMBridgeEngine,
  type TebisProject,
  type TebisNCJob,
  type TebisOperation,
  type TebisTool,
  type TebisTemplate,
  type TebisMatchingCondition,
} from "../engines/TebisCAMBridgeEngine.js";

describe("TebisCAMBridgeEngine", () => {
  let engine: TebisCAMBridgeEngine;

  beforeEach(() => {
    engine = new TebisCAMBridgeEngine();
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(tebisCAMBridgeEngine).toBeInstanceOf(TebisCAMBridgeEngine);
    });
  });

  describe("extractProject", () => {
    it("should return error for non-existent path", () => {
      const result = engine.extractProject("/non/existent/path/project.tcf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.stats.ncJobCount).toBe(0);
      expect(result.stats.operationCount).toBe(0);
    });

    it("should include extractedAt timestamp", () => {
      const result = engine.extractProject("/non/existent/path");

      expect(result.extractedAt).toBeDefined();
      expect(new Date(result.extractedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe("parseNCOutput", () => {
    it("should parse basic NC program with Tebis comments", () => {
      const ncContent = `
O1234
(TEBIS OPERATION: Roughing Pass 1)
(TOOL: T1 D12.0 FLAT ENDMILL)
(STRATEGY: Adaptive Roughing)
(SPINDLE: 8000 RPM)
(FEED: 2500 MM/MIN)
T1 M6
S8000 M3
G0 X0 Y0 Z50
G1 Z-5 F500
G1 X100 F2500
(END OPERATION)
M30
`;

      const result = engine.parseNCOutput(ncContent);

      expect(result.success).toBe(true);
      expect(result.programNumber).toBe("1234");
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].operationName).toBe("Roughing Pass 1");
      expect(result.operations[0].operationType).toBe("Adaptive Roughing");
      expect(result.operations[0].toolNumber).toBe(1);
      expect(result.operations[0].spindleRpm).toBe(8000);
      expect(result.operations[0].feedRate).toBe(2500);
    });

    it("should extract multiple operations", () => {
      const ncContent = `
O5000
(TEBIS OPERATION: Rough Cavity)
(TOOL: T1 D20.0)
T1 M6
S6000 M3
G0 Z50
(END OPERATION)

(TEBIS OPERATION: Semi-Finish)
(TOOL: T2 D10.0)
T2 M6
S10000 M3
G0 Z50
(END OPERATION)

(TEBIS OPERATION: Finish)
(TOOL: T3 D6.0)
T3 M6
S12000 M3
G0 Z50
(END OPERATION)
M30
`;

      const result = engine.parseNCOutput(ncContent);

      expect(result.success).toBe(true);
      expect(result.operations).toHaveLength(3);
      expect(result.operations[0].operationName).toBe("Rough Cavity");
      expect(result.operations[1].operationName).toBe("Semi-Finish");
      expect(result.operations[2].operationName).toBe("Finish");
    });

    it("should extract tools from comments", () => {
      const ncContent = `
O1000
(TOOL: T1 D12.0 FLAT ENDMILL)
T1 M6
(TOOL: T2 D6.0 BALL ENDMILL)
T2 M6
M30
`;

      const result = engine.parseNCOutput(ncContent);

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].toolNumber).toBe(1);
      expect(result.tools[0].diameter).toBe(12.0);
      expect(result.tools[1].toolNumber).toBe(2);
      expect(result.tools[1].diameter).toBe(6.0);
    });

    it("should handle spindle and feed from G-code", () => {
      const ncContent = `
O2000
(TEBIS OPERATION: Test Op)
T1 M6
S9500 M3
G1 X100 F3000
(END OPERATION)
`;

      const result = engine.parseNCOutput(ncContent);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].spindleRpm).toBe(9500);
      expect(result.operations[0].feedRate).toBe(3000);
    });

    it("should calculate estimated time from blocks", () => {
      const ncContent = `
O3000
(TEBIS OPERATION: Long Op)
G0 X0 Y0
G1 X10
G1 X20
G1 X30
G1 X40
G1 X50
(END OPERATION)
`;

      const result = engine.parseNCOutput(ncContent);

      expect(result.success).toBe(true);
      expect(result.estimatedTime).toBeGreaterThan(0);
      expect(result.totalBlocks).toBeGreaterThan(0);
    });

    it("should handle empty NC content", () => {
      const result = engine.parseNCOutput("");

      expect(result.success).toBe(true);
      expect(result.operations).toHaveLength(0);
      expect(result.tools).toHaveLength(0);
    });
  });

  describe("importXMLExport", () => {
    it("should reject invalid XML without Tebis root", () => {
      const invalidXml = `<SomeOtherRoot><data>test</data></SomeOtherRoot>`;

      const result = engine.importXMLExport(invalidXml);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Invalid Tebis XML");
    });

    it("should parse basic TebisProject XML", () => {
      const xml = `
<TebisProject>
  <Version>4.1</Version>
  <ProjectName>Test Mold</ProjectName>
  <CADModel>part.step</CADModel>
  <NCJob>
    <JobId>job_1</JobId>
    <JobName>Roughing Job</JobName>
    <MachineId>machine_1</MachineId>
  </NCJob>
  <Tool>
    <ToolId>tool_1</ToolId>
    <ToolName>12mm Flat Endmill</ToolName>
    <Diameter>12</Diameter>
    <Flutes>4</Flutes>
    <ToolNumber>1</ToolNumber>
  </Tool>
</TebisProject>
`;

      const result = engine.importXMLExport(xml);

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project!.version).toBe("4.1");
      expect(result.project!.projectName).toBe("Test Mold");
      expect(result.project!.ncJobs).toHaveLength(1);
      expect(result.project!.ncJobs![0].jobName).toBe("Roughing Job");
      expect(result.project!.tools).toHaveLength(1);
      expect(result.project!.tools![0].diameter).toBe(12);
    });

    it("should warn when no NCJobs or tools found", () => {
      const xml = `<TebisProject><Version>4.0</Version></TebisProject>`;

      const result = engine.importXMLExport(xml);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("No NCJobs or tools found");
    });

    it("should skip tools with invalid diameter", () => {
      const xml = `
<TebisProject>
  <Tool>
    <ToolId>tool_bad</ToolId>
    <Diameter>0</Diameter>
  </Tool>
  <Tool>
    <ToolId>tool_good</ToolId>
    <Diameter>10</Diameter>
  </Tool>
</TebisProject>
`;

      const result = engine.importXMLExport(xml);

      expect(result.success).toBe(true);
      expect(result.project!.tools).toHaveLength(1);
      expect(result.project!.tools![0].diameter).toBe(10);
    });
  });

  describe("getNCJobs", () => {
    it("should return NCJobs sorted by sequence number", () => {
      const project = createMockProject();
      project.ncJobs = [
        createMockNCJob("job_3", 3),
        createMockNCJob("job_1", 1),
        createMockNCJob("job_2", 2),
      ];

      const jobs = engine.getNCJobs(project);

      expect(jobs).toHaveLength(3);
      expect(jobs[0].jobId).toBe("job_1");
      expect(jobs[1].jobId).toBe("job_2");
      expect(jobs[2].jobId).toBe("job_3");
    });
  });

  describe("getTools", () => {
    it("should return tools sorted by tool number", () => {
      const project = createMockProject();
      project.tools = [
        createMockTool("tool_5", 5),
        createMockTool("tool_1", 1),
        createMockTool("tool_3", 3),
      ];

      const tools = engine.getTools(project);

      expect(tools).toHaveLength(3);
      expect(tools[0].toolNumber).toBe(1);
      expect(tools[1].toolNumber).toBe(3);
      expect(tools[2].toolNumber).toBe(5);
    });
  });

  describe("getTemplates", () => {
    it("should return all templates", () => {
      const project = createMockProject();
      project.templates = [
        createMockTemplate("template_1"),
        createMockTemplate("template_2"),
      ];

      const templates = engine.getTemplates(project);

      expect(templates).toHaveLength(2);
    });
  });

  describe("getOperations", () => {
    it("should return operations sorted by sequence number", () => {
      const ncJob = createMockNCJob("job_1", 1);
      ncJob.operations = [
        createMockOperation("op_3", 3),
        createMockOperation("op_1", 1),
        createMockOperation("op_2", 2),
      ];

      const ops = engine.getOperations(ncJob);

      expect(ops).toHaveLength(3);
      expect(ops[0].operationId).toBe("op_1");
      expect(ops[1].operationId).toBe("op_2");
      expect(ops[2].operationId).toBe("op_3");
    });
  });

  describe("validateCollisionStatus", () => {
    it("should report clear status when no collisions", () => {
      const ncJob = createMockNCJob("job_1", 1);
      ncJob.operations = [
        { ...createMockOperation("op_1", 1), collisionStatus: "clear" },
        { ...createMockOperation("op_2", 2), collisionStatus: "clear" },
      ];

      const report = engine.validateCollisionStatus(ncJob);

      expect(report.overallStatus).toBe("clear");
      expect(report.collisionCount).toBe(0);
      expect(report.warningCount).toBe(0);
    });

    it("should report collision status when collisions exist", () => {
      const ncJob = createMockNCJob("job_1", 1);
      ncJob.operations = [
        {
          ...createMockOperation("op_1", 1),
          collisionStatus: "collision",
          collisionDetails: [{
            operationId: "op_1",
            collisionType: "tool_part",
            severity: "collision",
            position: { x: 10, y: 20, z: 5 },
            distance: -0.5,
            description: "Tool collision with part wall",
          }],
        },
      ];

      const report = engine.validateCollisionStatus(ncJob);

      expect(report.overallStatus).toBe("collision");
      expect(report.collisionCount).toBe(1);
      expect(report.details).toHaveLength(1);
    });

    it("should report warnings for unchecked operations", () => {
      const ncJob = createMockNCJob("job_1", 1);
      ncJob.operations = [
        { ...createMockOperation("op_1", 1), collisionStatus: "not_checked" },
      ];

      const report = engine.validateCollisionStatus(ncJob);

      expect(report.overallStatus).toBe("warnings");
      expect(report.warningCount).toBe(1);
      expect(report.details[0].severity).toBe("warning");
    });
  });

  describe("validateProjectCollisions", () => {
    it("should validate all NCJobs in project", () => {
      const project = createMockProject();
      project.ncJobs = [
        createMockNCJob("job_1", 1),
        createMockNCJob("job_2", 2),
      ];

      const reports = engine.validateProjectCollisions(project);

      expect(reports).toHaveLength(2);
      expect(reports[0].ncJobId).toBe("job_1");
      expect(reports[1].ncJobId).toBe("job_2");
    });
  });

  describe("exportToPRISM", () => {
    it("should convert project to PRISM format", () => {
      const project = createMockProject();
      project.projectName = "Test Project";
      project.version = "4.1";
      project.ncJobs = [createMockNCJob("job_1", 1)];
      project.ncJobs[0].operations = [createMockOperation("op_1", 1)];
      project.tools = [createMockTool("tool_1", 1)];

      const prismProject = engine.exportToPRISM(project);

      expect(prismProject.source).toBe("tebis");
      expect(prismProject.sourceVersion).toBe("4.1");
      expect(prismProject.projectName).toBe("Test Project");
      expect(prismProject.operations).toHaveLength(1);
      expect(prismProject.tools).toHaveLength(1);
      expect(prismProject.setups).toHaveLength(1);
    });

    it("should extract setups from NCJobs", () => {
      const project = createMockProject();
      const job1 = createMockNCJob("job_1", 1);
      job1.setup = {
        setupId: "setup_1",
        setupName: "Setup 1",
        coordinateSystemId: "cs_1",
        clampingDescription: "Vise",
        setupNumber: 1,
      };
      const job2 = createMockNCJob("job_2", 2);
      job2.setup = {
        setupId: "setup_2",
        setupName: "Setup 2",
        coordinateSystemId: "cs_2",
        clampingDescription: "Fixture",
        setupNumber: 2,
      };
      project.ncJobs = [job1, job2];

      const prismProject = engine.exportToPRISM(project);

      expect(prismProject.setups).toHaveLength(2);
      expect(prismProject.setups[0].name).toBe("Setup 1");
      expect(prismProject.setups[1].name).toBe("Setup 2");
    });

    it("should deduplicate setups when same setup used across jobs", () => {
      const project = createMockProject();
      const sharedSetup = {
        setupId: "setup_1",
        setupName: "Shared Setup",
        coordinateSystemId: "cs_1",
        clampingDescription: "Vise",
        setupNumber: 1,
      };
      const job1 = createMockNCJob("job_1", 1);
      job1.setup = sharedSetup;
      const job2 = createMockNCJob("job_2", 2);
      job2.setup = sharedSetup;
      project.ncJobs = [job1, job2];

      const prismProject = engine.exportToPRISM(project);

      expect(prismProject.setups).toHaveLength(1);
    });

    it("should include extractedAt timestamp", () => {
      const project = createMockProject();

      const prismProject = engine.exportToPRISM(project);

      expect(prismProject.extractedAt).toBeDefined();
      expect(new Date(prismProject.extractedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe("findMatchingTemplates", () => {
    it("should match templates by equality condition", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("mold_template", [
          { property: "featureType", operator: "eq", value: "cavity" },
        ]),
      ];

      const matches = engine.findMatchingTemplates(templates, { featureType: "cavity" });

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(1);
    });

    it("should match templates by numeric conditions", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("small_pocket", [
          { property: "depth", operator: "lt", value: 10 },
          { property: "width", operator: "gte", value: 5 },
        ]),
      ];

      const matches = engine.findMatchingTemplates(templates, { depth: 8, width: 6 });

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(1);
    });

    it("should calculate partial confidence for partial matches", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("partial_match", [
          { property: "type", operator: "eq", value: "pocket" },
          { property: "depth", operator: "gt", value: 20 },
        ]),
      ];

      const matches = engine.findMatchingTemplates(templates, { type: "pocket", depth: 10 });

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(0.5);
    });

    it("should match templates by contains condition", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("steel_template", [
          { property: "material", operator: "contains", value: "steel" },
        ]),
      ];

      const matches = engine.findMatchingTemplates(templates, { material: "tool_steel_D2" });

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(1);
    });

    it("should match templates by regex condition", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("numbered_feature", [
          { property: "name", operator: "matches", value: "^POCKET_\\d+$" },
        ]),
      ];

      const matches = engine.findMatchingTemplates(templates, { name: "POCKET_123" });

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(1);
    });

    it("should sort matches by confidence", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("low_match", [
          { property: "a", operator: "eq", value: 1 },
          { property: "b", operator: "eq", value: 2 },
          { property: "c", operator: "eq", value: 3 },
        ]),
        createMockTemplateWithConditions("high_match", [
          { property: "a", operator: "eq", value: 1 },
        ]),
      ];

      const matches = engine.findMatchingTemplates(templates, { a: 1 });

      expect(matches).toHaveLength(2);
      expect(matches[0].template.templateId).toBe("high_match");
      expect(matches[0].confidence).toBeGreaterThan(matches[1].confidence);
    });

    it("should return low confidence for templates without conditions", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("no_conditions", []),
      ];

      const matches = engine.findMatchingTemplates(templates, { anything: "value" });

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(0.3);
    });

    it("should not match when property is missing", () => {
      const templates: TebisTemplate[] = [
        createMockTemplateWithConditions("strict_match", [
          { property: "required", operator: "eq", value: "value" },
        ]),
      ];

      const matches = engine.findMatchingTemplates(templates, { other: "property" });

      expect(matches).toHaveLength(0);
    });
  });
});

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function createMockProject(): TebisProject {
  return {
    projectPath: "/test/project.tcf",
    version: "4.1",
    cadModel: "part.step",
    projectName: "Test Project",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    ncJobs: [],
    tools: [],
    templates: [],
    coordinateSystems: [],
    stocks: [],
    machines: [],
    metadata: {},
  };
}

function createMockNCJob(jobId: string, sequence: number): TebisNCJob {
  return {
    jobId,
    jobName: `Job ${sequence}`,
    machineId: "machine_1",
    operations: [],
    simulationStatus: "not_run",
    inputStockId: "stock_1",
    setup: {
      setupId: `setup_${sequence}`,
      setupName: `Setup ${sequence}`,
      coordinateSystemId: "cs_1",
      clampingDescription: "",
      setupNumber: sequence,
    },
    sequenceNumber: sequence,
    inheritStock: true,
    estimatedCycleTime: 0,
    postProcessor: "default",
    metadata: {},
  };
}

function createMockOperation(operationId: string, sequence: number): TebisOperation {
  return {
    operationId,
    operationName: `Operation ${sequence}`,
    operationType: "adaptive_roughing",
    toolId: "tool_1",
    cuttingParams: {
      spindleRpm: 8000,
      surfaceSpeed: 200,
      feedRate: 2500,
      feedPerTooth: 0.1,
      axialDepth: 2,
      radialDepth: 6,
      plungeFeed: 500,
      leadInFeed: 1500,
      leadOutFeed: 1500,
      rapidHeight: 50,
      retractHeight: 5,
    },
    strategyParams: {
      cutDirection: "climb",
      stepDownMode: "constant",
      leadInType: "helix",
      leadOutType: "arc",
      linkingType: "optimized",
    },
    geometryRefs: [],
    tolerance: 0.01,
    stockToLeaveRadial: 0.2,
    stockToLeaveAxial: 0.2,
    collisionStatus: "clear",
    sequenceNumber: sequence,
    isEnabled: true,
    metadata: {},
  };
}

function createMockTool(toolId: string, toolNumber: number): TebisTool {
  return {
    toolId,
    toolName: `Tool ${toolNumber}`,
    toolType: "flat_endmill",
    diameter: 12,
    cornerRadius: 0,
    fluteLength: 30,
    overallLength: 75,
    flutes: 4,
    material: "carbide",
    coating: "TiAlN",
    holderId: "holder_1",
    holderProjection: 45,
    gaugeLength: 75,
    coolant: "flood",
    toolNumber,
    manufacturer: "Test Mfg",
    partNumber: `TM-${toolNumber}`,
    metadata: {},
  };
}

function createMockTemplate(templateId: string): TebisTemplate {
  return {
    templateId,
    templateName: `Template ${templateId}`,
    category: "general_3d",
    featureTypes: ["pocket", "cavity"],
    operations: [],
    parameters: {},
    matchingConditions: [],
    description: "Test template",
    version: "1.0",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

function createMockTemplateWithConditions(
  templateId: string,
  conditions: TebisMatchingCondition[]
): TebisTemplate {
  return {
    ...createMockTemplate(templateId),
    matchingConditions: conditions,
  };
}
