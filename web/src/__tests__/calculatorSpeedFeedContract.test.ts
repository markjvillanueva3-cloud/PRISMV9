import { describe, expect, it } from 'vitest';
import type { HolderPackageOption } from '../api/calculatorData';
import type { MachineCatalogItem, MaterialCatalogItem, ToolCatalogItem } from '../data/calculatorWorkspace';
import {
  buildCalculatorSpeedFeedParams,
  classifyCalculatorResultSafetyPosture,
  normalizeCalculatorSpeedFeedResult,
} from '../utils/calculatorSpeedFeedContract';

const okumaMill: MachineCatalogItem = {
  id: 'okuma-genos-m460v-5ax',
  mode: 'mill',
  manufacturer: 'Okuma',
  model: 'GENOS M460V-5AX',
  machineTypeId: 'mill_vertical_5',
  machineTypeLabel: '5-Axis Vertical',
  family: '5-Axis Vertical Machining Center',
  spindleRpm: 15000,
  powerHp: 30,
  envelope: '762 x 460 x 460 mm',
  axes: '5-axis',
  coolant: 'Flood + TSC + through-air + air blast',
  coolantOptionIds: ['flood', 'tsc', 'through_air', 'air'],
  controllerOptions: [
    { id: 'osp-p300ma-h', label: 'Okuma OSP-P300MA-H', detail: 'CAS, Machining Navi, and high-speed machining support.' },
  ],
  spindleOptions: [
    { id: 'm460v-big-plus', label: '15,000 RPM CAT 40 Big+', detail: 'Big Plus 40 taper with through-air and through-spindle coolant.' },
  ],
  taxonomy: {
    mode: 'mill',
    familyId: 'mill-vertical',
    familyLabel: '5-Axis Vertical Machining Center',
    machineTypeId: 'mill_vertical_5',
    machineTypeLabel: '5-Axis Vertical',
    axisClass: '5-axis',
    orientation: 'vertical',
  },
  notes: [],
  bestFor: [],
  toolingLayout: {
    kind: 'magazine',
    stations: 48,
    stationOptions: [30, 48, 60],
    allowCustomStations: true,
    interface: 'CAT 40 Big+',
    interfaceId: 'cat40-big-plus',
    spindleConnectionTypeId: 'cat40-big-plus',
    spindleConnectionLabel: 'CAT 40 Big+',
  },
  guidewayType: 'box',
  naturalFrequencyHz: 680,
  axisAccelerationMps2: 5.5,
  axisJerkMps3: 12,
};

const multitaskLathe: MachineCatalogItem = {
  id: 'okuma-multus-u3000',
  mode: 'lathe',
  manufacturer: 'Okuma',
  model: 'MULTUS U3000',
  machineTypeId: 'lathe_multitask',
  machineTypeLabel: 'Mill-Turn / Multi-Tasking',
  family: 'Mill-Turn / Multi-Tasking Center',
  spindleRpm: 5000,
  powerHp: 40,
  envelope: '10 in chuck',
  axes: 'Turning + B-axis',
  coolant: 'Flood + through-tool',
  coolantOptionIds: ['flood', 'tsc'],
  controllerOptions: [
    { id: 'osp-p300la', label: 'Okuma OSP-P300LA', detail: 'Multi-tasking lathe control with milling head support.' },
  ],
  spindleOptions: [
    { id: 'multus-main', label: '5,000 RPM Main spindle', detail: 'CAPTO C6 B-axis milling head with live tooling.' },
  ],
  taxonomy: {
    mode: 'lathe',
    familyId: 'lathe-multitask',
    familyLabel: 'Mill-Turn / Multi-Tasking Center',
    machineTypeId: 'lathe_multitask',
    machineTypeLabel: 'Mill-Turn / Multi-Tasking',
    axisClass: 'turning',
    orientation: 'multitask',
  },
  notes: [],
  bestFor: [],
  toolingLayout: {
    kind: 'turret',
    stations: 40,
    interface: 'CAPTO C6',
    interfaceId: 'capto-c6',
    turretTypeId: 'capto-c6',
    turretTypeLabel: 'CAPTO C6',
    turretCount: 1,
    hasSubSpindle: true,
    hasMillingHead: true,
    millingHeadLabel: 'B-axis milling head',
    liveTooling: true,
    liveRpm: 10000,
  },
};

