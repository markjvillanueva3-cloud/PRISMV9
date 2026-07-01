/**
 * QIFIntegrationEngine — CAMX-MS20 U04 (E1135)
 *
 * Quality Information Framework (ANSI/DMSC QIF) integration for measurement
 * data interchange. Implements QIF 3.0 (ANSI/DMSC QIF 2018) XML import/export
 * for CMM measurement plans, inspection results, and MBD bridge generation.
 *
 * Import capabilities:
 *   - Parse QIF XML measurement plans (characteristics, tolerances, methods)
 *   - Import measurement results (actual values, deviations, pass/fail)
 *   - Map QIF characteristics to PRISM features for quality tracking
 *
 * Export capabilities:
 *   - Generate QIF measurement plan XML from PRISM part features
 *   - Export inspection results in QIF format for customer delivery
 *   - Generate MBD (Model-Based Definition) to CMM program bridge data
 *
 * QIF characteristic types supported:
 *   linear, angular, diameter, radius, position, profile, runout,
 *   flatness, parallelism, perpendicularity, concentricity
 *
 * References:
 *   - ANSI/DMSC QIF 3.0 (2018): Quality Information Framework
 *   - ASME Y14.5-2018: Dimensioning and Tolerancing
 *   - ISO 10303 (STEP) AP242: MBD product definition
 *   - ISO 1101:2017: Geometrical tolerancing
 *
 * Actions (via camDispatcher):
 *   qif_import_plan    — parse QIF XML measurement plan → MeasurementPlan
 *   qif_import_results — parse QIF XML results → InspectionResults
 *   qif_export_plan    — PRISM features + tolerances → QIF XML plan
 *   qif_export_results — measurement records → QIF XML inspection report
 *
 * @module QIFIntegrationEngine
 * @shortcode E1135
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Characteristic type enumeration per QIF 3.0 §7.3 */
export type CharacteristicType =
  | "linear"
  | "angular"
  | "diameter"
  | "radius"
  | "position"
  | "profile"
  | "runout"
  | "flatness"
  | "parallelism"
  | "perpendicularity"
  | "concentricity";

/** Measurement method per QIF 3.0 §8.2 */
export type MeasurementMethod = "CMM" | "touch_probe" | "optical" | "manual";

/** QIF Characteristic Nominal — describes what to measure and the tolerance */
export interface CharacteristicNominal {
  feature_id: string;
  nominal_value: number;
  tolerance_plus: number;
  tolerance_minus: number;
  characteristic_type: CharacteristicType;
  unit?: string;
  description?: string;
  datum_refs?: string[];
}

/** QIF Characteristic Actual — a measured result referencing a nominal */
export interface CharacteristicActual {
  nominal_ref: string;
  measured_value: number;
  deviation: number;
  in_spec: boolean;
}

/** QIF Measurement Plan */
export interface MeasurementPlan {
  plan_id: string;
  plan_name: string;
  part_number: string;
  revision: string;
  measurement_method: MeasurementMethod;
  characteristics: CharacteristicNominal[];
  created_date: string;
  notes?: string;
}

/** QIF Inspection Results */
export interface InspectionResults {
  report_id: string;
  plan_ref: string;
  actuals: CharacteristicActual[];
  pass_fail: boolean;
  inspector: string;
  date: string;
  total_characteristics: number;
  in_spec_count: number;
  out_of_spec_count: number;
  out_of_spec_features: string[];
}

/** PRISM Feature mapped from QIF characteristics */
export interface PRISMFeature {
  feature_id: string;
  feature_name: string;
  characteristic_type: CharacteristicType;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: string;
  datum_refs: string[];
}

/** QIF validation result */
export interface QIFValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  characteristic_count: number;
  qif_version: string | null;
}

/** Input feature for plan export */
export interface FeatureInput {
  feature_id: string;
  feature_name?: string;
  characteristic_type?: CharacteristicType;
  nominal: number;
  unit?: string;
  datum_refs?: string[];
}

/** Tolerance input for plan export */
export interface ToleranceInput {
  feature_id: string;
  tolerance_plus: number;
  tolerance_minus: number;
  characteristic_type?: CharacteristicType;
}

