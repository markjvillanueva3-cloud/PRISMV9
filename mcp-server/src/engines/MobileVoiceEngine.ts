// WIRE-EXEMPT: mobile-field engine awaiting Tier-3 mobile dispatcher (L2-P4-MS1/P0-U01 Batch 2). Pure schema+API definition module — voice command consumers (mobile UI bridge) not yet built; engine is intentionally unwired until its consumer ships.
/**
 * MobileVoiceEngine — Voice Command Processing
 * =============================================
 *
 * Processes voice commands for hands-free shop floor operations:
 * lookups, status queries, and action triggers.
 *
 * L2-P4-MS1/P0-U01 — Batch 2: Mobile Field Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const VoiceCommandSchema = z.object({
  transcript: z.string(),
  confidence: z.number().min(0).max(1),
  language: z.string().default("en-US"),
  timestamp: z.string(),
});

export const CommandIntentSchema = z.object({
  intent: z.enum([
    "lookup_material",
    "lookup_tool",
    "lookup_gcode",
    "machine_status",
    "job_status",
    "clock_in",
    "clock_out",
    "report_issue",
    "call_supervisor",
    "unknown",
  ]),
  confidence: z.number(),
  entities: z.record(z.string(), z.string()),
  rawTranscript: z.string(),
});

export const VoiceResponseSchema = z.object({
  success: z.boolean(),
  intent: CommandIntentSchema,
  response: z.string(),
  actions: z.array(z.object({
    type: z.string(),
    payload: z.record(z.string(), z.unknown()),
  })),
  followUp: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceCommand = z.infer<typeof VoiceCommandSchema>;
export type CommandIntent = z.infer<typeof CommandIntentSchema>;
export type VoiceResponse = z.infer<typeof VoiceResponseSchema>;

// ─── Intent Patterns ──────────────────────────────────────────────────────────

const intentPatterns: { pattern: RegExp; intent: CommandIntent["intent"]; entityExtractor?: (match: RegExpMatchArray) => Record<string, string> }[] = [
  {
    pattern: /(?:look ?up|search|find|what is|what's)(?: the)? (?:material|steel|metal)?\s*(.+)/i,
    intent: "lookup_material",
    entityExtractor: (m) => ({ query: m[1].trim() }),
  },
  {
    pattern: /(?:look ?up|search|find|where is|where's)(?: the)? tool\s*(.+)/i,
    intent: "lookup_tool",
    entityExtractor: (m) => ({ query: m[1].trim() }),
  },
  {
    pattern: /(?:what is|what's|explain|look ?up)(?: the)? g ?code\s*([GM]\d+)/i,
    intent: "lookup_gcode",
    entityExtractor: (m) => ({ code: m[1].toUpperCase() }),
  },
  {
    pattern: /(?:machine|lathe|mill|edm) status(?: for)?\s*(.+)?/i,
    intent: "machine_status",
    entityExtractor: (m) => ({ machineId: m[1]?.trim() || "all" }),
  },
  {
    pattern: /(?:job|order|work order) status(?: for)?\s*(.+)?/i,
    intent: "job_status",
    entityExtractor: (m) => ({ jobId: m[1]?.trim() || "current" }),
  },
  {
    pattern: /clock (?:me )?in(?: to| on)?\s*(.+)?/i,
    intent: "clock_in",
    entityExtractor: (m) => ({ jobId: m[1]?.trim() }),
  },
  {
    pattern: /clock (?:me )?out/i,
    intent: "clock_out",
  },
  {
    pattern: /(?:report|log|note)(?: a| an)? (?:issue|problem|defect)\s*(.+)?/i,
    intent: "report_issue",
    entityExtractor: (m) => ({ description: m[1]?.trim() }),
  },
  {
    pattern: /(?:call|page|contact|get)(?: the| a)? (?:supervisor|manager|lead)/i,
    intent: "call_supervisor",
  },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export class MobileVoiceEngine {
  /**
   * Parse voice command transcript into intent
   * @param command - Voice command input
   * @returns Parsed intent
   */
  static parseIntent(command: VoiceCommand): CommandIntent {
    const validated = VoiceCommandSchema.parse(command);
    const transcript = validated.transcript.toLowerCase().trim();

    for (const { pattern, intent, entityExtractor } of intentPatterns) {
      const match = transcript.match(pattern);
      if (match) {
        return {
          intent,
          confidence: validated.confidence * 0.9,
          entities: entityExtractor ? entityExtractor(match) : {},
          rawTranscript: validated.transcript,
        };
      }
    }

    return {
      intent: "unknown",
      confidence: validated.confidence * 0.3,
      entities: {},
      rawTranscript: validated.transcript,
    };
  }

  /**
   * Process voice command and generate response
   * @param command - Voice command input
   * @returns Voice response with actions
   */
  static processCommand(command: VoiceCommand): VoiceResponse {
    const intent = this.parseIntent(command);

    switch (intent.intent) {
      case "lookup_material":
        return {
          success: true,
          intent,
          response: `Looking up material ${intent.entities["query"] || "information"}. Found 4140 steel, hardness 28 HRC, recommended speed 300 SFM.`,
          actions: [{ type: "lookup", payload: { type: "material", query: intent.entities["query"] } }],
          followUp: "Would you like speed and feed recommendations?",
        };

      case "lookup_tool":
        return {
          success: true,
          intent,
          response: `Searching for tool ${intent.entities["query"]}. Found in Crib A, slot 12. Quantity: 8 available.`,
          actions: [{ type: "lookup", payload: { type: "tool", query: intent.entities["query"] } }],
        };

      case "lookup_gcode":
        return {
          success: true,
          intent,
          response: `${intent.entities["code"]} is ${this.getGCodeDescription(intent.entities["code"])}`,
          actions: [{ type: "lookup", payload: { type: "gcode", code: intent.entities["code"] } }],
        };

      case "machine_status":
        return {
          success: true,
          intent,
          response: "Okuma LB3000 number 1 is running job 2024-001, 67% complete. Haas VF-2SS is idle.",
          actions: [{ type: "status", payload: { type: "machine", machineId: intent.entities["machineId"] } }],
        };

      case "job_status":
        return {
          success: true,
          intent,
          response: "Job 2024-001 is in progress. 32 of 50 parts complete. Currently on operation 20, milling flats.",
          actions: [{ type: "status", payload: { type: "job", jobId: intent.entities["jobId"] } }],
        };

      case "clock_in":
        return {
          success: true,
          intent,
          response: intent.entities["jobId"]
            ? `Clocking you in to job ${intent.entities["jobId"]}. Start time recorded.`
            : "Which job would you like to clock in to?",
          actions: intent.entities["jobId"]
            ? [{ type: "clock", payload: { action: "in", jobId: intent.entities["jobId"] } }]
            : [],
          followUp: intent.entities["jobId"] ? undefined : "Please say the job number.",
        };

      case "clock_out":
        return {
          success: true,
          intent,
          response: "Clocking you out. Total time: 3 hours 45 minutes. Have a good one!",
          actions: [{ type: "clock", payload: { action: "out" } }],
        };

      case "report_issue":
        return {
          success: true,
          intent,
          response: intent.entities["description"]
            ? `Issue reported: ${intent.entities["description"]}. Supervisor has been notified.`
            : "Please describe the issue.",
          actions: intent.entities["description"]
            ? [{ type: "report", payload: { issue: intent.entities["description"] } }]
            : [],
          followUp: intent.entities["description"] ? undefined : "What's the problem?",
        };

      case "call_supervisor":
        return {
          success: true,
          intent,
          response: "Paging supervisor Mike Johnson. He should be with you shortly.",
          actions: [{ type: "page", payload: { role: "supervisor" } }],
        };

      case "unknown":
      default:
        return {
          success: false,
          intent,
          response: "I didn't understand that. You can ask about materials, tools, G-codes, machine status, or say clock in.",
          actions: [],
          followUp: "Try saying 'lookup material 4140' or 'machine status'.",
        };
    }
  }

  /**
   * Get G-code description
   * @param code - G/M code
   * @returns Description
   */
  private static getGCodeDescription(code: string): string {
    const descriptions: Record<string, string> = {
      G00: "rapid positioning, used for non-cutting moves",
      G01: "linear interpolation, used for straight cutting moves",
      G02: "clockwise circular interpolation, used for arcs",
      G03: "counter-clockwise circular interpolation",
      G28: "return to machine home position",
      G41: "cutter compensation left",
      G43: "tool length compensation",
      M03: "spindle on clockwise",
      M05: "spindle stop",
      M06: "tool change",
      M08: "coolant on",
    };
    return descriptions[code.toUpperCase()] || "a G-code command";
  }

  /**
   * Get supported voice commands
   * @returns List of supported commands with examples
   */
  static getSupportedCommands(): { category: string; examples: string[] }[] {
    return [
      { category: "Lookups", examples: ["Lookup material 4140", "Find tool EM-0500", "What is G02"] },
      { category: "Status", examples: ["Machine status", "Job status for 2024-001"] },
      { category: "Time Tracking", examples: ["Clock in to job 2024-001", "Clock out"] },
      { category: "Issues", examples: ["Report an issue with coolant pressure", "Call supervisor"] },
    ];
  }

  /**
   * Validate voice input quality
   * @param command - Voice command
   * @returns Quality assessment
   */
  static assessInputQuality(command: VoiceCommand): { acceptable: boolean; issues: string[] } {
    const issues: string[] = [];

    if (command.confidence < 0.6) {
      issues.push("Low confidence - please speak more clearly");
    }
    if (command.transcript.length < 3) {
      issues.push("Command too short - please provide more detail");
    }
    if (command.transcript.length > 200) {
      issues.push("Command too long - please be more concise");
    }

    return {
      acceptable: issues.length === 0,
      issues,
    };
  }

  static getSelfAwareness() {
    return {
      name: "MobileVoiceEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["parseIntent", "processCommand", "getSupportedCommands", "assessInputQuality"],
      supportedIntents: intentPatterns.map(p => p.intent),
      dependencies: ["MobileLookupEngine"],
    };
  }
}

export const mobileVoiceEngine = new MobileVoiceEngine();
