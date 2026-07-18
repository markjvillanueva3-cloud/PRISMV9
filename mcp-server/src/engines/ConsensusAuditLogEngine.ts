/**
 * ConsensusAuditLogEngine — provenance audit log for MultiModelConsensusEngine.
 *
 * Per INFRA-CONSENSUS-WIRE-MS0/P0-U04: every consensus call appends one JSONL
 * line to mcp-server/data/state/consensus-decisions.jsonl. Distinct from
 * ConsensusObsidianPersistenceEngine (which writes narrative wiki memory) —
 * this is a flat, append-only debugging/replay log keyed by callerEngine.
 *
 * Contract (load-bearing):
 *   - append() is fire-and-forget. NEVER throws to caller. A persistence
 *     failure must not break consensus delivery.
 *   - Rotation at 100MB: when file would cross threshold, rename to
 *     ${path}.${ts}.rotated.jsonl and start a fresh file.
 *   - Kill switch: PRISM_CONSENSUS_AUDIT_DISABLE=1 makes append a no-op.
 *
 * @milestone INFRA-CONSENSUS-WIRE-MS0
 * @unit P0-U04
 */
import { mkdirSync, statSync, existsSync, appendFileSync, renameSync, readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { z } from "zod";

export const CONSENSUS_AUDIT_SCHEMA_VERSION = "1.0.0";

/** Threshold in bytes at which the active log rotates. 100 MB per envelope. */
export const ROTATION_THRESHOLD_BYTES = 100 * 1024 * 1024;

/**
 * Resolve the effective rotation threshold. Tests can override via
 * PRISM_CONSENSUS_AUDIT_ROTATION_BYTES so rotation paths can be exercised
 * without writing 100MB of filler.
 */
function effectiveRotationThreshold(): number {
  const raw = process.env.PRISM_CONSENSUS_AUDIT_ROTATION_BYTES;
  if (typeof raw === "string" && raw.length > 0) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return ROTATION_THRESHOLD_BYTES;
}

/**
 * Resolve the active audit log path. Anchored on PRISM_ROOT when set, else
 * resolves against process.cwd(). Tests inject PRISM_CONSENSUS_AUDIT_PATH to
 * pin the file to a tmpdir.
 */
export function resolveAuditLogPath(): string {
  const override = process.env.PRISM_CONSENSUS_AUDIT_PATH;
  if (typeof override === "string" && override.length > 0) return override;
  const root = process.env.PRISM_ROOT ?? process.cwd();
  return resolvePath(root, "mcp-server/data/state/consensus-decisions.jsonl");
}

export interface PerVoiceAuditEntry {
  model: string;
  ok: boolean;
  answer: string;
  latencyMs: number;
  tokens: number | null;
}

export interface ConsensusAuditRecord {
  schemaVersion: typeof CONSENSUS_AUDIT_SCHEMA_VERSION;
  ts: string;                            // ISO 8601
  callerEngine: string;                  // e.g. "MillingAGIMasterEngine"; "unknown" when caller did not tag
  question: string;                      // input.prompt verbatim
  voices: string[];                      // model names that fanned out (e.g. ["claude", "gpt-5.5", "deepseek-r1:14b"])
  perVoiceAnswers: PerVoiceAuditEntry[]; // one entry per voice, ok and !ok
  finalDecision: string;                 // consensus.answer or "" when no consensus
  agreement: number;                     // 0..1
  latencyMsTotal: number;
  tokensTotal: number;                   // sum across voices; null voices contribute 0
  sessionId?: string;                    // sourceSession passthrough
}

/** Zod schema for read() input — exported so the dispatcher can reuse it. */
export const consensusAuditQueryParamsSchema = z
  .object({
    limit: z.number().int().positive().max(1000).optional(),
    sinceMs: z.number().int().nonnegative().optional(),
    callerEngine: z.string().optional(),
  })
  .optional();

export type ConsensusAuditQueryParams = z.infer<typeof consensusAuditQueryParamsSchema>;

const DEFAULT_READ_LIMIT = 50;

export class ConsensusAuditLogEngine {
  /**
   * Append one record to the audit log. Fire-and-forget — never throws.
   *
   * Rotation: if the file would cross ROTATION_THRESHOLD_BYTES on this write,
   * the active file is renamed first and a fresh file begins. Estimate uses
   * statSync of the current file (cheap) — the threshold is approximate, not
   * exact, by design.
   *
   * @param record Audit record to persist. schemaVersion enforced.
   */
  static append(record: ConsensusAuditRecord): void {
    if (process.env.PRISM_CONSENSUS_AUDIT_DISABLE === "1") return;
    try {
      // Normalize non-finite numerics so JSON.stringify produces valid JSON
      // for downstream parsers. Math.fround(NaN) is still NaN — we explicitly
      // coerce. JSON.stringify writes "null" for NaN/Infinity, but doing it
      // ourselves makes the audit shape predictable.
      const safe: ConsensusAuditRecord = {
        ...record,
        schemaVersion: CONSENSUS_AUDIT_SCHEMA_VERSION,
        agreement: Number.isFinite(record.agreement) ? record.agreement : 0,
        latencyMsTotal: Number.isFinite(record.latencyMsTotal) ? record.latencyMsTotal : 0,
        tokensTotal: Number.isFinite(record.tokensTotal) ? record.tokensTotal : 0,
      };
      const line = JSON.stringify(safe) + "\n";
      const path = resolveAuditLogPath();
      const dir = dirname(path);
      mkdirSync(dir, { recursive: true });
      // Rotation check — done BEFORE the write so the new line lands in a
      // fresh file when the threshold is crossed.
      if (existsSync(path)) {
        try {
          const sz = statSync(path).size;
          if (sz + line.length > effectiveRotationThreshold()) {
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            const rotated = `${path}.${stamp}.rotated.jsonl`;
            renameSync(path, rotated);
          }
        } catch {
          // statSync / renameSync failure must not break append; fall through
          // to appendFileSync which will create the file if missing.
        }
      }
      appendFileSync(path, line, { encoding: "utf-8" });
    } catch {
      // Fire-and-forget contract: NEVER throw. A persistence failure must not
      // break consensus delivery.
    }
  }

  /**
   * Read recent records from the audit log, newest-first.
   *
   * @param opts.limit       Max records to return. Default 50, max 1000.
   * @param opts.sinceMs     Earliest record timestamp in epoch-ms. Older records skipped.
   * @param opts.callerEngine Filter to a single callerEngine.
   * @returns Parsed records (newest first). Empty array on missing file or all-malformed lines.
   */
  static read(opts?: ConsensusAuditQueryParams): ConsensusAuditRecord[] {
    consensusAuditQueryParamsSchema.parse(opts);
    const limit = Math.min(opts?.limit ?? DEFAULT_READ_LIMIT, 1000);
    const sinceMs = opts?.sinceMs;
    const callerFilter = opts?.callerEngine;
    const path = resolveAuditLogPath();
    if (!existsSync(path)) return [];

    let raw: string;
    try {
      raw = readFileSync(path, "utf-8");
    } catch {
      return [];
    }

    const lines = raw.split("\n");
    const out: ConsensusAuditRecord[] = [];
    // Iterate bottom-up so we hit limit quickly without parsing the whole file.
    for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
      const line = lines[i];
      if (line.length === 0) continue;
      let rec: ConsensusAuditRecord;
      try {
        rec = JSON.parse(line) as ConsensusAuditRecord;
      } catch {
        // Malformed line — skip silently. R12 honest: if we crashed on every
        // bad line, an audit-log corruption would cascade into a read failure.
        continue;
      }
      if (callerFilter !== undefined && rec.callerEngine !== callerFilter) continue;
      if (sinceMs !== undefined) {
        const recMs = Date.parse(rec.ts);
        if (Number.isFinite(recMs) && recMs < sinceMs) continue;
      }
      out.push(rec);
    }
    return out;
  }
}

export const consensusAuditLogEngine = ConsensusAuditLogEngine;
