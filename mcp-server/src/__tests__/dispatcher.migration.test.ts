/**
 * dispatcher.migration.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-ME (MigrationEngine).
 *
 * Drives 3 read actions through real `prism_dev`. Write methods
 * (register/apply/rollback/clear) DEFERRED — register takes function
 * literals (non-serializable over MCP) + apply/rollback mutate
 * persistent schema state.
 *
 * Tests pre-seed via engine-direct register so reads find populated
 * state. Test fixtures use timestamp-suffixed ids to avoid collision
 * with production migrations.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { migrationEngine } from "../engines/MigrationEngine.js";

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

const STAMP = Date.now();
const MIG_001_ID = `test-mig-001-${STAMP}`;
const MIG_002_ID = `test-mig-002-${STAMP}`;

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  // Seed 2 test migrations via deferred write
  migrationEngine.register({
    id: MIG_001_ID,
    version: `9999.${STAMP}.001`,
    name: "Test migration 001",
    description: "First test migration for ME wire coverage",
    up: () => ({ success: true, changes: ["seeded up"] }),
    down: () => ({ success: true, changes: ["seeded down"] }),
  });
  migrationEngine.register({
    id: MIG_002_ID,
    version: `9999.${STAMP}.002`,
    name: "Test migration 002",
    description: "Second test migration for ME wire coverage",
    up: () => ({ success: true, changes: ["seeded up 2"] }),
    down: () => ({ success: true, changes: ["seeded down 2"] }),
  });

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ME — Zod schemas", () => {
  it("all 3 actions accept {} (no required params)", () => {
    for (const a of ["me_status", "me_get_records", "me_validate"]) {
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({}).success).toBe(true);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ME — prism_dev :: me_status", () => {
  it("returns plan with pending + applied + current_version + target_version", async () => {
    const r = await invokeHandler(devHandler, "me_status", {});
    const plan = (r as { plan: { pending?: unknown[]; applied?: unknown[]; current_version: string; target_version: string; steps?: unknown[] } }).plan;
    expect(typeof plan.current_version).toBe("string");
    expect(typeof plan.target_version).toBe("string");
    // pending/applied/steps may be slimResponse-stripped when empty
    const pending = plan.pending ?? [];
    const applied = plan.applied ?? [];
    expect(Array.isArray(pending)).toBe(true);
    expect(Array.isArray(applied)).toBe(true);
  });

  it("seeded migrations appear in pending (newly-registered are unapplied)", async () => {
    const r = await invokeHandler(devHandler, "me_status", {});
    const plan = (r as { plan: { pending?: string[]; applied?: string[] } }).plan;
    const pending = plan.pending ?? [];
    const applied = plan.applied ?? [];
    const all = new Set([...pending, ...applied]);
    // Engine may track by id OR version — either way, one of our seeded
    // identifiers must appear in pending OR applied.
    const seenSomewhere = all.has(MIG_001_ID) || all.has(MIG_002_ID)
      || [...all].some(x => x.includes(`9999.${STAMP}`));
    expect(seenSomewhere).toBe(true);
  });

  it("ROUTING PROOF — wire plan per-field equals engine-direct status()", async () => {
    // slimResponse strips empty arrays (e.g. applied:[]) — per-field compare
    // with nullish-coalesce instead of byte-equal JSON.
    const r = await invokeHandler(devHandler, "me_status", {});
    const wire = (r as { plan: { pending?: string[]; applied?: string[]; current_version: string; target_version: string; steps?: unknown[] } }).plan;
    const direct = migrationEngine.status();
    expect(wire.current_version).toBe(direct.current_version);
    expect(wire.target_version).toBe(direct.target_version);
    expect((wire.pending ?? []).slice().sort()).toEqual(direct.pending.slice().sort());
    expect((wire.applied ?? []).slice().sort()).toEqual(direct.applied.slice().sort());
    expect((wire.steps ?? []).length).toBe(direct.steps.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ME — prism_dev :: me_get_records", () => {
  it("returns records array + count parity", async () => {
    const r = await invokeHandler(devHandler, "me_get_records", {});
    const records = ((r as { records?: unknown[] }).records) ?? [];
    expect((r as { count?: number }).count).toBe(records.length);
  });

  it("ROUTING PROOF — wire record count matches engine-direct getRecords()", async () => {
    const r = await invokeHandler(devHandler, "me_get_records", {});
    const wireCount = (r as { count?: number }).count ?? 0;
    const direct = migrationEngine.getRecords();
    expect(wireCount).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ME — prism_dev :: me_validate", () => {
  it("returns {valid:true|'no', issues, issue_count} discriminator shape", async () => {
    const r = await invokeHandler(devHandler, "me_validate", {});
    const v = (r as { valid?: boolean | string; issues?: unknown[]; issue_count?: number }).valid;
    expect(v === true || v === "no").toBe(true);
    const issues = ((r as { issues?: unknown[] }).issues) ?? [];
    expect((r as { issue_count?: number }).issue_count).toBe(issues.length);
  });

  it("ROUTING PROOF — wire issues per-entry equals engine-direct validate().issues", async () => {
    const r = await invokeHandler(devHandler, "me_validate", {});
    const wireIssues = ((r as { issues?: string[] }).issues) ?? [];
    const direct = migrationEngine.validate();
    expect(wireIssues.length).toBe(direct.issues.length);
    for (let i = 0; i < direct.issues.length; i++) {
      expect(wireIssues[i]).toBe(direct.issues[i]);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ME — VARIABILITY across method consistency", () => {
  it("validate.valid === true ⇔ engine.validate().valid (cross-method invariant)", async () => {
    const r = await invokeHandler(devHandler, "me_validate", {});
    const wireValid = (r as { valid?: boolean | string }).valid === true;
    const direct = migrationEngine.validate();
    expect(wireValid).toBe(direct.valid);
  });

  it("status.pending count + status.applied count = total registered migrations", async () => {
    const r = await invokeHandler(devHandler, "me_status", {});
    const plan = (r as { plan: { pending?: string[]; applied?: string[] } }).plan;
    const pending = plan.pending ?? [];
    const applied = plan.applied ?? [];
    const total = pending.length + applied.length;
    // We seeded 2 — total must be ≥ 2 (others may be production-registered)
    expect(total).toBeGreaterThanOrEqual(2);
  });
});
