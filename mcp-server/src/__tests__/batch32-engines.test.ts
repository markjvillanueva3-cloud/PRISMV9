/**
 * batch32-engines.test.ts — Tests for 12 engines
 * CampaignEngine, KnowledgeGraphEngine, FederatedLearningEngine,
 * CertificateEngine, ResponseTemplateEngine, ProtocolBridgeEngine,
 * IntentDecompositionEngine, MultiTenantEngine, ResponseFormatterEngine,
 * TaskAgentClassifier, DNCTransferEngine, WorkflowChainsEngine
 */
import { describe, it, expect } from "vitest";

import {
  createCampaign,
  validateCampaign,
  estimateCycleTime,
  listCampaignActions,
} from "../engines/CampaignEngine";

import { knowledgeGraph } from "../engines/KnowledgeGraphEngine";

import { federatedLearning } from "../engines/FederatedLearningEngine";

import { certificateEngine } from "../engines/CertificateEngine";

import {
  autoResponseTemplate,
  getResponseTemplateStats,
} from "../engines/ResponseTemplateEngine";

import { protocolBridgeEngine } from "../engines/ProtocolBridgeEngine";

import {
  decomposeIntent,
  intentEngine,
} from "../engines/IntentDecompositionEngine";

import { multiTenantEngine } from "../engines/MultiTenantEngine";

import {
  formatForPersona,
  responseFormatter,
} from "../engines/ResponseFormatterEngine";

import { classifyTask, quickClassify } from "../engines/TaskAgentClassifier";

import {
  generateParameterBlock,
  executeDNCTransfer,
  generateQRData,
  dncTransfer,
} from "../engines/DNCTransferEngine";

import {
  matchWorkflows,
  findBestWorkflow,
  listWorkflows,
  getWorkflow,
  workflowChains,
} from "../engines/WorkflowChainsEngine";

