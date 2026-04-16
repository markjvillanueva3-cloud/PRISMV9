import { describe, expect, it } from 'vitest';
import { formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

describe('workflowRouteContext', () => {
  it('normalizes packet focus ids into packetId', () => {
    const context = parseWorkflowRouteContext('?focusType=packet&focusId=pkt__fixture__vf2');

    expect(context.focus.type).toBe('packet');
    expect(context.focus.id).toBe('pkt__fixture__vf2');
    expect(context.focus.packetId).toBe('pkt__fixture__vf2');
  });

  it('formats calculator as a readable source label', () => {
    expect(formatWorkflowSourceLabel('calculator')).toBe('Calculator');
  });

  it('formats parts-library as a readable source label', () => {
    expect(formatWorkflowSourceLabel('parts-library')).toBe('Parts Library');
  });
});
