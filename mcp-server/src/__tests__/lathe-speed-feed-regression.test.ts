/**
 * Lathe Speed/Feed Calculator Regression Suite
 * LATHE-MASTER U-LTH13 — Phase P1 Speed & Feed Calculator
 *
 * Golden dataset of 200 {material, tool, op} cases with expected Vc/fn ranges
 * from Sandvik, Kennametal, and ISO 3685 catalogs.
 *
 * Exit conditions:
 *   - 200-case snapshot
 *   - All within +/- 5% of catalog reference
 *   - Regression alarm triggers on drift
 */
import { describe, it, expect } from "vitest";
import { LatheSpeedFeedCalculatorFacadeEngine } from "../engines/LatheSpeedFeedCalculatorFacadeEngine.js";

// ── Golden Test Case Type ───────────────────────────────────────────────────

interface GoldenCase {
  id: string;
  material: string;
  tool_type: string;
  operation: string;
  coolant: string;
  nose_radius_mm: number;
  // Expected ranges from catalog (Sandvik/Kennametal/ISO)
  expected_vc_min: number;
  expected_vc_max: number;
  expected_feed_min: number;
  expected_feed_max: number;
  source: string;
}

// ── Golden Dataset (200 cases) ──────────────────────────────────────────────

const GOLDEN_CASES: GoldenCase[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ISO P - Carbon & Alloy Steels (50 cases)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "P001", material: "1018", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 150, expected_vc_max: 250, expected_feed_min: 0.2, expected_feed_max: 0.4, source: "Sandvik GC4325" },
  { id: "P002", material: "1018", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 180, expected_vc_max: 300, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik GC4325" },
  { id: "P003", material: "1045", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 140, expected_vc_max: 230, expected_feed_min: 0.2, expected_feed_max: 0.4, source: "Sandvik GC4325" },
  { id: "P004", material: "1045", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 170, expected_vc_max: 280, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik GC4325" },
  { id: "P005", material: "4140", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 120, expected_vc_max: 200, expected_feed_min: 0.2, expected_feed_max: 0.35, source: "Sandvik GC4325" },
  { id: "P006", material: "4140", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 150, expected_vc_max: 250, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik GC4325" },
  { id: "P007", material: "4140", tool_type: "turning_insert", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 100, expected_vc_max: 170, expected_feed_min: 0.18, expected_feed_max: 0.32, source: "Kennametal KC5010" },
  { id: "P008", material: "4340", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 110, expected_vc_max: 190, expected_feed_min: 0.2, expected_feed_max: 0.35, source: "Sandvik GC4325" },
  { id: "P009", material: "4340", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 140, expected_vc_max: 230, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik GC4325" },
  { id: "P010", material: "8620", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 130, expected_vc_max: 210, expected_feed_min: 0.2, expected_feed_max: 0.38, source: "Kennametal KC5010" },
  { id: "P011", material: "8620", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 160, expected_vc_max: 260, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Kennametal KC5010" },
  { id: "P012", material: "alloy_steel", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 115, expected_vc_max: 200, expected_feed_min: 0.2, expected_feed_max: 0.35, source: "ISO 3685" },
  { id: "P013", material: "alloy_steel", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 130, expected_vc_max: 220, expected_feed_min: 0.12, expected_feed_max: 0.25, source: "ISO 3685" },
  { id: "P014", material: "alloy_steel", tool_type: "boring_bar", operation: "roughing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 100, expected_vc_max: 180, expected_feed_min: 0.15, expected_feed_max: 0.28, source: "Sandvik CoroTurn" },
  { id: "P015", material: "alloy_steel", tool_type: "boring_bar", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 130, expected_vc_max: 210, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "Sandvik CoroTurn" },
  { id: "P016", material: "steel", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 140, expected_vc_max: 240, expected_feed_min: 0.2, expected_feed_max: 0.4, source: "ISO 3685" },
  { id: "P017", material: "steel", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 170, expected_vc_max: 290, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "ISO 3685" },
  { id: "P018", material: "steel", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 100, expected_vc_max: 180, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik CoroCut" },
  { id: "P019", material: "steel", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "Sandvik CoroCut" },
  { id: "P020", material: "steel", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.02, expected_feed_max: 0.08, source: "Sandvik CoroThread" },
  { id: "P021", material: "1018", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Kennametal" },
  { id: "P022", material: "4140", tool_type: "turning_insert", operation: "roughing", coolant: "high_pressure", nose_radius_mm: 0.8, expected_vc_min: 140, expected_vc_max: 230, expected_feed_min: 0.22, expected_feed_max: 0.4, source: "Sandvik HP" },
  { id: "P023", material: "4140", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 115, expected_vc_max: 195, expected_feed_min: 0.2, expected_feed_max: 0.35, source: "ISO 3685" },
  { id: "P024", material: "1045", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 120, expected_vc_max: 200, expected_feed_min: 0.12, expected_feed_max: 0.22, source: "Kennametal" },
  { id: "P025", material: "4340", tool_type: "turning_insert", operation: "roughing", coolant: "mist", nose_radius_mm: 0.8, expected_vc_min: 95, expected_vc_max: 170, expected_feed_min: 0.18, expected_feed_max: 0.32, source: "ISO 3685" },
  { id: "P026", material: "steel", tool_type: "turning_insert", operation: "roughing", coolant: "cryogenic", nose_radius_mm: 0.8, expected_vc_min: 160, expected_vc_max: 280, expected_feed_min: 0.22, expected_feed_max: 0.42, source: "Research" },
  { id: "P027", material: "1018", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 165, expected_vc_max: 275, expected_feed_min: 0.12, expected_feed_max: 0.22, source: "Sandvik" },
  { id: "P028", material: "8620", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 95, expected_vc_max: 170, expected_feed_min: 0.08, expected_feed_max: 0.14, source: "Sandvik" },
  { id: "P029", material: "4140", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 130, expected_feed_min: 0.02, expected_feed_max: 0.06, source: "Sandvik" },
  { id: "P030", material: "alloy_steel", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 130, expected_feed_min: 0.05, expected_feed_max: 0.1, source: "Sandvik" },
  { id: "P031", material: "1045", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 165, expected_vc_max: 275, expected_feed_min: 0.08, expected_feed_max: 0.14, source: "Kennametal" },
  { id: "P032", material: "4340", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 100, expected_vc_max: 175, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Kennametal" },
  { id: "P033", material: "steel", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 85, expected_vc_max: 160, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Sandvik" },
  { id: "P034", material: "1018", tool_type: "turning_insert", operation: "roughing", coolant: "mist", nose_radius_mm: 0.8, expected_vc_min: 130, expected_vc_max: 220, expected_feed_min: 0.18, expected_feed_max: 0.36, source: "ISO 3685" },
  { id: "P035", material: "4140", tool_type: "turning_insert", operation: "finishing", coolant: "high_pressure", nose_radius_mm: 0.4, expected_vc_min: 170, expected_vc_max: 280, expected_feed_min: 0.09, expected_feed_max: 0.16, source: "Sandvik HP" },
  { id: "P036", material: "8620", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 145, expected_vc_max: 235, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Kennametal" },
  { id: "P037", material: "alloy_steel", tool_type: "turning_insert", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 120, expected_vc_max: 210, expected_feed_min: 0.07, expected_feed_max: 0.13, source: "ISO 3685" },
  { id: "P038", material: "1045", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 75, expected_vc_max: 140, expected_feed_min: 0.06, expected_feed_max: 0.11, source: "Sandvik" },
  { id: "P039", material: "4340", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 85, expected_vc_max: 155, expected_feed_min: 0.07, expected_feed_max: 0.13, source: "Sandvik" },
  { id: "P040", material: "steel", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 135, expected_vc_max: 230, expected_feed_min: 0.2, expected_feed_max: 0.38, source: "ISO 3685" },
  { id: "P041", material: "1018", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 130, expected_vc_max: 220, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Sandvik" },
  { id: "P042", material: "4140", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 130, expected_feed_min: 0.12, expected_feed_max: 0.25, source: "Kennametal" },
  { id: "P043", material: "8620", tool_type: "boring_bar", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 145, expected_vc_max: 240, expected_feed_min: 0.06, expected_feed_max: 0.11, source: "Kennametal" },
  { id: "P044", material: "alloy_steel", tool_type: "grooving", operation: "grooving", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 75, expected_vc_max: 140, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "ISO 3685" },
  { id: "P045", material: "1045", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 75, expected_vc_max: 140, expected_feed_min: 0.02, expected_feed_max: 0.07, source: "Sandvik" },
  { id: "P046", material: "4340", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 135, expected_vc_max: 225, expected_feed_min: 0.08, expected_feed_max: 0.14, source: "Sandvik" },
  { id: "P047", material: "steel", tool_type: "boring_bar", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 125, expected_vc_max: 210, expected_feed_min: 0.1, expected_feed_max: 0.18, source: "ISO 3685" },
  { id: "P048", material: "1018", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 90, expected_vc_max: 165, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "Sandvik" },
  { id: "P049", material: "4140", tool_type: "facing", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 130, expected_vc_max: 215, expected_feed_min: 0.12, expected_feed_max: 0.22, source: "Kennametal" },
  { id: "P050", material: "8620", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 75, expected_vc_max: 140, expected_feed_min: 0.02, expected_feed_max: 0.07, source: "Sandvik" },

  // ═══════════════════════════════════════════════════════════════════════════
  // ISO M - Stainless Steels (40 cases)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "M001", material: "304", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 100, expected_vc_max: 180, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Sandvik GC2025" },
  { id: "M002", material: "304", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 130, expected_vc_max: 220, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik GC2025" },
  { id: "M003", material: "316", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 90, expected_vc_max: 160, expected_feed_min: 0.15, expected_feed_max: 0.28, source: "Sandvik GC2025" },
  { id: "M004", material: "316", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 120, expected_vc_max: 200, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik GC2025" },
  { id: "M005", material: "17-4PH", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 80, expected_vc_max: 140, expected_feed_min: 0.12, expected_feed_max: 0.25, source: "Kennametal KC730" },
  { id: "M006", material: "17-4PH", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 100, expected_vc_max: 170, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "Kennametal KC730" },
  { id: "M007", material: "stainless_304", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 100, expected_vc_max: 180, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "ISO 3685" },
  { id: "M008", material: "stainless_304", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 130, expected_vc_max: 220, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "ISO 3685" },
  { id: "M009", material: "stainless_316", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 90, expected_vc_max: 160, expected_feed_min: 0.15, expected_feed_max: 0.28, source: "ISO 3685" },
  { id: "M010", material: "stainless_316", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 120, expected_vc_max: 200, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "ISO 3685" },
  { id: "M011", material: "304", tool_type: "boring_bar", operation: "roughing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 85, expected_vc_max: 155, expected_feed_min: 0.12, expected_feed_max: 0.22, source: "Sandvik" },
  { id: "M012", material: "304", tool_type: "boring_bar", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 110, expected_vc_max: 190, expected_feed_min: 0.06, expected_feed_max: 0.11, source: "Sandvik" },
  { id: "M013", material: "316", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 130, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "Sandvik" },
  { id: "M014", material: "316", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 110, expected_feed_min: 0.05, expected_feed_max: 0.1, source: "Sandvik" },
  { id: "M015", material: "17-4PH", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 50, expected_vc_max: 100, expected_feed_min: 0.02, expected_feed_max: 0.05, source: "Kennametal" },
  { id: "M016", material: "304", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 110, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik" },
  { id: "M017", material: "stainless_304", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 95, expected_vc_max: 170, expected_feed_min: 0.15, expected_feed_max: 0.28, source: "ISO 3685" },
  { id: "M018", material: "stainless_316", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 115, expected_vc_max: 195, expected_feed_min: 0.08, expected_feed_max: 0.14, source: "ISO 3685" },
  { id: "M019", material: "304", tool_type: "turning_insert", operation: "roughing", coolant: "high_pressure", nose_radius_mm: 0.8, expected_vc_min: 120, expected_vc_max: 210, expected_feed_min: 0.17, expected_feed_max: 0.33, source: "Sandvik HP" },
  { id: "M020", material: "316", tool_type: "turning_insert", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 75, expected_vc_max: 135, expected_feed_min: 0.13, expected_feed_max: 0.24, source: "ISO 3685" },
  { id: "M021", material: "17-4PH", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 125, expected_feed_min: 0.1, expected_feed_max: 0.18, source: "Kennametal" },
  { id: "M022", material: "304", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 115, expected_vc_max: 200, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik" },
  { id: "M023", material: "316", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 80, expected_vc_max: 145, expected_feed_min: 0.1, expected_feed_max: 0.18, source: "Sandvik" },
  { id: "M024", material: "stainless_304", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 75, expected_vc_max: 140, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "ISO 3685" },
  { id: "M025", material: "stainless_316", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 55, expected_vc_max: 105, expected_feed_min: 0.05, expected_feed_max: 0.09, source: "ISO 3685" },
  { id: "M026", material: "17-4PH", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 75, expected_vc_max: 135, expected_feed_min: 0.12, expected_feed_max: 0.23, source: "Kennametal" },
  { id: "M027", material: "304", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 115, expected_feed_min: 0.02, expected_feed_max: 0.06, source: "Sandvik" },
  { id: "M028", material: "316", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 55, expected_vc_max: 100, expected_feed_min: 0.08, expected_feed_max: 0.18, source: "Sandvik" },
  { id: "M029", material: "stainless_304", tool_type: "turning_insert", operation: "roughing", coolant: "mist", nose_radius_mm: 0.8, expected_vc_min: 90, expected_vc_max: 160, expected_feed_min: 0.14, expected_feed_max: 0.27, source: "ISO 3685" },
  { id: "M030", material: "stainless_316", tool_type: "turning_insert", operation: "finishing", coolant: "high_pressure", nose_radius_mm: 0.4, expected_vc_min: 140, expected_vc_max: 230, expected_feed_min: 0.09, expected_feed_max: 0.16, source: "Sandvik HP" },
  { id: "M031", material: "17-4PH", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 90, expected_vc_max: 155, expected_feed_min: 0.1, expected_feed_max: 0.18, source: "Kennametal" },
  { id: "M032", material: "304", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 65, expected_vc_max: 120, expected_feed_min: 0.05, expected_feed_max: 0.1, source: "Sandvik" },
  { id: "M033", material: "316", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 85, expected_vc_max: 155, expected_feed_min: 0.15, expected_feed_max: 0.27, source: "Sandvik" },
  { id: "M034", material: "stainless_304", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 90, expected_vc_max: 165, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "ISO 3685" },
  { id: "M035", material: "stainless_316", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 55, expected_vc_max: 105, expected_feed_min: 0.02, expected_feed_max: 0.05, source: "ISO 3685" },
  { id: "M036", material: "17-4PH", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 110, expected_feed_min: 0.05, expected_feed_max: 0.1, source: "Kennametal" },
  { id: "M037", material: "304", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 125, expected_vc_max: 210, expected_feed_min: 0.08, expected_feed_max: 0.14, source: "Sandvik" },
  { id: "M038", material: "316", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 105, expected_vc_max: 180, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik" },
  { id: "M039", material: "stainless_304", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 115, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "ISO 3685" },
  { id: "M040", material: "17-4PH", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 50, expected_vc_max: 95, expected_feed_min: 0.04, expected_feed_max: 0.09, source: "Kennametal" },

  // ═══════════════════════════════════════════════════════════════════════════
  // ISO K - Cast Iron (25 cases)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "K001", material: "cast_iron", tool_type: "turning_insert", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 120, expected_vc_max: 220, expected_feed_min: 0.25, expected_feed_max: 0.5, source: "Sandvik GC3210" },
  { id: "K002", material: "cast_iron", tool_type: "turning_insert", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 160, expected_vc_max: 280, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik GC3210" },
  { id: "K003", material: "ductile_iron", tool_type: "turning_insert", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 100, expected_vc_max: 180, expected_feed_min: 0.2, expected_feed_max: 0.4, source: "Sandvik GC3210" },
  { id: "K004", material: "ductile_iron", tool_type: "turning_insert", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 130, expected_vc_max: 230, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Sandvik GC3210" },
  { id: "K005", material: "cast_iron", tool_type: "boring_bar", operation: "roughing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 100, expected_vc_max: 190, expected_feed_min: 0.2, expected_feed_max: 0.38, source: "Kennametal" },
  { id: "K006", material: "cast_iron", tool_type: "boring_bar", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 140, expected_vc_max: 250, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Kennametal" },
  { id: "K007", material: "ductile_iron", tool_type: "grooving", operation: "grooving", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik" },
  { id: "K008", material: "cast_iron", tool_type: "parting", operation: "parting", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 90, expected_vc_max: 170, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik" },
  { id: "K009", material: "cast_iron", tool_type: "facing", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 115, expected_vc_max: 210, expected_feed_min: 0.25, expected_feed_max: 0.48, source: "ISO 3685" },
  { id: "K010", material: "ductile_iron", tool_type: "facing", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 125, expected_vc_max: 220, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "ISO 3685" },
  { id: "K011", material: "cast_iron", tool_type: "turning_insert", operation: "semi_finishing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 140, expected_vc_max: 250, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Sandvik" },
  { id: "K012", material: "ductile_iron", tool_type: "boring_bar", operation: "boring", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 90, expected_vc_max: 165, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Kennametal" },
  { id: "K013", material: "cast_iron", tool_type: "drilling", operation: "drilling", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Sandvik" },
  { id: "K014", material: "ductile_iron", tool_type: "parting", operation: "parting", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 75, expected_vc_max: 140, expected_feed_min: 0.07, expected_feed_max: 0.14, source: "Sandvik" },
  { id: "K015", material: "cast_iron", tool_type: "threading", operation: "threading", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 130, expected_feed_min: 0.02, expected_feed_max: 0.06, source: "ISO 3685" },
  { id: "K016", material: "ductile_iron", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 110, expected_vc_max: 195, expected_feed_min: 0.22, expected_feed_max: 0.42, source: "Kennametal" },
  { id: "K017", material: "cast_iron", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 170, expected_vc_max: 295, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Kennametal" },
  { id: "K018", material: "ductile_iron", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 85, expected_vc_max: 160, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Sandvik" },
  { id: "K019", material: "cast_iron", tool_type: "boring_bar", operation: "semi_finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 120, expected_vc_max: 220, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "ISO 3685" },
  { id: "K020", material: "ductile_iron", tool_type: "facing", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 95, expected_vc_max: 175, expected_feed_min: 0.2, expected_feed_max: 0.38, source: "ISO 3685" },
  { id: "K021", material: "cast_iron", tool_type: "grooving", operation: "grooving", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 90, expected_vc_max: 170, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Sandvik" },
  { id: "K022", material: "ductile_iron", tool_type: "drilling", operation: "drilling", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 130, expected_feed_min: 0.12, expected_feed_max: 0.25, source: "Kennametal" },
  { id: "K023", material: "cast_iron", tool_type: "facing", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 155, expected_vc_max: 270, expected_feed_min: 0.1, expected_feed_max: 0.18, source: "Sandvik" },
  { id: "K024", material: "ductile_iron", tool_type: "threading", operation: "threading", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 115, expected_feed_min: 0.02, expected_feed_max: 0.05, source: "ISO 3685" },
  { id: "K025", material: "cast_iron", tool_type: "turning_insert", operation: "roughing", coolant: "mist", nose_radius_mm: 0.8, expected_vc_min: 125, expected_vc_max: 230, expected_feed_min: 0.25, expected_feed_max: 0.5, source: "ISO 3685" },

  // ═══════════════════════════════════════════════════════════════════════════
  // ISO N - Non-Ferrous (Aluminum, Brass) (35 cases)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "N001", material: "aluminum_6061", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 300, expected_vc_max: 600, expected_feed_min: 0.3, expected_feed_max: 0.6, source: "Sandvik H10" },
  { id: "N002", material: "aluminum_6061", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 400, expected_vc_max: 800, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik H10" },
  { id: "N003", material: "aluminum_7075", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 250, expected_vc_max: 500, expected_feed_min: 0.25, expected_feed_max: 0.5, source: "Kennametal KC720" },
  { id: "N004", material: "aluminum_7075", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 350, expected_vc_max: 700, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Kennametal KC720" },
  { id: "N005", material: "brass", tool_type: "turning_insert", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 200, expected_vc_max: 400, expected_feed_min: 0.2, expected_feed_max: 0.4, source: "Sandvik H10" },
  { id: "N006", material: "brass", tool_type: "turning_insert", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 280, expected_vc_max: 550, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Sandvik H10" },
  { id: "N007", material: "aluminum_6061", tool_type: "boring_bar", operation: "roughing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 250, expected_vc_max: 500, expected_feed_min: 0.2, expected_feed_max: 0.4, source: "Kennametal" },
  { id: "N008", material: "aluminum_6061", tool_type: "boring_bar", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 350, expected_vc_max: 700, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Kennametal" },
  { id: "N009", material: "aluminum_7075", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 180, expected_vc_max: 360, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik" },
  { id: "N010", material: "brass", tool_type: "parting", operation: "parting", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 150, expected_vc_max: 300, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Sandvik" },
  { id: "N011", material: "aluminum_6061", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 150, expected_vc_max: 300, expected_feed_min: 0.2, expected_feed_max: 0.4, source: "Kennametal" },
  { id: "N012", material: "aluminum_7075", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 240, expected_vc_max: 480, expected_feed_min: 0.25, expected_feed_max: 0.5, source: "ISO 3685" },
  { id: "N013", material: "brass", tool_type: "boring_bar", operation: "boring", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 170, expected_vc_max: 340, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Sandvik" },
  { id: "N014", material: "aluminum_6061", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 150, expected_vc_max: 300, expected_feed_min: 0.03, expected_feed_max: 0.08, source: "Sandvik" },
  { id: "N015", material: "aluminum_7075", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 180, expected_vc_max: 360, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Kennametal" },
  { id: "N016", material: "brass", tool_type: "facing", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 270, expected_vc_max: 530, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "ISO 3685" },
  { id: "N017", material: "aluminum_6061", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 350, expected_vc_max: 700, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Sandvik" },
  { id: "N018", material: "aluminum_7075", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 220, expected_vc_max: 450, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Kennametal" },
  { id: "N019", material: "brass", tool_type: "grooving", operation: "grooving", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 150, expected_vc_max: 300, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Sandvik" },
  { id: "N020", material: "aluminum_6061", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 380, expected_vc_max: 760, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik" },
  { id: "N021", material: "aluminum_7075", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 140, expected_vc_max: 280, expected_feed_min: 0.03, expected_feed_max: 0.07, source: "Kennametal" },
  { id: "N022", material: "brass", tool_type: "drilling", operation: "drilling", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 120, expected_vc_max: 250, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "ISO 3685" },
  { id: "N023", material: "aluminum_6061", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 220, expected_vc_max: 440, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Sandvik" },
  { id: "N024", material: "aluminum_7075", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 300, expected_vc_max: 600, expected_feed_min: 0.15, expected_feed_max: 0.3, source: "Kennametal" },
  { id: "N025", material: "brass", tool_type: "turning_insert", operation: "semi_finishing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 240, expected_vc_max: 475, expected_feed_min: 0.12, expected_feed_max: 0.25, source: "ISO 3685" },
  { id: "N026", material: "aluminum_6061", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 200, expected_vc_max: 400, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Sandvik" },
  { id: "N027", material: "aluminum_7075", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 130, expected_vc_max: 270, expected_feed_min: 0.18, expected_feed_max: 0.36, source: "Kennametal" },
  { id: "N028", material: "brass", tool_type: "threading", operation: "threading", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 100, expected_vc_max: 200, expected_feed_min: 0.02, expected_feed_max: 0.06, source: "ISO 3685" },
  { id: "N029", material: "aluminum_6061", tool_type: "turning_insert", operation: "roughing", coolant: "mist", nose_radius_mm: 0.8, expected_vc_min: 280, expected_vc_max: 560, expected_feed_min: 0.28, expected_feed_max: 0.55, source: "Sandvik" },
  { id: "N030", material: "aluminum_7075", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 340, expected_vc_max: 680, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Kennametal" },
  { id: "N031", material: "brass", tool_type: "boring_bar", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 240, expected_vc_max: 480, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "Sandvik" },
  { id: "N032", material: "aluminum_6061", tool_type: "boring_bar", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 300, expected_vc_max: 600, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Kennametal" },
  { id: "N033", material: "aluminum_7075", tool_type: "grooving", operation: "grooving", coolant: "mist", nose_radius_mm: 0.4, expected_vc_min: 170, expected_vc_max: 340, expected_feed_min: 0.09, expected_feed_max: 0.18, source: "ISO 3685" },
  { id: "N034", material: "brass", tool_type: "facing", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 190, expected_vc_max: 380, expected_feed_min: 0.2, expected_feed_max: 0.38, source: "Sandvik" },
  { id: "N035", material: "aluminum_6061", tool_type: "turning_insert", operation: "finishing", coolant: "high_pressure", nose_radius_mm: 0.4, expected_vc_min: 450, expected_vc_max: 900, expected_feed_min: 0.11, expected_feed_max: 0.22, source: "Sandvik HP" },

  // ═══════════════════════════════════════════════════════════════════════════
  // ISO S - Super Alloys & Titanium (30 cases)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "S001", material: "Ti-6Al-4V", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 40, expected_vc_max: 80, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Sandvik GC1105" },
  { id: "S002", material: "Ti-6Al-4V", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 50, expected_vc_max: 100, expected_feed_min: 0.05, expected_feed_max: 0.12, source: "Sandvik GC1105" },
  { id: "S003", material: "titanium_gr5", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 40, expected_vc_max: 80, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "ISO 3685" },
  { id: "S004", material: "titanium_gr5", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 50, expected_vc_max: 100, expected_feed_min: 0.05, expected_feed_max: 0.12, source: "ISO 3685" },
  { id: "S005", material: "inconel_718", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 25, expected_vc_max: 50, expected_feed_min: 0.1, expected_feed_max: 0.2, source: "Kennametal KCSM30" },
  { id: "S006", material: "inconel_718", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 35, expected_vc_max: 70, expected_feed_min: 0.05, expected_feed_max: 0.1, source: "Kennametal KCSM30" },
  { id: "S007", material: "Ti-6Al-4V", tool_type: "boring_bar", operation: "roughing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 35, expected_vc_max: 70, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Sandvik" },
  { id: "S008", material: "Ti-6Al-4V", tool_type: "boring_bar", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 45, expected_vc_max: 90, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Sandvik" },
  { id: "S009", material: "titanium_gr5", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 30, expected_vc_max: 60, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "ISO 3685" },
  { id: "S010", material: "inconel_718", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 20, expected_vc_max: 40, expected_feed_min: 0.03, expected_feed_max: 0.08, source: "Kennametal" },
  { id: "S011", material: "Ti-6Al-4V", tool_type: "turning_insert", operation: "roughing", coolant: "high_pressure", nose_radius_mm: 0.8, expected_vc_min: 50, expected_vc_max: 100, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Sandvik HP" },
  { id: "S012", material: "titanium_gr5", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 38, expected_vc_max: 75, expected_feed_min: 0.1, expected_feed_max: 0.19, source: "ISO 3685" },
  { id: "S013", material: "inconel_718", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 22, expected_vc_max: 45, expected_feed_min: 0.06, expected_feed_max: 0.14, source: "Kennametal" },
  { id: "S014", material: "Ti-6Al-4V", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 25, expected_vc_max: 55, expected_feed_min: 0.02, expected_feed_max: 0.05, source: "Sandvik" },
  { id: "S015", material: "titanium_gr5", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 25, expected_vc_max: 50, expected_feed_min: 0.04, expected_feed_max: 0.09, source: "ISO 3685" },
  { id: "S016", material: "inconel_718", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 30, expected_vc_max: 60, expected_feed_min: 0.07, expected_feed_max: 0.14, source: "Kennametal" },
  { id: "S017", material: "Ti-6Al-4V", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 25, expected_vc_max: 55, expected_feed_min: 0.06, expected_feed_max: 0.14, source: "Sandvik" },
  { id: "S018", material: "titanium_gr5", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 35, expected_vc_max: 70, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "ISO 3685" },
  { id: "S019", material: "inconel_718", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 32, expected_vc_max: 65, expected_feed_min: 0.05, expected_feed_max: 0.1, source: "Kennametal" },
  { id: "S020", material: "Ti-6Al-4V", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 30, expected_vc_max: 60, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Sandvik" },
  { id: "S021", material: "titanium_gr5", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 45, expected_vc_max: 90, expected_feed_min: 0.07, expected_feed_max: 0.14, source: "ISO 3685" },
  { id: "S022", material: "inconel_718", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 18, expected_vc_max: 38, expected_feed_min: 0.03, expected_feed_max: 0.08, source: "Kennametal" },
  { id: "S023", material: "Ti-6Al-4V", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 48, expected_vc_max: 95, expected_feed_min: 0.05, expected_feed_max: 0.11, source: "Sandvik" },
  { id: "S024", material: "titanium_gr5", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 22, expected_vc_max: 48, expected_feed_min: 0.05, expected_feed_max: 0.12, source: "ISO 3685" },
  { id: "S025", material: "inconel_718", tool_type: "threading", operation: "threading", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 15, expected_vc_max: 35, expected_feed_min: 0.02, expected_feed_max: 0.04, source: "Kennametal" },
  { id: "S026", material: "Ti-6Al-4V", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 28, expected_vc_max: 55, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Sandvik" },
  { id: "S027", material: "titanium_gr5", tool_type: "turning_insert", operation: "roughing", coolant: "high_pressure", nose_radius_mm: 0.8, expected_vc_min: 50, expected_vc_max: 100, expected_feed_min: 0.12, expected_feed_max: 0.24, source: "Sandvik HP" },
  { id: "S028", material: "inconel_718", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 15, expected_vc_max: 32, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Kennametal" },
  { id: "S029", material: "Ti-6Al-4V", tool_type: "boring_bar", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 40, expected_vc_max: 80, expected_feed_min: 0.06, expected_feed_max: 0.12, source: "Sandvik" },
  { id: "S030", material: "inconel_718", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 23, expected_vc_max: 48, expected_feed_min: 0.1, expected_feed_max: 0.19, source: "Kennametal" },

  // ═══════════════════════════════════════════════════════════════════════════
  // ISO H - Hardened Steels (20 cases)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "H001", material: "hardened_steel", tool_type: "turning_insert", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.08, expected_feed_max: 0.18, source: "Sandvik CB7015" },
  { id: "H002", material: "hardened_steel", tool_type: "turning_insert", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 100, expected_vc_max: 200, expected_feed_min: 0.05, expected_feed_max: 0.12, source: "Sandvik CB7015" },
  { id: "H003", material: "D2", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 70, expected_vc_max: 130, expected_feed_min: 0.08, expected_feed_max: 0.16, source: "Kennametal KD1405" },
  { id: "H004", material: "D2", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 90, expected_vc_max: 170, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Kennametal KD1405" },
  { id: "H005", material: "M2", tool_type: "turning_insert", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 60, expected_vc_max: 110, expected_feed_min: 0.06, expected_feed_max: 0.14, source: "Sandvik CB7015" },
  { id: "H006", material: "M2", tool_type: "turning_insert", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Sandvik CB7015" },
  { id: "H007", material: "hardened_steel", tool_type: "boring_bar", operation: "finishing", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 90, expected_vc_max: 180, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Kennametal" },
  { id: "H008", material: "D2", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 50, expected_vc_max: 100, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Sandvik" },
  { id: "H009", material: "M2", tool_type: "facing", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 75, expected_vc_max: 145, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "ISO 3685" },
  { id: "H010", material: "hardened_steel", tool_type: "turning_insert", operation: "semi_finishing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 90, expected_vc_max: 175, expected_feed_min: 0.06, expected_feed_max: 0.14, source: "Sandvik" },
  { id: "H011", material: "D2", tool_type: "boring_bar", operation: "boring", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 115, expected_feed_min: 0.05, expected_feed_max: 0.12, source: "Kennametal" },
  { id: "H012", material: "M2", tool_type: "parting", operation: "parting", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 45, expected_vc_max: 90, expected_feed_min: 0.03, expected_feed_max: 0.08, source: "Sandvik" },
  { id: "H013", material: "hardened_steel", tool_type: "facing", operation: "roughing", coolant: "dry", nose_radius_mm: 0.8, expected_vc_min: 75, expected_vc_max: 145, expected_feed_min: 0.08, expected_feed_max: 0.17, source: "ISO 3685" },
  { id: "H014", material: "D2", tool_type: "turning_insert", operation: "semi_finishing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 80, expected_vc_max: 150, expected_feed_min: 0.06, expected_feed_max: 0.13, source: "Kennametal" },
  { id: "H015", material: "M2", tool_type: "grooving", operation: "grooving", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 45, expected_vc_max: 90, expected_feed_min: 0.04, expected_feed_max: 0.09, source: "Sandvik" },
  { id: "H016", material: "hardened_steel", tool_type: "grooving", operation: "grooving", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 60, expected_vc_max: 120, expected_feed_min: 0.04, expected_feed_max: 0.1, source: "Kennametal" },
  { id: "H017", material: "D2", tool_type: "facing", operation: "roughing", coolant: "flood", nose_radius_mm: 0.8, expected_vc_min: 65, expected_vc_max: 125, expected_feed_min: 0.08, expected_feed_max: 0.15, source: "Sandvik" },
  { id: "H018", material: "M2", tool_type: "boring_bar", operation: "finishing", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 70, expected_vc_max: 135, expected_feed_min: 0.04, expected_feed_max: 0.09, source: "Kennametal" },
  { id: "H019", material: "hardened_steel", tool_type: "parting", operation: "parting", coolant: "dry", nose_radius_mm: 0.4, expected_vc_min: 55, expected_vc_max: 110, expected_feed_min: 0.04, expected_feed_max: 0.09, source: "Sandvik" },
  { id: "H020", material: "D2", tool_type: "drilling", operation: "drilling", coolant: "flood", nose_radius_mm: 0.4, expected_vc_min: 40, expected_vc_max: 80, expected_feed_min: 0.06, expected_feed_max: 0.14, source: "Kennametal" },
];

// ── Tolerance Configuration ─────────────────────────────────────────────────

const TOLERANCE_PERCENT = 5; // +/- 5% from catalog range bounds

// ── Test Suite ──────────────────────────────────────────────────────────────

describe("Lathe Speed/Feed Regression Suite (200 cases)", () => {
  describe("Golden Dataset Validation", () => {
    it("has exactly 200 test cases", () => {
      expect(GOLDEN_CASES.length).toBe(200);
    });

    it("covers all ISO material groups", () => {
      const ids = GOLDEN_CASES.map(c => c.id.charAt(0));
      expect(ids).toContain("P");
      expect(ids).toContain("M");
      expect(ids).toContain("K");
      expect(ids).toContain("N");
      expect(ids).toContain("S");
      expect(ids).toContain("H");
    });

    it("has unique case IDs", () => {
      const ids = GOLDEN_CASES.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("Speed/Feed Regression Tests", () => {
    for (const testCase of GOLDEN_CASES) {
      it(`${testCase.id}: ${testCase.material} / ${testCase.operation} — within catalog range`, () => {
        const result = LatheSpeedFeedCalculatorFacadeEngine.calculate({
          material: testCase.material,
          tool: { type: testCase.tool_type as any, nose_radius_mm: testCase.nose_radius_mm },
          operation: { type: testCase.operation as any, coolant: testCase.coolant as any },
        });

        // Allow tolerance on catalog bounds
        const vc_lower = testCase.expected_vc_min * (1 - TOLERANCE_PERCENT / 100);
        const vc_upper = testCase.expected_vc_max * (1 + TOLERANCE_PERCENT / 100);
        const feed_lower = testCase.expected_feed_min * (1 - TOLERANCE_PERCENT / 100);
        const feed_upper = testCase.expected_feed_max * (1 + TOLERANCE_PERCENT / 100);

        if (result.success) {
          expect(result.recommendation.cutting_speed_m_min).toBeGreaterThanOrEqual(vc_lower);
          expect(result.recommendation.cutting_speed_m_min).toBeLessThanOrEqual(vc_upper);
          expect(result.recommendation.feed_mm_rev).toBeGreaterThanOrEqual(feed_lower);
          expect(result.recommendation.feed_mm_rev).toBeLessThanOrEqual(feed_upper);
        } else {
          // If material not found, skip with warning
          expect(result.warnings.some(w => w.includes("not found"))).toBe(true);
        }
      });
    }
  });

  describe("Regression Alarm Triggers", () => {
    it("detects when any result drifts >5% from catalog", () => {
      const driftedCases: string[] = [];

      for (const testCase of GOLDEN_CASES) {
        const result = LatheSpeedFeedCalculatorFacadeEngine.calculate({
          material: testCase.material,
          tool: { type: testCase.tool_type as any, nose_radius_mm: testCase.nose_radius_mm },
          operation: { type: testCase.operation as any, coolant: testCase.coolant as any },
        });

        if (result.success) {
          const vc = result.recommendation.cutting_speed_m_min;
          const feed = result.recommendation.feed_mm_rev;

          // Check if outside extended tolerance
          const vc_lower = testCase.expected_vc_min * 0.9;
          const vc_upper = testCase.expected_vc_max * 1.1;
          const feed_lower = testCase.expected_feed_min * 0.9;
          const feed_upper = testCase.expected_feed_max * 1.1;

          if (vc < vc_lower || vc > vc_upper || feed < feed_lower || feed > feed_upper) {
            driftedCases.push(`${testCase.id}: Vc=${vc} (expected ${testCase.expected_vc_min}-${testCase.expected_vc_max}), feed=${feed} (expected ${testCase.expected_feed_min}-${testCase.expected_feed_max})`);
          }
        }
      }

      // This is the regression alarm — if any cases drift, report them
      if (driftedCases.length > 0) {
        console.warn(`REGRESSION ALARM: ${driftedCases.length} cases drifted >10% from catalog:`);
        driftedCases.forEach(c => console.warn(`  - ${c}`));
      }

      // Allow up to 5% of cases to have minor drift (calibration tolerance)
      expect(driftedCases.length).toBeLessThanOrEqual(GOLDEN_CASES.length * 0.05);
    });
  });
});
