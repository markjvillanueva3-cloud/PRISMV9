---
name: prism-error-recovery-strategies
description: Three recovery patterns for PRISM failures — retry with exponential backoff for transient errors, circuit breaker for cascading failures, fallback values for non-critical defaults
---
# Error Recovery Strategies

## When To Use
- After catching a NETWORK category error that should be retried
- When a service is failing repeatedly and you need to stop hammering it
- When a non-critical value fails to load and you need a safe default
- "How do I implement retry?" / "Service keeps timing out" / "Need a fallback"
- NOT for: deciding which error category to use (use prism-error-taxonomy)
- NOT for: safety errors (those BLOCK, never retry or degrade — no recovery, full stop)

## How To Use
Three strategies, each for a different failure mode:

**1. RETRY WITH EXPONENTIAL BACKOFF** — for transient failures (timeouts, 429s, 503s)
  Use `withRetry()` wrapper around the failing operation:
  ```typescript
  const result = await withRetry(
    () => externalService.fetch(id),
    { maxAttempts: 3, initialDelayMs: 200, maxDelayMs: 5000, backoffMultiplier: 2 }
  );
  ```
  Config defaults: 3 attempts, 200ms initial delay, 2x backoff, 5s max delay
  Retryable errors: NETWORK_ERROR, TIMEOUT, SERVICE_UNAVAILABLE
  Non-retryable (throws immediately): VALIDATION, SAFETY, CALCULATION, CONFIGURATION
  Delay sequence: 200ms → 400ms → 800ms (capped at maxDelayMs)
  Always wrap in `apiCallWithTimeout()` from src/utils/apiTimeout.ts first

**2. CIRCUIT BREAKER** — for cascading failures (service down, repeated timeouts)
  Wraps a service call. Three states:
  - CLOSED: normal, requests pass through. Tracks consecutive failures.
  - OPEN: after 5 failures, rejects all requests instantly for 30s (no hammering)
  - HALF_OPEN: after timeout, allows 1 test request. 3 successes → CLOSED. 1 failure → OPEN.
  ```typescript
  const breaker = new CircuitBreaker(5, 30000, 3);  // 5 failures, 30s timeout, 3 to recover
  const material = await breaker.execute(() => materialService.fetch(id));
  ```
  Create ONE breaker per external service (not per request).
  Check state: `breaker.getState()` — if OPEN, skip the call entirely and use fallback.

**3. FALLBACK VALUES** — for non-critical defaults when primary source fails
  Use `withFallback()` for values where a reasonable default exists:
  ```typescript
  const feedMultiplier = withFallback(
    () => material.getFeedMultiplier(),
    { fallbackValue: 1.0, logFallback: true, notifySeverity: 'warn' }
  );
  ```
  CRITICAL RULE: Never use fallbacks for safety-critical values.
  Safe for fallback: display preferences, non-critical multipliers, UI defaults, cache misses
  NEVER fallback: S(x) scores, cutting forces, spindle limits, tool life predictions
  Always log when fallback activates — silent fallbacks hide real problems.

**Decision tree: which strategy?**
  Error is NETWORK/TIMEOUT → try RETRY first
  Retry exhausted → CIRCUIT BREAKER opens
  Breaker is OPEN → use FALLBACK (if non-critical) or BLOCK (if safety-relevant)
  Error is VALIDATION/SAFETY → no recovery, reject/block immediately

## What It Returns
- Retry: the successful result after N attempts, or throws after max attempts exhausted
- Circuit breaker: the result if circuit closed/half-open, or instant rejection if open
- Fallback: the primary value if available, or the fallback value with a warning log
- Combined: a resilient call chain that degrades gracefully instead of crashing
- Never returns: unsafe values — safety errors bypass all recovery and block

## Examples
- Input: "prism_data material_get for '4140' timed out on first attempt"
  Strategy: RETRY — transient network issue
  Sequence: attempt 1 fails (timeout) → wait 200ms → attempt 2 succeeds → return material
  If all 3 fail: circuit breaker records failure #N. If N≥5 → breaker opens for 30s.

- Input: "External material service has been down for 2 minutes, 15 requests have failed"
  Strategy: CIRCUIT BREAKER is already OPEN (5+ consecutive failures)
  Behavior: instant rejection for next 30s — no HTTP calls made, no timeout waiting
  After 30s: HALF_OPEN → allows 1 test request → if succeeds 3 times → CLOSED

- Edge case: "Feed rate multiplier lookup failed for an exotic alloy not in the database"
  Strategy: FALLBACK — feed multiplier is non-critical, safe default is 1.0
  Result: `feedMultiplier = 1.0` (conservative default), warning logged
  Why not retry: it's a DATABASE miss, not a NETWORK error — retrying won't help
  Why not block: feed multiplier affects efficiency, not safety — 1.0 is conservative/safe
  If this were a safety value (e.g., max spindle RPM): NO fallback, BLOCK immediately
SOURCE: Split from prism-error-handling-patterns (28.7KB)
RELATED: prism-error-taxonomy
