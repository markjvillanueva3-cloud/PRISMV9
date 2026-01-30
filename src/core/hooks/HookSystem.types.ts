/**
 * PRISM Hook System v1.0 - COMPREHENSIVE EDITION
 * ===============================================
 * Complete lifecycle hooks for PRISM Manufacturing Intelligence.
 * Covers: Sessions, Tasks, Microsessions, Databases, Materials, Physics,
 *         Formulas, Predictions, Agents, Swarms, Ralph Loop, Learning,
 *         Verification, Quality Gates, Skills, Scripts, Plugins.
 * 
 * DESIGN PRINCIPLES:
 * 1. ENFORCEMENT - 8 Laws become automatic, not manual
 * 2. PROVENANCE - Track what triggered what
 * 3. CANCELLATION - Hooks can abort operations
 * 4. ASYNC - All hooks support async operations
 * 5. ORDERING - Hooks execute in priority order
 * 6. CHAINING - Hooks can modify payloads for next hook
 * 7. COMPREHENSIVE - Every system interaction has hooks
 * 
 * @module prism/core/hooks
 * @version 1.0.0
 * @created 2026-01-26
 */

// =============================================================================
// SECTION 1: CORE INFRASTRUCTURE
// =============================================================================

/**
 * Hook execution priority (lower = earlier)
 */
export type HookPriority = number;

export const PRIORITY = {
  // System-critical (cannot be overridden, run first)
  SAFETY_GATE: 0,
  MATHPLAN_GATE: 5,
  STATE_PERSISTENCE: 10,
  ANTI_REGRESSION: 20,
  
  // Law enforcement (8 Laws)
  LAW_ENFORCEMENT: 30,
  LIFE_SAFETY_CHECK: 31,
  MICROSESSION_ENFORCE: 32,
  COMPLETENESS_CHECK: 33,
  
  // Validation layer
  SCHEMA_VALIDATION: 50,
  UNCERTAINTY_INJECTION: 60,
  DIMENSIONAL_CHECK: 70,
  BOUNDS_CHECK: 80,
  
  // Business logic
  BUSINESS_RULES: 100,
  CONSUMER_WIRING: 110,
  CROSS_REFERENCE: 120,
  
  // Intelligence layer
  CONTEXT_BUILDING: 150,
  PATTERN_MATCHING: 160,
  LEARNING_CAPTURE: 170,
  KNOWLEDGE_GRAPH: 180,
  
  // Metrics and monitoring
  METRICS_COLLECTION: 200,
  PERFORMANCE_TRACKING: 210,
  CALIBRATION_CHECK: 220,
  
  // User/extension hooks
  USER_HOOKS: 300,
  PLUGIN_HOOKS: 400,
  
  // Cleanup (runs last)
  CLEANUP: 900,
  LOGGING: 990,
  TELEMETRY: 999
} as const;

/**
 * Result of hook execution
 */
export interface HookResult<T = unknown> {
  /** Whether to continue to next hook/operation */
  continue: boolean;
  
  /** Optional reason for abort */
  abortReason?: string;
  
  /** Abort severity */
  abortSeverity?: 'WARN' | 'ERROR' | 'CRITICAL' | 'SAFETY';
  
  /** Modified payload (optional - for chaining) */
  payload?: T;
  
  /** Warnings to surface (non-blocking) */
  warnings?: string[];
  
  /** Metrics captured by hook */
  metrics?: Record<string, number | string>;
  
  /** Learning insights to capture */
  learnings?: string[];
  
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Context passed to every hook - the "DNA" of the execution
 */
export interface HookContext {
  /** Unique execution trace ID (for distributed tracing) */
  traceId: string;
  
  /** Parent trace ID (if nested) */
  parentTraceId?: string;
  
  /** Current session ID */
  sessionId: string;
  
  /** Current task ID (if any) */
  taskId?: string;
  
  /** Current microsession index */
  microsessionIndex?: number;
  
  /** Timestamp when hook chain started */
  timestamp: string;
  
  /** User/agent who triggered the action */
  triggeredBy: {
    type: 'USER' | 'AGENT' | 'SYSTEM' | 'SCHEDULER' | 'PLUGIN' | 'SCRIPT';
    id: string;
    name?: string;
    tier?: 'OPUS' | 'SONNET' | 'HAIKU';
  };
  
  /** Current buffer zone */
  bufferZone: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';
  
  /** Tool calls in current microsession */
  toolCallCount: number;
  
  /** Total tool calls in session */
  sessionToolCallCount: number;
  
  /** Current Ω scores */
  qualityScores: {
    reasoning: number;    // R(x)
    code: number;         // C(x)
    process: number;      // P(x)
    safety: number;       // S(x)
    learning: number;     // L(x)
    rigor: number;        // M(x)
    omega: number;        // Ω(x)
  };
  
  /** Mathematical infrastructure status */
  mathInfra: {
    formulaRegistryLoaded: boolean;
    coefficientDbLoaded: boolean;
    predictionLogActive: boolean;
    calibrationAlerts: string[];
  };
  
  /** State file info */
  state: {
    path: string;
    loaded: boolean;
    lastUpdated?: string;
    quickResume?: string;
  };
  
  /** Accumulated warnings from previous hooks */
  warnings: string[];
  
  /** Accumulated learnings */
  learnings: string[];
  
  /** Custom context data from previous hooks */
  custom: Record<string, unknown>;
  
  /** Environment info */
  env: {
    platform: 'WINDOWS' | 'LINUX' | 'MAC';
    prismRoot: string;
    monolithPath?: string;
  };
}

/**
 * Base hook function signature
 */
export type HookFn<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
  context: HookContext
) => Promise<HookResult<TResult>> | HookResult<TResult>;

/**
 * Hook registration entry
 */
export interface HookRegistration<T = unknown> {
  /** Unique hook ID */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Which hook point */
  hookPoint: string;
  
  /** Execution priority */
  priority: HookPriority;
  
  /** The hook function */
  handler: HookFn<T>;
  
  /** Which Laws/Commandments this enforces */
  enforces?: string[];
  
  /** Is this hook enabled */
  enabled: boolean;
  
  /** Can user disable this hook */
  userDisableable: boolean;
  
  /** Is this a system hook (cannot be removed) */
  system: boolean;
  
  /** Description for documentation */
  description?: string;
  
  /** Tags for filtering */
  tags?: string[];
  
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  
  /** Retry count on failure (default: 0) */
  retries?: number;
}

// =============================================================================
// SECTION 2: SESSION LIFECYCLE HOOKS
// =============================================================================

