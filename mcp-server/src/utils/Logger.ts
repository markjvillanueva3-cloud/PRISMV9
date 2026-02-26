/**
 * PRISM MCP Server - Logger Utility
 * Centralized logging with Winston
 */

import winston from "winston";
import { SERVER_NAME } from "../constants.js";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  const ts = (timestamp as string).slice(11, 23); // HH:MM:SS.mmm
  return stack 
    ? `${ts} [${level}] ${message}\n${stack}`
    : `${ts} [${level}] ${message}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: SERVER_NAME },
  format: combine(
    timestamp(),
    errors({ stack: true })
  ),
  transports: [
    // Console transport (stderr for MCP compliance)
    new winston.transports.Console({
      stderrLevels: ["error", "warn", "info", "debug"],
      format: combine(
        colorize(),
        consoleFormat
      )
    })
  ]
});

// Structured JSON audit log — always active for enterprise compliance
// Written to state/logs/ for append-only audit trail (R4-MS2)
import * as fs from 'fs';
import * as path from 'path';

// Use PRISM_HOME env var if set, otherwise try to construct from cwd
const PRISM_HOME = process.env.PRISM_HOME || 'C:\\PRISM';
const AUDIT_LOG_DIR = path.join(PRISM_HOME, 'state', 'logs');
try { if (!fs.existsSync(AUDIT_LOG_DIR)) fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true }); } catch { /* non-fatal */ }

logger.add(new winston.transports.File({
  filename: path.join(AUDIT_LOG_DIR, 'audit.jsonl'),
  format: combine(timestamp(), winston.format.json()),
  level: 'info',
}));

logger.add(new winston.transports.File({
  filename: path.join(AUDIT_LOG_DIR, 'error.jsonl'),
  format: combine(timestamp(), winston.format.json()),
  level: 'error',
}));

// Add file transport in production
if (process.env.NODE_ENV === "production") {
  logger.add(new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
    format: combine(timestamp(), winston.format.json())
  }));
  logger.add(new winston.transports.File({
    filename: "logs/combined.log",
    format: combine(timestamp(), winston.format.json())
  }));
}

// Convenience methods
export const log = {
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  error: (message: string, error?: Error | unknown) => {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack });
    } else {
      logger.error(message, { error });
    }
  },
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
  tool: (toolName: string, action: string, meta?: Record<string, unknown>) => {
    logger.info(`[${toolName}] ${action}`, meta);
  },
  /** Structured audit log entry for compliance (R4-MS2) */
  audit: (event: string, meta: Record<string, unknown> = {}) => {
    logger.info(`[AUDIT] ${event}`, { ...meta, _audit: true, _ts: Date.now() });
  },
};

/**
 * Logger class for component-level logging
 * Used by SafetyValidator and other components
 */
export class Logger {
  private prefix: string;

  constructor(component: string) {
    this.prefix = component;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    logger.info(`[${this.prefix}] ${message}`, meta);
  }

  warn(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      logger.warn(`[${this.prefix}] ${message}`, { error: error.message, stack: error.stack });
    } else if (error) {
      logger.warn(`[${this.prefix}] ${message}`, { error });
    } else {
      logger.warn(`[${this.prefix}] ${message}`);
    }
  }

  error(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      logger.error(`[${this.prefix}] ${message}`, { error: error.message, stack: error.stack });
    } else if (error) {
      logger.error(`[${this.prefix}] ${message}`, { error });
    } else {
      logger.error(`[${this.prefix}] ${message}`);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    logger.debug(`[${this.prefix}] ${message}`, meta);
  }
}

export default logger;
