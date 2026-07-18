/**
 * EmployeeShopFloorMobileEngine.test.ts — hotel slot (iter1 / U-EMPLOYEE-MOBILE-PORTAL).
 * Tests phone-first shop-floor portal: QR scan + per-employee task state machine +
 * employee↔employee messaging + hot-job priority audit + manager delegation.
 *
 * Hotel-soul: every privileged action carries an audit row; every transition is
 * verified by concrete value (not weak-presence assertions).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EmployeeShopFloorMobileEngine,
  employeeShopFloorMobileEngine,
  parseScanPayload,
} from "../engines/EmployeeShopFloorMobileEngine.js";

// ── Named test constants (no magic numbers in assertions) ──────────────────
const PRIORITY_DEFAULT = 0;                     // engine's untouched-job default
const PRIORITY_NORMAL_BUMP = 5;                 // routine escalation
const PRIORITY_HOT_BUMP = 10;                   // top-of-queue escalation
const PRIORITY_REVERT = 0;                      // admin cancels prior bump
const PARSE_PAYLOAD_OVERSIZE_LEN = 300;         // exceeds engine's 4× job-id ceiling
const EXPECTED_TWO_MESSAGES = 2;                // count after two sendMessage calls
const EXPECTED_THREE_AUDIT_ENTRIES = 3;         // bump-bump-revert sequence length
const FIRST_MSG_ID = "MSG-1";                   // monotonic counter starts at 1
const FIRST_DELEG_ID = "DELEG-1";

function freshEngine(): EmployeeShopFloorMobileEngine {
  return new EmployeeShopFloorMobileEngine();
}

describe("parseScanPayload — QR / barcode / manual parser", () => {
  it("parses full prism://job/JOB/op/OP/task/TASK form", () => {
    const r = parseScanPayload("prism://job/J-100/op/OP-1/task/T-9", "qr");
    expect(r?.job_id).toBe("J-100");
    expect(r?.operation_id).toBe("OP-1");
    expect(r?.task_id).toBe("T-9");
    expect(r?.source).toBe("qr");
  });

  it("parses prism://job/JOB only (no op/task) — operation_id absent from result", () => {
    const r = parseScanPayload("prism://job/J-77", "barcode");
    expect(r?.job_id).toBe("J-77");
    expect("operation_id" in (r ?? {})).toBe(false);
    expect("task_id" in (r ?? {})).toBe(false);
    expect(r?.source).toBe("barcode");
  });

  it("parses prism://job/JOB/op/OP (op present, task absent)", () => {
    const r = parseScanPayload("prism://job/J-5/op/OP-A", "qr");
    expect(r?.job_id).toBe("J-5");
    expect(r?.operation_id).toBe("OP-A");
    expect("task_id" in (r ?? {})).toBe(false);
  });

  it("bare alphanumeric ID falls back to source=manual (overrides arg)", () => {
    const r = parseScanPayload("WO-12345", "qr");
    expect(r?.job_id).toBe("WO-12345");
    expect(r?.source).toBe("manual");
  });

  it("returns null for empty string", () => {
    expect(parseScanPayload("") === null).toBe(true);
  });

  it("returns null for oversize input (>4× MAX_JOB_ID_CHARS)", () => {
    expect(parseScanPayload("x".repeat(PARSE_PAYLOAD_OVERSIZE_LEN)) === null).toBe(true);
  });

  it("returns null for non-string input (R12 fail-loud — typed null, not throw)", () => {
    expect(parseScanPayload(null as unknown as string) === null).toBe(true);
  });

  it("returns null for malformed prism:// without job id", () => {
    expect(parseScanPayload("prism://job/") === null).toBe(true);
  });

  it("returns null for bare ID with spaces", () => {
    expect(parseScanPayload("J 100") === null).toBe(true);
  });

  it("returns null for bare ID with slashes", () => {
    expect(parseScanPayload("J/100") === null).toBe(true);
  });
});

describe("EmployeeShopFloorMobileEngine — task state machine (start/pause/resume/stop)", () => {
  let engine: EmployeeShopFloorMobileEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("startJobTask creates a running task and binds it as employee's active task", () => {
    const t = engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    expect(t.status).toBe("running");
    expect(t.task_id).toBe("T-1");
    expect(t.job_id).toBe("J-1");
    expect(t.operation_id).toBe("OP-1");
    expect(t.employee_id).toBe("EMP-100");
    expect(t.total_runtime_ms).toBe(0);
    expect(t.total_pause_ms).toBe(0);
    expect(engine.getEmployeeActiveTask("EMP-100")?.task_id).toBe("T-1");
  });

  it("startJobTask is idempotent for already-running task (same id, status running)", () => {
    const a = engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    const b = engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    expect(b.task_id).toBe(a.task_id);
    expect(b.status).toBe("running");
    expect(b.started_at).toBe(a.started_at);
  });

  it("pauseTask flips to paused, records reason, clears employee binding", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    const p = engine.pauseTask("T-1", "EMP-100", "lunch break");
    expect(p.status).toBe("paused");
    expect(p.pause_reason).toBe("lunch break");
    expect(engine.getEmployeeActiveTask("EMP-100") === null).toBe(true);
  });

  it("pauseTask rejects reason shorter than 2 chars (hotel-soul audit rule)", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    expect(() => engine.pauseTask("T-1", "EMP-100", "x")).toThrow(/reason required/);
  });

  it("pauseTask of non-running task throws (state-machine invariant)", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    engine.pauseTask("T-1", "EMP-100", "lunch break");
    expect(() => engine.pauseTask("T-1", "EMP-100", "again")).toThrow(/not running/);
  });

  it("resumeTask flips paused → running and clears paused_at/pause_reason fields", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    engine.pauseTask("T-1", "EMP-100", "lunch");
    const r = engine.resumeTask("T-1", "EMP-100");
    expect(r.status).toBe("running");
    expect("paused_at" in r && r.paused_at !== undefined).toBe(false);
    expect("pause_reason" in r && r.pause_reason !== undefined).toBe(false);
  });

  it("stopTask {completed:true} → terminal status=completed + ISO completed_at", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    const s = engine.stopTask("T-1", "EMP-100", { completed: true });
    expect(s.status).toBe("completed");
    expect(s.completed_at !== undefined && /^\d{4}-\d{2}-\d{2}T/.test(s.completed_at)).toBe(true);
    expect(engine.getEmployeeActiveTask("EMP-100") === null).toBe(true);
  });

  it("stopTask {completed:false, reason} → status=stopped + reason recorded", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    const s = engine.stopTask("T-1", "EMP-100", { completed: false, reason: "machine alarm" });
    expect(s.status).toBe("stopped");
    expect(s.stopped_at !== undefined && /^\d{4}-\d{2}-\d{2}T/.test(s.stopped_at)).toBe(true);
    expect(s.pause_reason).toBe("machine alarm");
  });

  it("startJobTask on a completed task throws (terminal state invariant)", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    engine.stopTask("T-1", "EMP-100", { completed: true });
    expect(() => engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100"))
      .toThrow(/already completed/);
  });

  it("getTask returns a defensive copy (caller mutation does not leak to store)", () => {
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-100");
    const a = engine.getTask("T-1")!;
    a.status = "stopped";
    expect(engine.getTask("T-1")?.status).toBe("running");
  });

  it("getEmployeeActiveTask returns null for unknown employee", () => {
    expect(engine.getEmployeeActiveTask("EMP-NEVER") === null).toBe(true);
  });
});

describe("EmployeeShopFloorMobileEngine — scan-in flow (QR → start, auto-pause prior)", () => {
  let engine: EmployeeShopFloorMobileEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("scanInTask starts a task from a full prism:// payload", () => {
    const t = engine.scanInTask("prism://job/J-1/op/OP-1/task/T-1", "EMP-100", "qr");
    expect(t.job_id).toBe("J-1");
    expect(t.operation_id).toBe("OP-1");
    expect(t.task_id).toBe("T-1");
    expect(t.status).toBe("running");
  });

  it("scanInTask auto-pauses prior running task when employee scans a different one", () => {
    engine.scanInTask("prism://job/J-1/op/OP-1/task/T-1", "EMP-100", "qr");
    engine.scanInTask("prism://job/J-2/op/OP-2/task/T-2", "EMP-100", "qr");
    expect(engine.getTask("T-1")?.status).toBe("paused");
    expect(engine.getTask("T-1")?.pause_reason).toBe("auto-paused on new scan");
    expect(engine.getEmployeeActiveTask("EMP-100")?.task_id).toBe("T-2");
  });

  it("scanInTask throws on payload missing task_id (full prism://job/op/task required)", () => {
    expect(() => engine.scanInTask("prism://job/J-1", "EMP-100", "qr"))
      .toThrow(/missing task_id/);
  });

  it("scanInTask throws on unparseable payload", () => {
    expect(() => engine.scanInTask("garbage payload with spaces", "EMP-100"))
      .toThrow(/unparseable/);
  });

  it("scanInTask throws on missing employeeId", () => {
    expect(() => engine.scanInTask("prism://job/J-1/op/OP-1/task/T-1", "", "qr"))
      .toThrow(/employeeId required/);
  });
});

describe("EmployeeShopFloorMobileEngine — employee ↔ employee messaging", () => {
  let engine: EmployeeShopFloorMobileEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("sendMessage stores message with monotonic ID, ISO sent_at, no read_at", () => {
    const m = engine.sendMessage("EMP-1", "EMP-2", "hello");
    expect(m.id).toBe(FIRST_MSG_ID);
    expect(m.from_employee_id).toBe("EMP-1");
    expect(m.to_employee_id).toBe("EMP-2");
    expect(m.body).toBe("hello");
    expect(/^\d{4}-\d{2}-\d{2}T/.test(m.sent_at)).toBe(true);
    expect("read_at" in m && m.read_at !== undefined).toBe(false);
  });

  it("sendMessage rejects empty body", () => {
    expect(() => engine.sendMessage("EMP-1", "EMP-2", "")).toThrow(/body required/);
  });

  it("sendMessage rejects whitespace-only body", () => {
    expect(() => engine.sendMessage("EMP-1", "EMP-2", "   ")).toThrow(/body required/);
  });

  it("sendMessage rejects self-send", () => {
    expect(() => engine.sendMessage("EMP-1", "EMP-1", "x")).toThrow(/cannot send to self/);
  });

  it("sendMessage rejects missing from", () => {
    expect(() => engine.sendMessage("", "EMP-2", "x")).toThrow(/from \+ to required/);
  });

  it("sendMessage rejects missing to", () => {
    expect(() => engine.sendMessage("EMP-1", "", "x")).toThrow(/from \+ to required/);
  });

  it("listMessages returns recipient's messages newest-first", () => {
    engine.sendMessage("EMP-1", "EMP-2", "first");
    engine.sendMessage("EMP-1", "EMP-2", "second");
    const list = engine.listMessages("EMP-2");
    expect(list.length).toBe(EXPECTED_TWO_MESSAGES);
    expect(list[0].body).toBe("second");
    expect(list[1].body).toBe("first");
  });

  it("listMessages {unreadOnly:true} filters out read messages", () => {
    const a = engine.sendMessage("EMP-1", "EMP-2", "read me");
    engine.sendMessage("EMP-1", "EMP-2", "unread me");
    engine.markMessageRead(a.id);
    const list = engine.listMessages("EMP-2", { unreadOnly: true });
    expect(list.length).toBe(1);
    expect(list[0].body).toBe("unread me");
  });

  it("markMessageRead is idempotent (read_at unchanged on second call)", () => {
    const m = engine.sendMessage("EMP-1", "EMP-2", "x");
    const r1 = engine.markMessageRead(m.id)!;
    const r2 = engine.markMessageRead(m.id)!;
    expect(r1.read_at).toBe(r2.read_at);
  });

  it("markMessageRead returns null for unknown id", () => {
    expect(engine.markMessageRead("MSG-NEVER") === null).toBe(true);
  });
});

describe("EmployeeShopFloorMobileEngine — hot-job priority + audit chain", () => {
  let engine: EmployeeShopFloorMobileEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("bumpJobPriority sets priority and writes audit entry with reason", () => {
    const e = engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "customer escalation");
    expect(e.priority).toBe(PRIORITY_NORMAL_BUMP);
    expect(e.bumped_by).toBe("ADMIN-1");
    expect(e.reason).toBe("customer escalation");
    expect(engine.getJobPriority("J-1")).toBe(PRIORITY_NORMAL_BUMP);
  });

  it("getJobPriority returns PRIORITY_DEFAULT for never-bumped job", () => {
    expect(engine.getJobPriority("J-NEVER")).toBe(PRIORITY_DEFAULT);
  });

  it("bumpJobPriority rejects reason shorter than 3 chars (hotel-soul rule)", () => {
    expect(() => engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "ab"))
      .toThrow(/reason required/);
  });

  it("bumpJobPriority rejects NaN priority (R12 fail-loud)", () => {
    expect(() => engine.bumpJobPriority("J-1", NaN, "ADMIN-1", "valid reason"))
      .toThrow(/finite/);
  });

  it("bumpJobPriority rejects Infinity priority (R12 fail-loud)", () => {
    expect(() => engine.bumpJobPriority("J-1", Infinity, "ADMIN-1", "valid reason"))
      .toThrow(/finite/);
  });

  it("bumpJobPriority rejects missing job_id", () => {
    expect(() => engine.bumpJobPriority("", PRIORITY_NORMAL_BUMP, "ADMIN-1", "valid reason")).toThrow(/job_id/);
  });

  it("bumpJobPriority rejects missing admin_id", () => {
    expect(() => engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "", "valid reason")).toThrow(/admin_id/);
  });

  it("getJobPriorityAudit preserves every change in chronological order", () => {
    engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "initial bump");
    engine.bumpJobPriority("J-1", PRIORITY_HOT_BUMP, "ADMIN-2", "higher bump");
    engine.bumpJobPriority("J-1", PRIORITY_REVERT, "ADMIN-1", "revert reason");
    const audit = engine.getJobPriorityAudit("J-1");
    expect(audit.length).toBe(EXPECTED_THREE_AUDIT_ENTRIES);
    expect(audit[0].priority).toBe(PRIORITY_NORMAL_BUMP);
    expect(audit[1].priority).toBe(PRIORITY_HOT_BUMP);
    expect(audit[2].priority).toBe(PRIORITY_REVERT);
  });

  it("getJobPriorityAudit returns defensive copy (mutation does not leak to store)", () => {
    engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "first reason");
    const all = engine.getJobPriorityAudit();
    all[0].priority = PRIORITY_HOT_BUMP * 100;  // mutate returned copy
    expect(engine.getJobPriorityAudit()[0].priority).toBe(PRIORITY_NORMAL_BUMP);
  });

  it("rankJobsByPriority sorts hottest first; ties broken by most-recent bump", () => {
    engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "first job");
    engine.bumpJobPriority("J-2", PRIORITY_HOT_BUMP, "ADMIN-1", "hotter job");
    engine.bumpJobPriority("J-3", PRIORITY_NORMAL_BUMP, "ADMIN-1", "same priority later");
    const ranked = engine.rankJobsByPriority();
    expect(ranked[0].job_id).toBe("J-2");
    expect(ranked[0].priority).toBe(PRIORITY_HOT_BUMP);
    // J-3 bumped after J-1 at same priority → J-3 ranks above J-1
    expect(ranked[1].job_id).toBe("J-3");
    expect(ranked[2].job_id).toBe("J-1");
  });
});

describe("EmployeeShopFloorMobileEngine — manager task delegation", () => {
  let engine: EmployeeShopFloorMobileEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("delegateTask creates entry with monotonic ID, ISO delegated_at, no ack", () => {
    const d = engine.delegateTask("T-1", "MGR-1", "EMP-100", "operator out sick");
    expect(d.id).toBe(FIRST_DELEG_ID);
    expect(d.task_id).toBe("T-1");
    expect(d.from_manager_id).toBe("MGR-1");
    expect(d.to_employee_id).toBe("EMP-100");
    expect(d.reason).toBe("operator out sick");
    expect(/^\d{4}-\d{2}-\d{2}T/.test(d.delegated_at)).toBe(true);
    expect("acknowledged_at" in d && d.acknowledged_at !== undefined).toBe(false);
  });

  it("delegateTask rejects self-delegation (manager to self)", () => {
    expect(() => engine.delegateTask("T-1", "MGR-1", "MGR-1", "valid reason"))
      .toThrow(/cannot delegate to self/);
  });

  it("delegateTask rejects reason <3 chars (hotel-soul audit rule)", () => {
    expect(() => engine.delegateTask("T-1", "MGR-1", "EMP-100", "ab"))
      .toThrow(/reason required/);
  });

  it("delegateTask rejects missing task_id", () => {
    expect(() => engine.delegateTask("", "MGR-1", "EMP-100", "valid reason"))
      .toThrow(/all required/);
  });

  it("delegateTask rejects missing manager_id", () => {
    expect(() => engine.delegateTask("T-1", "", "EMP-100", "valid reason"))
      .toThrow(/all required/);
  });

  it("delegateTask rejects missing to_employee_id", () => {
    expect(() => engine.delegateTask("T-1", "MGR-1", "", "valid reason"))
      .toThrow(/all required/);
  });

  it("acknowledgeDelegation sets ISO acknowledged_at when called by assigned employee", () => {
    const d = engine.delegateTask("T-1", "MGR-1", "EMP-100", "cover-shift");
    const ack = engine.acknowledgeDelegation(d.id, "EMP-100");
    expect(typeof ack.acknowledged_at).toBe("string");
    expect(/^\d{4}-\d{2}-\d{2}T/.test(ack.acknowledged_at!)).toBe(true);
  });

  it("acknowledgeDelegation rejects acknowledgement from non-assigned employee", () => {
    const d = engine.delegateTask("T-1", "MGR-1", "EMP-100", "cover-shift");
    expect(() => engine.acknowledgeDelegation(d.id, "EMP-999"))
      .toThrow(/only the assigned employee/);
  });

  it("acknowledgeDelegation throws on unknown delegation id", () => {
    expect(() => engine.acknowledgeDelegation("DELEG-NEVER", "EMP-100"))
      .toThrow(/not found/);
  });

  it("listDelegations returns assigned employee's entries newest-first", () => {
    engine.delegateTask("T-1", "MGR-1", "EMP-100", "first delegation");
    engine.delegateTask("T-2", "MGR-1", "EMP-100", "second delegation");
    const list = engine.listDelegations("EMP-100");
    expect(list.length).toBe(EXPECTED_TWO_MESSAGES);
    expect(list[0].task_id).toBe("T-2");
    expect(list[1].task_id).toBe("T-1");
  });

  it("listDelegations {unacknowledgedOnly:true} filters acknowledged entries out", () => {
    const a = engine.delegateTask("T-1", "MGR-1", "EMP-100", "first reason");
    engine.delegateTask("T-2", "MGR-1", "EMP-100", "second reason");
    engine.acknowledgeDelegation(a.id, "EMP-100");
    const list = engine.listDelegations("EMP-100", { unacknowledgedOnly: true });
    expect(list.length).toBe(1);
    expect(list[0].task_id).toBe("T-2");
  });
});

describe("EmployeeShopFloorMobileEngine — R1 role-based ACL", () => {
  let engine: EmployeeShopFloorMobileEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("bumpJobPriority succeeds when no resolver is installed (backward-compat)", () => {
    const e = engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "test reason");
    expect(e.priority).toBe(PRIORITY_NORMAL_BUMP);
  });

  it("bumpJobPriority refuses operator role when resolver gates to manager+admin", () => {
    engine.configureRoleACL({ resolver: (id: string) => id === "ADMIN-1" ? "admin" : "operator" });
    expect(() => engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "OP-1", "test reason"))
      .toThrow(/not in allow list/);
  });

  it("bumpJobPriority succeeds when resolver returns an allowed role", () => {
    engine.configureRoleACL({ resolver: () => "admin" });
    const e = engine.bumpJobPriority("J-1", PRIORITY_HOT_BUMP, "ADMIN-1", "approved bump");
    expect(e.priority).toBe(PRIORITY_HOT_BUMP);
  });

  it("bumpJobPriority refuses unresolvable actor (resolver returns null)", () => {
    engine.configureRoleACL({ resolver: () => null });
    expect(() => engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "test"))
      .toThrow(/refuse-on-unknown/);
  });

  it("delegateTask refuses non-manager caller", () => {
    engine.configureRoleACL({ resolver: () => "operator" });
    expect(() => engine.delegateTask("T-1", "OP-1", "EMP-100", "cover shift"))
      .toThrow(/not in allow list/);
  });

  it("delegateTask succeeds when caller has manager role", () => {
    engine.configureRoleACL({ resolver: (id: string) => id === "MGR-1" ? "manager" : "operator" });
    const d = engine.delegateTask("T-1", "MGR-1", "EMP-100", "cover shift");
    expect(d.from_manager_id).toBe("MGR-1");
  });

  it("configureRoleACL with custom priorityBumpRoles honors caller-side override", () => {
    engine.configureRoleACL({
      resolver: () => "supervisor",
      priorityBumpRoles: ["supervisor", "admin"],
    });
    const e = engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "SUP-1", "approved");
    expect(e.priority).toBe(PRIORITY_NORMAL_BUMP);
  });

  it("configureRoleACL({resolver:null}) removes ACL — bumpJobPriority works again", () => {
    engine.configureRoleACL({ resolver: () => "operator" });
    expect(() => engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "OP-1", "blocked")).toThrow();
    engine.configureRoleACL({ resolver: null });
    const e = engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "OP-1", "now ok");
    expect(e.priority).toBe(PRIORITY_NORMAL_BUMP);
  });

  it("reset() drops the ACL configuration along with state", () => {
    engine.configureRoleACL({ resolver: () => "operator" });
    engine.reset();
    // Post-reset, ACL is gone — bump should succeed without role gate
    const e = engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "OP-1", "post-reset");
    expect(e.priority).toBe(PRIORITY_NORMAL_BUMP);
  });
});

describe("EmployeeShopFloorMobileEngine — singleton + reset", () => {
  it("module exports a usable singleton", () => {
    employeeShopFloorMobileEngine.reset();
    const t = employeeShopFloorMobileEngine.startJobTask("J-S", "OP-S", "T-S", "EMP-S");
    expect(t.task_id).toBe("T-S");
    expect(t.status).toBe("running");
    employeeShopFloorMobileEngine.reset();
  });

  it("reset() drops all state (tasks, messages, priorities, delegations, counters)", () => {
    const engine = freshEngine();
    engine.startJobTask("J-1", "OP-1", "T-1", "EMP-1");
    engine.sendMessage("EMP-1", "EMP-2", "hi");
    engine.bumpJobPriority("J-1", PRIORITY_NORMAL_BUMP, "ADMIN-1", "valid reason");
    engine.delegateTask("T-1", "MGR-1", "EMP-2", "valid reason");
    engine.reset();
    expect(engine.getTask("T-1") === null).toBe(true);
    expect(engine.listMessages("EMP-2").length).toBe(0);
    expect(engine.getJobPriority("J-1")).toBe(PRIORITY_DEFAULT);
    expect(engine.listDelegations("EMP-2").length).toBe(0);
    expect(engine.getJobPriorityAudit().length).toBe(0);
    // Counter reset → next message should re-start at MSG-1
    const m = engine.sendMessage("EMP-1", "EMP-2", "after reset");
    expect(m.id).toBe(FIRST_MSG_ID);
  });
});
