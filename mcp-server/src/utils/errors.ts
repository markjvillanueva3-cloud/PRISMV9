/**
 * PRISM MCP Server - Error Handling
 * Centralized error types and handling utilities
 */

import { log } from "./Logger.js";

// ============================================================================
// ERROR TYPES
// ============================================================================

export class PrismError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PrismError";
  }

  toToolResponse(): { isError: true; content: [{ type: "text"; text: string }] } {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Error [${this.code}]: ${this.message}${this.details ? `\nDetails: ${JSON.stringify(this.details)}` : ""}`
      }]
    };
  }
}

export class NotFoundError extends PrismError {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} not found: ${identifier}`,
      "NOT_FOUND",
      { resource, identifier }
    );
    this.name = "NotFoundError";
  }
}

export class ValidationError extends PrismError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class SafetyError extends PrismError {
  constructor(message: string, score: number) {
    super(
      `Safety check failed: ${message}. S(x) = ${score.toFixed(2)} < 0.70 threshold`,
      "SAFETY_BLOCK",
      { score, threshold: 0.70 }
    );
    this.name = "SafetyError";
  }
}

export class TimeoutError extends PrismError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation timed out after ${timeoutMs}ms: ${operation}`,
      "TIMEOUT",
      { operation, timeoutMs }
    );
    this.name = "TimeoutError";
  }
}

export class FileSystemError extends PrismError {
  constructor(operation: string, path: string, originalError?: Error) {
    super(
      `File system error during ${operation}: ${path}`,
      "FILESYSTEM_ERROR",
      { operation, path, originalError: originalError?.message }
    );
    this.name = "FileSystemError";
  }
}

export class AgentError extends PrismError {
  constructor(agentId: string, message: string, details?: Record<string, unknown>) {
    super(
      `Agent ${agentId} error: ${message}`,
      "AGENT_ERROR",
      { agentId, ...details }
    );
    this.name = "AgentError";
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Wrap async tool handler with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  toolName: string,
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | { isError: true; content: [{ type: "text"; text: string }] }> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      log.error(`Tool ${toolName} failed`, error);
      
      if (error instanceof PrismError) {
        return error.toToolResponse();
      }
      
      if (error instanceof Error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error: ${error.message}. Please check your inputs and try again.`
          }]
        };
      }
      
      return {
        isError: true,
        content: [{
          type: "text",
          text: "An unexpected error occurred. Please try again."
        }]
      };
    }
  };
}

/**
 * Create actionable error message with suggestions
 */
export function actionableError(
  message: string,
  suggestions: string[]
): { isError: true; content: [{ type: "text"; text: string }] } {
  const text = [
    `Error: ${message}`,
    "",
    "Suggestions:",
    ...suggestions.map((s, i) => `  ${i + 1}. ${s}`)
  ].join("\n");
  
  return {
    isError: true,
    content: [{ type: "text", text }]
  };
}

/**
 * Validate required fields and return actionable error if missing
 */
export function validateRequired<T extends Record<string, unknown>>(
  input: T,
  requiredFields: (keyof T)[]
): { valid: true } | { valid: false; error: ReturnType<typeof actionableError> } {
  const missing = requiredFields.filter(f => input[f] === undefined || input[f] === null || input[f] === "");
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: actionableError(
        `Missing required fields: ${missing.join(", ")}`,
        missing.map(f => `Provide a value for '${String(f)}'`)
      )
    };
  }
  
  return { valid: true };
}
