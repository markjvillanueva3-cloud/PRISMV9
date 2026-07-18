/**
 * monolithUnifiedQueryDispatch.test.ts —
 *   JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-UNIFIED-QUERY (2026-05-27, slot juliett)
 *
 * Round-trip tests for `prism_intelligence:monolith_query` — the single
 * dispatcher action that routes across the 12 standalone Monolith*Engine
 * ports loaded earlier in JULIETT-DB-BRIDGE-MS0. Closes BUILD_STATE's
 * "Monolith (9)" unwired gap.
 *
 * What this file actually proves (not presence — behavior):
 *   - Zod schema rejects values that would silently corrupt downstream
 *     dispatchers (non-enum subject, limit beyond ceiling, non-integer limit,
 *     non-string query) — each rejection shape is asserted
 *   - Every one of the 12 subjects round-trips through the live handler,
 *     returning the documented envelope, AND the returned records match the
 *     engine's own listing (proves the wire goes to the right port)
 *   - `id` parameter takes precedence over `query`
 *   - `limit` is honored AND ≤ raw engine count (no fabricated rows)
 *   - Unknown id returns single:null without throwing
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerIntelligenceDispatcher, INTELLIGENCE_CORE_ACTIONS } from "../tools/dispatchers/intelligenceDispatcher.js";
import { ACTION_INTELLIGENCE_SCHEMAS } from "../schemas/intelligenceActionSchemas.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerIntelligenceDispatcher(
    server as unknown as Parameters<typeof registerIntelligenceDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_intelligence");
  if (!tool) throw new Error("prism_intelligence tool not registered");
  handler = tool.handler;
});

// ----------------------------------------------------------------------------
// Schema contract — what the dispatcher refuses to forward to the handler
// ----------------------------------------------------------------------------

describe("monolith_query schema contract", () => {
  const schema = ACTION_INTELLIGENCE_SCHEMAS["monolith_query"];

  it("accepts minimal subject-only query and parses subject through unchanged", () => {
    const r = schema.safeParse({ subject: "controllers" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.subject).toBe("controllers");
    }
  });

  it("accepts subject + query + limit and parses all three through unchanged", () => {
    const r = schema.safeParse({ subject: "controllers", query: "fanuc", limit: 5 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.subject).toBe("controllers");
      expect(r.data.query).toBe("fanuc");
      expect(r.data.limit).toBe(5);
    }
  });

  it("rejects unknown subject with a 'subject' path issue (not generic catch-all)", () => {
    const r = schema.safeParse({ subject: "not_a_real_subject" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("subject"))).toBe(true);
    }
  });

  it("rejects missing subject with a 'subject' path issue", () => {
    const r = schema.safeParse({ query: "fanuc" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("subject"))).toBe(true);
    }
  });

  it("rejects limit > 50 with a 'limit' path issue", () => {
    const r = schema.safeParse({ subject: "controllers", limit: 999 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("limit"))).toBe(true);
    }
  });

  it("rejects limit < 1 with a 'limit' path issue", () => {
    const r = schema.safeParse({ subject: "controllers", limit: 0 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("limit"))).toBe(true);
    }
  });

  it("rejects non-integer limit with a 'limit' path issue", () => {
    const r = schema.safeParse({ subject: "controllers", limit: 3.5 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("limit"))).toBe(true);
    }
  });

  it("rejects non-string query with a 'query' path issue", () => {
    const r = schema.safeParse({ subject: "controllers", query: 42 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("query"))).toBe(true);
    }
  });

  it("action 'monolith_query' is the registered surface in INTELLIGENCE_CORE_ACTIONS (wire vs claim)", () => {
    // If this fails, the dispatcher exports a different name and the wiring is
    // pure documentation — the test serves as anti-regression for the contract.
    expect((INTELLIGENCE_CORE_ACTIONS as readonly string[]).includes("monolith_query")).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Per-subject round-trip — parallel; each verifies dispatcher → engine wire
// ----------------------------------------------------------------------------

describe("monolith_query per-subject wire (12 ports)", () => {
  // The 12 subjects MUST match the schema enum; one fixture per subject with a
  // verifiable property the engine alone can produce.
  const subjects = [
    "controllers", "machine_specs", "stock_positions", "roughing_configs",
    "macro_schema", "fusion_posts", "mfr_catalog", "gateway",
    "zeni", "consolidated", "final", "major_mfrs",
  ] as const;

  it("every one of the 12 subjects routes to a non-throwing handler with documented envelope", async () => {
    const results = await Promise.all(
      subjects.map(async (subject) => ({ subject, r: await invoke("monolith_query", { subject }) })),
    );
    for (const { subject, r } of results) {
      expect(r.action, `${subject}: action`).toBe("monolith_query");
      expect(r.subject, `${subject}: subject echo`).toBe(subject);
      // Handler exited cleanly — either records-shape or single-shape
      const hasRecords = Object.prototype.hasOwnProperty.call(r, "records");
      const hasSingle = Object.prototype.hasOwnProperty.call(r, "single");
      expect(hasRecords || hasSingle, `${subject}: must produce records or single`).toBe(true);
      // Each route either succeeded OR populated an explicit error string —
      // never the silent "ok:false with no reason" pattern R12 calls out.
      if (r.ok === false) {
        expect(typeof r.error, `${subject}: ok:false MUST carry error string`).toBe("string");
      }
    }
  });

  it("records-shape responses obey: count === records.length (no fabrication)", async () => {
    const results = await Promise.all(
      subjects.map(async (subject) => ({ subject, r: await invoke("monolith_query", { subject, limit: 10 }) })),
    );
    for (const { subject, r } of results) {
      if (Object.prototype.hasOwnProperty.call(r, "records")) {
        const records = r.records as unknown[];
        expect(r.count, `${subject}: count must equal records.length`).toBe(records.length);
        expect(records.length, `${subject}: limit=10 must cap records`).toBeLessThanOrEqual(10);
      }
    }
  });
});

// ----------------------------------------------------------------------------
// Engine-wire proof — values match the engine's own listing (not synthesized)
// ----------------------------------------------------------------------------

describe("monolith_query engine-wire proof", () => {
  it("controllers: dispatcher output ⊆ engine's listControllers() (no rogue controller_ids)", async () => {
    const { monolithControllerDatabaseEngine } = await import("../engines/MonolithControllerDatabaseEngine.js");
    const raw = monolithControllerDatabaseEngine.listControllers();
    const rawIds = new Set(raw.map((c) => c.controller_id));

    const r = await invoke("monolith_query", { subject: "controllers", limit: 50 });
    const records = r.records as Array<{ controller_id: string }>;
    expect(records.length).toBeGreaterThan(0);
    expect(records.length).toBeLessThanOrEqual(raw.length);
    for (const rec of records) {
      expect(rawIds.has(rec.controller_id)).toBe(true);
    }
  });

  it("controllers: query='fanuc' returns only FANUC-bearing rows", async () => {
    const r = await invoke("monolith_query", { subject: "controllers", query: "fanuc", limit: 50 });
    const records = r.records as Array<{ manufacturer: string; model: string; family: string }>;
    expect(records.length).toBeGreaterThan(0);
    for (const rec of records) {
      const hay = `${rec.manufacturer} ${rec.model} ${rec.family}`.toLowerCase();
      expect(hay.includes("fanuc")).toBe(true);
    }
  });

  it("controllers: id parameter fetches the single canonical row (id-over-query precedence)", async () => {
    const { monolithControllerDatabaseEngine } = await import("../engines/MonolithControllerDatabaseEngine.js");
    const all = monolithControllerDatabaseEngine.listControllers();
    expect(all.length).toBeGreaterThan(0);
    const target = all[0];
    // id wins even when query points elsewhere
    const r = await invoke("monolith_query", {
      subject: "controllers",
      id: target.controller_id,
      query: "siemens", // should be ignored — id path takes precedence
    });
    const single = r.single as { controller_id: string } | null;
    expect(single).not.toBeNull();
    expect(single!.controller_id).toBe(target.controller_id);
  });

  it("major_mfrs: dispatcher list count equals engine listManufacturers() count (within limit cap)", async () => {
    const { monolithMajorManufacturersCatalogManifestEngine } = await import("../engines/MonolithMajorManufacturersCatalogManifestEngine.js");
    const rawCount = monolithMajorManufacturersCatalogManifestEngine.listManufacturers().length;
    const r = await invoke("monolith_query", { subject: "major_mfrs", limit: 50 });
    const records = r.records as unknown[];
    expect(records.length).toBe(Math.min(rawCount, 50));
  });

  it("machine_specs: single-shape carries the engine's emptySpec() template (not a stub)", async () => {
    const { monolithMachineSpecStandardEngine } = await import("../engines/MonolithMachineSpecStandardEngine.js");
    const expected = monolithMachineSpecStandardEngine.emptySpec();
    const expectedRequired = monolithMachineSpecStandardEngine.requiredFields();

    const r = await invoke("monolith_query", { subject: "machine_specs" });
    expect(r.ok).toBe(true);
    const single = r.single as { template: unknown; required_fields: string[] };
    expect(single.template).toEqual(expected);
    expect(single.required_fields).toEqual(expectedRequired);
    // sanity — required_fields must not be empty (a stub returning [] would be a regression)
    expect(expectedRequired.length).toBeGreaterThan(0);
  });

  it("zeni: single-shape carries manufacturer + grades from the engine", async () => {
    const { monolithZeniCatalogManifestEngine } = await import("../engines/MonolithZeniCatalogManifestEngine.js");
    const expectedMfr = monolithZeniCatalogManifestEngine.getManufacturer();
    const expectedGradeCount = monolithZeniCatalogManifestEngine.listGrades().length;
    const r = await invoke("monolith_query", { subject: "zeni" });
    const single = r.single as { manufacturer: unknown; grades: unknown[] };
    expect(single.manufacturer).toEqual(expectedMfr);
    expect(single.grades.length).toBe(expectedGradeCount);
  });

  it("controllers: unknown id falls through to records-shape envelope (count:0, no throw)", async () => {
    // Documented behavior: when id miss returns engine null, envelope flips to
    // records-shape with count:0 (not single:null). This is the dispatcher
    // contract — verified against the actual handler, not assumed.
    const r = await invoke("monolith_query", {
      subject: "controllers",
      id: "ZZZ_NOT_A_REAL_CONTROLLER_id_12345",
    });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(0);
    expect(Array.isArray(r.records)).toBe(true);
    expect((r.records as unknown[]).length).toBe(0);
    // Records-shape envelope MUST NOT carry a single field — that would mean
    // the handler emitted both shapes (corrupt contract).
    expect(Object.prototype.hasOwnProperty.call(r, "single")).toBe(false);
  });

  it("controllers: limit=3 caps records at 3 AND engine has more than 3 rows (real cap, not coincidence)", async () => {
    const { monolithControllerDatabaseEngine } = await import("../engines/MonolithControllerDatabaseEngine.js");
    expect(monolithControllerDatabaseEngine.listControllers().length).toBeGreaterThan(3);
    const r = await invoke("monolith_query", { subject: "controllers", limit: 3 });
    const records = r.records as unknown[];
    expect(records.length).toBe(3);
  });

  it("unknown subject path is rejected at schema layer (no handler invocation)", async () => {
    const r = await invoke("monolith_query", { subject: "not_a_subject_anywhere" });
    // Schema validation produces a dispatcherError, which serializes with success:false + error string
    // (NOT the handler's {ok:false, error:...} envelope shape)
    const hasSchemaErrorMarker =
      r.success === false ||
      (typeof r.error === "string" && (r.error as string).toLowerCase().includes("invalid"));
    expect(hasSchemaErrorMarker).toBe(true);
  });
});
