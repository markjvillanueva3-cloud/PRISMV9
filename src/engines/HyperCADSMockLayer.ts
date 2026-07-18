/**
 * HyperCADSMockLayer — CI Test Fixture for All hyperCAD-S CAD Engines (E1164)
 *
 * Provides deterministic mock responses for all CAD operations:
 *   - import: mock feature list + body info
 *   - heal: mock repair report
 *   - analyze: mock draft/undercut/wall thickness report
 *   - stock_model: mock bounding box data
 *   - feature_to_strategy: mock recommendation set
 *
 * Activated when HYPERMILL_MOCK=true environment variable is set.
 * Returns the same interface shape as real engines so tests are interchangeable.
 *
 * Usage:
 *   HYPERMILL_MOCK=true npx vitest run
 *   OR programmatically: hyperCADSMockLayer.isMockActive() === true
 *
 * @engine HyperCADSMockLayer
 * @shortcode E1164
 * @milestone HM-REV-MS0 / U-HMR05
 */

import type { CADSScriptResult } from "./HyperCADSAutomationEngine.js";
import type { BridgeOutput } from "./PrintToHyperCADSBridge.js";
import type { StockModelResult } from "./HyperCADSStockModelEngine.js";
import { DEFAULT_STOCK_ALLOWANCE_MM } from "./HyperCADSStockModelEngine.js";
import type { BridgeOutput as StrategyBridgeOutput } from "./FeatureToStrategyBridgeEngine.js";

// ─── Mock Response Interfaces ─────────────────────────────────────────────────

/** Mock response for CAD import operation */
export interface MockImportResponse {
  /** Mock body name */
  body_name: string;
  /** Mock feature list */
  features: MockFeature[];
  /** Number of faces in the mock body */
  face_count: number;
  /** Number of edges */
  edge_count: number;
  /** Mock bounding box dimensions in mm */
  bounding_box: { x: number; y: number; z: number };
  /** Mock volume in mm³ */
  volume_mm3: number;
  /** Mock surface area in mm² */
  surface_area_mm2: number;
  /** Mock import format */
  format: string;
  /** Mock file path */
  file_path: string;
}

/** A mock recognized feature */
export interface MockFeature {
  type: string;
  depth_mm: number;
  width_mm: number;
  feature_id: string;
}

/** Mock response for heal operation */
export interface MockHealResponse {
  /** Mock body name */
  body_name: string;
  /** Number of edges stitched */
  edges_stitched: number;
  /** Number of faces healed */
  faces_healed: number;
  /** Heal status */
  status: "ok" | "partial" | "failed";
  /** Whether normals were aligned */
  normals_aligned: boolean;
  /** Holes filled */
  holes_filled: number;
  /** Any remaining open edges */
  remaining_open_edges: number;
}

/** Mock response for analyze operation */
export interface MockAnalyzeResponse {
  /** Body analyzed */
  body_name: string;
  /** Draft analysis results */
  draft_analysis: {
    ok_faces: number;
    problem_faces: number;
    min_draft_deg: number;
    threshold_deg: number;
  };
  /** Undercut detection results */
  undercut_analysis: {
    undercut_count: number;
    undercut_regions: string[];
  };
  /** Wall thickness results */
  wall_thickness: {
    thin_wall_count: number;
    min_thickness_mm: number;
    threshold_mm: number;
  };
}

/** Mock response for stock model operation */
export interface MockStockModelResponse {
  /** Stock model name */
  stock_name: string;
  /** Stock mode */
  mode: string;
  /** Bounding box of stock in mm */
  bounding_box: { x: number; y: number; z: number };
  /** Volume of stock in mm³ */
  volume_mm3: number;
  /** Material allowance used */
  allowance_mm: number;
  /** Whether it was set as active stock */
  set_as_active: boolean;
}

// ─── Mock Fixtures ────────────────────────────────────────────────────────────

/** Deterministic mock import response (no USB key required) */
const MOCK_IMPORT_RESPONSE: MockImportResponse = {
  body_name: "mock_imported_part",
  features: [
    { type: "pocket",   depth_mm: 15.0, width_mm: 30.0, feature_id: "FTR-001" },
    { type: "hole",     depth_mm: 20.0, width_mm: 10.0, feature_id: "FTR-002" },
    { type: "boss",     depth_mm:  8.0, width_mm: 25.0, feature_id: "FTR-003" },
    { type: "freeform", depth_mm:  5.0, width_mm: 50.0, feature_id: "FTR-004" },
    { type: "slot",     depth_mm:  6.0, width_mm: 12.0, feature_id: "FTR-005" },
  ],
  face_count:        128,
  edge_count:        256,
  bounding_box:      { x: 100.0, y: 80.0, z: 40.0 },
  volume_mm3:        210000.0,
  surface_area_mm2:  42000.0,
  format:            "STEP",
  file_path:         "/mock/test_part.stp",
};

/** Deterministic mock heal response */
const MOCK_HEAL_RESPONSE: MockHealResponse = {
  body_name:              "mock_imported_part",
  edges_stitched:         12,
  faces_healed:            4,
  status:                 "ok",
  normals_aligned:        true,
  holes_filled:            2,
  remaining_open_edges:    0,
};

