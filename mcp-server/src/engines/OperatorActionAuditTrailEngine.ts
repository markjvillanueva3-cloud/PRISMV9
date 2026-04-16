/**
 * OperatorActionAuditTrailEngine
 * ================================
 *
 * Time-ordered audit log of operator interventions for regulated shops.
 *
 * AS9100/FDA 21 CFR Part 11 / ISO 13485 all require a traceable record
 * of who did what and why when the machine was running. This engine is
 * the structured sink for *operator override* style events:
 *
 *   - e_stop               : red-mushroom / controller halt
 *   - feed_hold            : cycle pause (not alarm)
 *   - feed_rate_override   : operator dialled feed outside nominal
 *   - rapid_override       : operator dialled rapid outside nominal
 *   - spindle_override     : operator dialled spindle outside nominal
 *   - single_block         : operator toggled single-block mode
 *   - block_skip           : operator toggled /1 block delete
 *   - wear_offset_edit     : operator edited H/W table entry
 *   - program_edit         : operator modified NC program at console
 *   - door_bypass          : operator bypassed safety door (requires key)
 *   - alarm_ack            : operator acknowledged an alarm
 *   - cycle_start_resume   : operator resumed cycle after hold/alarm
 *
 * Distinct from existing:
 *   - ShopFloorCheckInEngine         : login/out only
 *   - ShiftHandoverEngine / ShiftHandoffEngine : narrative summary
 *   - QualityIncidentReportEngine    : part defects, not keypad action
 *   - This engine                    : atomic operator-action trace
 *
 * Reason codes (AS9100-aligned):
 *   R1 tool break    R2 part scrap     R3 coolant issue
 *   R4 chip clog     R5 feature concern R6 safety concern
 *   R7 dimension nudge R8 tool life    R9 programming error
 *   R10 environmental R11 setup correction R12 other
 *
 * References:
 *   - AS9100D §8.5.2 Identification and Traceability
 *   - FDA 21 CFR Part 11 §11.10(e) audit trails
 *   - ISO 13485 §4.2.5 Control of Records
 *
 * @module engines/OperatorActionAuditTrailEngine
 * @milestone LATHE-PRO-MS11
 */

export type OperatorActionType =
  | "e_stop"
  | "feed_hold"
  | "feed_rate_override"
  | "rapid_override"
  | "spindle_override"
  | "single_block"
  | "block_skip"
  | "wear_offset_edit"
  | "program_edit"
  | "door_bypass"
  | "alarm_ack"
  | "cycle_start_resume";

export type ReasonCode =
  | "R1_tool_break"
  | "R2_part_scrap"
  | "R3_coolant_issue"
  | "R4_chip_clog"
  | "R5_feature_concern"
  | "R6_safety_concern"
  | "R7_dimension_nudge"
  | "R8_tool_life"
  | "R9_programming_error"
  | "R10_environmental"
  | "R11_setup_correction"
  | "R12_other";

export interface OperatorActionEvent {
  event_id: string;
  timestamp: string;
  operator_id: string;
  machine_id: string;
  job_id?: string;
  program_number?: number;
  action: OperatorActionType;
  reason_code: ReasonCode;
  /** Free-text annotation (optional) */
  comment?: string;
  /** Numeric before/after snapshot (e.g. feed-rate 100 → 80 %) */
  before_value?: number;
  after_value?: number;
  /** Tool or offset index for edit events */
  target_reference?: string;
  /** Supervisor-level action requiring key/PIN (e.g. door bypass) */
  requires_authorization?: boolean;
  /** Supervisor ID if authorization was needed */
  authorized_by?: string;
}

export interface OperatorActionAuditInput {
  /** New events to append (can be empty to query existing) */
  new_events?: OperatorActionEvent[];
  /** Existing audit trail to append to */
  existing_trail?: OperatorActionEvent[];
  /** Filter by machine */
  filter_machine_id?: string;
  /** Filter by operator */
  filter_operator_id?: string;
  /** Filter window (ISO timestamps) */
  filter_from?: string;
  filter_to?: string;
  /** Maximum events to return (default 500) */
  limit?: number;
}

