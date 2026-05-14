export interface MachineStatus {
  id: string;
  name: string;
  connected: boolean;
  status: "idle" | "running" | "alarm" | "offline";
  current_program?: string;
  spindle_rpm?: number;
  feed_rate?: number;
  spindle_load_pct?: number;
  uptime_hours: number;
}

export interface AdaptiveOverride {
  type: "chipload" | "chatter" | "wear" | "thermal";
  original_value: number;
  adjusted_value: number;
  reason: string;
  timestamp: string;
}

export interface MaintenanceAlert {
  id: string;
  machine_id: string;
  component: string;
  severity: "low" | "medium" | "high" | "critical";
  predicted_failure_date?: string;
  recommendation: string;
  acknowledged: boolean;
}

export interface DigitalTwinState {
  machine_id: string;
  axes: Record<string, { position_mm: number; load_pct: number; temp_c: number }>;
  spindle: { rpm: number; load_pct: number; temp_c: number; vibration_g: number };
  coolant: { pressure_bar: number; flow_lpm: number; temp_c: number };
}

export interface ApiError { message: string; code?: string; }
