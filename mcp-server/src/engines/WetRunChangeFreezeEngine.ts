/**
 * WetRunChangeFreezeEngine
 * ------------------------------------------------------------
 * Manages change-freeze windows that block new wet-run
 * authorizations, new program releases, and new deviations.
 *
 * Windows are strictly non-overlapping per kind-policy:
 *   • quarter_end, audit, customer_visit, regulatory, holiday
 *     — cannot overlap any other non-emergency window.
 *   • emergency — can be declared even if another window is
 *     active (represents an unscheduled incident lockdown);
 *     it stacks on top until closed.
 *
 * Every window requires four-eyes authorization: declared_by
 * and approved_by must differ. A minimum reason length of 40
 * characters forces a real rationale, not a rubber stamp.
 *
 * Break-glass override
 *   Some pilot-critical changes may legitimately need to land
 *   inside a freeze window. An override is scoped (change_kind
 *   explicit list), bounded (expires_at required within the
 *   window), four-eyes (granted_by ≠ granted_to), and traceable
 *   (audit reason ≥ 60 chars). sweepExpiredOverrides() demotes
 *   expired overrides so a stale override cannot continue to
 *   permit changes after its window closes.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-CHANGE-FREEZE
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_REASON_CHARS = 40;
const MIN_OVERRIDE_REASON_CHARS = 60;
const MIN_NAME_CHARS = 2;

// ============================================================================
// Types
// ============================================================================

export type FreezeKind =
  | "quarter_end"
  | "audit"
  | "customer_visit"
  | "regulatory"
  | "holiday"
  | "emergency";

export type ChangeKind =
  | "wet_run_authorization"
  | "program_release"
  | "deviation"
  | "post_processor_change"
  | "tool_library_update";

export type WindowState = "scheduled" | "active" | "closed" | "cancelled";

export interface FreezeWindow {
  id: string;
  name: string;
  kind: FreezeKind;
  start_ts: number;
  end_ts: number;
  state: WindowState;
  declared_by: string;
  approved_by: string;
  reason: string;
  declared_at: number;
  closed_at?: number;
  closure_reason?: string;
}

export interface WindowInput {
  id: string;
  name: string;
  kind: FreezeKind;
  start_ts: number;
  end_ts: number;
  declared_by: string;
  approved_by: string;
  reason: string;
  declared_at: number;
}

export interface OverrideGrant {
  override_id: string;
  window_id: string;
  change_kinds: ChangeKind[];
  granted_by: string;
  granted_to: string;
  expires_at: number;
  reason: string;
  granted_at: number;
  revoked?: boolean;
  revoked_at?: number;
  revocation_reason?: string;
}

export interface CheckResult {
  allowed: boolean;
  reason: string;
  active_window_id?: string;
  override_id?: string;
}

export interface Snapshot {
  schemaVersion: 1;
  windows: FreezeWindow[];
  overrides: OverrideGrant[];
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunChangeFreezeEngine {
  private windows: FreezeWindow[] = [];
  private overrides: OverrideGrant[] = [];
  private overrideCounter = 0;

  // --------------------------------------------------------------------
  // declareWindow
  // --------------------------------------------------------------------
  declareWindow(input: WindowInput): FreezeWindow {
    this.validateString(input.id, "id");
    this.validateString(input.name, "name");
    this.validateString(input.declared_by, "declared_by", MIN_NAME_CHARS);
    this.validateString(input.approved_by, "approved_by", MIN_NAME_CHARS);
    if (input.declared_by === input.approved_by) {
      throw new Error(`declared_by must differ from approved_by (four-eyes)`);
    }
    this.validateKind(input.kind);
    this.validateTs(input.start_ts, "start_ts");
    this.validateTs(input.end_ts, "end_ts");
    this.validateTs(input.declared_at, "declared_at");
    if (input.end_ts <= input.start_ts) {
      throw new Error(`end_ts must be strictly greater than start_ts`);
    }
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }
    if (this.windows.some((w) => w.id === input.id)) {
      throw new Error(`duplicate window id: ${input.id}`);
    }

    // Non-emergency cannot overlap any non-cancelled/closed window of any kind
    if (input.kind !== "emergency") {
      for (const w of this.windows) {
        if (w.state === "closed" || w.state === "cancelled") continue;
        const overlaps =
          input.start_ts < w.end_ts && input.end_ts > w.start_ts;
        if (overlaps) {
          throw new Error(
            `window ${input.id} (${input.kind}) overlaps existing ${w.kind} window ${w.id}`,
          );
        }
      }
    }

    const window: FreezeWindow = {
      id: input.id,
      name: input.name,
      kind: input.kind,
      start_ts: input.start_ts,
      end_ts: input.end_ts,
      state:
        input.declared_at >= input.start_ts && input.declared_at < input.end_ts
          ? "active"
          : "scheduled",
      declared_by: input.declared_by,
      approved_by: input.approved_by,
      reason: input.reason.trim(),
      declared_at: input.declared_at,
    };
    this.windows.push(window);
    return { ...window };
  }

  // --------------------------------------------------------------------
  // closeWindow (early closure — e.g. audit finished ahead of schedule)
  // --------------------------------------------------------------------
  closeWindow(input: {
    window_id: string;
    closed_at: number;
    closed_by: string;
    reason: string;
  }): FreezeWindow {
    const w = this.mustGetWindow(input.window_id);
    if (w.state === "closed") throw new Error(`window already closed: ${w.id}`);
    if (w.state === "cancelled") {
      throw new Error(`cannot close a cancelled window: ${w.id}`);
    }
    this.validateTs(input.closed_at, "closed_at");
    if (input.closed_at < w.start_ts) {
      throw new Error(
        `closed_at ${input.closed_at} cannot precede start_ts ${w.start_ts}`,
      );
    }
    this.validateString(input.closed_by, "closed_by", MIN_NAME_CHARS);
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `closure reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }
    w.state = "closed";
    w.closed_at = input.closed_at;
    w.closure_reason = input.reason.trim();
    w.end_ts = Math.min(w.end_ts, input.closed_at);
    return { ...w };
  }

  // --------------------------------------------------------------------
  // cancelWindow — before it starts
  // --------------------------------------------------------------------
  cancelWindow(input: {
    window_id: string;
    cancelled_at: number;
    cancelled_by: string;
    approver: string;
    reason: string;
  }): FreezeWindow {
    const w = this.mustGetWindow(input.window_id);
    if (w.state !== "scheduled") {
      throw new Error(
        `only scheduled windows can be cancelled; ${w.id} is ${w.state}`,
      );
    }
    if (input.cancelled_by === input.approver) {
      throw new Error(`four-eyes: cancelled_by must differ from approver`);
    }
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `cancellation reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }
    this.validateTs(input.cancelled_at, "cancelled_at");
    w.state = "cancelled";
    w.closed_at = input.cancelled_at;
    w.closure_reason = input.reason.trim();
    return { ...w };
  }

  // --------------------------------------------------------------------
  // grantOverride
  // --------------------------------------------------------------------
  grantOverride(input: {
    window_id: string;
    change_kinds: ChangeKind[];
    granted_by: string;
    granted_to: string;
    expires_at: number;
    reason: string;
    granted_at: number;
  }): OverrideGrant {
    const w = this.mustGetWindow(input.window_id);
    if (w.state === "closed" || w.state === "cancelled") {
      throw new Error(
        `cannot grant override on ${w.state} window ${w.id}`,
      );
    }
    if (!Array.isArray(input.change_kinds) || input.change_kinds.length === 0) {
      throw new Error(`change_kinds must be a non-empty array`);
    }
    const dedup = new Set<ChangeKind>();
    for (const c of input.change_kinds) {
      this.validateChangeKind(c);
      if (dedup.has(c)) throw new Error(`duplicate change_kind: ${c}`);
      dedup.add(c);
    }
    this.validateString(input.granted_by, "granted_by", MIN_NAME_CHARS);
    this.validateString(input.granted_to, "granted_to", MIN_NAME_CHARS);
    if (input.granted_by === input.granted_to) {
      throw new Error(`four-eyes: granted_by must differ from granted_to`);
    }
    this.validateTs(input.expires_at, "expires_at");
    this.validateTs(input.granted_at, "granted_at");
    if (input.expires_at <= input.granted_at) {
      throw new Error(`expires_at must be strictly greater than granted_at`);
    }
    if (input.expires_at > w.end_ts) {
      throw new Error(
        `override expires_at ${input.expires_at} extends past window end ${w.end_ts}`,
      );
    }
    if (input.reason.trim().length < MIN_OVERRIDE_REASON_CHARS) {
      throw new Error(
        `override reason must be at least ${MIN_OVERRIDE_REASON_CHARS} characters`,
      );
    }

    this.overrideCounter += 1;
    const id = `ovr:${this.overrideCounter.toString().padStart(6, "0")}`;
    const ovr: OverrideGrant = {
      override_id: id,
      window_id: w.id,
      change_kinds: [...dedup],
      granted_by: input.granted_by,
      granted_to: input.granted_to,
      expires_at: input.expires_at,
      reason: input.reason.trim(),
      granted_at: input.granted_at,
    };
    this.overrides.push(ovr);
    return { ...ovr, change_kinds: [...ovr.change_kinds] };
  }

  // --------------------------------------------------------------------
  // revokeOverride
  // --------------------------------------------------------------------
  revokeOverride(input: {
    override_id: string;
    revoked_at: number;
    revoked_by: string;
    reason: string;
  }): OverrideGrant {
    const ovr = this.overrides.find((o) => o.override_id === input.override_id);
    if (!ovr) throw new Error(`override not found: ${input.override_id}`);
    if (ovr.revoked) {
      throw new Error(`override already revoked: ${input.override_id}`);
    }
    this.validateString(input.revoked_by, "revoked_by", MIN_NAME_CHARS);
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(`revocation reason must be at least ${MIN_REASON_CHARS} characters`);
    }
    ovr.revoked = true;
    ovr.revoked_at = input.revoked_at;
    ovr.revocation_reason = input.reason.trim();
    return { ...ovr, change_kinds: [...ovr.change_kinds] };
  }

  // --------------------------------------------------------------------
  // sweepExpiredOverrides — returns the ones now expired
  // --------------------------------------------------------------------
  sweepExpiredOverrides(nowTs: number): OverrideGrant[] {
    this.validateTs(nowTs, "nowTs");
    const expired: OverrideGrant[] = [];
    for (const o of this.overrides) {
      if (o.revoked) continue;
      if (nowTs >= o.expires_at) {
        o.revoked = true;
        o.revoked_at = nowTs;
        o.revocation_reason = "auto-expired";
        expired.push({ ...o, change_kinds: [...o.change_kinds] });
      }
    }
    return expired;
  }

  // --------------------------------------------------------------------
  // checkAt — is `change_kind` allowed at nowTs?
  // --------------------------------------------------------------------
  checkAt(nowTs: number, change_kind: ChangeKind): CheckResult {
    this.validateTs(nowTs, "nowTs");
    this.validateChangeKind(change_kind);

    const active = this.activeWindows(nowTs);
    if (active.length === 0) {
      return { allowed: true, reason: "no active freeze window" };
    }

    // If multiple active (e.g. emergency atop a quarter_end), the most
    // restrictive wins and any applicable override must cover ALL of them.
    for (const w of active) {
      const covering = this.overrides.find(
        (o) =>
          !o.revoked &&
          o.window_id === w.id &&
          nowTs < o.expires_at &&
          o.change_kinds.includes(change_kind),
      );
      if (!covering) {
        return {
          allowed: false,
          reason: `freeze window "${w.name}" (${w.kind}) blocks ${change_kind}`,
          active_window_id: w.id,
        };
      }
    }
    // Overrides exist for every active window
    const primary = active[0]!;
    const covering = this.overrides.find(
      (o) =>
        !o.revoked &&
        o.window_id === primary.id &&
        nowTs < o.expires_at &&
        o.change_kinds.includes(change_kind),
    )!;
    return {
      allowed: true,
      reason: `allowed via override ${covering.override_id}`,
      active_window_id: primary.id,
      override_id: covering.override_id,
    };
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  listActive(nowTs: number): FreezeWindow[] {
    return this.activeWindows(nowTs).map((w) => ({ ...w }));
  }

  getWindow(id: string): FreezeWindow | undefined {
    const w = this.windows.find((x) => x.id === id);
    return w ? { ...w } : undefined;
  }

  getOverride(id: string): OverrideGrant | undefined {
    const o = this.overrides.find((x) => x.override_id === id);
    return o ? { ...o, change_kinds: [...o.change_kinds] } : undefined;
  }

  listWindows(): FreezeWindow[] {
    return this.windows.map((w) => ({ ...w }));
  }

  listOverrides(): OverrideGrant[] {
    return this.overrides.map((o) => ({
      ...o,
      change_kinds: [...o.change_kinds],
    }));
  }

  snapshot(): Snapshot {
    return {
      schemaVersion: 1,
      windows: this.listWindows(),
      overrides: this.listOverrides(),
    };
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private activeWindows(nowTs: number): FreezeWindow[] {
    return this.windows.filter(
      (w) =>
        w.state !== "cancelled" &&
        w.state !== "closed" &&
        nowTs >= w.start_ts &&
        nowTs < w.end_ts,
    );
  }

  private validateString(v: string, label: string, minChars = 1): void {
    if (typeof v !== "string" || v.trim().length < minChars) {
      throw new Error(
        `${label} must be a string of at least ${minChars} characters`,
      );
    }
  }

  private validateKind(k: FreezeKind): void {
    const allowed: FreezeKind[] = [
      "quarter_end",
      "audit",
      "customer_visit",
      "regulatory",
      "holiday",
      "emergency",
    ];
    if (!allowed.includes(k)) throw new Error(`invalid freeze kind: ${k}`);
  }

  private validateChangeKind(k: ChangeKind): void {
    const allowed: ChangeKind[] = [
      "wet_run_authorization",
      "program_release",
      "deviation",
      "post_processor_change",
      "tool_library_update",
    ];
    if (!allowed.includes(k)) throw new Error(`invalid change_kind: ${k}`);
  }

  private validateTs(ts: number, label: string): void {
    if (!Number.isFinite(ts)) throw new Error(`${label} must be a finite number`);
  }

  private mustGetWindow(id: string): FreezeWindow {
    const w = this.windows.find((x) => x.id === id);
    if (!w) throw new Error(`window not found: ${id}`);
    return w;
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunChangeFreezeEngine = new WetRunChangeFreezeEngine();
