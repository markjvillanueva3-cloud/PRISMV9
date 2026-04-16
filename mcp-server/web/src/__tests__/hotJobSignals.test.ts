// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearHotJob, markHotJob, subscribeHotJobs } from '../features/operating-system/hotJobSignals';

describe('hotJobSignals', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('notifies same-session subscribers when hot jobs change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHotJobs(listener);

    markHotJob({
      jobId: 'JOB-HOT-1',
      partNumber: 'FIRE-01',
      customer: 'Atlas Medical',
      dueDate: '2026-03-29',
      note: 'Raised inside the current session.',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0][0]?.jobId).toBe('JOB-HOT-1');

    unsubscribe();
  });

  it('reacts to storage sync events from another tab', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHotJobs(listener);
    const payload = JSON.stringify([
      {
        jobId: 'JOB-HOT-9',
        partNumber: 'SYNC-09',
        customer: 'Orbit Aero',
        dueDate: '2026-04-02',
        note: 'Raised from another browser tab.',
        setBy: 'Management',
        setAt: '2026-03-29T10:00:00.000Z',
      },
    ]);

    window.localStorage.setItem('prism.hot-jobs.v1', payload);
    window.dispatchEvent(new StorageEvent('storage', { key: 'prism.hot-jobs.v1', newValue: payload }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0][0]?.partNumber).toBe('SYNC-09');

    clearHotJob('JOB-HOT-9');
    unsubscribe();
  });
});
