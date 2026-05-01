/**
 * PRISM MCP Server - Hook Management Tools
 * 10 NEW tools for comprehensive hook management per Emergency Roadmap v4.0
 * Phase 0 - Session 17: Hook Wiring Completion
 * 
 * Tools (10):
 * 1. prism_hook_fire - Manually fire hook with context
 * 2. prism_hook_chain_execute - Fire sequence of hooks
 * 3. prism_hook_status - All active hooks status
 * 4. prism_hook_history - Recent executions with timing
 * 5. prism_hook_enable - Enable hook with audit
 * 6. prism_hook_disable - Disable with reason (audit trail)
 * 7. prism_hook_coverage - % operations hooked
 * 8. prism_hook_gaps - Operations without hooks
 * 9. prism_hook_performance - Execution time analytics
 * 10. prism_hook_failures - Recent failures + patterns
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import { hookEngine, eventBus } from "../engines/HookEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function successResponse(content: string, metadata?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: content }],
    metadata
  };
}

function formatAsJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const HookFireSchema = z.object({
  hook_name: z.string().describe("Name of the hook to fire (e.g., 'calculation:before')"),
  context: z.record(z.any()).default({}).describe("Context data to pass to the hook"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookChainExecuteSchema = z.object({
  hooks: z.array(z.string()).describe("Array of hook names to execute in sequence"),
  context: z.record(z.any()).default({}).describe("Shared context for all hooks"),
  stop_on_failure: z.boolean().default(true).describe("Stop chain if any hook fails"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookStatusSchema = z.object({
  filter_enabled: z.boolean().optional().describe("Filter by enabled status"),
  filter_domain: z.string().optional().describe("Filter by domain"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookHistorySchema = z.object({
  last_n: z.number().default(50).describe("Number of recent executions to return"),
  hook_filter: z.string().optional().describe("Filter by hook name pattern"),
  only_failures: z.boolean().default(false).describe("Show only failed executions"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookEnableSchema = z.object({
  hook_id: z.string().describe("ID of the hook to enable"),
  reason: z.string().optional().describe("Reason for enabling (audit trail)"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookDisableSchema = z.object({
  hook_id: z.string().describe("ID of the hook to disable"),
  reason: z.string().describe("Required reason for disabling (audit trail)"),
  duration_minutes: z.number().optional().describe("Optional: auto-re-enable after N minutes"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookCoverageSchema = z.object({
  domain: z.string().optional().describe("Specific domain to check coverage for"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookGapsSchema = z.object({
  include_recommendations: z.boolean().default(true).describe("Include recommendations for missing hooks"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookPerformanceSchema = z.object({
  time_range_hours: z.number().default(24).describe("Time range to analyze"),
  sort_by: z.enum(["duration", "count", "failures"]).default("duration"),
  limit: z.number().default(20).describe("Number of hooks to return"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const HookFailuresSchema = z.object({
  last_n: z.number().default(100).describe("Number of recent failures to return"),
  group_by_hook: z.boolean().default(true).describe("Group failures by hook ID"),
  include_patterns: z.boolean().default(true).describe("Include failure pattern analysis"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

// ============================================================================
// STATE TRACKING
// ============================================================================

interface HookExecution {
  hookId: string;
  hookName: string;
  timestamp: Date;
  duration_ms: number;
  success: boolean;
  error?: string;
  context: Record<string, unknown>;
}

interface HookAuditEntry {
  hookId: string;
  action: "enable" | "disable";
  timestamp: Date;
  reason: string;
  user: string;
  autoReenableAt?: Date;
}

// In-memory state (would be persistent in production)
const executionHistory: HookExecution[] = [];
const auditLog: HookAuditEntry[] = [];
const disabledHooks: Map<string, { reason: string; until?: Date }> = new Map();

// Operation coverage tracking
const REQUIRED_OPERATIONS = [
  { name: "material.query", hooks: ["beforeQuery", "afterQuery", "onValidation"] },
  { name: "calculation.execute", hooks: ["beforeCalc", "afterCalc", "onSafetyViolation", "onUncertainty"] },
  { name: "file.create", hooks: ["beforeCreate", "afterCreate", "onValidationFail"] },
  { name: "state.mutate", hooks: ["beforeMutate", "afterMutate", "onRollback"] },
  { name: "agent.spawn", hooks: ["beforeSpawn", "afterSpawn", "onAgentError"] },
  { name: "batch.execute", hooks: ["beforeBatch", "afterBatch", "onPartialFailure"] },
  { name: "formula.apply", hooks: ["beforeApply", "afterApply", "onMAPEExceed"] }
];

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerHookManagementTools(server: McpServer): void {
  
  // =========================================================================
  // 1. PRISM_HOOK_FIRE - Manually fire hook with context
  // =========================================================================
  
  server.tool(
    "prism_hook_fire_v2",
    "Manually fire a hook with custom context. Use for testing or manual triggering.",
    HookFireSchema.shape,
    async (params) => {
      log.info(`[prism_hook_fire] ${params.hook_name}`);
      const startTime = Date.now();
      
      try {
        // Check if hook is disabled
        if (disabledHooks.has(params.hook_name)) {
          const disabled = disabledHooks.get(params.hook_name)!;
          if (!disabled.until || disabled.until > new Date()) {
            throw new Error(`Hook is disabled: ${disabled.reason}`);
          } else {
            disabledHooks.delete(params.hook_name);
          }
        }
        
        // Fire the hook
        eventBus.emitEvent(params.hook_name, params.context);
        
        const duration = Date.now() - startTime;
        
        // Record execution
        executionHistory.push({
          hookId: params.hook_name,
          hookName: params.hook_name,
          timestamp: new Date(),
          duration_ms: duration,
          success: true,
          context: params.context
        });
        
        // Keep history bounded
        if (executionHistory.length > 10000) {
          executionHistory.splice(0, 1000);
        }
        
        let content: string;
        if (params.response_format === "markdown") {
          content = `## ✅ Hook Fired Successfully\n\n`;
          content += `| Property | Value |\n`;
          content += `|----------|-------|\n`;
          content += `| Hook | \`${params.hook_name}\` |\n`;
          content += `| Duration | ${formatDuration(duration)} |\n`;
          content += `| Timestamp | ${new Date().toISOString()} |\n`;
          if (Object.keys(params.context).length > 0) {
            content += `\n### Context\n\`\`\`json\n${formatAsJson(params.context)}\n\`\`\`\n`;
          }
        } else {
          content = formatAsJson({
            success: true,
            hook: params.hook_name,
            duration_ms: duration,
            timestamp: new Date().toISOString(),
            context: params.context
          });
        }
        
        return successResponse(content, { success: true, duration_ms: duration });
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        executionHistory.push({
          hookId: params.hook_name,
          hookName: params.hook_name,
          timestamp: new Date(),
          duration_ms: duration,
          success: false,
          error: errorMsg,
          context: params.context
        });
        
        let content: string;
        if (params.response_format === "markdown") {
          content = `## ❌ Hook Fire Failed\n\n`;
          content += `| Property | Value |\n`;
          content += `|----------|-------|\n`;
          content += `| Hook | \`${params.hook_name}\` |\n`;
          content += `| Error | ${errorMsg} |\n`;
          content += `| Duration | ${formatDuration(duration)} |\n`;
        } else {
          content = formatAsJson({
            success: false,
            hook: params.hook_name,
            error: errorMsg,
            duration_ms: duration
          });
        }
        
        return successResponse(content, { success: false, error: errorMsg });
      }
    }
  );

  // =========================================================================
  // 2. PRISM_HOOK_CHAIN_EXECUTE - Fire sequence of hooks
  // =========================================================================
  
  server.tool(
    "prism_hook_chain_execute",
    "Execute a sequence of hooks in order. Optionally stop on first failure.",
    HookChainExecuteSchema.shape,
    async (params) => {
      log.info(`[prism_hook_chain_execute] ${params.hooks.length} hooks`);
      const startTime = Date.now();
      
      const results: Array<{
        hook: string;
        success: boolean;
        duration_ms: number;
        error?: string;
      }> = [];
      
      let chainSuccess = true;
      let stoppedAt: string | null = null;
      
      for (const hookName of params.hooks) {
        const hookStart = Date.now();
        
        try {
          if (disabledHooks.has(hookName)) {
            throw new Error(`Hook disabled: ${disabledHooks.get(hookName)!.reason}`);
          }
          
          eventBus.emitEvent(hookName, params.context);
          
          results.push({
            hook: hookName,
            success: true,
            duration_ms: Date.now() - hookStart
          });
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.push({
            hook: hookName,
            success: false,
            duration_ms: Date.now() - hookStart,
            error: errorMsg
          });
          
          chainSuccess = false;
          if (params.stop_on_failure) {
            stoppedAt = hookName;
            break;
          }
        }
      }
      
      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      let content: string;
      if (params.response_format === "markdown") {
        const statusIcon = chainSuccess ? "✅" : "⛔";
        content = `## ${statusIcon} Hook Chain Execution\n\n`;
        content += `| Metric | Value |\n`;
        content += `|--------|-------|\n`;
        content += `| Status | ${chainSuccess ? "**Success**" : "**Failed**"} |\n`;
        content += `| Total Hooks | ${params.hooks.length} |\n`;
        content += `| Executed | ${results.length} |\n`;
        content += `| Succeeded | ${successCount} |\n`;
        content += `| Failed | ${failCount} |\n`;
        content += `| Duration | ${formatDuration(totalDuration)} |\n`;
        if (stoppedAt) {
          content += `| Stopped At | \`${stoppedAt}\` |\n`;
        }
        
        content += `\n### Results\n`;
        content += `| Hook | Status | Duration | Error |\n`;
        content += `|------|--------|----------|-------|\n`;
        results.forEach(r => {
          const status = r.success ? "✅" : "❌";
          content += `| \`${r.hook}\` | ${status} | ${formatDuration(r.duration_ms)} | ${r.error || "-"} |\n`;
        });
        
      } else {
        content = formatAsJson({
          success: chainSuccess,
          totalHooks: params.hooks.length,
          executed: results.length,
          succeeded: successCount,
          failed: failCount,
          duration_ms: totalDuration,
          stoppedAt,
          results
        });
      }
      
      return successResponse(content, { success: chainSuccess, duration_ms: totalDuration });
    }
  );

  // =========================================================================
  // 3. PRISM_HOOK_STATUS - All active hooks status
  // =========================================================================
  
  server.tool(
    "prism_hook_status_v2",
    "Get status of all registered hooks including enabled/disabled state.",
    HookStatusSchema.shape,
    async (params) => {
      log.info(`[prism_hook_status]`);
      
      let hooks = hookEngine.getAllHooks();
      
      if (params.filter_enabled !== undefined) {
        hooks = hooks.filter(h => h.enabled === params.filter_enabled);
      }
      
      if (params.filter_domain) {
        hooks = hooks.filter(h => 
          h.id.toLowerCase().includes(params.filter_domain!.toLowerCase()) ||
          h.event.toLowerCase().includes(params.filter_domain!.toLowerCase())
        );
      }
      
      // Enhance with disabled status
      const enhancedHooks = hooks.map(h => ({
        ...h,
        manuallyDisabled: disabledHooks.has(h.id),
        disableReason: disabledHooks.get(h.id)?.reason,
        disableUntil: disabledHooks.get(h.id)?.until?.toISOString()
      }));
      
      const enabledCount = enhancedHooks.filter(h => h.enabled && !h.manuallyDisabled).length;
      const disabledCount = enhancedHooks.filter(h => !h.enabled || h.manuallyDisabled).length;
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Hook Status Report\n\n`;
        content += `| Metric | Value |\n`;
        content += `|--------|-------|\n`;
        content += `| Total Hooks | ${enhancedHooks.length} |\n`;
        content += `| Enabled | ${enabledCount} |\n`;
        content += `| Disabled | ${disabledCount} |\n`;
        content += `| Manually Disabled | ${disabledHooks.size} |\n`;
        
        content += `\n### Hooks by Status\n`;
        content += `| ID | Event | Phase | Priority | Status |\n`;
        content += `|----|-------|-------|----------|--------|\n`;
        
        enhancedHooks.slice(0, 50).forEach(h => {
          const status = h.manuallyDisabled ? "⛔ Manual" : (h.enabled ? "✅ Active" : "❌ Disabled");
          content += `| \`${h.id}\` | ${h.event} | ${h.phase} | ${h.priority} | ${status} |\n`;
        });
        
        if (enhancedHooks.length > 50) {
          content += `\n*Showing 50 of ${enhancedHooks.length} hooks*\n`;
        }
        
      } else {
        content = formatAsJson({
          total: enhancedHooks.length,
          enabled: enabledCount,
          disabled: disabledCount,
          manuallyDisabled: disabledHooks.size,
          hooks: enhancedHooks
        });
      }
      
      return successResponse(content, { total: enhancedHooks.length });
    }
  );

  // =========================================================================
  // 4. PRISM_HOOK_HISTORY - Recent executions with timing
  // =========================================================================
  
  server.tool(
    "prism_hook_history_v2",
    "Get recent hook execution history with timing and success/failure info.",
    HookHistorySchema.shape,
    async (params) => {
      log.info(`[prism_hook_history] last_n=${params.last_n}`);
      
      let history = [...executionHistory].reverse().slice(0, params.last_n);
      
      if (params.hook_filter) {
        history = history.filter(h => 
          h.hookId.toLowerCase().includes(params.hook_filter!.toLowerCase()) ||
          h.hookName.toLowerCase().includes(params.hook_filter!.toLowerCase())
        );
      }
      
      if (params.only_failures) {
        history = history.filter(h => !h.success);
      }
      
      const successCount = history.filter(h => h.success).length;
      const failCount = history.filter(h => !h.success).length;
      const avgDuration = history.length > 0 
        ? history.reduce((sum, h) => sum + h.duration_ms, 0) / history.length 
        : 0;
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Hook Execution History\n\n`;
        content += `| Metric | Value |\n`;
        content += `|--------|-------|\n`;
        content += `| Total Executions | ${history.length} |\n`;
        content += `| Succeeded | ${successCount} |\n`;
        content += `| Failed | ${failCount} |\n`;
        content += `| Avg Duration | ${formatDuration(avgDuration)} |\n`;
        content += `| Success Rate | ${history.length > 0 ? ((successCount / history.length) * 100).toFixed(1) : 0}% |\n`;
        
        content += `\n### Recent Executions\n`;
        content += `| Time | Hook | Status | Duration | Error |\n`;
        content += `|------|------|--------|----------|-------|\n`;
        
        history.slice(0, 30).forEach(h => {
          const time = h.timestamp.toISOString().slice(11, 19);
          const status = h.success ? "✅" : "❌";
          const error = h.error ? h.error.slice(0, 30) : "-";
          content += `| ${time} | \`${h.hookId}\` | ${status} | ${formatDuration(h.duration_ms)} | ${error} |\n`;
        });
        
      } else {
        content = formatAsJson({
          total: history.length,
          succeeded: successCount,
          failed: failCount,
          avgDuration_ms: avgDuration,
          successRate: history.length > 0 ? successCount / history.length : 0,
          executions: history
        });
      }
      
      return successResponse(content, { total: history.length });
    }
  );

  // =========================================================================
  // 5. PRISM_HOOK_ENABLE - Enable hook with audit
  // =========================================================================
  
  server.tool(
    "prism_hook_enable_v2",
    "Enable a previously disabled hook with audit trail.",
    HookEnableSchema.shape,
    async (params) => {
      log.info(`[prism_hook_enable] ${params.hook_id}`);
      
      const wasDisabled = disabledHooks.has(params.hook_id);
      disabledHooks.delete(params.hook_id);
      
      auditLog.push({
        hookId: params.hook_id,
        action: "enable",
        timestamp: new Date(),
        reason: params.reason || "Manual enable",
        user: "claude"
      });
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ✅ Hook Enabled\n\n`;
        content += `| Property | Value |\n`;
        content += `|----------|-------|\n`;
        content += `| Hook ID | \`${params.hook_id}\` |\n`;
        content += `| Was Disabled | ${wasDisabled ? "Yes" : "No"} |\n`;
        content += `| Reason | ${params.reason || "Manual enable"} |\n`;
        content += `| Timestamp | ${new Date().toISOString()} |\n`;
      } else {
        content = formatAsJson({
          success: true,
          hookId: params.hook_id,
          wasDisabled,
          reason: params.reason || "Manual enable",
          timestamp: new Date().toISOString()
        });
      }
      
      return successResponse(content, { success: true });
    }
  );

  // =========================================================================
  // 6. PRISM_HOOK_DISABLE - Disable with reason (audit trail)
  // =========================================================================
  
  server.tool(
    "prism_hook_disable_v2",
    "Disable a hook with required reason for audit trail. Optionally auto-re-enable.",
    HookDisableSchema.shape,
    async (params) => {
      log.info(`[prism_hook_disable] ${params.hook_id}: ${params.reason}`);
      
      const until = params.duration_minutes 
        ? new Date(Date.now() + params.duration_minutes * 60 * 1000)
        : undefined;
      
      disabledHooks.set(params.hook_id, {
        reason: params.reason,
        until
      });
      
      auditLog.push({
        hookId: params.hook_id,
        action: "disable",
        timestamp: new Date(),
        reason: params.reason,
        user: "claude",
        autoReenableAt: until
      });
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ⛔ Hook Disabled\n\n`;
        content += `| Property | Value |\n`;
        content += `|----------|-------|\n`;
        content += `| Hook ID | \`${params.hook_id}\` |\n`;
        content += `| Reason | ${params.reason} |\n`;
        content += `| Timestamp | ${new Date().toISOString()} |\n`;
        if (until) {
          content += `| Auto Re-enable | ${until.toISOString()} |\n`;
        }
        content += `\n⚠️ **Warning**: Disabling hooks may affect system safety. Ensure this is intentional.\n`;
      } else {
        content = formatAsJson({
          success: true,
          hookId: params.hook_id,
          reason: params.reason,
          timestamp: new Date().toISOString(),
          autoReenableAt: until?.toISOString()
        });
      }
      
      return successResponse(content, { success: true });
    }
  );

  // =========================================================================
  // 7. PRISM_HOOK_COVERAGE - % operations hooked
  // =========================================================================
  
  server.tool(
    "prism_hook_coverage_v2",
    "Calculate hook coverage percentage for operations. Target: 100%.",
    HookCoverageSchema.shape,
    async (params) => {
      log.info(`[prism_hook_coverage]`);
      
      const allHooks = hookEngine.getAllHooks();
      const coverage: Array<{
        operation: string;
        requiredHooks: string[];
        foundHooks: string[];
        coverage: number;
      }> = [];
      
      let ops = REQUIRED_OPERATIONS;
      if (params.domain) {
        ops = ops.filter(o => o.name.toLowerCase().includes(params.domain!.toLowerCase()));
      }
      
      for (const op of ops) {
        const found = op.hooks.filter(hookType => 
          allHooks.some(h => 
            h.event.toLowerCase().includes(op.name.split('.')[0]) &&
            h.event.toLowerCase().includes(hookType.toLowerCase())
          )
        );
        
        coverage.push({
          operation: op.name,
          requiredHooks: op.hooks,
          foundHooks: found,
          coverage: op.hooks.length > 0 ? (found.length / op.hooks.length) * 100 : 100
        });
      }
      
      const totalRequired = coverage.reduce((sum, c) => sum + c.requiredHooks.length, 0);
      const totalFound = coverage.reduce((sum, c) => sum + c.foundHooks.length, 0);
      const overallCoverage = totalRequired > 0 ? (totalFound / totalRequired) * 100 : 100;
      
      let content: string;
      if (params.response_format === "markdown") {
        const icon = overallCoverage >= 100 ? "✅" : overallCoverage >= 80 ? "⚠️" : "❌";
        content = `## ${icon} Hook Coverage Report\n\n`;
        content += `| Metric | Value |\n`;
        content += `|--------|-------|\n`;
        content += `| Overall Coverage | **${overallCoverage.toFixed(1)}%** |\n`;
        content += `| Required Hooks | ${totalRequired} |\n`;
        content += `| Found Hooks | ${totalFound} |\n`;
        content += `| Missing Hooks | ${totalRequired - totalFound} |\n`;
        
        content += `\n### Coverage by Operation\n`;
        content += `| Operation | Required | Found | Coverage |\n`;
        content += `|-----------|----------|-------|----------|\n`;
        
        coverage.forEach(c => {
          const icon = c.coverage >= 100 ? "✅" : c.coverage >= 80 ? "⚠️" : "❌";
          content += `| ${icon} ${c.operation} | ${c.requiredHooks.length} | ${c.foundHooks.length} | ${c.coverage.toFixed(0)}% |\n`;
        });
        
        // Show missing
        const missing = coverage.filter(c => c.coverage < 100);
        if (missing.length > 0) {
          content += `\n### ❌ Missing Hooks\n`;
          missing.forEach(c => {
            const missingHooks = c.requiredHooks.filter(h => !c.foundHooks.includes(h));
            content += `- **${c.operation}**: ${missingHooks.join(", ")}\n`;
          });
        }
        
      } else {
        content = formatAsJson({
          overallCoverage,
          totalRequired,
          totalFound,
          missing: totalRequired - totalFound,
          coverage
        });
      }
      
      return successResponse(content, { coverage: overallCoverage });
    }
  );

  // =========================================================================
  // 8. PRISM_HOOK_GAPS - Operations without hooks
  // =========================================================================
  
  server.tool(
    "prism_hook_gaps_v2",
    "Identify operations that are missing required hooks.",
    HookGapsSchema.shape,
    async (params) => {
      log.info(`[prism_hook_gaps]`);
      
      const allHooks = hookEngine.getAllHooks();
      const gaps: Array<{
        operation: string;
        missingHooks: string[];
        severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        recommendation?: string;
      }> = [];
      
      for (const op of REQUIRED_OPERATIONS) {
        const missing = op.hooks.filter(hookType => 
          !allHooks.some(h => 
            h.event.toLowerCase().includes(op.name.split('.')[0]) &&
            h.event.toLowerCase().includes(hookType.toLowerCase())
          )
        );
        
        if (missing.length > 0) {
          const severity = missing.some(h => h.includes("Safety") || h.includes("Violation"))
            ? "CRITICAL"
            : missing.some(h => h.includes("before") || h.includes("Validation"))
              ? "HIGH"
              : missing.some(h => h.includes("after"))
                ? "MEDIUM"
                : "LOW";
          
          gaps.push({
            operation: op.name,
            missingHooks: missing,
            severity,
            recommendation: params.include_recommendations 
              ? `Add ${missing.join(", ")} hooks for ${op.name} operation`
              : undefined
          });
        }
      }
      
      // Sort by severity
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      let content: string;
      if (params.response_format === "markdown") {
        if (gaps.length === 0) {
          content = `## ✅ No Hook Gaps Found\n\nAll required operations have complete hook coverage!\n`;
        } else {
          content = `## ⚠️ Hook Gaps Report\n\n`;
          content += `| Metric | Value |\n`;
          content += `|--------|-------|\n`;
          content += `| Operations with Gaps | ${gaps.length} |\n`;
          content += `| Total Missing Hooks | ${gaps.reduce((sum, g) => sum + g.missingHooks.length, 0)} |\n`;
          content += `| Critical Gaps | ${gaps.filter(g => g.severity === "CRITICAL").length} |\n`;
          content += `| High Gaps | ${gaps.filter(g => g.severity === "HIGH").length} |\n`;
          
          content += `\n### Gaps by Severity\n`;
          
          for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
            const sevGaps = gaps.filter(g => g.severity === sev);
            if (sevGaps.length > 0) {
              const icon = sev === "CRITICAL" ? "🔴" : sev === "HIGH" ? "🟠" : sev === "MEDIUM" ? "🟡" : "🟢";
              content += `\n#### ${icon} ${sev}\n`;
              sevGaps.forEach(g => {
                content += `- **${g.operation}**: Missing ${g.missingHooks.join(", ")}\n`;
                if (g.recommendation) {
                  content += `  - *Recommendation*: ${g.recommendation}\n`;
                }
              });
            }
          }
        }
        
      } else {
        content = formatAsJson({
          totalGaps: gaps.length,
          totalMissingHooks: gaps.reduce((sum, g) => sum + g.missingHooks.length, 0),
          bySeverity: {
            CRITICAL: gaps.filter(g => g.severity === "CRITICAL").length,
            HIGH: gaps.filter(g => g.severity === "HIGH").length,
            MEDIUM: gaps.filter(g => g.severity === "MEDIUM").length,
            LOW: gaps.filter(g => g.severity === "LOW").length
          },
          gaps
        });
      }
      
      return successResponse(content, { totalGaps: gaps.length });
    }
  );

  // =========================================================================
  // 9. PRISM_HOOK_PERFORMANCE - Execution time analytics
  // =========================================================================
  
  server.tool(
    "prism_hook_performance_v2",
    "Analyze hook execution performance metrics.",
    HookPerformanceSchema.shape,
    async (params) => {
      log.info(`[prism_hook_performance]`);
      
      const cutoff = new Date(Date.now() - params.time_range_hours * 60 * 60 * 1000);
      const recentHistory = executionHistory.filter(h => h.timestamp >= cutoff);
      
      // Aggregate by hook
      const byHook = new Map<string, {
        count: number;
        totalDuration: number;
        failures: number;
        minDuration: number;
        maxDuration: number;
      }>();
      
      for (const exec of recentHistory) {
        const existing = byHook.get(exec.hookId) || {
          count: 0,
          totalDuration: 0,
          failures: 0,
          minDuration: Infinity,
          maxDuration: 0
        };
        
        existing.count++;
        existing.totalDuration += exec.duration_ms;
        if (!exec.success) existing.failures++;
        existing.minDuration = Math.min(existing.minDuration, exec.duration_ms);
        existing.maxDuration = Math.max(existing.maxDuration, exec.duration_ms);
        
        byHook.set(exec.hookId, existing);
      }
      
      // Convert to array and sort
      let metrics = Array.from(byHook.entries()).map(([hookId, stats]) => ({
        hookId,
        count: stats.count,
        avgDuration_ms: stats.totalDuration / stats.count,
        minDuration_ms: stats.minDuration === Infinity ? 0 : stats.minDuration,
        maxDuration_ms: stats.maxDuration,
        totalDuration_ms: stats.totalDuration,
        failures: stats.failures,
        failureRate: stats.count > 0 ? stats.failures / stats.count : 0
      }));
      
      // Sort
      if (params.sort_by === "duration") {
        metrics.sort((a, b) => b.avgDuration_ms - a.avgDuration_ms);
      } else if (params.sort_by === "count") {
        metrics.sort((a, b) => b.count - a.count);
      } else {
        metrics.sort((a, b) => b.failures - a.failures);
      }
      
      metrics = metrics.slice(0, params.limit);
      
      // Overall stats
      const totalExecutions = recentHistory.length;
      const totalDuration = recentHistory.reduce((sum, h) => sum + h.duration_ms, 0);
      const totalFailures = recentHistory.filter(h => !h.success).length;
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Hook Performance Report\n\n`;
        content += `*Time Range: Last ${params.time_range_hours} hours*\n\n`;
        content += `| Metric | Value |\n`;
        content += `|--------|-------|\n`;
        content += `| Total Executions | ${totalExecutions} |\n`;
        content += `| Total Duration | ${formatDuration(totalDuration)} |\n`;
        content += `| Avg Duration | ${formatDuration(totalExecutions > 0 ? totalDuration / totalExecutions : 0)} |\n`;
        content += `| Total Failures | ${totalFailures} |\n`;
        content += `| Failure Rate | ${totalExecutions > 0 ? ((totalFailures / totalExecutions) * 100).toFixed(2) : 0}% |\n`;
        
        content += `\n### Top Hooks by ${params.sort_by}\n`;
        content += `| Hook | Count | Avg | Min | Max | Failures |\n`;
        content += `|------|-------|-----|-----|-----|----------|\n`;
        
        metrics.forEach(m => {
          content += `| \`${m.hookId}\` | ${m.count} | ${formatDuration(m.avgDuration_ms)} | ${formatDuration(m.minDuration_ms)} | ${formatDuration(m.maxDuration_ms)} | ${m.failures} |\n`;
        });
        
        // Identify slow hooks
        const slowHooks = metrics.filter(m => m.avgDuration_ms > 100);
        if (slowHooks.length > 0) {
          content += `\n### ⚠️ Slow Hooks (>100ms avg)\n`;
          slowHooks.forEach(m => {
            content += `- \`${m.hookId}\`: ${formatDuration(m.avgDuration_ms)} avg (${m.count} executions)\n`;
          });
        }
        
      } else {
        content = formatAsJson({
          timeRangeHours: params.time_range_hours,
          totalExecutions,
          totalDuration_ms: totalDuration,
          avgDuration_ms: totalExecutions > 0 ? totalDuration / totalExecutions : 0,
          totalFailures,
          failureRate: totalExecutions > 0 ? totalFailures / totalExecutions : 0,
          metrics
        });
      }
      
      return successResponse(content, { totalExecutions });
    }
  );

  // =========================================================================
  // 10. PRISM_HOOK_FAILURES - Recent failures + patterns
  // =========================================================================
  
  server.tool(
    "prism_hook_failures_v2",
    "Analyze recent hook failures and identify patterns.",
    HookFailuresSchema.shape,
    async (params) => {
      log.info(`[prism_hook_failures]`);
      
      const failures = executionHistory
        .filter(h => !h.success)
        .slice(-params.last_n)
        .reverse();
      
      let content: string;
      if (params.response_format === "markdown") {
        if (failures.length === 0) {
          content = `## ✅ No Recent Failures\n\nNo hook failures in the last ${params.last_n} executions.\n`;
        } else {
          content = `## ❌ Hook Failure Report\n\n`;
          content += `| Metric | Value |\n`;
          content += `|--------|-------|\n`;
          content += `| Total Failures | ${failures.length} |\n`;
          
          if (params.group_by_hook) {
            // Group by hook
            const byHook = new Map<string, typeof failures>();
            for (const f of failures) {
              if (!byHook.has(f.hookId)) byHook.set(f.hookId, []);
              byHook.get(f.hookId)!.push(f);
            }
            
            content += `| Unique Hooks | ${byHook.size} |\n`;
            
            content += `\n### Failures by Hook\n`;
            content += `| Hook | Count | Last Error |\n`;
            content += `|------|-------|------------|\n`;
            
            Array.from(byHook.entries())
              .sort((a, b) => b[1].length - a[1].length)
              .forEach(([hookId, hookFailures]) => {
                const lastError = hookFailures[0]?.error?.slice(0, 40) || "Unknown";
                content += `| \`${hookId}\` | ${hookFailures.length} | ${lastError} |\n`;
              });
          }
          
          if (params.include_patterns) {
            // Pattern analysis
            const errorPatterns = new Map<string, number>();
            for (const f of failures) {
              const pattern = f.error?.split(":")[0] || "Unknown";
              errorPatterns.set(pattern, (errorPatterns.get(pattern) || 0) + 1);
            }
            
            content += `\n### Error Patterns\n`;
            content += `| Pattern | Count |\n`;
            content += `|---------|-------|\n`;
            
            Array.from(errorPatterns.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .forEach(([pattern, count]) => {
                content += `| ${pattern} | ${count} |\n`;
              });
          }
          
          content += `\n### Recent Failures\n`;
          content += `| Time | Hook | Error |\n`;
          content += `|------|------|-------|\n`;
          
          failures.slice(0, 20).forEach(f => {
            const time = f.timestamp.toISOString().slice(11, 19);
            const error = f.error?.slice(0, 50) || "Unknown";
            content += `| ${time} | \`${f.hookId}\` | ${error} |\n`;
          });
        }
        
      } else {
        // Group failures
        const byHook: Record<string, number> = {};
        const errorPatterns: Record<string, number> = {};
        
        for (const f of failures) {
          byHook[f.hookId] = (byHook[f.hookId] || 0) + 1;
          const pattern = f.error?.split(":")[0] || "Unknown";
          errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
        }
        
        content = formatAsJson({
          totalFailures: failures.length,
          byHook,
          errorPatterns: params.include_patterns ? errorPatterns : undefined,
          failures: failures.slice(0, 50).map(f => ({
            hookId: f.hookId,
            timestamp: f.timestamp.toISOString(),
            error: f.error,
            duration_ms: f.duration_ms
          }))
        });
      }
      
      return successResponse(content, { totalFailures: failures.length });
    }
  );

  log.info("[hook_management_tools] Registered 10 hook management tools");
}
