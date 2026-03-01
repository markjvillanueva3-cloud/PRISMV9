/**
 * Document Learning types — CC-EXT-MS0 U07
 *
 * Typed request/response interfaces for the document learning API.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface DocLearnApiResponse<T> {
  data?: T;
  error?: string;
}

export interface DocumentSummary {
  id: string;
  title: string | null;
  format: string;
  status: "pending" | "extracting" | "complete" | "failed";
  created_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  file_path: string;
}

// ---------------------------------------------------------------------------
// doc_upload
// ---------------------------------------------------------------------------

export interface DocUploadRequest {
  file_path: string;
  title?: string;
  document_id?: string;
}

export interface DocUploadResult {
  document_id: string;
  status: string;
  format: string;
  message: string;
}

// ---------------------------------------------------------------------------
// doc_extract
// ---------------------------------------------------------------------------

export interface DocExtractRequest {
  document_id: string;
  force_domain?: string;
}

export interface DocExtractResult {
  document_id: string;
  status: "complete" | "failed";
  is_valid?: boolean;
  stats?: Record<string, number>;
  validation?: Record<string, unknown>;
  errors?: string[];
  error?: string;
}

// ---------------------------------------------------------------------------
// doc_list
// ---------------------------------------------------------------------------

export interface DocListResult {
  count: number;
  documents: DocumentSummary[];
}

// ---------------------------------------------------------------------------
// doc_get
// ---------------------------------------------------------------------------

export interface DocGetRequest {
  document_id: string;
}

export interface DocGetResult {
  document: DocumentDetail;
  knowledge: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// doc_delete
// ---------------------------------------------------------------------------

export interface DocDeleteRequest {
  document_id: string;
}

export interface DocDeleteResult {
  deleted: string;
  message: string;
}
