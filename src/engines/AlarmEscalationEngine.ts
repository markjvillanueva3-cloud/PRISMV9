/**
 * AlarmEscalationEngine — RT-MS2 Real-Time Notifications
 *
 * Alarm escalation pipeline: warn → critical → page
 * Integrates with NotificationEngine and WebSocketEngine.
 *
 * Actions: alarm_escalate, alarm_acknowledge, alarm_history, alarm_rules
 */

// ── Types ──────────────────────────────────────────────────────────

export type AlarmSeverity = "info" | "warn" | "critical" | "emergency";
export type AlarmState = "active" | "acknowledged" | "resolved" | "escalated";

export interface AlarmRule {
  id: string;
  name: string;
  condition: string;       // e.g., "spindle_load > 90"
  severity: AlarmSeverity;
  escalation_delay_sec: number;  // Time before escalation
  escalate_to: AlarmSeverity;
  notify_channels: string[];     // e.g., ["ws", "email", "sms"]
  auto_resolve: boolean;
}

export interface Alarm {
  id: string;
  rule_id: string;
  severity: AlarmSeverity;
  state: AlarmState;
  source: string;          // e.g., "machine:haas-vf2"
  message: string;
  details: Record<string, unknown>;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  escalated_at?: string;
  escalation_count: number;
}

export interface EscalationResult {
  alarm_id: string;
  previous_severity: AlarmSeverity;
  new_severity: AlarmSeverity;
  channels_notified: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

let alarmCounter = 0;

export class AlarmEscalationEngine {
  private rules = new Map<string, AlarmRule>();
  private alarms = new Map<string, Alarm>();
  private escalationTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this._registerDefaultRules();
  }

  /**
   * Register an alarm rule.
   */
  addRule(rule: AlarmRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Trigger an alarm.
   */
  trigger(ruleId: string, source: string, message: string,
    details: Record<string, unknown> = {}): Alarm {
    const rule = this.rules.get(ruleId);
    const severity = rule?.severity ?? "warn";

    alarmCounter++;
    const id = `ALM-${String(alarmCounter).padStart(6, "0")}`;

    const alarm: Alarm = {
      id,
      rule_id: ruleId,
      severity,
      state: "active",
      source,
      message,
      details,
      created_at: new Date().toISOString(),
      escalation_count: 0,
    };

    this.alarms.set(id, alarm);

    // Set escalation timer
    if (rule && rule.escalation_delay_sec > 0) {
      const timer = setTimeout(
        () => this._escalate(id),
        rule.escalation_delay_sec * 1000
      );
      this.escalationTimers.set(id, timer);
    }

    return alarm;
  }

  /**
   * Acknowledge an alarm (stops escalation).
   */
  acknowledge(alarmId: string, userId: string): Alarm | null {
    const alarm = this.alarms.get(alarmId);
    if (!alarm || alarm.state !== "active") return null;

    alarm.state = "acknowledged";
    alarm.acknowledged_at = new Date().toISOString();
    alarm.acknowledged_by = userId;

    // Cancel escalation
    const timer = this.escalationTimers.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alarmId);
    }

    return alarm;
  }

  /**
   * Resolve an alarm.
   */
  resolve(alarmId: string): Alarm | null {
    const alarm = this.alarms.get(alarmId);
    if (!alarm) return null;

    alarm.state = "resolved";
    alarm.resolved_at = new Date().toISOString();

    const timer = this.escalationTimers.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alarmId);
    }

    return alarm;
  }

  /**
   * Get active alarms, optionally filtered.
   */
  getActive(filter?: {
    severity?: AlarmSeverity;
    source?: string;
  }): Alarm[] {
    let alarms = [...this.alarms.values()]
      .filter(a => a.state === "active" || a.state === "escalated");

    if (filter?.severity) alarms = alarms.filter(a => a.severity === filter.severity);
    if (filter?.source) alarms = alarms.filter(a => a.source.includes(filter.source!));

    return alarms.sort((a, b) => {
      const sev = { emergency: 0, critical: 1, warn: 2, info: 3 };
      return (sev[a.severity] ?? 4) - (sev[b.severity] ?? 4);
    });
  }

  /**
   * Get alarm history (all states).
   */
  history(limit = 50): Alarm[] {
    return [...this.alarms.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  /**
   * Get all rules.
   */
  getRules(): AlarmRule[] {
    return [...this.rules.values()];
  }

  /**
   * Get statistics.
   */
  stats(): {
    total_alarms: number;
    active: number;
    acknowledged: number;
    resolved: number;
    rules: number;
    by_severity: Record<AlarmSeverity, number>;
  } {
    const all = [...this.alarms.values()];
    const bySev: Record<AlarmSeverity, number> = { info: 0, warn: 0, critical: 0, emergency: 0 };
    for (const a of all.filter(a => a.state === "active" || a.state === "escalated")) {
      bySev[a.severity]++;
    }

    return {
      total_alarms: all.length,
      active: all.filter(a => a.state === "active" || a.state === "escalated").length,
      acknowledged: all.filter(a => a.state === "acknowledged").length,
      resolved: all.filter(a => a.state === "resolved").length,
      rules: this.rules.size,
      by_severity: bySev,
    };
  }

  // ── Private ──────────────────────────────────────────────────────

  private _escalate(alarmId: string): void {
    const alarm = this.alarms.get(alarmId);
    if (!alarm || alarm.state !== "active") return;

    const rule = this.rules.get(alarm.rule_id);
    if (!rule) return;

    alarm.severity = rule.escalate_to;
    alarm.state = "escalated";
    alarm.escalated_at = new Date().toISOString();
    alarm.escalation_count++;

    this.escalationTimers.delete(alarmId);
  }

  private _registerDefaultRules(): void {
    const defaults: AlarmRule[] = [
      {
        id: "SPINDLE_OVERLOAD", name: "Spindle Overload",
        condition: "spindle_load > 95", severity: "critical",
        escalation_delay_sec: 30, escalate_to: "emergency",
        notify_channels: ["ws", "email"], auto_resolve: false,
      },
      {
        id: "TOOL_LIFE_LOW", name: "Tool Life Low",
        condition: "tool_life_pct < 10", severity: "warn",
        escalation_delay_sec: 300, escalate_to: "critical",
        notify_channels: ["ws"], auto_resolve: true,
      },
      {
        id: "COOLANT_LOW", name: "Coolant Level Low",
        condition: "coolant_level < 20", severity: "warn",
        escalation_delay_sec: 600, escalate_to: "critical",
        notify_channels: ["ws"], auto_resolve: true,
      },
      {
        id: "MACHINE_CRASH", name: "Machine Crash Detected",
        condition: "crash_detected == true", severity: "emergency",
        escalation_delay_sec: 0, escalate_to: "emergency",
        notify_channels: ["ws", "email", "sms"], auto_resolve: false,
      },
      {
        id: "SAFETY_SCORE_LOW", name: "Safety Score Below Threshold",
        condition: "safety_score < 0.5", severity: "critical",
        escalation_delay_sec: 60, escalate_to: "emergency",
        notify_channels: ["ws", "email"], auto_resolve: true,
      },
    ];

    for (const rule of defaults) this.rules.set(rule.id, rule);
  }
}

export const alarmEscalationEngine = new AlarmEscalationEngine();