export interface SessionStartPayload {
  sessionId: string;
  startTime: string;
  previousSessionId?: string;
  resumeFromCompaction: boolean;
  isNewSession: boolean;
  stateFile: {
    path: string;
    exists: boolean;
    lastModified?: string;
    quickResume?: string;
    currentTask?: {
      id: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
      checkpoint?: string;
    };
  };
  mathInfra: {
    formulaRegistryPath: string;
    formulaCount: number;
    coefficientDbPath: string;
    coefficientCount: number;
    staleCalibrations: string[];
    alertLevel: 'HEALTHY' | 'NOTICE' | 'WARNING' | 'CRITICAL';
  };
}

export interface SessionEndPayload {
  sessionId: string;
  endTime: string;
  duration: { value: number; unit: 'minutes' };
  toolCallsTotal: number;
  microsessionsCompleted: number;
  tasksCompleted: number;
  tasksPartial: number;
  tasksFailed: number;
  predictions: {
    made: number;
    resolved: number;
    avgError: number;
  };
  state: {
    saved: boolean;
    path: string;
  };
  handoff: {
    quickResume: string;
    nextAction: string;
    blockers: string[];
  };
  learningsExtracted: number;
}

export interface SessionCompactPayload {
  sessionId: string;
  compactTime: string;
  reason: 'CONTEXT_LIMIT' | 'MANUAL' | 'ERROR_RECOVERY';
  contextPercentUsed: number;
  preservedState: {
    currentTask: unknown;
    checkpoint: unknown;
    criticalContext: string[];
    mathInfraStatus: unknown;
  };
  discardedContext: {
    itemCount: number;
    categories: string[];
  };
}

export interface SessionHeartbeatPayload {
  sessionId: string;
  elapsedMinutes: number;
  toolCallsSinceStart: number;
  toolCallsSinceCheckpoint: number;
  currentBufferZone: string;
  memoryPressure: number;  // 0-1
  activeTask?: string;
  warnings: string[];
}

// =============================================================================
// SECTION 3: TASK LIFECYCLE HOOKS
// =============================================================================

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  phase?: number;
  milestone?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  safetyCritical: boolean;
  estimatedEffort?: { value: number; uncertainty: number; unit: string };
}

export interface MathPlanPayload {
  task: TaskDefinition;
  scope: {
    formula: string;
    total: { value: number; uncertainty: number };
    breakdown: Array<{ name: string; count: { value: number; uncertainty: number } }>;
    proof: string;  // Algebraic proof that Σ|dᵢ| = S
  };
  decomposition: {
    items: Array<{ 
      id: string; 
      description: string; 
      effort: { value: number; uncertainty: number };
      dependencies: string[];
    }>;
    sumVerified: boolean;
  };
  estimates: {
    effort: { value: number; uncertainty: number; confidence: number; unit: string };
    time: { value: number; uncertainty: number; confidence: number; unit: string };
    microsessions: { value: number; uncertainty: number };
  };
  constraints: Array<{ 
    id: string; 
    formula: string; 
    description: string;
    type: 'HARD' | 'SOFT';
  }>;
  executionOrder: string[];
  checkpoints: Array<{ afterItem: string; reason: string }>;
  successCriteria: {
    completeness: number;  // Required C(T)
    verification: string;
    evidence: string[];
  };
  predictionId: string;  // PRED-YYYYMMDD-NNN
}

export interface TaskStartPayload {
  task: TaskDefinition;
  mathPlan: MathPlanPayload;
  prediction: {
    id: string;
    formulaId: string;
    logged: boolean;
    logPath: string;
  };
  resumeFrom?: {
    checkpointId: string;
    itemsCompleted: number;
    toolCallsUsed: number;
    timeElapsed: number;
  };
  skillsLoaded: string[];
  agentsAvailable: string[];
}

export interface TaskProgressPayload {
  task: TaskDefinition;
  progress: {
    itemsCompleted: number;
    itemsTotal: number;
    percentComplete: number;
    currentItem: string;
    currentItemStarted: string;
  };
  effort: {
    toolCallsUsed: number;
    toolCallsEstimated: { value: number; uncertainty: number };
    onTrack: boolean;
    deviation: number;  // Percent deviation from estimate
  };
  time: {
    elapsedMinutes: number;
    estimatedMinutes: { value: number; uncertainty: number };
    onTrack: boolean;
    deviation: number;
  };
  quality: {
    errorsEncountered: number;
    warningsAccumulated: number;
    verificationsPassed: number;
  };
}

export interface TaskCheckpointPayload {
  task: TaskDefinition;
  checkpoint: {
    id: string;
    timestamp: string;
    reason: 'BUFFER_ZONE' | 'MILESTONE' | 'MANUAL' | 'ERROR' | 'SCHEDULED';
    bufferZone: string;
  };
  state: {
    itemsCompleted: number;
    itemsRemaining: number;
    toolCallsUsed: number;
    elapsedMinutes: number;
    lastCompletedItem: string;
    nextItem: string;
  };
  canResume: boolean;
  resumeInstructions: string;
  stateFilePath: string;
}

export interface TaskCompletePayload {
  task: TaskDefinition;
  completion: {
    timestamp: string;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'ABORTED';
    completeness: number;  // C(T) achieved
  };
  actual: {
    effort: number;
    time: number;
    itemsCompleted: number;
    itemsSkipped: number;
    errorsEncountered: number;
  };
  predicted: {
    effort: { value: number; uncertainty: number };
    time: { value: number; uncertainty: number };
  };
  residuals: {
    effort: number;
    time: number;
    effortPercent: number;
    timePercent: number;
    withinConfidence: boolean;
  };
  calibration: {
    triggered: boolean;
    reason?: string;
    formulasAffected: string[];
  };
  learnings: string[];
}

// =============================================================================
// SECTION 4: MICROSESSION HOOKS
// =============================================================================

export interface MicrosessionPayload {
  id: string;
  index: number;
  totalMicrosessions: { value: number; uncertainty: number };
  taskId: string;
  itemRange: { start: number; end: number };
  itemCount: number;
  toolCallBudget: number;
  estimatedMinutes: number;
}

export interface MicrosessionProgressPayload extends MicrosessionPayload {
  toolCallsUsed: number;
  toolCallsRemaining: number;
  itemsProcessed: number;
  bufferZone: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  shouldCheckpoint: boolean;
  warnings: string[];
}

export interface MicrosessionCompletePayload extends MicrosessionPayload {
  actual: {
    toolCalls: number;
    minutes: number;
    itemsProcessed: number;
  };
  nextMicrosession?: {
    index: number;
    startItem: number;
  };
}

// =============================================================================
// SECTION 5: DATABASE MUTATION HOOKS
// =============================================================================

export type EntityType = 
  | 'MATERIAL' | 'MACHINE' | 'TOOL' | 'COATING' | 'HOLDER'
  | 'OPERATION' | 'STRATEGY' | 'POST_PROCESSOR'
  | 'FORMULA' | 'COEFFICIENT' | 'PREDICTION'
  | 'SKILL' | 'AGENT' | 'PATTERN' | 'LEARNING';