export interface OperatorActionAuditResult {
  appended_count: number;
  total_trail_length: number;
  filtered: OperatorActionEvent[];
  summary_by_action: Record<string, number>;
  summary_by_reason: Record<string, number>;
  flags: string[];
  reasoning: string[];
}

class OperatorActionAuditTrailEngineImpl {
  record(i: OperatorActionAuditInput): OperatorActionAuditResult {
    const reasoning: string[] = [];
    const flags: string[] = [];
    const existing = [...(i.existing_trail ?? [])];
    const newEvents = [...(i.new_events ?? [])];
    const limit = Math.max(1, i.limit ?? 500);

    // Validation of new events
    for (const ev of newEvents) {
      if (!ev.event_id || !ev.timestamp || !ev.operator_id || !ev.machine_id) {
        flags.push(`Invalid event missing required field: ${JSON.stringify(ev).slice(0, 80)}`);
      }
      if (ev.requires_authorization && !ev.authorized_by) {
        flags.push(`Event ${ev.event_id} (${ev.action}) requires authorization but authorized_by is empty`);
      }
      if (ev.action === "door_bypass" && !ev.requires_authorization) {
        flags.push(`Event ${ev.event_id} door_bypass should be flagged requires_authorization`);
      }
    }

    // Append
    const trail = existing.concat(newEvents);
    // Keep sorted by timestamp
    trail.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Filter
    let filtered = trail;
    if (i.filter_machine_id) filtered = filtered.filter((e) => e.machine_id === i.filter_machine_id);
    if (i.filter_operator_id) filtered = filtered.filter((e) => e.operator_id === i.filter_operator_id);
    if (i.filter_from) filtered = filtered.filter((e) => e.timestamp >= i.filter_from!);
    if (i.filter_to) filtered = filtered.filter((e) => e.timestamp <= i.filter_to!);

    // Limit (most recent N)
    if (filtered.length > limit) filtered = filtered.slice(filtered.length - limit);

    // Rollups
    const byAction: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    for (const e of filtered) {
      byAction[e.action] = (byAction[e.action] ?? 0) + 1;
      byReason[e.reason_code] = (byReason[e.reason_code] ?? 0) + 1;
    }

    // Safety/traceability flags
    const eStopCount = byAction["e_stop"] ?? 0;
    const doorBypassCount = byAction["door_bypass"] ?? 0;
    if (eStopCount >= 3) flags.push(`High e-stop frequency: ${eStopCount} events in range`);
    if (doorBypassCount > 0) flags.push(`${doorBypassCount} door bypass event(s) — review for recurrence`);

    reasoning.push(`Appended ${newEvents.length} event(s); trail length ${trail.length}`);
    reasoning.push(`Returning ${filtered.length} filtered event(s)`);
    if (flags.length > 0) reasoning.push(`${flags.length} audit flag(s) raised`);

    return {
      appended_count: newEvents.length,
      total_trail_length: trail.length,
      filtered,
      summary_by_action: byAction,
      summary_by_reason: byReason,
      flags,
      reasoning,
    };
  }

  getStats(): { actions: OperatorActionType[]; reasons: ReasonCode[]; reference: string } {
    return {
      actions: [
        "e_stop", "feed_hold", "feed_rate_override", "rapid_override",
        "spindle_override", "single_block", "block_skip", "wear_offset_edit",
        "program_edit", "door_bypass", "alarm_ack", "cycle_start_resume",
      ],
      reasons: [
        "R1_tool_break", "R2_part_scrap", "R3_coolant_issue", "R4_chip_clog",
        "R5_feature_concern", "R6_safety_concern", "R7_dimension_nudge",
        "R8_tool_life", "R9_programming_error", "R10_environmental",
        "R11_setup_correction", "R12_other",
      ],
      reference: "AS9100D §8.5.2; FDA 21 CFR Part 11 §11.10(e); ISO 13485 §4.2.5",
    };
  }
}

export const operatorActionAuditTrailEngine = new OperatorActionAuditTrailEngineImpl();
export type { OperatorActionAuditTrailEngineImpl };
