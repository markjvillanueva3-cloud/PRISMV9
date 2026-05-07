/**
 * MastercamFAIBridge — First Article Inspection Integration for Mastercam
 *
 * Generates AS9102 compliant FAI reports from Mastercam programs:
 *   - Form 1: Part Number Accountability
 *   - Form 2: Product Accountability
 *   - Form 3: Characteristic Accountability
 *   - Balloon drawing generation
 *   - Measurement data integration
 *
 * @module engines/MastercamFAIBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP04
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FAICharacteristic {
  balloon_number: number;
  characteristic_designator: string;
  characteristic_type: "dimension" | "tolerance" | "surface" | "position" | "note";
  nominal: string;
  tolerance_plus: string;
  tolerance_minus: string;
  measured_value?: string;
  deviation?: string;
  result?: "PASS" | "FAIL" | "PENDING";
  method?: string;
  equipment?: string;
  notes?: string;
}

export interface FAIForm1 {
  part_number: string;
  part_name: string;
  revision: string;
  drawing_number: string;
  serial_number?: string;
  organization_name: string;
  supplier_code?: string;
  purchase_order?: string;
  detail_fab?: boolean;
  complete?: boolean;
  reason_for_fai: "new_part" | "design_change" | "process_change" | "production_break";
  inspection_date: string;
  fai_report_number: string;
  signature?: string;
}

export interface FAIForm2 {
  materials: Array<{
    material_spec: string;
    material_type: string;
    supplier: string;
    cert_number?: string;
    lot_number?: string;
  }>;
  special_processes: Array<{
    process_name: string;
    specification: string;
    supplier?: string;
    approval_number?: string;
  }>;
  functional_tests: Array<{
    test_name: string;
    specification: string;
    result: "PASS" | "FAIL";
    date: string;
  }>;
}

export interface FAIForm3 {
  characteristics: FAICharacteristic[];
  total_characteristics: number;
  passed: number;
  failed: number;
  pending: number;
  all_passed: boolean;
}

export interface FAIReport {
  form1: FAIForm1;
  form2: FAIForm2;
  form3: FAIForm3;
  created_date: string;
  status: "draft" | "complete" | "approved" | "rejected";
  compliance: "AS9102_Rev_C" | "AS9102_Rev_B";
}

export interface MastercamFeatureExtraction {
  feature_id: string;
  feature_type: string;
  x: number;
  y: number;
  z: number;
  nominal: number;
  tolerance?: { plus: number; minus: number };
  tool_used?: string;
  operation?: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MastercamFAIBridge {

  /**
   * Extract ballooned characteristics from Mastercam feature data
   */
  extractCharacteristics(features: MastercamFeatureExtraction[]): FAICharacteristic[] {
    const characteristics: FAICharacteristic[] = [];
    let balloonNumber = 1;

    for (const feature of features) {
      const tolPlus = feature.tolerance?.plus ?? 0.005;
      const tolMinus = feature.tolerance?.minus ?? 0.005;

      let charType: FAICharacteristic["characteristic_type"] = "dimension";
      if (feature.feature_type.includes("position") || feature.feature_type.includes("hole")) {
        charType = "position";
      } else if (feature.feature_type.includes("surface") || feature.feature_type.includes("finish")) {
        charType = "surface";
      }

      characteristics.push({
        balloon_number: balloonNumber++,
        characteristic_designator: feature.feature_id,
        characteristic_type: charType,
        nominal: feature.nominal.toFixed(4),
        tolerance_plus: `+${tolPlus.toFixed(4)}`,
        tolerance_minus: `-${tolMinus.toFixed(4)}`,
        result: "PENDING",
        method: this.suggestMeasurementMethod(feature),
        equipment: this.suggestEquipment(feature)
      });
    }

    return characteristics;
  }

  /**
   * Suggest measurement method based on feature type
   */
  private suggestMeasurementMethod(feature: MastercamFeatureExtraction): string {
    if (feature.feature_type.includes("diameter")) {
      return feature.nominal > 25 ? "Micrometer" : "Pin Gauge";
    }
    if (feature.feature_type.includes("depth")) {
      return "Depth Micrometer";
    }
    if (feature.feature_type.includes("position")) {
      return "CMM";
    }
    if (feature.feature_type.includes("surface")) {
      return "Profilometer";
    }
    if (feature.feature_type.includes("thread")) {
      return "Thread Gauge (Go/No-Go)";
    }
    return "Caliper";
  }

  /**
   * Suggest equipment based on feature and tolerance
   */
  private suggestEquipment(feature: MastercamFeatureExtraction): string {
    const tol = feature.tolerance?.plus ?? 0.005;

    if (tol <= 0.0001) {
      return "CMM (Zeiss/Hexagon)";
    }
    if (tol <= 0.0005) {
      return "Digital Micrometer 0.0001\"";
    }
    if (tol <= 0.001) {
      return "Digital Micrometer 0.0005\"";
    }
    if (tol <= 0.005) {
      return "Digital Caliper 0.001\"";
    }
    return "Tape Measure";
  }

  /**
   * Generate blank FAI Form 1
   */
  createForm1(
    partNumber: string,
    partName: string,
    revision: string,
    drawingNumber: string,
    organization: string,
    reason: FAIForm1["reason_for_fai"] = "new_part"
  ): FAIForm1 {
    return {
      part_number: partNumber,
      part_name: partName,
      revision: revision,
      drawing_number: drawingNumber,
      organization_name: organization,
      reason_for_fai: reason,
      inspection_date: new Date().toISOString().split("T")[0],
      fai_report_number: `FAI-${partNumber}-${Date.now().toString(36).toUpperCase()}`
    };
  }

  /**
   * Generate blank FAI Form 2
   */
  createForm2(
    materials: FAIForm2["materials"] = [],
    processes: FAIForm2["special_processes"] = [],
    tests: FAIForm2["functional_tests"] = []
  ): FAIForm2 {
    return {
      materials,
      special_processes: processes,
      functional_tests: tests
    };
  }

  /**
   * Generate FAI Form 3 from characteristics
   */
  createForm3(characteristics: FAICharacteristic[]): FAIForm3 {
    const passed = characteristics.filter(c => c.result === "PASS").length;
    const failed = characteristics.filter(c => c.result === "FAIL").length;
    const pending = characteristics.filter(c => c.result === "PENDING").length;

    return {
      characteristics,
      total_characteristics: characteristics.length,
      passed,
      failed,
      pending,
      all_passed: failed === 0 && pending === 0
    };
  }

  /**
   * Generate complete FAI report
   */
  generateReport(
    form1: FAIForm1,
    form2: FAIForm2,
    characteristics: FAICharacteristic[]
  ): FAIReport {
    const form3 = this.createForm3(characteristics);

    const status: FAIReport["status"] = form3.pending > 0 ? "draft" :
      form3.failed > 0 ? "rejected" :
      "complete";

    log.info(`[MastercamFAIBridge] Generated FAI report ${form1.fai_report_number}: ` +
      `${form3.passed}/${form3.total_characteristics} passed`);

    return {
      form1,
      form2,
      form3,
      created_date: new Date().toISOString(),
      status,
      compliance: "AS9102_Rev_C"
    };
  }

  /**
   * Apply measurement data to characteristics
   */
  applyMeasurements(
    characteristics: FAICharacteristic[],
    measurements: Array<{ balloon_number: number; measured_value: number }>
  ): FAICharacteristic[] {
    return characteristics.map(char => {
      const measurement = measurements.find(m => m.balloon_number === char.balloon_number);
      if (!measurement) return char;

      const nominal = parseFloat(char.nominal);
      const tolPlus = parseFloat(char.tolerance_plus);
      const tolMinus = parseFloat(char.tolerance_minus);
      const measured = measurement.measured_value;
      const deviation = measured - nominal;

      const pass = deviation >= tolMinus && deviation <= tolPlus;

      return {
        ...char,
        measured_value: measured.toFixed(4),
        deviation: deviation >= 0 ? `+${deviation.toFixed(4)}` : deviation.toFixed(4),
        result: pass ? "PASS" : "FAIL"
      };
    });
  }

  /**
   * Export FAI report as JSON (for integration with Net-Inspect, QualityOne, etc.)
   */
  exportJSON(report: FAIReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate balloon drawing data
   */
  generateBalloonData(characteristics: FAICharacteristic[]): Array<{
    balloon_number: number;
    x: number;
    y: number;
    text: string;
  }> {
    // Placeholder - would integrate with drawing view data
    return characteristics.map((c, i) => ({
      balloon_number: c.balloon_number,
      x: 100 + (i % 10) * 50,
      y: 100 + Math.floor(i / 10) * 50,
      text: c.balloon_number.toString()
    }));
  }

  /**
   * Get stats about FAI bridge capabilities
   */
  getStats(): {
    forms_supported: number;
    compliance_standards: string[];
    characteristic_types: number;
  } {
    return {
      forms_supported: 3,
      compliance_standards: ["AS9102_Rev_C", "AS9102_Rev_B"],
      characteristic_types: 5
    };
  }
}

// Singleton export
export const mastercamFAIBridge = new MastercamFAIBridge();