export interface DatabaseEntity {
  type: EntityType;
  id: string;
  name?: string;
  category?: string;
  version?: string;
}

export interface DatabaseMutationPayload<T = unknown> {
  entity: DatabaseEntity;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'BULK_CREATE' | 'BULK_UPDATE' | 'BULK_DELETE';
  data: T;
  previousData?: T;
  source: {
    type: 'USER' | 'SYSTEM' | 'EXTRACTION' | 'LEARNING' | 'CALIBRATION';
    reference?: string;
    confidence?: number;
  };
  validation?: {
    schema: string;
    required: string[];
    optional: string[];
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ 
    field: string; 
    message: string; 
    severity: 'ERROR' | 'WARNING';
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
  completeness?: number;
  missingRequired: string[];
  missingOptional: string[];
}

export interface AntiRegressionPayload {
  entity: DatabaseEntity;
  before: {
    size: number;
    itemCount: number;
    fieldCount: number;
    hash: string;
    sampleItems: unknown[];
  };
  after: {
    size: number;
    itemCount: number;
    fieldCount: number;
    hash: string;
    sampleItems: unknown[];
  };
  delta: {
    itemsAdded: number;
    itemsRemoved: number;
    itemsModified: number;
    fieldsAdded: number;
    fieldsRemoved: number;
    sizeChange: number;
    sizeChangePercent: number;
  };
  analysis: {
    regressionDetected: boolean;
    regressionType?: 'ITEM_LOSS' | 'FIELD_LOSS' | 'DATA_LOSS' | 'SEMANTIC_LOSS';
    regressionDetails: string[];
    justificationRequired: boolean;
    autoApproved: boolean;
  };
}

export interface ConsumerWiringPayload {
  entity: DatabaseEntity;
  consumers: Array<{
    id: string;
    name: string;
    type: 'ENGINE' | 'CALCULATOR' | 'UI' | 'API' | 'EXPORT' | 'LEARNING' | 'VALIDATION';
    wired: boolean;
    wireDate?: string;
    usageCount: number;
  }>;
  requirements: {
    minimum: number;  // Commandment 1: min 6-8
    target: number;
  };
  status: {
    totalConsumers: number;
    wiredConsumers: number;
    utilizationFactor: number;  // DUF
    compliant: boolean;
    gap: number;
  };
}

// =============================================================================
// SECTION 6: MATERIAL-SPECIFIC HOOKS
// =============================================================================

export type ISOGroup = 'P_STEELS' | 'M_STAINLESS' | 'K_CAST_IRON' | 
                       'N_NONFERROUS' | 'S_SUPERALLOYS' | 'H_HARDENED' | 'X_SPECIALTY';

export interface MaterialPayload {
  id: string;
  name: string;
  isoGroup: ISOGroup;
  condition?: string;
  standard?: string;
  parameters: Record<string, { value: number; uncertainty: number; unit: string; source: string } | null>;
  parameterCoverage: { 
    filled: number; 
    total: number; 
    coverage: number;
    byCategory: Record<string, { filled: number; total: number }>;
  };
}

export interface MaterialCompletenessPayload {
  material: MaterialPayload;
  schema: {
    totalParameters: number;
    requiredParameters: string[];
    criticalParameters: string[];  // Safety-critical
    optionalParameters: string[];
  };
  analysis: {
    missingRequired: string[];
    missingCritical: string[];
    missingOptional: string[];
    estimatedParameters: string[];
    lowConfidenceParameters: string[];
  };
  scores: {
    mcIndex: number;  // Material Coverage Index
    criticalCoverage: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    usableForProduction: boolean;
  };
  recommendations: string[];
}

export interface MaterialCascadePayload {
  material: MaterialPayload;
  changedParameters: string[];
  affectedConsumers: Array<{
    id: string;
    name: string;
    type: string;
    recalculationRequired: boolean;
    invalidatedCache: boolean;
  }>;
  propagationOrder: string[];
}

// =============================================================================
// SECTION 7: PHYSICS/CALCULATION HOOKS
// =============================================================================

export type CalculationType = 
  | 'CUTTING_FORCE' | 'TOOL_LIFE' | 'SURFACE_FINISH' | 'POWER'
  | 'TEMPERATURE' | 'CHIP_LOAD' | 'DEFLECTION' | 'VIBRATION'
  | 'MRR' | 'CYCLE_TIME' | 'COST' | 'SPINDLE_LOAD';

export interface CalculationInput {
  calculationType: CalculationType;
  formula: {
    id: string;
    name: string;
    version: string;
    calibrationStatus: 'CALIBRATED' | 'ESTIMATED' | 'UNCALIBRATED' | 'STALE';
  };
  inputs: Record<string, { 
    value: number; 
    uncertainty: number; 
    unit: string;
    source: string;
  }>;
  context: {
    material?: string;
    tool?: string;
    machine?: string;
    operation?: string;
  };
}

export interface CalculationOutput {
  calculationType: CalculationType;
  formula: { id: string; version: string };
  result: {
    value: number;
    uncertainty: number;
    confidence: number;
    unit: string;
  };
  intermediates: Record<string, { value: number; uncertainty: number; unit: string }>;
  uncertaintySources: Record<string, number>;  // Contribution of each source
  warnings: string[];
  safetyFlags: Array<{
    type: 'LIMIT_EXCEEDED' | 'LOW_CONFIDENCE' | 'EXTRAPOLATION' | 'UNCALIBRATED';
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
  }>;
  explanation?: string;  // XAI (Commandment 6)
}

export interface DimensionalCheckPayload {
  formula: { id: string; name: string };
  inputs: Array<{ 
    name: string; 
    unit: string; 
    dimensions: Record<string, number>;  // SI base units
  }>;
  output: { 
    name: string; 
    unit: string; 
    expectedDimensions: Record<string, number>;
    actualDimensions: Record<string, number>;
  };
  analysis: {
    consistent: boolean;
    inconsistencies: Array<{
      term: string;
      expected: string;
      actual: string;
    }>;
  };
}

export interface SafetyBoundsPayload {
  calculation: CalculationOutput;
  limits: {
    absoluteMin?: { value: number; unit: string; source: string };
    absoluteMax?: { value: number; unit: string; source: string };
    warningMin?: { value: number; unit: string };
    warningMax?: { value: number; unit: string };
    typicalRange?: { min: number; max: number; unit: string };
  };
  result: {
    inBounds: boolean;
    violations: Array<{
      type: 'ABSOLUTE_MIN' | 'ABSOLUTE_MAX' | 'WARNING_MIN' | 'WARNING_MAX';
      value: number;
      limit: number;
      severity: 'WARNING' | 'ERROR' | 'CRITICAL';
    }>;
    safetyScore: number;  // S(x) contribution
  };
}

// =============================================================================
// SECTION 8: FORMULA & COEFFICIENT EVOLUTION HOOKS
// =============================================================================

export type CalibrationStatus = 'CALIBRATED' | 'ESTIMATED' | 'UNCALIBRATED' | 'STALE' | 'FIXED';

export interface FormulaPayload {
  id: string;
  name: string;
  symbol: string;
  version: string;
  domain: string;
  category: string;
  definition: {
    form: string;
    description: string;
  };
  variables: Array<{
    symbol: string;
    name: string;
    unit: string;
    type: string;
  }>;
  coefficients: string[];  // Coefficient IDs used
  calibration: {
    status: CalibrationStatus;
    method: string;
    lastCalibrated?: string;
    dataPoints: number;
    nextCalibrationDue?: string;
  };
  performance: {
    usageCount: number;
    mae?: number;
    mape?: number;
    r2?: number;
    bias?: number;
    lastUpdated?: string;
  };
  dependencies: string[];
  dependents: string[];
}

export interface CalibrationTriggerPayload {
  formula: FormulaPayload;
  trigger: 'DATA_POINTS' | 'MAPE_THRESHOLD' | 'BIAS_THRESHOLD' | 'TIME_ELAPSED' | 'MANUAL' | 'DEPENDENCY_UPDATED';
  current: {
    dataPoints: number;
    mape: number;
    bias: number;
    daysSinceCalibration: number;
  };
  thresholds: {
    dataPointsRequired: number;
    mapeMax: number;
    biasMax: number;
    maxDaysStale: number;
  };
  exceeded: string[];  // Which thresholds were exceeded
  recommendation: 'RECALIBRATE_NOW' | 'SCHEDULE_RECALIBRATION' | 'MONITOR' | 'OK';
}

export interface CoefficientPayload {
  id: string;
  name: string;
  symbol: string;
  current: {
    value: number;
    uncertainty: number;
    confidence: number;
    status: CalibrationStatus;
  };
  history: Array<{
    value: number;
    uncertainty: number;
    timestamp: string;
    reason: string;
  }>;
  usage: {
    formulaIds: string[];
    usageCount: number;
    lastUsed?: string;
  };
}

export interface CoefficientUpdatePayload {
  coefficient: CoefficientPayload;
  update: {
    newValue: number;
    newUncertainty: number;
    newStatus: CalibrationStatus;
    reason: string;
    evidence: string;
  };
  impact: {
    affectedFormulas: string[];
    cascadeRequired: boolean;
    recalculationsNeeded: number;
  };
}

// =============================================================================
// SECTION 9: PREDICTION & CALIBRATION HOOKS
// =============================================================================

export interface PredictionPayload {
  id: string;
  formulaId: string;
  taskId: string;
  timestamp: string;
  predicted: Record<string, {
    value: number;
    uncertainty: number;
    confidence: number;
    unit: string;
  }>;
  context: {
    taskDescription: string;
    inputs: Record<string, unknown>;
  };
  status: 'PENDING' | 'RESOLVED' | 'EXPIRED' | 'CANCELLED';
}

export interface ActualRecordPayload {
  predictionId: string;
  timestamp: string;
  actual: Record<string, number>;
  residuals: Record<string, number>;
  percentErrors: Record<string, number>;
  withinConfidence: Record<string, boolean>;
  aggregateError: number;
}

export interface CalibrationExecutePayload {
  formulaId: string;
  trigger: string;
  data: {
    predictions: PredictionPayload[];
    actuals: ActualRecordPayload[];
    dataPointCount: number;
  };
  before: {
    coefficients: Record<string, number>;
    mape: number;
    bias: number;
    r2: number;
  };
  after: {
    coefficients: Record<string, number>;
    mape: number;
    bias: number;
    r2: number;
  };
  improvement: {
    mapeReduction: number;
    biasReduction: number;
    r2Improvement: number;
    significant: boolean;
  };
}

// =============================================================================
// SECTION 10: AGENT & SWARM HOOKS (56+ Agents)
// =============================================================================

export type AgentTier = 'OPUS' | 'SONNET' | 'HAIKU';

export type AgentCategory = 
  | 'CORE' | 'MANUFACTURING' | 'PRISM' | 'QUALITY'
  | 'CALCULATORS' | 'LOOKUP' | 'SPECIALIZED' | 'INTELLIGENCE';

export interface AgentDefinition {
  id: string;
  role: string;
  name: string;
  tier: AgentTier;
  category: AgentCategory;
  maxTokens: number;
  systemPromptHash: string;
}

export interface AgentExecutePayload {
  agent: AgentDefinition;
  execution: {
    id: string;
    timestamp: string;
    prompt: string;
    promptTokens: number;
    context?: string;
    contextTokens: number;
    files?: string[];
  };
  swarmId?: string;
  ralphIteration?: number;
}

export interface AgentResultPayload {
  agent: AgentDefinition;
  execution: {
    id: string;
    status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';
    durationMs: number;
  };
  result?: {
    content: string;
    outputTokens: number;
    truncated: boolean;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  cost: {
    inputTokens: number;
    outputTokens: number;
    estimatedUSD: number;
  };
  metrics: {
    promptQuality?: number;
    responseQuality?: number;
    taskCompletion?: number;
  };
}

export interface SwarmPayload {
  id: string;
  name: string;
  type: 'PARALLEL' | 'SEQUENTIAL' | 'PIPELINE' | 'INTELLIGENT';
  agents: AgentDefinition[];
  prompt: string;
  context?: string;
  files?: string[];
  config: {
    maxParallel: number;
    timeout: number;
    retries: number;
    autoSkills: boolean;
    learning: boolean;
  };
}

export interface SwarmProgressPayload extends SwarmPayload {
  progress: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    queued: number;
  };
  results: AgentResultPayload[];
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface SwarmCompletePayload extends SwarmPayload {
  completion: {
    timestamp: string;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    duration: { value: number; unit: string };
  };
  results: AgentResultPayload[];
  aggregate: {
    successCount: number;
    failCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUSD: number;
  };
  synthesis?: string;  // Combined result
  learnings: string[];
}

// =============================================================================
// SECTION 11: RALPH LOOP HOOKS
// =============================================================================

export interface RalphLoopPayload {
  id: string;
  agent: AgentDefinition;
  prompt: string;
  completionPromise: string;
  maxIterations: number;
  context?: string;
  files?: string[];
  config: {
    learning: boolean;
    earlyStop: boolean;
    convergenceThreshold?: number;
  };
}

export interface RalphIterationPayload extends RalphLoopPayload {
  iteration: {
    number: number;
    timestamp: string;
    prompt: string;  // May include previous iteration context
  };
  previousIterations: Array<{
    number: number;
    output: string;
    completionFound: boolean;
  }>;
  cumulativeLearnings: string[];
}

export interface RalphIterationResultPayload extends RalphIterationPayload {
  result: AgentResultPayload;
  analysis: {
    completionFound: boolean;
    completionLocation?: number;
    progressMade: boolean;
    convergenceScore: number;  // 0-1, how close to completion
  };
  decision: {
    continue: boolean;
    reason: string;
  };
}

export interface RalphLoopCompletePayload extends RalphLoopPayload {
  completion: {
    timestamp: string;
    status: 'COMPLETED' | 'EXHAUSTED' | 'EARLY_STOPPED' | 'ERROR';
    iterationsUsed: number;
  };
  iterations: Array<{
    number: number;
    duration: number;
    tokens: { input: number; output: number };
    completionFound: boolean;
  }>;
  totals: {
    duration: { value: number; unit: string };
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  };
  finalResult: string;
  learnings: string[];
}

// =============================================================================
// SECTION 12: LEARNING PIPELINE HOOKS
// =============================================================================

export interface LearningExtractPayload {
  source: {
    type: 'TASK' | 'SWARM' | 'RALPH' | 'SESSION' | 'ERROR' | 'SUCCESS';
    id: string;
    timestamp: string;
  };
  content: {
    prompt: string;
    result: string;
    context?: string;
  };
  metadata: {
    agents?: string[];
    skills?: string[];
    duration?: number;
    success: boolean;
  };
}

export interface LearningPayload {
  id: string;
  timestamp: string;
  category: 'PATTERN' | 'ANTI_PATTERN' | 'INSIGHT' | 'FORMULA' | 'TEMPLATE' | 'CROSS_REFERENCE';
  content: {
    name: string;
    description: string;
    applicability: string;
    evidence: string;
  };
  source: {
    taskId?: string;
    swarmId?: string;
    sessionId: string;
  };
  confidence: number;
  usageCount: number;
  lastUsed?: string;
}

export interface LearningApplyPayload {
  context: {
    currentTask: string;
    currentPrompt: string;
    detectedKeywords: string[];
  };
  matchedLearnings: Array<{
    learning: LearningPayload;
    relevanceScore: number;
    matchReason: string;
  }>;
  application: {
    contextEnhanced: boolean;
    promptModified: boolean;
    warningsAdded: string[];
    suggestionsAdded: string[];
  };
}

export interface DeepLearningPayload {
  trigger: {
    type: 'IMPROVEMENT_DETECTED' | 'PATTERN_DISCOVERED' | 'ERROR_RESOLVED' | 'MANUAL';
    description: string;
    evidence: string;
  };
  learning: {
    what: string;
    whyBetter: { metric: string; improvement: string; evidence: string };
  };
  impact: {
    skills: string[];
    agents: string[];
    scripts: string[];
    protocols: string[];
    formulas: string[];
  };
  roadmap: Array<{
    target: string;
    change: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    effort: { value: number; unit: string };
  }>;
  validation: {
    steps: string[];
    ralphLoopRequired: boolean;
  };
}

// =============================================================================
// SECTION 13: VERIFICATION CHAIN HOOKS
// =============================================================================

export interface VerificationLevel {
  level: 1 | 2 | 3 | 4;
  name: 'SELF' | 'PEER' | 'CROSS_DOMAIN' | 'HISTORICAL';
  description: string;
}

export interface VerificationPayload {
  subject: {
    type: 'CALCULATION' | 'DATA' | 'CODE' | 'RECOMMENDATION';
    id: string;
    content: unknown;
    safetyCritical: boolean;
  };
  requiredLevels: VerificationLevel[];
  timeout: number;
}

export interface VerificationLevelResultPayload {
  level: VerificationLevel;
  verifier: {
    type: 'AGENT' | 'FORMULA' | 'DATABASE' | 'HISTORICAL';
    id: string;
  };
  result: {
    status: 'PASS' | 'FAIL' | 'PARTIAL' | 'SKIP';
    confidence: number;
    evidence: string[];
    issues: Array<{
      severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
      message: string;
      location?: string;
    }>;
  };
  duration: number;
}

export interface VerificationChainCompletePayload {
  subject: VerificationPayload['subject'];
  levels: VerificationLevelResultPayload[];
  aggregate: {
    status: 'VERIFIED' | 'FAILED' | 'PARTIAL';
    overallConfidence: number;
    levelsPassed: number;
    levelsFailed: number;
    levelsSkipped: number;
  };
  blockingIssues: string[];
  recommendations: string[];
  canProceed: boolean;
}

// =============================================================================
// SECTION 14: QUALITY GATE HOOKS
// =============================================================================

export interface QualityGate {
  id: string;
  name: string;
  description: string;
  required: boolean;
  safetyCritical: boolean;
}

export const QUALITY_GATES: QualityGate[] = [
  { id: 'COMPLETENESS', name: 'Completeness', description: 'All required fields populated', required: true, safetyCritical: false },
  { id: 'VALIDATION', name: 'Validation', description: 'No physics violations', required: true, safetyCritical: true },
  { id: 'REGRESSION', name: 'Anti-Regression', description: 'No data loss from previous version', required: true, safetyCritical: true },
  { id: 'DOCUMENTATION', name: 'Documentation', description: 'Changes documented', required: true, safetyCritical: false },
  { id: 'TESTING', name: 'Testing', description: 'Tests pass', required: false, safetyCritical: false },
  { id: 'UNCERTAINTY', name: 'Uncertainty', description: 'All values have uncertainty bounds', required: true, safetyCritical: true },
  { id: 'CROSS_REFERENCE', name: 'Cross-Reference', description: 'Multiple source validation', required: true, safetyCritical: true },
  { id: 'SECURITY', name: 'Security', description: 'No vulnerabilities introduced', required: true, safetyCritical: true },
  { id: 'WIRING', name: 'Consumer Wiring', description: 'Minimum consumers connected', required: true, safetyCritical: false },
];

export interface QualityGateCheckPayload {
  subject: {
    type: string;
    id: string;
    content: unknown;
  };
  gate: QualityGate;
  checkResult: {
    status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
    evidence: string;
    details: string[];
  };
}

export interface QualityGateAggregatePayload {
  subject: {
    type: string;
    id: string;
  };
  gates: Array<{
    gate: QualityGate;
    status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
    evidence: string;
  }>;
  summary: {
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
    overallStatus: 'PASS' | 'FAIL' | 'BLOCKED';
    canProceed: boolean;
    blockingGates: string[];
  };
}

// =============================================================================
// SECTION 15: SKILL LOADING HOOKS
// =============================================================================

export interface SkillDefinition {
  id: string;
  name: string;
  level: 0 | 1 | 2 | 3 | 4;
  path: string;
  description: string;
  keywords: string[];
  agents: string[];
  tier: AgentTier;
}

export interface SkillDetectPayload {
  prompt: string;
  context?: string;
  taskType?: string;
  detectedKeywords: string[];
  matchedSkills: Array<{
    skill: SkillDefinition;
    matchScore: number;
    matchedKeywords: string[];
  }>;
}

export interface SkillLoadPayload {
  skills: SkillDefinition[];
  loadOrder: string[];
  conflicts: Array<{
    skill1: string;
    skill2: string;
    resolution: string;
  }>;
  totalSize: number;
  loadTime: number;
}

export interface SkillExecutePayload {
  skill: SkillDefinition;
  agents: string[];
  tier: AgentTier;
  prompt: string;
  context?: string;
}

// =============================================================================
// SECTION 16: SCRIPT EXECUTION HOOKS
// =============================================================================

export interface ScriptDefinition {
  id: string;
  name: string;
  path: string;
  type: 'PYTHON' | 'POWERSHELL' | 'BATCH' | 'NODE';
  description: string;
  requiredArgs: string[];
  optionalArgs: string[];
}

export interface ScriptExecutePayload {
  script: ScriptDefinition;
  args: Record<string, string>;
  workingDir: string;
  timeout: number;
  captureOutput: boolean;
}

export interface ScriptResultPayload {
  script: ScriptDefinition;
  execution: {
    exitCode: number;
    duration: number;
    timedOut: boolean;
  };
  output: {
    stdout: string;
    stderr: string;
    truncated: boolean;
  };
  artifacts?: Array<{
    path: string;
    type: string;
    size: number;
  }>;
}

// =============================================================================
// SECTION 17: PLUGIN HOOKS (Superpowers, Chrome Extension, etc.)
// =============================================================================

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  type: 'BROWSER' | 'FILESYSTEM' | 'INTEGRATION' | 'AUTOMATION';
  capabilities: string[];
  enabled: boolean;
}

export interface PluginActionPayload {
  plugin: PluginDefinition;
  action: string;
  params: Record<string, unknown>;
  context: HookContext;
}

export interface PluginResultPayload {
  plugin: PluginDefinition;
  action: string;
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
  duration: number;
}

export interface BrowserActionPayload {
  action: 'NAVIGATE' | 'CLICK' | 'TYPE' | 'READ' | 'SCREENSHOT' | 'EXECUTE_JS';
  target: {
    url?: string;
    selector?: string;
    tabId?: number;
  };
  params?: Record<string, unknown>;
}

export interface FilesystemActionPayload {
  action: 'READ' | 'WRITE' | 'DELETE' | 'MOVE' | 'COPY' | 'LIST' | 'SEARCH';
  path: string;
  content?: string;
  options?: Record<string, unknown>;
}

// =============================================================================
// SECTION 18: COMPLETE HOOK REGISTRY
// =============================================================================

/**
 * Complete registry of all hook points in PRISM
 */
export interface PRISMHookRegistry {
  // Session lifecycle (7 hooks)
  'session:preStart': HookFn<SessionStartPayload>;
  'session:postStart': HookFn<SessionStartPayload>;
  'session:preCompact': HookFn<SessionCompactPayload>;
  'session:postCompact': HookFn<SessionCompactPayload>;
  'session:preEnd': HookFn<SessionEndPayload>;
  'session:postEnd': HookFn<SessionEndPayload>;
  'session:heartbeat': HookFn<SessionHeartbeatPayload>;
  
