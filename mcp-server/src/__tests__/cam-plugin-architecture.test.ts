/**
 * Tests for CAM Plugin Architecture Types
 *
 * Validates the type definitions, constants, and schemas for the unified
 * CAM plugin system supporting hyperMILL, Fusion 360, Inventor HSM, and Mastercam.
 *
 * @module __tests__/cam-plugin-architecture.test
 * @milestone PLUGIN-ARCH-MS0
 */

import { describe, it, expect } from "vitest";
import {
  // Protocol types
  RPC_ERROR_CODES,
  DEFAULT_CONNECTION_CONFIG,
  DEFAULT_SAFETY_INTERLOCK_CONFIG,
  PRISM_RPC_METHODS,
  PRISM_PARAMETER_MAP,
  // Type imports for validation
  type PRISMRpcRequest,
  type PRISMRpcResponse,
  type PRISMRpcError,
  type PluginConnectionConfig,
  type CrossCAMParameterMap,
  type CAMEventType,
  type PluginLifecycleState,
  type SafetyInterlockConfig,
  type SafetyCheckResult,
  type SafetyBlock,
  type SafetyWarning,
  type HyperMillPluginConfig,
  type HyperMillOperationData,
  type Fusion360PluginConfig,
  type Fusion360OperationData,
  type InventorHSMPluginConfig,
  type InventorHSMOperationData,
  type MastercamPluginConfig,
  type MastercamOperationData,
  type PluginDeploymentConfig,
  type PluginUpdateManifest,
  type PluginInstallResult,
  type IPRISMCAMPlugin,
  type PluginInfo,
  type NormalizedOperationData,
  type NormalizedParameters,
  type PhysicsOptimizationRequest,
  type PhysicsOptimizationResponse,
} from "../types/cam-plugin-architecture.js";

