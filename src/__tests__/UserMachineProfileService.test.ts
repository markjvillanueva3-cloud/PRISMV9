import { describe, expect, it, vi } from 'vitest';

import type {
  PersistUserMachineProfileInput,
  UserMachineProfileReadModel
} from '../contracts/userMachineProfile';
import {
  UserMachineProfileService,
  buildUserMachineProfileReadModel,
  validateUserMachineProfileOverlay
} from '../services/UserMachineProfileService';

const baseProfileInput: PersistUserMachineProfileInput = {
  consumer: 'calculator',
  source: 'shop_audit',
  profile: {
    profileId: 'profile-okuma-m460',
    userId: 'user-mark',
    displayName: 'Shop Okuma M460',
    machine: {
      machineId: 'okuma_genos_m460v_5ax',
      canonicalMachineId: 'okuma_genos_m460v_5ax',
      packageId: 'okuma_genos_m460v_5ax::p300ma_h::15000_cat40_big_plus',
      manufacturerId: 'okuma',
      manufacturerLabel: 'Okuma',
      modelLabel: 'GENOS M460V-5AX',
      familyId: '5_axis_vertical',
      familyLabel: '5-Axis Vertical',
      controllerPackages: [
        {
          controllerId: 'osp_p300ma_h',
          controllerLabel: 'OSP-P300MA-H',
          controlFeatures: [
            {
              id: 'cas',
              label: 'CAS',
              availability: {
                enabled: true,
                source: 'shop_audit'
              }
            },
            {
              id: 'high_speed_machining',
              label: 'High-speed machining',
              availability: {
                enabled: true,
                source: 'shop_audit'
              }
            }
          ]
        }
      ],
      spindlePackages: [
        {
          id: '15000_cat40_big_plus',
          label: '15,000 RPM CAT 40 Big+',
          taper: 'CAT 40 Big+',
          maxRpm: 15000,
          availability: {
            enabled: true,
            source: 'shop_audit'
          }
        }
      ],
      coolantStrategies: [
        {
          id: 'flood',
          label: 'Flood',
          availability: {
            enabled: true,
            source: 'shop_audit'
          }
        },
        {
          id: 'through_spindle',
          label: 'Through-spindle',
          availability: {
            enabled: true,
            source: 'shop_audit'
          }
        },
        {
          id: 'through_air',
          label: 'Through-air',
          availability: {
            enabled: true,
            source: 'shop_audit'
          }
        },
        {
          id: 'air_blast',
          label: 'Air blast',
          availability: {
            enabled: true,
            source: 'shop_audit'
          }
        }
      ],
      kinematics: {
        familyId: '5_axis_vertical',
        familyLabel: '5-Axis Vertical',
        topology: '5_axis_vertical',
        travelXIn: 30,
        travelYIn: 18,
        travelZIn: 18
      },
      guidewayType: 'box',
      naturalFrequencyHz: 680,
      axisAccelerationMps2: 5.5,
      axisJerkMps3: 12,
      sourceRecords: ['shop_audit:okuma_m460']
    },
    selectedControllerId: 'osp_p300ma_h',
    enabledControllerFeatureIds: ['cas', 'high_speed_machining'],
    enabledMachineFeatureIds: ['through-spindle-coolant', 'high-speed-modes'],
    selectedSpindlePackageId: '15000_cat40_big_plus',
    toolingStationCountOverride: 48,
    enabledCoolantStrategyIds: [
      'flood',
      'through_spindle',
      'through_air',
      'air_blast'
    ],
    measuredPerformance: {
      guidewayType: 'box',
      machineAgeYears: 8,
      measuredPowerKw: 24.6,
      measuredMaxTorqueNm: 102,
      measuredNaturalFrequencyHz: 910,
      measuredSystemStiffnessNPerUm: 88,
      measuredDampingRatio: 0.041,
      measuredAxisAccelerationMps2: 7.2,
      measuredAxisJerkMps3: 18.5,
    }
  }
};

