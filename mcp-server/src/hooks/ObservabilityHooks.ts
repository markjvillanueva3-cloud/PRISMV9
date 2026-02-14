/**
 * PRISM MCP Server - Observability Hooks
 * Session 6.2G: Metrics, Logging, Monitoring, Audit Trails
 * 
 * Hooks for observing and monitoring system behavior:
 * - Performance tracking
 * - Usage analytics
 * - Error logging
 * - Audit trail
 * - Quality trends
 * - Resource monitoring
 * 
 * These hooks provide visibility into PRISM's operation
 * without blocking or modifying behavior.
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// METRICS STORE
// ============================================================================

interface MetricPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

interface PerformanceMetric {
  name: string;
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
  p95: number;
  values: number[];  // Keep last 100 for percentile calculation
}

interface UsageMetric {
  operation: string;
  count: number;
  lastUsed: string;
  byUser: Record<string, number>;
  bySession: Record<string, number>;
}

interface ErrorMetric {
  errorType: string;
  count: number;
  lastOccurred: string;
  examples: Array<{ timestamp: string; message: string; context?: string }>;
}

interface QualityTrend {
  metric: string;
  values: MetricPoint[];
  trend: "improving" | "stable" | "degrading" | "unknown";
  changeRate: number;  // Per hour
}

// In-memory metrics store
const metricsStore = {
  performance: new Map<string, PerformanceMetric>(),
  usage: new Map<string, UsageMetric>(),
  errors: new Map<string, ErrorMetric>(),
  qualityTrends: new Map<string, QualityTrend>(),
  auditLog: [] as Array<{
    timestamp: string;
    operation: string;
    target: string;
    result: string;
    details?: Record<string, unknown>;
  }>,
  resourceMetrics: {
    toolCalls: 0,
    fileOperations: 0,
    calculations: 0,
    validations: 0,
    hookExecutions: 0
  }
};

// ============================================================================
// PERFORMANCE TRACKING HOOKS
// ============================================================================

/**
 * Track operation performance
 */
const onPerformanceTrack: HookDefinition = {
  id: "on-performance-track",
  name: "Performance Tracking",
  description: "Tracks performance metrics for operations.",
  
  phase: "on-outcome",
  category: "observability",
  mode: "silent",
  priority: "background",
  enabled: true,
  
  tags: ["performance", "metrics", "monitoring"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onPerformanceTrack;
    
    const operation = context.operation || "unknown";
    const duration = context.metadata?.durationMs as number | undefined;
    
    if (duration === undefined) {
      return hookSuccess(hook, "No duration to track");
    }
    
    // Get or create metric
    let metric = metricsStore.performance.get(operation);
    if (!metric) {
      metric = {
        name: operation,
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
        p95: 0,
        values: []
      };
      metricsStore.performance.set(operation, metric);
    }
    
    // Update metric
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
    metric.avg = metric.total / metric.count;
    
    // Keep last 100 values for percentile
    metric.values.push(duration);
    if (metric.values.length > 100) {
      metric.values.shift();
    }
    
    // Calculate P95
    const sorted = [...metric.values].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    metric.p95 = sorted[p95Index] || duration;
    
    return hookSuccess(hook, `Performance tracked: ${operation} ${duration}ms`);
  }
};

/**
 * Track slow operations
 */
const onSlowOperationDetect: HookDefinition = {
  id: "on-slow-operation-detect",
  name: "Slow Operation Detection",
  description: "Detects and logs operations that exceed expected duration.",
  
  phase: "on-outcome",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["performance", "slow", "alert"],
  
  condition: (context: HookContext): boolean => {
    const duration = context.metadata?.durationMs as number | undefined;
    return duration !== undefined && duration > 5000;  // > 5 seconds
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onSlowOperationDetect;
    
    const operation = context.operation || "unknown";
    const duration = context.metadata?.durationMs as number;
    
    log.warn(`SLOW OPERATION: ${operation} took ${(duration/1000).toFixed(2)}s`);
    
    return hookSuccess(hook, `Slow operation detected: ${operation} (${duration}ms)`, {
      data: { operation, durationMs: duration, threshold: 5000 },
      actions: ["performance_alert"]
    });
  }
};

// ============================================================================
// USAGE ANALYTICS HOOKS
// ============================================================================

/**
 * Track operation usage
 */
