/**
 * MachineConnectivityEngine.ts — R9-MS0 MTConnect/OPC-UA Data Ingestion
 * ======================================================================
 *
 * Server-side engine for real-time machine data. Provides:
 *   - Machine registry with connection status
 *   - Live status: RPM, feed, load, position, alarms
 *   - Chatter detection from spindle load signals
 *   - Tool wear monitoring from load trends
 *   - Thermal drift tracking
 *   - Alert generation and history
 *
 * Actual MTConnect/OPC-UA connections happen in prism-bridge-service.
 * This engine processes ingested data and exposes it via MCP actions.
 *
 * @version 1.0.0 — R9-MS0
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type MachineState = "running" | "idle" | "setup" | "alarm" | "offline";
export type ProtocolType = "mtconnect" | "opcua" | "focas" | "mock";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType = "chatter_detected" | "overload_trending" | "tool_wear_predicted" | "thermal_drift" | "alarm_active" | "feed_override_low";

export interface MachineConfig {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  protocol: ProtocolType;
  endpoint?: string;
  poll_interval_ms: number;
}

export interface MachinePosition {
  x: number; y: number; z: number;
  a?: number; b?: number; c?: number;
}

export interface MachineLiveData {
  timestamp: string;
  state: MachineState;
  program: string;
  tool: string;
  spindle_rpm: number;
  spindle_load_pct: number;
  feed_rate_mmmin: number;
  position: MachinePosition;
  cycle_time_elapsed_sec: number;
  part_count: number;
  coolant_active: boolean;
  feed_override_pct: number;
}

export interface MachineAlert {
  id: string;
  machine_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  recommended_action: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface MachineLiveStatus {
  machine: MachineConfig;
  connected: boolean;
  last_update: string;
  current: MachineLiveData;
  alerts: MachineAlert[];
}

export interface ChatterResult {
  chatter_detected: boolean;
  dominant_frequency_hz: number;
  severity: number;
  current_rpm: number;
  recommended_rpm: number[];
  action: string;
}

export interface ToolWearStatus {
  tool_id: string;
  installed_at: string;
  cutting_time_min: number;
  predicted_remaining_life_min: number;
  wear_rate: "normal" | "accelerating" | "stable";
  spindle_load_trend: {
    initial_pct: number;
    current_pct: number;
    slope: number;
  };
  recommendation: string;
}

export interface ThermalDriftStatus {
  machine_id: string;
  ambient_temp_C: number;
  spindle_temp_C: number;
  warmup_time_min: number;
  estimated_z_drift_mm: number;
  compensation_active: boolean;
  recommendation: string;
}

// ─── Machine Registry ────────────────────────────────────────────────────────

const machines = new Map<string, MachineConfig>();
const liveData = new Map<string, MachineLiveData>();
const alerts = new Map<string, MachineAlert[]>();
const connections = new Map<string, boolean>();
const toolWear = new Map<string, ToolWearStatus>();
const thermalState = new Map<string, ThermalDriftStatus>();
const spindleLoadHistory = new Map<string, number[]>();

let alertCounter = 0;

function generateAlertId(): string {
  alertCounter++;
  return `ALR-${Date.now().toString(36)}-${alertCounter.toString().padStart(3, "0")}`;
}

/** Register a machine */
export function registerMachine(config: MachineConfig): MachineConfig {
  machines.set(config.id, config);
  connections.set(config.id, false);
  alerts.set(config.id, []);
  spindleLoadHistory.set(config.id, []);
  return { ...config };
}

/** Remove a machine */
export function unregisterMachine(id: string): boolean {
  if (!machines.has(id)) return false;
  machines.delete(id);
  liveData.delete(id);
  connections.delete(id);
  alerts.delete(id);
  toolWear.delete(id);
  thermalState.delete(id);
  spindleLoadHistory.delete(id);
  return true;
}

/** List all registered machines */
export function listMachines(): MachineConfig[] {
  return [...machines.values()];
}

/** Get machine by ID */
export function getMachine(id: string): MachineConfig | null {
  return machines.get(id) ?? null;
}

// ─── Connection Management ───────────────────────────────────────────────────

