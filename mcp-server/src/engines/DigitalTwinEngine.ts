/**
 * DigitalTwinEngine — Manufacturing Intelligence Layer
 *
 * Creates and manages digital twin models of CNC machines, tracking
 * real-time state, predicting behavior, and enabling what-if simulation.
 * Composes MachineConnectivityEngine + sensor data + algorithms.
 *
 * Actions: twin_create, twin_update_state, twin_predict, twin_simulate
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MachineTwin {
  machine_id: string;
  machine_name: string;
  model: string;
  state: MachineState;
  health: MachineHealth;
  performance: MachinePerformance;
  created_at: string;
  last_updated: string;
}

export interface MachineState {
  power: "off" | "standby" | "idle" | "running" | "alarm";
  spindle_rpm: number;
  feed_rate_mmmin: number;
  position: { x: number; y: number; z: number };
  active_tool: number;
  coolant: "off" | "flood" | "mist" | "through_spindle";
  program_name: string | null;
  program_line: number;
  cycle_time_elapsed_sec: number;
  temperature_spindle_C: number;
  temperature_ambient_C: number;
}

export interface MachineHealth {
  overall_score: number;             // 0–100
  spindle_health: number;            // 0–100
  axis_health: Record<string, number>; // per axis
  coolant_level_pct: number;
  lubrication_level_pct: number;
  hours_since_maintenance: number;
  next_maintenance_hours: number;
  alerts: HealthAlert[];
}

export interface HealthAlert {
  component: string;
  severity: "info" | "warning" | "critical";
  message: string;
  recommended_action: string;
}

export interface MachinePerformance {
  oee_pct: number;                   // Overall Equipment Effectiveness
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  parts_produced_today: number;
  scrap_count_today: number;
  uptime_hours_today: number;
  downtime_hours_today: number;
  utilization_7day_pct: number;
}

export interface TwinPrediction {
  component: string;
  predicted_event: string;
  probability: number;
  estimated_time_to_event_hours: number;
  confidence: number;
  recommended_action: string;
}

export interface SimulationResult {
  scenario: string;
  original_value: number;
  simulated_value: number;
  change_pct: number;
  impacts: { metric: string; change: string }[];
  recommendation: string;
}

// ============================================================================
// DEGRADATION MODELS
// ============================================================================

/** Spindle bearing degradation: exponential wear model */
function predictSpindleHealth(hoursRun: number, maxRpm: number, avgLoad: number): number {
  const baseLife = 20000; // hours nominal bearing life
  const speedFactor = maxRpm / 15000; // higher speed = faster wear
  const loadFactor = Math.max(0.5, avgLoad / 50); // higher load = faster wear
  const effectiveHours = hoursRun * speedFactor * loadFactor;
  const health = 100 * Math.exp(-effectiveHours / baseLife);
  return Math.max(0, Math.min(100, Math.round(health)));
}

/** Axis ballscrew wear: linear degradation with acceleration near end of life */
function predictAxisHealth(hoursRun: number, travelMm: number): number {
  const baseLife = 30000; // hours for ballscrew
  const travelFactor = travelMm / 500; // longer travel = more wear per hour
  const effectiveHours = hoursRun * travelFactor;
  const linearDecay = 100 - (effectiveHours / baseLife) * 100;
  // Accelerate degradation below 30%
  if (linearDecay < 30) return Math.max(0, linearDecay * 0.7);
  return Math.max(0, Math.min(100, Math.round(linearDecay)));
}

