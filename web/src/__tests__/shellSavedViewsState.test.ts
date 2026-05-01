// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createShellSavedView,
  deleteShellSavedView,
  readShellSavedViews,
} from '../features/operating-system/shellSavedViewsState';

describe('shellSavedViewsState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('fails closed when deleting a missing saved view', () => {
    expect(() => deleteShellSavedView('missing-view', 'workspace')).toThrow(
      'Saved view missing-view not found',
    );
  });

  it('fails closed when deleting a saved view through the wrong entity type', () => {
    createShellSavedView({
      name: 'Planner queue',
      entityType: 'workspace',
      to: '/jobs?focusId=JOB-4821&focusType=job',
    });

    const existing = readShellSavedViews('workspace')[0];
    expect(existing).toBeDefined();

    expect(() => deleteShellSavedView(existing!.id, 'tooling')).toThrow(
      `Saved view ${existing!.id} not found for entity type tooling`,
    );
  });

  it('updates demoted default timestamps so fallback ordering matches live behavior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));

    createShellSavedView({
      name: 'Planner queue',
      entityType: 'workspace',
      to: '/jobs?focusId=JOB-4821&focusType=job',
      isDefault: true,
    });

    const original = readShellSavedViews('workspace')[0];
    expect(original?.updatedAt).toBe('2026-03-30T12:00:00.000Z');

    vi.setSystemTime(new Date('2026-03-30T12:05:00Z'));

    createShellSavedView({
      name: 'Estimator board',
      entityType: 'workspace',
      to: '/quote-builder?focusId=RFQ-12&focusType=rfq',
      isDefault: true,
    });

    const views = readShellSavedViews('workspace');
    const demoted = views.find((view) => view.name === 'Planner queue');
    const promoted = views.find((view) => view.name === 'Estimator board');

    expect(promoted?.isDefault).toBe(true);
    expect(promoted?.updatedAt).toBe('2026-03-30T12:05:00.000Z');
    expect(demoted?.isDefault).toBe(false);
    expect(demoted?.updatedAt).toBe('2026-03-30T12:05:00.000Z');
  });
});
