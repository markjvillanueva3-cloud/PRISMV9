/**
 * PRISM Hook Manager Implementation v1.0
 * ======================================
 * Runtime hook execution engine for PRISM Manufacturing Intelligence.
 * 
 * @module prism/core/hooks/HookManager
 * @version 1.0.0
 * @created 2026-01-26
 */

import {
  HookFn,
  HookResult,
  HookContext,
  HookRegistration,
  HookManager,
  PRISMHookRegistry,
  HookPoint,
  PRIORITY,
  SYSTEM_HOOKS
} from './HookSystem.types';

// =============================================================================
// HOOK MANAGER IMPLEMENTATION
// =============================================================================

export class PRISMHookManager implements HookManager {
  private registrations: Map<string, HookRegistration[]> = new Map();
  private hookIndex: Map<string, HookRegistration> = new Map();
  private stats = {
    totalExecutions: 0,
    byHookPoint: {} as Record<string, number>,
    totalDuration: {} as Record<string, number>,
    failures: {} as Record<string, number>
  };
  
  constructor() {
    this.initializeSystemHooks();
  }
  
  /**
   * Initialize built-in system hooks that enforce the 8 Laws
   */
  private initializeSystemHooks(): void {
    // System hooks are defined in types but handlers are injected here
    console.log(`[HookManager] Initializing ${SYSTEM_HOOKS.length} system hooks...`);
    
    for (const hookDef of SYSTEM_HOOKS) {
      const handler = this.getSystemHandler(hookDef.handlerName);
      if (handler) {
        this.register(hookDef.hookPoint as HookPoint, {
          ...hookDef,
          handler
        });
      }
    }
    
    console.log(`[HookManager] System hooks initialized.`);
  }
  
