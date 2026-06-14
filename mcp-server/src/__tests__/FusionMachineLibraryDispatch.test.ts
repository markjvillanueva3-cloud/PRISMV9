/**
 * FusionMachineLibraryDispatch -- round-trip THROUGH prism_cam (not the engine singleton).
 * CATALOG-APP-WIRING-MS0/U-WIRE-FUSION-MACHINE-LIB (slot:romeo).
 *
 * Proves the WIRE end-to-end: z.enum entry + case handler + engine call + filter + the
 * out_path write path, invoked via the registered prism_cam tool handler. romeo refuses
 * "wiring-without-round-trip-test" -- this is that test.
 */
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, existsSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { EXTENDED_MACHINE_CATALOG } from "../data/machine-profiles-catalog.js";
import { fusionMachineLibraryExportEngine } from "../engines/FusionMachineLibraryExportEngine.js";

// Capture the single prism_cam tool handler via a minimal mock server.
let handler: (args: { action: string; params?: Record<string, any> }) => Promise<any>;
const mockServer = {
  tool: (name: string, _desc: string, _schema: unknown, h: any) => {
    if (name === "prism_cam") handler = h;
  },
};
registerCamDispatcher(mockServer as any);

async function call(action: string, params: Record<string, any> = {}): Promise<any> {
  const res = await handler({ action, params });
  // handler returns MCP content shape: { content: [{ type:"text", text: JSON.stringify(...) }] }
  const text = res?.content?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

const tmpRoots: string[] = [];
afterAll(() => {
  for (const d of tmpRoots) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
});

describe("prism_cam:fusion_export_machine_library (dispatcher round-trip)", () => {
  it("the handler was registered (prism_cam tool exists)", () => {
    expect(typeof handler).toBe("function");
  });

  it("returns the full catalog when unfiltered (no out_path)", async () => {
    const r = await call("fusion_export_machine_library");
    expect(r.success).toBe(true);
    expect(r.machine_count).toBe(EXTENDED_MACHINE_CATALOG.length);
  });

  it("filters by brand + limit through the wire", async () => {
    const r = await call("fusion_export_machine_library", { brand: "Haas", limit: 2 });
    expect(r.success).toBe(true);
    expect(r.machine_count).toBe(2);
  });

  it("filters by machine type through the wire", async () => {
    const expectedVmc = EXTENDED_MACHINE_CATALOG.filter((m) => m.type === "VMC").length;
    const r = await call("fusion_export_machine_library", { type: "VMC" });
    expect(r.success).toBe(true);
    expect(r.machine_count).toBe(expectedVmc);
  });

  it("writes real .machine files to out_path and they re-parse correctly", async () => {
    const dir = mkdtempSync(join(tmpdir(), "prism-fusion-machine-"));
    tmpRoots.push(dir);
    const r = await call("fusion_export_machine_library", { brand: "Haas", limit: 3, out_path: dir });
    expect(r.success).toBe(true);
    expect(r.written).toBe(r.machine_count);
    expect(r.machine_count).toBe(3);

    const files = readdirSync(dir).filter((f) => f.endsWith(".machine"));
    expect(files.length).toBe(3);

    // Read one back off disk and round-trip it through the engine reader.
    const first = readFileSync(join(dir, files[0]), "utf8");
    const parsed = fusionMachineLibraryExportEngine.parseMachineXml(first);
    expect(parsed.vendor).toBe("Haas");
    expect(parsed.axes.length).toBeGreaterThan(0);
    expect(first).toContain('xmlns="http://www.hsmworks.com/xml/2009/machine"');
    expect(existsSync(join(dir, files[0]))).toBe(true);
  });
});
