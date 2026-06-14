/**
 * pollWithBackoff — generic async polling utility with exponential backoff.
 *
 * Primary export: `pollUntil`. The file is named after the strategy (backoff)
 * rather than the function, matching `apiTimeout.ts → apiCallWithTimeout`
 * convention.
 *
 * Pattern: caller provides a function that fetches current state, and a
 * predicate that decides whether the state is "done." Util retries with
 * exponential backoff (capped) until predicate is satisfied, max attempts
 * reached, or max wall-time exceeded.
 *
 * Use cases:
 *   - APS Model Derivative: poll job manifest until status="success"|"failed"
 *   - Long-running CI / external job status checks
 *   - Anywhere "retry until condition" is needed
 *
 * Distinct from retry-on-throw: caller's fn is expected to RETURN each time,
 * not throw. State is checked via the predicate. Throws from fn (and from the
 * predicate) bubble up immediately — pollUntil does NOT retry on thrown errors.
 *
 * NOT supported (by design — single-responsibility):
 *   - HTTP Retry-After header parsing. Wrap pollUntil in a Retry-After-aware
 *     layer, or pre-compute the delay and pass via baseDelayMs.
 *   - Predicate-throw retry. If `check` throws, the error propagates as-is.
 *
 * @module utils/pollWithBackoff
 */

/**
 * Options for pollUntil. All optional; sensible defaults provided.
 */
export interface PollOptions<T = unknown> {
  /** Maximum number of polls before giving up. Default 60. */
  maxAttempts?: number;
  /** Initial delay between polls (ms). Default 1000. */
  baseDelayMs?: number;
  /** Maximum delay between polls (ms). Default 30000 (30s). */
  maxDelayMs?: number;
  /** Exponential growth factor per attempt. Default 1.5. */
  backoffFactor?: number;
  /** Maximum total wall-time before giving up (ms). Default 600000 (10 min). */
  maxWallTimeMs?: number;
  /** Optional AbortSignal — polling aborts on signal. */
  signal?: AbortSignal;
  /**
   * Optional diagnostic label embedded in PollTimeoutError messages.
   * Distinguishes simultaneous pollers (e.g. "aps-manifest-urn:abc" vs
   * "hermes-eval-run-42") in aggregated logs/traces.
   */
  label?: string;
  /**
   * Optional hook called before each inter-poll delay.
   *
   * @param attempt - 1-based attempt number just completed
   * @param delayMs - delay computed for the upcoming sleep
   * @param lastValue - value returned by `fn` on this attempt (predicate was false)
   */
  onAttempt?: (attempt: number, delayMs: number, lastValue: T) => void;
}

/**
 * Reason a poll terminated without success.
 */
export type PollFailureReason =
  | "max-attempts-exceeded"
  | "max-wall-time-exceeded"
  | "aborted";

/**
 * Error thrown when pollUntil terminates without satisfying the predicate.
 * Carries the last observed value so callers can inspect partial state.
 *
 * **Generic-erasure caveat:** TypeScript erases the `<T>` instantiation when
 * an exception is thrown. In `catch (e)`, `e instanceof PollTimeoutError`
 * narrows to `PollTimeoutError<unknown>` — `e.lastValue` is `unknown`. Cast
 * at the catch site:
 * ```ts
 * try { await pollUntil<Manifest>(fn, check); }
 * catch (e) {
 *   if (e instanceof PollTimeoutError) {
 *     const m = e.lastValue as Manifest | undefined;
 *   }
 * }
 * ```
 * The generic remains useful for *throw-site* type safety (constructor args)
 * even though `catch` narrowing loses it.
 */
export class PollTimeoutError<T = unknown> extends Error {
  public readonly reason: PollFailureReason;
  public readonly lastValue: T | undefined;
  public readonly attempts: number;
  public readonly elapsedMs: number;
  public readonly label: string | undefined;

  constructor(
    reason: PollFailureReason,
    lastValue: T | undefined,
    attempts: number,
    elapsedMs: number,
    label?: string,
  ) {
    const tag = label ? `[${label}] ` : "";
    super(`poll ${tag}terminated: ${reason} after ${attempts} attempt(s), ${elapsedMs}ms`);
    this.name = "PollTimeoutError";
    this.reason = reason;
    this.lastValue = lastValue;
    this.attempts = attempts;
    this.elapsedMs = elapsedMs;
    this.label = label;
  }
}

