import { describe, expect, it } from 'vitest';
import { WireEdmWizardPage } from '../pages/WireEdmWizardPage';

describe('WireEdmWizardPage', () => {
  it('is exported as a callable component function', () => {
    expect(typeof WireEdmWizardPage).toBe('function');
  });

  it('declares zero required props', () => {
    expect(WireEdmWizardPage.length).toBe(0);
  });
});
