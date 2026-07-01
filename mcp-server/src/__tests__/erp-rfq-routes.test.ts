/**
 * erp-rfq-routes.test.ts -- U-HOTEL-RFQ-ASSIGN (gap #2 of HOTEL-ERP-FRONTEND-WIRING-SPEC, slot:hotel)
 *
 * The RFQInbox page (web/src/pages/RFQInboxPage.tsx) had NO backing /erp/rfq* routes -> it was fully
 * dead (rfqList/rfqAssign/rfqUpdateStatus all 404'd). This unit wired 4 routes onto the existing
 * RFQToOrderOrchestratorEngine via businessDispatcher. This test drives the erp Express router directly
 * (no network), mocking only auth + callTool, and pins the LOAD-BEARING contracts:
 *
 *   1. SHAPE: the dispatcher returns { success, data }; the FE reads res.data and expects the records
 *      array (or updated record) DIRECTLY there -- NOT double-nested. The route must unwrap the inner
 *      `data`. (The dead-panel class: if res.data were { success, data }, the FE casts it as RFQ[] and
 *      silently renders empty.)
 *   2. PASSTHROUGH: rfq-list forwards the ?status query; assign/status forward the body.
 *   3. FAIL-LOUD: a dispatcher { success:false } maps to a 400 so the FE catch fires (not a silent 200).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: any, _res: any, next: () => void) => {
    req.userId = "test-user";
    req.userRoles = ["lead"];
    next();
  },
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
  requireSelfOrAdmin: (_req: any, _res: any, next: () => void) => next(),
  validateTimestamp: (_req: any, _res: any, next: () => void) => next(),
}));

import { createServer, type Server } from "http";
import express from "express";
import { createErpRouter } from "../routes/erp.js";
import type { CallToolFn } from "../routes/index.js";

let server: Server;
let baseUrl: string;

const calls: Array<{ tool: string; action: string; params: Record<string, unknown> }> = [];
// Mirror the PRODUCTION wire (R9): prism_business returns slimResponse({type:"text",text:JSON.stringify(...)})
// with NO content[] wrapper, so the real callTool (index.ts: result?.content?.[0]?.text) CANNOT peel it and
// hands the route the RAW {type,text} envelope. The route's unwrapEnvelope must parse it. A mock returning the
// bare {success,data} would MASK the dead-panel bug (the convenient-shape trap). So we emit the real envelope.
function env(obj: unknown) {
  return { type: "text", text: JSON.stringify(obj) } as any;
}
const callTool: CallToolFn = vi.fn(async (tool: string, action: string, params: any = {}) => {
  calls.push({ tool, action, params });
  if (action === "rfq_list") {
    // Honor the inbox_status filter the route now forwards (the FE filter dropdown).
    const rows = [
      { id: "RFQ-1", rfq: { customer_id: "ALCOA" }, status: "rfq_received", inbox_status: "received" },
      { id: "RFQ-2", rfq: { customer_id: "ITW" }, status: "rfq_received", inbox_status: "reviewing" },
    ];
    const filtered = params.inbox_status ? rows.filter((r) => r.inbox_status === params.inbox_status) : rows;
    return env({ success: true, data: filtered });
  }
  if (action === "rfq_assign") {
    return env({ success: true, data: { id: params.record_id ?? params.rfq_id, assignee_id: params.assignee_id } });
  }
  if (action === "rfq_update_status") {
    // The route forwards the raw body {rfq_id, status}; the REAL businessDispatcher maps status->inbox_status
    // (p.inbox_status ?? p.status). Replicate that mapping here so the mock matches the production wire (R9).
    const inbox = params.inbox_status ?? params.status;
    if (inbox === "__bad__") {
      // The dispatcher error path DOES carry a content[] wrapper, so callTool parses it -> bare {success:false}.
      return { success: false, error: "invalid inbox_status '__bad__'" } as any;
    }
    return env({ success: true, data: { id: params.record_id ?? params.rfq_id, inbox_status: inbox } });
  }
  if (action === "rfq_receive") {
    return env({ success: true, data: { id: "RFQ-NEW", status: "rfq_received" } });
  }
  if (action === "credit_review_all") {
    return env({
      success: true,
      data: {
        reviews: [
          { customer_id: "C2", customer_name: "Over", utilization_pct: 120, over_limit: true, risk: "over_limit" },
          { customer_id: "C1", customer_name: "Low", utilization_pct: 10, over_limit: false, risk: "ok" },
        ],
        summary: { total: 2, over_limit: 1, on_hold: 0, at_risk: 1 },
      },
    });
  }
  if (action === "credit_review") {
    return env({ success: true, data: { customer_id: params.customer_id, utilization_pct: 50, risk: "ok" } });
  }
  if (action === "oee_losses") {
    // The REAL businessDispatcher returns the engine output DIRECTLY -- a BARE array, NOT {success,data}.
    // Emitting {success,data} here would MASK whether the route handles the bare-array shape (R9). So we
    // env() a bare OEELoss[] -- exactly what oeeCalculatorEngine.losses() produces, ranked worst-first.
    // Replicate the engine's isMeasuredWindow fail-closed guard: an empty/partial body -> [] (honest
    // Unavailable), matching trend([]) -> []. The FE's first-load analyticsOEELosses({}) hits this.
    const measured = ["planned_production_time_min", "actual_run_time_min", "planned_downtime_min",
      "unplanned_downtime_min", "ideal_cycle_time_sec", "total_parts_produced", "good_parts"]
      .every((k) => Number.isFinite(params?.[k]));
    if (!measured) return env([]);
    return env([
      { id: "breakdowns", name: "Breakdowns", category: "availability", minutes_lost: 36, description: "x" },
      { id: "reduced_speed", name: "Reduced Speed", category: "performance", minutes_lost: 35, description: "x" },
    ]);
  }
  if (action === "osha_incidents") {
    // Real dispatcher returns a BARE array of incidents with employee_name joined + recordable/status emitted
    // as STRINGS (the FE firstText helper is string-only): `recordable` "true"/"false" drives the recordable
    // metric (page:93 .includes('true')), `status` "recordable"/"non-recordable" drives the card label
    // (page:182). Mirror that exact shape (R9 -- a bare boolean would mask the always-0-metric bug).
    return env([
      { id: "OSHA-1", incident_date: "2026-08-20", employee_id: "EMP-1", employee_name: "Jane Doe", injury_type: "injury", recordable: "true", status: "recordable" },
      { id: "OSHA-2", incident_date: "2026-03-15", employee_id: "EMP-2", employee_name: "Bob Lee", injury_type: "near_miss", recordable: "false", status: "non-recordable" },
    ]);
  }
  if (action === "osha_300_log") {
    // BARE array of OSHA300Row, filtered to recordable + year by the engine.
    return env([
      { case_number: "OSHA-1", employee_name: "Jane Doe", date_of_injury: "2026-08-20", days_away: 0 },
    ]);
  }
  if (action === "osha_ppe_records") {
    // BARE array of PPE assignments (employee_name joined, needs_replacement decorated).
    return env([
      { id: "PPE-1", employee_id: "EMP-1", employee_name: "Jane Doe", ppe_type: "Glasses", condition: "good", needs_replacement: false },
    ]);
  }
  if (action === "osha_near_miss") {
    // The dispatcher createIncident case returns {success:true, data: the created incident}.
    return env({ success: true, data: { id: "OSHA-NM", injury_type: "near_miss", recordable: false, description: params.description } });
  }
  if (action === "safety_training_list_all") {
    // The dispatcher returns {records:[...]} (an OBJECT with a records key), course_name + employee_name joined.
    return env({
      records: [
        { id: "TRN-000001", employee_id: "EMP-1", employee_name: "Jane Doe", topic_id: "loto", course_name: "loto", status: "assigned" },
      ],
    });
  }
  if (action === "oee_trend") {
    // trend([]) -> [] (the FE posts {days:30} with no samples on first load -> honest empty). With samples,
    // a bare OEETrendDay[]. Replicate the dispatcher's `params.samples ?? params.days_samples ?? []` -> trend.
    const samples = params.samples ?? params.days_samples ?? [];
    if (!Array.isArray(samples) || samples.length === 0) return env([]);
    return env(
      samples.map((s: any) => ({
        date: s.date, oee_pct: 75, availability_pct: 90, performance_pct: 90, quality_pct: 92.6,
      })),
    );
  }
  if (action === "pm_work_order_list") {
    // The REAL businessDispatcher (pm_work_order_list case) returns {work_orders: PMWorkOrder[]}. PMWorkOrder uses
    // machine_id/machine_name/task_name/assigned_to/created_at/scheduled_date/labor_hours and has NO priority field.
    // The route's adaptWorkOrder must rename those to the FE WorkOrder shape (asset_id/asset_name/description/
    // assignee/opened_at/due_at/est_labor_hours) and default priority to "normal" (R12 -- no fabricated signal).
    // Emit the real {work_orders} envelope (R9 -- a bare {orders} would mask the unwrap+adapter).
    return env({
      work_orders: [
        { id: "WO-1", machine_id: "VMC-01", machine_name: "Haas VF-2", task_name: "Spindle lube", status: "open",
          assigned_to: "tech-a", created_at: "2026-06-20", scheduled_date: "2026-06-30", labor_hours: 1.5 },
        // Missing id -> the route must DROP this row (w.id != null filter), proving the guard.
        { machine_id: "LATHE-03", task_name: "no id row", status: "open" },
      ],
    });
  }
  if (action === "pm_overdue_alerts") {
    // getOverdueAlerts returns {alerts:[{schedule, days_overdue, ...}]}; the dispatcher wraps it {alerts}.
    return env({ alerts: [{ schedule: { id: "PM-1", machine_id: "VMC-01", task: "lube" }, days_overdue: 3 }] });
  }
  if (action === "pm_schedule_list") {
    return env({ schedules: [{ id: "PM-1", machine_id: "VMC-01", interval_days: 30 }] });
  }
  if (action === "pm_schedule_create") {
    return env({ schedule: { id: "PM-NEW", machine_id: params.machine_id ?? "VMC-01" } });
  }
  if (action === "pm_work_order_generate") {
    // The route maps alert_id->schedule_id + defaults scheduled_date; capture what it forwarded.
    return env({ work_order: { id: "WO-GEN", schedule_id: params.schedule_id, scheduled_date: params.scheduled_date } });
  }
  if (action === "pm_work_order_assign") {
    return env({ work_order: { id: params.work_order_id, assigned_to: params.assigned_to, status: "in_progress" } });
  }
  if (action === "pm_work_order_complete") {
    return env({ work_order: { id: params.work_order_id, status: "complete", labor_hours: params.labor_hours } });
  }
  if (action === "asset_list") {
    return env({ assets: [{ id: "AS-1", name: "Haas VF-2", category: "machine", status: "active" }] });
  }
  if (action === "asset_register") {
    return env({ id: "AS-NEW", name: params.name ?? "New Asset", status: "active" });
  }
  if (action === "asset_transfer") {
    return env({ id: params.asset_id, location: params.location ?? "Cell 3" });
  }
  if (action === "asset_calibration_due") {
    return env({ due: [{ asset_id: "AS-1", next_calibration: "2026-09-01", days_until: 30 }] });
  }
  if (action === "asset_depreciation_schedule") {
    return env({ schedule: [{ asset_id: params.asset_id, year: 1, book_value: 9000 }] });
  }
  return env({ success: true, data: {} });
});

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/erp", createErpRouter(callTool));
  await new Promise<void>((resolve) => {
    server = createServer(app).listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
      resolve();
    });
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function http(method: string, path: string, body?: any): Promise<{ status: number; json: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer t" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

describe("U-HOTEL-RFQ-ASSIGN: /api/v1/erp/rfq* routes", () => {
  it("GET /rfq-list surfaces the records ARRAY at res.data (not double-nested -- the dead-panel guard)", async () => {
    const { status, json } = await http("GET", "/api/v1/erp/rfq-list");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    // LOAD-BEARING: data is the records array directly, NOT { success, data }.
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].id).toBe("RFQ-1");
  });

  it("GET /rfq-list forwards the ?status query as inbox_status (NOT the FSM status -- no vocab conflation)", async () => {
    calls.length = 0;
    const { status, json } = await http("GET", "/api/v1/erp/rfq-list?status=reviewing");
    const c = calls.find((x) => x.action === "rfq_list");
    // The route must forward the inbox-vocab filter as `inbox_status`, never as the FSM `status`
    // (forwarding it as `status` would hit listRecords' FSM validator and 400 on every filter selection).
    expect(c?.params.inbox_status).toBe("reviewing");
    expect(c?.params.status).toBeUndefined();
    // And it returns the FILTERED records (only the 'reviewing' row), not a 400.
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("RFQ-2");
  });

  it("POST /rfq-assign forwards rfq_id + assignee_id and returns the updated record at res.data", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/rfq-assign", { rfq_id: "RFQ-1", assignee_id: "EMP-7" });
    expect(status).toBe(200);
    expect(json.data.assignee_id).toBe("EMP-7");
    const c = calls.find((x) => x.action === "rfq_assign");
    expect(c?.params.assignee_id).toBe("EMP-7");
  });

  it("POST /rfq-status forwards the status and returns the updated record", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/rfq-status", { rfq_id: "RFQ-1", status: "reviewing" });
    expect(status).toBe(200);
    expect(json.data.inbox_status).toBe("reviewing");
  });

  it("POST /rfq-status maps a dispatcher { success:false } to a 400 (fail-loud, not silent 200)", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/rfq-status", { rfq_id: "RFQ-1", inbox_status: "__bad__" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain("invalid inbox_status");
  });

  it("POST /rfq-create routes to rfq_receive", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/rfq-create", { rfq: { rfq_id: "X" }, received_by_subsystem: "P" });
    expect(status).toBe(200);
    expect(json.data.id).toBe("RFQ-NEW");
  });
});

describe("U-HOTEL-CREDIT-REVIEW: /api/v1/erp/credit-review* routes (gap #3)", () => {
  it("GET /credit-review-all surfaces {reviews,summary} at res.data (envelope-unwrapped)", async () => {
    const { status, json } = await http("GET", "/api/v1/erp/credit-review-all");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    // The FE reads arrayFromPayload(res, ['reviews',...]) -> data.reviews must be the array.
    expect(Array.isArray(json.data.reviews)).toBe(true);
    expect(json.data.reviews[0].customer_id).toBe("C2");
    expect(json.data.summary.over_limit).toBe(1);
  });

  it("GET /credit-review/:customer_id forwards the path param to the dispatcher", async () => {
    calls.length = 0;
    const { status, json } = await http("GET", "/api/v1/erp/credit-review/ALCOA");
    expect(status).toBe(200);
    const c = calls.find((x) => x.action === "credit_review");
    expect(c?.params.customer_id).toBe("ALCOA");
    expect(json.data.customer_id).toBe("ALCOA");
  });
});

describe("U-HOTEL-OEE-DASHBOARD: /api/v1/erp/oee-* routes (gap #4)", () => {
  it("POST /oee-losses surfaces the BARE OEELoss array at res.data (envelope-unwrapped, not double-nested)", async () => {
    // The dispatcher returns a BARE array; the route's rfqRoute unwraps the {type,text} envelope and its
    // `r?.data ?? r` fallback surfaces the array directly. The FE reads payloadOf(res)=res.data = the array.
    calls.length = 0; // reset so the calls.find below resolves THIS request's oee_losses call (mirrors the rfq-list test)
    const { status, json } = await http("POST", "/api/v1/erp/oee-losses", {
      planned_production_time_min: 480, actual_run_time_min: 400, planned_downtime_min: 30,
      unplanned_downtime_min: 60, ideal_cycle_time_sec: 30, total_parts_produced: 700, good_parts: 680,
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].category).toBe("availability");
    expect(typeof json.data[0].minutes_lost).toBe("number");
    // The route forwarded the OEEInput body to the dispatcher unchanged.
    const c = calls.find((x) => x.action === "oee_losses");
    expect(c?.params.total_parts_produced).toBe(700);
  });

  it("POST /oee-losses with {} (FE first-load body) returns {ok:true, data:[]} -- honest fail-closed, not bogus 0-min cards", async () => {
    // The FE's first-load call is analyticsOEELosses({}) = empty body. An unmeasured window -> [] so the
    // Losses tab shows honest "Unavailable", symmetric with the trend {days:30} empty case (R12).
    const { status, json } = await http("POST", "/api/v1/erp/oee-losses", {});
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(0);
  });

  it("POST /oee-trend with {samples:[...]} surfaces the BARE TrendDay array at res.data", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/oee-trend", {
      samples: [{ date: "2026-06-22" }, { date: "2026-06-23" }],
    });
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].date).toBe("2026-06-22");
    expect(typeof json.data[0].oee_pct).toBe("number");
  });

  it("POST /oee-trend with {days:30} (no samples) returns {ok:true, data:[]} -- the honest fail-closed empty", async () => {
    // This is the FE's first-load call: analyticsOEETrend({days:30}). No samples -> trend([]) -> [].
    // The route must return data:[] (NOT data:undefined) so the page shows honest "Unavailable", not a crash.
    const { status, json } = await http("POST", "/api/v1/erp/oee-trend", { days: 30 });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(0);
  });
});

describe("U-HOTEL-OSHA-DASHBOARD: /api/v1/erp/osha-* routes (gap #5)", () => {
  it("GET /osha-incidents surfaces the BARE incidents array at res.data (envelope-unwrapped)", async () => {
    const { status, json } = await http("GET", "/api/v1/erp/osha-incidents");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].id).toBe("OSHA-1");
    expect(json.data[0].employee_name).toBe("Jane Doe"); // the EmployeeEngine join survives the wire
    // The dispatcher emits recordable + status as STRINGS (the FE firstText helper is string-only -> a bare
    // boolean renders "" -> "Status unavailable" card + a permanently-0 recordable metric). Pin BOTH:
    //   recordable "true"/"false" -> the FE metric (page:93 .includes('true')) counts correctly;
    //   status "recordable"/"non-recordable" -> the per-card label (page:182) renders the posture.
    expect(json.data[0].recordable).toBe("true");
    expect(json.data[1].recordable).toBe("false");
    expect(json.data[0].status).toBe("recordable");
    expect(json.data[1].status).toBe("non-recordable");
    // The FE recordableCount (page:93) does firstText(['recordable','status']).includes('true');
    // prove that contract holds against this wire shape (would FAIL if recordable were a bare boolean).
    const recordableCount = json.data.filter((e: any) =>
      String(e.recordable ?? e.status).toLowerCase().includes("true")).length;
    expect(recordableCount).toBe(1);
  });

  it("GET /osha-300-log forwards ?year and surfaces the BARE 300-row array", async () => {
    calls.length = 0;
    const { status, json } = await http("GET", "/api/v1/erp/osha-300-log?year=2026");
    expect(status).toBe(200);
    const c = calls.find((x) => x.action === "osha_300_log");
    expect(String(c?.params.year)).toBe("2026");
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].case_number).toBe("OSHA-1");
  });

  it("GET /safety-training surfaces {records} at res.data (object, not bare array -- FE reads data.records)", async () => {
    const { status, json } = await http("GET", "/api/v1/erp/safety-training");
    expect(status).toBe(200);
    // The FE does arrayFromPayload(res, ['records',...]) -> data.records must be the array.
    expect(Array.isArray(json.data.records)).toBe(true);
    expect(json.data.records[0].course_name).toBe("loto"); // the course_name alias the FE card reads
    expect(json.data.records[0].employee_name).toBe("Jane Doe");
  });

  it("GET /ppe-records surfaces the BARE PPE array at res.data", async () => {
    const { status, json } = await http("GET", "/api/v1/erp/ppe-records");
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].ppe_type).toBe("Glasses");
    expect(json.data[0].needs_replacement).toBe(false);
  });

  it("POST /osha-near-miss forwards the body + returns the created near-miss incident at res.data", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/osha-near-miss", {
      employee_name: "Jane Doe", description: "Almost slipped on coolant", incident_date: "2026-06-24",
    });
    expect(status).toBe(200);
    expect(json.data.injury_type).toBe("near_miss");
    expect(json.data.recordable).toBe(false);
    const c = calls.find((x) => x.action === "osha_near_miss");
    expect(c?.params.description).toBe("Almost slipped on coolant");
  });
});

describe("U-HOTEL-MAINT-WORKORDER: /api/v1/erp/maintenance/* routes (gap #6)", () => {
  it("GET /maintenance/work-orders unwraps the {work_orders} envelope + ADAPTS PMWorkOrder -> the FE WorkOrder shape", async () => {
    calls.length = 0;
    const { status, json } = await http("GET", "/api/v1/erp/maintenance/work-orders");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    // The route returns {ok, orders} at TOP LEVEL (the FE reads response.orders, not .data) -- the work-order
    // list is internal shop ops with NO $/PII, so no redaction; the page reads the array directly.
    expect(Array.isArray(json.orders)).toBe(true);
    // The no-id PMWorkOrder row must be DROPPED by the w.id != null guard -> exactly 1 adapted order survives.
    expect(json.orders).toHaveLength(1);
    const o = json.orders[0];
    // The shape-adapt is the integration teeth: every PMWorkOrder field is renamed to the FE WorkOrder field.
    expect(o.id).toBe("WO-1");
    expect(o.asset_id).toBe("VMC-01");          // machine_id -> asset_id
    expect(o.asset_name).toBe("Haas VF-2");     // machine_name -> asset_name
    expect(o.description).toBe("Spindle lube"); // task_name -> description
    expect(o.assignee).toBe("tech-a");          // assigned_to -> assignee
    expect(o.opened_at).toBe("2026-06-20");     // created_at -> opened_at
    expect(o.due_at).toBe("2026-06-30");        // scheduled_date -> due_at
    expect(o.est_labor_hours).toBe(1.5);        // labor_hours -> est_labor_hours
    expect(o.status).toBe("open");              // status passthrough
    // PMWorkOrder has NO priority field -> the adapter defaults "normal" (R12: an honest documented default,
    // NOT a fabricated signal). A revert to reading w.priority would yield undefined and FAIL here.
    expect(o.priority).toBe("normal");
    // It really called pm_work_order_list (R8 reuse -- no new engine method was added).
    expect(calls.some((c) => c.action === "pm_work_order_list")).toBe(true);
  });

  it("POST /maintenance/refresh does a REAL re-list (not a no-op 200) returning the same adapted orders", async () => {
    calls.length = 0;
    const { status, json } = await http("POST", "/api/v1/erp/maintenance/refresh", {});
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    // R12 no-facade: refresh re-runs pm_work_order_list (a real refresh), so the FE's post-refresh reload sees
    // fresh data. A fake {ok:true} that never called the engine would FAIL this.
    expect(calls.some((c) => c.action === "pm_work_order_list")).toBe(true);
    expect(Array.isArray(json.orders)).toBe(true);
    expect(json.orders).toHaveLength(1);
    expect(json.orders[0].asset_id).toBe("VMC-01");
  });
});

describe("U-HOTEL-WIRE-PM-ASSET: /api/v1/erp PM + asset routes (Vertical 1)", () => {
  it("GET /pm-schedules unwraps the {alerts} envelope -> res.data.alerts (the FE overdue-alert panel)", async () => {
    const { status, json } = await http("GET", "/api/v1/erp/pm-schedules");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    // The route maps pm-schedules -> pm_overdue_alerts; the FE arrayFromPayload(['alerts',...]) reads data.alerts.
    expect(Array.isArray(json.data.alerts)).toBe(true);
    expect(json.data.alerts[0].schedule.id).toBe("PM-1");
  });

  it("POST /pm-schedule-list surfaces {schedules} (envelope-unwrapped, not the {type,text} wrapper)", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/pm-schedule-list", {});
    expect(status).toBe(200);
    // If unwrapEnvelope were skipped, data would be the {type,text} object and .schedules would be undefined.
    expect(Array.isArray(json.data.schedules)).toBe(true);
    expect(json.data.schedules[0].id).toBe("PM-1");
  });

  it("POST /pm-generate-work-order maps alert_id->schedule_id + defaults scheduled_date (integration teeth)", async () => {
    calls.length = 0;
    const { status, json } = await http("POST", "/api/v1/erp/pm-generate-work-order", { alert_id: "PM-7" });
    expect(status).toBe(200);
    const c = calls.find((x) => x.action === "pm_work_order_generate");
    // The route renamed alert_id -> schedule_id (the alert's identity IS the schedule per getOverdueAlerts).
    expect(c?.params.schedule_id).toBe("PM-7");
    // scheduled_date defaulted to an ISO yyyy-mm-dd (R12 honest "now" default) -- not left undefined.
    expect(String(c?.params.scheduled_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(json.data.work_order.schedule_id).toBe("PM-7");
  });

  it("POST /pm-work-order-assign forwards work_order_id + assigned_to to the engine", async () => {
    calls.length = 0;
    const { status, json } = await http("POST", "/api/v1/erp/pm-work-order-assign", { work_order_id: "WO-1", assigned_to: "tech-b" });
    expect(status).toBe(200);
    const c = calls.find((x) => x.action === "pm_work_order_assign");
    expect(c?.params.work_order_id).toBe("WO-1");
    expect(json.data.work_order.assigned_to).toBe("tech-b");
  });

  it("GET /equipment-assets unwraps the {assets} envelope (the EquipmentAssetPage register list)", async () => {
    const { status, json } = await http("GET", "/api/v1/erp/equipment-assets");
    expect(status).toBe(200);
    expect(Array.isArray(json.data.assets)).toBe(true);
    expect(json.data.assets[0].id).toBe("AS-1");
  });

  it("POST /asset-due-calibrations surfaces {due} (the calibration-due panel)", async () => {
    const { status, json } = await http("POST", "/api/v1/erp/asset-due-calibrations", { days_ahead: 30 });
    expect(status).toBe(200);
    expect(Array.isArray(json.data.due)).toBe(true);
    expect(json.data.due[0].asset_id).toBe("AS-1");
  });

  it("GET /asset-depreciation/:id forwards the path param as asset_id", async () => {
    calls.length = 0;
    const { status, json } = await http("GET", "/api/v1/erp/asset-depreciation/AS-42");
    expect(status).toBe(200);
    const c = calls.find((x) => x.action === "asset_depreciation_schedule");
    expect(c?.params.asset_id).toBe("AS-42");
    expect(Array.isArray(json.data.schedule)).toBe(true);
  });

  it("GET /maintenance-work-orders (HYPHEN path) is wired to the same adapted work-order list", async () => {
    calls.length = 0;
    const { status, json } = await http("GET", "/api/v1/erp/maintenance-work-orders");
    expect(status).toBe(200);
    // The hyphen path (PreventiveMaintenancePage) reuses listMaintenanceWorkOrders -> pm_work_order_list + adapt.
    expect(calls.some((c) => c.action === "pm_work_order_list")).toBe(true);
    expect(Array.isArray(json.orders)).toBe(true);
    expect(json.orders[0].asset_id).toBe("VMC-01");
  });

  it("POST /maintenance-work-orders/complete maps the FE wo_id -> work_order_id (the dispatcher reads work_order_id)", async () => {
    // The FE maintenanceWorkOrderComplete() sends {wo_id, labor_hours, notes}; pm_work_order_complete reads
    // params.work_order_id. Without the rename, completeWorkOrder(undefined) throws on every click. Teeth: a
    // revert to forwarding the body raw makes work_order_id undefined and FAILS this.
    calls.length = 0;
    const { status, json } = await http("POST", "/api/v1/erp/maintenance-work-orders/complete",
      { wo_id: "WO-9", labor_hours: 2, notes: "done" });
    expect(status).toBe(200);
    const c = calls.find((x) => x.action === "pm_work_order_complete");
    expect(c?.params.work_order_id).toBe("WO-9"); // renamed from wo_id
    expect(c?.params.labor_hours).toBe(2);
    expect(json.data.work_order.status).toBe("complete");
  });

  it("POST /asset-register + /asset-transfer forward the body to the asset engine (bare-object returns)", async () => {
    calls.length = 0;
    const reg = await http("POST", "/api/v1/erp/asset-register", { name: "Mill-5", category: "machine" });
    expect(reg.status).toBe(200);
    expect(calls.some((c) => c.action === "asset_register")).toBe(true);
    expect(reg.json.data.name).toBe("Mill-5"); // bare engine object surfaced at data (r.data ?? r)
    calls.length = 0;
    const xfer = await http("POST", "/api/v1/erp/asset-transfer", { asset_id: "AS-1", location: "Cell 7" });
    expect(xfer.status).toBe(200);
    const c = calls.find((x) => x.action === "asset_transfer");
    expect(c?.params.asset_id).toBe("AS-1"); // route renames the path-free asset_id through (POST body)
    expect(xfer.json.data.location).toBe("Cell 7");
  });
});
