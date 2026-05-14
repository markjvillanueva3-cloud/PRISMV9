/**
 * wedmWireBreakPredictorSchemas.ts
 * Zod schemas for WEDMWireBreakPredictorEngine dispatcher actions
 */
import { z } from "zod";

const WireBreakInputSchema = z.object({
  wireDiameter_mm: z.number().min(0.05).max(0.5).describe("Wire diameter in mm"),
  wireType: z.string().optional().describe("Wire type (brass_hard, zinc_coated, molybdenum, tungsten, etc.)"),
  wireTension_N: z.number().min(1).max(30).optional().describe("Wire tension in Newtons"),
  wireSpeed_mm_min: z.number().min(10).max(300).optional().describe("Wire feed speed in mm/min"),
  peakCurrent_A: z.number().min(1).max(50).describe("Peak discharge current in Amps"),
  onTime_us: z.number().min(0.5).max(200).describe("Pulse on-time in microseconds"),
  offTime_us: z.number().min(1).max(500).describe("Pulse off-time in microseconds"),
  gapVoltage_V: z.number().min(20).max(120).optional().describe("Open-gap voltage"),
  servoVoltage_V: z.number().min(20).max(100).optional().describe("Servo reference voltage"),
  workpieceMaterial: z.string().optional().describe("Workpiece material type"),
  thickness_mm: z.number().min(0.5).max(500).describe("Workpiece thickness in mm"),
  cutLength_mm: z.number().min(1).optional().describe("Total cut length in mm"),
  cornerAngle_deg: z.number().min(0).max(180).optional().describe("Inside corner angle in degrees"),
  taperAngle_deg: z.number().min(0).max(45).optional().describe("Taper angle in degrees"),
  flushingPressure_bar: z.number().min(0).max(20).optional().describe("Flushing pressure in bar"),
  dielectricCondition: z.enum(["clean", "moderate", "contaminated"]).optional().describe("Dielectric fluid condition"),
  cutProgress_pct: z.number().min(0).max(100).optional().describe("Cut progress percentage"),
  wireReuseCount: z.number().min(0).max(10).optional().describe("Number of wire reuse cycles"),
  ambientTemp_C: z.number().min(5).max(50).optional().describe("Ambient temperature in Celsius"),
});

export const WEDM_WIRE_BREAK_PREDICTOR_SCHEMAS = {
  wedm_wire_break_predict: WireBreakInputSchema,
  wedm_wire_break_compare: z.object({
    baseInput: WireBreakInputSchema.describe("Base parameter set to compare against"),
    variations: z.array(WireBreakInputSchema.partial()).describe("Parameter variations to compare"),
  }),
  wedm_wire_break_calibration_stats: z.object({}),
  wedm_wire_break_supported_wires: z.object({}),
  wedm_wire_break_supported_materials: z.object({}),
};
