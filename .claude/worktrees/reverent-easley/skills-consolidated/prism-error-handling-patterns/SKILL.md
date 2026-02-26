---
name: prism-error-handling-patterns
version: "1.0"
level: 3
category: domain
description: |
  Error handling patterns for PRISM Manufacturing Intelligence.
  Covers Result types, custom error hierarchies, error recovery strategies,
  graceful degradation, and logging. All patterns prevent silent failures
  in safety-critical manufacturing calculations.
  Use when implementing error handling, recovery logic, or validation.
dependencies:
  - prism-typescript-safety
  - prism-code-master
consumers:
  - ALL modules in PRISM
safety_critical: true
---

# PRISM ERROR HANDLING PATTERNS
## Fail-Safe Patterns for Manufacturing Intelligence
### Version 1.0 | Level 3 Domain Skill

---

## QUICK REFERENCE

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Result Type | Explicit success/failure | All calculations |
| Error Hierarchy | Categorized errors | Domain-specific errors |
| Recovery Strategy | Automatic recovery | Transient failures |
| Graceful Degradation | Reduced functionality | Partial failures |
| Circuit Breaker | Prevent cascade | External services |
| Retry with Backoff | Transient errors | Network, I/O |
| Fallback Values | Safe defaults | Non-critical data |
| Error Boundaries | Isolate failures | Component failures |

### Safety Principle
⚠️ **LIFE-SAFETY**: Silent failures in manufacturing calculations can lead to incorrect speeds/feeds, tool breakage, or operator injury. Every error must be explicitly handled.

---

## SECTION 1: RESULT TYPE PATTERN

### Never Use Exceptions for Control Flow
```typescript
// ❌ DANGEROUS: Exception-based control flow
function calculateForce(material: Material): number {
  if (!material.kc1_1) {
    throw new Error('Missing kc1.1');  // Caller might forget to catch!
  }
  return material.kc1_1 * 0.5;
}

try {
  const force = calculateForce(material);
  // Happy path
} catch (e) {
  // Easy to forget, unclear what errors possible
}
```

### Result Type Implementation
```typescript
// ✅ SAFE: Explicit Result type
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

// Helper functions
function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Type guard
function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success;
}

function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}
```

### Usage in PRISM
```typescript
// Domain error types
type ForceError =
  | { code: 'MISSING_COEFFICIENT'; field: string }
  | { code: 'INVALID_PARAMETER'; field: string; value: number; reason: string }
  | { code: 'CALCULATION_OVERFLOW'; maxValue: number };

type ForceResult = Result<Force, ForceError>;

function calculateCuttingForce(
  material: Material,
  params: CutParams
): ForceResult {
  // Validation
  if (!material.kc1_1) {
    return err({ code: 'MISSING_COEFFICIENT', field: 'kc1_1' });
  }
  
  if (!material.mc || material.mc < 0 || material.mc > 1) {
    return err({
      code: 'INVALID_PARAMETER',
      field: 'mc',
      value: material.mc ?? NaN,
      reason: 'mc must be between 0 and 1'
    });
  }
  
  // Calculation
  const specificForce = material.kc1_1 * Math.pow(params.chipThickness, -material.mc);
  const force = specificForce * params.depth * params.width;
  
  // Overflow check
  if (force > 100000) {
    return err({ code: 'CALCULATION_OVERFLOW', maxValue: 100000 });
  }
  
  return ok({
    tangential: force,
    feed: force * 0.4,
    radial: force * 0.25,
    uncertainty: 0.15
  });
}

// Caller MUST handle both cases
const result = calculateCuttingForce(steel, cutParams);

if (isOk(result)) {
  console.log(`Force: ${result.value.tangential}N ± ${result.value.uncertainty * 100}%`);
} else {
  switch (result.error.code) {
    case 'MISSING_COEFFICIENT':
      console.error(`Missing required coefficient: ${result.error.field}`);
      break;
    case 'INVALID_PARAMETER':
      console.error(`Invalid ${result.error.field}: ${result.error.reason}`);
      break;
    case 'CALCULATION_OVERFLOW':
      console.error(`Force exceeds maximum safe value`);
      break;
  }
}
```

