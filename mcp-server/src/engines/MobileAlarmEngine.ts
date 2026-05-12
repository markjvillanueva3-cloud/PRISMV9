/**
 * MobileAlarmEngine — Machine Alarm Decoding & Management
 * ========================================================
 *
 * Decodes machine alarm codes, provides troubleshooting steps,
 * and manages alarm notifications for mobile devices.
 *
 * L2-P4-MS1/P0-U01 — Batch 2: Mobile Field Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const AlarmCodeSchema = z.object({
  code: z.string(),
  controller: z.string(),
  category: z.enum(["spindle", "servo", "overtravel", "tool", "coolant", "program", "communication", "safety", "thermal", "other"]),
  severity: z.enum(["critical", "warning", "info"]),
  description: z.string(),
  possibleCauses: z.array(z.string()),
  solutions: z.array(z.string()),
  requiresReset: z.boolean(),
  requiresMaintenance: z.boolean(),
});

export const AlarmEventSchema = z.object({
  id: z.string(),
  machineId: z.string(),
  machineName: z.string(),
  alarmCode: z.string(),
  timestamp: z.string(),
  acknowledged: z.boolean(),
  resolved: z.boolean(),
  resolvedAt: z.string().optional(),
  resolvedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const AlarmQuerySchema = z.object({
  code: z.string(),
  controller: z.string().optional(),
});

export const AlarmNotificationSchema = z.object({
  alarmEvent: AlarmEventSchema,
  decoded: AlarmCodeSchema,
  urgencyLevel: z.number().min(1).max(5),
  notifyList: z.array(z.string()),
  escalationMinutes: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlarmCode = z.infer<typeof AlarmCodeSchema>;
export type AlarmEvent = z.infer<typeof AlarmEventSchema>;
export type AlarmQuery = z.infer<typeof AlarmQuerySchema>;
export type AlarmNotification = z.infer<typeof AlarmNotificationSchema>;

// ─── Alarm Database ───────────────────────────────────────────────────────────

const alarmDatabase: AlarmCode[] = [
  {
    code: "401",
    controller: "fanuc",
    category: "servo",
    severity: "critical",
    description: "Servo alarm - V ready off (X-axis)",
    possibleCauses: ["Servo amplifier fault", "Motor cable disconnected", "Encoder failure", "Power supply issue"],
    solutions: ["Check servo amplifier LED status", "Verify motor cable connections", "Check encoder signals", "Cycle machine power"],
    requiresReset: true,
    requiresMaintenance: false,
  },
  {
    code: "410",
    controller: "fanuc",
    category: "servo",
    severity: "critical",
    description: "Servo alarm - Excessive position error (X-axis)",
    possibleCauses: ["Axis binding", "Ball screw wear", "Incorrect parameter", "Motor overloaded"],
    solutions: ["Check for mechanical binding", "Verify lubrication", "Review servo parameters", "Reduce feed rate"],
    requiresReset: true,
    requiresMaintenance: true,
  },
  {
    code: "1020",
    controller: "fanuc",
    category: "spindle",
    severity: "warning",
    description: "Spindle motor overheat",
    possibleCauses: ["Excessive cutting load", "Coolant system failure", "Blocked cooling vents", "Bearing wear"],
    solutions: ["Reduce cutting parameters", "Check coolant flow", "Clean cooling vents", "Monitor bearing temperature"],
    requiresReset: false,
    requiresMaintenance: false,
  },
  {
    code: "2026",
    controller: "okuma",
    category: "overtravel",
    severity: "critical",
    description: "X-axis positive overtravel",
    possibleCauses: ["Program error", "Incorrect work offset", "Limit switch triggered"],
    solutions: ["Jog axis away from limit in manual mode", "Verify work offsets", "Check program coordinates"],
    requiresReset: true,
    requiresMaintenance: false,
  },
  {
    code: "3048",
    controller: "okuma",
    category: "tool",
    severity: "warning",
    description: "Tool life expired",
    possibleCauses: ["Tool has reached programmed life limit"],
    solutions: ["Replace tool", "Reset tool life counter if tool is new"],
    requiresReset: false,
    requiresMaintenance: false,
  },
  {
    code: "100",
    controller: "haas",
    category: "program",
    severity: "warning",
    description: "Illegal G-code",
    possibleCauses: ["Invalid G-code in program", "Missing required parameter", "Syntax error"],
    solutions: ["Review program at line indicated", "Check G-code syntax", "Verify parameters"],
    requiresReset: false,
    requiresMaintenance: false,
  },
  {
    code: "108",
    controller: "haas",
    category: "tool",
    severity: "critical",
    description: "Tool in spindle doesn't match",
    possibleCauses: ["Tool pot assignment error", "Manual tool change interference", "Tool magazine fault"],
    solutions: ["Verify tool in spindle matches program", "Re-home tool changer", "Check tool pot assignments"],
    requiresReset: true,
    requiresMaintenance: false,
  },
  {
    code: "200",
    controller: "haas",
    category: "communication",
    severity: "warning",
    description: "Low air pressure",
    possibleCauses: ["Shop air pressure low", "Air leak in system", "Filter clogged"],
    solutions: ["Check shop air supply", "Inspect air lines for leaks", "Clean or replace air filters"],
    requiresReset: false,
    requiresMaintenance: false,
  },
];

const activeAlarms: Map<string, AlarmEvent> = new Map();
let alarmCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class MobileAlarmEngine {
  /**
   * Decode an alarm code
   * @param query - Alarm code and optional controller
   * @returns Decoded alarm information
   */
  static decodeAlarm(query: AlarmQuery): AlarmCode | undefined {
    const validated = AlarmQuerySchema.parse(query);
    const code = validated.code.replace(/^0+/, ""); // Strip leading zeros

    let results = alarmDatabase.filter(a => a.code === code || a.code === validated.code);

    if (validated.controller) {
      results = results.filter(a => a.controller.toLowerCase() === validated.controller!.toLowerCase());
    }

    return results[0];
  }

  /**
   * Search alarm database
   * @param searchTerm - Search term
   * @param controller - Optional controller filter
   * @returns Matching alarms
   */
  static searchAlarms(searchTerm: string, controller?: string): AlarmCode[] {
    const term = searchTerm.toLowerCase();
    let results = alarmDatabase.filter(a =>
      a.code.includes(searchTerm) ||
      a.description.toLowerCase().includes(term) ||
      a.category.includes(term)
    );

    if (controller) {
      results = results.filter(a => a.controller.toLowerCase() === controller.toLowerCase());
    }

    return results;
  }

  /**
   * Register a new alarm event
   * @param machineId - Machine identifier
   * @param machineName - Machine name
   * @param alarmCode - Alarm code
   * @returns Alarm event and notification
   */
  static registerAlarm(machineId: string, machineName: string, alarmCode: string): AlarmNotification | undefined {
    const decoded = this.decodeAlarm({ code: alarmCode });
    if (!decoded) return undefined;

    const event: AlarmEvent = {
      id: `ALM-${++alarmCounter}`,
      machineId,
      machineName,
      alarmCode,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
    };

    activeAlarms.set(event.id, event);

    const urgencyLevel = decoded.severity === "critical" ? 5 : decoded.severity === "warning" ? 3 : 1;
    const notifyList = urgencyLevel >= 4 ? ["supervisor", "maintenance"] : ["operator"];

    return {
      alarmEvent: event,
      decoded,
      urgencyLevel,
      notifyList,
      escalationMinutes: urgencyLevel >= 4 ? 5 : 30,
    };
  }

  /**
   * Acknowledge an alarm
   * @param alarmId - Alarm event ID
   * @returns Updated alarm event
   */
  static acknowledgeAlarm(alarmId: string): AlarmEvent | undefined {
    const alarm = activeAlarms.get(alarmId);
    if (!alarm) return undefined;

    alarm.acknowledged = true;
    activeAlarms.set(alarmId, alarm);
    return alarm;
  }

  /**
   * Resolve an alarm
   * @param alarmId - Alarm event ID
   * @param resolvedBy - Resolver identifier
   * @param notes - Resolution notes
   * @returns Updated alarm event
   */
  static resolveAlarm(alarmId: string, resolvedBy: string, notes?: string): AlarmEvent | undefined {
    const alarm = activeAlarms.get(alarmId);
    if (!alarm) return undefined;

    alarm.resolved = true;
    alarm.resolvedAt = new Date().toISOString();
    alarm.resolvedBy = resolvedBy;
    alarm.notes = notes;
    activeAlarms.set(alarmId, alarm);
    return alarm;
  }

  /**
   * Get active alarms
   * @param machineId - Optional machine filter
   * @returns Active alarm events
   */
  static getActiveAlarms(machineId?: string): AlarmEvent[] {
    let alarms = Array.from(activeAlarms.values()).filter(a => !a.resolved);
    if (machineId) {
      alarms = alarms.filter(a => a.machineId === machineId);
    }
    return alarms.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get alarm history
   * @param machineId - Optional machine filter
   * @param limit - Maximum results
   * @returns Historical alarms
   */
  static getAlarmHistory(machineId?: string, limit: number = 50): AlarmEvent[] {
    let alarms = Array.from(activeAlarms.values());
    if (machineId) {
      alarms = alarms.filter(a => a.machineId === machineId);
    }
    return alarms
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get troubleshooting steps for an alarm
   * @param alarmCode - Alarm code
   * @param controller - Controller type
   * @returns Step-by-step troubleshooting guide
   */
  static getTroubleshootingSteps(alarmCode: string, controller?: string): { step: number; instruction: string; caution?: string }[] {
    const decoded = this.decodeAlarm({ code: alarmCode, controller });
    if (!decoded) {
      return [{ step: 1, instruction: "Alarm code not found in database. Contact maintenance." }];
    }

    const steps: { step: number; instruction: string; caution?: string }[] = [];

    steps.push({
      step: 1,
      instruction: `Alarm ${decoded.code}: ${decoded.description}`,
      caution: decoded.severity === "critical" ? "Critical alarm - do not operate machine" : undefined,
    });

    decoded.possibleCauses.forEach((cause, i) => {
      steps.push({ step: i + 2, instruction: `Check for: ${cause}` });
    });

    decoded.solutions.forEach((solution, i) => {
      steps.push({ step: decoded.possibleCauses.length + i + 2, instruction: solution });
    });

    if (decoded.requiresReset) {
      steps.push({ step: steps.length + 1, instruction: "Reset required: Press RESET button after clearing fault" });
    }

    if (decoded.requiresMaintenance) {
      steps.push({ step: steps.length + 1, instruction: "Contact maintenance department for further diagnosis", caution: "Do not attempt repair without authorization" });
    }

    return steps;
  }

  /**
   * Get alarms by category
   * @param category - Alarm category
   * @param controller - Optional controller filter
   * @returns Alarms in category
   */
  static getAlarmsByCategory(category: AlarmCode["category"], controller?: string): AlarmCode[] {
    let results = alarmDatabase.filter(a => a.category === category);
    if (controller) {
      results = results.filter(a => a.controller.toLowerCase() === controller.toLowerCase());
    }
    return results;
  }

  static getSelfAwareness() {
    return {
      name: "MobileAlarmEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["decodeAlarm", "searchAlarms", "registerAlarm", "acknowledgeAlarm", "resolveAlarm", "getActiveAlarms", "getAlarmHistory", "getTroubleshootingSteps", "getAlarmsByCategory"],
      supportedControllers: ["fanuc", "okuma", "haas"],
      alarmCount: alarmDatabase.length,
      dependencies: [],
    };
  }
}

export const mobileAlarmEngine = new MobileAlarmEngine();