/** Deterministic mock analyze response */
const MOCK_ANALYZE_RESPONSE: MockAnalyzeResponse = {
  body_name: "mock_imported_part",
  draft_analysis: {
    ok_faces:      118,
    problem_faces:  10,
    min_draft_deg:  0.5,
    threshold_deg:  3.0,
  },
  undercut_analysis: {
    undercut_count:    2,
    undercut_regions: ["undercut_region_1", "undercut_region_2"],
  },
  wall_thickness: {
    thin_wall_count:    3,
    min_thickness_mm:   1.2,
    threshold_mm:       1.0,
  },
};

/** Deterministic mock stock model response */
const MOCK_STOCK_RESPONSE: MockStockModelResponse = {
  stock_name:    "mock_stock_model",
  mode:          "offset_solid",
  bounding_box:  {
    x: 100.0 + 2 * DEFAULT_STOCK_ALLOWANCE_MM,
    y:  80.0 + 2 * DEFAULT_STOCK_ALLOWANCE_MM,
    z:  40.0 + 2 * DEFAULT_STOCK_ALLOWANCE_MM,
  },
  volume_mm3:    280000.0,
  allowance_mm:  DEFAULT_STOCK_ALLOWANCE_MM,  // 2.0mm — from constant
  set_as_active: true,
};

// ─── Mock Script Results ──────────────────────────────────────────────────────

function makeMockScriptResult(operation: string): CADSScriptResult {
  const script = [
    "# MOCK MODE: hyperCAD-S Automation Center (HYPERMILL_MOCK=true)",
    `# Operation: ${operation}`,
    "# This script is a test fixture — not for production use",
    "",
    "import hm  # mock",
    `print(f'[MOCK] ${operation} complete')`,
  ].join("\n");

  return {
    script,
    line_count: 6,
    operations: [operation],
    warnings: ["MOCK MODE: Using HyperCADSMockLayer — set HYPERMILL_MOCK=false for production"],
    mock_mode: true,
  };
}

// ─── Mock Layer Class ─────────────────────────────────────────────────────────

/**
 * HyperCADSMockLayer — intercepts CAD engine calls and returns deterministic fixtures.
 *
 * Activated by HYPERMILL_MOCK=true environment variable.
 * Returns same interface shapes as real engines — tests are interchangeable.
 */
export class HyperCADSMockLayer {
  private callCount = 0;

  /** Returns true when mock mode is active */
  isMockActive(): boolean {
    return process.env["HYPERMILL_MOCK"] === "true";
  }

  /**
   * Mock import response — returns realistic synthetic geometry data.
   * Shape matches the response structure expected by real AC Python execution.
   *
   * @param filePath - STEP file path (used in response for traceability)
   * @returns MockImportResponse
   */
  getMockImportResponse(filePath?: string): MockImportResponse {
    this.callCount++;
    return {
      ...MOCK_IMPORT_RESPONSE,
      file_path: filePath ?? MOCK_IMPORT_RESPONSE.file_path,
    };
  }

  /**
   * Mock heal response — returns realistic repair report.
   *
   * @param bodyName - Body name (used in response)
   * @returns MockHealResponse
   */
  getMockHealResponse(bodyName?: string): MockHealResponse {
    this.callCount++;
    return {
      ...MOCK_HEAL_RESPONSE,
      body_name: bodyName ?? MOCK_HEAL_RESPONSE.body_name,
    };
  }

  /**
   * Mock analyze response — returns realistic draft/undercut/wall-thickness data.
   *
   * @param bodyName - Body name
   * @returns MockAnalyzeResponse
   */
  getMockAnalyzeResponse(bodyName?: string): MockAnalyzeResponse {
    this.callCount++;
    return {
      ...MOCK_ANALYZE_RESPONSE,
      body_name: bodyName ?? MOCK_ANALYZE_RESPONSE.body_name,
    };
  }

  /**
   * Mock stock model response — bounding box uses DEFAULT_STOCK_ALLOWANCE_MM = 2.0mm.
   *
   * @param mode - Stock mode
   * @returns MockStockModelResponse
   */
  getMockStockModelResponse(mode?: string): MockStockModelResponse {
    this.callCount++;
    return {
      ...MOCK_STOCK_RESPONSE,
      mode: mode ?? MOCK_STOCK_RESPONSE.mode,
    };
  }

  /**
   * Mock CAD script result (for import/heal/analyze/stock operations).
   * Returns same CADSScriptResult interface as the real engines.
   *
   * @param operation - Operation name
   * @returns CADSScriptResult
   */
  getMockScriptResult(operation: string): CADSScriptResult {
    this.callCount++;
    return makeMockScriptResult(operation);
  }

  /**
   * Get the mock features list (for feature-to-strategy pipeline tests).
   * Returns same feature objects as MockImportResponse.features.
   *
   * @returns MockFeature[]
   */
  getMockFeatures(): MockFeature[] {
    return MOCK_IMPORT_RESPONSE.features;
  }

  /**
   * Get all mock responses in a single object (for integration tests).
   */
  getAllMockResponses(): {
    import: MockImportResponse;
    heal: MockHealResponse;
    analyze: MockAnalyzeResponse;
    stock: MockStockModelResponse;
  } {
    return {
      import:  MOCK_IMPORT_RESPONSE,
      heal:    MOCK_HEAL_RESPONSE,
      analyze: MOCK_ANALYZE_RESPONSE,
      stock:   MOCK_STOCK_RESPONSE,
    };
  }

  /** Total calls dispatched through the mock layer */
  getCallCount(): number {
    return this.callCount;
  }

  /** Reset call counter (for test isolation) */
  resetCallCount(): void {
    this.callCount = 0;
  }
}

/** Singleton export */
export const hyperCADSMockLayer = new HyperCADSMockLayer();