describe("CAM Plugin Architecture Types", () => {
  describe("RPC_ERROR_CODES", () => {
    it("defines standard JSON-RPC error codes", () => {
      expect(RPC_ERROR_CODES.PARSE_ERROR).toBe(-32700);
      expect(RPC_ERROR_CODES.INVALID_REQUEST).toBe(-32600);
      expect(RPC_ERROR_CODES.METHOD_NOT_FOUND).toBe(-32601);
      expect(RPC_ERROR_CODES.INVALID_PARAMS).toBe(-32602);
      expect(RPC_ERROR_CODES.INTERNAL_ERROR).toBe(-32603);
    });

    it("defines PRISM-specific error codes in reserved range", () => {
      // PRISM codes should be in -32000 to -32099 range
      expect(RPC_ERROR_CODES.SAFETY_VIOLATION).toBe(-32001);
      expect(RPC_ERROR_CODES.PARAMETER_OUT_OF_RANGE).toBe(-32002);
      expect(RPC_ERROR_CODES.MACHINE_LIMIT_EXCEEDED).toBe(-32003);
      expect(RPC_ERROR_CODES.CHATTER_RISK_HIGH).toBe(-32009);
      expect(RPC_ERROR_CODES.DEFLECTION_RISK_HIGH).toBe(-32010);
    });

    it("has unique error codes", () => {
      const codes = Object.values(RPC_ERROR_CODES);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe("DEFAULT_CONNECTION_CONFIG", () => {
    it("has required connection fields", () => {
      expect(DEFAULT_CONNECTION_CONFIG.server_url).toBe("http://localhost:18361");
      expect(DEFAULT_CONNECTION_CONFIG.ws_endpoint).toBe("ws://localhost:18361/ws/plugin");
      expect(DEFAULT_CONNECTION_CONFIG.rest_endpoint).toBe("http://localhost:18361/api/v1/plugin");
    });

    it("has reasonable timeout values", () => {
      expect(DEFAULT_CONNECTION_CONFIG.connect_timeout_ms).toBe(5000);
      expect(DEFAULT_CONNECTION_CONFIG.request_timeout_ms).toBe(30000);
    });

    it("enables auto-reconnect by default", () => {
      expect(DEFAULT_CONNECTION_CONFIG.auto_reconnect).toBe(true);
      expect(DEFAULT_CONNECTION_CONFIG.max_reconnect_attempts).toBe(10);
      expect(DEFAULT_CONNECTION_CONFIG.reconnect_backoff_ms).toBe(1000);
    });

    it("enables batching by default", () => {
      expect(DEFAULT_CONNECTION_CONFIG.enable_batching).toBe(true);
      expect(DEFAULT_CONNECTION_CONFIG.batch_flush_ms).toBe(50);
    });

    it("uses api_key auth by default", () => {
      expect(DEFAULT_CONNECTION_CONFIG.auth_method).toBe("api_key");
    });
  });

  describe("DEFAULT_SAFETY_INTERLOCK_CONFIG", () => {
    it("is enabled by default", () => {
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.enabled).toBe(true);
    });

    it("has minimum safety score of 0.70", () => {
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.min_safety_score).toBe(0.70);
    });

    it("blocks high-risk conditions", () => {
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.block_chatter_risk).toBe("high");
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.block_deflection_risk).toBe("high");
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.block_power_exceeded).toBe(true);
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.block_excessive_feed).toBe(true);
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.block_rapid_into_material).toBe(true);
    });

    it("warns on short tool life", () => {
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.warn_tool_life_below_min).toBe(15);
    });

    it("requires approval below 0.75", () => {
      expect(DEFAULT_SAFETY_INTERLOCK_CONFIG.require_approval_below_score).toBe(0.75);
    });
  });

  describe("PRISM_RPC_METHODS", () => {
    it("defines physics optimization methods", () => {
      expect(PRISM_RPC_METHODS.OPTIMIZE_SPEED_FEED).toBe("prism.optimize_speed_feed");
      expect(PRISM_RPC_METHODS.CALCULATE_FORCE).toBe("prism.calculate_force");
      expect(PRISM_RPC_METHODS.CALCULATE_TOOL_LIFE).toBe("prism.calculate_tool_life");
      expect(PRISM_RPC_METHODS.CHECK_STABILITY).toBe("prism.check_stability");
      expect(PRISM_RPC_METHODS.CALCULATE_DEFLECTION).toBe("prism.calculate_deflection");
      expect(PRISM_RPC_METHODS.ANALYZE_PHYSICS).toBe("prism.analyze_physics");
    });

    it("defines safety methods", () => {
      expect(PRISM_RPC_METHODS.CHECK_SAFETY).toBe("prism.check_safety");
      expect(PRISM_RPC_METHODS.VALIDATE_MACHINE_LIMITS).toBe("prism.validate_machine_limits");
      expect(PRISM_RPC_METHODS.VALIDATE_GCODE).toBe("prism.validate_gcode");
    });

    it("defines knowledge methods", () => {
      expect(PRISM_RPC_METHODS.GET_TRIBAL_TIP).toBe("prism.get_tribal_tip");
      expect(PRISM_RPC_METHODS.GET_MATERIAL).toBe("prism.get_material");
      expect(PRISM_RPC_METHODS.GET_TOOL_RECOMMENDATIONS).toBe("prism.get_tool_recommendations");
      expect(PRISM_RPC_METHODS.GET_STRATEGY).toBe("prism.get_strategy");
    });

    it("defines session methods", () => {
      expect(PRISM_RPC_METHODS.REGISTER_PLUGIN).toBe("prism.register_plugin");
      expect(PRISM_RPC_METHODS.HEARTBEAT).toBe("prism.heartbeat");
      expect(PRISM_RPC_METHODS.SUBSCRIBE_EVENTS).toBe("prism.subscribe_events");
      expect(PRISM_RPC_METHODS.LOG).toBe("prism.log");
    });

    it("all methods follow prism.* naming convention", () => {
      for (const method of Object.values(PRISM_RPC_METHODS)) {
        expect(method).toMatch(/^prism\./);
      }
    });
  });

  describe("PRISM_PARAMETER_MAP", () => {
    it("has core speed/feed parameters", () => {
      const spindleRpm = PRISM_PARAMETER_MAP.find(p => p.prism_name === "spindle_rpm");
      expect(spindleRpm).toBeDefined();
      expect(spindleRpm?.unit).toBe("RPM");
      expect(spindleRpm?.physics_critical).toBe(true);
      expect(spindleRpm?.safety_critical).toBe(true);

      const feedRate = PRISM_PARAMETER_MAP.find(p => p.prism_name === "feed_rate_mmmin");
      expect(feedRate).toBeDefined();
      expect(feedRate?.unit).toBe("mm/min");
      expect(feedRate?.physics_critical).toBe(true);
    });

    it("has depth parameters", () => {
      const axialDepth = PRISM_PARAMETER_MAP.find(p => p.prism_name === "axial_depth_mm");
      expect(axialDepth).toBeDefined();
      expect(axialDepth?.category).toBe("depths");

      const radialDepth = PRISM_PARAMETER_MAP.find(p => p.prism_name === "radial_depth_mm");
      expect(radialDepth).toBeDefined();
      expect(radialDepth?.category).toBe("depths");
    });

    it("has CAM mappings for all parameters", () => {
      for (const param of PRISM_PARAMETER_MAP) {
        expect(param.cam_mappings).toBeDefined();
        // At least hypermill and fusion360 should be mapped
        expect(param.cam_mappings.hypermill).toBeDefined();
        expect(param.cam_mappings.fusion360).toBeDefined();
      }
    });

    it("has valid ranges for numeric parameters", () => {
      for (const param of PRISM_PARAMETER_MAP) {
        if (param.type === "number" && param.range) {
          expect(param.range.min).toBeLessThan(param.range.max);
          expect(param.range.min).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("has enum values for enum parameters", () => {
      const enumParams = PRISM_PARAMETER_MAP.filter(p => p.type === "enum");
      for (const param of enumParams) {
        expect(param.enum_values).toBeDefined();
        expect(param.enum_values!.length).toBeGreaterThan(0);
      }
    });

    it("categorizes parameters correctly", () => {
      const validCategories = ["speeds_feeds", "depths", "toolpath", "linking", "machine"];
      for (const param of PRISM_PARAMETER_MAP) {
        expect(validCategories).toContain(param.category);
      }
    });
  });

  describe("Type Structure Validation", () => {
    it("PRISMRpcRequest has required fields", () => {
      const request: PRISMRpcRequest = {
        jsonrpc: "2.0",
        id: "test-001",
        method: "prism.optimize_speed_feed",
        params: { material: { iso_group: "P" } }
      };
      expect(request.jsonrpc).toBe("2.0");
      expect(request.method).toBe("prism.optimize_speed_feed");
    });

    it("PRISMRpcResponse has result or error", () => {
      const successResponse: PRISMRpcResponse = {
        jsonrpc: "2.0",
        id: "test-001",
        result: { optimized_params: { spindle_rpm: 3762 } }
      };
      expect(successResponse.result).toBeDefined();
      expect(successResponse.error).toBeUndefined();

      const errorResponse: PRISMRpcResponse = {
        jsonrpc: "2.0",
        id: "test-002",
        error: { code: -32001, message: "Safety violation" }
      };
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.result).toBeUndefined();
    });

    it("NormalizedParameters has all required fields", () => {
      const params: NormalizedParameters = {
        spindle_rpm: 3762,
        surface_speed_mmin: 150,
        feed_rate_mmmin: 1505,
        feed_per_tooth_mm: 0.1,
        plunge_feed_mmmin: 500,
        axial_depth_mm: 5,
        radial_depth_mm: 3,
        stock_to_leave_mm: 0.2,
        cutting_mode: "climb",
        coolant_mode: "flood"
      };
      expect(params.spindle_rpm).toBe(3762);
      expect(params.cutting_mode).toBe("climb");
      expect(params.coolant_mode).toBe("flood");
    });

    it("NormalizedOperationData structure is valid", () => {
      const opData: NormalizedOperationData = {
        id: "op-001",
        name: "Adaptive Clearing",
        type: "roughing",
        strategy: "adaptive",
        tool: {
          number: 1,
          diameter_mm: 12.7,
          flute_count: 4,
          type: "flat_endmill",
          material: "carbide"
        },
        parameters: {
          spindle_rpm: 3762,
          surface_speed_mmin: 150,
          feed_rate_mmmin: 1505,
          feed_per_tooth_mm: 0.1,
          plunge_feed_mmmin: 500,
          axial_depth_mm: 5,
          radial_depth_mm: 3,
          stock_to_leave_mm: 0.2,
          cutting_mode: "climb",
          coolant_mode: "flood"
        },
        toolpath_state: "valid",
        cycle_time_min: 12.5,
        source_cam: "fusion360",
        raw_data: {}
      };
      expect(opData.id).toBe("op-001");
      expect(opData.type).toBe("roughing");
      expect(opData.source_cam).toBe("fusion360");
    });

    it("SafetyCheckResult structure is valid", () => {
      const result: SafetyCheckResult = {
        allowed: false,
        safety_score: 0.65,
        blocks: [{
          rule: "safety_score_low",
          severity: "critical",
          message: "Safety score 0.65 below minimum 0.70",
          parameter: "safety_score",
          value: 0.65,
          limit: 0.70
        }],
        warnings: [{
          rule: "tool_life_short",
          severity: "medium",
          message: "Tool life 12min below threshold",
          suggestion: "Reduce cutting speed"
        }],
        requires_approval: false
      };
      expect(result.allowed).toBe(false);
      expect(result.blocks.length).toBe(1);
      expect(result.warnings.length).toBe(1);
    });

    it("PhysicsOptimizationRequest structure is valid", () => {
      const request: PhysicsOptimizationRequest = {
        material: {
          name: "4140 Steel",
          iso_group: "P",
          hardness_hrc: 28
        },
        tool: {
          diameter_mm: 12.7,
          flute_count: 4,
          helix_angle_deg: 30,
          material: "carbide",
          coating: "TiAlN"
        },
        operation: "roughing",
        priority: "balanced",
        include_physics: true,
        include_tribal: true
      };
      expect(request.material.iso_group).toBe("P");
      expect(request.tool.diameter_mm).toBe(12.7);
      expect(request.priority).toBe("balanced");
    });

    it("PhysicsOptimizationResponse structure is valid", () => {
      const response: PhysicsOptimizationResponse = {
        optimized_params: {
          spindle_rpm: 3762,
          surface_speed_mmin: 150,
          feed_rate_mmmin: 1505,
          feed_per_tooth_mm: 0.1,
          plunge_feed_mmmin: 500,
          axial_depth_mm: 5,
          radial_depth_mm: 3,
          stock_to_leave_mm: 0.2,
          cutting_mode: "climb",
          coolant_mode: "flood"
        },
        physics: {
          cutting_force_N: 847,
          spindle_power_kW: 4.2,
          tool_life_min: 67,
          chip_temperature_C: 450,
          deflection_risk: "low",
          chatter_risk: "low",
          stable_rpm_range: { min: 3500, max: 4200 }
        },
        confidence: 0.91,
        tribal_tips: [{
          tip: "Use climb milling for better finish",
          source: "JM Die tribal",
          relevance: 0.85
        }],
        warnings: [],
        processing_time_ms: 127
      };
      expect(response.confidence).toBe(0.91);
      expect(response.physics?.cutting_force_N).toBe(847);
      expect(response.tribal_tips?.length).toBe(1);
    });
  });

  describe("CAM-Specific Plugin Config Types", () => {
    it("HyperMillPluginConfig has required fields", () => {
      const config: Partial<HyperMillPluginConfig> = {
        assembly_name: "PRISM.HyperMillAddin",
        plugin_guid: "12345678-1234-1234-1234-123456789012",
        min_hypermill_version: "2024.1",
        ribbon_tab: {
          name: "PRISM AI",
          groups: []
        },
        context_menus: [],
        event_subscriptions: ["operation_created", "toolpath_generated"]
      };
      expect(config.assembly_name).toBe("PRISM.HyperMillAddin");
    });

    it("Fusion360PluginConfig has required fields", () => {
      const config: Partial<Fusion360PluginConfig> = {
        addin_id: "com.prism.fusion360",
        display_name: "PRISM AI",
        min_fusion_version: "2.0.16985",
        author: "PRISM",
        toolbar_panel: {
          workspace_id: "CAMEnvironment",
          panel_id: "PRISM_Panel",
          panel_name: "PRISM AI",
          buttons: []
        },
        commands: [],
        event_handlers: {},
        offline_mode: {
          enabled: true,
          cache_physics_results: true,
          cache_tribal_tips: true
        }
      };
      expect(config.addin_id).toBe("com.prism.fusion360");
      expect(config.offline_mode?.enabled).toBe(true);
    });

    it("MastercamPluginConfig has required fields", () => {
      const config: Partial<MastercamPluginConfig> = {
        guid: "87654321-4321-4321-4321-210987654321",
        name: "PRISM AI",
        version: "1.0.0",
        min_mastercam_version: "2024",
        hook_type: "net_hook",
        net_hook: {
          assembly_name: "PRISM.MastercamNetHook",
          entry_class: "PRISMNetHook",
          entry_method: "Run"
        },
        ribbon: {
          tab_name: "PRISM AI",
          panels: []
        },
        nci_hooks: {
          pre_post: true,
          post_post: true,
          on_toolpath_regenerate: false
        },
        post_integration: {
          pre_post_hook: true,
          post_post_hook: true
        }
      };
      expect(config.hook_type).toBe("net_hook");
      expect(config.nci_hooks?.pre_post).toBe(true);
    });
  });

  describe("CAM Operation Data Types", () => {
    it("HyperMillOperationData structure is valid", () => {
      const opData: HyperMillOperationData = {
        name: "MAXX Roughing",
        type: "MAXX_Roughing",
        cycle_id: "cycle-001",
        tool_number: 1,
        parameters: {
          spindle_rpm: 3762,
          surface_speed_mmin: 150,
          feed_rate_mmmin: 1505,
          feed_per_tooth_mm: 0.1,
          axial_depth_mm: 25.4,
          radial_depth_mm: 3.175,
          stock_to_leave_mm: 0.2,
          plunge_feed_mmmin: 500,
          coolant: "flood"
        },
        toolpath: {
          length_mm: 15000,
          cutting_time_min: 8.5,
          rapid_time_min: 2.0,
          total_time_min: 10.5
        },
        is_calculated: true,
        has_errors: false,
        errors: []
      };
      expect(opData.type).toBe("MAXX_Roughing");
      expect(opData.toolpath.total_time_min).toBe(10.5);
    });

    it("Fusion360OperationData structure is valid", () => {
      const opData: Fusion360OperationData = {
        id: "op-uuid-001",
        name: "Adaptive Clearing",
        strategy: "adaptive",
        setup_id: "setup-001",
        tool: {
          number: 1,
          diameter_mm: 12.7,
          flute_count: 4,
          length_mm: 50,
          type: "flat endmill",
          description: "12.7mm 4FL Carbide"
        },
        parameters: {
          spindleSpeed: 3762,
          surfaceSpeed: 150,
          cuttingFeedrate: 1505,
          feedPerTooth: 0.1,
          plungeFeedrate: 500,
          maximumStepdown: 5,
          maximumStepover: 3,
          optimalLoad: 40,
          stockToLeave: 0.2,
          coolantMode: "flood"
        },
        comment: "PRISM:{\"prism\":{\"version\":\"1.0.0\"}}",
        isValid: true,
        hasWarnings: false
      };
      expect(opData.strategy).toBe("adaptive");
      expect(opData.parameters.optimalLoad).toBe(40);
    });

    it("MastercamOperationData structure is valid", () => {
      const opData: MastercamOperationData = {
        op_id: 1,
        name: "Dynamic OptiRough",
        type: "Dynamic",
        tool: {
          number: 1,
          diameter_mm: 12.7,
          flutes: 4,
          type: "Flat Endmill"
        },
        parameters: {
          SpindleSpeed: 3762,
          SurfaceSpeed: 150,
          FeedRate: 1505,
          ChipLoad: 0.1,
          AxialDepth: 25.4,
          RadialDepth: 3.175,
          DynamicEngagement: 10,
          StockToLeave: 0.2,
          Coolant: "Flood"
        },
        nci_record_number: 1001,
        toolpath: {
          length_mm: 15000,
          cycle_time_sec: 630,
          air_time_sec: 120,
          cut_time_sec: 510
        },
        needs_regeneration: false
      };
      expect(opData.type).toBe("Dynamic");
      expect(opData.parameters.DynamicEngagement).toBe(10);
      expect(opData.nci_record_number).toBe(1001);
    });
  });

  describe("Plugin Deployment Types", () => {
    it("PluginDeploymentConfig structure is valid", () => {
      const config: PluginDeploymentConfig = {
        plugin_id: "prism-cam-plugin",
        target_cam: "fusion360",
        current_version: "1.0.0",
        install_paths: {
          fusion360: "%APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISM"
        },
        auto_update: true,
        update_server_url: "https://prism.mfg/plugins/updates",
        update_check_interval_hours: 24,
        staging_directory: "%TEMP%/prism-updates",
        rollback_versions_to_keep: 3
      };
      expect(config.auto_update).toBe(true);
      expect(config.rollback_versions_to_keep).toBe(3);
    });

    it("PluginUpdateManifest structure is valid", () => {
      const manifest: PluginUpdateManifest = {
        plugin_id: "prism-cam-plugin",
        available_version: "1.2.0",
        min_prism_version: "2.5.0",
        min_cam_versions: {
          hypermill: "2024.1",
          fusion360: "2.0.16985",
          mastercam: "2024"
        },
        release_date: "2026-04-15",
        release_notes: "Added chatter stability analysis",
        download_urls: {
          fusion360: "https://prism.mfg/plugins/fusion360-1.2.0.zip"
        },
        checksums: {
          fusion360: "sha256:abc123..."
        },
        is_critical: false,
        breaking_changes: []
      };
      expect(manifest.available_version).toBe("1.2.0");
      expect(manifest.is_critical).toBe(false);
    });

    it("PluginInstallResult structure is valid", () => {
      const result: PluginInstallResult = {
        success: true,
        plugin_id: "prism-cam-plugin",
        installed_version: "1.2.0",
        install_path: "C:/Users/.../PRISM",
        errors: [],
        warnings: ["Restart Fusion 360 to complete installation"],
        requires_restart: true,
        backup_path: "C:/Users/.../PRISM-backup-1.1.0"
      };
      expect(result.success).toBe(true);
      expect(result.requires_restart).toBe(true);
    });
  });

  describe("CAM Event Types", () => {
    it("CAMEventType covers operation events", () => {
      const opEvents: CAMEventType[] = [
        "operation_created",
        "operation_modified",
        "operation_deleted",
        "operation_calculated",
        "operation_posted"
      ];
      // Type check passes if these are valid
      expect(opEvents.length).toBe(5);
    });

    it("CAMEventType covers toolpath events", () => {
      const tpEvents: CAMEventType[] = [
        "toolpath_generating",
        "toolpath_generated",
        "toolpath_error"
      ];
      expect(tpEvents.length).toBe(3);
    });

    it("CAMEventType covers document events", () => {
      const docEvents: CAMEventType[] = [
        "document_opened",
        "document_closed",
        "document_saved"
      ];
      expect(docEvents.length).toBe(3);
    });
  });

  describe("Plugin Lifecycle States", () => {
    it("PluginLifecycleState covers all states", () => {
      const states: PluginLifecycleState[] = [
        "uninitialized",
        "initializing",
        "connected",
        "ready",
        "processing",
        "error",
        "disconnected",
        "shutting_down"
      ];
      expect(states.length).toBe(8);
    });
  });

  describe("Cross-CAM Parameter Consistency", () => {
    it("all parameters have hyperMILL mapping", () => {
      for (const param of PRISM_PARAMETER_MAP) {
        expect(param.cam_mappings.hypermill).toBeDefined();
      }
    });

    it("all parameters have Fusion 360 mapping", () => {
      for (const param of PRISM_PARAMETER_MAP) {
        expect(param.cam_mappings.fusion360).toBeDefined();
      }
    });

    it("all parameters have Inventor HSM mapping", () => {
      for (const param of PRISM_PARAMETER_MAP) {
        expect(param.cam_mappings.inventor_hsm).toBeDefined();
      }
    });

    it("all parameters have Mastercam mapping", () => {
      for (const param of PRISM_PARAMETER_MAP) {
        expect(param.cam_mappings.mastercam).toBeDefined();
      }
    });

    it("prism_name uses snake_case convention", () => {
      for (const param of PRISM_PARAMETER_MAP) {
        expect(param.prism_name).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    });

    it("parameter count is sufficient for basic operations", () => {
      // Should have at least core parameters
      expect(PRISM_PARAMETER_MAP.length).toBeGreaterThanOrEqual(10);
    });
  });
});
