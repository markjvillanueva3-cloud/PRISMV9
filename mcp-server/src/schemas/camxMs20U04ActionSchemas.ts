/**
 * CAMX-MS20 U04 Action Schemas — Zod
 *
 * 4 dispatcher actions (QIFIntegrationEngine E1135):
 *   qif_import_plan    — parse QIF XML measurement plan → MeasurementPlan
 *   qif_import_results — parse QIF XML results → InspectionResults
 *   qif_export_plan    — PRISM features + tolerances → QIF XML plan
 *   qif_export_results — measurement records → QIF XML inspection report
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

/** QIF characteristic type — all types defined in QIF 3.0 §7.3 */
const CharacteristicTypeSchema = z.enum([
  "angular",
  "concentricity",
  "diameter",
  "flatness",
  "linear",
  "parallelism",
  "perpendicularity",
  "position",
  "profile",
  "radius",
  "runout",
]).describe(
  "QIF characteristic type: linear=length/distance, angular=angle, diameter=bore/shaft, " +
  "radius=arc radius, position=GD&T true position, profile=profile of surface/line, " +
  "runout=circular/total runout, flatness=flatness, parallelism=parallelism, " +
  "perpendicularity=squareness, concentricity=coaxiality"
);

/** Measurement method for a QIF plan */
const MeasurementMethodSchema = z.enum([
  "CMM",
  "manual",
  "optical",
  "touch_probe",
]).describe(
  "Measurement method: CMM=coordinate measuring machine, touch_probe=in-machine probing, " +
  "optical=vision/laser system, manual=hand gauges"
);

/** A PRISM feature for QIF plan export */
const FeatureInputSchema = z.object({
  feature_id:          z.string().describe("Feature identifier (must match tolerance feature_id)"),
  feature_name:        z.string().optional().describe("Human-readable feature name (default: feature_id)"),
  characteristic_type: CharacteristicTypeSchema.optional().describe("Override characteristic type (default: inferred from tolerance or 'linear')"),
  nominal:             z.number().describe("Nominal dimension value"),
  unit:                z.string().optional().describe("Unit of measure (default: 'mm')"),
  datum_refs:          z.array(z.string()).optional().describe("Referenced datum labels (e.g. ['A', 'B', 'C'])"),
}).describe("A PRISM part feature to include in the QIF measurement plan");

/** Tolerance definition for a feature */
const ToleranceInputSchema = z.object({
  feature_id:          z.string().describe("Feature identifier — must match a FeatureInput.feature_id"),
  tolerance_plus:      z.number().min(0).describe("Upper tolerance (bilateral +, or full unilateral), same unit as feature nominal"),
  tolerance_minus:     z.number().min(0).describe("Lower tolerance (bilateral -, always positive magnitude)"),
  characteristic_type: CharacteristicTypeSchema.optional().describe("Override characteristic type for this tolerance"),
}).describe("Tolerance definition keyed to a feature");

/** A measurement record for results export */
const MeasurementRecordSchema = z.object({
  feature_id:          z.string().describe("Feature / characteristic identifier (references plan nominal)"),
  nominal_value:       z.number().optional().describe("Nominal dimension for deviation computation (default: 0)"),
  measured_value:      z.number().describe("Actual measured value"),
  tolerance_plus:      z.number().min(0).optional().describe("Upper tolerance for in-spec check (default: 0.05)"),
  tolerance_minus:     z.number().min(0).optional().describe("Lower tolerance for in-spec check (default: 0.05)"),
  characteristic_type: CharacteristicTypeSchema.optional().describe("Characteristic type for QIF element naming (default: 'linear')"),
  unit:                z.string().optional().describe("Unit of measure (default: 'mm')"),
}).describe("A single measurement result for QIF export");