const onUsageTrack: HookDefinition = {
  id: "on-usage-track",
  name: "Usage Analytics",
  description: "Tracks usage patterns for operations.",
  
  phase: "on-outcome",
  category: "observability",
  mode: "silent",
  priority: "background",
  enabled: true,
  
  tags: ["usage", "analytics", "tracking"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onUsageTrack;
    
    const operation = context.operation || "unknown";
    const sessionId = context.session?.sessionId || "unknown";
    const userId = context.metadata?.userId as string || "default";
    
    // Get or create usage metric
    let usage = metricsStore.usage.get(operation);
    if (!usage) {
      usage = {
        operation,
        count: 0,
        lastUsed: new Date().toISOString(),
        byUser: {},
        bySession: {}
      };
      metricsStore.usage.set(operation, usage);
    }
    
    // Update usage
    usage.count++;
    usage.lastUsed = new Date().toISOString();
    usage.byUser[userId] = (usage.byUser[userId] || 0) + 1;
    usage.bySession[sessionId] = (usage.bySession[sessionId] || 0) + 1;
    
    // Update resource counters
    if (operation.includes("file")) metricsStore.resourceMetrics.fileOperations++;
    if (operation.includes("calc")) metricsStore.resourceMetrics.calculations++;
    if (operation.includes("valid")) metricsStore.resourceMetrics.validations++;
    metricsStore.resourceMetrics.toolCalls++;
    
    return hookSuccess(hook, `Usage tracked: ${operation}`);
  }
};

/**
 * Track tool call frequency
 */
const onToolCallFrequency: HookDefinition = {
  id: "on-tool-call-frequency",
  name: "Tool Call Frequency",
  description: "Monitors tool call frequency for buffer zone tracking.",
  
  phase: "on-tool-call",
  category: "observability",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["tool-call", "frequency", "buffer-zone"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onToolCallFrequency;
    
    const toolName = context.operation || "unknown";
    const callCount = context.session?.toolCalls || 0;
    
    // Determine buffer zone
    let zone: string;
    let zoneColor: string;
    
    if (callCount <= 8) {
      zone = "GREEN";
      zoneColor = "🟢";
    } else if (callCount <= 14) {
      zone = "YELLOW";
      zoneColor = "🟡";
    } else if (callCount <= 18) {
      zone = "RED";
      zoneColor = "🔴";
    } else {
      zone = "BLACK";
      zoneColor = "⚫";
    }
    
    return hookSuccess(hook, `${zoneColor} Tool call #${callCount}: ${toolName}`, {
      data: { toolName, callCount, zone }
    });
  }
};

// ============================================================================
// ERROR LOGGING HOOKS
// ============================================================================

/**
 * Log errors
 */
const onErrorLog: HookDefinition = {
  id: "on-error-log",
  name: "Error Logging",
  description: "Logs and categorizes errors for analysis.",
  
  phase: "on-error",
  category: "observability",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["error", "logging", "analysis"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onErrorLog;
    
    const error = context.metadata?.error as {
      type: string;
      message: string;
      stack?: string;
    } | undefined;
    
    if (!error) {
      return hookSuccess(hook, "No error to log");
    }
    
    // Get or create error metric
    let errorMetric = metricsStore.errors.get(error.type);
    if (!errorMetric) {
      errorMetric = {
        errorType: error.type,
        count: 0,
        lastOccurred: new Date().toISOString(),
        examples: []
      };
      metricsStore.errors.set(error.type, errorMetric);
    }
    
    // Update error metric
    errorMetric.count++;
    errorMetric.lastOccurred = new Date().toISOString();
    
    // Keep last 5 examples
    errorMetric.examples.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      context: context.operation
    });
    if (errorMetric.examples.length > 5) {
      errorMetric.examples.shift();
    }
    
    log.error(`Error logged: ${error.type} - ${error.message}`);
    
    return hookSuccess(hook, `Error logged: ${error.type}`, {
      data: { errorType: error.type, totalOccurrences: errorMetric.count }
    });
  }
};

/**
 * Track validation failures
 */
