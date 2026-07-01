import { getRequestHeaders } from './client';
import { fetchJson } from './requestCore';

const API_BASE = '/api/v1/session';
const MEMORY_TTL_MS = 5 * 60 * 1000;
const HEALTH_TTL_MS = 60 * 1000;

type SessionEnvelope<T> = {
  ok?: boolean;
  data?: T;
  result?: T;
  error?: string;
};

export interface SessionHealthSnapshot {
  health_status?: string;
  call_count?: number;
  estimated_tokens?: number;
  compaction_count?: number;
  last_position_save?: string | null;
  reasons?: string[];
  advisory?: string;
  schema_coverage?: Record<string, unknown>;
}

export interface SessionMemoryEntry {
  value: string;
  timestamp?: string;
}

export interface SessionMemoryRecall {
  success?: boolean;
  categories?: string[];
  memory?: Record<string, Record<string, SessionMemoryEntry>>;
}

type CacheRecord<T> = {
  value: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheRecord<SessionMemoryRecall>>();
let healthCache: CacheRecord<SessionHealthSnapshot> | null = null;

async function requestSession<T>(
  path: string,
  options: {
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
    fallbackMessage: string;
  },
) {
  const response = await fetchJson<SessionEnvelope<T>>(`${API_BASE}${path}`, {
    method: options.method,
    headers: getRequestHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
    fallbackMessage: options.fallbackMessage,
  });

  if (response.ok === false) {
    throw new Error(response.error || options.fallbackMessage);
  }

  return response.data ?? response.result ?? (response as unknown as T);
}

export async function recallSessionMemory(
  params: {
    query: string;
    limit?: number;
  },
  force = false,
) {
  const key = `${params.query.trim()}|${params.limit ?? 5}`;
  const cached = memoryCache.get(key);
  if (!force && cached && Date.now() - cached.timestamp < MEMORY_TTL_MS) {
    return cached.value;
  }

  const value = await requestSession<SessionMemoryRecall>('/memory/recall', {
    method: 'POST',
    body: {
      query: params.query,
      limit: params.limit ?? 5,
    },
    fallbackMessage: 'Kienzle persistent memory recall failed',
  });

  memoryCache.set(key, {
    value,
    timestamp: Date.now(),
  });
  return value;
}

export async function getSessionHealth(force = false) {
  if (!force && healthCache && Date.now() - healthCache.timestamp < HEALTH_TTL_MS) {
    return healthCache.value;
  }

  const value = await requestSession<SessionHealthSnapshot>('/health', {
    method: 'GET',
    fallbackMessage: 'Kienzle session health check failed',
  });

  healthCache = {
    value,
    timestamp: Date.now(),
  };
  return value;
}
