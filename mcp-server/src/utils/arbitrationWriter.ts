/**
 * arbitrationWriter.ts — TS port of the arbitration-log append protocol.
 *
 * The canonical multi-chat arbitration log lives at
 * `state/shared/AGENT_CONFLICT_ARBITRATION.json`. The P5 helper
 * `.claude/helpers/arbitration-log.mjs` writes it from hook context; this
 * module writes it from MCP / engine context with the same semantics:
 *
 *   - Read the existing JSON if present (or initialize a fresh `{ schemaVersion,
 *     createdAt, events: [] }` envelope).
 *   - Append the new event to `events`, capping retention at MAX_EVENTS.
 *   - Acquire an exclusive `.lock` directory (atomic mkdir on Windows + Unix)
 *     to serialize concurrent appends from peer chats / hooks. Bounded retry
 *     with exponential backoff. Worst case: drop the append rather than
 *     corrupt the log.
 *   - Atomic rename into place (`tmp → final`) so a crash mid-write leaves the
 *     prior good copy untouched.
 *
 * P4-U02, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

import {
  promises as fs,
  mkdirSync,
  rmdirSync,
} from "node:fs";
import { dirname, join } from "node:path";

const SCHEMA_VERSION = "1.0.0";
const MAX_EVENTS_RETAINED = 5_000;
const LOCK_RETRY_MAX = 8;
const LOCK_RETRY_BASE_MS = 5;

const KNOWN_KINDS = new Set([
  "auto-fork",
  "lane-block",
  "directive-warn",
  "consensus-dissent",
]);

const FALLBACK_LOG_PATH = "H:/prism/state/shared/AGENT_CONFLICT_ARBITRATION.json";

/**
 * Resolve the arbitration log path at CALL time. The env var
 * PRISM_ARBITRATION_LOG_PATH lets tests redirect to a tmpdir per case;
 * capturing it at module load would freeze the path before tests get a
 * chance to set it.
 */
function resolveLogPath(): string {
  const env = process.env.PRISM_ARBITRATION_LOG_PATH;
  return env && env.length > 0 ? env : FALLBACK_LOG_PATH;
}

export interface ArbitrationEventInput {
  kind: string;
  sessionId?: string;
  pcName?: string;
  details?: Record<string, unknown>;
}

export interface ArbitrationEvent {
  ts: string;
  kind: string;
  sessionId: string;
  pcName: string;
  details: Record<string, unknown>;
}

interface LogEnvelope {
  schemaVersion: string;
  createdAt: string;
  events: ArbitrationEvent[];
}

export interface AppendOptions {
  logPath?: string;
}

/**
 * Append an event to the arbitration log. Throws on persistent lock failure
 * after retries exhaust — caller decides whether to surface or swallow.
 */
export async function appendArbitrationEvent(
  input: ArbitrationEventInput,
  opts: AppendOptions = {}
): Promise<void> {
  if (!input || typeof input !== "object") {
    throw new Error("arbitrationWriter: input must be an object");
  }
  if (typeof input.kind !== "string" || input.kind.length === 0) {
    throw new Error("arbitrationWriter: kind must be a non-empty string");
  }
  if (!KNOWN_KINDS.has(input.kind)) {
    throw new Error(`arbitrationWriter: unknown kind '${input.kind}'`);
  }

  const logPath = opts.logPath ?? resolveLogPath();
  const lockDir = `${logPath}.lock`;

  const event: ArbitrationEvent = {
    ts: new Date().toISOString(),
    kind: input.kind,
    sessionId: input.sessionId ?? "unknown",
    pcName: input.pcName ?? process.env.COMPUTERNAME ?? "unknown",
    details: input.details ?? {},
  };

  await fs.mkdir(dirname(logPath), { recursive: true });
  await withLock(lockDir, async () => {
    const env = await readEnvelope(logPath);
    env.events.push(event);
    if (env.events.length > MAX_EVENTS_RETAINED) {
      env.events.splice(0, env.events.length - MAX_EVENTS_RETAINED);
    }
    await writeAtomic(logPath, env);
  });
}

/** Initialize the log file if it does not exist. Idempotent. */
export async function ensureArbitrationLog(opts: AppendOptions = {}): Promise<void> {
  const logPath = opts.logPath ?? resolveLogPath();
  await fs.mkdir(dirname(logPath), { recursive: true });
  try {
    await fs.access(logPath);
  } catch {
    const empty: LogEnvelope = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      events: [],
    };
    await writeAtomic(logPath, empty);
  }
}

/** Read all events from the log. Returns [] if the log does not exist. */
export async function readArbitrationEvents(
  opts: AppendOptions = {}
): Promise<ArbitrationEvent[]> {
  const logPath = opts.logPath ?? resolveLogPath();
  const env = await readEnvelope(logPath);
  return env.events;
}

// ─────────────────────────────────────────────────────────────────
// internals
// ─────────────────────────────────────────────────────────────────

async function readEnvelope(logPath: string): Promise<LogEnvelope> {
  try {
    const raw = await fs.readFile(logPath, "utf8");
    if (!raw.trim()) return freshEnvelope();
    const parsed = JSON.parse(raw) as Partial<LogEnvelope>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.events)) {
      return freshEnvelope();
    }
    return {
      schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      events: parsed.events as ArbitrationEvent[],
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return freshEnvelope();
    throw err;
  }
}

function freshEnvelope(): LogEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    events: [],
  };
}

async function writeAtomic(logPath: string, env: LogEnvelope): Promise<void> {
  const tmp = `${logPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(env, null, 2), "utf8");
  await fs.rename(tmp, logPath);
}

async function withLock<T>(lockDir: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < LOCK_RETRY_MAX; attempt += 1) {
    try {
      mkdirSync(lockDir);
      try {
        return await fn();
      } finally {
        try {
          rmdirSync(lockDir);
        } catch {
          // The lock dir vanishing mid-operation only matters for cleanup; the
          // critical-section guarantee was provided by the original mkdir.
        }
      }
    } catch (err) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      const delay = LOCK_RETRY_BASE_MS * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(
    `arbitrationWriter: could not acquire lock at ${lockDir} after ${LOCK_RETRY_MAX} attempts`
    + (lastErr instanceof Error ? `: ${lastErr.message}` : "")
  );
}

// Internal helper to bind both default and supplied paths in tests.
export function arbitrationDefaultLogPath(): string {
  return resolveLogPath();
}

export function arbitrationLockPath(logPath?: string): string {
  return `${logPath ?? resolveLogPath()}.lock`;
}

// `join` is exported indirectly via the path resolution — keep the import in
// use even when callers do not need it directly.
void join;