  /**
   * Get built-in system handler by name
   */
  private getSystemHandler(handlerName: string): HookFn | null {
    const handlers: Record<string, HookFn> = {
      // Law 1: Life-Safety Gate
      lifeSafetyGateHandler: async (payload: any, context: HookContext) => {
        const safetyScore = context.qualityScores.safety;
        if (safetyScore < 0.70) {
          return {
            continue: false,
            abortReason: `SAFETY VIOLATION: S(x) = ${safetyScore.toFixed(2)} < 0.70 required`,
            abortSeverity: 'SAFETY',
            warnings: ['Safety threshold not met. Additional verification required.']
          };
        }
        return { continue: true };
      },
      
      // Law 2: Microsession Enforcer
      microsessionEnforcerHandler: async (payload: any, context: HookContext) => {
        // Check if MATHPLAN is present
        if (!payload.mathPlan && !payload.decomposition) {
          return {
            continue: false,
            abortReason: 'MATHPLAN REQUIRED: Task must be decomposed before execution',
            abortSeverity: 'ERROR',
            warnings: ['Complete MATHPLAN gate before proceeding.']
          };
        }
        return { continue: true };
      },
      
      // Law 3: Completeness Gate
      completenessGateHandler: async (payload: any, context: HookContext) => {
        const completeness = payload.completion?.completeness || 0;
        if (completeness < 1.0 && payload.completion?.status === 'SUCCESS') {
          return {
            continue: false,
            abortReason: `COMPLETENESS VIOLATION: C(T) = ${completeness.toFixed(2)} < 1.0 required for SUCCESS`,
            abortSeverity: 'ERROR',
            payload: {
              ...payload,
              completion: { ...payload.completion, status: 'PARTIAL' }
            }
          };
        }
        return { continue: true };
      },
      
      // Law 4: Anti-Regression Handler
      antiRegressionHandler: async (payload: any, context: HookContext) => {
        const { delta, analysis } = payload;
        if (analysis?.regressionDetected) {
          return {
            continue: false,
            abortReason: `ANTI-REGRESSION VIOLATION: ${analysis.regressionType} detected. ${analysis.regressionDetails?.join('; ')}`,
            abortSeverity: 'CRITICAL',
            warnings: analysis.regressionDetails || []
          };
        }
        
        // Warn on significant size reduction
        if (delta?.sizeChangePercent < -10) {
          return {
            continue: true,
            warnings: [`Size reduced by ${Math.abs(delta.sizeChangePercent).toFixed(1)}% - verify no data loss`]
          };
        }
        
        return { continue: true };
      },
      
      // Law 5: Predictive Thinking Handler
      predictiveThinkingHandler: async (payload: any, context: HookContext) => {
        // This is advisory - logs a reminder but doesn't block
        return {
          continue: true,
          warnings: [
            'PREDICTIVE THINKING: Consider 3 failure modes before proceeding',
            'PREDICTIVE THINKING: Identify downstream consequences',
            'PREDICTIVE THINKING: Prepare rollback plan'
          ]
        };
      },
      
      // Law 6: Session Continuity Handler
      sessionContinuityHandler: async (payload: any, context: HookContext) => {
        const { stateFile, resumeFromCompaction } = payload;
        
        if (stateFile?.exists && stateFile.currentTask?.status === 'IN_PROGRESS') {
          return {
            continue: true,
            warnings: [`RESUME REQUIRED: Task ${stateFile.currentTask.id} is IN_PROGRESS. Resume from checkpoint.`],
            payload: {
              ...payload,
              mustResume: true,
              resumeTask: stateFile.currentTask
            }
          };
        }
        
        return { continue: true };
      },
      
      // Law 7: Verification Chain Handler
      verificationChainHandler: async (payload: any, context: HookContext) => {
        const { aggregate, subject } = payload;
        
        if (subject?.safetyCritical && aggregate?.overallConfidence < 0.95) {
          return {
            continue: false,
            abortReason: `VERIFICATION FAILED: Safety-critical output requires 95% confidence, got ${(aggregate.overallConfidence * 100).toFixed(1)}%`,
            abortSeverity: 'SAFETY'
          };
        }
        
        if (aggregate?.status === 'FAILED') {
          return {
            continue: false,
            abortReason: `VERIFICATION FAILED: ${aggregate.blockingIssues?.join('; ')}`,
            abortSeverity: 'ERROR'
          };
        }
        
        return { continue: true };
      },
      
      // Law 8: Mathematical Rigor Handler
      mathRigorHandler: async (payload: any, context: HookContext) => {
        const rigorScore = context.qualityScores.rigor;
        if (rigorScore < 0.60) {
          return {
            continue: false,
            abortReason: `RIGOR VIOLATION: M(x) = ${rigorScore.toFixed(2)} < 0.60 required`,
            abortSeverity: 'ERROR',
            warnings: [
              'Add uncertainty bounds to all outputs',
              'Verify dimensional consistency',
              'Check formula calibration status'
            ]
          };
        }
        
        // Check if output has uncertainty
        if (payload.result && typeof payload.result.uncertainty === 'undefined') {
          return {
            continue: false,
            abortReason: 'UNCERTAINTY REQUIRED: Output missing uncertainty bounds',
            abortSeverity: 'ERROR'
          };
        }
        
        return { continue: true };
      },
      
      // MATHPLAN Gate Handler
      mathPlanGateHandler: async (payload: any, context: HookContext) => {
        const { scope, decomposition, estimates, constraints, successCriteria } = payload;
        const errors: string[] = [];
        
        // Validate scope
        if (!scope?.total?.value) {
          errors.push('SCOPE: Total not specified');
        }
        if (!scope?.proof) {
          errors.push('SCOPE: Algebraic proof missing');
        }
        
        // Validate decomposition
        if (!decomposition?.items?.length) {
          errors.push('DECOMPOSE: No items defined');
        }
        if (decomposition && !decomposition.sumVerified) {
          errors.push('DECOMPOSE: Sum verification failed (Σ|dᵢ| ≠ S)');
        }
        
        // Validate estimates
        if (!estimates?.effort?.uncertainty) {
          errors.push('EFFORT: Missing uncertainty bounds');
        }
        if (!estimates?.time?.uncertainty) {
          errors.push('TIME: Missing uncertainty bounds');
        }
        
        // Validate success criteria
        if (!successCriteria?.completeness) {
          errors.push('SUCCESS: Completeness threshold not defined');
        }
        
        if (errors.length > 0) {
          return {
            continue: false,
            abortReason: `MATHPLAN INVALID: ${errors.join('; ')}`,
            abortSeverity: 'ERROR',
            warnings: errors
          };
        }
        
        return { continue: true };
      },
      
      // Commandment 1: Consumer Wiring Handler
      consumerWiringHandler: async (payload: any, context: HookContext) => {
        const { status, requirements } = payload;
        
        if (!status?.compliant) {
          return {
            continue: false,
            abortReason: `WIRING VIOLATION: ${status.wiredConsumers}/${requirements.minimum} consumers required`,
            abortSeverity: 'ERROR',
            warnings: [`Gap: ${status.gap} more consumers needed`]
          };
        }
        
        if (status.utilizationFactor < 0.8) {
          return {
            continue: true,
            warnings: [`Low utilization: DUF = ${(status.utilizationFactor * 100).toFixed(1)}%`]
          };
        }
        
        return { continue: true };
      },
      
      // Commandment 5: Uncertainty Injector
      uncertaintyInjectorHandler: async (payload: any, context: HookContext) => {
        // If result doesn't have uncertainty, add default
        if (payload.result && typeof payload.result.uncertainty === 'undefined') {
          const defaultUncertainty = Math.abs(payload.result.value) * 0.10; // 10% default
          return {
            continue: true,
            payload: {
              ...payload,
              result: {
                ...payload.result,
                uncertainty: defaultUncertainty,
                confidence: 0.95,
                uncertaintySource: 'DEFAULT_10_PERCENT'
              }
            },
            warnings: ['Uncertainty injected with 10% default - validate for safety-critical applications']
          };
        }
        return { continue: true };
      },
      
      // Prediction Logger Handler
      predictionLoggerHandler: async (payload: any, context: HookContext) => {
        // Log prediction to PREDICTION_LOG.json
        console.log(`[PREDICTION] ${payload.id}: ${JSON.stringify(payload.predicted)}`);
        return {
          continue: true,
          metrics: {
            predictionId: payload.id,
            formulaId: payload.formulaId
          },
          learnings: [`Prediction ${payload.id} logged for calibration tracking`]
        };
      },
      
      // Calibration Monitor Handler
      calibrationMonitorHandler: async (payload: any, context: HookContext) => {
        const { exceeded, recommendation, formula } = payload;
        
        if (recommendation === 'RECALIBRATE_NOW') {
          return {
            continue: true,
            warnings: [
              `CALIBRATION ALERT: Formula ${formula.id} needs immediate recalibration`,
              `Exceeded: ${exceeded.join(', ')}`,
              'Increase uncertainty bounds by 1.5x until recalibrated'
            ]
          };
        }
        
        if (recommendation === 'SCHEDULE_RECALIBRATION') {
          return {
            continue: true,
            warnings: [`CALIBRATION NOTICE: Schedule recalibration for ${formula.id} within 3 sessions`]
          };
        }
        
        return { continue: true };
      },
      
      // Learning Extractor Handler
      learningExtractorHandler: async (payload: any, context: HookContext) => {
        const learnings: string[] = [];
        
        // Extract learnings from task completion
        if (payload.residuals) {
          if (Math.abs(payload.residuals.effortPercent) > 20) {
            learnings.push(`Effort estimate off by ${payload.residuals.effortPercent.toFixed(1)}% - adjust complexity factors`);
          }
          if (Math.abs(payload.residuals.timePercent) > 20) {
            learnings.push(`Time estimate off by ${payload.residuals.timePercent.toFixed(1)}% - adjust buffer factors`);
          }
        }
        
        if (payload.actual?.errorsEncountered > 0) {
          learnings.push(`${payload.actual.errorsEncountered} errors encountered - analyze for pattern`);
        }
        
        return {
          continue: true,
          learnings
        };
      },
      
      // Buffer Zone Handler
      bufferZoneHandler: async (payload: any, context: HookContext) => {
        const { toolCallsUsed, toolCallBudget, bufferZone } = payload;
        
        if (bufferZone === 'RED' || bufferZone === 'BLACK') {
          return {
            continue: false,
            abortReason: `BUFFER ZONE ${bufferZone}: Checkpoint required immediately (${toolCallsUsed}/${toolCallBudget} calls)`,
            abortSeverity: 'CRITICAL'
          };
        }
        
        if (bufferZone === 'ORANGE') {
          return {
            continue: true,
            warnings: [`ORANGE ZONE: Checkpoint NOW (${toolCallsUsed}/${toolCallBudget} calls)`]
          };
        }
        
        if (bufferZone === 'YELLOW') {
          return {
            continue: true,
            warnings: [`YELLOW ZONE: Checkpoint after current unit (${toolCallsUsed}/${toolCallBudget} calls)`]
          };
        }
        
        return { continue: true };
      }
    };
    
    return handlers[handlerName] || null;
  }
  
