import { describe, expect, it } from 'vitest';
import { normalizeParams } from '../utils/paramNormalizer.js';

describe('paramNormalizer', () => {
  it('maps legacy calculator quick-solve fields into canonical orchestrator fields', () => {
    const normalized = normalizeParams({
      machine: 'Okuma GENOS M460V-5AX',
      doc_mm: '0.35',
      woc_mm: '1.2',
      num_flutes: '5',
      toolpath_strategy: 'Surface Finish Parallel',
      machine_age_years: '9',
      natural_frequency_hz: '910',
      system_stiffness_n_m: '88',
      damping_ratio: '0.041',
      machine_axis_accel_m_s2: '7.2',
      machine_axis_jerk_m_s3: '18.5',
    });

    expect(normalized.machine_name).toBe('Okuma GENOS M460V-5AX');
    expect(normalized.axial_depth_mm).toBe(0.35);
    expect(normalized.radial_depth_mm).toBe(1.2);
    expect(normalized.flutes).toBe(5);
    expect(normalized.cam_strategy).toBe('Surface Finish Parallel');
    expect(normalized.numberOfFlutes).toBe(5);
    expect(normalized.machine_age_years).toBe(9);
    expect(normalized.natural_frequency_hz).toBe(910);
    expect(normalized.system_stiffness_n_m).toBe(88);
    expect(normalized.damping_ratio).toBe(0.041);
    expect(normalized.machine_axis_accel_m_s2).toBe(7.2);
    expect(normalized.machine_axis_jerk_m_s3).toBe(18.5);
  });
});
