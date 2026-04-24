export type UserMachineProfileConsumer =
  | 'calculator'
  | 'print_to_cnc'
  | 'program_release'
  | 'quote_builder'
  | 'shop_floor'
  | 'post_processing'
  | 'ops_planning';

export type MachineOptionSource =
  | 'registry'
  | 'catalog'
  | 'user_override'
  | 'dealer_spec'
  | 'shop_audit'
  | 'inferred';

export type MachineAxisTopology =
  | '3_axis_vertical'
  | '4_axis_vertical'
  | '5_axis_vertical'
  | '3_axis_horizontal'
  | '4_axis_horizontal'
  | '5_axis_horizontal'
  | '2_axis_lathe'
  | 'y_axis_lathe'
  | 'sub_spindle_lathe'
  | 'mill_turn'
  | 'swiss'
  | 'vtl'
  | 'wire_edm'
  | 'sinker_edm'
  | 'laser'
  | 'waterjet'
  | 'router'
  | 'additive'
  | 'hybrid'
  | 'other';

export type MachineGuidewayType = 'box' | 'linear' | 'hydrostatic';

export interface MachineOptionAvailability {
  enabled: boolean;
  source: MachineOptionSource;
  confidence?: number;
  notes?: string[];
}

export interface ControllerCapabilityOption {
  id: string;
  label: string;
  availability: MachineOptionAvailability;
}

export interface SpindlePackageOption {
  id: string;
  label: string;
  taper?: string;
  maxRpm?: number;
  maxPowerHp?: number;
  maxTorqueFtLb?: number;
  availability: MachineOptionAvailability;
}

export interface CoolantStrategyOption {
  id: string;
  label: string;
  availability: MachineOptionAvailability;
}

export interface ControllerPackage {
  controllerId: string;
  controllerLabel: string;
  controlFeatures: ControllerCapabilityOption[];
}

export interface KinematicPackage {
  familyId: string;
  familyLabel: string;
  topology: MachineAxisTopology;
  travelXIn?: number;
  travelYIn?: number;
  travelZIn?: number;
  maxPartDiameterIn?: number;
  maxPartLengthIn?: number;
  maxPartWeightLb?: number;
}

export interface MachineCapabilitySnapshot {
  machineId: string;
  canonicalMachineId: string;
  packageId: string;
  manufacturerId: string;
  manufacturerLabel: string;
  modelLabel: string;
  familyId: string;
  familyLabel: string;
  controllerPackages: ControllerPackage[];
  spindlePackages: SpindlePackageOption[];
  coolantStrategies: CoolantStrategyOption[];
  kinematics: KinematicPackage;
  guidewayType?: MachineGuidewayType;
  naturalFrequencyHz?: number;
  axisAccelerationMps2?: number;
  axisJerkMps3?: number;
  sourceRecords: string[];
}

export interface MachineSoftwareBinding {
  softwareId: string;
  label: string;
  postProcessorId?: string;
  postProcessorLabel?: string;
  postRevision?: string;
  verifiedForMachine?: boolean;
}

export interface MachineMeasuredPerformanceOverlay {
  guidewayType?: MachineGuidewayType;
  machineAgeYears?: number;
  measuredPowerKw?: number;
  measuredMaxTorqueNm?: number;
  measuredNaturalFrequencyHz?: number;
  measuredSystemStiffnessNPerUm?: number;
  measuredDampingRatio?: number;
  measuredAxisAccelerationMps2?: number;
  measuredAxisJerkMps3?: number;
  notes?: string[];
}

export interface UserMachineProfileOverlay {
  profileId: string;
  userId: string;
  workspaceId?: string;
  displayName: string;
  machine: MachineCapabilitySnapshot;
  selectedControllerId: string;
  enabledControllerFeatureIds: string[];
  enabledMachineFeatureIds?: string[];
  selectedSpindlePackageId: string;
  enabledCoolantStrategyIds: string[];
  toolingStationCountOverride?: number;
  measuredPerformance?: MachineMeasuredPerformanceOverlay;
  enabledWorkholdingIds?: string[];
  enabledProbeIds?: string[];
  enabledAutomationIds?: string[];
  enabledSoftwareBindings?: MachineSoftwareBinding[];
  preferredMaterials?: string[];
  preferredToolingFamilies?: string[];
  preferredToolpathFamilies?: string[];
  notes?: string[];
  tags?: string[];
  lastAuditedAt?: string;
  lastAuditedBy?: string;
}

export interface UserMachineProfileReadModel {
  profile: UserMachineProfileOverlay;
  supportedConsumers: UserMachineProfileConsumer[];
  canDriveCalculatorSelections: boolean;
  canDriveProgramRelease: boolean;
  canDrivePrintToCnc: boolean;
  canDriveShopDefaults: boolean;
}

export interface PersistUserMachineProfileInput {
  profile: UserMachineProfileOverlay;
  consumer: UserMachineProfileConsumer;
  source: MachineOptionSource;
  expectedVersion?: number;
  makeDefault?: boolean;
}

export interface PersistUserMachineProfileResult {
  profile: UserMachineProfileReadModel;
  created: boolean;
  updated: boolean;
  version: number;
  defaulted: boolean;
}
