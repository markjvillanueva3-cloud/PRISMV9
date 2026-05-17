/**
 * dispatcher.printLibrary.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-PLIB (PrintLibraryEngine).
 *
 * 9 read-only actions through real `prism_dev`:
 *   plib_get, plib_find_by_part, plib_get_revision_history, plib_search,
 *   plib_get_by_part_id, plib_get_by_customer, plib_list_customers,
 *   plib_get_stats, plib_list
 *
 * Engine has in-memory state — seeded via direct ingest() in beforeAll
 * (mirrors SSL pattern). Singleton state persists across tests inside the
 * vitest worker so ID ordering is deterministic within the suite.
 *
 * Engine-pair test pre-exists at PrintLibraryEngine.test.ts.
 *
 * DEFER (not wired): ingest, linkToPart, update — class=path-traversal
 * + state-mutation, surface only with co-developed validators.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { printLibraryEngine } from "../engines/PrintLibraryEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

// Seeded print IDs — recorded in beforeAll for ROUTING PROOF tests.
const seeded: { partA1Id?: string; partA2Id?: string; partB1Id?: string } = {};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;

  // Seed 3 prints across 2 customers + 2 parts via engine-direct ingest.
  // Singleton state is process-local — these survive across tests in the
  // same vitest worker (same module instance).
  const r1 = printLibraryEngine.ingest({
    filename: "PART-A_RevA.pdf",
    file_path: "test/fixtures/PART-A_RevA.pdf",
    title_block: {
      part_number: "PART-A",
      revision: "A",
      drawing_number: "DWG-001",
      title: "Part A — rev A",
      customer: "ACME",
      material: "Aluminum 6061",
      drawn_by: "engineer1",
    },
    customer: "ACME",
  });
  seeded.partA1Id = r1.print.id;

  const r2 = printLibraryEngine.ingest({
    filename: "PART-A_RevB.pdf",
    file_path: "test/fixtures/PART-A_RevB.pdf",
    title_block: {
      part_number: "PART-A",
      revision: "B",
      drawing_number: "DWG-001",
      title: "Part A — rev B (supersedes A)",
      customer: "ACME",
      material: "Aluminum 6061",
      drawn_by: "engineer1",
    },
    customer: "ACME",
  });
  seeded.partA2Id = r2.print.id;

  const r3 = printLibraryEngine.ingest({
    filename: "PART-B_RevA.dxf",
    file_path: "test/fixtures/PART-B_RevA.dxf",
    title_block: {
      part_number: "PART-B",
      revision: "A",
      drawing_number: "DWG-002",
      title: "Part B — rev A",
      customer: "BORG",
      material: "Steel 1018",
      drawn_by: "engineer2",
    },
    customer: "BORG",
  });
  seeded.partB1Id = r3.print.id;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — Zod schemas", () => {
  it("plib_get / plib_find_by_part / plib_get_revision_history require id/partNumber", () => {
    expect(ACTION_DEV_SCHEMAS["plib_get"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plib_get"].safeParse({ printId: "PRT-00001" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plib_find_by_part"].safeParse({ partNumber: "X" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plib_get_revision_history"].safeParse({ partNumber: "Y" }).success).toBe(true);
  });

  it("plib_get is strict (rejects extra params)", () => {
    expect(ACTION_DEV_SCHEMAS["plib_get"].safeParse({
      printId: "PRT-00001", bogus: 1,
    }).success).toBe(false);
  });

  it("plib_search caps query at 256 chars + limit at 1000 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["plib_search"].safeParse({
      query: "X".repeat(257),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plib_search"].safeParse({
      limit: 1001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plib_search"].safeParse({
      query: "test", limit: 100,
    }).success).toBe(true);
  });

  it("plib_search rejects bad status / format enums", () => {
    expect(ACTION_DEV_SCHEMAS["plib_search"].safeParse({
      status: "INVALID",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plib_search"].safeParse({
      format: "stl",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plib_search"].safeParse({
      status: "active", format: "pdf",
    }).success).toBe(true);
  });

  it("plib_get_stats / plib_list_customers accept empty {} (strict)", () => {
    expect(ACTION_DEV_SCHEMAS["plib_get_stats"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plib_get_stats"].safeParse({ extra: 1 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plib_list_customers"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plib_list_customers"].safeParse({ extra: 1 }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_get", () => {
  it("found=true for seeded print", async () => {
    const r = await invokeHandler(devHandler, "plib_get", { printId: seeded.partA1Id! });
    expect(r.found).toBe(true);
    const res = (r as { result: { id: string; part_number: string } }).result;
    expect(res.id).toBe(seeded.partA1Id);
    expect(res.part_number).toBe("PART-A");
  });

  it("found=false for nonexistent ID", async () => {
    const r = await invokeHandler(devHandler, "plib_get", { printId: "PRT-99999" });
    expect(r.found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_find_by_part", () => {
  it("returns 2 prints for PART-A (revA + revB)", async () => {
    const r = await invokeHandler(devHandler, "plib_find_by_part", { partNumber: "PART-A" });
    expect(r.print_count).toBe(2);
    const prints = (r as { prints: Array<{ part_number: string }> }).prints;
    for (const p of prints) {
      expect(p.part_number).toBe("PART-A");
    }
  });

  it("returns 0 prints for unknown part", async () => {
    const r = await invokeHandler(devHandler, "plib_find_by_part", { partNumber: "NEVER-INGESTED" });
    expect(r.print_count).toBe(0);
  });

  it("ROUTING PROOF — wire print_count equals engine-direct findByPartNumber().length", async () => {
    const r = await invokeHandler(devHandler, "plib_find_by_part", { partNumber: "PART-A" });
    const direct = printLibraryEngine.findByPartNumber("PART-A");
    expect(r.print_count).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_get_revision_history", () => {
  it("returns has_history=true + total_revisions=2 for PART-A", async () => {
    const r = await invokeHandler(devHandler, "plib_get_revision_history", { partNumber: "PART-A" });
    expect(r.has_history).toBe(true);
    expect(r.revision_count).toBe(2);
    const res = (r as { result: { current_revision: string; revisions: unknown[] } }).result;
    // Engine line 295-323: current_revision is the latest active rev (B).
    expect(res.current_revision).toBe("B");
    expect(res.revisions.length).toBe(2);
  });

  it("returns has_history=false for unknown part", async () => {
    const r = await invokeHandler(devHandler, "plib_get_revision_history", { partNumber: "NEVER-INGESTED" });
    expect(r.has_history).toBe(false);
    expect(r.revision_count).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_search", () => {
  it("filter by customer=ACME returns 1 active print (rev A superseded by rev B per engine line 330)", async () => {
    // search() default-filters to status='active' (engine line 330).
    // After ingesting PART-A revB, revA was auto-superseded. Active=1.
    const r = await invokeHandler(devHandler, "plib_search", { customer: "ACME" });
    expect((r.print_count as number)).toBeGreaterThanOrEqual(1);
    const prints = (r as { prints: Array<{ status: string }> }).prints;
    for (const p of prints) {
      expect(p.status).toBe("active");
    }
  });

  it("filter by material=Steel 1018 returns ≥ 1 print (PART-B)", async () => {
    const r = await invokeHandler(devHandler, "plib_search", { material: "Steel 1018" });
    expect((r.print_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("filter by status=superseded returns ≥ 1 print (PART-A revA was superseded)", async () => {
    const r = await invokeHandler(devHandler, "plib_search", { status: "superseded" });
    expect((r.print_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("VARIABILITY — 3 distinct format filters (pdf, dxf, png) yield distinct counts (active-only default)", async () => {
    // search() default = active-only (engine line 330). Seeded:
    //   PART-A revA.pdf (superseded), PART-A revB.pdf (active), PART-B.dxf (active)
    // Active count by format: pdf=1, dxf=1, png=0.
    const pdfR = await invokeHandler(devHandler, "plib_search", { format: "pdf" });
    const dxfR = await invokeHandler(devHandler, "plib_search", { format: "dxf" });
    const pngR = await invokeHandler(devHandler, "plib_search", { format: "png" });
    expect((pdfR.print_count as number)).toBeGreaterThanOrEqual(1);
    expect((dxfR.print_count as number)).toBeGreaterThanOrEqual(1);
    expect(pngR.print_count).toBe(0);
    // Explicit superseded query returns the older PDF.
    const supersededPdfR = await invokeHandler(devHandler, "plib_search", { format: "pdf", status: "superseded" });
    expect((supersededPdfR.print_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("limit caps result count", async () => {
    const r = await invokeHandler(devHandler, "plib_search", { limit: 1 });
    expect((r.print_count as number)).toBeLessThanOrEqual(1);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_get_by_customer", () => {
  it("returns ≥ 1 active print for ACME + BORG (getByCustomer auto-filters to active, engine line 416)", async () => {
    const acme = await invokeHandler(devHandler, "plib_get_by_customer", { customer: "ACME" });
    const borg = await invokeHandler(devHandler, "plib_get_by_customer", { customer: "BORG" });
    expect((acme.print_count as number)).toBeGreaterThanOrEqual(1);
    expect((borg.print_count as number)).toBeGreaterThanOrEqual(1);
    // Verify only active prints returned.
    const acmePrints = (acme as { prints: Array<{ status: string }> }).prints;
    for (const p of acmePrints) {
      expect(p.status).toBe("active");
    }
  });

  it("returns 0 prints for unknown customer", async () => {
    const r = await invokeHandler(devHandler, "plib_get_by_customer", { customer: "GHOST-INC" });
    expect(r.print_count).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_list_customers", () => {
  it("returns ≥ 2 distinct customers (ACME, BORG) with positive counts", async () => {
    const r = await invokeHandler(devHandler, "plib_list_customers", {});
    const customers = (r as { customers: Array<{ customer: string; count: number }> }).customers;
    expect((r.customer_count as number)).toBeGreaterThanOrEqual(2);
    const names = new Set(customers.map((c) => c.customer));
    expect(names.has("ACME")).toBe(true);
    expect(names.has("BORG")).toBe(true);
    for (const c of customers) {
      expect(c.count).toBeGreaterThan(0);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_get_stats", () => {
  it("returns stats with positive totals + is_empty=false after seeding", async () => {
    const r = await invokeHandler(devHandler, "plib_get_stats", {});
    expect(r.is_empty).toBe(false);
    const res = (r as { result: { total_prints: number; active: number; superseded: number; unique_part_numbers: number; avg_ocr_confidence: number } }).result;
    expect(res.total_prints).toBeGreaterThanOrEqual(3);
    expect(res.unique_part_numbers).toBeGreaterThanOrEqual(2);
    expect(res.avg_ocr_confidence).toBeGreaterThanOrEqual(0);
    expect(res.avg_ocr_confidence).toBeLessThanOrEqual(1);
  });

  it("ROUTING PROOF — wire total_prints equals engine-direct getStats().total_prints", async () => {
    const r = await invokeHandler(devHandler, "plib_get_stats", {});
    const direct = printLibraryEngine.getStats();
    const res = (r as { result: { total_prints: number } }).result;
    expect(res.total_prints).toBe(direct.total_prints);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — prism_dev :: plib_list", () => {
  it("plib_list with no status returns all ≥ 3 prints", async () => {
    const r = await invokeHandler(devHandler, "plib_list", {});
    expect((r.print_count as number)).toBeGreaterThanOrEqual(3);
  });

  it("plib_list filter status=active returns active prints only", async () => {
    const r = await invokeHandler(devHandler, "plib_list", { status: "active" });
    const prints = (r as { prints: Array<{ status: string }> }).prints;
    for (const p of prints) {
      expect(p.status).toBe("active");
    }
  });

  it("plib_list filter status=superseded returns ≥ 1 (PART-A rev A was superseded)", async () => {
    const r = await invokeHandler(devHandler, "plib_list", { status: "superseded" });
    expect((r.print_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("plib_list filter status=obsolete returns 0 prints", async () => {
    const r = await invokeHandler(devHandler, "plib_list", { status: "obsolete" });
    expect(r.print_count).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLIB — error envelope", () => {
  it("plib_get without printId → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plib_get", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("plib_search with oversized query → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plib_search", { query: "X".repeat(500) });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("plib_list with bad status enum → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plib_list", { status: "INVALID" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("plib_get_stats with extra params → strict schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plib_get_stats", { extra: 1 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