### Result Chaining
```typescript
// Chain operations that might fail
function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

// Usage - chain calculations
const finalResult = flatMap(
  calculateCuttingForce(material, params),
  (force) => flatMap(
    calculatePower(force, params.speed),
    (power) => calculateTorque(power, params.rpm)
  )
);
```

---

## SECTION 2: ERROR HIERARCHY

### Custom Error Classes
```typescript
// Base PRISM error
abstract class PRISMError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  readonly timestamp: Date = new Date();
  
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  toJSON(): ErrorJSON {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message
    };
  }
}

type ErrorCategory = 
  | 'VALIDATION'
  | 'CALCULATION'
  | 'DATABASE'
  | 'NETWORK'
  | 'CONFIGURATION'
  | 'SAFETY';
```

### Domain-Specific Errors
```typescript
// Validation errors
class ValidationError extends PRISMError {
  readonly code = 'VALIDATION_ERROR';
  readonly category: ErrorCategory = 'VALIDATION';
  
  constructor(
    public readonly field: string,
    public readonly reason: string,
    public readonly value?: unknown
  ) {
    super(`Validation failed for ${field}: ${reason}`);
  }
}

// Calculation errors
class CalculationError extends PRISMError {
  readonly code = 'CALCULATION_ERROR';
  readonly category: ErrorCategory = 'CALCULATION';
  
  constructor(
    public readonly calculation: string,
    message: string,
    cause?: Error
  ) {
    super(`Calculation '${calculation}' failed: ${message}`, cause);
  }
}

// Safety errors - highest priority
class SafetyError extends PRISMError {
  readonly code = 'SAFETY_ERROR';
  readonly category: ErrorCategory = 'SAFETY';
  
  constructor(
    public readonly constraint: string,
    public readonly actualValue: number,
    public readonly limit: number
  ) {
    super(`Safety constraint '${constraint}' violated: ${actualValue} exceeds limit ${limit}`);
  }
}

// Material not found
class MaterialNotFoundError extends PRISMError {
  readonly code = 'MATERIAL_NOT_FOUND';
  readonly category: ErrorCategory = 'DATABASE';
  
  constructor(public readonly materialId: string) {
    super(`Material '${materialId}' not found in database`);
  }
}

// Configuration error
class ConfigurationError extends PRISMError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly category: ErrorCategory = 'CONFIGURATION';
  
  constructor(
    public readonly setting: string,
    message: string
  ) {
    super(`Configuration error for '${setting}': ${message}`);
  }
}
```

### Error Factory
```typescript
// Centralized error creation
class ErrorFactory {
  static validation(field: string, reason: string, value?: unknown): ValidationError {
    return new ValidationError(field, reason, value);
  }
  
  static materialNotFound(id: string): MaterialNotFoundError {
    return new MaterialNotFoundError(id);
  }
  
  static safetyViolation(
    constraint: string,
    actual: number,
    limit: number
  ): SafetyError {
    return new SafetyError(constraint, actual, limit);
  }
  
  static calculation(
    name: string,
    message: string,
    cause?: Error
  ): CalculationError {
    return new CalculationError(name, message, cause);
  }
}

// Usage
throw ErrorFactory.validation('kc1_1', 'must be positive', -100);
throw ErrorFactory.safetyViolation('maxSpindleRPM', 15000, 12000);
```

---

## SECTION 3: RECOVERY STRATEGIES

### Retry with Exponential Backoff
```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE']
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier, retryableErrors } = 
    { ...defaultRetryConfig, ...config };
  
  let lastError: Error | undefined;
  let delay = initialDelayMs;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if retryable
      const errorCode = (error as PRISMError).code;
      if (!retryableErrors.includes(errorCode)) {
        throw error;  // Not retryable
      }
      
      if (attempt === maxAttempts) {
        throw error;  // Last attempt
      }
      
      // Wait before retry
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      
      console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
    }
  }
  
  throw lastError;
}

// Usage
const material = await withRetry(
  () => materialRepository.findById(id),
  { maxAttempts: 3, initialDelayMs: 200 }
);
```

