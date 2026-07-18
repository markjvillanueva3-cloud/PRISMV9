/**
 * FusionCAMExtractorEngine — U-BOX55
 *
 * For each Fusion 360 design with CAM, extracts detailed setup/operation/tool data.
 * Produces structured data suitable for:
 *   - Speed/feed calibration (comparing Fusion values vs PRISM physics)
 *   - Strategy pattern mining (adaptive vs pocket vs contour usage)
 *   - Tool library enrichment
 *   - Post processor training
 *
 * @module engines/FusionCAMExtractorEngine
 */

import { log } from "../utils/Logger.js";
import type { FusionCloudConnectorEngine } from "./FusionCloudConnectorEngine.js";
import type { FileMetadataResult } from "./Fusion360LiveBridgeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CAMSetupExtract {
  setup_name: string;
  setup_type: string;
  operations: CAMOperationExtract[];
}

export interface CAMOperationExtract {
  name: string;
  type: string;
  strategy: string;
  tool: CAMToolExtract | null;
  speed_rpm: number | null;
  feed_mm_min: number | null;
  stepdown_mm: number | null;
  stepover_mm: number | null;
  chip_load_mm: number | null;
  surface_speed_m_min: number | null;
}

export interface CAMToolExtract {
  description: string;
  type: string;
  diameter_mm: number;
  flute_count: number;
}

export interface CAMExtractionResult {
  filename: string;
  file_id: string;
  document_name: string;
  body_count: number;
  has_cam: boolean;
  setups: CAMSetupExtract[];
  tools_used: CAMToolExtract[];
  strategies_used: string[];
  speed_feed_data: Array<{
    operation: string;
    strategy: string;
    tool_type: string;
    tool_diameter_mm: number;
    rpm: number;
    feed_mm_min: number;
    chip_load_mm: number | null;
    surface_speed_m_min: number | null;
  }>;
  total_operations: number;
  fiveaxis_operations: string[];
}

export interface BatchCAMExtractionResult {
  total_files: number;
  files_with_cam: number;
  extractions: CAMExtractionResult[];
  aggregate: {
    total_setups: number;
    total_operations: number;
    unique_tools: number;
    unique_strategies: string[];
    fiveaxis_count: number;
  };
}

// ============================================================================
// 5-AXIS STRATEGY DETECTION
// ============================================================================

const FIVEAXIS_STRATEGIES = new Set([
  "swarf", "flow", "multi_axis_contour", "multiaxis",
  "5axis_swarf", "5axis_flow", "5axis_contour",
  "morph_spiral", "morph_between_surfaces",
]);

// ============================================================================
// ENGINE
// ============================================================================

export class FusionCAMExtractorEngine {
  /**
   * Extract CAM data from a single design file.
   */
  async extract(
    connector: FusionCloudConnectorEngine,
    projectIndex: number,
    fileId: string,
    filename: string,
  ): Promise<CAMExtractionResult> {
    const meta = await connector.getFileMetadata(projectIndex, fileId);
    return this._processMetadata(meta, fileId, filename);
  }

  /**
   * Extract CAM data from pre-fetched metadata (avoids re-fetching).
   */
  extractFromMetadata(meta: FileMetadataResult, fileId: string, filename: string): CAMExtractionResult {
    return this._processMetadata(meta, fileId, filename);
  }

