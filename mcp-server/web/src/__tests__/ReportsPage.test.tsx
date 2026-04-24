import { describe, expect, it } from 'vitest';
import { ReportsPage } from '../pages/ReportsPage';

describe('ReportsPage', () => {
  it('is exported as a callable component function', () => {
    expect(typeof ReportsPage).toBe('function');
  });

  it('declares zero required props', () => {
    expect(ReportsPage.length).toBe(0);
  });
});
