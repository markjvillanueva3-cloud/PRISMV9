import { describe, expect, it } from 'vitest';
import { EquipmentAssetPage } from '../pages/EquipmentAssetPage';

describe('EquipmentAssetPage', () => {
  it('is exported as a callable component function', () => {
    expect(typeof EquipmentAssetPage).toBe('function');
  });

  it('declares zero required props', () => {
    expect(EquipmentAssetPage.length).toBe(0);
  });
});