// ── Action schemas ─────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS20_U04_SCHEMAS: ActionSchemaMap = {

  /**
   * Parse a QIF 3.0 XML measurement plan into a structured MeasurementPlan.
   *
   * Returns:
   *   plan_id            — unique plan identifier from QIF header
   *   plan_name          — measurement plan name
   *   part_number        — part number from QIF header
   *   revision           — drawing revision (default: "A")
   *   measurement_method — CMM | touch_probe | optical | manual
   *   characteristics    — array of CharacteristicNominal records
   *   created_date       — plan creation date
   *   notes              — optional plan notes
   *
   * Handles QIF 3.0 element types: LinearCharacteristicNominal,
   * DiameterCharacteristicNominal, PositionCharacteristicNominal, etc.
   */
  qif_import_plan: z.object({
    qif_xml: z.string().min(10).describe(
      "Full QIF 3.0 XML measurement plan text (<?xml ...><QIFDocument ...>...</QIFDocument>)"
    ),
  }),

  /**
   * Parse a QIF 3.0 XML inspection results file into InspectionResults.
   *
   * Returns:
   *   report_id               — unique report identifier
   *   plan_ref                — reference to the measurement plan
   *   actuals                 — array of CharacteristicActual records (nominal_ref, measured_value, deviation, in_spec)
   *   pass_fail               — true if all characteristics in-spec
   *   inspector               — inspector name
   *   date                    — inspection date
   *   total_characteristics   — total characteristics checked
   *   in_spec_count           — number conforming
   *   out_of_spec_count       — number non-conforming
   *   out_of_spec_features    — list of non-conforming feature IDs
   */
  qif_import_results: z.object({
    qif_xml: z.string().min(10).describe(
      "Full QIF 3.0 XML inspection results text containing CharacteristicActuals and InspectionStatus"
    ),
  }),

  /**
   * Generate a QIF 3.0 XML measurement plan from PRISM part features and tolerances.
   *
   * Produces a complete QIFDocument with:
   *   - Header (plan name, part number, revision, method, date)
   *   - PlanSection with CharacteristicNominals typed per characteristic_type
   *   - MeasurementResourcesSection with device stub
   *   - DatumReference elements for GD&T callouts
   *
   * Features without a matching tolerance entry are omitted from the plan.
   * Returns the QIF XML string.
   */
  qif_export_plan: z.object({
    features:   z.array(FeatureInputSchema).min(1).max(500).describe(
      "PRISM part features to include in the measurement plan (1–500)"
    ),
    tolerances: z.array(ToleranceInputSchema).min(1).max(500).describe(
      "Tolerance definitions keyed by feature_id (1–500); features without a matching entry are skipped"
    ),
    plan_name:          z.string().optional().describe("Measurement plan name (default: 'PRISM Measurement Plan')"),
    measurement_method: MeasurementMethodSchema.optional().describe("Measurement device type (default: 'CMM')"),
    part_number:        z.string().optional().describe("Part number for QIF header"),
    revision:           z.string().optional().describe("Drawing revision (default: 'A')"),
    author:             z.string().optional().describe("Author / originator name (default: 'PRISM')"),
  }),

  /**
   * Export inspection measurement results as a QIF 3.0 XML inspection report.
   *
   * Produces a complete QIFDocument with:
   *   - Header (report name, report ID, plan ref, inspector, date)
   *   - ResultsSection with CharacteristicActuals (measured value, deviation, PASS/FAIL)
   *   - InspectionStatus summary (overall PASS/FAIL, conforming/non-conforming counts)
   *
   * Deviation is computed as (measured_value − nominal_value).
   * in_spec is true when: −|tolerance_minus| ≤ deviation ≤ tolerance_plus.
   * Returns the QIF XML string.
   */
  qif_export_results: z.object({
    measurements: z.array(MeasurementRecordSchema).min(1).max(1000).describe(
      "Measurement records to export (1–1000)"
    ),
    inspector:   z.string().optional().describe("Inspector name (default: 'PRISM Inspector')"),
    plan_ref:    z.string().optional().describe("Reference to the measurement plan ID"),
    report_name: z.string().optional().describe("Inspection report name (default: 'PRISM Inspection Report')"),
    date:        z.string().optional().describe("Inspection date ISO 8601 (default: today)"),
    part_number: z.string().optional().describe("Part number for QIF header"),
  }),
};