const toolSteel: MaterialCatalogItem = {
  id: 'h13-annealed',
  group: 'tool_steel',
  groupLabel: 'Tool steel',
  subcategoryId: 'h13',
  subcategoryLabel: 'H13',
  conditionId: 'annealed',
  conditionLabel: 'Annealed',
  familyLabel: 'Hot work tool steel',
  isoGroup: 'H',
  name: 'H13',
  hardness: '46 HRC',
  baseSfm: 95,
  machinability: 'Moderate',
  chipControl: 'Short',
  note: 'Hot-work tool steel baseline.',
  idealCoolant: 'Through-spindle coolant',
};

const alloySteel: MaterialCatalogItem = {
  id: '4140-ph',
  group: 'steel',
  isoGroup: 'P',
  name: '4140 PH',
  hardness: '28 HRC',
  baseSfm: 210,
  machinability: 'Good',
  chipControl: 'Medium',
  note: 'Prehard alloy steel.',
  idealCoolant: 'Flood',
};

const carbideEndmill: ToolCatalogItem = {
  id: 'vh-12-carbide',
  mode: 'mill',
  family: 'Variable-helix endmill',
  label: '12 mm variable-helix endmill',
  description: '5-flute high-speed finishing endmill',
  holder: 'Shrink-fit',
  coating: 'AlTiN',
  defaultDiameter: 12,
  defaultFlutes: 5,
  operation: 'finishing',
  toolMaterialClass: 'carbide',
  geometryClass: 'variable-helix-endmill',
  edgePrep: 'sharp',
  cornerRadiusMm: 0.5,
  helixAngleDeg: 42,
  wiperGeometry: false,
};

const ballEndmill: ToolCatalogItem = {
  id: 'ball-635-carbide',
  mode: 'mill',
  family: 'Ball endmill',
  label: '6.35 mm ball endmill',
  description: '2-flute carbide ball endmill for steep-wall finishing',
  holder: 'Shrink-fit',
  coating: 'AlTiN',
  defaultDiameter: 6.35,
  defaultFlutes: 2,
  operation: 'finishing',
  toolMaterialClass: 'carbide',
  geometryClass: 'ball-endmill',
  edgePrep: 'sharp',
  helixAngleDeg: 35,
  wiperGeometry: false,
};

const turningInsert: ToolCatalogItem = {
  id: 'cnmg-432-rougher',
  mode: 'lathe',
  family: 'Roughing insert',
  label: 'CNMG roughing insert',
  description: 'General-purpose rough turning insert',
  holder: 'CAPTO C6',
  coating: 'CVD',
  defaultDiameter: 12,
  defaultFlutes: 1,
  operation: 'turning_rough',
  toolMaterialClass: 'carbide',
  geometryClass: 'roughing-insert',
  edgePrep: 'honed',
  noseRadiusMm: 0.8,
  insertType: 'CNMG',
  insertCount: 1,
};

const shrinkFitHolder: HolderPackageOption = {
  id: 'shrink-fit-cat40',
  mode: 'mill',
  brandId: 'haimer',
  brandLabel: 'Haimer',
  holderStyleId: 'shrink-fit',
  holderStyleIds: ['shrink-fit'],
  holderType: 'Shrink-fit holder',
  spindleInterface: 'CAT 40 Big+',
  label: 'Shrink-fit CAT40 Big+',
  detail: 'Balanced shrink-fit finish holder',
};

const captoLatheHolder: HolderPackageOption = {
  id: 'capto-c6-turning',
  mode: 'lathe',
  brandId: 'sandvik',
  brandLabel: 'Sandvik',
  holderStyleId: 'milling-head',
  holderStyleIds: ['milling-head'],
  holderType: 'CAPTO C6 live-tool holder',
  holderSubcategory: 'Live tooling',
  spindleInterface: 'CAPTO C6',
  compatibleTurretTypeIds: ['capto-c6'],
  requiresLiveTooling: true,
  requiresMillingHead: true,
  label: 'CAPTO C6 live-tool holder',
  detail: 'Rigid live-tool holder for multi-tasking centers',
};