  // Task lifecycle (10 hooks)
  'task:prePlan': HookFn<{ task: TaskDefinition }>;
  'task:mathPlanValidate': HookFn<MathPlanPayload>;
  'task:postPlan': HookFn<TaskStartPayload>;
  'task:start': HookFn<TaskStartPayload>;
  'task:progress': HookFn<TaskProgressPayload>;
  'task:checkpoint': HookFn<TaskCheckpointPayload>;
  'task:preComplete': HookFn<TaskCompletePayload>;
  'task:postComplete': HookFn<TaskCompletePayload>;
  'task:error': HookFn<TaskCompletePayload & { error: Error }>;
  'task:resume': HookFn<TaskStartPayload>;
  
  // Microsession lifecycle (5 hooks)
  'microsession:start': HookFn<MicrosessionPayload>;
  'microsession:progress': HookFn<MicrosessionProgressPayload>;
  'microsession:bufferWarning': HookFn<MicrosessionProgressPayload>;
  'microsession:preComplete': HookFn<MicrosessionCompletePayload>;
  'microsession:postComplete': HookFn<MicrosessionCompletePayload>;
  
  // Database mutations (10 hooks)
  'db:preValidate': HookFn<DatabaseMutationPayload>;
  'db:validate': HookFn<DatabaseMutationPayload>;
  'db:antiRegressionCheck': HookFn<AntiRegressionPayload>;
  'db:consumerWiringCheck': HookFn<ConsumerWiringPayload>;
  'db:preWrite': HookFn<DatabaseMutationPayload>;
  'db:postWrite': HookFn<DatabaseMutationPayload>;
  'db:preDelete': HookFn<DatabaseMutationPayload>;
  'db:postDelete': HookFn<DatabaseMutationPayload>;
  'db:bulkPreWrite': HookFn<{ entities: DatabaseMutationPayload[]; batchId: string }>;
  'db:bulkPostWrite': HookFn<{ entities: DatabaseMutationPayload[]; batchId: string }>;
  