### Circuit Breaker
```typescript
enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime?: Date;
  private successCount = 0;
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 30000,
    private readonly halfOpenSuccessThreshold: number = 3
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime.getTime() > this.resetTimeoutMs;
  }
  
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
    } else if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }
  
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
  }
  
  getState(): CircuitState {
    return this.state;
  }
}

// Usage
const materialServiceBreaker = new CircuitBreaker(5, 30000);

async function getMaterial(id: string): Promise<Material> {
  return materialServiceBreaker.execute(() => 
    externalMaterialService.fetch(id)
  );
}
```

### Fallback Values
```typescript
// Type-safe fallback with logging
interface FallbackConfig<T> {
  fallbackValue: T;
  logFallback: boolean;
  notifySeverity: 'debug' | 'info' | 'warn' | 'error';
}

function withFallback<T>(
  operation: () => T,
  config: FallbackConfig<T>
): T {
  try {
    return operation();
  } catch (error) {
    if (config.logFallback) {
      console[config.notifySeverity](
        `Operation failed, using fallback value`,
        { error, fallback: config.fallbackValue }
      );
    }
    return config.fallbackValue;
  }
}

// Usage - non-critical defaults
const feedMultiplier = withFallback(
  () => material.getFeedMultiplier(),
  {
    fallbackValue: 1.0,
    logFallback: true,
    notifySeverity: 'warn'
  }
);
```

---

## SECTION 4: GRACEFUL DEGRADATION

### Feature Flags for Degradation
```typescript
interface DegradationLevel {
  full: boolean;           // All features
  reduced: boolean;        // Core features only
  minimal: boolean;        // Safety-critical only
  offline: boolean;        // No external services
}

class DegradationManager {
  private level: keyof DegradationLevel = 'full';
  private listeners: Array<(level: keyof DegradationLevel) => void> = [];
  
  setLevel(level: keyof DegradationLevel): void {
    this.level = level;
    this.notifyListeners();
  }
  
  isFeatureAvailable(requiredLevel: keyof DegradationLevel): boolean {
    const levels: (keyof DegradationLevel)[] = ['offline', 'minimal', 'reduced', 'full'];
    const currentIndex = levels.indexOf(this.level);
    const requiredIndex = levels.indexOf(requiredLevel);
    return currentIndex >= requiredIndex;
  }
  
  onLevelChange(listener: (level: keyof DegradationLevel) => void): void {
    this.listeners.push(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.level));
  }
}

// Usage
const degradation = new DegradationManager();

async function calculateOptimalParams(request: CalculationRequest): Promise<CalculationResult> {
  if (degradation.isFeatureAvailable('full')) {
    // Full AI-powered optimization
    return aiOptimizer.optimize(request);
  }
  
  if (degradation.isFeatureAvailable('reduced')) {
    // Simplified calculation without AI
    return standardCalculator.calculate(request);
  }
  
  // Minimal - use conservative defaults
  return {
    speed: request.material.conservativeSpeed,
    feed: request.material.conservativeFeed,
    warning: 'Using conservative defaults due to system degradation'
  };
}
```

### Partial Results
```typescript
// Return what you can, report what failed
interface PartialResult<T> {
  data: Partial<T>;
  completed: (keyof T)[];
  failed: Array<{
    field: keyof T;
    error: Error;
  }>;
  completionRate: number;
}

async function calculateAllProperties(
  material: Material
): Promise<PartialResult<MaterialProperties>> {
  const result: PartialResult<MaterialProperties> = {
    data: {},
    completed: [],
    failed: [],
    completionRate: 0
  };
  
  const calculations: Array<{
    field: keyof MaterialProperties;
    calculate: () => Promise<number>;
  }> = [
    { field: 'cuttingForce', calculate: () => calculateForce(material) },
    { field: 'temperature', calculate: () => calculateTemperature(material) },
    { field: 'toolLife', calculate: () => estimateToolLife(material) },
    { field: 'surfaceFinish', calculate: () => predictSurfaceFinish(material) }
  ];
  
  for (const calc of calculations) {
    try {
      result.data[calc.field] = await calc.calculate();
      result.completed.push(calc.field);
    } catch (error) {
      result.failed.push({
        field: calc.field,
        error: error as Error
      });
    }
  }
  
  result.completionRate = result.completed.length / calculations.length;
  
  return result;
}

// Usage
const props = await calculateAllProperties(steel);

if (props.completionRate === 1) {
  console.log('All calculations successful');
} else if (props.completionRate >= 0.5) {
  console.warn(`Partial results: ${props.failed.map(f => f.field).join(', ')} failed`);
  // Continue with partial data
} else {
  console.error('Too many failures, cannot proceed safely');
}
```