describe('validateUserMachineProfileOverlay', () => {
  it('accepts a valid machine profile overlay', () => {
    expect(validateUserMachineProfileOverlay(baseProfileInput.profile)).toEqual([]);
  });

  it('rejects unsupported controller features and coolant ids', () => {
    const invalid = {
      ...baseProfileInput.profile,
      enabledControllerFeatureIds: ['cas', 'unsupported_feature'],
      enabledCoolantStrategyIds: ['flood', 'mist']
    };

    expect(validateUserMachineProfileOverlay(invalid)).toEqual([
      {
        field: 'enabledControllerFeatureIds',
        message:
          'Controller feature "unsupported_feature" is not available for the selected controller.'
      },
      {
        field: 'enabledCoolantStrategyIds',
        message:
          'Coolant strategy "mist" is not available for this machine package.'
      }
    ]);
  });

  it('rejects invalid tooling station overrides', () => {
    const invalid = {
      ...baseProfileInput.profile,
      toolingStationCountOverride: 0,
    };

    expect(validateUserMachineProfileOverlay(invalid)).toEqual([
      {
        field: 'toolingStationCountOverride',
        message: 'Tooling station override must be a whole number between 1 and 500.'
      }
    ]);
  });

  it('rejects out-of-range measured machine posture values', () => {
    const invalid = {
      ...baseProfileInput.profile,
      measuredPerformance: {
        ...baseProfileInput.profile.measuredPerformance,
        measuredDampingRatio: 0.9,
      },
    };

    expect(validateUserMachineProfileOverlay(invalid)).toEqual([
      {
        field: 'measuredPerformance.measuredDampingRatio',
        message: 'Measured damping ratio must be a number between 0.001 and 0.5.'
      }
    ]);
  });
});

describe('buildUserMachineProfileReadModel', () => {
  it('marks the shared downstream consumers as supported', () => {
    const model = buildUserMachineProfileReadModel(baseProfileInput.profile);

    expect(model.canDriveCalculatorSelections).toBe(true);
    expect(model.canDriveProgramRelease).toBe(true);
    expect(model.canDrivePrintToCnc).toBe(true);
    expect(model.supportedConsumers).toContain('program_release');
  });
});

describe('UserMachineProfileService', () => {
  it('persists a valid profile through the repository', async () => {
    const stored: UserMachineProfileReadModel = buildUserMachineProfileReadModel(
      baseProfileInput.profile
    );

    const repository = {
      getByProfileId: vi.fn().mockResolvedValue(null),
      getDefaultProfile: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({
        profile: stored,
        created: true,
        updated: false,
        version: 1,
        defaulted: true,
      })
    };

    const service = new UserMachineProfileService(repository);
    const result = await service.persistProfile(baseProfileInput);

    expect(repository.getByProfileId).toHaveBeenCalledWith('profile-okuma-m460');
    expect(repository.upsert).toHaveBeenCalledTimes(1);
    expect(result.version).toBe(1);
  });

  it('throws when the selected configuration is impossible for the machine package', async () => {
    const repository = {
      getByProfileId: vi.fn().mockResolvedValue(null),
      getDefaultProfile: vi.fn().mockResolvedValue(null),
      upsert: vi.fn()
    };

    const service = new UserMachineProfileService(repository);

    await expect(
      service.persistProfile({
        ...baseProfileInput,
        profile: {
          ...baseProfileInput.profile,
          selectedSpindlePackageId: 'bad_spindle'
        }
      })
    ).rejects.toThrow('Invalid user machine profile.');
  });

  it('reads the default profile for a downstream consumer', async () => {
    const stored = buildUserMachineProfileReadModel(baseProfileInput.profile);
    const repository = {
      getByProfileId: vi.fn().mockResolvedValue(stored),
      getDefaultProfile: vi.fn().mockResolvedValue(stored),
      upsert: vi.fn(),
    };

    const service = new UserMachineProfileService(repository);
    const result = await service.getDefaultProfile('user-mark', 'program_release', 'program-release');

    expect(repository.getDefaultProfile).toHaveBeenCalledWith(
      'user-mark',
      'program_release',
      'program-release',
    );
    expect(result?.profile.profileId).toBe('profile-okuma-m460');
  });
});
