const API_BASE = '/api/v1';

export type ApiResultRecord = Record<string, unknown>;

export interface OrphanRouteResponse {
  source: 'live';
  result: unknown;
}

export class OrphanRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrphanRouteError';
  }
}

function unwrapPayload(payload: unknown): unknown {
  let current = payload;

  while (current && typeof current === 'object') {
    const record = current as Record<string, unknown>;
    if ('result' in record && record.result !== undefined) {
      current = record.result;
      continue;
    }
    if ('data' in record && record.data !== undefined) {
      current = record.data;
      continue;
    }
    return current;
  }

  return current;
}

async function requestRoute(path: string, body: ApiResultRecord): Promise<OrphanRouteResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response
    .json()
    .catch(() => ({ error: `${path} returned a non-JSON response.` }));

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `${path} failed with status ${response.status}.`;
    throw new OrphanRouteError(message);
  }

  return {
    source: 'live',
    result: unwrapPayload(payload),
  };
}

export function callThreadRoute(endpoint: string, body: ApiResultRecord) {
  return requestRoute(`/threads/${endpoint}`, body);
}

export function callPipelineRoute(endpoint: string, body: ApiResultRecord) {
  return requestRoute(`/pipeline/${endpoint}`, body);
}

export function callIntegrationRoute(endpoint: string, body: ApiResultRecord) {
  return requestRoute(`/integrations/${endpoint}`, body);
}
