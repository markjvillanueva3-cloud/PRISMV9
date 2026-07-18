/**
 * ZuluDashboardControlEngine — HZD-05 (HZP-DASH-MS0)
 *
 * MCP-callable wrapper around the hzp-dash-control HTTP server (:8767).
 * Lets zulu-the-agent issue fleet-control operations via `prism_session:
 * zulu_control_*` actions instead of the dashboard's POST form.
 *
 * The HTTP server enforces governor + audit; this engine is a thin client.
 * If the control server is down (process crashed, /compact in progress),
 * methods return { ok: false, error: "control-server-unreachable" } —
 * never throws on the network path. R12 fail-soft.
 *
 * Direct loopback URL — never reach off-host.
 */
import { z } from "zod";

const CONTROL_BASE = process.env.PRISM_HZP_DASH_CONTROL_URL || "http://127.0.0.1:8767";
const REQUEST_TIMEOUT_MS = 5000;

export const AssignReqSchema = z.object({
  slot: z.string().min(1),
  task_id: z.string().optional(),
  task_text: z.string().min(1),
  actor: z.string().min(1).default("zulu"),
});
export const VetoReqSchema = z.object({
  slot: z.string().min(1),
  task_id: z.string().min(1),
  reason: z.string().min(1),
  actor: z.string().min(1).default("zulu"),
});
export const PromoteRefuseReqSchema = z.object({
  slot: z.string().min(1),
  rule: z.string().min(1),
  actor: z.string().min(1).default("zulu"),
});
export const AdoptDoctrineReqSchema = z.object({
  draft_markdown: z.string().min(1),
  actor: z.string().min(1).default("zulu"),
});
export const EscalateReqSchema = z.object({
  task_id: z.string().min(1),
  task_text: z.string().optional(),
  failure_reason: z.string().min(1),
  attempts_so_far: z.number().int().min(1).optional(),
  actor: z.string().min(1).default("zulu"),
});
export const BusSendReqSchema = z.object({
  from: z.string().min(1),
  to: z.string().optional(),
  message: z.string().min(1),
  kind: z.string().min(1).default("msg"),
  actor: z.string().min(1).default("zulu"),
});

export interface ControlResult {
  ok: boolean;
  audit_id?: string;
  reason?: string;
  error?: string;
  http_status?: number;
}

async function postJson(routePath: string, body: unknown): Promise<ControlResult> {
  const url = `${CONTROL_BASE}${routePath}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "http://127.0.0.1:8765" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await r.text();
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text) as Record<string, unknown>; } catch { /* keep empty */ }
    return { http_status: r.status, ...parsed } as ControlResult;
  } catch (err) {
    const msg = (err as Error)?.message || String(err);
    return { ok: false, error: `control-server-unreachable:${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(routePath: string): Promise<ControlResult & { body?: unknown }> {
  const url = `${CONTROL_BASE}${routePath}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: "GET", signal: ctl.signal });
    const text = await r.text();
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text) as Record<string, unknown>; } catch { /* keep empty */ }
    return { ok: r.ok, http_status: r.status, body: parsed } as ControlResult & { body?: unknown };
  } catch (err) {
    const msg = (err as Error)?.message || String(err);
    return { ok: false, error: `control-server-unreachable:${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

export class ZuluDashboardControlEngine {
  static async assign(req: z.input<typeof AssignReqSchema>): Promise<ControlResult> {
    return postJson("/api/fleet/assign", AssignReqSchema.parse(req));
  }
  static async veto(req: z.input<typeof VetoReqSchema>): Promise<ControlResult> {
    return postJson("/api/fleet/veto", VetoReqSchema.parse(req));
  }
  static async promoteRefuse(req: z.input<typeof PromoteRefuseReqSchema>): Promise<ControlResult> {
    return postJson("/api/fleet/promote-refuse", PromoteRefuseReqSchema.parse(req));
  }
  static async adoptDoctrine(req: z.input<typeof AdoptDoctrineReqSchema>): Promise<ControlResult> {
    return postJson("/api/fleet/adopt-doctrine", AdoptDoctrineReqSchema.parse(req));
  }
  static async escalate(req: z.input<typeof EscalateReqSchema>): Promise<ControlResult> {
    return postJson("/api/fleet/escalate", EscalateReqSchema.parse(req));
  }
  static async busSend(req: z.input<typeof BusSendReqSchema>): Promise<ControlResult> {
    return postJson("/api/fleet/bus-send", BusSendReqSchema.parse(req));
  }
  static async state(): Promise<ControlResult & { body?: unknown }> {
    return getJson("/api/state");
  }
  static async auditTail(): Promise<ControlResult & { body?: unknown }> {
    return getJson("/api/audit/tail");
  }
}
