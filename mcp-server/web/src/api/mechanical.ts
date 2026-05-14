/**
 * Mechanical Design API Client
 * Calls /api/v1/mechanical/* endpoints
 */

import { fetchJson, getRequestHeaders } from './client';
import type {
  MechanicalResult,
  GearParams,
  GearResult,
  BearingParams,
  BearingResult,
  SpringParams,
  SpringResult,
  ShaftParams,
  ShaftResult,
  FastenerParams,
  FastenerResult,
  CouplingParams,
  CouplingResult,
  BrakeParams,
  BrakeResult,
  DrivetrainParams,
  DrivetrainResult,
  MechanicalCategory,
} from '../types/mechanical';

const API_BASE = '/api/v1/mechanical';

// ─── Generic calculation function ──────────────────────────────────────────

export async function calculateMechanical<T>(
  category: string,
  action: string,
  params: object
): Promise<MechanicalResult<T>> {
  const response = await fetchJson<MechanicalResult<T>>(
    `${API_BASE}${category}/${action}`,
    {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify(params),
    }
  );
  return response;
}

// ─── Gear Calculations ─────────────────────────────────────────────────────

export async function calculateBevelGear(params: GearParams): Promise<MechanicalResult<GearResult>> {
  return calculateMechanical<GearResult>('/gear', 'bevel_gear_calculate', params);
}

export async function calculateWormGear(params: GearParams): Promise<MechanicalResult<GearResult>> {
  return calculateMechanical<GearResult>('/gear', 'worm_gear_calculate', params);
}

export async function calculatePlanetaryGear(params: GearParams): Promise<MechanicalResult<GearResult>> {
  return calculateMechanical<GearResult>('/gear', 'planetary_gear_calculate', params);
}

export async function calculateGearTrain(params: GearParams): Promise<MechanicalResult<GearResult>> {
  return calculateMechanical<GearResult>('/gear', 'gear_train_calculate', params);
}

export async function calculateHypoidGear(params: GearParams): Promise<MechanicalResult<GearResult>> {
  return calculateMechanical<GearResult>('/gear', 'hypoid_gear_calculate', params);
}

export async function calculateRackPinion(params: GearParams): Promise<MechanicalResult<GearResult>> {
  return calculateMechanical<GearResult>('/gear', 'rack_pinion_calculate', params);
}

export async function calculateHarmonicDrive(params: GearParams): Promise<MechanicalResult<GearResult>> {
  return calculateMechanical<GearResult>('/gear', 'harmonic_drive_calculate', params);
}

// ─── Bearing Calculations ──────────────────────────────────────────────────

export async function selectBearing(params: BearingParams): Promise<MechanicalResult<BearingResult>> {
  return calculateMechanical<BearingResult>('/bearing', 'bearing_select', params);
}

export async function calculateRollingBearing(params: BearingParams): Promise<MechanicalResult<BearingResult>> {
  return calculateMechanical<BearingResult>('/bearing', 'rolling_bearing_calculate', params);
}

export async function calculateJournalBearing(params: BearingParams): Promise<MechanicalResult<BearingResult>> {
  return calculateMechanical<BearingResult>('/bearing', 'journal_bearing_calculate', params);
}

export async function calculateRollingContact(params: BearingParams): Promise<MechanicalResult<BearingResult>> {
  return calculateMechanical<BearingResult>('/bearing', 'rolling_contact_calculate', params);
}

// ─── Spring Calculations ───────────────────────────────────────────────────

export async function calculateSpring(params: SpringParams): Promise<MechanicalResult<SpringResult>> {
  return calculateMechanical<SpringResult>('/spring', 'spring_calculate', params);
}

export async function designSpring(params: SpringParams): Promise<MechanicalResult<SpringResult>> {
  return calculateMechanical<SpringResult>('/spring', 'spring_design', params);
}

export async function calculateLeafSpring(params: SpringParams): Promise<MechanicalResult<SpringResult>> {
  return calculateMechanical<SpringResult>('/spring', 'leaf_spring_calculate', params);
}

export async function calculateTorsionBar(params: SpringParams): Promise<MechanicalResult<SpringResult>> {
  return calculateMechanical<SpringResult>('/spring', 'torsion_bar_calculate', params);
}

// ─── Shaft Calculations ────────────────────────────────────────────────────

export async function calculateShaftAlignment(params: ShaftParams): Promise<MechanicalResult<ShaftResult>> {
  return calculateMechanical<ShaftResult>('/shaft', 'shaft_alignment_calculate', params);
}

export async function calculateKeyway(params: ShaftParams): Promise<MechanicalResult<ShaftResult>> {
  return calculateMechanical<ShaftResult>('/shaft', 'keyway_design_calculate', params);
}

export async function calculateKeywayStress(params: ShaftParams): Promise<MechanicalResult<ShaftResult>> {
  return calculateMechanical<ShaftResult>('/shaft', 'keyway_stress_calculate', params);
}