const onValidationFailure: HookDefinition = {
  id: "on-validation-failure",
  name: "Validation Failure Tracking",
  description: "Tracks patterns in validation failures.",
  
  phase: "on-outcome",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["validation", "failure", "tracking"],
  
  condition: (context: HookContext): boolean => {
    return context.metadata?.validationFailed === true;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onValidationFailure;
    
    const validationType = context.metadata?.validationType as string || "unknown";
    const failures = context.metadata?.failures as string[] || [];
    
    log.warn(`Validation failed: ${validationType} - ${failures.join(", ")}`);
    
    return hookSuccess(hook, `Validation failure tracked: ${validationType}`, {
      data: { validationType, failures }
    });
  }
};

// ============================================================================
// AUDIT TRAIL HOOKS
// ============================================================================

/**
 * Audit file operations
 */
const onFileAudit: HookDefinition = {
  id: "on-file-audit",
  name: "File Operation Audit",
  description: "Creates audit trail for file operations.",
  
  phase: "post-file-write",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["audit", "file", "trail"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onFileAudit;
    
    const entry = {
      timestamp: new Date().toISOString(),
      operation: context.operation || "file_write",
      target: context.target?.path || "unknown",
      result: context.metadata?.success ? "success" : "failure",
      details: {
        oldSize: context.content?.old ? 
          (typeof context.content.old === "string" ? context.content.old.length : JSON.stringify(context.content.old).length) : undefined,
        newSize: context.content?.new ?
          (typeof context.content.new === "string" ? context.content.new.length : JSON.stringify(context.content.new).length) : undefined
      }
    };
    
    metricsStore.auditLog.push(entry);
    
    // Keep last 1000 entries
    if (metricsStore.auditLog.length > 1000) {
      metricsStore.auditLog.shift();
    }
    
    return hookSuccess(hook, `Audit entry created: ${entry.operation}`, {
      data: entry
    });
  }
};

/**
 * Audit data modifications
 */
const onDataAudit: HookDefinition = {
  id: "on-data-audit",
  name: "Data Modification Audit",
  description: "Creates audit trail for data modifications (materials, machines, alarms).",
  
  phase: "post-material-add",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["audit", "data", "trail"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onDataAudit;
    
    const entry = {
      timestamp: new Date().toISOString(),
      operation: context.operation || "data_modify",
      target: `${context.target?.type}:${context.target?.id || "unknown"}`,
      result: context.metadata?.success ? "success" : "failure",
      details: context.metadata?.changes as Record<string, unknown> | undefined
    };
    
    metricsStore.auditLog.push(entry);
    
    return hookSuccess(hook, `Data audit entry created`, {
      data: entry
    });
  }
};

// ============================================================================
// QUALITY TRENDS HOOKS
// ============================================================================

/**
 * Track quality metric trends
 */
const onQualityTrend: HookDefinition = {
  id: "on-quality-trend",
  name: "Quality Trend Tracking",
  description: "Tracks trends in quality metrics over time.",
  
  phase: "on-outcome",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  
  tags: ["quality", "trend", "tracking"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onQualityTrend;
    
    const qualityMetrics = context.qualityMetrics;
    if (!qualityMetrics) {
      return hookSuccess(hook, "No quality metrics to track");
    }
    
    // Track each quality component
    const metricsToTrack = [
      { name: "omega", value: qualityMetrics.omega },
      { name: "safety", value: qualityMetrics.safety },
      { name: "reasoning", value: qualityMetrics.reasoning },
      { name: "code", value: qualityMetrics.code },
      { name: "process", value: qualityMetrics.process }
    ];
    
    for (const { name, value } of metricsToTrack) {
      if (value === undefined) continue;
      
      let trend = metricsStore.qualityTrends.get(name);
      if (!trend) {
        trend = {
          metric: name,
          values: [],
          trend: "unknown",
          changeRate: 0
        };
        metricsStore.qualityTrends.set(name, trend);
      }
      
      // Add new value
      trend.values.push({
        timestamp: new Date().toISOString(),
        value
      });
      
      // Keep last 50 values
      if (trend.values.length > 50) {
        trend.values.shift();
      }
      
      // Calculate trend
      if (trend.values.length >= 5) {
        const recent = trend.values.slice(-5);
        const older = trend.values.slice(-10, -5);
        
        if (older.length >= 5) {
          const recentAvg = recent.reduce((s, v) => s + v.value, 0) / recent.length;
          const olderAvg = older.reduce((s, v) => s + v.value, 0) / older.length;
          
          const change = recentAvg - olderAvg;
          trend.changeRate = change;
          
          if (change > 0.02) {
            trend.trend = "improving";
          } else if (change < -0.02) {
            trend.trend = "degrading";
          } else {
            trend.trend = "stable";
          }
        }
      }
    }
    
    return hookSuccess(hook, "Quality trends updated", {
      data: {
        omega: qualityMetrics.omega,
        safety: qualityMetrics.safety,
        trends: Array.from(metricsStore.qualityTrends.values()).map(t => ({
          metric: t.metric,
          trend: t.trend,
          changeRate: t.changeRate.toFixed(4)
        }))
      }
    });
  }
};