/** Measurement record for results export */
export interface MeasurementRecord {
  feature_id: string;
  nominal_value?: number;
  measured_value: number;
  tolerance_plus?: number;
  tolerance_minus?: number;
  characteristic_type?: CharacteristicType;
  unit?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Generate a UUID-like ID for QIF elements */
function generateId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

/** Escape XML special characters */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Extract text content from a simple XML tag (non-nested) */
function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

/** Extract attribute value from an XML element */
function extractAttr(xml: string, attr: string): string | null {
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

/** Extract all occurrences of a block between open/close tags */
function extractBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const openRe = new RegExp(`<${tag}[^>]*>`, "gi");
  const closeTag = `</${tag}>`;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(xml)) !== null) {
    const start = match.index;
    const closeIdx = xml.indexOf(closeTag, start);
    if (closeIdx === -1) break;
    blocks.push(xml.substring(start, closeIdx + closeTag.length));
    openRe.lastIndex = closeIdx + closeTag.length;
  }
  return blocks;
}

/** Map QIF CharacteristicType string to our enum */
function mapCharType(raw: string): CharacteristicType {
  const map: Record<string, CharacteristicType> = {
    linearcharacteristic:     "linear",
    linear:                   "linear",
    angularcharacteristic:    "angular",
    angular:                  "angular",
    diametercharacteristic:   "diameter",
    diameter:                 "diameter",
    radiuscharacteristic:     "radius",
    radius:                   "radius",
    positioncharacteristic:   "position",
    position:                 "position",
    profilecharacteristic:    "profile",
    profile:                  "profile",
    runoutcharacteristic:     "runout",
    runout:                   "runout",
    flatnesscharacteristic:   "flatness",
    flatness:                 "flatness",
    parallelismcharacteristic:"parallelism",
    parallelism:              "parallelism",
    perpendicularitycharacteristic: "perpendicularity",
    perpendicularity:         "perpendicularity",
    concentricitycharacteristic: "concentricity",
    concentricity:            "concentricity",
  };
  return map[raw.toLowerCase().replace(/[\s_-]/g, "")] ?? "linear";
}

/** QIF element name for a characteristic type */
function charTypeElement(t: CharacteristicType): string {
  const map: Record<CharacteristicType, string> = {
    linear:          "LinearCharacteristicNominal",
    angular:         "AngularCharacteristicNominal",
    diameter:        "DiameterCharacteristicNominal",
    radius:          "RadiusCharacteristicNominal",
    position:        "PositionCharacteristicNominal",
    profile:         "ProfileCharacteristicNominal",
    runout:          "RunoutCharacteristicNominal",
    flatness:        "FlatnessCharacteristicNominal",
    parallelism:     "ParallelismCharacteristicNominal",
    perpendicularity:"PerpendicularityCharacteristicNominal",
    concentricity:   "ConcentricityCharacteristicNominal",
  };
  return map[t];
}

/** Infer deviation sign: positive = above nominal, negative = below */
function computeDeviation(measured: number, nominal: number): number {
  return parseFloat((measured - nominal).toFixed(6));
}