/** Simulate connecting to a machine */
export function connectMachine(id: string): { connected: boolean; message: string } {
  const machine = machines.get(id);
  if (!machine) return { connected: false, message: "Machine not found" };

  connections.set(id, true);

  // Initialize with idle data
  const now = new Date().toISOString();
  liveData.set(id, {
    timestamp: now,
    state: "idle",
    program: "",
    tool: "T01",
    spindle_rpm: 0,
    spindle_load_pct: 0,
    feed_rate_mmmin: 0,
    position: { x: 0, y: 0, z: 100 },
    cycle_time_elapsed_sec: 0,
    part_count: 0,
    coolant_active: false,
    feed_override_pct: 100,
  });

  return { connected: true, message: `Connected to ${machine.name} via ${machine.protocol}` };
}

/** Disconnect from a machine */
export function disconnectMachine(id: string): boolean {
  if (!machines.has(id)) return false;
  connections.set(id, false);
  return true;
}

// ─── Live Data Ingestion ─────────────────────────────────────────────────────

/**
 * Ingest live data from bridge service.
 * In production, called by prism-bridge-service via HTTP/WebSocket.
 * Returns generated alerts from the new data.
 */
export function ingestLiveData(machineId: string, data: Partial<MachineLiveData>): MachineAlert[] {
  const machine = machines.get(machineId);
  if (!machine) return [];

  const now = new Date().toISOString();
  const prev = liveData.get(machineId);
  const current: MachineLiveData = {
    timestamp: now,
    state: data.state ?? prev?.state ?? "idle",
    program: data.program ?? prev?.program ?? "",
    tool: data.tool ?? prev?.tool ?? "T01",
    spindle_rpm: data.spindle_rpm ?? prev?.spindle_rpm ?? 0,
    spindle_load_pct: data.spindle_load_pct ?? prev?.spindle_load_pct ?? 0,
    feed_rate_mmmin: data.feed_rate_mmmin ?? prev?.feed_rate_mmmin ?? 0,
    position: data.position ?? prev?.position ?? { x: 0, y: 0, z: 100 },
    cycle_time_elapsed_sec: data.cycle_time_elapsed_sec ?? prev?.cycle_time_elapsed_sec ?? 0,
    part_count: data.part_count ?? prev?.part_count ?? 0,
    coolant_active: data.coolant_active ?? prev?.coolant_active ?? false,
    feed_override_pct: data.feed_override_pct ?? prev?.feed_override_pct ?? 100,
  };

  liveData.set(machineId, current);
  connections.set(machineId, true);

  // Track spindle load history for trend analysis
  const history = spindleLoadHistory.get(machineId) ?? [];
  history.push(current.spindle_load_pct);
  if (history.length > 100) history.shift();
  spindleLoadHistory.set(machineId, history);

  // Generate alerts from data analysis
  const newAlerts = analyzeData(machineId, current, prev);
  const machineAlerts = alerts.get(machineId) ?? [];
  machineAlerts.push(...newAlerts);
  // Keep last 50 alerts per machine
  if (machineAlerts.length > 50) machineAlerts.splice(0, machineAlerts.length - 50);
  alerts.set(machineId, machineAlerts);

  return newAlerts;
}

/** Analyze incoming data for anomalies */
function analyzeData(machineId: string, current: MachineLiveData, prev?: MachineLiveData): MachineAlert[] {
  const newAlerts: MachineAlert[] = [];
  const now = new Date().toISOString();

  // Overload trending
  if (current.spindle_load_pct > 85) {
    newAlerts.push({
      id: generateAlertId(),
      machine_id: machineId,
      type: "overload_trending",
      severity: current.spindle_load_pct > 95 ? "critical" : "warning",
      message: `Spindle load at ${current.spindle_load_pct}% — approaching limit`,
      recommended_action: current.spindle_load_pct > 95
        ? "STOP — reduce DOC or feed immediately"
        : "Reduce feed rate by 10-15%",
      timestamp: now,
      acknowledged: false,
    });
  }

  // Feed override low warning
  if (current.feed_override_pct < 50 && current.state === "running") {
    newAlerts.push({
      id: generateAlertId(),
      machine_id: machineId,
      type: "feed_override_low",
      severity: "info",
      message: `Feed override at ${current.feed_override_pct}% — operator reduced feed`,
      recommended_action: "Check if parameters are too aggressive for this setup",
      timestamp: now,
      acknowledged: false,
    });
  }

  // Alarm state
  if (current.state === "alarm" && prev?.state !== "alarm") {
    newAlerts.push({
      id: generateAlertId(),
      machine_id: machineId,
      type: "alarm_active",
      severity: "critical",
      message: "Machine entered alarm state",
      recommended_action: "Check machine display for alarm code, use alarm_decode for diagnosis",
      timestamp: now,
      acknowledged: false,
    });
  }

  return newAlerts;
}

