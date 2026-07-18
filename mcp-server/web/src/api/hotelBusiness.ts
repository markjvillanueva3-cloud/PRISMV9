/**
 * PRISM Hotel-Business API Client (hotel iter10, 2026-05-27, frontend G11+G12)
 *
 * Thin REST wrapper over the `prism_business` MCP dispatcher's hotel actions.
 * Mirror of `employeePortal.ts` pattern — single `{action, params}` envelope.
 *
 * Endpoint mounts via mcp-server/src/routes/* (see follow-up: U-PORTAL-BUSINESS-ROUTE).
 */

import { getStoredAuthToken } from './authToken';

const API_BASE = '/api/v1/business';

export class HotelBusinessApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HotelBusinessApiError';
  }
}

async function callAction<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const token = getStoredAuthToken();
  const res = await fetch(`${API_BASE}/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new HotelBusinessApiError(res.status, text);
  }
  return (await res.json()) as T;
}

// ─── G11: Training-progress (Academy specialist ladder) ──────────────────────
export interface DomainPathReport {
  employee_id: string;
  domain: string;
  current_tier: string | null;
  next_tier: string | null;
  required_to_assign: ReadonlyArray<string>;
  growth_suggestions: ReadonlyArray<string>;
  passed_courses: ReadonlyArray<string>;
  qualification_cpk_required: number;
  promotion_eligible: boolean;
  rationale: ReadonlyArray<string>;
}

export const domainAcademyReportPath = (p: { employee_id: string; domain: string }) =>
  callAction<{ success: boolean; data: DomainPathReport }>('domain_academy_report_path', p);

export const domainAcademyListDomains = () =>
  callAction<{ success: boolean; data: { domains: ReadonlyArray<string>; tiers: ReadonlyArray<string> } }>('domain_academy_list_domains');

export const domainAcademyListAssignments = (p: { employee_id?: string; domain?: string; status?: string }) =>
  callAction<{ success: boolean; data: ReadonlyArray<{ id: string; domain: string; tier: string; course_id: string; status: string; assigned_at: string; completed_at?: string }> }>('domain_academy_list_assignments', p);

// ─── G12: Handoff inbox (accept/deny) ────────────────────────────────────────
export interface HandoffRequest {
  id: string;
  requester_employee_id: string;
  counterparty_employee_id: string;
  task: {
    task_id: string;
    task_kind: string;
    machine_serial: string;
    label?: string;
    remaining_minutes?: number;
  };
  status: string;
  requester_rank: string;
  counterparty_rank: string;
  bypassed_manager: boolean;
  reason?: string;
  created_at: string;
}

export const handoffList = (p: { employee_id?: string; status?: string }) =>
  callAction<{ success: boolean; data: ReadonlyArray<HandoffRequest> }>('handoff_list', p);

export const handoffCounterpartyRespond = (p: {
  handoff_id: string;
  responder_employee_id: string;
  accept: boolean;
  reason?: string;
  lean_waste_observed?: 'defect' | 'overproduction' | 'waiting' | 'non_utilized_talent' | 'transportation' | 'inventory' | 'motion' | 'extra_processing';
}) =>
  callAction<{ success: boolean; data: HandoffRequest }>('handoff_counterparty_respond', p);

export const handoffStalled = (p: { stall_threshold_minutes: number }) =>
  callAction<{ success: boolean; data: ReadonlyArray<{ handoff_id: string; age_minutes: number; task_id: string }> }>('handoff_stalled', p);