  /**
   * Batch extract CAM data from multiple files.
   */
  async batchExtract(
    connector: FusionCloudConnectorEngine,
    projectIndex: number,
    files: Array<{ id: string; name: string }>,
  ): Promise<BatchCAMExtractionResult> {
    const extractions: CAMExtractionResult[] = [];

    for (const file of files) {
      try {
        const result = await this.extract(connector, projectIndex, file.id, file.name);
        extractions.push(result);
      } catch (err: any) {
        log.warn(`[FusionCAMExtractor] Failed to extract ${file.name}: ${err.message}`);
      }
    }

    const allTools = new Map<string, CAMToolExtract>();
    const allStrategies = new Set<string>();
    let fiveaxisCount = 0;

    for (const e of extractions) {
      for (const t of e.tools_used) {
        allTools.set(`${t.type}_${t.diameter_mm}`, t);
      }
      for (const s of e.strategies_used) allStrategies.add(s);
      fiveaxisCount += e.fiveaxis_operations.length;
    }

    return {
      total_files: files.length,
      files_with_cam: extractions.filter(e => e.has_cam).length,
      extractions,
      aggregate: {
        total_setups: extractions.reduce((s, e) => s + e.setups.length, 0),
        total_operations: extractions.reduce((s, e) => s + e.total_operations, 0),
        unique_tools: allTools.size,
        unique_strategies: Array.from(allStrategies),
        fiveaxis_count: fiveaxisCount,
      },
    };
  }

  // ────────────────────────────────────────────────────────────────

  private _processMetadata(meta: FileMetadataResult, fileId: string, filename: string): CAMExtractionResult {
    const setups: CAMSetupExtract[] = [];
    const toolsUsed = new Map<string, CAMToolExtract>();
    const strategiesUsed = new Set<string>();
    const speedFeedData: CAMExtractionResult["speed_feed_data"] = [];
    const fiveaxisOps: string[] = [];
    let totalOps = 0;

    for (const setup of meta.cam.setups) {
      const ops: CAMOperationExtract[] = [];

      for (const op of setup.operations) {
        totalOps++;
        const tool = op.tool ? {
          description: op.tool.description,
          type: op.tool.type,
          diameter_mm: op.tool.diameter_mm,
          flute_count: op.tool.flute_count,
        } : null;

        const rpm = op.speed_feed?.rpm ?? null;
        const feed = op.speed_feed?.feed_mm_min ?? null;
        const chipLoad = (rpm && feed && tool?.flute_count)
          ? feed / (rpm * tool.flute_count)
          : null;
        const surfaceSpeed = (rpm && tool?.diameter_mm)
          ? (Math.PI * tool.diameter_mm * rpm) / 1000
          : null;

        ops.push({
          name: op.name,
          type: op.type,
          strategy: op.strategy,
          tool,
          speed_rpm: rpm,
          feed_mm_min: feed,
          stepdown_mm: op.speed_feed?.stepdown_mm ?? null,
          stepover_mm: op.speed_feed?.stepover_mm ?? null,
          chip_load_mm: chipLoad,
          surface_speed_m_min: surfaceSpeed,
        });

        if (op.strategy) strategiesUsed.add(op.strategy);
        if (tool) toolsUsed.set(`${tool.type}_${tool.diameter_mm}`, tool);

        if (FIVEAXIS_STRATEGIES.has(op.strategy?.toLowerCase() ?? "")) {
          fiveaxisOps.push(op.name);
        }

        if (rpm && feed && tool) {
          speedFeedData.push({
            operation: op.name,
            strategy: op.strategy,
            tool_type: tool.type,
            tool_diameter_mm: tool.diameter_mm,
            rpm,
            feed_mm_min: feed,
            chip_load_mm: chipLoad,
            surface_speed_m_min: surfaceSpeed,
          });
        }
      }

      setups.push({
        setup_name: setup.name,
        setup_type: setup.type,
        operations: ops,
      });
    }

    log.debug(`[FusionCAMExtractor] ${filename}: ${setups.length} setups, ` +
      `${totalOps} ops, ${toolsUsed.size} tools, ${fiveaxisOps.length} 5-axis`);

    return {
      filename,
      file_id: fileId,
      document_name: meta.document_name,
      body_count: meta.design.body_count,
      has_cam: meta.cam.has_cam,
      setups,
      tools_used: Array.from(toolsUsed.values()),
      strategies_used: Array.from(strategiesUsed),
      speed_feed_data: speedFeedData,
      total_operations: totalOps,
      fiveaxis_operations: fiveaxisOps,
    };
  }
}

// Singleton
export const fusionCAMExtractorEngine = new FusionCAMExtractorEngine();