// ─── Live Status Query ───────────────────────────────────────────────────────

/** Get complete live status for a machine */
export function getLiveStatus(machineId: string): MachineLiveStatus | null {
  const machine = machines.get(machineId);
  if (!machine) return null;

  const connected = connections.get(machineId) ?? false;
  const data = liveData.get(machineId);
  const machineAlerts = (alerts.get(machineId) ?? []).filter(a => !a.acknowledged);

  return {
    machine,
    connected,
    last_update: data?.timestamp ?? "",
    current: data ?? {
      timestamp: "",
      state: "offline",
      program: "",
      tool: "",
      spindle_rpm: 0,
      spindle_load_pct: 0,
      feed_rate_mmmin: 0,
      position: { x: 0, y: 0, z: 0 },
      cycle_time_elapsed_sec: 0,
      part_count: 0,
      coolant_active: false,
      feed_override_pct: 100,
    },
    alerts: machineAlerts,
  };
}

/** Get all machine statuses */
export function getAllMachineStatuses(): MachineLiveStatus[] {
  return [...machines.keys()].map(id => getLiveStatus(id)!);
}

// ─── Chatter Detection ──────────────────────────────────────────────────────

/**
 * Detect chatter from spindle load signal.
 * In production, uses FFT on high-frequency spindle load data.
 * This simplified version uses load variance as a proxy.
 */
export function detectChatter(machineId: string): ChatterResult {
  const history = spindleLoadHistory.get(machineId) ?? [];
  const data = liveData.get(machineId);
  const currentRpm = data?.spindle_rpm ?? 0;

  if (history.length < 10) {
    return {
      chatter_detected: false,
      dominant_frequency_hz: 0,
      severity: 0,
      current_rpm: currentRpm,
      recommended_rpm: [],
      action: "Insufficient data — need at least 10 samples",
    };
  }

  // Calculate variance (proxy for chatter — real impl uses FFT)
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  const chatterDetected = cv > 0.15;
  const severity = Math.min(cv / 0.3, 1.0);

  // Estimated dominant frequency from spindle speed
  const teeth = 4; // assume 4-flute
  const toothPassFreq = (currentRpm / 60) * teeth;
  const dominantFreq = chatterDetected ? toothPassFreq * 1.1 : 0;

  // Recommended stable RPM pockets (simplified SLD lookup)
  const stableRpms: number[] = [];
  if (chatterDetected && currentRpm > 0) {
    // Simple heuristic: avoid multiples of the chatter frequency
    const rpm80 = Math.round(currentRpm * 0.8 / 100) * 100;
    const rpm65 = Math.round(currentRpm * 0.65 / 100) * 100;
    if (rpm80 > 500) stableRpms.push(rpm80);
    if (rpm65 > 500) stableRpms.push(rpm65);
  }

  return {
    chatter_detected: chatterDetected,
    dominant_frequency_hz: Math.round(dominantFreq * 10) / 10,
    severity: Math.round(severity * 100) / 100,
    current_rpm: currentRpm,
    recommended_rpm: stableRpms,
    action: chatterDetected
      ? `Chatter detected — reduce RPM to ${stableRpms[0] ?? "lower speed"} or reduce DOC`
      : "No chatter detected — parameters stable",
  };
}

// ─── Tool Wear Monitoring ────────────────────────────────────────────────────

/**
 * Start monitoring a tool's wear from spindle load trends.
 */
