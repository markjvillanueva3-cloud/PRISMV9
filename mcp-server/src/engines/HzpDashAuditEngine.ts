/**
 * HzpDashAuditEngine — HZD-03 (HZP-DASH-MS0)
 *
 * Pure-core audit-envelope builder. Every state-changing call through the
 * dashboard control server (or the MCP wrapper) produces an audit envelope
 * that the server appends to `state/shared/hzp-dash-audit.jsonl`. This
 * engine is pure: it builds + validates envelopes but never writes to disk.
 *
 * The envelope shape is intentionally narrow (12 fields max) so the JSONL
 * stays grep-friendly and parser-cheap. `audit_id` is a deterministic
 * base36-timestamp + 6-hex random — enough to disambiguate without crypto.
 */
import { z } from "zod";

export const AuditEnvelopeRequestSchema = z.object({
  operation: z.enum(["assign", "veto", "promote-refuse", "adopt-doctrine", "escalate", "bus-send"]),
  actor: z.string().min(1),              // who initiated — slot name OR "operator"
  target_slot: z.string().optional(),    // what slot the op acts on (assign/veto/promote-refuse)
  task_id: z.string().optional(),
  task_text: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  authorized: z.boolean(),
  authority_reason: z.string(),
  ts_iso: z.string().optional(),         // override for deterministic tests
});
export type AuditEnvelopeRequest = z.infer<typeof AuditEnvelopeRequestSchema>;

export interface AuditEnvelope {
  audit_id: string;
  ts: string;
  operation: AuditEnvelopeRequest["operation"];
  actor: string;
  target_slot: string | null;
  task_id: string | null;
  task_text: string | null;
  payload: Record<string, unknown> | null;
  authorized: boolean;
  authority_reason: string;
  schema_version: "hzp-dash-audit-1.0.0";
}

function mintAuditId(now: Date, randHex6?: string): string {
  const t36 = now.getTime().toString(36);
  const rand = randHex6 ?? Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return `hzpd-${t36}-${rand}`;
}

export class HzpDashAuditEngine {
  /** Build a validated audit envelope. Pure — does not write. */
  static build(req: AuditEnvelopeRequest, randHex6?: string): AuditEnvelope {
    const parsed = AuditEnvelopeRequestSchema.parse(req);
    const now = parsed.ts_iso ? new Date(parsed.ts_iso) : new Date();
    if (Number.isNaN(now.getTime())) {
      throw new Error(`HzpDashAuditEngine: invalid ts_iso ${parsed.ts_iso}`);
    }
    return {
      audit_id: mintAuditId(now, randHex6),
      ts: now.toISOString(),
      operation: parsed.operation,
      actor: parsed.actor,
      target_slot: parsed.target_slot ?? null,
      task_id: parsed.task_id ?? null,
      task_text: parsed.task_text ?? null,
      payload: parsed.payload ?? null,
      authorized: parsed.authorized,
      authority_reason: parsed.authority_reason,
      schema_version: "hzp-dash-audit-1.0.0",
    };
  }

  /** Serialize as one JSONL line (no trailing newline — caller adds). */
  static toJsonl(env: AuditEnvelope): string {
    return JSON.stringify(env);
  }

  /** Render a 1-line human view: `[OP] actor → slot [✓/✗] reason`. */
  static renderLine(env: AuditEnvelope): string {
    const ok = env.authorized ? "✓" : "✗";
    const tgt = env.target_slot ? `→${env.target_slot}` : "";
    return `[${env.operation}] ${env.actor}${tgt} [${ok}] ${env.authority_reason}`;
  }
}
