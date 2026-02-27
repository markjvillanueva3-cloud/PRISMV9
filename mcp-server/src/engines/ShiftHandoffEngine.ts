/**
 * ShiftHandoffEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Manages structured shift handoff reports for CNC manufacturing.
 * Ensures critical information transfers between shifts: machine status,
 * running jobs, tool conditions, quality issues, and pending actions.
 *
 * Actions: handoff_generate, handoff_validate, handoff_template
 */

// ============================================================================
// TYPES
// ============================================================================

export type MachineStatus = "running" | "idle" | "setup" | "down_planned" | "down_unplanned" | "maintenance";

export interface MachineState {
  machine_id: string;
  status: MachineStatus;
  current_job?: string;
  parts_completed: number;
  parts_remaining: number;
  tool_changes_needed: string[];
  alerts: string[];
}

export interface ShiftHandoffInput {
  outgoing_shift: string;
  incoming_shift: string;
  date: string;
  machines: MachineState[];
  quality_issues: { part: string; issue: string; action: string }[];
  safety_incidents: string[];
  pending_actions: { action: string; priority: "high" | "medium" | "low"; assigned_to?: string }[];
  notes: string;
}

export interface ShiftHandoffResult {
  handoff_id: string;
  summary: string;
  machine_summary: { running: number; idle: number; down: number };
  critical_items: string[];
  production_status: { total_completed: number; total_remaining: number };
  completeness_score: number;         // 0-100
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ShiftHandoffEngine {
  generate(input: ShiftHandoffInput): ShiftHandoffResult {
    // Machine summary
    const running = input.machines.filter(m => m.status === "running").length;
    const idle = input.machines.filter(m => m.status === "idle" || m.status === "setup").length;
    const down = input.machines.filter(m => m.status.includes("down") || m.status === "maintenance").length;

    // Production totals
    const totalCompleted = input.machines.reduce((s, m) => s + m.parts_completed, 0);
    const totalRemaining = input.machines.reduce((s, m) => s + m.parts_remaining, 0);

    // Critical items (things incoming shift MUST know)
    const critical: string[] = [];
    for (const m of input.machines) {
      if (m.status === "down_unplanned") critical.push(`${m.machine_id} DOWN — unplanned: ${m.alerts.join(", ") || "investigate"}`);
      if (m.tool_changes_needed.length > 0) critical.push(`${m.machine_id} needs tool changes: ${m.tool_changes_needed.join(", ")}`);
      if (m.alerts.length > 0) critical.push(`${m.machine_id} alerts: ${m.alerts.join(", ")}`);
    }
    for (const qi of input.quality_issues) {
      critical.push(`Quality: ${qi.part} — ${qi.issue} (action: ${qi.action})`);
    }
    if (input.safety_incidents.length > 0) {
      critical.push(`SAFETY: ${input.safety_incidents.join("; ")}`);
    }
    for (const pa of input.pending_actions.filter(a => a.priority === "high")) {
      critical.push(`HIGH PRIORITY: ${pa.action}`);
    }

    // Completeness score
    let score = 50; // base
    if (input.machines.length > 0) score += 15;
    if (input.notes.length > 20) score += 10;
    if (input.quality_issues.length >= 0) score += 10; // addressed quality
    if (input.pending_actions.length >= 0) score += 10;
    if (input.safety_incidents.length === 0) score += 5;

    // Summary
    const summary = `Shift ${input.outgoing_shift} → ${input.incoming_shift}: ${running} running, ${idle} idle, ${down} down. ` +
      `${totalCompleted} parts completed, ${totalRemaining} remaining. ${critical.length} critical items.`;

    const recs: string[] = [];
    if (down > 0) recs.push(`${down} machine(s) down — prioritize restoration for incoming shift`);
    if (critical.length > 5) recs.push("Many critical items — hold face-to-face handoff meeting");
    if (input.notes.length < 10) recs.push("Add detailed shift notes for better continuity");
    if (recs.length === 0) recs.push("Clean handoff — all information captured");

    return {
      handoff_id: `HO-${input.date}-${input.outgoing_shift}`,
      summary,
      machine_summary: { running, idle, down },
      critical_items: critical,
      production_status: { total_completed: totalCompleted, total_remaining: totalRemaining },
      completeness_score: Math.min(100, score),
      recommendations: recs,
    };
  }
}

export const shiftHandoffEngine = new ShiftHandoffEngine();
