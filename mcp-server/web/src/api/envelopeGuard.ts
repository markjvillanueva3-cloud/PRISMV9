/**
 * Envelope-error guard for PRISM API clients.
 *
 * The HTTP transport (raw `fetch` / `fetchJson`) only treats `!response.ok`
 * as an error. But a `prism_*` dispatcher can return `200 OK` with a body
 * `{ error: "..." }` (a handled failure). Rendering that body as success is the
 * #1 documented regression class in this galaxy -- the "silent-zero"
 * (frontend-app/CLAUDE.md sections 2 + 5: "a 200 OK with error is NOT success").
 *
 * Build-once: any `api/*.ts` client that consumes a `{ result, error }`
 * envelope should route its parsed 2xx payload through `assertNoEnvelopeError`.
 */
import { ApiError } from "./client";

/**
 * Extracts a human error message from a `{ error }` envelope value, or `null`
 * when the value does not represent a real error. Recognized error shapes:
 *  - a non-empty string                       -> the string
 *  - a non-zero finite number (dispatcher code) -> `error code <n>`
 *  - an object with a non-empty string `message` -> that message
 * Everything else (null, empty/whitespace string, 0, NaN, array, boolean,
 * missing) is treated as "not an error" and passes through.
 */
export function envelopeErrorMessage(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof raw === "number") {
    return raw !== 0 && Number.isFinite(raw) ? `error code ${raw}` : null;
  }
  if (typeof raw === "object" && raw !== null && "message" in raw) {
    const message = (raw as { message?: unknown }).message;
    return typeof message === "string" && message.trim().length > 0 ? message.trim() : null;
  }
  return null;
}

/**
 * Throws `ApiError(200)` when `payload` carries a real `{ error }` envelope
 * (the silent-zero guard); otherwise returns `payload` typed as `T`.
 * `endpoint` is prefixed onto the thrown message for traceability.
 */
export function assertNoEnvelopeError<T>(payload: unknown, endpoint: string): T {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = envelopeErrorMessage((payload as { error?: unknown }).error);
    if (message) {
      throw new ApiError(200, `${endpoint}: ${message}`, { kind: "http", retryable: false });
    }
  }
  return payload as T;
}

/**
 * Extracts the human `reason` (+ machine `blocker` code) from a
 * `{ blocked: true, blocker?, reason? }` gate envelope, or `null` when the value
 * is not a blocked gate.
 *
 * A PRISM dispatcher `pre-*-gate` (e.g. the SFC `pre-machine-completeness-gate`,
 * which fires when `sfc_calculate` is called without `machine.spindle.max_rpm` +
 * `.power`) returns this shape at `200 OK` with NO `error` key -- so
 * `assertNoEnvelopeError` passes it straight through. Rendering it as success is
 * the SAME silent-zero regression class (frontend-app/CLAUDE.md s2 + s5), just
 * surfaced via `blocked` instead of `error`: a calc that DID NOT RUN shown to the
 * customer as a blank result panel (no numbers, no error). Verified live on :3100.
 *
 * `blocked` must be strictly `true` (a falsy/absent flag is not a block).
 * @returns `{ message, code }` for a real block, else `null`.
 */
export function blockedEnvelopeMessage(raw: unknown): { message: string; code: string | undefined } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { blocked?: unknown; blocker?: unknown; reason?: unknown };
  if (o.blocked !== true) return null;
  const reason = typeof o.reason === "string" && o.reason.trim().length > 0 ? o.reason.trim() : null;
  const blocker = typeof o.blocker === "string" && o.blocker.trim().length > 0 ? o.blocker.trim() : null;
  return { message: reason ?? "calculation blocked by a safety/completeness gate", code: blocker ?? undefined };
}

/**
 * Throws `ApiError(200)` when `payload` -- or its nested `.result` (the SFC
 * route wraps the dispatcher output as `{ result, safety, meta }`) -- carries a
 * `{ blocked: true }` gate envelope; otherwise returns `payload` typed as `T`.
 *
 * Sibling of `assertNoEnvelopeError`: both convert a "200-OK-that-is-actually-a
 * -failure" into a thrown error so the consuming page's error path lights up
 * instead of rendering blank fields. `endpoint` is prefixed for traceability;
 * the `blocker` string is carried as the ApiError `code` so a page can map a
 * known gate (e.g. `pre-machine-completeness-gate`) to a friendlier prompt.
 */
export function assertNotBlocked<T>(payload: unknown, endpoint: string): T {
  const candidates: unknown[] = [payload];
  if (payload && typeof payload === "object" && "result" in payload) {
    candidates.push((payload as { result?: unknown }).result);
  }
  for (const candidate of candidates) {
    const blocked = blockedEnvelopeMessage(candidate);
    if (blocked) {
      throw new ApiError(200, `${endpoint}: ${blocked.message}`, { kind: "http", retryable: false, code: blocked.code });
    }
  }
  return payload as T;
}