export function startToolWearMonitor(machineId: string, toolId: string, expectedLifeMin: number): ToolWearStatus {
  const data = liveData.get(machineId);
  const initialLoad = data?.spindle_load_pct ?? 30;
  const now = new Date().toISOString();

  const status: ToolWearStatus = {
    tool_id: toolId,
    installed_at: now,
    cutting_time_min: 0,
    predicted_remaining_life_min: expectedLifeMin,
    wear_rate: "normal",
    spindle_load_trend: {
      initial_pct: initialLoad,
      current_pct: initialLoad,
      slope: 0,
    },
    recommendation: "Tool is new — monitoring started",
  };

  toolWear.set(`${machineId}:${toolId}`, status);
  return { ...status };
}

/**
 * Update tool wear from current spindle load.
 */
export function updateToolWear(machineId: string, toolId: string, cuttingTimeMin: number): ToolWearStatus | null {
  const key = `${machineId}:${toolId}`;
  const status = toolWear.get(key);
  if (!status) return null;

  const data = liveData.get(machineId);
  const currentLoad = data?.spindle_load_pct ?? status.spindle_load_trend.current_pct;

  status.cutting_time_min = cuttingTimeMin;
  status.spindle_load_trend.current_pct = currentLoad;

  // Calculate wear slope (load increase per minute)
  const loadIncrease = currentLoad - status.spindle_load_trend.initial_pct;
  const slope = cuttingTimeMin > 0 ? loadIncrease / cuttingTimeMin : 0;
  status.spindle_load_trend.slope = Math.round(slope * 1000) / 1000;

  // Classify wear rate
  if (slope > 0.5) {
    status.wear_rate = "accelerating";
  } else if (slope > 0.1) {
    status.wear_rate = "normal";
  } else {
    status.wear_rate = "stable";
  }

  // Predict remaining life based on load threshold (assume failure at 90% load)
  const maxLoad = 90;
  const remaining = slope > 0 ? (maxLoad - currentLoad) / slope : status.predicted_remaining_life_min;
  status.predicted_remaining_life_min = Math.max(0, Math.round(remaining));

  // Generate recommendation
  if (status.predicted_remaining_life_min <= 5) {
    status.recommendation = "REPLACE NOW — tool near end of life";
  } else if (status.predicted_remaining_life_min <= 15) {
    status.recommendation = `Replace in ~${status.predicted_remaining_life_min} minutes`;
  } else if (status.wear_rate === "accelerating") {
    status.recommendation = "Tool wearing faster than expected — monitor closely";
  } else {
    status.recommendation = "Tool running well";
  }

  toolWear.set(key, status);
  return { ...status };
}

/** Get tool wear status */
export function getToolWear(machineId: string, toolId: string): ToolWearStatus | null {
  return toolWear.get(`${machineId}:${toolId}`) ?? null;
}

// ─── Thermal Drift ───────────────────────────────────────────────────────────

/**
 * Update thermal state for a machine.
 * Real implementation reads spindle/ambient temperature sensors via MTConnect.
 */
export function updateThermalState(
  machineId: string,
  ambientC: number,
  spindleC: number,
  warmupMin: number,
): ThermalDriftStatus {
  // Thermal drift model: Z-axis drift ~ 0.001mm per degree C of spindle temp rise
  const tempRise = spindleC - ambientC;
  const estimatedDrift = tempRise * 0.001;

  const status: ThermalDriftStatus = {
    machine_id: machineId,
    ambient_temp_C: ambientC,
    spindle_temp_C: spindleC,
    warmup_time_min: warmupMin,
    estimated_z_drift_mm: Math.round(estimatedDrift * 1000) / 1000,
    compensation_active: warmupMin >= 15,
    recommendation: warmupMin < 15
      ? `Run warmup cycle for ${15 - warmupMin} more minutes — Z drift estimated at ${estimatedDrift.toFixed(3)}mm`
      : estimatedDrift > 0.01
        ? `Thermal drift ${estimatedDrift.toFixed(3)}mm — run touch probe cycle to verify Z offset`
        : "Thermal state stable — proceed with confidence",
  };

  thermalState.set(machineId, status);
  return { ...status };
}

