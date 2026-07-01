/**
 * machineActionSchemas.ts — Zod input schemas for prism_machine dispatcher
 *
 * All 13 Machine-domain engines wired in machineDispatcher.ts:
 *   MachineConfidenceCalculatorEngine · MachineConsumerBindingEngine
 *   MachineKinematicStateEngine · MachineLayerMerger
 *   MachineLoRABaseEngine · MachineModelAcquisitionEngine
 *   MachineModelDownloaderEngine · MachineOptionContractEngine
 *   MachineOptionMatrixEngine · MachinePackageAPIEngine
 *   MachinePackageSelectionEngine · MachineProfilePropagationEngine
 *   MachineToolErrorBudgetEngine
 *
 * @module schemas/machineActionSchemas
 * @milestone PSN-SYNERGY/MACHINE-WIRING (slot oscar)
 */

import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

export const EmptyInputSchema = z.object({}).passthrough();

// ─── MachineConfidenceCalculatorEngine ───────────────────────────────────────

export const ConfidenceCalculateSchema = z.object({
  pkg: z.record(z.string(), z.unknown()).describe("CanonicalMachinePackage object"),
  provenance: z.record(z.string(), z.unknown()).optional().default({}).describe("Field provenance map"),
});

export const ConfidenceQueueAmbiguitiesSchema = z.object({
  machineId: z.string().describe("Machine canonical ID"),
  ambiguities: z.array(z.record(z.string(), z.unknown())).describe("MachineAmbiguity[]"),
});

export const ConfidenceResolveAmbiguitySchema = z.object({
  ambiguityId: z.string().describe("Ambiguity ID to resolve"),
  resolution: z.object({
    value: z.unknown(),
    source: z.string(),
    note: z.string().optional(),
  }).describe("Resolution payload"),
});

export const ConfidenceDeferAmbiguitySchema = z.object({
  ambiguityId: z.string(),
  reason: z.string(),
});

export const ConfidenceClaimAmbiguitySchema = z.object({
  ambiguityId: z.string(),
  assignee: z.string(),
});

export const ConfidenceGetMachineAmbiguitiesSchema = z.object({
  machineId: z.string(),
});

export const ConfidenceIsCalculatorReadySchema = z.object({
  machineId: z.string(),
});

export const ConfidenceGetLowConfidenceMachinesSchema = z.object({
  threshold: z.number().min(0).max(1).optional().default(0.7),
});

// ─── MachineConsumerBindingEngine ─────────────────────────────────────────────

export const ConsumerBindSchema = z.object({
  shop_machine_id: z.string().describe("Shop machine identifier (e.g. 'LTH-01')"),
});

export const ConsumerForProgramReleaseSchema = z.object({
  shop_machine_id: z.string(),
});

export const ConsumerForPrintToCNCSchema = z.object({
  shop_machine_id: z.string(),
});

export const ConsumerForQuotingSchema = z.object({
  shop_machine_id: z.string(),
});

export const ConsumerForAllConsumersSchema = z.object({
  shop_machine_id: z.string(),
});

export const ConsumerInvalidateSchema = z.object({
  shop_machine_id: z.string(),
});

// ─── MachineKinematicStateEngine ──────────────────────────────────────────────

const ThermalAxisStateSchema = z.object({
  axis: z.enum(["X", "Y", "Z", "A", "B", "C"]),
  temperature_c: z.number(),
  stroke_mm: z.number().positive(),
  material: z.enum(["steel", "cast_iron", "aluminum", "granite", "ceramic"]).optional(),
  reference_temp_c: z.number().optional(),
});

const ServoAxisStateSchema = z.object({
  axis: z.enum(["X", "Y", "Z", "A", "B", "C"]),
  following_error_mean_mm: z.number().nonnegative(),
  baseline_following_error_mm: z.number().positive(),
  feed_rate_mpm: z.number().optional(),
});

export const KinematicUpdateSchema = z.object({
  snap: z.object({
    machine_id: z.string(),
    controller: z.enum(["fanuc", "siemens", "okuma", "heidenhain", "haas", "mazak", "generic"]),
    captured_at: z.string(),
    thermal: z.array(ThermalAxisStateSchema).min(1),
    servo: z.array(ServoAxisStateSchema),
    payload: z.object({ mass_kg: z.number(), rated_max_kg: z.number() }).optional(),
    ambient_temp_c: z.number().optional(),
    lookahead: z.object({ blocks_per_sec: z.number(), safety_margin: z.number().optional() }).optional(),
  }),
  tolerance_mm: z.number().positive().optional(),
});

export const KinematicGetLatestSchema = z.object({
  machine_id: z.string(),
});

export const KinematicGetHistorySchema = z.object({
  machine_id: z.string(),
});