  /**
   * Register a hook
   */
  register<K extends keyof PRISMHookRegistry>(
    hookPoint: K,
    registration: Omit<HookRegistration<Parameters<PRISMHookRegistry[K]>[0]>, 'hookPoint'>
  ): void {
    const fullRegistration: HookRegistration = {
      ...registration,
      hookPoint
    };
    
    // Check for duplicate ID
    if (this.hookIndex.has(registration.id)) {
      throw new Error(`Hook ID already registered: ${registration.id}`);
    }
    
    // Add to index
    this.hookIndex.set(registration.id, fullRegistration);
    
    // Add to hook point list
    const existing = this.registrations.get(hookPoint) || [];
    existing.push(fullRegistration);
    
    // Sort by priority (lower = earlier)
    existing.sort((a, b) => a.priority - b.priority);
    
    this.registrations.set(hookPoint, existing);
    
    console.log(`[HookManager] Registered: ${registration.id} at ${hookPoint} (priority: ${registration.priority})`);
  }
  
  /**
   * Unregister a hook by ID
   */
  unregister(hookId: string): boolean {
    const registration = this.hookIndex.get(hookId);
    if (!registration) {
      return false;
    }
    
    // Check if system hook
    if (registration.system && !registration.userDisableable) {
      throw new Error(`Cannot unregister system hook: ${hookId}`);
    }
    
    // Remove from index
    this.hookIndex.delete(hookId);
    
    // Remove from hook point list
    const existing = this.registrations.get(registration.hookPoint) || [];
    const filtered = existing.filter(r => r.id !== hookId);
    this.registrations.set(registration.hookPoint, filtered);
    
    console.log(`[HookManager] Unregistered: ${hookId}`);
    return true;
  }
  
