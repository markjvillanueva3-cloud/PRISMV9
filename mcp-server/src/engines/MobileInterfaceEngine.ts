/**
 * MobileInterfaceEngine.ts — R9-MS3 Mobile / Tablet Interface Data Layer
 * ========================================================================
 *
 * Server-side data layer for mobile/tablet shop floor interfaces.
 * Provides:
 *   - Quick lookup: material + tool + operation → large-font parameters
 *   - Voice query intent parsing → parameter response
 *   - Alarm code quick-decode for mobile display
 *   - Tool life timer management (start/check/reset)
 *   - Offline cache bundle generation (common material/tool combos)
 *   - Mobile-optimized response formatting (large text, color-coded)
 *
 * The actual mobile UI (React Native, PWA, etc.) consumes these actions
 * via MCP protocol. This engine handles the server-side data logic.
 *
 * @version 1.0.0 — R9-MS3
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DisplaySize = "compact" | "standard" | "large" | "xlarge";
export type StatusColor = "green" | "yellow" | "red" | "blue" | "gray";
export type TimerState = "idle" | "running" | "warning" | "expired";

export interface QuickLookupResult {
  material: string;
  tool_diameter_mm: number;
  operation: string;
  rpm: number;
  feed_mmmin: number;
  feed_ipm: number;
  doc_mm: number;
  woc_mm: number;
  sfm: number;
  display: MobileDisplay;
}

export interface MobileDisplay {
  primary: string;     // "3200 RPM"
  secondary: string;   // "19.2 IPM"
  tertiary: string;    // "DOC 0.100\" | WOC 0.125\""
  status_color: StatusColor;
  font_size: DisplaySize;
  safety_indicator: string;
}

export interface VoiceQueryResult {
  interpreted: string;
  confidence: number;
  parameters: QuickLookupResult | null;
  spoken_response: string;
}

export interface AlarmQuickDecode {
  code: string;
  plain_english: string;
  severity: "info" | "warning" | "critical" | "emergency";
  fix_steps: string[];
  estimated_downtime_min: number;
  color: StatusColor;
}

export interface ToolLifeTimer {
  timer_id: string;
  tool: string;
  estimated_life_min: number;
  started_at: string | null;
  elapsed_min: number;
  remaining_min: number;
  state: TimerState;
  warning_at_pct: number;
}

export interface OfflineCacheBundle {
  version: string;
  generated_at: string;
  entries: CacheEntry[];
  total_bytes: number;
}

export interface CacheEntry {
  material: string;
  tool_diameter_mm: number;
  operation: string;
  result: QuickLookupResult;
}

// ─── Material Speed Database (duplicated from CAM for offline independence) ──

const MATERIAL_VC: Record<string, number> = {
  aluminum: 400, "7075": 400, "6061": 400, "2024": 350,
  titanium: 60, "ti-6al-4v": 55,
  inconel: 35, "718": 35,
  stainless: 120, "316": 110, "304": 130,
  steel: 200, "4140": 190, "1045": 220,
  "cast iron": 150,
  brass: 300, bronze: 280,
};

function getVc(material: string): number {
  const mat = material.toLowerCase();
  for (const [key, vc] of Object.entries(MATERIAL_VC)) {
    if (mat.includes(key)) return vc;
  }
  return 200; // default
}

// ─── Quick Lookup ────────────────────────────────────────────────────────────

export function quickLookup(params: Record<string, any>): QuickLookupResult {
  const material = params.material ?? "steel";
  const diameter = params.tool_diameter_mm ?? params.diameter ?? 12;
  const operation = params.operation ?? "roughing";
  const flutes = params.flutes ?? 4;

  let vc = getVc(material);
  if (operation === "finishing") vc *= 1.2;

  const rpm = Math.round((vc * 1000) / (Math.PI * diameter));
  let fz = diameter * 0.02;
  if (operation === "finishing") fz = diameter * 0.01;
  if (material.toLowerCase().includes("aluminum")) fz *= 1.5;
  fz = Math.round(fz * 1000) / 1000;

  const feedMmMin = Math.round(fz * flutes * rpm);
  const feedIpm = Math.round(feedMmMin / 25.4 * 10) / 10;
  const sfm = Math.round(vc * 3.281);

  const ap = operation === "roughing" ? Math.round(diameter * 1.0 * 100) / 100 : Math.round(diameter * 0.1 * 100) / 100;
  const ae = operation === "roughing" ? Math.round(diameter * 0.5 * 100) / 100 : Math.round(diameter * 0.05 * 100) / 100;

  const docIn = Math.round(ap / 25.4 * 1000) / 1000;
  const wocIn = Math.round(ae / 25.4 * 1000) / 1000;

  const safetyOk = rpm < 25000 && feedMmMin < 20000;

  return {
    material,
    tool_diameter_mm: diameter,
    operation,
    rpm,
    feed_mmmin: feedMmMin,
    feed_ipm: feedIpm,
    doc_mm: ap,
    woc_mm: ae,
    sfm,
    display: {
      primary: `${rpm} RPM`,
      secondary: `${feedIpm} IPM`,
      tertiary: `DOC ${docIn}" | WOC ${wocIn}"`,
      status_color: safetyOk ? "green" : "yellow",
      font_size: "xlarge",
      safety_indicator: safetyOk ? "SAFE" : "REVIEW",
    },
  };
}

// ─── Voice Query ─────────────────────────────────────────────────────────────

/**
 * Parse a voice query and return parameters + spoken response.
 * In production, speech-to-text happens client-side; we get the text.
 */
