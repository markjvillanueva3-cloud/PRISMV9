/**
 * PRISM MCP Server - Error Taxonomy
 * Safety-critical error classification with category + severity.
 * 
 * HANDLING RULES BY SEVERITY:
 *   'block':  STOP execution. Log. Do not continue chain.
 *   'retry':  Retry once with backoff. If retry fails → escalate.
 *   'log':    Log structured error. Continue execution.
 * 
 * @module errors/PrismError
 * @safety CRITICAL — SafetyBlockError triggers hard S(x) blocks.
 */

export type ErrorCategory = 'safety' | 'data' | 'network' | 'schema' | 'state' | 'validation';
export type ErrorSeverity = 'block' | 'retry' | 'log';

/**
 * Base error class for all PRISM errors.
 * Provides structured category + severity for catch blocks to route correctly.
 */
export class PrismError extends Error {
  public readonly name = 'PrismError';

  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity,
  ) {
    super(message);
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Convert to MCP tool error response format */
  toToolResponse(): { isError: true; content: [{ type: 'text'; text: string }] } {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `[${this.category}/${this.severity}] ${this.message}`,
      }],
    };
  }
}

/**
 * Safety block error — thrown when S(x) < 0.70.
 * This ALWAYS has severity='block'. No exceptions.
 * 
 * @safety CRITICAL — This error prevents unsafe cutting parameters from being returned.
 */
export class SafetyBlockError extends PrismError {
  constructor(
    message: string,
    public readonly safetyScore: number,
  ) {
    super(message, 'safety', 'block');
    (this as any).name = 'SafetyBlockError';
  }
}

/**
 * Data error — thrown when registry data is missing, corrupt, or inconsistent.
 */
export class DataError extends PrismError {
  constructor(message: string, severity: ErrorSeverity = 'retry') {
    super(message, 'data', severity);
    (this as any).name = 'DataError';
  }
}

/**
 * Schema error — thrown when structured output validation fails.
 */
export class SchemaError extends PrismError {
  constructor(message: string) {
    super(message, 'schema', 'block');
    (this as any).name = 'SchemaError';
  }
}

/**
 * Network error — thrown on API timeouts or connectivity failures.
 */
export class NetworkError extends PrismError {
  constructor(message: string) {
    super(message, 'network', 'retry');
    (this as any).name = 'NetworkError';
  }
}

/**
 * Validation error — thrown on input validation failures.
 */
export class ValidationError extends PrismError {
  constructor(message: string, severity: ErrorSeverity = 'block') {
    super(message, 'validation', severity);
    (this as any).name = 'ValidationError';
  }
}
