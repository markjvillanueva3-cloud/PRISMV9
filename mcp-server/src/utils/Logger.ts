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
  }
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
