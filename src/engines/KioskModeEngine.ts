/**
 * KioskModeEngine — Simplified data provider for shop floor touch interfaces.
 *
 * Big text, minimal fields, operator-friendly. Designed for kiosk/HMI panels
 * where machinists need quick answers without navigating complex menus.
 *
 * Actions:
 *   kiosk_quick_sf    — 3-step speed/feed from material+diameter+operation
 *   kiosk_alarm_decode — Enter alarm code, get plain-language fix steps
 *   kiosk_setup_sheet  — Display setup sheet data in large-format kiosk layout
 *   kiosk_tool_life    — Tool life with color-coded status (green/yellow/red)
 *
 * @module KioskModeEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MaterialCategory =
  | "steel"
  | "stainless"
  | "aluminum"
  | "titanium"
  | "cast_iron"
  | "copper";

type OperationType = "face" | "pocket" | "slot" | "drill" | "turn";

interface KioskSFInput {
  materialCategory: MaterialCategory;
  toolDiameter: number;
  operation: OperationType;
}

interface KioskSFResult {
  rpm: number;
  feedRate: number;
  doc: number;
  displayText: string;
}

interface KioskAlarmInput {
  code: string;
  controller?: string;
}

type AlarmSeverity = "info" | "warning" | "critical";

interface KioskAlarmResult {
  meaning: string;
  cause: string;
  fixSteps: string[];
  severity: AlarmSeverity;
}

interface KioskSetupInput {
  programId?: string;
  machineId?: string;
}

interface SetupTool {
  position: number;
  name: string;
  diameter: number;
  length: number;
}

interface KioskSetupResult {
  tools: SetupTool[];
  offsets: Record<string, number>;
  notes: string[];
  displayText: string;
}

interface KioskToolLifeInput {
  toolId: string;
}

type ToolLifeStatus = "green" | "yellow" | "red";

interface KioskToolLifeResult {
  remainingPercent: number;
  partsRemaining: number;
  status: ToolLifeStatus;
  displayText: string;
}

// ---------------------------------------------------------------------------
// Material Speed/Feed lookup: 6 categories x 5 operations = 30 entries
// Vc in m/min, fz in mm/tooth (or mm/rev for drill/turn), doc in mm
// ---------------------------------------------------------------------------

interface SFEntry {
  vc: number;
  fz: number;
  doc: number;
}

const SF_TABLE: Record<MaterialCategory, Record<OperationType, SFEntry>> = {
  steel: {
    face:   { vc: 200, fz: 0.15, doc: 2.0 },
    pocket: { vc: 180, fz: 0.12, doc: 1.5 },
    slot:   { vc: 150, fz: 0.10, doc: 3.0 },
    drill:  { vc: 100, fz: 0.20, doc: 0   },
    turn:   { vc: 220, fz: 0.25, doc: 2.5 },
  },
  stainless: {
    face:   { vc: 140, fz: 0.12, doc: 1.5 },
    pocket: { vc: 120, fz: 0.10, doc: 1.0 },
    slot:   { vc: 100, fz: 0.08, doc: 2.0 },
    drill:  { vc: 70,  fz: 0.15, doc: 0   },
    turn:   { vc: 150, fz: 0.20, doc: 2.0 },
  },
  aluminum: {
    face:   { vc: 500, fz: 0.20, doc: 3.0 },
    pocket: { vc: 450, fz: 0.18, doc: 2.5 },
    slot:   { vc: 400, fz: 0.15, doc: 4.0 },
    drill:  { vc: 250, fz: 0.25, doc: 0   },
    turn:   { vc: 600, fz: 0.30, doc: 3.0 },
  },
  titanium: {
    face:   { vc: 60,  fz: 0.08, doc: 1.0 },
    pocket: { vc: 50,  fz: 0.07, doc: 0.8 },
    slot:   { vc: 40,  fz: 0.06, doc: 1.5 },
    drill:  { vc: 30,  fz: 0.10, doc: 0   },
    turn:   { vc: 65,  fz: 0.12, doc: 1.0 },
  },
  cast_iron: {
    face:   { vc: 180, fz: 0.18, doc: 2.5 },
    pocket: { vc: 160, fz: 0.15, doc: 2.0 },
    slot:   { vc: 140, fz: 0.12, doc: 3.0 },
    drill:  { vc: 90,  fz: 0.22, doc: 0   },
    turn:   { vc: 200, fz: 0.28, doc: 2.5 },
  },
  copper: {
    face:   { vc: 300, fz: 0.18, doc: 2.5 },
    pocket: { vc: 280, fz: 0.15, doc: 2.0 },
    slot:   { vc: 250, fz: 0.12, doc: 3.5 },
    drill:  { vc: 180, fz: 0.22, doc: 0   },
    turn:   { vc: 350, fz: 0.25, doc: 2.5 },
  },
};

// ---------------------------------------------------------------------------
// Common alarm database (controller-agnostic + Fanuc/Haas/Siemens hints)
// ---------------------------------------------------------------------------

interface AlarmEntry {
  meaning: string;
  cause: string;
  fixSteps: string[];
  severity: AlarmSeverity;
}

const ALARM_DB: Record<string, AlarmEntry> = {
  // Fanuc-style alarms
  "1001": {
    meaning: "Servo alarm: X-axis excess error",
    cause: "X-axis servo motor overload or encoder fault",
    fixSteps: [
      "1. Check X-axis servo motor connector",
      "2. Inspect encoder cable for damage",
      "3. Verify ballscrew for mechanical binding",
      "4. Reset alarm and jog axis slowly",
    ],
    severity: "critical",
  },
  "1002": {
    meaning: "Servo alarm: Y-axis excess error",
    cause: "Y-axis servo motor overload or encoder fault",
    fixSteps: [
      "1. Check Y-axis servo motor connector",
      "2. Inspect encoder cable for damage",
      "3. Verify ballscrew for mechanical binding",
      "4. Reset alarm and jog axis slowly",
    ],
    severity: "critical",
  },
  "1003": {
    meaning: "Servo alarm: Z-axis excess error",
    cause: "Z-axis servo motor overload or mechanical jam",
    fixSteps: [
      "1. Check Z-axis servo motor connector",
      "2. Verify counterbalance system",
      "3. Inspect ballscrew for binding",
      "4. Reset alarm and jog axis slowly",
    ],
    severity: "critical",
  },
  "2000": {
    meaning: "Spindle alarm: overheat",
    cause: "Spindle bearing wear or insufficient coolant flow",
    fixSteps: [
      "1. Stop spindle and let cool for 15 min",
      "2. Check spindle coolant level and flow",
      "3. Listen for bearing noise on restart",
      "4. If recurring, schedule bearing inspection",
    ],
    severity: "critical",
  },
  "2010": {
    meaning: "Spindle speed deviation",
    cause: "Belt slip, drive fault, or load too high",
    fixSteps: [
      "1. Check spindle belt tension",
      "2. Reduce cutting load (lower DOC or feed)",
      "3. Verify spindle drive parameters",
    ],
    severity: "warning",
  },
  "3000": {
    meaning: "ATC alarm: tool change timeout",
    cause: "Tool stuck or magazine positioning error",
    fixSteps: [
      "1. Open ATC cover and check for jammed tool",
      "2. Verify magazine count matches actual tools",
      "3. Clean tool gripper fingers",
      "4. Manually cycle ATC in MDI mode",
    ],
    severity: "warning",
  },
  "3001": {
    meaning: "ATC alarm: tool not clamped",
    cause: "Drawbar pressure low or proximity switch fault",
    fixSteps: [
      "1. Check drawbar air pressure (min 90 psi)",
      "2. Verify tool is seated in spindle taper",
      "3. Inspect proximity sensor on spindle nose",
    ],
    severity: "critical",
  },
  "4000": {
    meaning: "Overtravel: soft limit X+",
    cause: "Program tried to move X beyond machine limit",
    fixSteps: [
      "1. Check program for incorrect X coordinate",
      "2. Verify work offset (G54) is correct",
      "3. Jog away from limit, then re-reference",
    ],
    severity: "warning",
  },
  "5000": {
    meaning: "Low lube level",
    cause: "Way lube reservoir empty",
    fixSteps: [
      "1. Fill way lube reservoir with ISO 68 oil",
      "2. Check lube pump operation",
      "3. Inspect lube lines for leaks",
    ],
    severity: "info",
  },
  "6000": {
    meaning: "Coolant level low",
    cause: "Coolant tank needs refill",
    fixSteps: [
      "1. Fill coolant tank to proper level",
      "2. Check coolant concentration (5-8%)",
      "3. Inspect for leaks in coolant system",
    ],
    severity: "info",
  },
  "9000": {
    meaning: "Emergency stop activated",
    cause: "Operator pressed E-stop or safety interlock open",
    fixSteps: [
      "1. Identify why E-stop was pressed",
      "2. Clear any hazards in work area",
      "3. Release E-stop button (twist to reset)",
      "4. Press RESET then re-reference machine",
    ],
    severity: "critical",
  },
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class KioskModeEngine {
  /**
   * Route a kiosk action to the appropriate handler.
   */
  calculate(
    action: string,
    params: Record<string, unknown>
  ): KioskSFResult | KioskAlarmResult | KioskSetupResult
    | KioskToolLifeResult | { error: string } {
    switch (action) {
      case "kiosk_quick_sf":
        return this.quickSpeedFeed(params as unknown as KioskSFInput);
      case "kiosk_alarm_decode":
        return this.alarmDecode(params as unknown as KioskAlarmInput);
      case "kiosk_setup_sheet":
        return this.setupSheet(params as unknown as KioskSetupInput);
      case "kiosk_tool_life":
        return this.toolLife(params as unknown as KioskToolLifeInput);
      default:
        return { error: `Unknown kiosk action: ${action}` };
    }
  }

  // -----------------------------------------------------------------------
  // kiosk_quick_sf — simplified Kienzle speed/feed
  // -----------------------------------------------------------------------

  private quickSpeedFeed(input: KioskSFInput): KioskSFResult {
    const mat = input.materialCategory || "steel";
    const dia = input.toolDiameter || 10;
    const op = input.operation || "face";

    const entry = SF_TABLE[mat]?.[op] ?? SF_TABLE.steel.face;
    // n = 1000 * Vc / (pi * D)
    const rpm = Math.round((1000 * entry.vc) / (Math.PI * dia));
    // Feed = fz * z * n  (assume 2 flutes for mill, 1 for drill/turn)
    const flutes = op === "drill" || op === "turn" ? 1 : 2;
    const feedRate = Math.round(entry.fz * flutes * rpm);
    const doc = entry.doc > 0 ? entry.doc : dia * 3;

    const matLabel = mat.replace("_", " ").toUpperCase();
    const displayText = [
      `=== SPEED & FEED ===`,
      `Material: ${matLabel}`,
      `Tool: D${dia}mm  |  Op: ${op.toUpperCase()}`,
      ``,
      `  RPM:   ${rpm.toLocaleString()}`,
      `  FEED:  ${feedRate} mm/min`,
      `  DOC:   ${doc} mm`,
      ``,
      `Vc=${entry.vc} m/min  fz=${entry.fz} mm`,
    ].join("\n");

    return { rpm, feedRate, doc, displayText };
  }

  // -----------------------------------------------------------------------
  // kiosk_alarm_decode — alarm lookup + fix steps
  // -----------------------------------------------------------------------

  private alarmDecode(input: KioskAlarmInput): KioskAlarmResult {
    const code = (input.code || "").trim().replace(/^0+/, "");
    const normalized = code.replace(/[^0-9]/g, "");

    // Direct lookup
    const entry = ALARM_DB[normalized];
    if (entry) {
      return { ...entry };
    }

    // Range-based fallback
    const num = parseInt(normalized, 10);
    if (!isNaN(num)) {
      if (num >= 1000 && num < 2000) {
        return {
          meaning: `Servo/axis alarm (code ${normalized})`,
          cause: "Axis drive or encoder issue",
          fixSteps: [
            "1. Note which axis is affected",
            "2. Check servo motor and encoder cables",
            "3. Verify mechanical freedom of axis",
            "4. Reset and jog slowly to test",
          ],
          severity: "critical",
        };
      }
      if (num >= 2000 && num < 3000) {
        return {
          meaning: `Spindle alarm (code ${normalized})`,
          cause: "Spindle drive or thermal issue",
          fixSteps: [
            "1. Allow spindle to cool",
            "2. Check spindle drive parameters",
            "3. Verify spindle orientation sensor",
            "4. Contact maintenance if persistent",
          ],
          severity: "warning",
        };
      }
      if (num >= 3000 && num < 4000) {
        return {
          meaning: `ATC/tool changer alarm (code ${normalized})`,
          cause: "Tool change mechanism issue",
          fixSteps: [
            "1. Open ATC cover and inspect",
            "2. Check for jammed or misaligned tools",
            "3. Verify drawbar pressure",
            "4. Manually cycle ATC in MDI",
          ],
          severity: "warning",
        };
      }
      if (num >= 4000 && num < 5000) {
        return {
          meaning: `Overtravel alarm (code ${normalized})`,
          cause: "Axis exceeded software or hardware limit",
          fixSteps: [
            "1. Jog away from the limit direction",
            "2. Check work offset values",
            "3. Review program coordinates",
          ],
          severity: "warning",
        };
      }
    }

    // Unknown
    return {
      meaning: `Unknown alarm code: ${input.code}`,
      cause: "Code not in kiosk database",
      fixSteps: [
        "1. Check machine operator manual",
        "2. Note full alarm text from screen",
        "3. Contact maintenance with alarm details",
      ],
      severity: "info",
    };
  }

  // -----------------------------------------------------------------------
  // kiosk_setup_sheet — simplified setup display
  // -----------------------------------------------------------------------

  private setupSheet(input: KioskSetupInput): KioskSetupResult {
    const progId = input.programId || "O0001";
    const machId = input.machineId || "MILL-01";

    // Produce a representative setup sheet
    // In production this would query the program database
    const tools: SetupTool[] = [
      { position: 1, name: "Face Mill 50mm", diameter: 50, length: 45 },
      { position: 2, name: "End Mill 12mm", diameter: 12, length: 75 },
      { position: 3, name: "Drill 8.5mm", diameter: 8.5, length: 90 },
      { position: 4, name: "Tap M10x1.5", diameter: 10, length: 80 },
      { position: 5, name: "Chamfer Mill 90°", diameter: 16, length: 50 },
    ];

    const offsets: Record<string, number> = {
      "G54_X": 0.000,
      "G54_Y": 0.000,
      "G54_Z": 0.000,
      "H01": 45.123,
      "H02": 75.456,
      "H03": 90.234,
      "H04": 80.567,
      "H05": 50.890,
    };

    const notes = [
      "Clamp part on 4th-jaw vise, zero on top-left corner",
      `Program: ${progId}  |  Machine: ${machId}`,
      "Coolant: flood on all ops except tapping (mist)",
      "Check tool lengths before first run",
    ];

    const toolLines = tools.map(
      (t) => `  T${t.position}  ${t.name.padEnd(20)} D${t.diameter}mm  L${t.length}mm`
    );

    const displayText = [
      `=== SETUP SHEET ===`,
      `Program: ${progId}  |  Machine: ${machId}`,
      ``,
      `TOOLS:`,
      ...toolLines,
      ``,
      `NOTES:`,
      ...notes.map((n) => `  - ${n}`),
    ].join("\n");

    return { tools, offsets, notes, displayText };
  }

  // -----------------------------------------------------------------------
  // kiosk_tool_life — color-coded remaining life
  // -----------------------------------------------------------------------

  private toolLife(input: KioskToolLifeInput): KioskToolLifeResult {
    const toolId = input.toolId || "T1";

    // Simulated tool life tracking. In production this reads from
    // the tool management system or StochasticToolWearEngine.
    // Use a deterministic hash so the same toolId gives consistent results.
    const hash = this.simpleHash(toolId);
    const totalLife = 200 + (hash % 300); // 200-499 parts
    const used = hash % totalLife;
    const remaining = totalLife - used;
    const pct = Math.round((remaining / totalLife) * 100);

    let status: ToolLifeStatus;
    if (pct > 50) {
      status = "green";
    } else if (pct > 20) {
      status = "yellow";
    } else {
      status = "red";
    }

    const statusLabel = status === "green" ? "OK"
      : status === "yellow" ? "REPLACE SOON" : "REPLACE NOW";
    const bar = this.progressBar(pct);

    const displayText = [
      `=== TOOL LIFE: ${toolId} ===`,
      ``,
      `  Status:    [${statusLabel}]`,
      `  Remaining: ${pct}%  ${bar}`,
      `  Parts left: ~${remaining}`,
      ``,
      `  Total capacity: ${totalLife} parts`,
      `  Parts made:     ${used}`,
    ].join("\n");

    return {
      remainingPercent: pct,
      partsRemaining: remaining,
      status,
      displayText,
    };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private progressBar(pct: number): string {
    const filled = Math.round(pct / 5);
    const empty = 20 - filled;
    return "[" + "#".repeat(filled) + "-".repeat(empty) + "]";
  }
}

/** Singleton instance */
export const kioskModeEngine = new KioskModeEngine();
