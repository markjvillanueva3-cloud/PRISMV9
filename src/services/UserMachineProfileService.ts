import type {
  ControllerCapabilityOption,
  ControllerPackage,
  MachineCapabilitySnapshot,
  PersistUserMachineProfileInput,
  PersistUserMachineProfileResult,
  UserMachineProfileConsumer,
  UserMachineProfileOverlay,
  UserMachineProfileReadModel
} from '../contracts/userMachineProfile';

export interface UserMachineProfileValidationIssue {
  field: string;
  message: string;
}

export interface UserMachineProfileRepository {
  getByProfileId(profileId: string): Promise<UserMachineProfileReadModel | null>;
  getDefaultProfile(
    userId: string,
    consumer: UserMachineProfileConsumer,
    workspaceId?: string,
  ): Promise<UserMachineProfileReadModel | null>;
  upsert(input: PersistUserMachineProfileInput): Promise<PersistUserMachineProfileResult>;
}

function findControllerPackage(
  machine: MachineCapabilitySnapshot,
  controllerId: string
): ControllerPackage | undefined {
  return machine.controllerPackages.find(
    (pkg) => pkg.controllerId === controllerId
  );
}

function featureIds(options: ControllerCapabilityOption[]): Set<string> {
  return new Set(options.map((option) => option.id));
}

function pushNumericRangeIssue(
  issues: UserMachineProfileValidationIssue[],
  field: string,
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
) {
  if (value == null) {
    return;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < minimum || numericValue > maximum) {
    issues.push({
      field,
      message: `${label} must be a number between ${minimum} and ${maximum}.`
    });
  }
}

export function validateUserMachineProfileOverlay(
  profile: UserMachineProfileOverlay
): UserMachineProfileValidationIssue[] {
  const issues: UserMachineProfileValidationIssue[] = [];
  const controllerPackage = findControllerPackage(
    profile.machine,
    profile.selectedControllerId
  );

  if (!controllerPackage) {
    issues.push({
      field: 'selectedControllerId',
      message: 'Selected controller is not available for this machine package.'
    });
  }

  if (controllerPackage) {
    const allowedFeatureIds = featureIds(controllerPackage.controlFeatures);

    for (const featureId of profile.enabledControllerFeatureIds) {
      if (!allowedFeatureIds.has(featureId)) {
        issues.push({
          field: 'enabledControllerFeatureIds',
          message: `Controller feature "${featureId}" is not available for the selected controller.`
        });
      }
    }
  }

  const spindlePackage = profile.machine.spindlePackages.find(
    (option) => option.id === profile.selectedSpindlePackageId
  );

  if (!spindlePackage) {
    issues.push({
      field: 'selectedSpindlePackageId',
      message: 'Selected spindle package is not available for this machine package.'
    });
  }

  const allowedCoolantIds = new Set(
    profile.machine.coolantStrategies.map((option) => option.id)
  );

  for (const coolantId of profile.enabledCoolantStrategyIds) {
    if (!allowedCoolantIds.has(coolantId)) {
      issues.push({
        field: 'enabledCoolantStrategyIds',
        message: `Coolant strategy "${coolantId}" is not available for this machine package.`
      });
    }
  }

  if (profile.toolingStationCountOverride != null) {
    const stationCount = Number(profile.toolingStationCountOverride);
    const isInteger = Number.isInteger(stationCount);
    if (!isInteger || stationCount < 1 || stationCount > 500) {
      issues.push({
        field: 'toolingStationCountOverride',
        message: 'Tooling station override must be a whole number between 1 and 500.'
      });
    }
  }

  const measured = profile.measuredPerformance;
  if (measured) {
    if (
      measured.guidewayType != null
      && measured.guidewayType !== 'box'
      && measured.guidewayType !== 'linear'
      && measured.guidewayType !== 'hydrostatic'
    ) {
      issues.push({
        field: 'measuredPerformance.guidewayType',
        message: 'Measured guideway type must be box, linear, or hydrostatic.'
      });
    }

    pushNumericRangeIssue(
      issues,
      'measuredPerformance.machineAgeYears',
      measured.machineAgeYears,
      0,
      80,
      'Measured machine age',
    );
    pushNumericRangeIssue(
      issues,
      'measuredPerformance.measuredPowerKw',
      measured.measuredPowerKw,
      0.1,
      1000,
      'Measured spindle power',
    );
    pushNumericRangeIssue(
      issues,
      'measuredPerformance.measuredMaxTorqueNm',
      measured.measuredMaxTorqueNm,
      0.1,
      100000,
      'Measured spindle torque',
    );
    pushNumericRangeIssue(
      issues,
      'measuredPerformance.measuredNaturalFrequencyHz',
      measured.measuredNaturalFrequencyHz,
      1,
      10000,
      'Measured natural frequency',
    );
    pushNumericRangeIssue(
      issues,
      'measuredPerformance.measuredSystemStiffnessNPerUm',
      measured.measuredSystemStiffnessNPerUm,
      1,
      10000,
      'Measured structural stiffness',
    );
    pushNumericRangeIssue(
      issues,
      'measuredPerformance.measuredDampingRatio',
      measured.measuredDampingRatio,
      0.001,
      0.5,
      'Measured damping ratio',
    );
    pushNumericRangeIssue(
      issues,
      'measuredPerformance.measuredAxisAccelerationMps2',
      measured.measuredAxisAccelerationMps2,
      0.1,
      100,
      'Measured axis acceleration',
    );
    pushNumericRangeIssue(
      issues,
      'measuredPerformance.measuredAxisJerkMps3',
      measured.measuredAxisJerkMps3,
      0.1,
      500,
      'Measured axis jerk',
    );
  }

  return issues;
}

export function buildUserMachineProfileReadModel(
  profile: UserMachineProfileOverlay
): UserMachineProfileReadModel {
  return {
    profile,
    supportedConsumers: [
      'calculator',
      'print_to_cnc',
      'program_release',
      'quote_builder',
      'shop_floor',
      'post_processing',
      'ops_planning'
    ],
    canDriveCalculatorSelections: true,
    canDriveProgramRelease: true,
    canDrivePrintToCnc: true,
    canDriveShopDefaults: true
  };
}

export class UserMachineProfileService {
  constructor(private readonly repository: UserMachineProfileRepository) {}

  async getProfile(profileId: string): Promise<UserMachineProfileReadModel | null> {
    return this.repository.getByProfileId(profileId);
  }

  async getDefaultProfile(
    userId: string,
    consumer: UserMachineProfileConsumer,
    workspaceId?: string,
  ): Promise<UserMachineProfileReadModel | null> {
    return this.repository.getDefaultProfile(userId, consumer, workspaceId);
  }

  async persistProfile(
    input: PersistUserMachineProfileInput
  ): Promise<PersistUserMachineProfileResult> {
    const issues = validateUserMachineProfileOverlay(input.profile);

    if (issues.length > 0) {
      const summary = issues.map((issue) => issue.message).join(' ');
      throw new Error(`Invalid user machine profile. ${summary}`);
    }

    await this.repository.getByProfileId(input.profile.profileId);
    return this.repository.upsert(input);
  }
}