---

## SECTION 5: LOGGING & MONITORING

### Structured Logging
```typescript
interface LogContext {
  operation: string;
  materialId?: string;
  machineId?: string;
  userId?: string;
  correlationId?: string;
  duration?: number;
  [key: string]: unknown;
}

interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}

class PRISMLogger implements ILogger {
  constructor(
    private readonly service: string,
    private readonly correlationId?: string
  ) {}
  
  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, undefined, context);
  }
  
  info(message: string, context?: LogContext): void {
    this.log('INFO', message, undefined, context);
  }
  
  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, undefined, context);
  }
  
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('ERROR', message, error, context);
  }
  
  private log(
    level: string,
    message: string,
    error?: Error,
    context?: LogContext
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      correlationId: this.correlationId,
      message,
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as PRISMError).code
        }
      })
    };
    
    console.log(JSON.stringify(entry));
  }
}

// Usage
const logger = new PRISMLogger('ForceCalculator', 'req-123');

logger.info('Starting force calculation', {
  operation: 'calculateCuttingForce',
  materialId: '4140-ANN'
});

try {
  const result = calculateForce(material, params);
  logger.info('Force calculation complete', {
    operation: 'calculateCuttingForce',
    materialId: material.id,
    duration: 45
  });
} catch (error) {
  logger.error('Force calculation failed', error as Error, {
    operation: 'calculateCuttingForce',
    materialId: material.id
  });
}
```

### Error Tracking
```typescript
// Centralized error tracking
class ErrorTracker {
  private errors: ErrorRecord[] = [];
  private readonly maxErrors = 1000;
  
  track(error: Error, context?: Record<string, unknown>): void {
    const record: ErrorRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as PRISMError).code,
      category: (error as PRISMError).category,
      context
    };
    
    this.errors.push(record);
    
    // Trim old errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Alert on safety errors
    if (record.category === 'SAFETY') {
      this.alertSafetyTeam(record);
    }
  }
  
  getRecentErrors(count: number = 10): ErrorRecord[] {
    return this.errors.slice(-count);
  }
  
  getErrorsByCategory(category: ErrorCategory): ErrorRecord[] {
    return this.errors.filter(e => e.category === category);
  }
  
  private alertSafetyTeam(record: ErrorRecord): void {
    // Send alert for safety-critical errors
    console.error('🚨 SAFETY ERROR', record);
  }
}
```

---

## SECTION 6: ERROR BOUNDARIES

### Component Error Boundaries
```typescript
// Error boundary for React components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class CalculationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error
    errorTracker.track(error, { 
      component: 'CalculationErrorBoundary',
      componentStack: errorInfo.componentStack 
    });
  }
  
  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h3>Calculation Error</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<CalculationErrorBoundary fallback={<SafeDefaultView />}>
  <ForceCalculationPanel />
</CalculationErrorBoundary>
```

### Service Error Boundaries
```typescript
// Isolate service failures
class ServiceBoundary<T> {
  constructor(
    private readonly service: T,
    private readonly fallback: T
  ) {}
  
  async execute<R>(
    operation: (service: T) => Promise<R>,
    fallbackOperation?: (service: T) => Promise<R>
  ): Promise<R> {
    try {
      return await operation(this.service);
    } catch (error) {
      console.warn('Primary service failed, using fallback', error);
      
      if (fallbackOperation) {
        return await fallbackOperation(this.fallback);
      }
      
      throw error;
    }
  }
}

// Usage
const materialService = new ServiceBoundary(
  primaryMaterialDatabase,
  localCacheMaterialDatabase
);

const material = await materialService.execute(
  (svc) => svc.findById(id),
  (svc) => svc.findById(id)  // Same operation on fallback
);
```