/**
 * Alert on quality degradation
 */
const onQualityDegradation: HookDefinition = {
  id: "on-quality-degradation",
  name: "Quality Degradation Alert",
  description: "Alerts when quality metrics show degradation trend.",
  
  phase: "on-outcome",
  category: "observability",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["quality", "degradation", "alert"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onQualityDegradation;
    
    const degrading: string[] = [];
    
    for (const [name, trend] of metricsStore.qualityTrends) {
      if (trend.trend === "degrading") {
        degrading.push(`${name}: ${(trend.changeRate * 100).toFixed(1)}%/period`);
      }
    }
    
    if (degrading.length === 0) {
      return hookSuccess(hook, "No quality degradation detected");
    }
    
    return hookSuccess(hook, `Quality degradation detected in ${degrading.length} metrics`, {
      warnings: degrading,
      data: { degradingMetrics: degrading }
    });
  }
};

// ============================================================================
// RESOURCE MONITORING HOOKS
// ============================================================================

/**
 * Monitor resource usage
 */
const onResourceMonitor: HookDefinition = {
  id: "on-resource-monitor",
  name: "Resource Usage Monitor",
  description: "Monitors resource usage metrics.",
  
  phase: "on-session-checkpoint",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  
  tags: ["resource", "monitoring", "usage"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onResourceMonitor;
    
    const metrics = metricsStore.resourceMetrics;
    
    return hookSuccess(hook, "Resource metrics collected", {
      data: {
        toolCalls: metrics.toolCalls,
        fileOperations: metrics.fileOperations,
        calculations: metrics.calculations,
        validations: metrics.validations,
        hookExecutions: metrics.hookExecutions
      }
    });
  }
};

// ============================================================================
// METRICS ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all observability metrics
 */
export function getObservabilityMetrics() {
  return {
    performance: Array.from(metricsStore.performance.values()),
    usage: Array.from(metricsStore.usage.values()),
    errors: Array.from(metricsStore.errors.values()),
    qualityTrends: Array.from(metricsStore.qualityTrends.values()),
    resources: metricsStore.resourceMetrics,
    auditLogSize: metricsStore.auditLog.length
  };
}

/**
 * Get audit log
 */
export function getAuditLog(limit: number = 100) {
  return metricsStore.auditLog.slice(-limit);
}

/**
 * Get performance metrics for an operation
 */
export function getPerformanceMetric(operation: string) {
  return metricsStore.performance.get(operation);
}

/**
 * Reset metrics
 */
export function resetMetrics() {
  metricsStore.performance.clear();
  metricsStore.usage.clear();
  metricsStore.errors.clear();
  metricsStore.qualityTrends.clear();
  metricsStore.auditLog = [];
  metricsStore.resourceMetrics = {
    toolCalls: 0,
    fileOperations: 0,
    calculations: 0,
    validations: 0,
    hookExecutions: 0
  };
}

// ============================================================================
// EXPORT ALL OBSERVABILITY HOOKS
// ============================================================================

export const observabilityHooks: HookDefinition[] = [
  // Performance
  onPerformanceTrack,
  onSlowOperationDetect,
  
  // Usage
  onUsageTrack,
  onToolCallFrequency,
  
  // Errors
  onErrorLog,
  onValidationFailure,
  
  // Audit
  onFileAudit,
  onDataAudit,
  
  // Quality
  onQualityTrend,
  onQualityDegradation,
  
  // Resource
  onResourceMonitor
];

export {
  onPerformanceTrack,
  onSlowOperationDetect,
  onUsageTrack,
  onToolCallFrequency,
  onErrorLog,
  onValidationFailure,
  onFileAudit,
  onDataAudit,
  onQualityTrend,
  onQualityDegradation,
  onResourceMonitor
};
