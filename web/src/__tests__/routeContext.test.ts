import { describe, expect, it } from 'vitest';
import { buildRouteContextPath, parseRouteContext } from '../utils/routeContext';

describe('routeContext', () => {
  it('parses legacy source/recordType/recordId params into origin fields', () => {
    const context = parseRouteContext(
      '?source=messages&recordType=Customer&recordId=CUST-001&customer=Acme%20Aerospace&thread=thread-rfq&note=Carry%20RFQ%20context',
    );

    expect(context.originSource).toBe('messages');
    expect(context.originType).toBe('Customer');
    expect(context.originId).toBe('CUST-001');
    expect(context.originCustomer).toBe('Acme Aerospace');
    expect(context.originThreadId).toBe('thread-rfq');
    expect(context.focusJobId).toBe('');
    expect(context.note).toBe('Carry RFQ context');
  });

  it('builds a split origin/focus route while preserving legacy compatibility params', () => {
    const href = buildRouteContextPath('/jobs', {
      originSource: 'messages',
      originType: 'Customer',
      originId: 'CUST-001',
      originCustomer: 'Acme Aerospace',
      originThreadId: 'thread-rfq',
      focusJobId: 'JOB-77',
      note: 'Continue RFQ thread',
    });

    const params = new URLSearchParams(href.split('?')[1]);

    expect(params.get('originSource')).toBe('messages');
    expect(params.get('originType')).toBe('Customer');
    expect(params.get('originId')).toBe('CUST-001');
    expect(params.get('originCustomer')).toBe('Acme Aerospace');
    expect(params.get('originThreadId')).toBe('thread-rfq');
    expect(params.get('focusJobId')).toBe('JOB-77');
    expect(params.get('focusId')).toBe('JOB-77');
    expect(params.get('source')).toBe('messages');
    expect(params.get('recordType')).toBe('Customer');
    expect(params.get('recordId')).toBe('CUST-001');
    expect(params.get('customer')).toBe('Acme Aerospace');
    expect(params.get('thread')).toBe('thread-rfq');
    expect(params.get('note')).toBe('Continue RFQ thread');
  });

  it('round-trips focus fields and thread preservation from a downstream route', () => {
    const parsed = parseRouteContext(
      buildRouteContextPath('/print-to-cnc', {
        originSource: 'jobs-desk',
        originType: 'Job',
        originId: 'JOB-77',
        originCustomer: 'Orbit Aero',
        originThreadId: 'thread-rfq',
        focusPacketId: 'PKT-22',
        note: 'Carry the exact conversation forward',
      }),
    );

    expect(parsed.originSource).toBe('jobs-desk');
    expect(parsed.originType).toBe('Job');
    expect(parsed.originId).toBe('JOB-77');
    expect(parsed.originCustomer).toBe('Orbit Aero');
    expect(parsed.originThreadId).toBe('thread-rfq');
    expect(parsed.focusPacketId).toBe('PKT-22');
    expect(parsed.thread).toBe('thread-rfq');
    expect(parsed.source).toBe('jobs-desk');
    expect(parsed.recordType).toBe('Job');
    expect(parsed.recordId).toBe('JOB-77');
  });
});
