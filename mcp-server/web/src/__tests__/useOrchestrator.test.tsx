// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useIntentClassifier,
  useOrchestrator,
  useTierRouting,
} from '../hooks/useOrchestrator';

const fetchMock = vi.fn();

describe('useOrchestrator hooks', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('executes through the unified Kienzle AI endpoint and captures tier state', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          task_id: 'TASK-1',
          tier: 'multi_domain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [],
          final_result: {
            summary: 'Watch the setup offset before OP20 resumes.',
          },
          authority_resolution: {
            winning_source: 'proven',
            confidence: 0.93,
            conflicts_resolved: 0,
          },
          recommendations: ['Verify offset before the next cycle.'],
        },
      }),
    });

    const { result } = renderHook(() => useOrchestrator());

    let response: Awaited<ReturnType<typeof result.current.execute>> = null;
    await act(async () => {
      response = await result.current.execute({
        intent: 'Summarize the current floor risk for JOB-TRACK-1',
        context: {
          desk: 'shop-floor-clock',
          jobId: 'JOB-TRACK-1',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.tier).toBe('multi_domain');
    });

    // Cast: closure assignment of response is invisible to TS control-flow.
    expect((response as { task_id?: string } | null)?.task_id).toBe('TASK-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/orchestration/unified/execute',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('classifies and previews routing through the unified endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            category: 'analysis',
            confidence: 0.81,
            entities: [{ type: 'job', value: 'JOB-TRACK-1', confidence: 0.9 }],
            tier: 'multi_domain',
            domains: ['shop_floor', 'operations'],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            tier: 'full_chain',
            domains: ['shop_floor', 'operations', 'erp'],
            complexity: 'critical',
            reason: 'Shift handoff plus job-risk synthesis needs cross-domain reasoning.',
            estimated_steps: 4,
          },
        }),
      });

    const classifier = renderHook(() => useIntentClassifier());
    const router = renderHook(() => useTierRouting());

    await act(async () => {
      await classifier.result.current.execute({
        intent: 'What should Avery Stone watch next on JOB-TRACK-1?',
        context: { desk: 'shop-floor-clock' },
      });
      await router.result.current.execute({
        intent: 'Plan the next shift handoff for JOB-TRACK-1',
        context: { desk: 'shop-floor-clock' },
        constraints: { allow_escalation: true },
      });
    });

    await waitFor(() => {
      expect(classifier.result.current.data?.category).toBe('analysis');
      expect(router.result.current.data?.tier).toBe('full_chain');
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/orchestration/unified/classify',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/orchestration/unified/route',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
