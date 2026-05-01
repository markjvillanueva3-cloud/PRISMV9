import { ApiError, fetchJson, getRequestHeaders } from './client';

const API_BASE = '/api/v1/portal';

export type PortalTokenType = 'quote' | 'order';
export type PortalScope = 'view' | 'respond' | 'documents' | 'messages';
export type PortalServiceCaseSeverity = 'low' | 'normal' | 'high' | 'critical';
export type PortalServiceCaseStatus = 'open' | 'waiting_on_shop' | 'waiting_on_customer' | 'escalated' | 'resolved';

export interface PortalTokenRecord {
  id: string;
  token: string;
  token_type: PortalTokenType;
  entity_id: string;
  customer_id?: string;
  scope: PortalScope[];
  expires_at: string;
  revoked: boolean;
  last_accessed?: string;
  access_count: number;
  rate_limit: number;
  created_by?: string;
  created_at: string;
}

export interface PortalQuoteViewRecord {
  quote_id: string;
  status: string;
  revision_number: number;
  unit_price_usd: number;
  total_price_usd: number;
  quantity: number;
  quantity_breaks: Array<{ quantity: number; unit_price: number; total_price: number }>;
  lead_time_options: Array<{ tier: string; days: number; unit_price: number }>;
  dfm_score?: number;
  dfm_issues: Array<{ severity: string; message: string }>;
  expires_at?: string;
}

export interface PortalOrderStatusRecord {
  job_id: string;
  part_number: string;
  part_name?: string;
  quantity: number;
  status: string;
  current_milestone: string | null;
  progress_pct: number;
  estimated_delivery?: string;
  milestones: Array<{
    key: string;
    label: string;
    status: string;
    completed_at?: string;
  }>;
}

export interface PortalMessageRecord {
  id: string;
  entity_type: PortalTokenType;
  entity_id: string;
  sender_type: 'customer' | 'shop';
  sender_name: string;
  message: string;
  read_at?: string;
  created_at: string;
}

export interface PortalQualityDocumentRecord {
  id: string;
  job_id: string;
  doc_type: 'fai_as9102' | 'material_cert' | 'coc' | 'inspection_report' | 'ndt_report';
  title: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PortalTimelineRecord {
  job_id: string;
  current_milestone: string | null;
  total_milestones?: number;
  milestones?: Array<{
    key: string;
    label: string;
    status: string;
    completed_at?: string;
    skipped_at?: string;
  }>;
}

export interface PortalServiceCaseRecord {
  id: string;
  entity_type: PortalTokenType;
  entity_id: string;
  customer_id?: string;
  subject: string;
  summary: string;
  severity: PortalServiceCaseSeverity;
  status: PortalServiceCaseStatus;
  owner?: string;
  sla_target_at: string;
  escalation_level: number;
  satisfaction_score?: number;
  opened_at: string;
  updated_at: string;
  resolved_at?: string;
}

type PortalEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: string | { message?: string };
};

type PortalRequestOptions = {
  requiresAuthorization?: boolean;
};

async function requestPortalApi<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
  options: PortalRequestOptions = {},
): Promise<T> {
  const headers = getRequestHeaders();
  if (options.requiresAuthorization && !headers.Authorization) {
    throw new ApiError(401, 'PRISM rejected this request because the current session is not authorized.', {
      kind: 'auth',
      hint: 'Attach a PRISM bearer session before using internal portal operations.',
    });
  }

  const payload = await fetchJson<PortalEnvelope<T>>(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    fallbackMessage: 'Customer portal request failed',
  });

  if (!payload?.ok || payload.data === undefined) {
    const errorMessage =
      typeof payload?.error === 'string'
        ? payload.error
        : payload?.error?.message || 'Customer portal request failed';
    throw new ApiError(500, errorMessage);
  }

  return payload.data;
}