  /**
   * Execute all hooks for a hook point
   */
  async execute<K extends keyof PRISMHookRegistry>(
    hookPoint: K,
    payload: Parameters<PRISMHookRegistry[K]>[0],
    context: HookContext
  ): Promise<HookResult[]> {
    const registrations = this.registrations.get(hookPoint) || [];
    const results: HookResult[] = [];
    let currentPayload = payload;
    
    // Update stats
    this.stats.totalExecutions++;
    this.stats.byHookPoint[hookPoint] = (this.stats.byHookPoint[hookPoint] || 0) + 1;
    
    const startTime = Date.now();
    
    for (const registration of registrations) {
      if (!registration.enabled) {
        continue;
      }
      
      try {
        const hookStart = Date.now();
        
        // Execute with timeout
        const timeoutMs = registration.timeout || 30000;
        const result = await Promise.race([
          registration.handler(currentPayload, context),
          new Promise<HookResult>((_, reject) => 
            setTimeout(() => reject(new Error('Hook timeout')), timeoutMs)
          )
        ]);
        
        const hookDuration = Date.now() - hookStart;
        this.stats.totalDuration[hookPoint] = (this.stats.totalDuration[hookPoint] || 0) + hookDuration;
        
        results.push(result);
        
        // Accumulate warnings
        if (result.warnings) {
          context.warnings.push(...result.warnings);
        }
        
        // Accumulate learnings
        if (result.learnings) {
          context.learnings.push(...result.learnings);
        }
        
        // Chain payload modifications
        if (result.payload !== undefined) {
          currentPayload = result.payload as any;
        }
        
        // Check for abort
        if (!result.continue) {
          console.log(`[HookManager] ${registration.id} aborted: ${result.abortReason}`);
          break;
        }
        
      } catch (error) {
        this.stats.failures[hookPoint] = (this.stats.failures[hookPoint] || 0) + 1;
        
        console.error(`[HookManager] ${registration.id} failed:`, error);
        
        // Retry logic
        if (registration.retries && registration.retries > 0) {
          // TODO: Implement retry logic
        }
        
        results.push({
          continue: false,
          abortReason: `Hook ${registration.id} failed: ${error instanceof Error ? error.message : String(error)}`,
          abortSeverity: 'ERROR'
        });
        
        break;
      }
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`[HookManager] ${hookPoint}: ${results.length} hooks executed in ${totalDuration}ms`);
    
    return results;
  }
  
  /**
   * Get all registrations for a hook point
   */
  getRegistrations(hookPoint: string): HookRegistration[] {
    return this.registrations.get(hookPoint) || [];
  }
  
  /**
   * Get all hook points
   */
  getHookPoints(): string[] {
    return Array.from(this.registrations.keys());
  }
  