export const KinematicServoLagTrendSchema = z.object({
  machine_id: z.string(),
  axis: z.enum(["X", "Y", "Z", "A", "B", "C"]),
});

export const KinematicRenderMarkdownSchema = z.object({
  derived_state: z.record(z.string(), z.unknown()).describe("DerivedState object"),
});

// ─── MachineLayerMerger ───────────────────────────────────────────────────────

export const LayerMergeSchema = z.object({
  inputs: z.array(z.object({
    machine: z.record(z.string(), z.unknown()).describe("Machine object"),
    layer: z.enum(["BASIC", "ENHANCED", "LEVEL5", "USER"]),
    source_id: z.string(),
    enriched_at: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  })).min(1),
});

// ─── MachineLoRABaseEngine ────────────────────────────────────────────────────

export const LoRABuildDatasetSchema = z.object({
  machineType: z.string().describe("e.g. 'milling', '5axis', 'wedm'"),
  jobs: z.array(z.object({
    id: z.string(),
    fingerprint: z.record(z.string(), z.union([z.string(), z.number()])),
    features: z.record(z.string(), z.unknown()),
    actual: z.record(z.string(), z.unknown()),
    weight: z.number().optional(),
    labels: z.array(z.string()).optional(),
  })).describe("Array of RawJob"),
  split: z.object({
    trainRatio: z.number(),
    valRatio: z.number(),
    testRatio: z.number(),
    seed: z.number(),
    stratifyBy: z.string().optional(),
  }).optional(),
});

export const LoRACreateCadenceSchema = z.object({
  config: z.object({
    enabled: z.boolean().optional(),
    interval: z.enum(["daily", "weekly", "biweekly", "monthly", "on-demand"]).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(28).optional(),
    hour: z.number().min(0).max(23).optional(),
    minNewJobs: z.number().optional(),
    retrainOnDrift: z.boolean().optional(),
    driftThreshold: z.number().optional(),
    performanceThreshold: z.number().optional(),
    maxVersions: z.number().optional(),
    autoPromote: z.boolean().optional(),
  }).optional(),
});

export const LoRAGeometryHashSchema = z.object({
  fingerprint: z.record(z.string(), z.union([z.string(), z.number()])),
});

// ─── MachineModelAcquisitionEngine ───────────────────────────────────────────

export const AcquisitionGeneratePlanSchema = z.object({
  machines: z.array(z.object({
    machine_id: z.string(),
    name: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    machine_type: z.string(),
  })),
});

export const AcquisitionHasModelSchema = z.object({
  machineId: z.string(),
});

// ─── MachineModelDownloaderEngine ────────────────────────────────────────────

export const DownloaderSearchGrabCADSchema = z.object({
  query: z.string().min(1),
});

export const DownloaderGeneratePlaywrightScriptSchema = z.object({
  machines: z.array(z.object({
    name: z.string(),
    manufacturer: z.string(),
  })),
});

// ─── MachineOptionContractEngine ─────────────────────────────────────────────

export const ContractValidateProfileSchema = z.object({
  profile: z.record(z.string(), z.unknown()).describe("UserMachineProfileOverlay object"),
});

export const ContractGetRenderableOptionsSchema = z.object({
  machine_id: z.string(),
  selected_controller_id: z.string().optional(),
  part_requirements: z.object({
    weight_kg: z.number().optional(),
    diameter_mm: z.number().optional(),
    length_mm: z.number().optional(),
  }).optional(),
});

export const ContractIsValidCombinationSchema = z.object({
  controllerId: z.string(),
  spindleId: z.string(),
  coolantIds: z.array(z.string()),
  allowedOptions: z.array(z.record(z.string(), z.unknown())),
});

export const ContractValidateGeometrySchema = z.object({
  partWeight: z.number(),
  partDiameter: z.number(),
  restrictions: z.record(z.string(), z.unknown()).optional(),
});

export const ContractGenerateTestsSchema = z.object({
  machineId: z.string(),
});

export const ContractRunTestsSchema = z.object({
  machineId: z.string(),
});

// ─── MachineOptionMatrixEngine ────────────────────────────────────────────────

export const MatrixGetSchema = z.object({
  machineId: z.string(),
});

export const MatrixGetByTypeSchema = z.object({
  machineType: z.enum(["lathe", "mill", "multitasking", "edm", "swiss", "grinder"]),
});

export const MatrixGetByManufacturerSchema = z.object({
  manufacturer: z.string(),
});