  // Material-specific (6 hooks)
  'material:preValidate': HookFn<MaterialPayload>;
  'material:completenessCheck': HookFn<MaterialCompletenessPayload>;
  'material:preSave': HookFn<MaterialPayload>;
  'material:postSave': HookFn<MaterialPayload>;
  'material:cascade': HookFn<MaterialCascadePayload>;
  'material:crossValidate': HookFn<{ material: MaterialPayload; similars: MaterialPayload[] }>;
  
  // Physics/Calculation (8 hooks)
  'calc:preValidate': HookFn<CalculationInput>;
  'calc:dimensionalCheck': HookFn<DimensionalCheckPayload>;
  'calc:preExecute': HookFn<CalculationInput>;
  'calc:postExecute': HookFn<CalculationOutput>;
  'calc:uncertaintyInject': HookFn<CalculationOutput>;
  'calc:safetyBoundsCheck': HookFn<SafetyBoundsPayload>;
  'calc:xaiExplain': HookFn<CalculationOutput>;
  'calc:logForLearning': HookFn<CalculationOutput>;
  
  // Formula evolution (8 hooks)
  'formula:preUse': HookFn<FormulaPayload>;
  'formula:calibrationCheck': HookFn<CalibrationTriggerPayload>;
  'formula:preCalibrate': HookFn<CalibrationExecutePayload>;
  'formula:postCalibrate': HookFn<CalibrationExecutePayload>;
  'formula:coefficientPreUpdate': HookFn<CoefficientUpdatePayload>;
  'formula:coefficientPostUpdate': HookFn<CoefficientUpdatePayload>;
  'formula:preUpgrade': HookFn<{ old: FormulaPayload; new: FormulaPayload }>;
  'formula:postUpgrade': HookFn<{ old: FormulaPayload; new: FormulaPayload }>;
  
