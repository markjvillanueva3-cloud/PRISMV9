/**
 * PRISM MCP Server — getEffort Unit Tests
 * P0-MS0a Step 16d: Verify effort tier mapping behavior.
 * 
 * Tests:
 * - Known safety actions → 'max'
 * - Known data actions → 'high'
 * - Known operational actions → 'medium'
 * - Known status actions → 'low'
 * - Unknown actions → 'max' (safety fallback)
 * - auditEffortMap flags unmapped actions
 */

import { describe, it, expect, vi } from 'vitest';
import { getEffort, auditEffortMap, EFFORT_MAP, EFFORT_LEVELS } from '../../config/effortTiers.js';

describe('getEffort', () => {
  it('returns max for safety-critical actions', () => {
    expect(getEffort('safety')).toBe('max');
    expect(getEffort('cutting_force')).toBe('max');
    expect(getEffort('speed_feed')).toBe('max');
    expect(getEffort('tool_life')).toBe('max');
    expect(getEffort('ralph_loop')).toBe('max');
    expect(getEffort('omega_compute')).toBe('max');
  });

  it('returns high for data retrieval actions', () => {
    expect(getEffort('material_get')).toBe('high');
    expect(getEffort('material_search')).toBe('high');
    expect(getEffort('alarm_decode')).toBe('high');
    expect(getEffort('knowledge_search')).toBe('high');
  });

  it('returns medium for operational actions', () => {
    expect(getEffort('build')).toBe('medium');
    expect(getEffort('hook_register')).toBe('medium');
    expect(getEffort('compliance_check')).toBe('medium');
  });

  it('returns low for status/read actions', () => {
    expect(getEffort('health')).toBe('low');
    expect(getEffort('state_save')).toBe('low');
    expect(getEffort('file_read')).toBe('low');
    expect(getEffort('stats')).toBe('low');
  });

  it('defaults to max for unknown actions (safety fallback)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getEffort('totally_unknown_action')).toBe('max');
    expect(getEffort('')).toBe('max');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('all effort levels are valid', () => {
    for (const level of Object.values(EFFORT_MAP)) {
      expect(EFFORT_LEVELS).toContain(level);
    }
  });
});

describe('auditEffortMap', () => {
  it('logs warnings for unmapped actions', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    auditEffortMap(['safety', 'health', 'fake_action', 'another_fake']);
    // Should warn about fake_action and another_fake, not safety or health
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toContain('fake_action');
    expect(spy.mock.calls[1][0]).toContain('another_fake');
    spy.mockRestore();
  });

  it('does not warn when all actions are mapped', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    auditEffortMap(['safety', 'health', 'build']);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