const DEFAULTS = {
  maxAttempts: 60,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 1.5,
  maxWallTimeMs: 600000,
} as const;

/**
 * Poll `fn` until `check(result)` returns true.
 *
 * Behavior:
 *   - First call to fn is immediate (no initial delay).
 *   - Between attempts, delay grows: current sleep = `delayMs`; AFTER sleep,
 *     `delayMs = min(delayMs * backoffFactor, maxDelayMs)`.
 *   - On predicate true → resolves with the result.
 *   - On maxAttempts exceeded → throws PollTimeoutError(reason="max-attempts-exceeded").
 *   - On maxWallTimeMs exceeded → throws PollTimeoutError(reason="max-wall-time-exceeded").
 *   - On AbortSignal → throws PollTimeoutError(reason="aborted").
 *   - If fn or check throws, the error bubbles up immediately (no retry on throw).
 *
 * **Common trap — `fetch()` result vs JSON body:** If `fn` is `() => fetch(url)`,
 * the resolved value is a `Response` (with HTTP `.status`), NOT the JSON body.
 * Predicates like `m => m.status === 'success'` will compare against the HTTP
 * status code (200) and never match the body's status field. Always `.json()`
 * inside `fn`:
 * ```ts
 * pollUntil(async () => (await fetch(url)).json(), m => m.status === 'success')
 * ```
 *
 * @param fn - async function that returns current state
 * @param check - predicate that returns true when polling should stop
 * @param options - polling configuration (all optional)
 * @returns the final value of fn() that satisfied the predicate
 * @throws PollTimeoutError if predicate never satisfied within bounds
 * @throws Error if fn or check throws (propagates as-is, no retry)
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  check: (result: T) => boolean,
  options: PollOptions<T> = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts;
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const backoffFactor = options.backoffFactor ?? DEFAULTS.backoffFactor;
  const maxWallTimeMs = options.maxWallTimeMs ?? DEFAULTS.maxWallTimeMs;
  const signal = options.signal;
  const label = options.label;
  const onAttempt = options.onAttempt;

  // Validate — fail loud on bad input rather than misbehave silently.
  // Each check rejects NaN/Infinity AND out-of-range values.
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1) {
    throw new Error("pollUntil: maxAttempts must be a finite number >= 1");
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new Error("pollUntil: baseDelayMs must be a finite number >= 0");
  }
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) {
    throw new Error("pollUntil: maxDelayMs must be a finite number >= baseDelayMs");
  }
  if (!Number.isFinite(backoffFactor) || backoffFactor < 1) {
    throw new Error("pollUntil: backoffFactor must be a finite number >= 1");
  }
  // maxWallTimeMs must allow at least one attempt — reject 0 (would throw before fn() ever ran).
  if (!Number.isFinite(maxWallTimeMs) || maxWallTimeMs < 1) {
    throw new Error("pollUntil: maxWallTimeMs must be a finite number >= 1");
  }

  const startedAt = Date.now();
  let lastValue: T | undefined;
  let delayMs = baseDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new PollTimeoutError<T>("aborted", lastValue, attempt - 1, Date.now() - startedAt, label);
    }

    const elapsedBeforeAttempt = Date.now() - startedAt;
    if (elapsedBeforeAttempt >= maxWallTimeMs) {
      throw new PollTimeoutError<T>(
        "max-wall-time-exceeded",
        lastValue,
        attempt - 1,
        elapsedBeforeAttempt,
        label,
      );
    }

    const result = await fn();
    lastValue = result;

    if (check(result)) {
      return result;
    }

    // Last attempt — don't bother delaying, just exit the loop.
    if (attempt >= maxAttempts) break;

    // Use current delay; grow AFTER sleep.
    const nextDelay = Math.min(delayMs, maxDelayMs);
    if (onAttempt) onAttempt(attempt, nextDelay, result);

    await sleep(nextDelay, signal);

    delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
  }

  throw new PollTimeoutError<T>(
    "max-attempts-exceeded",
    lastValue,
    maxAttempts,
    Date.now() - startedAt,
    label,
  );
}

/**
 * Promise-based sleep that respects AbortSignal.
 * Resolves after ms, or rejects via PollTimeoutError("aborted") on signal.
 * Exported for tests; not generally needed by callers.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PollTimeoutError("aborted", undefined, 0, 0));
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new PollTimeoutError("aborted", undefined, 0, 0));
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}
