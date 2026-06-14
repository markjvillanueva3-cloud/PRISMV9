import { getRequestHeaders } from './client';
import { fetchJson } from './requestCore';

const API_BASE = '/api/v1/orchestration/unified';

export type ExecutionTier = 'single_dispatcher' | 'multi_domain' | 'full_chain';
export type AuthoritySource =
  | 'user'
  | 'proven'
  | 'machine_intel'
  | 'oem'
  | 'registry'
  | 'physics'
  | 'tribal';

export interface PUOAConstraints {
  max_duration_ms?: number;
  required_tier?: ExecutionTier;
  required_domains?: string[];
  allow_escalation?: boolean;
  require_consensus?: boolean;
}

export interface PUOAInput {
  task_id?: string;
  intent: string;
  context?: Record<string, unknown>;
  constraints?: PUOAConstraints;
  authority_overrides?: Partial<Record<AuthoritySource, number>>;
}

export interface IntentEntity {
  type: string;
  value: string;
  normalized?: string;
  confidence?: number;
}

export interface IntentClassification {
  category?: string;
  subcategory?: string;
  confidence: number;
  entities: IntentEntity[];
  tier?: ExecutionTier;
  domains?: string[];
  recommended_orchestrators?: string[];
  [key: string]: unknown;
}

export interface TierRoutingResult {
  tier: ExecutionTier;
  domains: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'critical';
  reason: string;
  estimated_steps?: number;
}

export interface DomainResult {
  domain: string;
  orchestrator_id: string;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  result: unknown;
  duration_ms: number;
  authority_sources: AuthoritySource[];
  confidence: number;
}

export interface PUOAResult {
  task_id: string;
  tier: ExecutionTier;
  status: 'success' | 'partial' | 'failed';
  started_at: string;
  completed_at: string;
  duration_ms: number;
  domain_results: DomainResult[];
  chain_steps?: Array<Record<string, unknown>>;
  final_result: unknown;
  authority_resolution: {
    winning_source: AuthoritySource;
    confidence: number;
    conflicts_resolved: number;
  };
  recommendations: string[];
  intelligence?: Record<string, unknown>;
}

type OrchestrationEnvelope<T> = {
  ok?: boolean;
  data?: T;
  result?: T;
  error?: string;
};

async function requestUnified<T>(path: string, body: unknown, fallbackMessage: string) {
  const response = await fetchJson<OrchestrationEnvelope<T>>(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(body),
    fallbackMessage,
  });

  if (response.ok === false) {
    throw new Error(response.error || fallbackMessage);
  }

  return response.data ?? response.result ?? (response as unknown as T);
}

export function executeUnifiedIntent(input: PUOAInput) {
  return requestUnified<PUOAResult>('/execute', input, 'Unified PRISM AI execution failed');
}

export function classifyUnifiedIntent(input: Pick<PUOAInput, 'intent' | 'context'>) {
  return requestUnified<IntentClassification>('/classify', input, 'Unified PRISM AI classification failed');
}

export function routeUnifiedIntent(input: Pick<PUOAInput, 'intent' | 'context' | 'constraints'>) {
  return requestUnified<TierRoutingResult>('/route', input, 'Unified PRISM AI routing preview failed');
}
