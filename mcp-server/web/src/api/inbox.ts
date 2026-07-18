/**
 * PRISM API Client — Document Inbox (DocuRead)
 * Functions for document intake, classification, part matching, and dashboard.
 */
import { fetchJson } from './requestCore';
import { getRequestHeaders } from './client';

const BASE = '/api/v1/inbox';

export interface InboxItem {
  id: string;
  original_name: string;
  document_type: string;
  classification_confidence: number;
  status: string;
  error_message?: string;
  part_numbers: string[];
  matched_part_ids: string[];
  file_id?: string;
  extracted_data: Record<string, unknown>;
  source: { type: string; origin?: string; batch_id?: string };
  tags: string[];
  linked_records: Array<{ type: string; id: string; label: string }>;
  received_at: string;
  classified_at?: string;
  extracted_at?: string;
  matched_at?: string;
  ingested_by?: string;
  notes: string[];
}

export interface InboxStats {
  total_items: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  matched_count: number;
  unmatched_count: number;
  today_count: number;
  this_week_count: number;
  recent_items: InboxItem[];
  top_part_numbers: Array<{ part_number: string; count: number }>;
}

export interface IngestResult {
  inbox_item: InboxItem;
  classification: {
    type: string;
    confidence: number;
    alternatives: Array<{ type: string; confidence: number }>;
  };
  matching: {
    matched: boolean;
    part_numbers_found: string[];
    parts_matched: Array<{ part_number: string; part_id: string; confidence: number }>;
    unmatched_part_numbers: string[];
  };
  file_id?: string;
  processing_time_ms: number;
}

/** Ingest a new document */
export async function inboxIngest(params: {
  content_base64?: string;
  filename: string;
  mime_type?: string;
  type_hint?: string;
  tags?: string[];
  ingested_by?: string;
}): Promise<IngestResult> {
  const res = await fetchJson<{ ok: boolean; data: IngestResult }>(`${BASE}/ingest`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
  });
  return res.data;
}

/** List inbox items with filters */
export async function inboxList(params?: {
  status?: string;
  document_type?: string;
  part_number?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: InboxItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.document_type) query.set('document_type', params.document_type);
  if (params?.part_number) query.set('part_number', params.part_number);
  if (params?.query) query.set('query', params.query);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const qs = query.toString();
  const res = await fetchJson<{ ok: boolean; data: { items: InboxItem[]; total: number } }>(
    `${BASE}/list${qs ? `?${qs}` : ''}`,
    { headers: getRequestHeaders() },
  );
  return res.data;
}

/** Get a single inbox item */
export async function inboxGet(id: string): Promise<InboxItem> {
  const res = await fetchJson<{ ok: boolean; data: { item: InboxItem } }>(`${BASE}/${id}`, {
    headers: getRequestHeaders(),
  });
  return res.data.item;
}

/** Get inbox dashboard stats */
export async function inboxStats(): Promise<InboxStats> {
  const res = await fetchJson<{ ok: boolean; data: InboxStats }>(`${BASE}/stats`, {
    headers: getRequestHeaders(),
  });
  return res.data;
}

/** Search inbox */
export async function inboxSearch(query: string, limit?: number): Promise<InboxItem[]> {
  const params = new URLSearchParams({ q: query });
  if (limit) params.set('limit', String(limit));
  const res = await fetchJson<{ ok: boolean; data: { items: InboxItem[] } }>(
    `${BASE}/search?${params}`,
    { headers: getRequestHeaders() },
  );
  return res.data.items;
}

/** Match an inbox item to a part number */
export async function inboxMatchPart(
  inboxId: string,
  partNumber: string,
  partId?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetchJson<{ ok: boolean; data: { success: boolean; message: string } }>(
    `${BASE}/${inboxId}/match`,
    { method: 'POST', headers: getRequestHeaders(), body: JSON.stringify({ part_number: partNumber, part_id: partId }) },
  );
  return res.data;
}

/** Update inbox item status */
export async function inboxUpdateStatus(
  id: string,
  status: string,
  note?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetchJson<{ ok: boolean; data: { success: boolean; message: string } }>(
    `${BASE}/${id}/status`,
    { method: 'POST', headers: getRequestHeaders(), body: JSON.stringify({ status, note }) },
  );
  return res.data;
}

/** Batch ingest multiple documents */
export async function inboxBatchIngest(
  items: Array<{ content_base64?: string; filename: string; mime_type?: string; tags?: string[] }>,
  ingestedBy?: string,
): Promise<{ results: IngestResult[]; summary: { total: number; classified: number; matched: number; errors: number } }> {
  const res = await fetchJson<{ ok: boolean; data: { results: IngestResult[]; summary: { total: number; classified: number; matched: number; errors: number } } }>(
    `${BASE}/batch`,
    { method: 'POST', headers: getRequestHeaders(), body: JSON.stringify({ items, ingested_by: ingestedBy }) },
  );
  return res.data;
}