  // Prediction tracking (5 hooks)
  'prediction:create': HookFn<PredictionPayload>;
  'prediction:recordActual': HookFn<ActualRecordPayload>;
  'prediction:computeResidual': HookFn<ActualRecordPayload>;
  'prediction:aggregateMetrics': HookFn<{ formulaId: string; metrics: Record<string, number> }>;
  'prediction:triggerCalibration': HookFn<CalibrationTriggerPayload>;
  
  // Agent execution (6 hooks)
  'agent:preExecute': HookFn<AgentExecutePayload>;
  'agent:postExecute': HookFn<AgentResultPayload>;
  'agent:error': HookFn<AgentResultPayload>;
  'agent:retry': HookFn<AgentExecutePayload & { attempt: number }>;
  'agent:timeout': HookFn<AgentExecutePayload>;
  'agent:costTrack': HookFn<AgentResultPayload>;
  
  // Swarm orchestration (6 hooks)
  'swarm:preStart': HookFn<SwarmPayload>;
  'swarm:agentQueued': HookFn<{ swarm: SwarmPayload; agent: AgentDefinition }>;
  'swarm:progress': HookFn<SwarmProgressPayload>;
  'swarm:synthesize': HookFn<SwarmCompletePayload>;
  'swarm:postComplete': HookFn<SwarmCompletePayload>;
  'swarm:error': HookFn<SwarmPayload & { error: Error }>;
  
