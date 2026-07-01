export interface RouteContext {
  originSource?: string;
  originType?: string;
  originId?: string;
  originCustomer?: string;
  originThreadId?: string;
  focusJobId?: string;
  focusQuoteId?: string;
  focusPacketId?: string;
  note?: string;
}

export interface LegacyRouteContext {
  source?: string;
  recordType?: string;
  recordId?: string;
  customer?: string;
  thread?: string;
}

export type RouteContextInput = RouteContext & LegacyRouteContext;

function firstValue(params: URLSearchParams, ...keys: string[]) {
  for (const key of keys) {
    const value = params.get(key);
    if (value) {
      return value;
    }
  }

  return '';
}

function setIfPresent(params: URLSearchParams, key: string, value?: string) {
  if (value) {
    params.set(key, value);
  }
}

function selectedFocusId(context: RouteContextInput) {
  return context.focusJobId || context.focusQuoteId || context.focusPacketId || '';
}

export function parseRouteContext(search: string | URLSearchParams): RouteContextInput {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;

  const originSource = firstValue(params, 'originSource', 'source');
  const originType = firstValue(params, 'originType', 'recordType');
  const originId = firstValue(params, 'originId', 'recordId');
  const originCustomer = firstValue(params, 'originCustomer', 'customer');
  const originThreadId = firstValue(params, 'originThreadId', 'thread');
  const focusJobId = firstValue(params, 'focusJobId', 'focusId');
  const focusQuoteId = firstValue(params, 'focusQuoteId');
  const focusPacketId = firstValue(params, 'focusPacketId');
  const note = firstValue(params, 'note');

  return {
    originSource,
    originType,
    originId,
    originCustomer,
    originThreadId,
    focusJobId,
    focusQuoteId,
    focusPacketId,
    note,
    source: originSource,
    recordType: originType,
    recordId: originId,
    customer: originCustomer,
    thread: originThreadId,
  };
}

export function buildRouteContextPath(basePath: string, context: RouteContextInput = {}) {
  const params = new URLSearchParams();
  const originSource = context.originSource || context.source || '';
  const originType = context.originType || context.recordType || '';
  const originId = context.originId || context.recordId || '';
  const originCustomer = context.originCustomer || context.customer || '';
  const originThreadId = context.originThreadId || context.thread || '';
  const focusId = selectedFocusId(context);

  setIfPresent(params, 'originSource', originSource);
  setIfPresent(params, 'originType', originType);
  setIfPresent(params, 'originId', originId);
  setIfPresent(params, 'originCustomer', originCustomer);
  setIfPresent(params, 'originThreadId', originThreadId);
  setIfPresent(params, 'focusJobId', context.focusJobId);
  setIfPresent(params, 'focusQuoteId', context.focusQuoteId);
  setIfPresent(params, 'focusPacketId', context.focusPacketId);
  setIfPresent(params, 'focusId', focusId);
  setIfPresent(params, 'source', originSource);
  setIfPresent(params, 'recordType', originType);
  setIfPresent(params, 'recordId', originId);
  setIfPresent(params, 'customer', originCustomer);
  setIfPresent(params, 'thread', originThreadId);
  setIfPresent(params, 'note', context.note);

  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}