describe('calculatorSpeedFeedContract', () => {
  it('builds a mill payload with canonical machine, holder, coolant, and DOC/WOC fields', () => {
    const params = buildCalculatorSpeedFeedParams({
      machineMode: 'mill',
      machine: okumaMill,
      controllerOption: okumaMill.controllerOptions[0],
      spindleOption: okumaMill.spindleOptions[0],
      enabledControllerCapabilityIds: ['cas', 'high-speed-machining'],
      enabledMachineCoolantIds: ['flood', 'tsc', 'through_air', 'air'],
      material: toolSteel,
      tool: carbideEndmill,
      insertOption: null,
      holderPackage: shrinkFitHolder,
      operationId: 'surface_finish',
      toolpathTypeId: 'surface_finish',
      toolpath: {
        id: 'mc-parallel',
        label: 'Surface Finish Parallel',
        path: 'Finishing / Parallel',
        operationId: 'finishing',
      },
      programming: { id: 'mastercam-mill', label: 'Mastercam Mill', vendor: 'Mastercam' },
      toolDiameterMm: 12,
      docMm: 0.35,
      wocMm: 1.2,
      flutes: 5,
      toolStickoutMm: 58,
      fluteLengthMm: 28,
      stockShape: 'plate',
      stockXm: 152.4,
      stockYm: 101.6,
      stockZm: 38.1,
      coolantId: 'tsc',
      workholdingId: 'fixture-plate',
      workholdingCategoryId: 'fixture',
      workholdingPreset: { id: 'trunnion-fixture', label: 'Trunnion fixture' },
      stabilityId: 'aggressive-rigid',
      desiredRaUm: 0.8,
      finishTarget: 'precision',
    });

    expect(params.machine_name).toBe('Okuma GENOS M460V-5AX');
    expect(params.machine).toBe('Okuma GENOS M460V-5AX');
    expect(params.machinePackage?.name).toBe('Okuma GENOS M460V-5AX');
    expect(params.machinePackage?.spindle?.max_rpm).toBe(15000);
    expect(params.machinePackage?.spindle?.power_kw).toBe(params.machine_power_kw);
    expect(params.machinePackage?.spindle?.power).toBe(params.machine_power_kw);
    expect(params.machinePackage?.confidence?.overall).toBeGreaterThanOrEqual(0.5);
    expect(params.machinePackage?.axes?.count).toBe(5);
    expect(params.machine_type).toBe('5axis');
    expect(params.spindle_taper).toBe('CAT40');
    expect(params.machine_guideway).toBe('box');
    expect(params.natural_frequency_hz).toBe(680);
    expect(params.machine_axis_accel_m_s2).toBe(5.5);
    expect(params.machine_axis_jerk_m_s3).toBe(12);
    expect(params.tool_material).toBe('carbide');
    expect(params.holder_type).toBe('shrink_fit');
    expect(params.coolant_type).toBe('through_tool');
    expect(params.axial_depth_mm).toBe(0.35);
    expect(params.radial_depth_mm).toBe(1.2);
    expect(params.radial_depth_pct).toBe(10);
    expect(params.flutes).toBe(5);
    expect(params.cam_system).toBe('Mastercam');
    expect(params.cam_strategy).toBe('Surface Finish Parallel');
    expect(params.workholding_type).toBe('fixture');
    expect(params.optimize_for).toBe('surface_finish');
    expect(params.output_detail).toBe('full');
  });

  it('prefers measured machine posture and verified features when deriving machine dynamics', () => {
    const params = buildCalculatorSpeedFeedParams({
      machineMode: 'mill',
      machine: okumaMill,
      controllerOption: okumaMill.controllerOptions[0],
      spindleOption: okumaMill.spindleOptions[0],
      enabledControllerCapabilityIds: ['cas'],
      enabledMachineFeatureIds: ['high-speed-modes'],
      enabledMachineCoolantIds: ['flood', 'tsc', 'through_air', 'air'],
      measuredMachineData: {
        guidewayType: 'linear',
        machineAgeYears: 9,
        measuredPowerKw: 24.6,
        measuredMaxTorqueNm: 102,
        measuredNaturalFrequencyHz: 910,
        measuredSystemStiffnessNPerUm: 88,
        measuredDampingRatio: 0.041,
        measuredAxisAccelerationMps2: 7.2,
        measuredAxisJerkMps3: 18.5,
      },
      material: toolSteel,
      tool: carbideEndmill,
      insertOption: null,
      holderPackage: shrinkFitHolder,
      operationId: 'surface_finish',
      toolpathTypeId: 'surface_finish',
      toolpath: {
        id: 'mc-parallel',
        label: 'Surface Finish Parallel',
        path: 'Finishing / Parallel',
        operationId: 'finishing',
      },
      programming: { id: 'mastercam-mill', label: 'Mastercam Mill', vendor: 'Mastercam' },
      toolDiameterMm: 10,
      docMm: 0.25,
      wocMm: 0.8,
      flutes: 5,
      toolStickoutMm: 54,
      fluteLengthMm: 24,
      stockShape: 'plate',
      stockXm: 100,
      stockYm: 80,
      stockZm: 35,
      coolantId: 'tsc',
      workholdingId: 'fixture-plate',
      workholdingCategoryId: 'fixture',
      stabilityId: 'production-stable',
      desiredRaUm: 0.8,
      finishTarget: 'precision',
    });

    expect(params.machine_guideway).toBe('linear');
    expect(params.machine_age_years).toBe(9);
    expect(params.machine_power_kw).toBe(24.6);
    expect(params.machine_max_torque_nm).toBe(102);
    expect(params.machinePackage?.spindle?.power_kw).toBe(24.6);
    expect(params.machinePackage?.spindle?.power_continuous_kw).toBe(24.6);
    expect(params.machinePackage?.spindle?.max_torque_nm).toBe(102);
    expect(params.machinePackage?.confidence?.spindle).toBeGreaterThanOrEqual(0.5);
    expect(params.natural_frequency_hz).toBe(910);
    expect(params.system_stiffness_n_m).toBe(88);
    expect(params.damping_ratio).toBe(0.041);
    expect(params.machine_axis_accel_m_s2).toBe(7.2);
    expect(params.machine_axis_jerk_m_s3).toBe(18.5);
  });

  it('does not mistake FeatureFlow adaptive roughing for a finishing flowline path', () => {
    const params = buildCalculatorSpeedFeedParams({
      machineMode: 'mill',
      machine: okumaMill,
      controllerOption: okumaMill.controllerOptions[0],
      spindleOption: okumaMill.spindleOptions[0],
      enabledControllerCapabilityIds: ['high-speed-machining'],
      enabledMachineCoolantIds: ['flood', 'tsc'],
      material: alloySteel,
      tool: carbideEndmill,
      insertOption: null,
      holderPackage: shrinkFitHolder,
      operationId: 'roughing',
      toolpathTypeId: 'roughing',
      toolpath: {
        id: 'prism-featureflow-rough',
        label: 'FeatureFlow Adaptive Roughing',
        path: 'PRISM > FeatureFlow > Adaptive Roughing',
        operationId: 'roughing',
      },
      programming: { id: 'prism-mill', label: 'PRISM Mill', vendor: 'PRISM' },
      toolDiameterMm: 12,
      docMm: 18,
      wocMm: 1.2,
      flutes: 5,
      toolStickoutMm: 58,
      fluteLengthMm: 28,
      stockShape: 'plate',
      stockXm: 152.4,
      stockYm: 101.6,
      stockZm: 38.1,
      coolantId: 'tsc',
      workholdingId: 'fixture-plate',
      workholdingCategoryId: 'fixture',
      stabilityId: 'aggressive-rigid',
      desiredRaUm: null,
      finishTarget: 'high-removal',
    });

    expect(params.cut_type).toBe('roughing');
    expect(params.strategy).toBe('adaptive');
    expect(params.optimize_for).toBe('productivity');
  });

  it('builds a lathe payload that stays in turning mode and filters flutes to one insert edge', () => {
    const params = buildCalculatorSpeedFeedParams({
      machineMode: 'lathe',
      machine: multitaskLathe,
      controllerOption: multitaskLathe.controllerOptions[0],
      spindleOption: multitaskLathe.spindleOptions[0],
      enabledControllerCapabilityIds: ['machining-navi'],
      enabledMachineCoolantIds: ['flood', 'tsc'],
      material: alloySteel,
      tool: turningInsert,
      insertOption: {
        id: 'gc4325',
        label: 'GC4325',
        detail: 'CVD roughing grade',
        insertType: 'CNMG',
        insertGrade: 'GC4325',
        recommendationScore: 0.96,
        recommendationReason: 'Roughing grade for alloy steel',
        recommended: true,
      },
      holderPackage: captoLatheHolder,
      operationId: 'turning_rough',
      toolpathTypeId: 'turning_rough',
      toolpath: {
        id: 'rough-turn',
        label: 'OD Rough Turn',
        path: 'Turning / Rough',
        operationId: 'turning_rough',
      },
      programming: { id: 'manual-lathe', label: 'Manual Programming', vendor: 'Manual' },
      toolDiameterMm: 12,
      docMm: 2.2,
      wocMm: 0.35,
      flutes: 4,
      toolStickoutMm: 32,
      fluteLengthMm: 10,
      stockShape: 'round',
      stockXm: 180,
      stockYm: 50,
      stockZm: 50,
      coolantId: 'flood',
      workholdingId: 'chuck-jaws',
      workholdingCategoryId: 'chucking',
      workholdingPreset: { id: 'three-jaw-chuck', label: '3-jaw chuck' },
      stabilityId: 'production-stable',
      desiredRaUm: 6.3,
      finishTarget: 'balanced',
    });

    expect(params.machine_name).toBe('Okuma MULTUS U3000');
    expect(params.machine_type).toBe('lathe');
    expect(params.operation).toBe('turning');
    expect(params.flutes).toBe(1);
    expect(params.insert_grade).toBe('GC4325');
    expect(params.holder_type).toBe('milling_chuck');
    expect(params.coolant_type).toBe('flood');
    expect(params.workholding_type).toBe('chuck');
    expect(params.axial_depth_mm).toBe(2.2);
    expect(params.radial_depth_mm).toBe(0.35);
    expect(params.workpiece_diameter_mm).toBe(50);
  });

  it('defaults a ball endmill corner radius to half the tool diameter for finish calculations', () => {
    const params = buildCalculatorSpeedFeedParams({
      machineMode: 'mill',
      machine: okumaMill,
      controllerOption: okumaMill.controllerOptions[0],
      spindleOption: okumaMill.spindleOptions[0],
      enabledControllerCapabilityIds: [],
      enabledMachineCoolantIds: ['flood', 'tsc'],
      material: toolSteel,
      tool: ballEndmill,
      insertOption: null,
      holderPackage: shrinkFitHolder,
      operationId: 'finishing',
      toolpathTypeId: 'surface_finish',
      toolpath: {
        id: 'ts-zlevel',
        label: 'Z-Level',
        path: 'Machining > 3D > Z-Level',
        operationId: 'finishing',
      },
      programming: { id: 'topsolid-mill', label: 'TopSolid Mill', vendor: 'TopSolid' },
      toolDiameterMm: 6.35,
      docMm: 1.2,
      wocMm: 1.5,
      flutes: 2,
      toolStickoutMm: 45,
      fluteLengthMm: 18,
      stockShape: 'round',
      stockXm: 80,
      stockYm: 80,
      stockZm: 40,
      coolantId: 'tsc',
      workholdingId: 'fixture-plate',
      workholdingCategoryId: 'fixture',
      stabilityId: 'production-stable',
      desiredRaUm: 1.6,
      finishTarget: 'tight-finish',
    });

    expect(params.corner_radius_mm).toBe(3.175);
  });

  it('normalizes the nested speed/feed response into calculator-friendly output', () => {
    const normalized = normalizeCalculatorSpeedFeedResult({
      result: {
        value: {
          spindle_rpm: 4120,
          cutting_speed_mpm: 155,
          feed_rate_mmmin: 845,
          feed_per_tooth_mm: 0.041,
          power_kw: 4.2,
          torque_Nm: 19.4,
          mrr_cm3min: 84,
          tool_life_min: 46,
          surface_finish_Ra_um: 1.1,
          axial_depth_mm: 0.35,
          radial_depth_mm: 1.2,
          overall_confidence: 0.87,
          resolved_machine: { name: { value: 'Okuma GENOS M460V-5AX' } },
          resolved_cam_strategy: { strategy_name: { value: 'Surface Finish Parallel' } },
          playbook_warnings: ['Watch tool stickout'],
          limiting_factors: [{ parameter: 'power', constraint: 'Near spindle load limit' }],
          safety_checks: [{ name: 'Torque margin', message: 'Within limit' }],
          formulas_used: ['Kienzle force model'],
          engines_called: ['SpeedFeedOrchestratorEngine'],
          recommendations: ['Use through-spindle coolant for tool life'],
        },
      },
    });

    expect(normalized.rpm).toBe(4120);
    expect(normalized.feedRate).toBe(845);
    expect(normalized.formula).toBe('Kienzle force model');
    expect(normalized.resolvedMachineLabel).toBe('Okuma GENOS M460V-5AX');
    expect(normalized.resolvedCamLabel).toBe('Surface Finish Parallel');
    expect(normalized.warnings).toContain('Watch tool stickout');
    expect(normalized.warnings).toContain('power: Near spindle load limit');
    expect(normalized.recommendations).toContain('Use through-spindle coolant for tool life');
  });

  it('reconstructs tiny-but-real power and Ra values when the engine rounds them to zero', () => {
    const normalized = normalizeCalculatorSpeedFeedResult({
      result: {
        value: {
          spindle_rpm: 855,
          cutting_speed_mpm: 17.1,
          feed_rate_mmmin: 18,
          feed_per_tooth_mm: 0.0102,
          power_kw: 0,
          torque_Nm: 0,
          tangential_force_N: 187,
          tool_life_min: 9999,
          surface_finish_Ra_um: 0,
          resolved_tool: {
            corner_radius_mm: { value: 3.175 },
          },
          formulas_used: ['Kienzle force model'],
          engines_called: ['SpeedFeedOrchestratorEngine'],
        },
      },
    });

    expect(normalized.powerKw).toBeGreaterThan(0);
    expect(normalized.torqueNm).toBeGreaterThan(0);
    expect(normalized.ra).toBeGreaterThan(0);
    expect(normalized.toolLife).toBeUndefined();
    expect(normalized.warnings).toContain(
      'Tool life estimate exceeded the modeled range; verify wear on-machine before treating it as open-ended.',
    );
  });

  it('downgrades quick fallback solves with caution signals to verify-before-release', () => {
    const posture = classifyCalculatorResultSafetyPosture(
      {
        rpm: 4120,
        feedRate: 845,
        cuttingSpeed: 155,
        powerKw: 4.2,
        torqueNm: 19.4,
        toolLife: 46,
        ra: 1.1,
        warnings: ['Watch tool stickout'],
        recommendations: [],
        safetyChecks: ['Torque margin: Within limit'],
        limitingFactors: [{ parameter: 'power', constraint: 'Near spindle load limit' }]
          .map((entry) => `${entry.parameter}: ${entry.constraint}`),
        formulas: ['Kienzle force model'],
        engines: ['SpeedFeedOrchestratorEngine'],
        confidence: 0.82,
      },
      { livePhysics: true, solveSource: 'quick', setupCompleteness: 96 },
    );

    expect(posture.status).toBe('verify-before-release');
    expect(posture.releaseBlocked).toBe(true);
    expect(posture.solveSourceLabel).toBe('Quick fallback estimate');
  });

  it('does not treat setup completeness as solver confidence when the engine omits confidence', () => {
    const posture = classifyCalculatorResultSafetyPosture(
      {
        rpm: 4120,
        feedRate: 845,
        cuttingSpeed: 155,
        powerKw: 4.2,
        torqueNm: 19.4,
        toolLife: 46,
        ra: 1.1,
        warnings: [],
        recommendations: [],
        safetyChecks: [],
        limitingFactors: [],
        formulas: ['Kienzle force model'],
        engines: ['SpeedFeedOrchestratorEngine'],
      },
      { livePhysics: true, solveSource: 'orchestrate', setupCompleteness: 100 },
    );

    expect(posture.status).toBe('verify-before-release');
    expect(posture.releaseBlocked).toBe(true);
    expect(posture.heading).toMatch(/without an explicit confidence score/i);
    expect(posture.confidencePct).toBe(0);
  });

  it('blocks release when the live solve returns critical safety signals', () => {
    const posture = classifyCalculatorResultSafetyPosture(
      {
        rpm: 3100,
        feedRate: 420,
        cuttingSpeed: 118,
        powerKw: 6.8,
        torqueNm: 24.2,
        toolLife: 18,
        ra: 2.4,
        warnings: ['Spindle overload risk on current setup'],
        recommendations: [],
        safetyChecks: ['Spindle load: Critical overload predicted'],
        limitingFactors: ['power: Limit exceeded'],
        formulas: ['Kienzle force model'],
        engines: ['SpeedFeedOrchestratorEngine'],
        confidence: 0.41,
      },
      { livePhysics: true, solveSource: 'orchestrate', setupCompleteness: 100 },
    );

    expect(posture.status).toBe('do-not-run');
    expect(posture.releaseBlocked).toBe(true);
    expect(posture.label).toMatch(/do not run/i);
  });
});
