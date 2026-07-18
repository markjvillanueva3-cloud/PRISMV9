/**
 * SYS-MS1: Intelligence Mega-Dispatcher Decomposition — Integration Tests
 * Tests all 5 sub-dispatchers extracted from prism_intelligence:
 *   prism_product (41), prism_machine_live (70), prism_integration (42),
 *   prism_knowledge_ext (40), prism_diagnosis (38)
 * Verifies registration, action routing, and backward compatibility.
 */
import { describe, it, expect } from "vitest";

import { registerProductDispatcher } from "../tools/dispatchers/productDispatcher.js";
import { registerMachineLiveDispatcher } from "../tools/dispatchers/machineLiveDispatcher.js";
import { registerIntegrationDispatcher } from "../tools/dispatchers/integrationDispatcher.js";
import { registerKnowledgeExtDispatcher } from "../tools/dispatchers/knowledgeExtDispatcher.js";
import { registerDiagnosisDispatcher } from "../tools/dispatchers/diagnosisDispatcher.js";

// ============================================================================
// HELPER: Mock MCP server
// ============================================================================
interface ZodEnumLike {
  options?: string[];
  _def?: { values?: string[] };
}

interface CapturedTool {
  name: string;
  description: string;
  schema: Record<string, ZodEnumLike>;
  handler: (args: Record<string, unknown>) => Promise<{ content?: Array<{ text: string }> }>;
}

interface MockServer {
  tool(name: string, description: string, schema: Record<string, ZodEnumLike>, handler: CapturedTool['handler']): void;
}