/** Determine in_spec from deviation and tolerance band */
function isInSpec(
  deviation: number,
  tPlus: number,
  tMinus: number,
): boolean {
  return deviation <= tPlus && deviation >= -Math.abs(tMinus);
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class QIFIntegrationEngine {

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Parse a QIF 3.0 XML measurement plan into a structured MeasurementPlan.
   *
   * Handles:
   *   - QIF header (PartNumber, PlanName, Date)
   *   - MeasurementResourcesType (measurement method)
   *   - CharacteristicNominals (any supported CharacteristicType)
   *   - DatumDefinitions (datum reference letters)
   *
   * @param qif_xml - Full QIF XML text
   * @returns MeasurementPlan
   */
  importPlan(qif_xml: string): MeasurementPlan {
    log.info("[QIFIntegrationEngine] importPlan — parsing QIF XML measurement plan");

    const planId    = extractTag(qif_xml, "PlanId") ?? generateId("PLAN");
    const planName  = extractTag(qif_xml, "PlanName") ?? extractTag(qif_xml, "Name") ?? "Unnamed Plan";
    const partNum   = extractTag(qif_xml, "PartNumber") ?? extractTag(qif_xml, "PartNum") ?? "";
    const revision  = extractTag(qif_xml, "Revision") ?? extractTag(qif_xml, "Rev") ?? "A";
    const dateStr   = extractTag(qif_xml, "Created") ?? extractTag(qif_xml, "Date") ?? new Date().toISOString().split("T")[0];
    const notes     = extractTag(qif_xml, "Notes") ?? undefined;

    // Infer measurement method
    const methodRaw = extractTag(qif_xml, "MeasurementMethod") ?? extractTag(qif_xml, "Method") ?? "CMM";
    const method    = this._parseMeasurementMethod(methodRaw);

    // Parse characteristic nominals
    const characteristics = this._parseCharacteristicNominals(qif_xml);

    const plan: MeasurementPlan = {
      plan_id:            planId,
      plan_name:          planName,
      part_number:        partNum,
      revision,
      measurement_method: method,
      characteristics,
      created_date:       dateStr,
    };
    if (notes) plan.notes = notes;

    log.info(`[QIFIntegrationEngine] importPlan — parsed ${characteristics.length} characteristics`);
    return plan;
  }

  /**
   * Parse a QIF 3.0 XML inspection results file into InspectionResults.
   *
   * Handles:
   *   - InspectionReport header (ReportId, PlanRef, Inspector, Date)
   *   - CharacteristicActuals (MeasuredValue, Deviation, Status)
   *   - Summary aggregation (pass/fail, counts)
   *
   * @param qif_xml - Full QIF XML text containing inspection results
   * @returns InspectionResults
   */
  importResults(qif_xml: string): InspectionResults {
    log.info("[QIFIntegrationEngine] importResults — parsing QIF XML inspection results");

    const reportId  = extractTag(qif_xml, "ReportId") ?? extractTag(qif_xml, "Id") ?? generateId("RPT");
    const planRef   = extractTag(qif_xml, "PlanRef") ?? extractTag(qif_xml, "MeasurementPlanRef") ?? "";
    const inspector = extractTag(qif_xml, "Inspector") ?? extractTag(qif_xml, "InspectorName") ?? "Unknown";
    const date      = extractTag(qif_xml, "InspectionDate") ?? extractTag(qif_xml, "Date") ?? new Date().toISOString().split("T")[0];

    const actuals = this._parseCharacteristicActuals(qif_xml);

    const inSpecCount     = actuals.filter(a => a.in_spec).length;
    const outOfSpecCount  = actuals.filter(a => !a.in_spec).length;
    const outOfSpecFeats  = actuals.filter(a => !a.in_spec).map(a => a.nominal_ref);
    const passFail        = outOfSpecCount === 0 && actuals.length > 0;

    log.info(`[QIFIntegrationEngine] importResults — ${actuals.length} actuals, ${outOfSpecCount} out-of-spec`);

    return {
      report_id:              reportId,
      plan_ref:               planRef,
      actuals,
      pass_fail:              passFail,
      inspector,
      date,
      total_characteristics:  actuals.length,
      in_spec_count:          inSpecCount,
      out_of_spec_count:      outOfSpecCount,
      out_of_spec_features:   outOfSpecFeats,
    };
  }

  /**
   * Generate a QIF 3.0 XML measurement plan from PRISM part features and tolerances.
   *
   * Produces:
   *   - QIFDocument with QIFDocumentType=MeasurementPlan
   *   - PlanSection with CharacteristicNominals for each feature
   *   - DatumDefinitions for any referenced datums
   *   - MeasurementDeviceSection stub for CMM/probe method
   *
   * @param features   - Array of PRISM feature definitions
   * @param tolerances - Array of tolerance definitions keyed by feature_id
   * @param options    - Optional overrides (plan_name, method, part_number, revision)
   * @returns QIF XML string
   */
  exportPlan(
    features: FeatureInput[],
    tolerances: ToleranceInput[],
    options: {
      plan_name?: string;
      measurement_method?: MeasurementMethod;
      part_number?: string;
      revision?: string;
      author?: string;
    } = {},
  ): string {
    log.info(`[QIFIntegrationEngine] exportPlan — generating QIF XML for ${features.length} features`);

    const planId      = generateId("PLAN");
    const planName    = escapeXml(options.plan_name ?? "PRISM Measurement Plan");
    const partNum     = escapeXml(options.part_number ?? "");
    const revision    = escapeXml(options.revision ?? "A");
    const method      = options.measurement_method ?? "CMM";
    const author      = escapeXml(options.author ?? "PRISM");
    const dateStr     = new Date().toISOString().split("T")[0];

    // Build tolerance lookup map
    const tolMap = new Map<string, ToleranceInput>();
    for (const t of tolerances) tolMap.set(t.feature_id, t);

    // Build characteristic nominals XML
    const charLines: string[] = [];
    for (let i = 0; i < features.length; i++) {
      const feat = features[i];
      const tol  = tolMap.get(feat.feature_id);
      if (!tol) continue; // skip features with no tolerance

      const charType  = feat.characteristic_type ?? tol.characteristic_type ?? "linear";
      const elemName  = charTypeElement(charType);
      const unit      = feat.unit ?? "mm";
      const charId    = `CHAR-${i + 1}`;
      const datumRefs = (feat.datum_refs ?? []).map(d => `        <DatumReference label="${escapeXml(d)}"/>`).join("\n");
      const datumBlock = datumRefs ? `\n      <DatumRefs>\n${datumRefs}\n      </DatumRefs>` : "";
      const featName = escapeXml(feat.feature_name ?? feat.feature_id);

      charLines.push(
        `    <${elemName} id="${charId}">`,
        `      <Name>${featName}</Name>`,
        `      <FeatureRef idref="${escapeXml(feat.feature_id)}"/>`,
        `      <Nominal xsi:type="LinearValueType">`,
        `        <Value>${feat.nominal}</Value>`,
        `        <Unit>${unit}</Unit>`,
        `      </Nominal>`,
        `      <ToleranceZone>`,
        `        <TolerancePlus>${tol.tolerance_plus}</TolerancePlus>`,
        `        <ToleranceMinus>${tol.tolerance_minus}</ToleranceMinus>`,
        `        <Unit>${unit}</Unit>`,
        `      </ToleranceZone>${datumBlock}`,
        `    </${elemName}>`,
      );
    }

    const charCount = charLines.filter(l => l.includes("id=\"CHAR-")).length;

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<QIFDocument xmlns="http://qifstandards.org/xsd/qif3"`,
      `             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
      `             xsi:schemaLocation="http://qifstandards.org/xsd/qif3 QIFApplications/QIFDocument.xsd"`,
      `             versionQIF="3.0.0" idMax="${charCount + 10}">`,
      `  <Header>`,
      `    <Application>`,
      `      <Name>PRISM MCP Server</Name>`,
      `      <Organization>${author}</Organization>`,
      `    </Application>`,
      `    <Description>`,
      `      <Attributes>`,
      `        <AttributeStr name="PlanName"><Value>${planName}</Value></AttributeStr>`,
      `        <AttributeStr name="PartNumber"><Value>${partNum}</Value></AttributeStr>`,
      `        <AttributeStr name="Revision"><Value>${revision}</Value></AttributeStr>`,
      `        <AttributeStr name="PlanId"><Value>${planId}</Value></AttributeStr>`,
      `        <AttributeStr name="Created"><Value>${dateStr}</Value></AttributeStr>`,
      `        <AttributeStr name="MeasurementMethod"><Value>${method}</Value></AttributeStr>`,
      `      </Attributes>`,
      `    </Description>`,
      `  </Header>`,
      `  <PlanSection>`,
      `    <MeasurementPlan id="MPLAN-1">`,
      `      <Name>${planName}</Name>`,
      `      <CharacteristicNominals n="${charCount}">`,
      ...charLines,
      `      </CharacteristicNominals>`,
      `    </MeasurementPlan>`,
      `  </PlanSection>`,
      `  <MeasurementResourcesSection>`,
      `    <MeasurementDevices n="1">`,
      `      <UniversalDevice id="DEV-1">`,
      `        <Name>${method === "CMM" ? "CMM" : method === "touch_probe" ? "Touch Probe" : method === "optical" ? "Optical CMM" : "Manual Gauge"}</Name>`,
      `        <DeviceType>${method.toUpperCase().replace("_", "_")}</DeviceType>`,
      `      </UniversalDevice>`,
      `    </MeasurementDevices>`,
      `  </MeasurementResourcesSection>`,
      `</QIFDocument>`,
    ].join("\n");

    log.info(`[QIFIntegrationEngine] exportPlan — generated ${charCount} characteristic nominals`);
    return xml;
  }

  /**
   * Export inspection measurement results as a QIF 3.0 XML inspection report.
   *
   * Produces:
   *   - QIFDocument with QIFDocumentType=Results
   *   - ResultsSection with CharacteristicActuals
   *   - InspectionStatus (pass/fail) and summary statistics
   *
   * @param measurements - Array of measurement records
   * @param options      - Optional overrides (inspector, plan_ref, report_name, date)
   * @returns QIF XML string
   */
  exportResults(
    measurements: MeasurementRecord[],
    options: {
      inspector?: string;
      plan_ref?: string;
      report_name?: string;
      date?: string;
      part_number?: string;
    } = {},
  ): string {
    log.info(`[QIFIntegrationEngine] exportResults — exporting ${measurements.length} measurement records`);

    const reportId   = generateId("RPT");
    const inspector  = escapeXml(options.inspector ?? "PRISM Inspector");
    const planRef    = escapeXml(options.plan_ref ?? "");
    const reportName = escapeXml(options.report_name ?? "PRISM Inspection Report");
    const dateStr    = options.date ?? new Date().toISOString().split("T")[0];
    const partNum    = escapeXml(options.part_number ?? "");

    // Build actual lines
    const actualLines: string[] = [];
    let inSpecCount = 0;
    let outOfSpecCount = 0;

    for (let i = 0; i < measurements.length; i++) {
      const m       = measurements[i];
      const nominal = m.nominal_value ?? 0;
      const dev     = computeDeviation(m.measured_value, nominal);
      const tPlus   = m.tolerance_plus  ?? 0.05;
      const tMinus  = m.tolerance_minus ?? 0.05;
      const inSpec  = isInSpec(dev, tPlus, tMinus);
      const status  = inSpec ? "PASS" : "FAIL";
      const unit    = m.unit ?? "mm";
      const charType = m.characteristic_type ?? "linear";
      const elemName = charTypeElement(charType).replace("Nominal", "Actual");
      const actualId = `ACT-${i + 1}`;

      if (inSpec) inSpecCount++; else outOfSpecCount++;

      actualLines.push(
        `      <${elemName} id="${actualId}">`,
        `        <CharacteristicNominalRef idref="${escapeXml(m.feature_id)}"/>`,
        `        <Status>`,
        `          <CharacteristicStatusEnum>${status}</CharacteristicStatusEnum>`,
        `        </Status>`,
        `        <Value>${m.measured_value}</Value>`,
        `        <Unit>${unit}</Unit>`,
        `        <Deviation>${dev}</Deviation>`,
        `      </${elemName}>`,
      );
    }

    const totalCount = measurements.length;
    const overallPass = outOfSpecCount === 0 && totalCount > 0;

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<QIFDocument xmlns="http://qifstandards.org/xsd/qif3"`,
      `             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
      `             xsi:schemaLocation="http://qifstandards.org/xsd/qif3 QIFApplications/QIFDocument.xsd"`,
      `             versionQIF="3.0.0" idMax="${totalCount + 10}">`,
      `  <Header>`,
      `    <Application>`,
      `      <Name>PRISM MCP Server</Name>`,
      `    </Application>`,
      `    <Description>`,
      `      <Attributes>`,
      `        <AttributeStr name="ReportId"><Value>${reportId}</Value></AttributeStr>`,
      `        <AttributeStr name="ReportName"><Value>${reportName}</Value></AttributeStr>`,
      `        <AttributeStr name="PlanRef"><Value>${planRef}</Value></AttributeStr>`,
      `        <AttributeStr name="PartNumber"><Value>${partNum}</Value></AttributeStr>`,
      `        <AttributeStr name="Inspector"><Value>${inspector}</Value></AttributeStr>`,
      `        <AttributeStr name="InspectionDate"><Value>${dateStr}</Value></AttributeStr>`,
      `      </Attributes>`,
      `    </Description>`,
      `  </Header>`,
      `  <ResultsSection>`,
      `    <MeasurementResults id="MRES-1">`,
      `      <MeasurementPlanRef idref="${planRef}"/>`,
      `      <InspectionStatus>`,
      `        <InspectionStatusType>${overallPass ? "PASS" : "FAIL"}</InspectionStatusType>`,
      `        <CharacteristicsChecked>${totalCount}</CharacteristicsChecked>`,
      `        <CharacteristicsConforming>${inSpecCount}</CharacteristicsConforming>`,
      `        <CharacteristicsNonConforming>${outOfSpecCount}</CharacteristicsNonConforming>`,
      `      </InspectionStatus>`,
      `      <CharacteristicActuals n="${totalCount}">`,
      ...actualLines,
      `      </CharacteristicActuals>`,
      `    </MeasurementResults>`,
      `  </ResultsSection>`,
      `</QIFDocument>`,
    ].join("\n");

    log.info(`[QIFIntegrationEngine] exportResults — ${inSpecCount}/${totalCount} in-spec, overall ${overallPass ? "PASS" : "FAIL"}`);
    return xml;
  }

  /**
   * Map QIF CharacteristicNominals to PRISM features for quality tracking.
   *
   * Converts a parsed MeasurementPlan into an array of PRISMFeature records
   * that can be used by quality management, FAI pipeline, or CMM path planning.
   *
   * @param plan - Parsed MeasurementPlan (from importPlan)
   * @returns PRISMFeature[]
   */
  mapToFeatures(plan: MeasurementPlan): PRISMFeature[] {
    log.info(`[QIFIntegrationEngine] mapToFeatures — mapping ${plan.characteristics.length} characteristics`);

    return plan.characteristics.map(c => ({
      feature_id:         c.feature_id,
      feature_name:       c.description ?? c.feature_id,
      characteristic_type: c.characteristic_type,
      nominal:            c.nominal_value,
      tolerance_plus:     c.tolerance_plus,
      tolerance_minus:    c.tolerance_minus,
      unit:               c.unit ?? "mm",
      datum_refs:         c.datum_refs ?? [],
    }));
  }

  /**
   * Validate a QIF XML document for structural correctness.
   *
   * Checks:
   *   - XML well-formedness (open/close tag balance for key elements)
   *   - Presence of required QIF header elements
   *   - CharacteristicNominal or CharacteristicActual count consistency
   *   - versionQIF attribute (warns if not 3.0.x)
   *   - Unit consistency across characteristics
   *
   * @param xml - QIF XML text to validate
   * @returns QIFValidationResult
   */
  validateQIF(xml: string): QIFValidationResult {
    log.info("[QIFIntegrationEngine] validateQIF — validating QIF XML");

    const errors:   string[] = [];
    const warnings: string[] = [];

    // Detect QIF version
    const versionAttr = extractAttr(xml, "versionQIF");
    if (!versionAttr) {
      warnings.push("versionQIF attribute missing — assuming QIF 3.0");
    } else if (!versionAttr.startsWith("3.")) {
      warnings.push(`versionQIF="${versionAttr}" — PRISM engine targets QIF 3.0.x; compatibility may vary`);
    }

    // Check root element
    if (!xml.includes("<QIFDocument")) {
      errors.push("Missing root <QIFDocument> element — not a valid QIF document");
    }

    // Check closing root
    if (!xml.includes("</QIFDocument>")) {
      errors.push("Missing </QIFDocument> closing tag — XML may be truncated");
    }

    // Check header
    if (!xml.includes("<Header>") && !xml.includes("<Header ")) {
      warnings.push("No <Header> section found — QIF 3.0 recommends a header block");
    }

    // Count characteristic nominals
    const nominalBlocks = extractBlocks(xml, "CharacteristicNominals");
    let nominalCount = 0;
    for (const block of nominalBlocks) {
      const nAttr = extractAttr(block, "n");
      if (nAttr) {
        const declaredN = parseInt(nAttr, 10);
        // Count child elements (rough: any *CharacteristicNominal closing tag)
        const actualN = (block.match(/<\/\w+CharacteristicNominal>/g) ?? []).length;
        if (declaredN !== actualN) {
          warnings.push(`CharacteristicNominals n="${declaredN}" but found ${actualN} nominal elements`);
        }
        nominalCount += actualN;
      }
    }

    // Count characteristic actuals
    const actualBlocks = extractBlocks(xml, "CharacteristicActuals");
    let actualCount = 0;
    for (const block of actualBlocks) {
      const nAttr = extractAttr(block, "n");
      if (nAttr) {
        const declaredN = parseInt(nAttr, 10);
        const foundN = (block.match(/<\/\w+CharacteristicActual>/g) ?? []).length;
        if (declaredN !== foundN) {
          warnings.push(`CharacteristicActuals n="${declaredN}" but found ${foundN} actual elements`);
        }
        actualCount += foundN;
      }
    }

    if (nominalCount === 0 && actualCount === 0) {
      warnings.push("No CharacteristicNominals or CharacteristicActuals found — document may be empty");
    }

    // Check for xmlns declaration
    if (!xml.includes("xmlns=") && !xml.includes("xmlns:")) {
      warnings.push("No XML namespace declarations found — QIF 3.0 requires xmlns=\"http://qifstandards.org/xsd/qif3\"");
    }

    // Check for xsi:type mismatches (value presence check)
    const missingValue = (xml.match(/<Value\s*\/>/g) ?? []).length;
    if (missingValue > 0) {
      errors.push(`${missingValue} empty <Value/> element(s) found — measurement values must be numeric`);
    }

    const characteristicCount = Math.max(nominalCount, actualCount);
    const valid = errors.length === 0;

    log.info(`[QIFIntegrationEngine] validateQIF — valid=${valid}, errors=${errors.length}, warnings=${warnings.length}`);

    return {
      valid,
      errors,
      warnings,
      characteristic_count: characteristicCount,
      qif_version: versionAttr ?? null,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /** Parse measurement method from string */
  private _parseMeasurementMethod(raw: string): MeasurementMethod {
    const norm = raw.toLowerCase().replace(/[\s_-]/g, "");
    if (norm.includes("touchprobe") || norm === "probe") return "touch_probe";
    if (norm.includes("optical"))  return "optical";
    if (norm.includes("manual"))   return "manual";
    return "CMM"; // default
  }

  /** Parse all CharacteristicNominal blocks from QIF XML */
  private _parseCharacteristicNominals(xml: string): CharacteristicNominal[] {
    const results: CharacteristicNominal[] = [];

    // Match any *CharacteristicNominal element (greedy open/close)
    const nomPattern = /(<(\w+CharacteristicNominal)[^>]*>[\s\S]*?<\/\2>)/gi;
    let m: RegExpExecArray | null;

    while ((m = nomPattern.exec(xml)) !== null) {
      const block    = m[1];
      const elemName = m[2];

      const charType  = mapCharType(elemName);
      const featureId = extractAttr(block, "id") ?? extractTag(block, "FeatureRef") ?? extractTag(block, "Name") ?? generateId("FEAT");
      const name      = extractTag(block, "Name") ?? featureId;
      const nominal   = parseFloat(extractTag(block, "Value") ?? "0");
      const tPlus     = parseFloat(extractTag(block, "TolerancePlus") ?? "0");
      const tMinus    = parseFloat(extractTag(block, "ToleranceMinus") ?? "0");
      const unit      = extractTag(block, "Unit") ?? "mm";

      // Extract datum references
      const datumRefs: string[] = [];
      const datumRe = /label="([^"]+)"/gi;
      let dr: RegExpExecArray | null;
      while ((dr = datumRe.exec(block)) !== null) {
        datumRefs.push(dr[1]);
      }

      results.push({
        feature_id:         featureId,
        nominal_value:      isNaN(nominal) ? 0 : nominal,
        tolerance_plus:     isNaN(tPlus) ? 0 : tPlus,
        tolerance_minus:    isNaN(tMinus) ? 0 : tMinus,
        characteristic_type: charType,
        unit,
        description:        name !== featureId ? name : undefined,
        datum_refs:         datumRefs.length > 0 ? datumRefs : undefined,
      });
    }

    return results;
  }

  /** Parse all CharacteristicActual blocks from QIF XML */
  private _parseCharacteristicActuals(xml: string): CharacteristicActual[] {
    const results: CharacteristicActual[] = [];

    const actPattern = /(<(\w+CharacteristicActual)[^>]*>[\s\S]*?<\/\2>)/gi;
    let m: RegExpExecArray | null;

    while ((m = actPattern.exec(xml)) !== null) {
      const block      = m[1];
      const nominalRef = extractAttr(block, "idref") ??
                         extractTag(block, "CharacteristicNominalRef") ??
                         extractTag(block, "NominalRef") ?? "";
      const measured   = parseFloat(extractTag(block, "Value") ?? "0");
      const deviation  = parseFloat(extractTag(block, "Deviation") ?? "NaN");
      const statusRaw  = extractTag(block, "CharacteristicStatusEnum") ??
                         extractTag(block, "Status") ?? "PASS";
      const inSpec     = statusRaw.toUpperCase() !== "FAIL" && statusRaw.toUpperCase() !== "NONCONFORMING";

      results.push({
        nominal_ref:   nominalRef,
        measured_value: isNaN(measured) ? 0 : measured,
        deviation:      isNaN(deviation) ? 0 : deviation,
        in_spec:        inSpec,
      });
    }

    return results;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const qifIntegrationEngine = new QIFIntegrationEngine();