/** Get thermal drift status */
export function getThermalState(machineId: string): ThermalDriftStatus | null {
  return thermalState.get(machineId) ?? null;
}

// ─── Alert Management ────────────────────────────────────────────────────────

/** Acknowledge an alert */
export function acknowledgeAlert(machineId: string, alertId: string): boolean {
  const machineAlerts = alerts.get(machineId);
  if (!machineAlerts) return false;
  const alert = machineAlerts.find(a => a.id === alertId);
  if (!alert) return false;
  alert.acknowledged = true;
  return true;
}

/** Get alert history for a machine */
export function getAlertHistory(machineId: string, limit: number = 20): MachineAlert[] {
  const machineAlerts = alerts.get(machineId) ?? [];
  return machineAlerts.slice(-limit).reverse();
}

// ─── Dispatcher Entry Point ──────────────────────────────────────────────────

/**
 * Dispatcher entry for intelligenceDispatcher routing.
 * Actions:
 *   machine_register     — Register a machine
 *   machine_unregister   — Remove a machine
 *   machine_list         — List all machines
 *   machine_connect      — Connect to a machine
 *   machine_disconnect   — Disconnect from a machine
 *   machine_live_status  — Get live status
 *   machine_all_status   — Get all machine statuses
 *   machine_ingest       — Ingest live data from bridge
 *   chatter_detect_live  — Real-time chatter detection
 *   tool_wear_start      — Start tool wear monitoring
 *   tool_wear_update     — Update tool wear
 *   tool_wear_status     — Get tool wear status
 *   thermal_update       — Update thermal state
 *   thermal_status       — Get thermal drift status
 *   alert_acknowledge    — Acknowledge an alert
 *   alert_history        — Get alert history
 */
export function machineConnectivity(action: string, params: Record<string, any>): any {
  switch (action) {
    case "machine_register": {
      return registerMachine({
        id: params.id ?? `MCH-${Date.now().toString(36)}`,
        name: params.name ?? "Unknown Machine",
        manufacturer: params.manufacturer ?? "Unknown",
        model: params.model ?? "Unknown",
        protocol: params.protocol ?? "mock",
        endpoint: params.endpoint,
        poll_interval_ms: params.poll_interval_ms ?? 1000,
      });
    }

    case "machine_unregister": {
      const removed = unregisterMachine(params.id ?? "");
      return { removed, id: params.id };
    }

    case "machine_list": {
      const list = listMachines();
      return {
        total: list.length,
        machines: list.map(m => ({
          id: m.id,
          name: m.name,
          manufacturer: m.manufacturer,
          model: m.model,
          protocol: m.protocol,
          connected: connections.get(m.id) ?? false,
        })),
      };
    }

    case "machine_connect": {
      return connectMachine(params.id ?? "");
    }

    case "machine_disconnect": {
      const ok = disconnectMachine(params.id ?? "");
      return { disconnected: ok, id: params.id };
    }

    case "machine_live_status": {
      const status = getLiveStatus(params.id ?? "");
      if (!status) return { error: "Machine not found", id: params.id };
      return status;
    }

    case "machine_all_status": {
      return { machines: getAllMachineStatuses() };
    }

    case "machine_ingest": {
      const newAlerts = ingestLiveData(params.machine_id ?? params.id ?? "", params.data ?? params);
      return { alerts_generated: newAlerts.length, alerts: newAlerts };
    }

    case "chatter_detect_live": {
      return detectChatter(params.machine_id ?? params.id ?? "");
    }

    case "tool_wear_start": {
      return startToolWearMonitor(
        params.machine_id ?? params.id ?? "",
        params.tool_id ?? "T01",
        params.expected_life_min ?? 30,
      );
    }

    case "tool_wear_update": {
      const wear = updateToolWear(
        params.machine_id ?? params.id ?? "",
        params.tool_id ?? "T01",
        params.cutting_time_min ?? 0,
      );
      return wear ?? { error: "Tool not being monitored" };
    }

    case "tool_wear_status": {
      const wear = getToolWear(
        params.machine_id ?? params.id ?? "",
        params.tool_id ?? "T01",
      );
      return wear ?? { error: "Tool not being monitored" };
    }

    case "thermal_update": {
      return updateThermalState(
        params.machine_id ?? params.id ?? "",
        params.ambient_C ?? 22,
        params.spindle_C ?? 35,
        params.warmup_min ?? 0,
      );
    }

    case "thermal_status": {
      const thermal = getThermalState(params.machine_id ?? params.id ?? "");
      return thermal ?? { error: "No thermal data", id: params.machine_id ?? params.id };
    }

    case "alert_acknowledge": {
      const ok = acknowledgeAlert(params.machine_id ?? params.id ?? "", params.alert_id ?? "");
      return { acknowledged: ok };
    }

    case "alert_history": {
      return {
        alerts: getAlertHistory(params.machine_id ?? params.id ?? "", params.limit ?? 20),
      };
    }

    default:
      throw new Error(`MachineConnectivityEngine: unknown action "${action}"`);
  }
}

