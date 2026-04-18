/**
 * LatheMasterPostAPIEngine Tests
 *
 * U-LTH30: Tests for unified API surface and dispatcher action wiring.
 * Verifies route, emit, validate, explain, cross_check, audit actions.
 */

import { describe, it, expect } from "vitest";
import {
  latheMasterPostAPIEngine,
  LATHE_MASTERPOST_ACTIONS,
  type MasterPostAPIRequest,
  type RouteActionPayload,
  type EmitActionPayload,
  type ValidateActionPayload,
  type ExplainActionPayload,
  type CrossCheckActionPayload,
  type AuditActionPayload,
} from "../engines/LatheMasterPostAPIEngine.js";

describe("LatheMasterPostAPIEngine", () => {
  const createBasePayload = (overrides: Partial<RouteActionPayload> = {}): RouteActionPayload => ({
    machine_id: "LTH-01",
    operation: "turning",
    program_name: "TEST_PART",
    program_number: 1001,
    moves: [
      { type: "rapid", x: 100, z: 5 },
      { type: "linear", x: 50, z: 0, feed: 200 },
    ],
    tool_number: 1,
    spindle_rpm: 1500,
    feed_rate_mmmin: 200,
    ...overrides,
  });

  describe("processRequest()", () => {
    it("processes route action", async () => {
      const request: MasterPostAPIRequest = {
        action: "route",
        payload: createBasePayload(),
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.success).toBe(true);
      expect(response.action).toBe("route");
      expect(response.request_id).toBeDefined();
      expect(response.timestamp).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("processes emit action", async () => {
      const request: MasterPostAPIRequest = {
        action: "emit",
        payload: createBasePayload(),
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.success).toBe(true);
      expect(response.action).toBe("emit");
      expect(response.data).toBeDefined();
    });

    it("processes validate action", async () => {
      const request: MasterPostAPIRequest = {
        action: "validate",
        payload: {
          gcode: "O1001\n(PRISM GENERATED)\nG28 U0 W0\nM30",
        } as ValidateActionPayload,
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.success).toBe(true);
      expect(response.action).toBe("validate");
    });

    it("processes audit action", async () => {
      const request: MasterPostAPIRequest = {
        action: "audit",
        payload: { scope: "full" } as AuditActionPayload,
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.success).toBe(true);
      expect(response.action).toBe("audit");
    });

    it("handles unknown action gracefully", async () => {
      const request: MasterPostAPIRequest = {
        action: "unknown" as any,
        payload: {},
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe("PROCESSING_ERROR");
      expect(response.error?.message).toContain("Unknown action");
    });

    it("preserves request_id if provided", async () => {
      const request: MasterPostAPIRequest = {
        action: "route",
        payload: createBasePayload(),
        request_id: "custom_req_123",
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.request_id).toBe("custom_req_123");
    });

    it("generates request_id if not provided", async () => {
      const request: MasterPostAPIRequest = {
        action: "route",
        payload: createBasePayload(),
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.request_id).toMatch(/^req_\d+_\d+$/);
    });
  });

  describe("route()", () => {
    it("routes to correct sub-post", () => {
      const payload = createBasePayload();

      const result = latheMasterPostAPIEngine.route(payload);

      expect(result.success).toBe(true);
      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.route_decision).toBeDefined();
      expect(result.route_decision.selected_post).toBeDefined();
    });

    it("includes route decision details", () => {
      const payload = createBasePayload();

      const result = latheMasterPostAPIEngine.route(payload);

      expect(result.route_decision.machine_id).toBe("LTH-01");
      expect(result.route_decision.controller_family).toBeDefined();
      expect(result.route_decision.confidence).toBeGreaterThan(0);
    });

    it("returns block count", () => {
      const payload = createBasePayload();

      const result = latheMasterPostAPIEngine.route(payload);

      expect(result.block_count).toBeGreaterThan(0);
    });
  });

  describe("emit()", () => {
    it("returns unified G-code output", () => {
      const payload: EmitActionPayload = {
        ...createBasePayload(),
        include_line_numbers: false,
      };

      const result = latheMasterPostAPIEngine.emit(payload);

      expect(result.gcode).toContain("O1001");
      expect(result.gcode).toContain("PRISM");
      expect(result.gcode).toContain("M30");
    });

    it("includes route decision", () => {
      const payload: EmitActionPayload = createBasePayload();

      const result = latheMasterPostAPIEngine.emit(payload);

      expect(result.route_decision).toBeDefined();
      expect(result.route_decision.selected_post).toBeDefined();
    });

    it("includes unified output metadata", () => {
      const payload: EmitActionPayload = createBasePayload();

      const result = latheMasterPostAPIEngine.emit(payload);

      expect(result.unified_output).toBeDefined();
      expect(result.unified_output.line_count).toBeGreaterThan(0);
      expect(result.unified_output.header_lines).toBeGreaterThan(0);
    });

    it("adds line numbers when requested", () => {
      const payload: EmitActionPayload = {
        ...createBasePayload(),
        include_line_numbers: true,
        line_number_start: 10,
        line_number_increment: 5,
      };

      const result = latheMasterPostAPIEngine.emit(payload);

      expect(result.gcode).toContain("N10");
    });

    it("collects warnings from route and unify", () => {
      const payload: EmitActionPayload = createBasePayload();

      const result = latheMasterPostAPIEngine.emit(payload);

      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("validate()", () => {
    it("validates well-formed G-code", () => {
      const payload: ValidateActionPayload = {
        gcode: `O1001
(PRISM GENERATED)
(MACHINE: Test Machine)
G28 U0 W0
G50 S3000
G40 G80
M30
%`,
      };

      const result = latheMasterPostAPIEngine.validate(payload);

      expect(result.format_check).toBeDefined();
      expect(result.format_check.has_prism_header).toBe(true);
    });

    it("detects missing PRISM header", () => {
      const payload: ValidateActionPayload = {
        gcode: "O1001\nG28 U0 W0\nM30",
      };

      const result = latheMasterPostAPIEngine.validate(payload);

      expect(result.format_check.has_prism_header).toBe(false);
      expect(result.warnings.some(w => w.includes("PRISM header"))).toBe(true);
    });

    it("supports strict mode", () => {
      const payload: ValidateActionPayload = {
        gcode: "O1001\nG00 X100\nM30",
        strict_mode: true,
      };

      const result = latheMasterPostAPIEngine.validate(payload);

      if (!result.valid) {
        expect(result.warnings.some(w => w.includes("Strict mode"))).toBe(true);
      }
    });
  });

  describe("explain()", () => {
    it("returns decision trace", () => {
      const payload: ExplainActionPayload = {
        route_request: createBasePayload(),
        route_decision: {
          machine_id: "LTH-01",
          machine_name: "Okuma GENOS L300-M",
          controller_family: "okuma",
          controller_model: "OSP-P300L-R",
          selected_post: "okuma_turning",
          route_method: "direct_match",
          confidence: 0.95,
          reasoning: ["Controller match"],
        },
      };

      const result = latheMasterPostAPIEngine.explain(payload);

      expect(result.trace_id).toBeDefined();
      expect(result.steps.length).toBeGreaterThanOrEqual(4);
      expect(result.human_readable_explanation.length).toBeGreaterThan(100);
    });

    it("includes causal analysis", () => {
      const payload: ExplainActionPayload = {
        route_request: createBasePayload(),
        route_decision: {
          machine_id: "LTH-01",
          machine_name: "Okuma GENOS L300-M",
          controller_family: "okuma",
          controller_model: "OSP-P300L-R",
          selected_post: "okuma_turning",
          route_method: "direct_match",
          confidence: 0.95,
          reasoning: [],
        },
      };

      const result = latheMasterPostAPIEngine.explain(payload);

      expect(result.causal_analysis).toBeDefined();
      expect(result.causal_analysis.root_cause).toBeDefined();
    });
  });

  describe("crossCheck()", () => {
    it("runs ensemble cross-check", () => {
      const payload: CrossCheckActionPayload = {
        route_request: createBasePayload(),
        candidate_posts: ["okuma_turning", "fanuc_turning"],
      };

      const result = latheMasterPostAPIEngine.crossCheck(payload);

      expect(result.check_id).toBeDefined();
      expect(result.posts_executed).toEqual(["okuma_turning", "fanuc_turning"]);
      expect(result.divergences.length).toBeGreaterThan(0);
    });

    it("respects custom thresholds", () => {
      const payload: CrossCheckActionPayload = {
        route_request: createBasePayload(),
        candidate_posts: ["okuma_turning", "generic_turning"],
        thresholds: {
          block_count_pct: 50,
          cycle_time_pct: 50,
        },
      };

      const result = latheMasterPostAPIEngine.crossCheck(payload);

      // With loose thresholds, should have high consensus
      expect(result.consensus_confidence).toBeGreaterThan(0);
    });
  });

  describe("audit()", () => {
    it("runs full audit by default", () => {
      const payload: AuditActionPayload = {};

      const result = latheMasterPostAPIEngine.audit(payload);

      expect(result.generated_at).toBeDefined();
      expect(result.overall_health).toBeDefined();
    });

    it("audits specific sub-post", () => {
      const payload: AuditActionPayload = {
        scope: "sub_post",
        sub_post_id: "okuma_turning",
      };

      const result = latheMasterPostAPIEngine.audit(payload);

      expect(result.post_id).toBe("okuma_turning");
    });

    it("detects drift for sub-post", () => {
      const payload: AuditActionPayload = {
        scope: "drift",
        sub_post_id: "okuma_turning",
      };

      const result = latheMasterPostAPIEngine.audit(payload);

      expect(result.post_id).toBe("okuma_turning");
      expect(result.drift_detected).toBeDefined();
    });

    it("throws for sub_post scope without id", () => {
      const payload: AuditActionPayload = {
        scope: "sub_post",
      };

      expect(() => latheMasterPostAPIEngine.audit(payload)).toThrow("sub_post_id required");
    });
  });

  describe("getAvailableActions()", () => {
    it("returns all 6 actions", () => {
      const actions = latheMasterPostAPIEngine.getAvailableActions();

      expect(actions.length).toBe(6);
      expect(actions.map(a => a.action)).toEqual([
        "route",
        "emit",
        "validate",
        "explain",
        "cross_check",
        "audit",
      ]);
    });

    it("includes descriptions for each action", () => {
      const actions = latheMasterPostAPIEngine.getAvailableActions();

      for (const action of actions) {
        expect(action.description.length).toBeGreaterThan(10);
        expect(action.payload_schema).toBeDefined();
      }
    });
  });

  describe("getStatistics()", () => {
    it("returns API statistics", () => {
      const stats = latheMasterPostAPIEngine.getStatistics();

      expect(stats.total_requests).toBeGreaterThanOrEqual(0);
      expect(stats.actions_available).toBe(6);
    });
  });

  describe("LATHE_MASTERPOST_ACTIONS", () => {
    it("defines all 6 dispatcher actions", () => {
      expect(Object.keys(LATHE_MASTERPOST_ACTIONS)).toEqual([
        "route",
        "emit",
        "validate",
        "explain",
        "cross_check",
        "audit",
      ]);
    });

    it("each action has handler function", () => {
      for (const key of Object.keys(LATHE_MASTERPOST_ACTIONS) as Array<keyof typeof LATHE_MASTERPOST_ACTIONS>) {
        const action = LATHE_MASTERPOST_ACTIONS[key];
        expect(action.action).toContain("lathe_masterpost");
        expect(action.description.length).toBeGreaterThan(0);
        expect(typeof action.handler).toBe("function");
      }
    });

    it("route handler works", () => {
      const payload = createBasePayload();
      const result = LATHE_MASTERPOST_ACTIONS.route.handler(payload);

      expect(result.success).toBe(true);
      expect(result.gcode.length).toBeGreaterThan(0);
    });

    it("emit handler works", () => {
      const payload: EmitActionPayload = createBasePayload();
      const result = LATHE_MASTERPOST_ACTIONS.emit.handler(payload);

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.route_decision).toBeDefined();
    });

    it("validate handler works", () => {
      const payload: ValidateActionPayload = {
        gcode: "O1001\nM30",
      };
      const result = LATHE_MASTERPOST_ACTIONS.validate.handler(payload);

      expect(result.format_check).toBeDefined();
    });

    it("audit handler works", () => {
      const payload: AuditActionPayload = { scope: "full" };
      const result = LATHE_MASTERPOST_ACTIONS.audit.handler(payload);

      expect(result.generated_at).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("handles errors in route gracefully", async () => {
      const request: MasterPostAPIRequest = {
        action: "route",
        payload: {} as RouteActionPayload, // Missing required fields
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      // Should not crash, may succeed with defaults or fail gracefully
      expect(response.request_id).toBeDefined();
    });

    it("returns error details on failure", async () => {
      const request: MasterPostAPIRequest = {
        action: "audit",
        payload: { scope: "unknown" } as any,
      };

      const response = await latheMasterPostAPIEngine.processRequest(request);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBeDefined();
      expect(response.error?.message).toBeDefined();
    });
  });

  describe("Integration", () => {
    it("full route -> emit -> validate flow", async () => {
      // Step 1: Route
      const routePayload = createBasePayload();
      const routeResult = latheMasterPostAPIEngine.route(routePayload);
      expect(routeResult.success).toBe(true);

      // Step 2: Emit
      const emitPayload: EmitActionPayload = createBasePayload();
      const emitResult = latheMasterPostAPIEngine.emit(emitPayload);
      expect(emitResult.gcode.length).toBeGreaterThan(0);

      // Step 3: Validate
      const validatePayload: ValidateActionPayload = {
        gcode: emitResult.gcode,
      };
      const validateResult = latheMasterPostAPIEngine.validate(validatePayload);
      expect(validateResult.format_check.has_prism_header).toBe(true);
    });

    it("route -> explain flow", () => {
      // Step 1: Route
      const routePayload = createBasePayload();
      const routeResult = latheMasterPostAPIEngine.route(routePayload);

      // Step 2: Explain
      const explainPayload: ExplainActionPayload = {
        route_request: routePayload,
        route_decision: routeResult.route_decision,
      };
      const explainResult = latheMasterPostAPIEngine.explain(explainPayload);

      expect(explainResult.steps.length).toBeGreaterThanOrEqual(4);
      expect(explainResult.causal_analysis.root_cause).toContain(routeResult.route_decision.selected_post);
    });
  });
});