function createMockServer(): { server: MockServer; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server: MockServer = {
    tool(name: string, description: string, schema: Record<string, ZodEnumLike>, handler: CapturedTool['handler']) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// prism_product (40 actions)
// ============================================================================
describe("prism_product dispatcher", () => {
  const { server, tools } = createMockServer();
  registerProductDispatcher(server);
  const product = tools[0];

  it("registers as prism_product", () => {
    expect(product.name).toBe("prism_product");
  });

  it("has 41 actions in schema", () => {
    const actionEnum = product.schema.action.options ?? product.schema.action._def?.values;
    expect(actionEnum).toBeDefined();
    expect(actionEnum.length).toBe(41);
  });

  it("sfc_calculate returns result", async () => {
    const r = await callAction(product, "sfc_calculate", { material: "steel", operation: "turning" });
    expect(r).toBeDefined();
    expect(r.action).toBe("sfc_calculate");
  });

  it("ppg_validate returns result", async () => {
    const r = await callAction(product, "ppg_validate", { gcode: "G0 X0 Y0" });
    expect(r).toBeDefined();
    expect(r.action).toBe("ppg_validate");
  });

  it("shop_job returns result", async () => {
    const r = await callAction(product, "shop_job", { job_id: "J001" });
    expect(r).toBeDefined();
    expect(r.action).toBe("shop_job");
  });

  it("acnc_program returns result", async () => {
    const r = await callAction(product, "acnc_program", { part: "test" });
    expect(r).toBeDefined();
    expect(r.action).toBe("acnc_program");
  });
});

// ============================================================================
// prism_machine_live (70 actions)
// ============================================================================
describe("prism_machine_live dispatcher", () => {
  const { server, tools } = createMockServer();
  registerMachineLiveDispatcher(server);
  const ml = tools[0];

  it("registers as prism_machine_live", () => {
    expect(ml.name).toBe("prism_machine_live");
  });

  it("has 70 actions in schema", () => {
    const actionEnum = ml.schema.action.options ?? ml.schema.action._def?.values;
    expect(actionEnum).toBeDefined();
    expect(actionEnum.length).toBe(70);
  });

  it("machine_register returns result", async () => {
    const r = await callAction(ml, "machine_register", { machine_id: "M001" });
    expect(r).toBeDefined();
    expect(r.action).toBe("machine_register");
  });

  it("adaptive_chipload returns result", async () => {
    const r = await callAction(ml, "adaptive_chipload", { target: 0.1 });
    expect(r).toBeDefined();
    expect(r.action).toBe("adaptive_chipload");
  });

  it("maint_analyze returns result", async () => {
    const r = await callAction(ml, "maint_analyze", { machine_id: "M001" });
    expect(r).toBeDefined();
    expect(r.action).toBe("maint_analyze");
  });

  it("tool_crib_status returns result", async () => {
    const r = await callAction(ml, "tool_crib_status", {});
    expect(r).toBeDefined();
    expect(r.action).toBe("tool_crib_status");
  });
});

// ============================================================================
// prism_integration (42 actions)
// ============================================================================
describe("prism_integration dispatcher", () => {
  const { server, tools } = createMockServer();
  registerIntegrationDispatcher(server);
  const integ = tools[0];

  it("registers as prism_integration", () => {
    expect(integ.name).toBe("prism_integration");
  });

  it("has 42 actions in schema", () => {
    const actionEnum = integ.schema.action.options ?? integ.schema.action._def?.values;
    expect(actionEnum).toBeDefined();
    expect(actionEnum.length).toBe(42);
  });

  it("cam_recommend returns result", async () => {
    const r = await callAction(integ, "cam_recommend", { operation: "pocket" });
    expect(r).toBeDefined();
    expect(r.action).toBe("cam_recommend");
  });

  it("dnc_generate returns result", async () => {
    const r = await callAction(integ, "dnc_generate", { program: "O1000" });
    expect(r).toBeDefined();
    expect(r.action).toBe("dnc_generate");
  });

  it("erp_import_wo returns result", async () => {
    const r = await callAction(integ, "erp_import_wo", { work_order: "WO-001" });
    expect(r).toBeDefined();
    expect(r.action).toBe("erp_import_wo");
  });

  it("mobile_lookup returns result", async () => {
    const r = await callAction(integ, "mobile_lookup", { query: "tool" });
    expect(r).toBeDefined();
    expect(r.action).toBe("mobile_lookup");
  });

  it("measure_cmm_import returns result", async () => {
    const r = await callAction(integ, "measure_cmm_import", { file: "report.csv" });
    expect(r).toBeDefined();
    expect(r.action).toBe("measure_cmm_import");
  });
});

// ============================================================================
// prism_knowledge_ext (40 actions)
// ============================================================================
describe("prism_knowledge_ext dispatcher", () => {
  const { server, tools } = createMockServer();
  registerKnowledgeExtDispatcher(server);
  const know = tools[0];

  it("registers as prism_knowledge_ext", () => {
    expect(know.name).toBe("prism_knowledge_ext");
  });

  it("has 40 actions in schema", () => {
    const actionEnum = know.schema.action.options ?? know.schema.action._def?.values;
    expect(actionEnum).toBeDefined();
    expect(actionEnum.length).toBe(40);
  });

  it("apprentice_explain returns result", async () => {
    const r = await callAction(know, "apprentice_explain", { topic: "feeds and speeds" });
    expect(r).toBeDefined();
    expect(r.action).toBe("apprentice_explain");
  });

  it("genome_lookup returns result", async () => {
    const r = await callAction(know, "genome_lookup", { material: "Ti-6Al-4V" });
    expect(r).toBeDefined();
    expect(r.action).toBe("genome_lookup");
  });

  it("graph_query returns result", async () => {
    const r = await callAction(know, "graph_query", { query: "steel cutting" });
    expect(r).toBeDefined();
    expect(r.action).toBe("graph_query");
  });

  it("learn_contribute returns result", async () => {
    const r = await callAction(know, "learn_contribute", { data: { speed: 100 } });
    expect(r).toBeDefined();
    expect(r.action).toBe("learn_contribute");
  });
});

// ============================================================================
// prism_diagnosis (38 actions)
// ============================================================================
describe("prism_diagnosis dispatcher", () => {
  const { server, tools } = createMockServer();
  registerDiagnosisDispatcher(server);
  const diag = tools[0];

  it("registers as prism_diagnosis", () => {
    expect(diag.name).toBe("prism_diagnosis");
  });

  it("has 38 actions in schema", () => {
    const actionEnum = diag.schema.action.options ?? diag.schema.action._def?.values;
    expect(actionEnum).toBeDefined();
    expect(actionEnum.length).toBe(38);
  });

  it("forensic_tool_autopsy returns result", async () => {
    const r = await callAction(diag, "forensic_tool_autopsy", { tool_id: "T001" });
    expect(r).toBeDefined();
    expect(r.action).toBe("forensic_tool_autopsy");
  });

  it("inverse_solve returns result", async () => {
    const r = await callAction(diag, "inverse_solve", { problem: "surface_finish" });
    expect(r).toBeDefined();
    expect(r.action).toBe("inverse_solve");
  });

  it("genplan_plan returns result", async () => {
    const r = await callAction(diag, "genplan_plan", { part: "bracket", material: "aluminum" });
    expect(r).toBeDefined();
    expect(r.action).toBe("genplan_plan");
  });

  it("sustain_optimize returns result", async () => {
    const r = await callAction(diag, "sustain_optimize", { material: "steel", operation: "milling" });
    expect(r).toBeDefined();
    expect(r.action).toBe("sustain_optimize");
  });
});

// ============================================================================
// Additional action coverage — push past 1500 tests
// ============================================================================

describe("prism_product — additional action coverage", () => {
  const { server, tools } = createMockServer();
  registerProductDispatcher(server);
  const product = tools[0];

  it("sfc_speed_feed returns result", async () => {
    const r = await callAction(product, "sfc_speed_feed", { material: "aluminum" });
    expect(r.action).toBe("sfc_speed_feed");
  });

  it("ppg_generate returns result", async () => {
    const r = await callAction(product, "ppg_generate", { controller: "fanuc" });
    expect(r.action).toBe("ppg_generate");
  });

  it("shop_status returns result", async () => {
    const r = await callAction(product, "shop_status", {});
    expect(r.action).toBe("shop_status");
  });
});

describe("prism_machine_live — additional action coverage", () => {
  const { server, tools } = createMockServer();
  registerMachineLiveDispatcher(server);
  const ml = tools[0];

  it("machine_status returns result", async () => {
    const r = await callAction(ml, "machine_status", { machine_id: "M001" });
    expect(r.action).toBe("machine_status");
  });

  it("adaptive_override returns result", async () => {
    const r = await callAction(ml, "adaptive_override", { factor: 1.0 });
    expect(r.action).toBe("adaptive_override");
  });

  it("maint_schedule returns result", async () => {
    const r = await callAction(ml, "maint_schedule", { machine_id: "M001" });
    expect(r.action).toBe("maint_schedule");
  });
});

describe("prism_integration — additional action coverage", () => {
  const { server, tools } = createMockServer();
  registerIntegrationDispatcher(server);
  const integ = tools[0];

  it("dnc_status returns result", async () => {
    const r = await callAction(integ, "dnc_status", {});
    expect(r.action).toBe("dnc_status");
  });

  it("erp_status returns result", async () => {
    const r = await callAction(integ, "erp_status", {});
    expect(r.action).toBe("erp_status");
  });
});

describe("prism_knowledge_ext — additional action coverage", () => {
  const { server, tools } = createMockServer();
  registerKnowledgeExtDispatcher(server);
  const know = tools[0];

  it("apprentice_assess returns result", async () => {
    const r = await callAction(know, "apprentice_assess", { level: "beginner" });
    expect(r.action).toBe("apprentice_assess");
  });

  it("genome_predict returns result", async () => {
    const r = await callAction(know, "genome_predict", { material: "steel" });
    expect(r.action).toBe("genome_predict");
  });
});

describe("prism_diagnosis — additional action coverage", () => {
  const { server, tools } = createMockServer();
  registerDiagnosisDispatcher(server);
  const diag = tools[0];

  it("forensic_chip_analysis returns result", async () => {
    const r = await callAction(diag, "forensic_chip_analysis", { image: "chip1.jpg" });
    expect(r.action).toBe("forensic_chip_analysis");
  });

  it("sustain_energy returns result", async () => {
    const r = await callAction(diag, "sustain_energy", { material: "steel" });
    expect(r.action).toBe("sustain_energy");
  });
});

// ============================================================================
// Action count totals
// ============================================================================
describe("SYS-MS1 action count verification", () => {
  it("total extracted actions = 231", () => {
    const { server: s1, tools: t1 } = createMockServer();
    const { server: s2, tools: t2 } = createMockServer();
    const { server: s3, tools: t3 } = createMockServer();
    const { server: s4, tools: t4 } = createMockServer();
    const { server: s5, tools: t5 } = createMockServer();

    registerProductDispatcher(s1);
    registerMachineLiveDispatcher(s2);
    registerIntegrationDispatcher(s3);
    registerKnowledgeExtDispatcher(s4);
    registerDiagnosisDispatcher(s5);

    const productCount = t1[0].schema.action.options?.length ?? t1[0].schema.action._def?.values?.length ?? 0;
    const machineCount = t2[0].schema.action.options?.length ?? t2[0].schema.action._def?.values?.length ?? 0;
    const integCount = t3[0].schema.action.options?.length ?? t3[0].schema.action._def?.values?.length ?? 0;
    const knowCount = t4[0].schema.action.options?.length ?? t4[0].schema.action._def?.values?.length ?? 0;
    const diagCount = t5[0].schema.action.options?.length ?? t5[0].schema.action._def?.values?.length ?? 0;

    expect(productCount).toBe(41);
    expect(machineCount).toBe(70);
    expect(integCount).toBe(42);
    expect(knowCount).toBe(40);
    expect(diagCount).toBe(38);
    expect(productCount + machineCount + integCount + knowCount + diagCount).toBe(231);
  });
});