  // Ralph Loop (6 hooks)
  'ralph:preStart': HookFn<RalphLoopPayload>;
  'ralph:iterationStart': HookFn<RalphIterationPayload>;
  'ralph:iterationComplete': HookFn<RalphIterationResultPayload>;
  'ralph:completionCheck': HookFn<RalphIterationResultPayload>;
  'ralph:postComplete': HookFn<RalphLoopCompletePayload>;
  'ralph:exhausted': HookFn<RalphLoopCompletePayload>;
  
  // Learning pipeline (7 hooks)
  'learning:extract': HookFn<LearningExtractPayload>;
  'learning:create': HookFn<LearningPayload>;
  'learning:match': HookFn<LearningApplyPayload>;
  'learning:apply': HookFn<LearningApplyPayload>;
  'learning:deepAnalysis': HookFn<DeepLearningPayload>;
  'learning:propagate': HookFn<DeepLearningPayload>;
  'learning:validate': HookFn<DeepLearningPayload>;
  
  // Verification chain (5 hooks)
  'verification:start': HookFn<VerificationPayload>;
  'verification:levelComplete': HookFn<VerificationLevelResultPayload>;
  'verification:chainComplete': HookFn<VerificationChainCompletePayload>;
  'verification:blockingIssue': HookFn<VerificationChainCompletePayload>;
  'verification:override': HookFn<VerificationChainCompletePayload & { reason: string; approver: string }>;
  
  // Quality gates (4 hooks)
  'quality:gateCheck': HookFn<QualityGateCheckPayload>;
  'quality:gateAggregate': HookFn<QualityGateAggregatePayload>;
  'quality:blocked': HookFn<QualityGateAggregatePayload>;
  'quality:override': HookFn<QualityGateAggregatePayload & { reason: string; approver: string }>;
  
  // Skill loading (4 hooks)
  'skill:detect': HookFn<SkillDetectPayload>;
  'skill:load': HookFn<SkillLoadPayload>;
  'skill:execute': HookFn<SkillExecutePayload>;
  'skill:unload': HookFn<{ skills: string[] }>;
  
  // Script execution (4 hooks)
  'script:preExecute': HookFn<ScriptExecutePayload>;
  'script:postExecute': HookFn<ScriptResultPayload>;
  'script:error': HookFn<ScriptResultPayload>;
  'script:timeout': HookFn<ScriptExecutePayload>;
  
  // Plugin/Extension (6 hooks)
  'plugin:preAction': HookFn<PluginActionPayload>;
  'plugin:postAction': HookFn<PluginResultPayload>;
  'plugin:browserAction': HookFn<BrowserActionPayload>;
  'plugin:filesystemAction': HookFn<FilesystemActionPayload>;
  'plugin:error': HookFn<PluginResultPayload>;
  'plugin:stateChange': HookFn<{ plugin: PluginDefinition; oldState: unknown; newState: unknown }>;
}

/**
 * Total hook count by category
 */
export const HOOK_COUNTS = {
  session: 7,
  task: 10,
  microsession: 5,
  database: 10,
  material: 6,
  calculation: 8,
  formula: 8,
  prediction: 5,
  agent: 6,
  swarm: 6,
  ralph: 6,
  learning: 7,
  verification: 5,
  quality: 4,
  skill: 4,
  script: 4,
  plugin: 6,
  TOTAL: 107
} as const;

// =============================================================================
// SECTION 19: HOOK MANAGER INTERFACE
// =============================================================================

export interface HookManager {
  /** Register a hook */
  register<K extends keyof PRISMHookRegistry>(
    hookPoint: K,
    registration: Omit<HookRegistration<Parameters<PRISMHookRegistry[K]>[0]>, 'hookPoint'>
  ): void;
  
  /** Unregister a hook by ID */
  unregister(hookId: string): boolean;
  
  /** Execute all hooks for a hook point */
  execute<K extends keyof PRISMHookRegistry>(
    hookPoint: K,
    payload: Parameters<PRISMHookRegistry[K]>[0],
    context: HookContext
  ): Promise<HookResult[]>;
  
  /** Get all registrations for a hook point */
  getRegistrations(hookPoint: string): HookRegistration[];
  
  /** Get all hook points */
  getHookPoints(): string[];
  
  /** Check if a hook point has any registrations */
  hasHooks(hookPoint: string): boolean;
  
  /** Enable/disable a hook */
  setEnabled(hookId: string, enabled: boolean): boolean;
  