export async function calculateSplineJoint(params: ShaftParams): Promise<MechanicalResult<ShaftResult>> {
  return calculateMechanical<ShaftResult>('/shaft', 'spline_joint_calculate', params);
}

export async function calculateSplineStress(params: ShaftParams): Promise<MechanicalResult<ShaftResult>> {
  return calculateMechanical<ShaftResult>('/shaft', 'spline_stress_calculate', params);
}

export async function designCrankshaft(params: ShaftParams): Promise<MechanicalResult<ShaftResult>> {
  return calculateMechanical<ShaftResult>('/shaft', 'crankshaft_design', params);
}

// ─── Fastener Calculations ─────────────────────────────────────────────────

export async function calculateBoltTorque(params: FastenerParams): Promise<MechanicalResult<FastenerResult>> {
  return calculateMechanical<FastenerResult>('/fastener', 'bolt_torque_calculate', params);
}

export async function calculateBoltedJoint(params: FastenerParams): Promise<MechanicalResult<FastenerResult>> {
  return calculateMechanical<FastenerResult>('/fastener', 'bolted_joint_calculate', params);
}

export async function calculateRivetJoint(params: FastenerParams): Promise<MechanicalResult<FastenerResult>> {
  return calculateMechanical<FastenerResult>('/fastener', 'rivet_joint_calculate', params);
}

export async function calculateFlangeBolt(params: FastenerParams): Promise<MechanicalResult<FastenerResult>> {
  return calculateMechanical<FastenerResult>('/fastener', 'flange_bolt_calculate', params);
}

// ─── Coupling Calculations ─────────────────────────────────────────────────

export async function calculateCoupling(params: CouplingParams): Promise<MechanicalResult<CouplingResult>> {
  return calculateMechanical<CouplingResult>('/coupling', 'coupling_calculate', params);
}

export async function selectCoupling(params: CouplingParams): Promise<MechanicalResult<CouplingResult>> {
  return calculateMechanical<CouplingResult>('/coupling', 'coupling_select', params);
}

export async function designClutch(params: CouplingParams): Promise<MechanicalResult<CouplingResult>> {
  return calculateMechanical<CouplingResult>('/coupling', 'clutch_design_calculate', params);
}

export async function calculateClutchBrake(params: CouplingParams): Promise<MechanicalResult<CouplingResult>> {
  return calculateMechanical<CouplingResult>('/coupling', 'clutch_brake_calculate', params);
}

// ─── Brake Calculations ────────────────────────────────────────────────────

export async function calculateDiskBrake(params: BrakeParams): Promise<MechanicalResult<BrakeResult>> {
  return calculateMechanical<BrakeResult>('/brake', 'disk_brake_calculate', params);
}

export async function calculateDrumBrake(params: BrakeParams): Promise<MechanicalResult<BrakeResult>> {
  return calculateMechanical<BrakeResult>('/brake', 'drum_brake_calculate', params);
}

export async function calculateShockAbsorber(params: BrakeParams): Promise<MechanicalResult<BrakeResult>> {
  return calculateMechanical<BrakeResult>('/brake', 'shock_absorber_calculate', params);
}

// ─── Drivetrain Calculations ───────────────────────────────────────────────

export async function calculateBeltDrive(params: DrivetrainParams): Promise<MechanicalResult<DrivetrainResult>> {
  return calculateMechanical<DrivetrainResult>('/drivetrain', 'belt_drive_calculate', params);
}

export async function calculateChainDrive(params: DrivetrainParams): Promise<MechanicalResult<DrivetrainResult>> {
  return calculateMechanical<DrivetrainResult>('/drivetrain', 'chain_drive_calculate', params);
}

export async function calculateBallScrew(params: DrivetrainParams): Promise<MechanicalResult<DrivetrainResult>> {
  return calculateMechanical<DrivetrainResult>('/drivetrain', 'ball_screw_calculate', params);
}

export async function selectBallScrew(params: DrivetrainParams): Promise<MechanicalResult<DrivetrainResult>> {
  return calculateMechanical<DrivetrainResult>('/drivetrain', 'ball_screw_select', params);
}

export async function calculateLinearGuide(params: DrivetrainParams): Promise<MechanicalResult<DrivetrainResult>> {
  return calculateMechanical<DrivetrainResult>('/drivetrain', 'linear_guide_calculate', params);
}

export async function calculateLinearMotion(params: DrivetrainParams): Promise<MechanicalResult<DrivetrainResult>> {
  return calculateMechanical<DrivetrainResult>('/drivetrain', 'linear_motion_calculate', params);
}

// ─── Get available actions ─────────────────────────────────────────────────

export async function getMechanicalActions(): Promise<{ categories: MechanicalCategory[] }> {
  const response = await fetchJson<{ categories: MechanicalCategory[] }>(
    `${API_BASE}/actions`,
    {
      method: 'GET',
      headers: getRequestHeaders(),
    }
  );
  return response;
}