export const MatrixValidateConfigSchema = z.object({
  machineId: z.string(),
  controllerId: z.string().optional(),
  spindleId: z.string().optional(),
  coolantId: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const MatrixGetAvailableOptionsSchema = z.object({
  machineId: z.string(),
  currentSelection: z.object({
    controllerId: z.string().optional(),
    spindleId: z.string().optional(),
    coolantId: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
  }).optional(),
});

export const MatrixGetDefaultConfigSchema = z.object({
  machineId: z.string(),
});

export const MatrixCalculatePriceAdderSchema = z.object({
  machineId: z.string(),
  controllerId: z.string().optional(),
  spindleId: z.string().optional(),
  coolantId: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const MatrixRegisterSchema = z.object({
  matrix: z.record(z.string(), z.unknown()).describe("OptionMatrixEntry object"),
});

// ─── MachinePackageAPIEngine ──────────────────────────────────────────────────

export const PackageAPIGetSchema = z.object({
  machine_id: z.string(),
});

export const PackageAPIListSchema = z.object({
  machine_type: z.string().optional(),
  manufacturer: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  include_overlays: z.boolean().optional(),
});

export const PackageAPISearchSchema = z.object({
  query: z.string().optional(),
  machine_type: z.string().optional(),
  manufacturer: z.string().optional(),
  min_confidence: z.number().min(0).max(1).optional(),
  capabilities: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
});

export const PackageAPICreateOverlaySchema = z.object({
  input: z.record(z.string(), z.unknown()).describe("CreateOverlayInput"),
});

export const PackageAPIUpdateOverlaySchema = z.object({
  input: z.record(z.string(), z.unknown()).describe("UpdateOverlayInput"),
});

export const PackageAPIDeleteOverlaySchema = z.object({
  overlay_id: z.string(),
});

export const PackageAPICheckCompatibilitySchema = z.object({
  input: z.record(z.string(), z.unknown()).describe("CompatibilityCheckInput"),
});

// ─── MachinePackageSelectionEngine ───────────────────────────────────────────

export const PackageSelectSchema = z.object({
  requirements: z.object({
    part_envelope_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    operations: z.array(z.string()),
    material_iso_group: z.string().optional(),
    required_accuracy_mm: z.number().optional(),
    surface_finish_Ra: z.number().optional(),
    min_spindle_rpm: z.number().optional(),
    min_spindle_power_kw: z.number().optional(),
    needs_rotary_axes: z.number().int().optional(),
    coolant_type: z.string().optional(),
    controller_preference: z.string().optional(),
    shop_owned_only: z.boolean().optional(),
    min_confidence: z.number().min(0).max(1).optional(),
    production_volume: z.enum(["prototype", "low", "medium", "high"]).optional(),
  }),
});

// ─── MachineProfilePropagationEngine ─────────────────────────────────────────

export const PropagationGetQuoteContextSchema = z.object({
  machine_id: z.string(),
});

export const PropagationGetQuoteContextsSchema = z.object({
  machine_ids: z.array(z.string()).min(1),
});

export const PropagationGetSchedulingContextSchema = z.object({
  machine_id: z.string(),
});

export const PropagationGetFeasibilityContextSchema = z.object({
  machine_id: z.string(),
});

export const PropagationRunWhatIfSchema = z.object({
  input: z.record(z.string(), z.unknown()).describe("WhatIfAnalysis input"),
});

export const PropagationCompareMachinesSchema = z.object({
  input: z.record(z.string(), z.unknown()).describe("CompareMachines input"),
});

// ─── MachineToolErrorBudgetEngine ────────────────────────────────────────────

export const ErrorBudgetComputeSchema = z.object({
  target_tolerance_um: z.number().positive().describe("Target part tolerance in µm"),
  machine_type: z.enum(["vmc", "hmc", "lathe", "5axis", "grinder"]).optional(),
  errors: z.array(z.object({
    axis: z.enum(["X", "Y", "Z", "A", "B", "C"]),
    error_type: z.enum(["positioning", "straightness_h", "straightness_v", "roll", "pitch", "yaw", "squareness"]),
    value_um: z.number(),
    abbe_offset_mm: z.number().optional(),
    thermal_coeff: z.number().optional(),
  })).optional(),
  work_volume_x_mm: z.number().optional(),
  work_volume_y_mm: z.number().optional(),
  work_volume_z_mm: z.number().optional(),
  delta_T_C: z.number().optional(),
  method: z.enum(["rss", "worst_case", "both"]).optional(),
});

export const ErrorBudgetAbbeSchema = z.object({
  scaleError_um: z.number(),
  angularError_urad: z.number(),
  abbeOffset_mm: z.number(),
});

export const ErrorBudgetThermalGrowthSchema = z.object({
  length_mm: z.number().positive(),
  deltaT_C: z.number(),
  alpha_um_m_C: z.number().optional(),
});

export const ErrorBudgetRSSCombineSchema = z.object({
  errors_um: z.array(z.number()).min(1),
});

export const ErrorBudgetWorstCaseCombineSchema = z.object({
  errors_um: z.array(z.number()).min(1),
});
