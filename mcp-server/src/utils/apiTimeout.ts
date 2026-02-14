/**
 * PRISM MCP Server - API Call Timeout Wrapper
 * Wraps any async operation with an AbortController timeout.
 * Distinguishes AbortError from other failures for proper error classification.
 * 
 * @module utils/apiTimeout
 * @safety HIGH — All external API calls MUST use this wrapper.
 */

import { PrismError } from '../errors/PrismError.js';

/**
 * Execute an async function with a timeout boundary.
 * 
 * @param fn - Async function that accepts an AbortSignal
 * @param timeoutMs - Timeout in milliseconds (default: 30s)
 * @param context - Description of the operation (for error messages)
 * @returns The result of fn
 * @throws {PrismError} with category='network', severity='retry' on timeout
 * @throws {Error} Original error if fn fails for non-timeout reasons
 */
export async function apiCallWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = 30_000,
  context: string = 'unknown'
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new PrismError(
        `API call timed out after ${timeoutMs}ms: ${context}`,
        'network',
        'retry'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
