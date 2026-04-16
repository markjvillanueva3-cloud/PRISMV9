/**
 * PPAGISystemDashboardEngine — Unified PP-AGI observability
 *
 * Aggregates metrics from all PP-AGI engines into a single dashboard view.
 * Useful for:
 *   - Monitoring system health (uptime, predictions, queue depth)
 *   - Debugging (which engines have data, which are empty)
 *   - Capacity planning (knowing queue/tracker sizes)
 *   - System introspection (what does the PP-AGI system "know"?)
 *
 * Covers:
 *   - Embedding engines: dimension counts, cache sizes
 *   - Active learning: queue depth, priority distribution
 *   - Online learning: accuracy metrics, drift alerts
 *   - Template library: template counts by industry
 *   - Training pipeline: programs processed, controller distribution
 *
 * @module PPAGISystemDashboardEngine
 */

import { ppControllerEmbeddingEngine, EMBEDDING_DIM as CTRL_DIM } from "./PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine, MACHINE_EMBEDDING_DIM as MACH_DIM } from "./PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine, MATERIAL_EMBEDDING_DIM as MAT_DIM } from "./PPMaterialPropertyVectorEngine.js";
import { ppCuttingToolEncoderEngine, TOOL_EMBEDDING_DIM } from "./PPCuttingToolEncoderEngine.js";
import { ppPhysicsConditionEncoderEngine, PHYSICS_EMBEDDING_DIM } from "./PPPhysicsConditionEncoderEngine.js";
import { ppSafetyEnvelopeVectorEngine, SAFETY_ENVELOPE_DIM } from "./PPSafetyEnvelopeVectorEngine.js";
import { ppToolpathStrategyEncoderEngine, TOOLPATH_EMBEDDING_DIM } from "./PPToolpathStrategyEncoderEngine.js";
import { FUSED_DIM } from "./PPMultiModalFusionEngine.js";
import { ppActiveLearningQueueEngine } from "./PPActiveLearningQueueEngine.js";
import { ppOnlineLearningTrackerEngine } from "./PPOnlineLearningTrackerEngine.js";
import { ppScenarioTemplateLibraryEngine } from "./PPScenarioTemplateLibraryEngine.js";
import { ppTrainingDataPipelineEngine } from "./PPTrainingDataPipelineEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface EmbeddingEngineStats {
  name: string;
  dimension: number;
  known_items: number;
}

export interface SystemDashboard {
  timestamp: number;
  health: "healthy" | "degraded" | "offline";

  embeddings: {
    controller: EmbeddingEngineStats;
    machine: EmbeddingEngineStats;
    material: EmbeddingEngineStats;
    tool: EmbeddingEngineStats;
    physics: EmbeddingEngineStats;
    safety: EmbeddingEngineStats;
    toolpath: EmbeddingEngineStats;
    fused_total: number;
  };

  learning: {
    active_queue: {
      total: number;
      pending: number;
      labeled: number;
      by_priority: Record<string, number>;
      oldest_pending_hours: number;
    };
    online_tracker: {
      total_predictions: number;
      overall_accuracy: number;
      calibration: number;
      drift_alert_count: number;
      learning_opportunity_count: number;
      domains: Array<{ domain: string; accuracy: number; predictions: number }>;
    };
    training_pipeline: {
      programs_processed: number;
      total_lines: number;
      total_operations: number;
      controller_distribution: Record<string, number>;
    };
  };

  knowledge: {
    templates: {
      total: number;
      by_industry: Record<string, number>;
      by_source: Record<string, number>;
      avg_success_rate: number;
    };
  };

  capabilities: {
    total_embedding_engines: number;
    total_embedding_dimensions: number;
    can_analyze_gcode: boolean;
    can_score_uncertainty: boolean;
    can_explain_decisions: boolean;
    can_learn_from_feedback: boolean;
  };

  version: string;
}