export async function createPortalToken(params: {
  token_type: PortalTokenType;
  entity_id: string;
  customer_id?: string;
  scope?: PortalScope[];
  expires_in_days?: number;
  rate_limit?: number;
}) {
  return requestPortalApi<PortalTokenRecord>('POST', '/tokens', params, { requiresAuthorization: true });
}

export async function revokePortalToken(token: string) {
  return requestPortalApi<{ revoked: boolean }>('DELETE', `/tokens/${encodeURIComponent(token)}`, undefined, {
    requiresAuthorization: true,
  });
}

export async function listPortalTokens(entityId: string) {
  return requestPortalApi<PortalTokenRecord[]>('GET', `/tokens/${encodeURIComponent(entityId)}`, undefined, {
    requiresAuthorization: true,
  });
}

export async function getPortalQuoteView(token: string) {
  return requestPortalApi<PortalQuoteViewRecord>('GET', `/quote/${encodeURIComponent(token)}`);
}

export async function getPortalOrderStatus(token: string) {
  return requestPortalApi<PortalOrderStatusRecord>('GET', `/order/${encodeURIComponent(token)}`);
}

export async function listPortalOrderDocuments(token: string) {
  return requestPortalApi<PortalQualityDocumentRecord[]>('GET', `/order/${encodeURIComponent(token)}/documents`);
}

export async function listPortalOrderMessages(token: string, limit = 12) {
  return requestPortalApi<PortalMessageRecord[]>('GET', `/order/${encodeURIComponent(token)}/messages?limit=${encodeURIComponent(String(limit))}`);
}

export async function createPortalMilestoneTimeline(params: {
  job_id: string;
  quote_id?: string;
  customer_id?: string;
  start_at_milestone?: string;
}) {
  return requestPortalApi<PortalTimelineRecord>('POST', '/milestones', params, { requiresAuthorization: true });
}

export async function getPortalMilestoneTimeline(jobId: string) {
  return requestPortalApi<PortalTimelineRecord>('GET', `/milestones/${encodeURIComponent(jobId)}`, undefined, {
    requiresAuthorization: true,
  });
}

export async function advancePortalMilestone(jobId: string, params: {
  milestone_key?: string;
  notes?: string;
  advanced_by?: string;
}) {
  return requestPortalApi<PortalTimelineRecord>('POST', `/milestones/${encodeURIComponent(jobId)}/advance`, params, {
    requiresAuthorization: true,
  });
}

export async function addPortalQualityDocument(params: {
  job_id: string;
  doc_type: PortalQualityDocumentRecord['doc_type'];
  title: string;
  status?: PortalQualityDocumentRecord['status'];
  notes?: string;
}) {
  return requestPortalApi<PortalQualityDocumentRecord>('POST', '/quality-docs', params, { requiresAuthorization: true });
}

export async function listPortalQualityDocuments(jobId: string) {
  return requestPortalApi<PortalQualityDocumentRecord[]>('GET', `/quality-docs/${encodeURIComponent(jobId)}`, undefined, {
    requiresAuthorization: true,
  });
}

export async function listPortalServiceCases(entityType: PortalTokenType, entityId: string) {
  return requestPortalApi<PortalServiceCaseRecord[]>(
    'GET',
    `/service-cases/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    undefined,
    { requiresAuthorization: true },
  );
}

export async function createPortalServiceCase(params: {
  entity_type: PortalTokenType;
  entity_id: string;
  customer_id?: string;
  subject: string;
  summary: string;
  severity?: PortalServiceCaseSeverity;
  owner?: string;
  sla_hours?: number;
}) {
  return requestPortalApi<PortalServiceCaseRecord>('POST', '/service-cases', params, { requiresAuthorization: true });
}

export async function updatePortalServiceCase(caseId: string, params: {
  status?: PortalServiceCaseStatus;
  owner?: string;
  escalate?: boolean;
  satisfaction_score?: number;
}) {
  return requestPortalApi<PortalServiceCaseRecord>('POST', `/service-cases/${encodeURIComponent(caseId)}/update`, params, {
    requiresAuthorization: true,
  });
}
