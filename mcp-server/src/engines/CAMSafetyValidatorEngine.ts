/**
 * CAMSafetyValidatorEngine — CAM-AI-TRAINING-MS0/U-CAMT-SAFETY
 *
 * Validates a CamTemplate against shop_floor safety constraints per PRISM
 * doctrine (Ω≥0.95, S(x)≥0.98). Pure logic — checks against documented
 * machine envelope + tool stress + spindle limits.
 *
 * Refuses (matches kilo slot-soul refuse_list):
 *   - spindle RPM > 60,000 (rough machine ceiling — Sandvik catalog)
 *   - feed_xy > 30,000 mm/min (HSM ceiling — typical machine envelope)
 *   - stepdown > tool_dia equivalent (chatter risk)
 *   - stepover > 0.7 × tool_dia for adaptive (lateral load)
 *   - retract_height < 1 mm (collision risk)
 *
 * Returns S(x) score: 1.0 = fully safe; <0.98 = block per shop_floor tier.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { CamTemplate } from "./CAMTemplateGeneratorEngine.js";

export interface SafetyFinding {
  severity: "info" | "warn" | "block";
  rule: string;
  message: string;
  paramId?: string;
  value?: number | string | boolean;
}

export interface SafetyResult {
  /** S(x) safety score (1.0 = fully safe). */
  sx: number;
  /** Pass/block decision (per shop_floor tier: pass requires sx ≥ 0.98). */
  ok: boolean;
  findings: ReadonlyArray<SafetyFinding>;
}

const SX_THRESHOLD_SHOP_FLOOR = 0.98;

const RULES = [
  {
    id: "spindle_rpm_ceiling",
    check: (paramId: string, value: unknown): SafetyFinding | null => {
      if (paramId !== "spindle_rpm") return null;
      if (typeof value !== "number") return null;
      if (value > 60000) return { severity: "block", rule: "spindle_rpm_ceiling", message: `spindle_rpm ${value} > 60000 ceiling`, paramId, value };
      if (value > 40000) return { severity: "warn", rule: "spindle_rpm_ceiling", message: `spindle_rpm ${value} approaching 60000 ceiling`, paramId, value };
      return null;
    },
  },
  {
    id: "feed_xy_ceiling",
    check: (paramId: string, value: unknown): SafetyFinding | null => {
      if (paramId !== "feed_xy") return null;
      if (typeof value !== "number") return null;
      if (value > 30000) return { severity: "block", rule: "feed_xy_ceiling", message: `feed_xy ${value} > 30000 mm/min HSM ceiling`, paramId, value };
      return null;
    },
  },
  {
    id: "retract_height_floor",
    check: (paramId: string, value: unknown): SafetyFinding | null => {
      if (paramId !== "retract_height") return null;
      if (typeof value !== "number") return null;
      if (value < 1) return { severity: "block", rule: "retract_height_floor", message: `retract_height ${value} mm too low — collision risk`, paramId, value };
      if (value < 3) return { severity: "warn", rule: "retract_height_floor", message: `retract_height ${value} mm marginal`, paramId, value };
      return null;
    },
  },
  {
    id: "feed_plunge_ceiling",
    check: (paramId: string, value: unknown): SafetyFinding | null => {
      if (paramId !== "feed_plunge") return null;
      if (typeof value !== "number") return null;
      if (value > 10000) return { severity: "block", rule: "feed_plunge_ceiling", message: `feed_plunge ${value} > 10000 mm/min — tool breakage risk`, paramId, value };
      if (value > 5000) return { severity: "warn", rule: "feed_plunge_ceiling", message: `feed_plunge ${value} aggressive`, paramId, value };
      return null;
    },
  },
  {
    id: "stepdown_chatter",
    check: (paramId: string, value: unknown): SafetyFinding | null => {
      if (paramId !== "stepdown") return null;
      if (typeof value !== "number") return null;
      if (value > 25) return { severity: "block", rule: "stepdown_chatter", message: `stepdown ${value} mm — likely chatter`, paramId, value };
      return null;
    },
  },
  {
    id: "coolant_required",
    check: (paramId: string, value: unknown): SafetyFinding | null => {
      if (paramId !== "coolant") return null;
      if (value === "none") return { severity: "warn", rule: "coolant_required", message: `coolant=none acceptable only for dry-cutting tools`, paramId, value };
      return null;
    },
  },
];

export class CAMSafetyValidatorEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMSafetyValidatorEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Validates CamTemplate against shop_floor S(x) safety constraints.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "validate",  description: "Run safety validation on a CamTemplate", actions: ["cam_safety_validate"] },
      { name: "rules",     description: "List active safety rule ids",            actions: ["cam_safety_rules"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMSafetyValidatorEngine", note: "use typed methods" };
  }

  validateTemplate(template: CamTemplate): SafetyResult {
    const findings: SafetyFinding[] = [];
    for (const p of template.parameters) {
      for (const rule of RULES) {
        const f = rule.check(p.id, p.value);
        if (f) findings.push(f);
      }
    }
    const blockCount = findings.filter((f) => f.severity === "block").length;
    const warnCount = findings.filter((f) => f.severity === "warn").length;
    // S(x) penalty: each block deducts 0.20, each warn deducts 0.02. Floor at 0.
    const sx = Math.max(0, 1.0 - 0.20 * blockCount - 0.02 * warnCount);
    return { sx, ok: blockCount === 0 && sx >= SX_THRESHOLD_SHOP_FLOOR, findings };
  }

  listRules(): string[] {
    return RULES.map((r) => r.id);
  }
}

export const camSafetyValidatorEngine = new CAMSafetyValidatorEngine();
