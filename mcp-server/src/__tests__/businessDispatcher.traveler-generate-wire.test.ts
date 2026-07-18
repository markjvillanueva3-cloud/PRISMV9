/**
 * businessDispatcher.traveler-generate-wire.test.ts
 *
 * QUOTING-TRAVELER round-trip wire test for the auto-generated print->shipping
 * traveler + per-department checklist actions through prism_business. Invokes
 * THROUGH the dispatcher (action enum + lazy import + switch case + slimResponse
 * envelope), not the engine singletons directly -- so the wiring is proven
 * coherent. Engine logic is independently covered by
 * travelerGenerationOrchestrator.test.ts + jobChecklist.test.ts.
 *
 * NOTE: prism_business returns a slimResponse {type:"text", text} envelope with
 * no content[] -- the call() helper peels it (the recurring envelope class).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerBusinessDispatcher(fakeServer as any);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) text = r.content[0].text;
  else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") text = r.text;
  if (text) { try { return JSON.parse(text); } catch { /* fall through */ } }
  return r;
}

const PART = {
  job_id: "WIRE-JOB-1",
  part_number: "WIRE-PART-1",
  customer: "ALCOA",
  material_iso_group: "P",
  features: [
    { id: "p1", type: "pocket", dimensions: { width_mm: 40, length_mm: 40, depth_mm: 10 } },
    { id: "b1", type: "bore", dimensions: { diameter_mm: 20, depth_mm: 25 }, tolerance_mm: 0.008 },
  ],
  stock: { x_mm: 80, y_mm: 80, z_mm: 20 },
  batch_size: 25,
  quoted_finish: "anodize",
};

describe("prism_business traveler_generate + checklist wire (QUOTING-TRAVELER)", () => {
  let handler: Handler;
  beforeAll(async () => { handler = await createServer().handler; });

  it("traveler_generate: part spec -> full print->shipping traveler with dept/role/checklist", async () => {
    const t = await call(handler, "traveler_generate", PART);
    expect(t.job_id).toBe("WIRE-JOB-1");
    expect(Array.isArray(t.steps)).toBe(true);
    expect(t.steps.length).toBeGreaterThan(5);
    // first = programming, last = shipping
    expect(t.steps[0].department).toBe("programming");
    expect(t.steps[t.steps.length - 1].department).toBe("shipping");
    // data-driven: ground bore + anodize finish present
    expect(t.departments).toContain("grinding");
    expect(t.departments).toContain("finishing");
    // every step carries a checklist
    expect(t.steps.every((s: any) => Array.isArray(s.checklist) && s.checklist.length > 0)).toBe(true);
  });

  it("traveler_checklist_get: returns the seeded checklist after generate (state persisted across actions)", async () => {
    // generate seeds the checklist store; a subsequent get must see it.
    await call(handler, "traveler_generate", { ...PART, job_id: "WIRE-JOB-2" });
    const cl = await call(handler, "traveler_checklist_get", { job_id: "WIRE-JOB-2" });
    expect(cl.job_id).toBe("WIRE-JOB-2");
    expect(cl.total_required).toBeGreaterThan(0);
    expect(cl.total_required_checked).toBe(0);
    expect(cl.pct_complete).toBe(0);
  });

  it("traveler_checklist_check: checks an item through the dispatcher + roll-up moves", async () => {
    await call(handler, "traveler_generate", { ...PART, job_id: "WIRE-JOB-3" });
    const cl = await call(handler, "traveler_checklist_get", { job_id: "WIRE-JOB-3" });
    const machStep = cl.steps.find((s: any) => s.department === "machining");
    const item = machStep.items.find((i: any) => i.required);
    const after = await call(handler, "traveler_checklist_check", {
      job_id: "WIRE-JOB-3",
      step_seq: machStep.step_seq,
      item_id: item.id,
      employee_id: "EMP-W",
      employee_department: "machining",
      employee_role: "operator",
    });
    expect(after.required_checked).toBe(1);
    expect(after.items.find((i: any) => i.id === item.id).checked).toBe(true);
  });

  it("traveler_checklist_check: SoD violation surfaces as a dispatcher error", async () => {
    await call(handler, "traveler_generate", { ...PART, job_id: "WIRE-JOB-4" });
    const cl = await call(handler, "traveler_checklist_get", { job_id: "WIRE-JOB-4" });
    const machStep = cl.steps.find((s: any) => s.department === "machining");
    const item = machStep.items.find((i: any) => i.required);
    const r = await call(handler, "traveler_checklist_check", {
      job_id: "WIRE-JOB-4",
      step_seq: machStep.step_seq,
      item_id: item.id,
      employee_id: "SHIP-W",
      employee_department: "shipping",
      employee_role: "operator",
    });
    // dispatcher surfaces engine errors as {success:false, error} (not a throw)
    const err = JSON.stringify(r).toLowerCase();
    expect(err).toMatch(/cannot check items on a 'machining'|success.*false|error/);
  });

  it("traveler_checklist_uncheck + step_complete round-trip through the dispatcher", async () => {
    await call(handler, "traveler_generate", { ...PART, job_id: "WIRE-JOB-5" });
    const cl = await call(handler, "traveler_checklist_get", { job_id: "WIRE-JOB-5" });
    const machStep = cl.steps.find((s: any) => s.department === "machining");
    const required = machStep.items.filter((i: any) => i.required);
    // check all required items
    for (const it of required) {
      await call(handler, "traveler_checklist_check", {
        job_id: "WIRE-JOB-5", step_seq: machStep.step_seq, item_id: it.id,
        employee_id: "EMP-W", employee_department: "machining", employee_role: "operator",
      });
    }
    const sc = await call(handler, "traveler_checklist_step_complete", { job_id: "WIRE-JOB-5", step_seq: machStep.step_seq });
    expect(sc.complete).toBe(true);
    // uncheck one -> no longer complete
    await call(handler, "traveler_checklist_uncheck", {
      job_id: "WIRE-JOB-5", step_seq: machStep.step_seq, item_id: required[0].id,
      employee_id: "EMP-W", employee_department: "machining", employee_role: "operator",
    });
    const sc2 = await call(handler, "traveler_checklist_step_complete", { job_id: "WIRE-JOB-5", step_seq: machStep.step_seq });
    expect(sc2.complete).toBe(false);
  });
});