export interface HealthCheckResult {
  engine: string;
  status: "ok" | "degraded" | "error";
  message?: string;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPAGISystemDashboardEngine {
  /**
   * Get the full PP-AGI system dashboard.
   */
  getDashboard(): SystemDashboard {
    const queueStats = ppActiveLearningQueueEngine.getStats();
    const onlineStats = ppOnlineLearningTrackerEngine.getStats();
    const templateStats = ppScenarioTemplateLibraryEngine.getStats();
    const pipelineStats = ppTrainingDataPipelineEngine.getStats();

    const health = this.computeHealth(queueStats, onlineStats);

    return {
      timestamp: Date.now(),
      health,
      embeddings: {
        controller: {
          name: "PPControllerEmbeddingEngine",
          dimension: CTRL_DIM,
          known_items: ppControllerEmbeddingEngine.embedAll().length,
        },
        machine: {
          name: "PPMachineVectorEncoderEngine",
          dimension: MACH_DIM,
          known_items: ppMachineVectorEncoderEngine.embedAll().length,
        },
        material: {
          name: "PPMaterialPropertyVectorEngine",
          dimension: MAT_DIM,
          known_items: ppMaterialPropertyVectorEngine.embedAll().length,
        },
        tool: {
          name: "PPCuttingToolEncoderEngine",
          dimension: TOOL_EMBEDDING_DIM,
          known_items: ppCuttingToolEncoderEngine.embedReferenceLibrary().length,
        },
        physics: {
          name: "PPPhysicsConditionEncoderEngine",
          dimension: PHYSICS_EMBEDDING_DIM,
          known_items: -1, // stateless
        },
        safety: {
          name: "PPSafetyEnvelopeVectorEngine",
          dimension: SAFETY_ENVELOPE_DIM,
          known_items: -1, // stateless
        },
        toolpath: {
          name: "PPToolpathStrategyEncoderEngine",
          dimension: TOOLPATH_EMBEDDING_DIM,
          known_items: ppToolpathStrategyEncoderEngine.embedReferenceLibrary().length,
        },
        fused_total: FUSED_DIM,
      },
      learning: {
        active_queue: {
          total: queueStats.total_queued,
          pending: queueStats.pending,
          labeled: queueStats.labeled,
          by_priority: queueStats.by_priority,
          oldest_pending_hours: round2(queueStats.oldest_pending_ms / 3_600_000),
        },
        online_tracker: {
          total_predictions: onlineStats.total_records,
          overall_accuracy: onlineStats.overall_accuracy,
          calibration: onlineStats.overall_calibration,
          drift_alert_count: onlineStats.drift_alerts.length,
          learning_opportunity_count: onlineStats.learning_opportunities.length,
          domains: onlineStats.domains.map(d => ({
            domain: d.domain,
            accuracy: d.accuracy,
            predictions: d.total_predictions,
          })),
        },
        training_pipeline: {
          programs_processed: pipelineStats.programs_processed,
          total_lines: pipelineStats.total_lines_parsed,
          total_operations: pipelineStats.total_operations,
          controller_distribution: pipelineStats.controller_distribution,
        },
      },
      knowledge: {
        templates: {
          total: templateStats.total_templates,
          by_industry: templateStats.by_industry,
          by_source: templateStats.by_validation_source,
          avg_success_rate: templateStats.avg_success_rate,
        },
      },
      capabilities: {
        total_embedding_engines: 8,
        total_embedding_dimensions: CTRL_DIM + MACH_DIM + MAT_DIM + TOOL_EMBEDDING_DIM + PHYSICS_EMBEDDING_DIM + SAFETY_ENVELOPE_DIM + TOOLPATH_EMBEDDING_DIM,
        can_analyze_gcode: true,
        can_score_uncertainty: true,
        can_explain_decisions: true,
        can_learn_from_feedback: true,
      },
      version: "pp-agi-v1.0.0",
    };
  }

  /**
   * Health check across all PP-AGI engines.
   */
  healthCheck(): HealthCheckResult[] {
    const checks: HealthCheckResult[] = [];

    // Check embedding engines
    try {
      const ctrl = ppControllerEmbeddingEngine.embedAll();
      checks.push({
        engine: "controller-embedding",
        status: ctrl.length > 0 ? "ok" : "degraded",
        message: `${ctrl.length} dialects`,
      });
    } catch (e: any) {
      checks.push({ engine: "controller-embedding", status: "error", message: e.message });
    }

    try {
      const mach = ppMachineVectorEncoderEngine.embedAll();
      checks.push({
        engine: "machine-vector",
        status: mach.length > 0 ? "ok" : "degraded",
        message: `${mach.length} machines`,
      });
    } catch (e: any) {
      checks.push({ engine: "machine-vector", status: "error", message: e.message });
    }

    try {
      const mats = ppMaterialPropertyVectorEngine.embedAll();
      checks.push({
        engine: "material-property",
        status: mats.length > 0 ? "ok" : "degraded",
        message: `${mats.length} materials`,
      });
    } catch (e: any) {
      checks.push({ engine: "material-property", status: "error", message: e.message });
    }

    try {
      const tools = ppCuttingToolEncoderEngine.embedReferenceLibrary();
      checks.push({
        engine: "tool-encoder",
        status: tools.length > 0 ? "ok" : "degraded",
        message: `${tools.length} reference tools`,
      });
    } catch (e: any) {
      checks.push({ engine: "tool-encoder", status: "error", message: e.message });
    }

    try {
      const toolpaths = ppToolpathStrategyEncoderEngine.embedReferenceLibrary();
      checks.push({
        engine: "toolpath-strategy",
        status: toolpaths.length > 0 ? "ok" : "degraded",
        message: `${toolpaths.length} reference strategies`,
      });
    } catch (e: any) {
      checks.push({ engine: "toolpath-strategy", status: "error", message: e.message });
    }

    // Check stateful engines
    try {
      const queueStats = ppActiveLearningQueueEngine.getStats();
      checks.push({
        engine: "active-learning-queue",
        status: "ok",
        message: `${queueStats.total_queued} queued`,
      });
    } catch (e: any) {
      checks.push({ engine: "active-learning-queue", status: "error", message: e.message });
    }

    try {
      const trackerStats = ppOnlineLearningTrackerEngine.getStats();
      const trackerStatus = trackerStats.drift_alerts.some(a => a.severity === "critical")
        ? "degraded" : "ok";
      checks.push({
        engine: "online-learning-tracker",
        status: trackerStatus,
        message: `${trackerStats.total_records} predictions, ${trackerStats.drift_alerts.length} drift alerts`,
      });
    } catch (e: any) {
      checks.push({ engine: "online-learning-tracker", status: "error", message: e.message });
    }

    try {
      const tmplStats = ppScenarioTemplateLibraryEngine.getStats();
      checks.push({
        engine: "template-library",
        status: tmplStats.total_templates > 0 ? "ok" : "degraded",
        message: `${tmplStats.total_templates} templates`,
      });
    } catch (e: any) {
      checks.push({ engine: "template-library", status: "error", message: e.message });
    }

    return checks;
  }

  /**
   * Summary report (concise text format).
   */
  summary(): string {
    const d = this.getDashboard();
    const lines: string[] = [];

    lines.push(`PP-AGI System Dashboard — ${new Date(d.timestamp).toISOString()}`);
    lines.push(`Health: ${d.health.toUpperCase()} | Version: ${d.version}`);
    lines.push(``);
    lines.push(`Embeddings (${d.capabilities.total_embedding_engines} engines, ${d.capabilities.total_embedding_dimensions} total dimensions):`);
    lines.push(`  Controller: ${d.embeddings.controller.dimension}-dim, ${d.embeddings.controller.known_items} dialects`);
    lines.push(`  Machine: ${d.embeddings.machine.dimension}-dim, ${d.embeddings.machine.known_items} machines`);
    lines.push(`  Material: ${d.embeddings.material.dimension}-dim, ${d.embeddings.material.known_items} materials`);
    lines.push(`  Tool: ${d.embeddings.tool.dimension}-dim, ${d.embeddings.tool.known_items} reference tools`);
    lines.push(`  Toolpath: ${d.embeddings.toolpath.dimension}-dim, ${d.embeddings.toolpath.known_items} strategies`);
    lines.push(`  Physics/Safety: ${d.embeddings.physics.dimension}/${d.embeddings.safety.dimension} dim (stateless)`);
    lines.push(`  Fused: ${d.embeddings.fused_total}-dim multi-modal`);
    lines.push(``);
    lines.push(`Learning State:`);
    lines.push(`  Active queue: ${d.learning.active_queue.pending} pending / ${d.learning.active_queue.total} total`);
    lines.push(`  Online tracker: ${d.learning.online_tracker.total_predictions} predictions, ${(d.learning.online_tracker.overall_accuracy * 100).toFixed(0)}% accuracy`);
    lines.push(`  Training pipeline: ${d.learning.training_pipeline.programs_processed} programs processed`);
    lines.push(``);
    lines.push(`Knowledge:`);
    lines.push(`  Templates: ${d.knowledge.templates.total} (avg success ${(d.knowledge.templates.avg_success_rate * 100).toFixed(0)}%)`);

    return lines.join("\n");
  }

  // ── Private ──────────────────────────────────────────────────────────

  private computeHealth(
    queueStats: ReturnType<typeof ppActiveLearningQueueEngine.getStats>,
    onlineStats: ReturnType<typeof ppOnlineLearningTrackerEngine.getStats>,
  ): "healthy" | "degraded" | "offline" {
    // Critical drift alerts → degraded
    if (onlineStats.drift_alerts.some(a => a.severity === "critical")) return "degraded";
    // Many critical pending items → degraded
    if (queueStats.by_priority.critical > 10) return "degraded";
    // Queue backlog > 7 days → degraded
    if (queueStats.oldest_pending_ms > 7 * 24 * 3600 * 1000) return "degraded";
    return "healthy";
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }

export const ppAGISystemDashboardEngine = new PPAGISystemDashboardEngine();
