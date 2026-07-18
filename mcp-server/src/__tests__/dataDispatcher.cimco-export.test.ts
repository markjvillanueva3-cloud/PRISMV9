/**
 * dataDispatcher — CIMCO-TOOLDB-FILL-MS0 / U-CTF-WIRE round-trip suite
 * ====================================================================
 *
 * Wires the CIMCO Edit 2026 tool-library exporter into prism_data:
 *   scripts/export-tools-to-cimco-tmlib.mjs → prism_data:cimco_toollib_export
 *
 * Tests invoke THROUGH the dispatcher (not the script directly), mirroring the
 * U-WIRE07 harness, so a broken wire (enum / schema / case / script path) fails.
 *
 * @milestone CIMCO-TOOLDB-FILL-MS0
 * @unit U-CTF-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

const EXPORT_TIMEOUT = 120000; // child node process reads tools.json + emits .tmlib

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("U-CTF-WIRE happy path — round-trip via prism_data", () => {
  it(
    "cimco_toollib_export (dry run) returns a manifest with exported cutters",
    async () => {
      const r = await call(server, "cimco_toollib_export", { dryRun: true });
      expect(r.ok).toBe(true);
      expect(r.data).toHaveProperty("exported");
      expect(typeof r.data.exported).toBe("number");
      expect(r.data.exported as number).toBeGreaterThan(0);
      expect(r.data).toHaveProperty("files");
      expect(Array.isArray(r.data.files)).toBe(true);
      expect(r.data.store).toBe("EXTRACTED_DETAILED_TOOLS");
      expect(r.data.nativeUnits).toBe("inch"); // verified-inch store
      expect(r.data.dryRun).toBe(true);
    },
    EXPORT_TIMEOUT,
  );

  it(
    "real export writes ≥1 .tmlib library and reports per-file counts",
    async () => {
      const r = await call(server, "cimco_toollib_export", {});
      expect(r.ok).toBe(true);
      expect(r.data.outputUnits).toBe("Imperial"); // default
      const files = r.data.files as Array<{ file: string; type: string; count: number }>;
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files[0]!.count).toBeGreaterThan(0);
      // EXTRACTED_DETAILED_TOOLS is a mills corpus → EndMill library
      expect(files.some((f) => f.type === "EndMill")).toBe(true);
      // skip accounting is present (R12 — nothing silently dropped)
      expect(r.data).toHaveProperty("skipped");
    },
    EXPORT_TIMEOUT,
  );
});

describe("U-CTF-WIRE variability — output unit system", () => {
  it(
    "units=metric yields a Metric library (mm values)",
    async () => {
      const r = await call(server, "cimco_toollib_export", { units: "metric", dryRun: true });
      expect(r.ok).toBe(true);
      expect(r.data.outputUnits).toBe("Metric");
    },
    EXPORT_TIMEOUT,
  );

  it(
    "explicit native=inch + units=imperial round-trips",
    async () => {
      const r = await call(server, "cimco_toollib_export", { native: "inch", units: "imperial", dryRun: true });
      expect(r.ok).toBe(true);
      expect(r.data.nativeUnits).toBe("inch");
      expect(r.data.outputUnits).toBe("Imperial");
    },
    EXPORT_TIMEOUT,
  );
});

describe("U-CTF-WIRE schema rejection — invalid enums", () => {
  it("rejects invalid native unit", async () => {
    const r = await call(server, "cimco_toollib_export", { native: "furlongs" });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid output units", async () => {
    const r = await call(server, "cimco_toollib_export", { units: "cubits" });
    expect(r.ok).toBe(false);
  });
});

describe("U-CTF-WIRE adversarial — units-first refusal", () => {
  it(
    "unverified store without --native is refused (no 25.4× guess)",
    async () => {
      const r = await call(server, "cimco_toollib_export", { store: "NONEXISTENT_STORE_XYZ" });
      expect(r.ok).toBe(false);
      // structured error, not a crash
      expect(typeof r.data).toBe("object");
      expect("error" in r.data).toBe(true);
    },
    EXPORT_TIMEOUT,
  );
});
