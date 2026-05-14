import { ApiError, getRequestHeaders } from './client';

const API_BASE = '/api/v1';

export interface PartSummaryRecord {
  id: string;
  part_number: string;
  name: string;
  description?: string;
  material_name?: string;
  current_revision?: string;
  tags?: string[];
  status?: string;
}

export interface PartRevisionRecord {
  id: string;
  revision: string;
  change_description: string;
  created_at?: string;
  created_by?: string;
  cad_file_id?: string;
  drawing_file_id?: string;
}

export interface PartDetailRecord {
  part: PartSummaryRecord;
  revisions: PartRevisionRecord[];
}

export interface PartsSearchResult {
  parts: PartSummaryRecord[];
  total: number;
}

export interface UploadedFileRecord {
  file_id: string;
  version: number;
  sha256: string;
  size_bytes: number;
  deduplicated: boolean;
  storage_backend: string;
  mime_type: string;
  original_name: string;
}

export interface FileAttachmentRecord {
  id: string;
  file_id: string;
  entity_type: string;
  entity_id: string;
  attachment_type: string;
  notes?: string;
  created_at: string;
  file: {
    id: string;
    original_name: string;
    mime_type: string;
    version: number;
    sha256?: string;
    size_bytes?: number;
  };
}

export interface FileVersionRecord {
  version: number;
  original_name: string;
  created_at?: string;
  change_description?: string;
}

async function requestPartsApi<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: getRequestHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({ error: response.statusText }));

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error || 'Parts/files request failed');
  }

  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data as T;
  }

  return payload as T;
}

export async function listParts(params?: {
  query?: string;
  status?: string;
  customer_id?: string;
  material_id?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.query) query.set('q', params.query);
  if (params?.status) query.set('status', params.status);
  if (params?.customer_id) query.set('customer_id', params.customer_id);
  if (params?.material_id) query.set('material_id', params.material_id);
  if (params?.tags && params.tags.length > 0) query.set('tags', params.tags.join(','));
  if (typeof params?.limit === 'number') query.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') query.set('offset', String(params.offset));
  const suffix = query.toString();
  return requestPartsApi<PartsSearchResult>('GET', `/parts${suffix ? `?${suffix}` : ''}`);
}

export async function getPart(partId: string) {
  return requestPartsApi<PartDetailRecord>('GET', `/parts/${encodeURIComponent(partId)}`);
}

export async function createPart(params: {
  part_number: string;
  name: string;
  description?: string;
  material_name?: string;
  tags?: string[];
}) {
  return requestPartsApi<{
    part: PartSummaryRecord;
    revision: PartRevisionRecord;
    warnings?: string[];
  }>('POST', '/parts', params);
}

export async function addPartRevision(
  partId: string,
  params: {
    revision?: string;
    change_description: string;
    cad_file_id?: string;
    drawing_file_id?: string;
  },
) {
  return requestPartsApi<PartRevisionRecord>('POST', `/parts/${encodeURIComponent(partId)}/revisions`, params);
}

export async function listPartRevisions(partId: string) {
  return requestPartsApi<PartRevisionRecord[]>('GET', `/parts/${encodeURIComponent(partId)}/revisions`);
}

export async function uploadPacketFile(params: {
  content: string;
  original_name: string;
  existing_file_id?: string;
  change_description?: string;
}) {
  return requestPartsApi<UploadedFileRecord>('POST', '/files/upload', params);
}

export async function attachPacketFile(params: {
  file_id: string;
  entity_type: string;
  entity_id: string;
  attachment_type?: string;
  notes?: string;
}) {
  return requestPartsApi<FileAttachmentRecord>('POST', `/files/${encodeURIComponent(params.file_id)}/attach`, {
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    attachment_type: params.attachment_type,
    notes: params.notes,
  });
}

export async function listPacketAttachments(params: { entity_type: string; entity_id: string }) {
  const query = new URLSearchParams({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
  });
  return requestPartsApi<FileAttachmentRecord[]>('GET', `/files/attachments?${query.toString()}`);
}

export async function getFileVersions(fileId: string) {
  return requestPartsApi<FileVersionRecord[]>('GET', `/files/${encodeURIComponent(fileId)}/versions`);
}
