/**
 * R10-Rev9 — Real-Time Adaptive Machining (Adaptive Control Engine)
 *
 * Closed-loop adaptive control: reads sensor data, computes optimal
 * overrides (feed, spindle, coolant), and outputs control commands
 * for CNC controllers via FOCAS/OPC-UA/macro variable interfaces.
 *
 * Dispatcher actions:
 *   adaptive_chipload, adaptive_chatter, adaptive_wear, adaptive_thermal,
 *   adaptive_override, adaptive_status, adaptive_config, adaptive_log,
 *   adaptive_history, adaptive_get
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type ControllerType = "fanuc_focas" | "siemens_opcua" | "haas_macro" | "mazak_smooth" | "generic";
type AdaptiveMode = "constant_chipload" | "chatter_suppression" | "wear_compensation" | "thermal_compensation" | "full_adaptive";
type OverrideChannel = "feed" | "spindle" | "coolant_pressure" | "coolant_flow";
type AlertLevel = "info" | "warning" | "critical" | "emergency_stop";

interface SensorReading {
  timestamp: string;
  spindle_load_pct: number;       // 0-100
  vibration_mm_s: number;         // mm/s RMS
  temperature_c: number;          // spindle nose temp
  position_error_um: number;      // position deviation
  feed_rate_actual_mmpm: number;  // actual vs commanded
  spindle_rpm_actual: number;
  coolant_pressure_bar?: number;
  power_kw?: number;
}

interface OverrideCommand {
  channel: OverrideChannel;
  value_pct: number;           // 0-200 (100 = nominal)
  reason: string;
  confidence: number;
  timestamp: string;
}

interface AdaptiveState {
  session_id: string;
  controller: ControllerType;
  mode: AdaptiveMode;
  active: boolean;
  started: string;
  readings_count: number;
  overrides_issued: number;
  current_overrides: Record<OverrideChannel, number>;
  alerts: Array<{ level: AlertLevel; message: string; timestamp: string }>;
  tool_wear_pct: number;
  chatter_events: number;
  thermal_drift_um: number;
}

interface ChiploadResult {
  target_chipload_mm: number;
  actual_chipload_mm: number;
  engagement_angle_deg: number;
  feed_override_pct: number;
  force_ratio: number;
  recommendation: string;
  alerts: Array<{ level: AlertLevel; message: string }>;
}

interface ChatterResult {
  dominant_frequency_hz: number;
  amplitude_mm_s: number;
  is_chatter: boolean;
  stable_rpm_options: number[];
  recommended_rpm: number;
  spindle_override_pct: number;
  feed_adjustment_pct: number;
  recommendation: string;
}

interface WearResult {
  estimated_wear_pct: number;
  wear_rate_pct_per_min: number;
  remaining_life_min: number;
  force_increase_pct: number;
  feed_compensation_pct: number;
  ra_degradation_pct: number;
  should_replace: boolean;
  recommendation: string;
}

interface ThermalResult {
  spindle_temp_c: number;
  ambient_delta_c: number;
  z_drift_um: number;
  x_drift_um: number;
  y_drift_um: number;
  compensation_applied: boolean;
  compensation_values_um: { x: number; y: number; z: number };
  recommendation: string;
}

interface AdaptiveConfig {
  controller: ControllerType;
  mode: AdaptiveMode;
  chipload_tolerance_pct: number;
  max_feed_override_pct: number;
  min_feed_override_pct: number;
  chatter_threshold_mm_s: number;
  wear_replacement_pct: number;
  thermal_compensation_enabled: boolean;
  thermal_coefficient_um_per_c: number;
  update_interval_ms: number;
  emergency_stop_load_pct: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const sessions: Map<string, AdaptiveState> = new Map();
const sensorHistory: SensorReading[] = [];
const overrideLog: OverrideCommand[] = [];
const resultStore: Map<string, Record<string, unknown>> = new Map();

let defaultConfig: AdaptiveConfig = {
  controller: "generic",
  mode: "full_adaptive",
  chipload_tolerance_pct: 15,
  max_feed_override_pct: 150,
  min_feed_override_pct: 40,
  chatter_threshold_mm_s: 2.5,
  wear_replacement_pct: 85,
  thermal_compensation_enabled: true,
  thermal_coefficient_um_per_c: 1.2,
  update_interval_ms: 100,
  emergency_stop_load_pct: 95,
};

let activeSession: AdaptiveState | null = null;

// ─── Constant Chip Load ──────────────────────────────────────────────────────

function calculateChipload(params: Record<string, unknown>): ChiploadResult {
  const targetChipload = (params.target_chipload_mm as number) ?? 0.1;
  const currentFeed = (params.feed_rate_mmpm as number) ?? 1000;
  const spindleRpm = (params.spindle_rpm as number) ?? 5000;
  const flutes = (params.flutes as number) ?? 4;
  const engagementAngle = (params.engagement_angle_deg as number) ?? 90;
  const spindleLoad = (params.spindle_load_pct as number) ?? 50;
  const toolDiameter = (params.tool_diameter_mm as number) ?? 12;

  // Actual chipload = feed / (RPM * flutes)
  const actualChipload = currentFeed / (spindleRpm * flutes);

  // Engagement angle affects effective chip thickness
  // At 180deg (full slot), effective thickness = chipload
  // At 90deg (half engagement), effective thickness = chipload * sin(90/2) = 0.707
  // At 30deg (light engagement), effective thickness = chipload * sin(30/2) = 0.259
  const engRad = (engagementAngle * Math.PI) / 180;
  const effectiveThickness = actualChipload * Math.sin(engRad / 2);

  // Force ratio: actual vs nominal (90deg reference)
  const nominalThickness = targetChipload * Math.sin(Math.PI / 4); // 90deg reference
  const forceRatio = effectiveThickness / nominalThickness;

  // Calculate feed override to maintain constant chip load
  // If engagement increases (corner entry), reduce feed
  // If engagement decreases (corner exit), increase feed
  const idealFeed = targetChipload * spindleRpm * flutes;
  const correctionForEngagement = Math.sin(Math.PI / 4) / Math.sin(engRad / 2);
  const adjustedFeed = idealFeed * Math.min(correctionForEngagement, 2.5);
  let feedOverride = Math.round((adjustedFeed / currentFeed) * 100);

  // Clamp to config limits
  feedOverride = Math.max(
    defaultConfig.min_feed_override_pct,
    Math.min(feedOverride, defaultConfig.max_feed_override_pct)
  );

  const alerts: Array<{ level: AlertLevel; message: string }> = [];

  // Safety checks
  if (spindleLoad > defaultConfig.emergency_stop_load_pct) {
    alerts.push({ level: "emergency_stop", message: `Spindle load ${spindleLoad}% exceeds emergency threshold ${defaultConfig.emergency_stop_load_pct}%` });
    feedOverride = 0;
  } else if (spindleLoad > 80) {
    alerts.push({ level: "warning", message: `High spindle load: ${spindleLoad}%` });
    feedOverride = Math.min(feedOverride, 90);
  }

  if (engagementAngle > 150) {
    alerts.push({ level: "info", message: "Full-slot engagement detected. Feed reduced for chip evacuation." });
  }

  // Log override
  if (activeSession) {
    activeSession.overrides_issued++;
    activeSession.current_overrides.feed = feedOverride;
  }

  const recommendation = feedOverride === 100
    ? "Chip load is within tolerance. No adjustment needed."
    : feedOverride < 100
    ? `Reduce feed to ${feedOverride}% to maintain constant chip load through high-engagement zone.`
    : `Increase feed to ${feedOverride}% — engagement is light, chip load below target.`;

  return {
    target_chipload_mm: targetChipload,
    actual_chipload_mm: Math.round(actualChipload * 10000) / 10000,
    engagement_angle_deg: engagementAngle,
    feed_override_pct: feedOverride,
    force_ratio: Math.round(forceRatio * 100) / 100,
    recommendation,
    alerts,
  };
}

// ─── Chatter Suppression ─────────────────────────────────────────────────────

function detectChatter(params: Record<string, unknown>): ChatterResult {
  const vibration = (params.vibration_mm_s as number) ?? 1.0;
  const currentRpm = (params.spindle_rpm as number) ?? 5000;
  const dominantFreq = (params.dominant_frequency_hz as number) ?? 0;
  const toolFlutes = (params.flutes as number) ?? 4;
  const toolDiameter = (params.tool_diameter_mm as number) ?? 12;

  const threshold = defaultConfig.chatter_threshold_mm_s;
  const isChatter = vibration > threshold;

  // Calculate tooth passing frequency
  const toothPassFreq = (currentRpm / 60) * toolFlutes;

  // The dominant frequency from FFT analysis
  const freq = dominantFreq > 0 ? dominantFreq : toothPassFreq;

  // Calculate stable RPM options using stability lobe theory
  // Stable RPM = 60 * f_chatter / (N * (k + epsilon)) where k is integer lobe number
  const stableOptions: number[] = [];
  if (isChatter && freq > 0) {
    for (let k = 1; k <= 5; k++) {
      // At each lobe, find RPM where tooth-pass frequency creates destructive interference
      const rpmOption = Math.round((60 * freq) / (toolFlutes * (k + 0.5)));
      if (rpmOption >= 500 && rpmOption <= 20000) {
        stableOptions.push(rpmOption);
      }
      const rpmOption2 = Math.round((60 * freq) / (toolFlutes * k));
      if (rpmOption2 >= 500 && rpmOption2 <= 20000 && !stableOptions.includes(rpmOption2)) {
        stableOptions.push(rpmOption2);
      }
    }
    stableOptions.sort((a, b) => Math.abs(a - currentRpm) - Math.abs(b - currentRpm));
  }

  // Choose nearest stable RPM (prefer lower for safety)
  const lowerOptions = stableOptions.filter(r => r <= currentRpm);
  const recommendedRpm = isChatter
    ? (lowerOptions.length > 0 ? lowerOptions[0] : stableOptions[0] ?? Math.round(currentRpm * 0.9))
    : currentRpm;

  const spindleOverride = isChatter ? Math.round((recommendedRpm / currentRpm) * 100) : 100;

  // Adjust feed proportionally to maintain chip load
  const feedAdjustment = isChatter ? spindleOverride : 100;

  // Log chatter event
  if (activeSession && isChatter) {
    activeSession.chatter_events++;
    activeSession.current_overrides.spindle = spindleOverride;
    activeSession.current_overrides.feed = feedAdjustment;
  }

  const recommendation = isChatter
    ? `Chatter detected at ${vibration.toFixed(1)} mm/s (threshold ${threshold}). ` +
      `Shift spindle to ${recommendedRpm} RPM (${spindleOverride}% override). ` +
      `Adjust feed proportionally to maintain chip load.`
    : `Vibration ${vibration.toFixed(1)} mm/s within stable range (threshold ${threshold}).`;

  return {
    dominant_frequency_hz: Math.round(freq),
    amplitude_mm_s: vibration,
    is_chatter: isChatter,
    stable_rpm_options: stableOptions.slice(0, 5),
    recommended_rpm: recommendedRpm,
    spindle_override_pct: spindleOverride,
    feed_adjustment_pct: feedAdjustment,
    recommendation,
  };
}

// ─── Tool Wear Compensation ──────────────────────────────────────────────────

function compensateWear(params: Record<string, unknown>): WearResult {
  const currentTime = (params.cutting_time_min as number) ?? 0;
  const expectedLife = (params.expected_life_min as number) ?? 45;
  const spindleLoadBaseline = (params.baseline_load_pct as number) ?? 40;
  const spindleLoadCurrent = (params.current_load_pct as number) ?? 50;
  const flankWearVb = (params.flank_wear_mm as number) ?? 0;
  const raBaseline = (params.ra_baseline_um as number) ?? 1.6;

  // Estimate wear from cutting time and load increase
  const timeBasedWear = (currentTime / expectedLife) * 100;
  const loadIncrease = ((spindleLoadCurrent - spindleLoadBaseline) / spindleLoadBaseline) * 100;
  const loadBasedWear = loadIncrease * 2.5; // Load increase correlates ~2.5x with wear

  // If flank wear measurement available, use it directly
  const wearFromVb = flankWearVb > 0 ? (flankWearVb / 0.3) * 100 : 0; // VB=0.3mm = 100% (ISO criterion)

  // Take the maximum estimate (most conservative)
  const estimatedWear = Math.min(Math.max(timeBasedWear, loadBasedWear, wearFromVb), 100);
  const wearRate = currentTime > 0 ? estimatedWear / currentTime : 0;
  const remainingLife = wearRate > 0 ? Math.max((100 - estimatedWear) / wearRate, 0) : expectedLife - currentTime;

  // Force increase due to wear
  const forceIncrease = Math.round(loadIncrease);

  // Feed compensation: reduce feed to limit force increase
  const feedComp = estimatedWear > 50
    ? Math.round(100 - (estimatedWear - 50) * 0.3) // Reduce feed by 0.3% per 1% wear above 50%
    : 100;

  // Surface finish degradation
  const raDegradation = Math.round(estimatedWear * 0.5); // Rough estimate: 0.5% Ra increase per 1% wear

  const shouldReplace = estimatedWear >= defaultConfig.wear_replacement_pct;

  // Update session
  if (activeSession) {
    activeSession.tool_wear_pct = estimatedWear;
    if (feedComp < 100) {
      activeSession.current_overrides.feed = feedComp;
      activeSession.overrides_issued++;
    }
  }

  const recommendation = shouldReplace
    ? `Tool at ${estimatedWear.toFixed(0)}% wear — REPLACE NOW. Expected remaining life: ${remainingLife.toFixed(1)} min. ` +
      `Surface finish has degraded ~${raDegradation}%.`
    : estimatedWear > 50
    ? `Tool at ${estimatedWear.toFixed(0)}% wear. Feed reduced to ${feedComp}% to manage force increase. ` +
      `Remaining life: ~${remainingLife.toFixed(1)} min. Plan replacement.`
    : `Tool at ${estimatedWear.toFixed(0)}% wear. Within normal range. ` +
      `Remaining life: ~${remainingLife.toFixed(1)} min.`;

  return {
    estimated_wear_pct: Math.round(estimatedWear * 10) / 10,
    wear_rate_pct_per_min: Math.round(wearRate * 100) / 100,
    remaining_life_min: Math.round(remainingLife * 10) / 10,
    force_increase_pct: forceIncrease,
    feed_compensation_pct: feedComp,
    ra_degradation_pct: raDegradation,
    should_replace: shouldReplace,
    recommendation,
  };
}

// ─── Thermal Compensation ────────────────────────────────────────────────────

function compensateThermal(params: Record<string, unknown>): ThermalResult {
  const spindleTemp = (params.spindle_temp_c as number) ?? 22;
  const ambientTemp = (params.ambient_temp_c as number) ?? 20;
  const machineType = (params.machine_type as string) ?? "VMC";
  const spindleOrientation = (params.spindle_orientation as string) ?? "vertical";
  const runTime = (params.run_time_min as number) ?? 0;

  const deltaT = spindleTemp - ambientTemp;
  const coeff = defaultConfig.thermal_coefficient_um_per_c;

  // Thermal drift model: different axes affected differently
  // Z-axis (spindle growth) is the primary concern
  const zDrift = deltaT * coeff;

  // X/Y drift is typically smaller (structure vs spindle)
  const structureCoeff = coeff * 0.3;
  const xDrift = deltaT * structureCoeff * (machineType === "HMC" ? 1.2 : 0.8);
  const yDrift = deltaT * structureCoeff * (spindleOrientation === "horizontal" ? 1.2 : 0.6);

  // Apply compensation
  const shouldCompensate = defaultConfig.thermal_compensation_enabled && Math.abs(zDrift) > 2;
  const compensation = shouldCompensate
    ? { x: -Math.round(xDrift * 10) / 10, y: -Math.round(yDrift * 10) / 10, z: -Math.round(zDrift * 10) / 10 }
    : { x: 0, y: 0, z: 0 };

  // Update session
  if (activeSession) {
    activeSession.thermal_drift_um = Math.abs(zDrift);
  }

  const recommendation = shouldCompensate
    ? `Thermal drift detected: Z=${zDrift.toFixed(1)}um. Compensation applied: ` +
      `X=${compensation.x}um, Y=${compensation.y}um, Z=${compensation.z}um. ` +
      `Continue monitoring — spindle has been running ${runTime} min.`
    : Math.abs(zDrift) <= 2
    ? `Thermal drift ${zDrift.toFixed(1)}um is within 2um tolerance. No compensation needed.`
    : "Thermal compensation is disabled in config.";

  return {
    spindle_temp_c: spindleTemp,
    ambient_delta_c: Math.round(deltaT * 10) / 10,
    z_drift_um: Math.round(zDrift * 10) / 10,
    x_drift_um: Math.round(xDrift * 10) / 10,
    y_drift_um: Math.round(yDrift * 10) / 10,
    compensation_applied: shouldCompensate,
    compensation_values_um: compensation,
    recommendation,
  };
}

// ─── Override Command Generator ──────────────────────────────────────────────

function generateOverride(params: Record<string, unknown>): Record<string, unknown> {
  const channel = (params.channel as OverrideChannel) ?? "feed";
  const value = (params.value_pct as number) ?? 100;
  const reason = (params.reason as string) ?? "manual";
  const controller = (params.controller as ControllerType) ?? defaultConfig.controller;

  // Validate range
  if (value < 0 || value > 200) {
    return { error: `Override value ${value}% out of range (0-200)` };
  }

  // Generate controller-specific command
  let command: Record<string, unknown>;
  switch (controller) {
    case "fanuc_focas":
      command = {
        protocol: "FOCAS2",
        function: channel === "feed" ? "cnc_setfeedovrd" : "cnc_setspindleovrd",
        parameter: value,
        address: channel === "feed" ? "F_OVR" : "S_OVR",
      };
      break;
    case "siemens_opcua":
      command = {
        protocol: "OPC-UA",
        node_id: `ns=2;s=/Channel/MachineAxis/${channel === "feed" ? "feedRateOvr" : "spindleSpeedOvr"}`,
        value,
        data_type: "Int16",
      };
      break;
    case "haas_macro":
      command = {
        protocol: "Macro",
        variable: channel === "feed" ? "#4009" : "#4014",
        value,
        format: `#${channel === "feed" ? "4009" : "4014"} = ${value}`,
      };
      break;
    case "mazak_smooth":
      command = {
        protocol: "MT-LINKi",
        path: `/cnc/${channel === "feed" ? "feed_override" : "spindle_override"}`,
        value,
      };
      break;
    default:
      command = {
        protocol: "generic",
        channel,
        value,
      };
  }

  const override: OverrideCommand = {
    channel,
    value_pct: value,
    reason,
    confidence: 0.9,
    timestamp: new Date().toISOString(),
  };

  overrideLog.push(override);

  if (activeSession) {
    activeSession.overrides_issued++;
    activeSession.current_overrides[channel] = value;
  }

  return {
    override,
    controller_command: command,
    controller_type: controller,
    status: "issued",
  };
}

// ─── Session Management ──────────────────────────────────────────────────────

function getStatus(): Record<string, unknown> {
  if (!activeSession) {
    return {
      active: false,
      sessions: sessions.size,
      total_overrides: overrideLog.length,
      total_readings: sensorHistory.length,
      config: defaultConfig,
    };
  }

  return {
    active: true,
    session: {
      id: activeSession.session_id,
      controller: activeSession.controller,
      mode: activeSession.mode,
      started: activeSession.started,
      readings: activeSession.readings_count,
      overrides: activeSession.overrides_issued,
      current_overrides: activeSession.current_overrides,
      tool_wear_pct: activeSession.tool_wear_pct,
      chatter_events: activeSession.chatter_events,
      thermal_drift_um: activeSession.thermal_drift_um,
      alerts: activeSession.alerts.slice(-10),
    },
    total_sessions: sessions.size,
    config: defaultConfig,
  };
}

function updateConfig(params: Record<string, unknown>): Record<string, unknown> {
  const validKeys = Object.keys(defaultConfig);
  const updated: string[] = [];

  for (const [key, val] of Object.entries(params)) {
    if (validKeys.includes(key) && val !== undefined) {
      (defaultConfig as any)[key] = val;
      updated.push(key);
    }
  }

  if (updated.length === 0) {
    return { error: "No valid config keys provided", valid_keys: validKeys };
  }

  return {
    status: "config_updated",
    updated_keys: updated,
    config: defaultConfig,
  };
}

function startSession(params: Record<string, unknown>): AdaptiveState {
  const controller = (params.controller as ControllerType) ?? defaultConfig.controller;
  const mode = (params.mode as AdaptiveMode) ?? defaultConfig.mode;

  const session: AdaptiveState = {
    session_id: `ACS-${Date.now()}`,
    controller,
    mode,
    active: true,
    started: new Date().toISOString(),
    readings_count: 0,
    overrides_issued: 0,
    current_overrides: { feed: 100, spindle: 100, coolant_pressure: 100, coolant_flow: 100 },
    alerts: [],
    tool_wear_pct: 0,
    chatter_events: 0,
    thermal_drift_um: 0,
  };

  sessions.set(session.session_id, session);
  activeSession = session;
  return session;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function adaptiveControl(action: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  // Auto-start session if needed for control actions
  if (!activeSession && ["adaptive_chipload", "adaptive_chatter", "adaptive_wear", "adaptive_thermal", "adaptive_override"].includes(action)) {
    startSession(params);
  }

  switch (action) {
    case "adaptive_chipload": {
      const result = calculateChipload(params);
      const id = `CL-${Date.now()}`;
      const stored = { query_id: id, ...result } as unknown as Record<string, unknown>;
      resultStore.set(id, stored);
      return stored;
    }

    case "adaptive_chatter": {
      const result = detectChatter(params);
      const id = `CH-${Date.now()}`;
      const stored = { query_id: id, ...result } as unknown as Record<string, unknown>;
      resultStore.set(id, stored);
      return stored;
    }

    case "adaptive_wear": {
      const result = compensateWear(params);
      const id = `WR-${Date.now()}`;
      const stored = { query_id: id, ...result } as unknown as Record<string, unknown>;
      resultStore.set(id, stored);
      return stored;
    }

    case "adaptive_thermal": {
      const result = compensateThermal(params);
      const id = `TH-${Date.now()}`;
      const stored = { query_id: id, ...result } as unknown as Record<string, unknown>;
      resultStore.set(id, stored);
      return stored;
    }

    case "adaptive_override": {
      return generateOverride(params);
    }

    case "adaptive_status": {
      return getStatus();
    }

    case "adaptive_config": {
      if (Object.keys(params).length === 0) {
        return { config: defaultConfig };
      }
      return updateConfig(params);
    }

    case "adaptive_log": {
      const limit = (params.limit as number) ?? 20;
      return {
        overrides: overrideLog.slice(-limit),
        total: overrideLog.length,
      };
    }

    case "adaptive_history": {
      return {
        sessions: Array.from(sessions.values()).map(s => ({
          id: s.session_id,
          controller: s.controller,
          mode: s.mode,
          started: s.started,
          overrides: s.overrides_issued,
          chatter_events: s.chatter_events,
          tool_wear_pct: s.tool_wear_pct,
        })),
        total_sessions: sessions.size,
        total_overrides: overrideLog.length,
      };
    }

    case "adaptive_get": {
      const id = (params.id as string) ?? (params.query_id as string) ?? "";
      if (!id) return { error: "id or query_id parameter required" };
      const stored = resultStore.get(id);
      if (!stored) return { error: `Result ${id} not found` };
      return stored;
    }

    default:
      return { error: `Unknown action: ${action}`, valid_actions: [
        "adaptive_chipload", "adaptive_chatter", "adaptive_wear", "adaptive_thermal",
        "adaptive_override", "adaptive_status", "adaptive_config", "adaptive_log",
        "adaptive_history", "adaptive_get",
      ]};
  }
}

// ─── Type exports ────────────────────────────────────────────────────────────

export type {
  ControllerType,
  AdaptiveMode,
  OverrideChannel,
  AlertLevel,
  SensorReading,
  OverrideCommand,
  AdaptiveState,
  ChiploadResult,
  ChatterResult,
  WearResult,
  ThermalResult,
  AdaptiveConfig,
};
