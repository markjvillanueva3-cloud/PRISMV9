/**
 * Tests for the lathe-AI API client error handling.
 *
 * latheAI.ts POSTs {action, params} to /api/v1/ai/reasoning. That bridge route is not yet
 * mounted (the lathe-AI backend is pending), so live calls 404. The client must surface a
 * CLEAR, honest "not available yet" message (not a cryptic raw "Not Found") so a shop-floor
 * tester sees the real feature state -- while a successful response still returns its result
 * and a non-404 backend error still bubbles its message. (U-LATHEAI-404-MSG, slot:quebec.)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { latheUltraApi, postAIApi } from '../api/latheAI';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const respond = (body: string, init: ResponseInit) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, init)));

describe('latheAI client -- missing-backend (404) honesty', () => {
  it('404 -> clear "Lathe AI is not available yet" message, NOT raw "Not Found"', async () => {
    respond('Not Found', { status: 404 });
    await expect(latheUltraApi.listControllers()).rejects.toThrow(/not available yet/i);
    await expect(latheUltraApi.listControllers()).rejects.not.toThrow(/^Not Found$/);
  });

  it('404 message names the offending action (debuggable)', async () => {
    respond('Not Found', { status: 404 });
    await expect(postAIApi.debug({ controller: 'fanuc_oi_tf', gcode: 'G0' }))
      .rejects.toThrow(/post_ai_debug/);
  });

  it('success (200) returns the unwrapped result', async () => {
    respond(JSON.stringify({ result: { controllers: [] } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
    await expect(latheUltraApi.listControllers()).resolves.toEqual({ controllers: [] });
  });

  it('non-404 backend error still bubbles its message (no regression)', async () => {
    respond(JSON.stringify({ message: 'engine exploded' }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
    await expect(latheUltraApi.listControllers()).rejects.toThrow(/engine exploded/);
  });
});