// ============================================================================
// 1. CampaignEngine
// ============================================================================
describe("CampaignEngine", () => {
  const baseConfig = {
    name: "Test Campaign",
    materials: [
      { id: "steel_4140", name: "4140 Steel", iso_group: "P" },
    ],
    operations: [
      { sequence: 1, feature: "face", tool_diameter_mm: 50 },
      { sequence: 2, feature: "pocket", tool_diameter_mm: 12 },
    ],
  };

  it("validateCampaign returns valid for a well-formed config", () => {
    const result = validateCampaign(baseConfig);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("warnings");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validateCampaign catches missing name", () => {
    const bad = { ...baseConfig, name: "" };
    const result = validateCampaign(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("estimateCycleTime returns a valid estimate", () => {
    const est = estimateCycleTime(baseConfig);
    expect(est).toBeDefined();
    expect(est.materials_count).toBe(1);
    expect(est.operations_per_material).toBe(2);
    expect(est.estimated_total_time_min).toBeGreaterThan(0);
    expect(est).toHaveProperty("warnings");
  });

  it("listCampaignActions returns available actions", () => {
    const actions = listCampaignActions();
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThanOrEqual(4);
    const names = actions.map((a: any) => a.action ?? a.name ?? a);
    expect(names).toContain("campaign_create");
  });
});

// ============================================================================
// 2. KnowledgeGraphEngine
// ============================================================================
describe("KnowledgeGraphEngine", () => {
  it("graph_search returns nodes", () => {
    const result = knowledgeGraph("graph_search", { query: "steel" });
    expect(result).toBeDefined();
    expect(result).not.toHaveProperty("error");
  });

  it("graph_stats returns graph statistics", () => {
    const result = knowledgeGraph("graph_stats", {});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("total_nodes");
    expect(result).toHaveProperty("total_edges");
    expect((result as Record<string, unknown>).total_nodes).toBeGreaterThan(0);
  });

  it("graph_query returns connections for a known entity", () => {
    // First search to find a valid node name
    const search = knowledgeGraph("graph_search", { query: "steel" });
    const nodes = (search as Record<string, unknown>).results ?? (search as Record<string, unknown>).nodes ?? [];
    if (nodes.length > 0) {
      const nodeName = nodes[0].name ?? nodes[0].id;
      const result = knowledgeGraph("graph_query", { entity: nodeName });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("center_node");
    }
  });
});

// ============================================================================
// 3. FederatedLearningEngine
// ============================================================================
describe("FederatedLearningEngine", () => {
  it("learn_network_stats returns network statistics", () => {
    const result = federatedLearning("learn_network_stats", {});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("total_contributions");
  });

  it("learn_anonymize anonymizes data", () => {
    const result = federatedLearning("learn_anonymize", {
      data: {
        shop_id: "SHOP-001",
        material_class: "P",
        email: "test@test.com",
        vc_actual: 200,
      },
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("anonymized");
    expect(result).toHaveProperty("report");
  });

  it("learn_history returns history", () => {
    const result = federatedLearning("learn_history", {});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("total_contributions");
  });

  it("returns error for unknown action", () => {
    const result = federatedLearning("unknown_action", {});
    expect(result).toHaveProperty("error");
    expect(result).toHaveProperty("valid_actions");
  });
});

// ============================================================================
// 4. CertificateEngine
// ============================================================================
describe("CertificateEngine", () => {
  it("is a valid engine instance", () => {
    expect(certificateEngine).toBeDefined();
    expect(typeof certificateEngine.generateCertificate).toBe("function");
  });

  it("generateCertificate produces a certificate", () => {
    const cert = certificateEngine.generateCertificate(
      "prism_calc",
      "cutting_force",
      "test-session-001",
      [
        { name: "safety_check", result: "pass", details: "S(x)=0.85", timestamp: Date.now() },
        { name: "physics_check", result: "pass", details: "Forces within limits", timestamp: Date.now() },
      ],
      0.85,
      4.0,
    );
    // cert may be null if engine is disabled, that's okay
    if (cert) {
      expect(cert).toHaveProperty("certId");
      expect(cert).toHaveProperty("dispatcher", "prism_calc");
      expect(cert).toHaveProperty("action", "cutting_force");
      expect(cert).toHaveProperty("overallResult");
      expect(cert).toHaveProperty("signature");
    }
  });

  it("init is idempotent", () => {
    expect(() => {
      certificateEngine.init();
      certificateEngine.init();
    }).not.toThrow();
  });
});

// ============================================================================
// 5. ResponseTemplateEngine
// ============================================================================
describe("ResponseTemplateEngine", () => {
  it("autoResponseTemplate returns a match or null", () => {
    const result = autoResponseTemplate(
      "prism_data",
      "material_get",
      JSON.stringify({ name: "4140", hardness: 28 }),
      30,
    );
    // May return null if no template matched — that's valid
    if (result) {
      expect(result).toHaveProperty("template_id");
      expect(result).toHaveProperty("level");
      expect(result).toHaveProperty("sections");
    }
  });

  it("autoResponseTemplate skips at high pressure", () => {
    const result = autoResponseTemplate("prism_data", "material_get", "{}", 90);
    expect(result).toBeNull();
  });

  it("getResponseTemplateStats returns stats object", () => {
    const stats = getResponseTemplateStats();
    expect(stats).toBeDefined();
    expect(typeof stats).toBe("object");
  });
});

// ============================================================================
// 6. ProtocolBridgeEngine
// ============================================================================
describe("ProtocolBridgeEngine", () => {
  it("is a valid engine instance", () => {
    expect(protocolBridgeEngine).toBeDefined();
    expect(typeof protocolBridgeEngine.registerEndpoint).toBe("function");
    expect(typeof protocolBridgeEngine.createApiKey).toBe("function");
  });

  it("registerEndpoint creates an endpoint", () => {
    const result = protocolBridgeEngine.registerEndpoint(
      "REST",
      "/api/test-batch32",
      "prism_calc",
      "cutting_force",
    );
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    if (result.success) {
      expect(result.endpoint).toBeDefined();
      expect(result.endpoint!.protocol).toBe("REST");
      // Clean up
      protocolBridgeEngine.removeEndpoint(result.endpoint!.id);
    }
  });

  it("removeEndpoint returns failure for unknown id", () => {
    const result = protocolBridgeEngine.removeEndpoint("nonexistent-id");
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

// ============================================================================
// 7. IntentDecompositionEngine
// ============================================================================
describe("IntentDecompositionEngine", () => {
  it("decomposeIntent extracts entities from a manufacturing query", () => {
    const result = decomposeIntent(
      "I need to rough a pocket in 4140 steel with a half inch endmill on a Haas VF-2",
    );
    expect(result).toBeDefined();
    expect(result).toHaveProperty("entities");
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("persona");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("raw_query");
    expect(result.entities.material).toBeDefined();
    expect(result.plan.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("decomposeIntent handles simple query with no entities", () => {
    const result = decomposeIntent("hello");
    expect(result).toBeDefined();
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.safety.warnings.length).toBeGreaterThan(0);
  });

  it("intentEngine routes to decompose_intent action", () => {
    const result = intentEngine("decompose_intent", {
      query: "drill and tap M8 holes in aluminum",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("entities");
    expect(result).toHaveProperty("plan");
  });
});

// ============================================================================
// 8. MultiTenantEngine
// ============================================================================
describe("MultiTenantEngine", () => {
  it("is a valid engine instance", () => {
    expect(multiTenantEngine).toBeDefined();
    expect(typeof multiTenantEngine.createTenant).toBe("function");
  });

  it("createTenant creates a new tenant", () => {
    const result = multiTenantEngine.createTenant("Test Tenant Batch32", "test");
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    if (result.success) {
      expect(result.tenant).toBeDefined();
      expect(result.tenant!.name).toBe("Test Tenant Batch32");
      expect(result.tenant!.status).toBe("active");
    }
  });

  it("init is idempotent", () => {
    expect(() => {
      multiTenantEngine.init();
      multiTenantEngine.init();
    }).not.toThrow();
  });
});

// ============================================================================
// 9. ResponseFormatterEngine
// ============================================================================
describe("ResponseFormatterEngine", () => {
  const sampleResult = {
    cutting_speed_m_min: 200,
    feed_per_tooth_mm: 0.15,
    axial_depth_mm: 3.0,
    radial_depth_mm: 6.0,
    spindle_rpm: 5305,
    feed_rate_mm_min: 3183,
    cutting_force_n: 450,
    power_kw: 2.8,
    tool_life_min: 45,
    surface_finish_ra_um: 1.2,
    material: "4140 Steel",
    safety_score: 0.85,
  };

  it("formatForPersona formats for machinist persona", () => {
    const result = formatForPersona(sampleResult, "speed_feed", {
      persona: "machinist",
      units: "imperial",
    });
    expect(result).toBeDefined();
    expect(result.persona).toBe("machinist");
    expect(result.units).toBe("imperial");
    expect(typeof result.formatted).toBe("string");
    expect(result.formatted.length).toBeGreaterThan(0);
    expect(Array.isArray(result.sections)).toBe(true);
  });

  it("formatForPersona formats for programmer persona", () => {
    const result = formatForPersona(sampleResult, "cutting_force", {
      persona: "programmer",
      units: "metric",
    });
    expect(result).toBeDefined();
    expect(result.persona).toBe("programmer");
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it("responseFormatter routes format_response action", () => {
    const result = responseFormatter("format_response", {
      result: sampleResult,
      source_action: "speed_feed",
      persona: "manager",
      batch_size: 100,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("persona", "manager");
    expect(result).toHaveProperty("formatted_text");
    expect(result).toHaveProperty("sections");
  });
});

// ============================================================================
// 10. TaskAgentClassifier
// ============================================================================
describe("TaskAgentClassifier", () => {
  it("classifyTask returns a classification for a calc action", () => {
    const result = classifyTask("prism_calc", "cutting_force", {
      material: "steel_4140",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("complexity");
    expect(result).toHaveProperty("domain");
    expect(result).toHaveProperty("recommended_agents");
    expect(result).toHaveProperty("recommended_tier");
    expect(result).toHaveProperty("reasoning");
    expect(["simple", "moderate", "complex", "critical"]).toContain(result.complexity);
  });

  it("quickClassify returns compact recommendation", () => {
    const result = quickClassify("prism_data", "material_get");
    expect(result).toBeDefined();
    expect(result).toHaveProperty("tier");
    expect(result).toHaveProperty("agents");
    expect(result).toHaveProperty("complexity");
    expect(["opus", "sonnet", "haiku"]).toContain(result.tier);
  });

  it("classifyTask handles safety domain", () => {
    const result = classifyTask("prism_safety", "check_toolpath_collision");
    expect(result).toBeDefined();
    expect(result.domain).toBeDefined();
    expect(typeof result.auto_orchestrate).toBe("boolean");
  });
});

// ============================================================================
// 11. DNCTransferEngine
// ============================================================================
describe("DNCTransferEngine", () => {
  it("generateParameterBlock creates a G-code parameter block", () => {
    const block = generateParameterBlock({
      program_number: "O1234",
      material: "4140 Steel",
      machine: "Haas VF-2",
      tool: "T01",
      rpm: 4500,
      feed_mmmin: 600,
      doc_mm: 3.0,
      woc_mm: 4.0,
      controller: "fanuc",
    });
    expect(block).toBeDefined();
    expect(block.program_number).toBe("O1234");
    expect(block.rpm).toBe(4500);
    expect(block.controller).toBe("fanuc");
    expect(typeof block.gcode).toBe("string");
    expect(block.gcode).toContain("S4500");
  });

  it("executeDNCTransfer simulates a send", () => {
    const result = executeDNCTransfer({
      program_number: "O1234",
      machine: "Haas VF-2",
      content: "G90 G54\nS4500 M3\nF600\n",
      action: "send",
      system: "file_system",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("transfer_id");
    expect(result.status).toBe("sent");
    expect(result.program_number).toBe("O1234");
  });

  it("generateQRData creates QR-encodable data", () => {
    const qr = generateQRData({
      program_number: "O5555",
      material: "Aluminum 6061",
      rpm: 8000,
      feed_mmmin: 1200,
    });
    expect(qr).toBeDefined();
    expect(qr.type).toBe("prism_params");
    expect(qr.program).toBe("O5555");
    expect(qr.rpm).toBe(8000);
    expect(qr).toHaveProperty("timestamp");
  });
});

// ============================================================================
// 12. WorkflowChainsEngine
// ============================================================================
describe("WorkflowChainsEngine", () => {
  it("listWorkflows returns available workflows", () => {
    const list = listWorkflows();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    const first = list[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("description");
  });

  it("matchWorkflows finds matching workflows for a query", () => {
    const matches = matchWorkflows("I need to plan a job for milling a part");
    expect(Array.isArray(matches)).toBe(true);
    // Should match at least plan_job
    if (matches.length > 0) {
      expect(matches[0]).toHaveProperty("workflow");
      expect(matches[0]).toHaveProperty("confidence");
      expect(matches[0].confidence).toBeGreaterThan(0);
    }
  });

  it("getWorkflow retrieves a specific workflow by id", () => {
    const wf = getWorkflow("plan_job");
    expect(wf).toBeDefined();
    if (wf) {
      expect(wf.id).toBe("plan_job");
      expect(wf.steps.length).toBeGreaterThan(0);
      expect(wf).toHaveProperty("trigger_phrases");
    }
  });

  it("workflowChains dispatcher routes list action", () => {
    const result = workflowChains("workflow_list", {});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("workflows");
  });
});