// ─── Source File Catalog (14 LOW-priority integration extractions) ───────────

export const CONNECTIVITY_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
  integration_type: string;
}> = {
  "EXT-350": {
    filename: "PRISM_100_PERCENT_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 187,
    safety_class: "LOW",
    description: "Full-coverage integration module for PRISM system connectivity",
    integration_type: "general",
  },
  "EXT-351": {
    filename: "PRISM_AI_100_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 165,
    safety_class: "LOW",
    description: "AI-powered integration layer for PRISM analytics pipeline",
    integration_type: "general",
  },
  "EXT-352": {
    filename: "PRISM_AI_KNOWLEDGE_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 120,
    safety_class: "LOW",
    description: "AI knowledge base integration for machining intelligence",
    integration_type: "general",
  },
  "EXT-353": {
    filename: "PRISM_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 279,
    safety_class: "LOW",
    description: "Core bridge module connecting PRISM subsystems",
    integration_type: "general",
  },
  "EXT-354": {
    filename: "PRISM_CAD_LEARNING_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 304,
    safety_class: "LOW",
    description: "CAD-to-learning pipeline bridge for geometry-driven optimization",
    integration_type: "general",
  },
  "EXT-355": {
    filename: "PRISM_CALCULATOR_ENHANCEMENT_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 83,
    safety_class: "LOW",
    description: "Calculator enhancement bridge for parameter computation",
    integration_type: "general",
  },
  "EXT-356": {
    filename: "PRISM_DATABASE_HUB.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 77,
    safety_class: "LOW",
    description: "Central database hub for cross-module data access",
    integration_type: "general",
  },
  "EXT-357": {
    filename: "PRISM_ENHANCED_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 476,
    safety_class: "LOW",
    description: "Enhanced integration module with extended connectivity features",
    integration_type: "general",
  },
  "EXT-358": {
    filename: "PRISM_EVENT_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 74,
    safety_class: "LOW",
    description: "Event-driven bridge for real-time system notifications",
    integration_type: "general",
  },
  "EXT-359": {
    filename: "PRISM_FINAL_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 136,
    safety_class: "LOW",
    description: "Final integration assembly connecting all PRISM modules",
    integration_type: "general",
  },
  "EXT-360": {
    filename: "PRISM_HIGH_PRIORITY_INTEGRATION_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 59,
    safety_class: "LOW",
    description: "High-priority integration bridge for critical-path data flows",
    integration_type: "general",
  },
  "EXT-361": {
    filename: "PRISM_KERNEL_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 101,
    safety_class: "LOW",
    description: "Kernel-level integration for core PRISM computation engine",
    integration_type: "general",
  },
  "EXT-362": {
    filename: "PRISM_PRODUCTION_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 205,
    safety_class: "LOW",
    description: "Production workflow integration for shop-floor data exchange",
    integration_type: "general",
  },
  "EXT-363": {
    filename: "PRISM_SIMULATION_INTEGRATION_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 402,
    safety_class: "LOW",
    description: "Simulation integration bridge for virtual machining validation",
    integration_type: "general",
  },
};

/** Returns the source file catalog for machine connectivity engine traceability. */
export function getSourceFileCatalog(): typeof CONNECTIVITY_SOURCE_FILE_CATALOG {
  return CONNECTIVITY_SOURCE_FILE_CATALOG;
}