export function processVoiceQuery(query: string): VoiceQueryResult {
  const q = query.toLowerCase();

  // Extract material
  let material = "steel";
  let confidence = 0.6;
  if (q.includes("aluminum") || q.includes("aluminium")) { material = "aluminum"; confidence = 0.9; }
  else if (q.includes("stainless") || q.includes("316") || q.includes("304")) { material = "stainless"; confidence = 0.9; }
  else if (q.includes("titanium") || q.includes("ti-6al")) { material = "titanium"; confidence = 0.9; }
  else if (q.includes("inconel") || q.includes("718")) { material = "inconel"; confidence = 0.9; }
  else if (q.includes("4140") || q.includes("1045")) { material = q.includes("4140") ? "4140 steel" : "1045 steel"; confidence = 0.85; }
  else if (q.includes("steel")) { material = "steel"; confidence = 0.8; }

  // Extract diameter
  let diameter = 12;
  const diaMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:mm|millimeter)/);
  const fracMatch = q.match(/(half|quarter|three.?quarter|one)\s*(?:inch)?/);
  const numInchMatch = q.match(/(\d+(?:\/\d+)?)\s*(?:inch|")/);
  if (diaMatch) { diameter = parseFloat(diaMatch[1]); confidence += 0.05; }
  else if (fracMatch) {
    const frac = fracMatch[1].toLowerCase();
    if (frac.includes("half")) diameter = 12.7;
    else if (frac.includes("quarter") && frac.includes("three")) diameter = 19.05;
    else if (frac.includes("quarter")) diameter = 6.35;
    else diameter = 25.4;
    confidence += 0.05;
  }
  else if (numInchMatch) {
    const val = numInchMatch[1];
    if (val.includes("/")) {
      const [num, den] = val.split("/").map(Number);
      diameter = (num / den) * 25.4;
    } else {
      diameter = parseFloat(val) * 25.4;
    }
    confidence += 0.05;
  }

  // Extract operation
  let operation = "roughing";
  if (q.includes("finish")) { operation = "finishing"; confidence += 0.05; }
  else if (q.includes("rough")) { operation = "roughing"; confidence += 0.05; }
  else if (q.includes("drill")) { operation = "drilling"; confidence += 0.05; }

  confidence = Math.min(confidence, 0.99);

  const result = quickLookup({ material, tool_diameter_mm: diameter, operation });

  const spoken = `${result.rpm} RPM at ${result.feed_ipm} inches per minute. ` +
    `Depth of cut ${result.doc_mm} millimeters.`;

  return {
    interpreted: `${material}, ${diameter}mm ${operation}`,
    confidence,
    parameters: result,
    spoken_response: spoken,
  };
}

// ─── Alarm Quick Decode ──────────────────────────────────────────────────────

const COMMON_ALARMS: Record<string, AlarmQuickDecode> = {
  "100": { code: "100", plain_english: "Servo overload on X axis", severity: "critical", fix_steps: ["Check for axis binding", "Verify ball screw lubrication", "Check servo motor connector", "Power cycle controller"], estimated_downtime_min: 30, color: "red" },
  "101": { code: "101", plain_english: "Servo overload on Y axis", severity: "critical", fix_steps: ["Check Y-axis way covers", "Verify way lube flow", "Inspect Y servo motor"], estimated_downtime_min: 30, color: "red" },
  "102": { code: "102", plain_english: "Servo overload on Z axis", severity: "critical", fix_steps: ["Check counterbalance pressure", "Verify Z ball screw", "Inspect Z servo"], estimated_downtime_min: 30, color: "red" },
  "108": { code: "108", plain_english: "Excessive position error (following error)", severity: "warning", fix_steps: ["Reduce feedrate", "Check axis gains", "Inspect drive belt/coupling", "Check encoder cable"], estimated_downtime_min: 15, color: "yellow" },
  "200": { code: "200", plain_english: "Spindle drive fault", severity: "critical", fix_steps: ["Check spindle drive connections", "Verify spindle motor temperature", "Check VFD parameters", "Contact service if persistent"], estimated_downtime_min: 60, color: "red" },
  "300": { code: "300", plain_english: "Tool change timeout — carousel did not complete", severity: "warning", fix_steps: ["Check air pressure (≥90 PSI)", "Verify tool pot alignment", "Manual cycle carousel", "Clear chips from tool changer"], estimated_downtime_min: 10, color: "yellow" },
  "400": { code: "400", plain_english: "Low coolant level", severity: "info", fix_steps: ["Refill coolant tank", "Check concentration (8-12%)", "Inspect for leaks"], estimated_downtime_min: 5, color: "blue" },
  "500": { code: "500", plain_english: "Low hydraulic pressure", severity: "warning", fix_steps: ["Check hydraulic fluid level", "Inspect hydraulic pump", "Check for line leaks", "Verify pressure switch"], estimated_downtime_min: 20, color: "yellow" },
  "600": { code: "600", plain_english: "Overtravel limit — axis beyond travel range", severity: "critical", fix_steps: ["Jog axis away from limit switch", "Check program coordinates", "Verify work offset", "Home machine if needed"], estimated_downtime_min: 5, color: "red" },
  "700": { code: "700", plain_english: "Emergency stop activated", severity: "emergency", fix_steps: ["Identify cause of E-stop", "Clear hazard", "Release E-stop button", "Press RESET", "Re-home all axes"], estimated_downtime_min: 5, color: "red" },
  "1000": { code: "1000", plain_english: "Chuck not clamped", severity: "critical", fix_steps: ["Verify workpiece is seated properly", "Check hydraulic chuck pressure", "Inspect chuck jaws", "Manual clamp test"], estimated_downtime_min: 10, color: "red" },
  "2000": { code: "2000", plain_english: "Door interlock open", severity: "info", fix_steps: ["Close machine door", "Check door switch", "Verify interlock sensor"], estimated_downtime_min: 1, color: "blue" },
};

export function decodeAlarm(code: string): AlarmQuickDecode {
  const alarm = COMMON_ALARMS[code];
  if (alarm) return alarm;

  return {
    code,
    plain_english: `Unknown alarm code ${code} — check machine manual`,
    severity: "warning",
    fix_steps: ["Check machine manual for alarm code", "Note any additional error details on screen", "Power cycle if safe", "Contact machine manufacturer"],
    estimated_downtime_min: 15,
    color: "yellow",
  };
}

// ─── Tool Life Timer ─────────────────────────────────────────────────────────

const activeTimers: Map<string, ToolLifeTimer> = new Map();
let timerCounter = 0;

export function startToolTimer(params: Record<string, any>): ToolLifeTimer {
  timerCounter++;
  const id = `TLT-${String(timerCounter).padStart(3, "0")}`;
  const timer: ToolLifeTimer = {
    timer_id: id,
    tool: params.tool ?? "T01",
    estimated_life_min: params.estimated_life_min ?? params.tool_life_min ?? 45,
    started_at: new Date().toISOString(),
    elapsed_min: 0,
    remaining_min: params.estimated_life_min ?? params.tool_life_min ?? 45,
    state: "running",
    warning_at_pct: params.warning_pct ?? 80,
  };
  activeTimers.set(id, timer);
  return timer;
}

export function checkToolTimer(timerId: string): ToolLifeTimer | null {
  const timer = activeTimers.get(timerId);
  if (!timer) return null;

  if (timer.started_at) {
    const started = new Date(timer.started_at).getTime();
    const now = Date.now();
    timer.elapsed_min = Math.round((now - started) / 60000 * 100) / 100;
    timer.remaining_min = Math.max(0, timer.estimated_life_min - timer.elapsed_min);

    const pctUsed = (timer.elapsed_min / timer.estimated_life_min) * 100;
    if (pctUsed >= 100) timer.state = "expired";
    else if (pctUsed >= timer.warning_at_pct) timer.state = "warning";
    else timer.state = "running";
  }
  return timer;
}

export function resetToolTimer(timerId: string): ToolLifeTimer | null {
  const timer = activeTimers.get(timerId);
  if (!timer) return null;
  timer.started_at = new Date().toISOString();
  timer.elapsed_min = 0;
  timer.remaining_min = timer.estimated_life_min;
  timer.state = "running";
  return timer;
}

export function listToolTimers(): ToolLifeTimer[] {
  return Array.from(activeTimers.values()).map(t => {
    checkToolTimer(t.timer_id); // refresh state
    return t;
  });
}

// ─── Offline Cache Bundle ────────────────────────────────────────────────────

/**
 * Generate an offline cache bundle with common material/tool/operation combos.
 * The machinist downloads this once; works without network.
 */
export function generateOfflineCache(): OfflineCacheBundle {
  const materials = ["aluminum", "steel", "stainless", "titanium", "inconel"];
  const diameters = [6, 10, 12, 16, 20, 25];
  const operations = ["roughing", "finishing"];

  const entries: CacheEntry[] = [];
  for (const m of materials) {
    for (const d of diameters) {
      for (const op of operations) {
        entries.push({
          material: m,
          tool_diameter_mm: d,
          operation: op,
          result: quickLookup({ material: m, tool_diameter_mm: d, operation: op }),
        });
      }
    }
  }

  const json = JSON.stringify(entries);
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    entries,
    total_bytes: json.length,
  };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Dispatcher for mobile interface actions.
 *
 * Actions:
 *   mobile_lookup     — Quick material/tool/operation → parameters
 *   mobile_voice      — Voice query parsing → parameters + spoken response
 *   mobile_alarm      — Alarm code → plain English + fix steps
 *   mobile_timer_start — Start tool life timer
 *   mobile_timer_check — Check timer state
 *   mobile_timer_reset — Reset timer (new tool inserted)
 *   mobile_timer_list  — List active timers
 *   mobile_cache       — Generate offline cache bundle
 */
export function mobileInterface(action: string, params: Record<string, any>): any {
  switch (action) {
    case "mobile_lookup":
      return quickLookup(params);

    case "mobile_voice":
      return processVoiceQuery(params.query ?? params.text ?? "");

    case "mobile_alarm":
      return decodeAlarm(params.code ?? params.alarm_code ?? "");

    case "mobile_timer_start":
      return startToolTimer(params);

    case "mobile_timer_check": {
      const timer = checkToolTimer(params.timer_id ?? params.id ?? "");
      if (!timer) return { error: "Timer not found" };
      return timer;
    }

    case "mobile_timer_reset": {
      const timer = resetToolTimer(params.timer_id ?? params.id ?? "");
      if (!timer) return { error: "Timer not found" };
      return timer;
    }

    case "mobile_timer_list":
      return { timers: listToolTimers(), total: activeTimers.size };

    case "mobile_cache":
      return generateOfflineCache();

    default:
      return { error: `MobileInterfaceEngine: unknown action "${action}"` };
  }
}
