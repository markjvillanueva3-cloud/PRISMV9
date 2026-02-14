/**
 * PRISM MCP Server — apiCallWithTimeout Unit Tests
 * P0-MS0a Step 16d: Verify timeout wrapper behavior.
 * 
 * Tests:
 * - Returns result when function completes within timeout
 * - Throws PrismError with category='network' on timeout
 * - Passes AbortSignal to wrapped function
 * - Preserves original error when function fails (non-timeout)
 */

import { describe, it, expect } from 'vitest';
import { apiCallWithTimeout } from '../../utils/apiTimeout.js';
import { PrismError } from '../../errors/PrismError.js';

describe('apiCallWithTimeout', () => {
  it('returns result when function completes in time', async () => {
    const result = await apiCallWithTimeout(
      async (_signal) => 'success',
      5000,
      'test-fast'
    );
    expect(result).toBe('success');
  });

  it('throws PrismError on timeout', async () => {
    try {
      await apiCallWithTimeout(
        async (signal) => {
          // Simulate slow operation that respects abort
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve('too late'), 5000);
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          });
        },
        50, // Very short timeout
        'test-slow'
      );
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrismError);
      if (err instanceof PrismError) {
        expect(err.category).toBe('network');
        expect(err.severity).toBe('retry');
        expect(err.message).toContain('timed out');
        expect(err.message).toContain('test-slow');
      }
    }
  });

  it('passes AbortSignal to the wrapped function', async () => {
    let receivedSignal: AbortSignal | null = null;
    await apiCallWithTimeout(
      async (signal) => {
        receivedSignal = signal;
        return 'done';
      },
      5000,
      'test-signal'
    );
    expect(receivedSignal).not.toBeNull();
    expect(receivedSignal!.aborted).toBe(false);
  });

  it('preserves original error on non-timeout failure', async () => {
    const originalError = new Error('database connection failed');
    try {
      await apiCallWithTimeout(
        async (_signal) => { throw originalError; },
        5000,
        'test-error'
      );
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBe(originalError);
      expect(err).not.toBeInstanceOf(PrismError);
    }
  });
});
