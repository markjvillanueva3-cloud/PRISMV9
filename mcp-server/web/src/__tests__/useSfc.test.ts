import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ApiError } from '../api/requestCore';

// Control what the SFC API does; the hook's status-propagation runs for real.
const h = vi.hoisted(() => ({ mode: 'ok' as 'ok' | '403' | '500' }));

vi.mock('../api/sfc', () => ({
  sfcApi: {
    calculate: () => {
      if (h.mode === '403') return Promise.reject(new ApiError(403, 'Daily limit reached', { code: 'TIER_LIMIT' }));
      if (h.mode === '500') return Promise.reject(new ApiError(500, 'server error'));
      return Promise.resolve({ result: { spindle_speed: 3000 } });
    },
  },
}));

import { useSfcCalculate } from '../hooks/useSfc';

const REQ = { material: '4140', operation: 'face_milling' } as never;

beforeEach(() => {
  h.mode = 'ok';
});

describe('useSfcCalculate error status propagation (QX-403)', () => {
  it('carries the 403 status so the page can show an upgrade prompt', async () => {
    h.mode = '403';
    const { result } = renderHook(() => useSfcCalculate());
    await act(async () => {
      await result.current.execute(REQ);
    });
    expect(result.current.errorStatus).toBe(403);
    expect(result.current.errorCode).toBe('TIER_LIMIT');
    expect(result.current.error).toBe('Daily limit reached');
    expect(result.current.data).toBeNull();
  });

  it('carries a non-403 status distinctly (500 != entitlement)', async () => {
    h.mode = '500';
    const { result } = renderHook(() => useSfcCalculate());
    await act(async () => {
      await result.current.execute(REQ);
    });
    expect(result.current.errorStatus).toBe(500);
  });

  it('clears errorStatus on a successful calculation', async () => {
    h.mode = 'ok';
    const { result } = renderHook(() => useSfcCalculate());
    await act(async () => {
      await result.current.execute(REQ);
    });
    expect(result.current.errorStatus).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ spindle_speed: 3000 });
  });
});