  /**
   * Check if a hook point has any registrations
   */
  hasHooks(hookPoint: string): boolean {
    const regs = this.registrations.get(hookPoint);
    return regs !== undefined && regs.length > 0;
  }
  
  /**
   * Enable/disable a hook
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const registration = this.hookIndex.get(hookId);
    if (!registration) {
      return false;
    }
    
    if (!enabled && registration.system && !registration.userDisableable) {
      throw new Error(`Cannot disable system hook: ${hookId}`);
    }
    
    registration.enabled = enabled;
    console.log(`[HookManager] ${hookId} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }
  
  /**
   * Get hook execution statistics
   */
  getStats(): {
    totalExecutions: number;
    byHookPoint: Record<string, number>;
    avgDuration: Record<string, number>;
    failures: Record<string, number>;
  } {
    const avgDuration: Record<string, number> = {};
    
    for (const [hookPoint, totalTime] of Object.entries(this.stats.totalDuration)) {
      const count = this.stats.byHookPoint[hookPoint] || 1;
      avgDuration[hookPoint] = Math.round(totalTime / count);
    }
    
    return {
      totalExecutions: this.stats.totalExecutions,
      byHookPoint: { ...this.stats.byHookPoint },
      avgDuration,
      failures: { ...this.stats.failures }
    };
  }
  
  /**
   * Create a default context
   */
  static createContext(partial: Partial<HookContext>): HookContext {
    return {
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: partial.sessionId || 'unknown',
      timestamp: new Date().toISOString(),
      triggeredBy: partial.triggeredBy || { type: 'SYSTEM', id: 'unknown' },
      bufferZone: partial.bufferZone || 'GREEN',
      toolCallCount: partial.toolCallCount || 0,
      sessionToolCallCount: partial.sessionToolCallCount || 0,
      qualityScores: partial.qualityScores || {
        reasoning: 0.8,
        code: 0.8,
        process: 0.8,
        safety: 0.8,
        learning: 0.8,
        rigor: 0.8,
        omega: 0.8
      },
      mathInfra: partial.mathInfra || {
        formulaRegistryLoaded: false,
        coefficientDbLoaded: false,
        predictionLogActive: false,
        calibrationAlerts: []
      },
      state: partial.state || {
        path: 'C:\\PRISM\\state\\CURRENT_STATE.json',
        loaded: false
      },
      warnings: partial.warnings || [],
      learnings: partial.learnings || [],
      custom: partial.custom || {},
      env: partial.env || {
        platform: 'WINDOWS',
        prismRoot: 'C:\\PRISM'
      },
      ...partial
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let hookManagerInstance: PRISMHookManager | null = null;

export function getHookManager(): PRISMHookManager {
  if (!hookManagerInstance) {
    hookManagerInstance = new PRISMHookManager();
  }
  return hookManagerInstance;
}

export function resetHookManager(): void {
  hookManagerInstance = null;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Execute hooks with automatic context creation
 */
export async function executeHooks<K extends keyof PRISMHookRegistry>(
  hookPoint: K,
  payload: Parameters<PRISMHookRegistry[K]>[0],
  contextPartial?: Partial<HookContext>
): Promise<{
  results: HookResult[];
  context: HookContext;
  aborted: boolean;
  abortReason?: string;
}> {
  const manager = getHookManager();
  const context = PRISMHookManager.createContext(contextPartial || {});
  
  const results = await manager.execute(hookPoint, payload, context);
  
  const abortResult = results.find(r => !r.continue);
  
  return {
    results,
    context,
    aborted: !!abortResult,
    abortReason: abortResult?.abortReason
  };
}

/**
 * Register a user hook
 */
export function registerHook<K extends keyof PRISMHookRegistry>(
  id: string,
  hookPoint: K,
  handler: HookFn<Parameters<PRISMHookRegistry[K]>[0]>,
  options?: {
    priority?: number;
    description?: string;
    tags?: string[];
  }
): void {
  const manager = getHookManager();
  
  manager.register(hookPoint, {
    id,
    name: id,
    priority: options?.priority || PRIORITY.USER_HOOKS,
    handler,
    enabled: true,
    userDisableable: true,
    system: false,
    description: options?.description,
    tags: options?.tags
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export { PRIORITY } from './HookSystem.types';
export type { HookContext, HookResult, HookFn, HookRegistration } from './HookSystem.types';
