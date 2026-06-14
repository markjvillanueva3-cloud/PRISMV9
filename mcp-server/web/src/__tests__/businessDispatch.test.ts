// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BusinessDispatchError,
  callBusinessAction,
  unwrapBusiness,
} from '../api/businessDispatch';

describe('unwrapBusiness', () => {
  it('returns the inner data when given the { success, data } envelope', () => {
    const records = [{ name: 'Niagara', vendor_type: 'tool-maker' }];
    expect(unwrapBusiness<typeof records>({ success: true, data: records })).toEqual(records);
  });

  it('returns a bare array payload unchanged (vendor_catalog_query shape)', () => {
    const bare = [{ name: 'Guhring', vendor_type: 'tool-maker' }];
    expect(unwrapBusiness<typeof bare>(bare)).toBe(bare);
  });

  it('returns a bare object payload unchanged when it lacks the envelope keys', () => {
    const bare = { composite_score: 0.82, tier: 'preferred' };
    expect(unwrapBusiness<typeof bare>(bare)).toBe(bare);
  });

  it('treats success:false as an envelope and still surfaces its data (no silent drop)', () => {
    // The normalizer is shape-based, not success-based: a { success:false, data } body
    // still yields `data` so the caller can inspect it rather than losing it.
    expect(unwrapBusiness<number>({ success: false, data: 0 })).toBe(0);
  });

  it('passes empty bodies through unchanged — exact identity, no throw', () => {
    expect(unwrapBusiness<null>(null)).toBe(null);
    expect(unwrapBusiness<undefined>(undefined)).toBe(undefined);
    expect(unwrapBusiness<string>('')).toBe('');
  });

  it('does NOT unwrap a domain object whose `success` field is non-boolean (envelope requires success:boolean)', () => {
    // A real payload may legitimately carry both 'success' and 'data' keys; only a BOOLEAN success
    // marks the dispatcher envelope. Anything else is returned whole so no domain data is dropped.
    const domain = { success: 'ok', data: 42, extra: 'keep-me' };
    expect(unwrapBusiness<typeof domain>(domain)).toBe(domain);
  });
});

describe('callBusinessAction', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('POSTs an { action, params } envelope to /api/v1/business/dispatch and returns parsed JSON', async () => {
    const body = { success: true, data: [{ name: 'Severance Tool' }] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const out = await callBusinessAction('vendor_catalog_query', { filter: { category: 'drills' } });

    expect(out).toEqual(body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/business/dispatch');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      action: 'vendor_catalog_query',
      params: { filter: { category: 'drills' } },
    });
  });

  it('attaches a Bearer token from localStorage when present', async () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('prism_auth_token', 'tok-123');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await callBusinessAction('vendor_list_all');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    // empty params default → {}
    expect(JSON.parse(init.body)).toEqual({ action: 'vendor_list_all', params: {} });
  });

  it('omits the Authorization header when no token is stored', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await callBusinessAction('vendor_rank', {});

    const [, init] = fetchMock.mock.calls[0];
    expect('Authorization' in init.headers).toBe(false);
  });

  it('throws BusinessDispatchError carrying the HTTP status on a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'vendor.name is required',
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(callBusinessAction('vendor_catalog_ingest', {})).rejects.toMatchObject({
      name: 'BusinessDispatchError',
      status: 422,
      message: 'vendor.name is required',
    });
  });

  it('falls back to "HTTP <status>" when the error body cannot be read', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error('stream closed');
      },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(callBusinessAction('vendor_rank', {})).rejects.toMatchObject({
      status: 500,
      message: 'HTTP 500',
    });
  });

  it('normalizes a fetch AbortError (timeout) to BusinessDispatchError 408', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(callBusinessAction('vendor_rank', {})).rejects.toMatchObject({
      name: 'BusinessDispatchError',
      status: 408,
    });
  });

  it('normalizes a transport failure (TypeError) to BusinessDispatchError 0', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(callBusinessAction('vendor_rank', {})).rejects.toMatchObject({
      name: 'BusinessDispatchError',
      status: 0,
      message: expect.stringMatching(/network error/),
    });
  });

  it('exposes BusinessDispatchError as a real Error subclass', () => {
    const err = new BusinessDispatchError(404, 'not found');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.name).toBe('BusinessDispatchError');
  });
});