/** OEE = Availability × Performance × Quality */
function calculateOEE(
  uptimeHrs: number, totalHrs: number,
  actualOutput: number, theoreticalOutput: number,
  goodParts: number, totalParts: number
): { oee: number; availability: number; performance: number; quality: number } {
  const availability = totalHrs > 0 ? (uptimeHrs / totalHrs) * 100 : 0;
  const performance = theoreticalOutput > 0 ? (actualOutput / theoreticalOutput) * 100 : 0;
  const quality = totalParts > 0 ? (goodParts / totalParts) * 100 : 0;
  const oee = (availability * performance * quality) / 10000;
  return {
    oee: Math.round(oee * 10) / 10,
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class DigitalTwinEngine {
  private twins = new Map<string, MachineTwin>();

  create(machineId: string, machineName: string, model: string): MachineTwin {
    const now = new Date().toISOString();
    const twin: MachineTwin = {
      machine_id: machineId, machine_name: machineName, model,
      state: {
        power: "standby", spindle_rpm: 0, feed_rate_mmmin: 0,
        position: { x: 0, y: 0, z: 0 }, active_tool: 0,
        coolant: "off", program_name: null, program_line: 0,
        cycle_time_elapsed_sec: 0, temperature_spindle_C: 22,
        temperature_ambient_C: 22,
      },
      health: {
        overall_score: 95, spindle_health: 95,
        axis_health: { X: 97, Y: 96, Z: 94 },
        coolant_level_pct: 90, lubrication_level_pct: 85,
        hours_since_maintenance: 200, next_maintenance_hours: 800,
        alerts: [],
      },
      performance: {
        oee_pct: 72, availability_pct: 88, performance_pct: 85, quality_pct: 96,
        parts_produced_today: 0, scrap_count_today: 0,
        uptime_hours_today: 0, downtime_hours_today: 0,
        utilization_7day_pct: 68,
      },
      created_at: now, last_updated: now,
    };

    this.twins.set(machineId, twin);
    return twin;
  }

  updateState(machineId: string, stateUpdate: Partial<MachineState>): MachineTwin | null {
    const twin = this.twins.get(machineId);
    if (!twin) return null;

    Object.assign(twin.state, stateUpdate);
    twin.last_updated = new Date().toISOString();

    // Update health based on state
    if (stateUpdate.temperature_spindle_C && stateUpdate.temperature_spindle_C > 60) {
      twin.health.alerts = twin.health.alerts.filter(a => a.component !== "spindle_temp");
      twin.health.alerts.push({
        component: "spindle_temp", severity: "warning",
        message: `Spindle temperature ${stateUpdate.temperature_spindle_C}°C — elevated`,
        recommended_action: "Check spindle cooling system and reduce RPM",
      });
    }

    return twin;
  }

  predict(machineId: string): TwinPrediction[] {
    const twin = this.twins.get(machineId);
    if (!twin) return [];

    const predictions: TwinPrediction[] = [];
    const hours = twin.health.hours_since_maintenance;

    // Spindle bearing prediction
    if (twin.health.spindle_health < 60) {
      const ttf = ((twin.health.spindle_health / 100) * 5000); // rough estimate
      predictions.push({
        component: "spindle_bearing", predicted_event: "bearing_replacement_needed",
        probability: twin.health.spindle_health < 30 ? 0.9 : 0.6,
        estimated_time_to_event_hours: Math.round(ttf),
        confidence: 75,
        recommended_action: "Schedule spindle service within next maintenance window",
      });
    }

    // Maintenance prediction
    const hoursToMaint = twin.health.next_maintenance_hours - hours;
    if (hoursToMaint < 200) {
      predictions.push({
        component: "general_maintenance", predicted_event: "scheduled_maintenance_due",
        probability: 0.95, estimated_time_to_event_hours: Math.max(0, hoursToMaint),
        confidence: 90,
        recommended_action: `Schedule maintenance — ${hoursToMaint} hours remaining`,
      });
    }

    // Coolant depletion
    if (twin.health.coolant_level_pct < 40) {
      const hoursToEmpty = (twin.health.coolant_level_pct / 100) * 160;
      predictions.push({
        component: "coolant_system", predicted_event: "coolant_level_low",
        probability: 0.8, estimated_time_to_event_hours: Math.round(hoursToEmpty),
        confidence: 85,
        recommended_action: "Refill coolant tank and check concentration",
      });
    }

    // Axis degradation
    for (const [axis, health] of Object.entries(twin.health.axis_health)) {
      if (health < 70) {
        predictions.push({
          component: `${axis}_axis`, predicted_event: "ballscrew_wear_critical",
          probability: health < 50 ? 0.85 : 0.5,
          estimated_time_to_event_hours: Math.round(health * 50),
          confidence: 70,
          recommended_action: `Schedule ${axis}-axis ballscrew inspection`,
        });
      }
    }

    return predictions;
  }

  simulate(machineId: string, scenario: string, parameterChange: number): SimulationResult {
    const twin = this.twins.get(machineId);
    if (!twin) {
      return {
        scenario, original_value: 0, simulated_value: 0, change_pct: 0,
        impacts: [], recommendation: "Machine twin not found",
      };
    }

    let originalVal: number;
    let simulatedVal: number;
    const impacts: { metric: string; change: string }[] = [];

    switch (scenario) {
      case "increase_spindle_speed": {
        originalVal = twin.state.spindle_rpm;
        simulatedVal = originalVal * (1 + parameterChange / 100);
        const tempIncrease = parameterChange * 0.3;
        impacts.push({ metric: "spindle_temperature", change: `+${tempIncrease.toFixed(1)}°C` });
        impacts.push({ metric: "tool_life", change: `-${(parameterChange * 1.5).toFixed(0)}%` });
        impacts.push({ metric: "surface_finish", change: `${parameterChange > 20 ? "worse" : "improved"}` });
        break;
      }
      case "increase_feed_rate": {
        originalVal = twin.state.feed_rate_mmmin;
        simulatedVal = originalVal * (1 + parameterChange / 100);
        impacts.push({ metric: "cycle_time", change: `-${(parameterChange * 0.8).toFixed(0)}%` });
        impacts.push({ metric: "surface_roughness", change: `+${(parameterChange * 1.2).toFixed(0)}%` });
        impacts.push({ metric: "cutting_force", change: `+${parameterChange.toFixed(0)}%` });
        break;
      }
      case "reduce_maintenance_interval": {
        originalVal = twin.health.next_maintenance_hours;
        simulatedVal = originalVal * (1 - parameterChange / 100);
        impacts.push({ metric: "reliability", change: `+${(parameterChange * 0.5).toFixed(0)}%` });
        impacts.push({ metric: "maintenance_cost", change: `+${(parameterChange * 0.8).toFixed(0)}%` });
        impacts.push({ metric: "unplanned_downtime", change: `-${(parameterChange * 1.5).toFixed(0)}%` });
        break;
      }
      default: {
        originalVal = twin.performance.oee_pct;
        simulatedVal = originalVal * (1 + parameterChange / 100);
        impacts.push({ metric: "throughput", change: `+${parameterChange.toFixed(0)}%` });
      }
    }

    const changePct = originalVal > 0 ? ((simulatedVal - originalVal) / originalVal) * 100 : 0;

    return {
      scenario, original_value: Math.round(originalVal * 100) / 100,
      simulated_value: Math.round(simulatedVal * 100) / 100,
      change_pct: Math.round(changePct * 10) / 10, impacts,
      recommendation: changePct > 30 ? "Significant change — validate with physical test first" : "Moderate change — safe to implement incrementally",
    };
  }

  getTwin(machineId: string): MachineTwin | undefined {
    return this.twins.get(machineId);
  }

  listTwins(): MachineTwin[] {
    return Array.from(this.twins.values());
  }
}

export const digitalTwinEngine = new DigitalTwinEngine();