---

## SECTION 7: VALIDATION PATTERNS

### Validate Early, Fail Fast
```typescript
// Validation at entry points
function validateCalculationRequest(request: unknown): Result<CalculationRequest, ValidationError[]> {
  const errors: ValidationError[] = [];
  
  if (!request || typeof request !== 'object') {
    return err([new ValidationError('request', 'must be an object')]);
  }
  
  const r = request as Record<string, unknown>;
  
  // Required fields
  if (!r.materialId || typeof r.materialId !== 'string') {
    errors.push(new ValidationError('materialId', 'required string'));
  }
  
  if (!r.speed || typeof r.speed !== 'number' || r.speed <= 0) {
    errors.push(new ValidationError('speed', 'must be positive number', r.speed));
  }
  
  if (!r.feed || typeof r.feed !== 'number' || r.feed <= 0) {
    errors.push(new ValidationError('feed', 'must be positive number', r.feed));
  }
  
  if (!r.depth || typeof r.depth !== 'number' || r.depth <= 0) {
    errors.push(new ValidationError('depth', 'must be positive number', r.depth));
  }
  
  // Safety limits
  if (typeof r.speed === 'number' && r.speed > 10000) {
    errors.push(new ValidationError('speed', 'exceeds safe maximum of 10000', r.speed));
  }
  
  if (errors.length > 0) {
    return err(errors);
  }
  
  return ok(r as unknown as CalculationRequest);
}
```

### Aggregate Errors
```typescript
// Collect multiple errors
class ValidationErrorCollector {
  private errors: ValidationError[] = [];
  
  add(field: string, reason: string, value?: unknown): void {
    this.errors.push(new ValidationError(field, reason, value));
  }
  
  addIf(condition: boolean, field: string, reason: string, value?: unknown): void {
    if (condition) {
      this.add(field, reason, value);
    }
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  getErrors(): ValidationError[] {
    return [...this.errors];
  }
  
  toResult<T>(value: T): Result<T, ValidationError[]> {
    if (this.hasErrors()) {
      return err(this.errors);
    }
    return ok(value);
  }
}

// Usage
function validateMaterial(material: unknown): Result<Material, ValidationError[]> {
  const collector = new ValidationErrorCollector();
  const m = material as Record<string, unknown>;
  
  collector.addIf(!m.id, 'id', 'required');
  collector.addIf(!m.name, 'name', 'required');
  collector.addIf(typeof m.kc1_1 !== 'number', 'kc1_1', 'must be number', m.kc1_1);
  collector.addIf(typeof m.mc !== 'number', 'mc', 'must be number', m.mc);
  
  return collector.toResult(material as Material);
}
```

---

## SECTION 8: ANTI-PATTERNS

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Swallowing exceptions | Silent failures | Always handle or rethrow |
| Generic catch-all | Unclear error handling | Catch specific types |
| Throw strings | No stack trace | Use Error objects |
| Return null | Ambiguous failure | Use Result type |
| Error as control flow | Expensive, unclear | Use conditionals |
| Ignore async errors | Unhandled rejections | Always await/catch |
| Log and throw | Duplicate logs | Log OR throw |
| Empty catch | Hides bugs | At minimum, log |

---

## SECTION 9: CHECKLIST

```
□ All functions return Result type or throw documented errors
□ Custom error classes extend PRISMError
□ Errors include error codes for programmatic handling
□ Safety errors are specially flagged and tracked
□ Retry logic for transient failures
□ Circuit breaker for external services
□ Graceful degradation when features fail
□ Structured logging with correlation IDs
□ Error boundaries isolate component failures
□ Validation at all entry points
□ No swallowed exceptions
□ No bare "throw new Error()"
□ All async operations have error handling
□ Safety-critical errors trigger alerts
```

---

**Every error must be explicitly handled. Silent failures can cause injury.**

**Version:** 1.0 | **Date:** 2026-01-29 | **Level:** 3 (Domain)
