/**
 * PRISM MCP Server - Structured JSON Logger
 * Outputs structured JSON to stderr for MCP compliance.
 * Includes correlationId propagation per XA-8 log schema.
 * 
 * NOTE: This supplements the existing Winston logger (Logger.ts).
 * Use this for structured log records that need correlationId and dispatcher/action fields.
 * Use the existing Logger.ts for general application logging.
 * 
 * @module utils/structuredLogger
 */

import { randomUUID } from 'crypto';

/** Log levels in severity order */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Standard structured log record — all fields per XA-8 log schema */
export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  dispatcher?: string;
  action?: string;
  durationMs?: number;
  effort?: string;
  message: string;
  [key: string]: unknown;
}

/** Safety decision record — logged when S(x) blocks an operation */
export interface SafetyBlockRecord {
  type: 'safety_block';
  material: string;
  operation: string;
  safety_score: number;
  threshold: number;
  failing_parameters: string[];
  correlationId: string;
  timestamp: string;
}

/**
 * Generate a new correlation ID (UUID v4).
 * Use at the entry point of every API call chain.
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Generate a child correlation ID from a parent.
 * Used for swarm sub-tasks: parent="abc-123", child="abc-123:1"
 */
export function childCorrelationId(parentId: string, childIndex: number): string {
  return `${parentId}:${childIndex}`;
}

/**
 * Emit a structured log record to stderr (MCP-compliant).
 */
export function structuredLog(record: Partial<LogRecord> & { level: LogLevel; message: string }): void {
  const full: LogRecord = {
    timestamp: new Date().toISOString(),
    correlationId: record.correlationId ?? 'none',
    ...record,
  };
  process.stderr.write(JSON.stringify(full) + '\n');
}

/**
 * Log a safety block decision.
 */
export function logSafetyBlock(record: Omit<SafetyBlockRecord, 'type' | 'timestamp'>): void {
  const full: SafetyBlockRecord = {
    type: 'safety_block',
    timestamp: new Date().toISOString(),
    ...record,
  };
  process.stderr.write(JSON.stringify(full) + '\n');
}