  /** Get hook execution statistics */
  getStats(): {
    totalExecutions: number;
    byHookPoint: Record<string, number>;
    avgDuration: Record<string, number>;
    failures: Record<string, number>;
  };
}

// =============================================================================
// SECTION 20: BUILT-IN SYSTEM HOOKS (Law Enforcement)
// =============================================================================

/**
 * Pre-configured system hooks that enforce the 8 Laws
 */
export const SYSTEM_HOOKS: Array<Omit<HookRegistration, 'handler'> & { handlerName: string }> = [
  // Law 1: Life-Safety Mindset
  {
    id: 'SYS-LAW1-SAFETY',
    name: 'Life-Safety Gate',
    hookPoint: 'calc:safetyBoundsCheck',
    priority: PRIORITY.SAFETY_GATE,
    enforces: ['LAW_1_LIFE_SAFETY'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Blocks outputs that violate safety bounds. S(x) >= 0.70 required.',
    handlerName: 'lifeSafetyGateHandler'
  },
  
  // Law 2: Mandatory Microsessions
  {
    id: 'SYS-LAW2-MICROSESSION',
    name: 'Microsession Enforcer',
    hookPoint: 'task:prePlan',
    priority: PRIORITY.MICROSESSION_ENFORCE,
    enforces: ['LAW_2_MICROSESSIONS'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Requires MATHPLAN decomposition before task execution.',
    handlerName: 'microsessionEnforcerHandler'
  },
  
  // Law 3: Maximum Completeness
  {
    id: 'SYS-LAW3-COMPLETENESS',
    name: 'Completeness Gate',
    hookPoint: 'task:preComplete',
    priority: PRIORITY.COMPLETENESS_CHECK,
    enforces: ['LAW_3_COMPLETENESS'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Blocks task completion if C(T) < 1.0.',
    handlerName: 'completenessGateHandler'
  },
  
  // Law 4: Anti-Regression
  {
    id: 'SYS-LAW4-REGRESSION',
    name: 'Anti-Regression Gate',
    hookPoint: 'db:antiRegressionCheck',
    priority: PRIORITY.ANTI_REGRESSION,
    enforces: ['LAW_4_ANTI_REGRESSION'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Blocks mutations that reduce data/functionality.',
    handlerName: 'antiRegressionHandler'
  },
  
  // Law 5: Predictive Thinking
  {
    id: 'SYS-LAW5-PREDICTIVE',
    name: 'Predictive Thinking Gate',
    hookPoint: 'task:start',
    priority: PRIORITY.LAW_ENFORCEMENT,
    enforces: ['LAW_5_PREDICTIVE'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Requires failure mode analysis before task execution.',
    handlerName: 'predictiveThinkingHandler'
  },
  
  // Law 6: Session Continuity
  {
    id: 'SYS-LAW6-CONTINUITY',
    name: 'Session Continuity Manager',
    hookPoint: 'session:preStart',
    priority: PRIORITY.STATE_PERSISTENCE,
    enforces: ['LAW_6_CONTINUITY'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Loads state file and enforces resume from checkpoint.',
    handlerName: 'sessionContinuityHandler'
  },
  
  // Law 7: Verification Chain
  {
    id: 'SYS-LAW7-VERIFICATION',
    name: 'Verification Chain Enforcer',
    hookPoint: 'verification:chainComplete',
    priority: PRIORITY.SAFETY_GATE,
    enforces: ['LAW_7_VERIFICATION'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Requires 95% confidence on safety-critical outputs.',
    handlerName: 'verificationChainHandler'
  },
  
  // Law 8: Continuous Mathematical Evolution
  {
    id: 'SYS-LAW8-MATH-EVOLUTION',
    name: 'Mathematical Rigor Gate',
    hookPoint: 'calc:postExecute',
    priority: PRIORITY.UNCERTAINTY_INJECTION,
    enforces: ['LAW_8_MATH_EVOLUTION'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Enforces uncertainty bounds on all outputs. M(x) >= 0.60 required.',
    handlerName: 'mathRigorHandler'
  },
  
  // MATHPLAN Gate
  {
    id: 'SYS-MATHPLAN-GATE',
    name: 'MATHPLAN Validation Gate',
    hookPoint: 'task:mathPlanValidate',
    priority: PRIORITY.MATHPLAN_GATE,
    enforces: ['LAW_2_MICROSESSIONS', 'LAW_8_MATH_EVOLUTION'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Validates MATHPLAN before task execution.',
    handlerName: 'mathPlanGateHandler'
  },
  
  // Commandment 1: Use Everywhere (Consumer Wiring)
  {
    id: 'SYS-CMD1-WIRING',
    name: 'Consumer Wiring Checker',
    hookPoint: 'db:consumerWiringCheck',
    priority: PRIORITY.CONSUMER_WIRING,
    enforces: ['COMMANDMENT_1_USE_EVERYWHERE'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Ensures minimum 6-8 consumers per database entity.',
    handlerName: 'consumerWiringHandler'
  },
  
  // Commandment 5: Uncertainty Always
  {
    id: 'SYS-CMD5-UNCERTAINTY',
    name: 'Uncertainty Injector',
    hookPoint: 'calc:uncertaintyInject',
    priority: PRIORITY.UNCERTAINTY_INJECTION,
    enforces: ['COMMANDMENT_5_UNCERTAINTY'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Injects uncertainty bounds on all numerical outputs.',
    handlerName: 'uncertaintyInjectorHandler'
  },
  
  // Prediction Logging
  {
    id: 'SYS-PREDICTION-LOG',
    name: 'Prediction Logger',
    hookPoint: 'prediction:create',
    priority: PRIORITY.METRICS_COLLECTION,
    enforces: ['LAW_8_MATH_EVOLUTION'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Logs all predictions for calibration tracking.',
    handlerName: 'predictionLoggerHandler'
  },
  
  // Calibration Monitor
  {
    id: 'SYS-CALIBRATION-MONITOR',
    name: 'Calibration Monitor',
    hookPoint: 'formula:calibrationCheck',
    priority: PRIORITY.CALIBRATION_CHECK,
    enforces: ['LAW_8_MATH_EVOLUTION'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Monitors formula calibration status and triggers recalibration.',
    handlerName: 'calibrationMonitorHandler'
  },
  
  // Learning Extractor
  {
    id: 'SYS-LEARNING-EXTRACT',
    name: 'Automatic Learning Extractor',
    hookPoint: 'task:postComplete',
    priority: PRIORITY.LEARNING_CAPTURE,
    enforces: ['COMMANDMENT_14_LEARN'],
    enabled: true,
    userDisableable: true,
    system: true,
    description: 'Extracts learnings from completed tasks.',
    handlerName: 'learningExtractorHandler'
  },
  
  // Buffer Zone Monitor
  {
    id: 'SYS-BUFFER-ZONE',
    name: 'Buffer Zone Monitor',
    hookPoint: 'microsession:progress',
    priority: PRIORITY.SAFETY_GATE,
    enforces: ['LAW_2_MICROSESSIONS'],
    enabled: true,
    userDisableable: false,
    system: true,
    description: 'Monitors tool call count and enforces checkpoints.',
    handlerName: 'bufferZoneHandler'
  }
];

// =============================================================================
// SECTION 21: EXPORTS
// =============================================================================

export type HookPoint = keyof PRISMHookRegistry;

export default PRISMHookRegistry;
