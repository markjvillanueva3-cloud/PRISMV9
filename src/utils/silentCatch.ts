/**
 * silentCatch — Wraps function calls with error logging instead of silent catch.
 * Returns fallback value on error while logging a warning.
 *
 * Replaces empty catch blocks throughout the codebase with observable error handling.
 * Every swallowed error now produces a console.warn with context, making failures
 * visible in logs without crashing the pipeline.
 *
 * @module utils/silentCatch
 */

/**
 * Wraps a synchronous function call with error logging instead of silent catch.
 * Returns fallback value on error while logging a warning.
 *
 * @param fn - The function to execute
 * @param context - A descriptive label for the catch site (e.g. "PFO:persistToFile")
 * @param fallback - The value to return if fn throws
 * @returns The result of fn(), or fallback on error
 */
export function silentCatch<T>(
  fn: () => T,
  context: string,
  fallback: T
): T {
  try {
    return fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[silentCatch:${context}] ${msg}`);
    return fallback;
  }
}

/**
 * Wraps an async function call with error logging instead of silent catch.
 * Returns fallback value on error while logging a warning.
 *
 * @param fn - The async function to execute
 * @param context - A descriptive label for the catch site
 * @param fallback - The value to return if fn rejects
 * @returns The result of fn(), or fallback on error
 */
export async function silentCatchAsync<T>(
  fn: () => Promise<T>,
  context: string,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[silentCatch:${context}] ${msg}`);
    return fallback;
  }
}
