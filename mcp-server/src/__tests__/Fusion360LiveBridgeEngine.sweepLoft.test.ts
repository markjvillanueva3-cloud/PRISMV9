import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Fusion360LiveBridgeEngine } from "../engines/Fusion360LiveBridgeEngine.js";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http";

// ── Mock HTTP server: records the last (path, body) and replies per-route ──
//
// Verifies the U-CADFL-SWEEP-LOFT bridge contract: that sweep()/loft()/
// createSketch({offset_mm}) POST to the correct dedicated routes with the
// exact payload keys the add-in handlers read, and that the server's
// OperationResult is surfaced unchanged. These are real contract assertions
// (route string + payload field values + response mapping), not presence-only
// checks. The mock stands in for the Fusion add-in (an external process that
// unit tests must mock per src/__tests__/CLAUDE.md), NOT for the SUT — the SUT
// is the bridge client's validation + payload construction + route selection.

let mockServer: Server;
let lastPath = "";
let lastBody: Record<string, unknown> = {};

function startMockServer(responseByPath: Record<string, Record<string, unknown>>): Promise<number> {
  return new Promise((resolve) => {
    mockServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";
      req.on("data", (c: Buffer) => { body += c.toString(); });
      req.on("end", () => {
        lastPath = (req.url ?? "/").split("?")[0];
        lastBody = body ? JSON.parse(body) as Record<string, unknown> : {};
        const payload = responseByPath[lastPath];
        if (payload && req.method === "POST") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(payload));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ ok: false, error: `unknown_route: ${lastPath}` }));
        }
      });
    });
    mockServer.listen(0, "127.0.0.1", () => {
      const addr = mockServer.address();
      if (addr && typeof addr !== "string") resolve(addr.port);
    });
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((resolve) => { mockServer ? mockServer.close(() => resolve()) : resolve(); });
}

describe("Fusion360LiveBridgeEngine — sweep / loft / offset-plane sketch (U-CADFL-SWEEP-LOFT)", () => {
  let engine: Fusion360LiveBridgeEngine;

  // ── Input validation (rejects BEFORE any network call) ─────────────
  describe("sweep input validation", () => {
    beforeEach(() => { engine = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999"); });

    it("rejects non-finite twist_deg", async () => {
      const r = await engine.sweep({ twist_deg: Number.NaN });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/twist_deg must be a finite number/);
    });

    it("rejects non-finite taper_deg", async () => {
      const r = await engine.sweep({ taper_deg: Infinity });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/taper_deg must be a finite number/);
    });

    it("rejects negative profile_index", async () => {
      const r = await engine.sweep({ profile_index: -1 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/profile_index must be a non-negative integer/);
    });
  });

  describe("loft input validation", () => {
    beforeEach(() => { engine = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999"); });

    it("rejects fewer than 2 sections", async () => {
      const r = await engine.loft({ sections: [{ sketch_name: "A" }] });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/at least 2 entries/);
    });

    it("rejects a non-array sections payload", async () => {
      const r = await engine.loft({ sections: undefined as never });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/at least 2 entries/);
    });

    it("rejects a negative profile_index inside a section", async () => {
      const r = await engine.loft({
        sections: [{ sketch_name: "A", profile_index: 0 }, { sketch_name: "B", profile_index: -2 }],
      });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/sections\[1\]\.profile_index/);
    });
  });

  // ── End-to-end contract through the mock add-in ────────────────────
  describe("sweep dedicated-route contract", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        "/sweep": { success: true, feature_name: "Sweep1", body_count: 1 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      lastPath = ""; lastBody = {};
    });
    afterEach(async () => { await stopMockServer(); });

    it("POSTs to /sweep with the profile/path/operation/twist payload the add-in reads", async () => {
      const r = await engine.sweep({
        profile_sketch_name: "Profile",
        path_sketch_name: "Path",
        operation: "new_body",
        twist_deg: 90,
      });
      expect(lastPath).toBe("/sweep");
      expect(lastBody.profile_sketch_name).toBe("Profile");
      expect(lastBody.path_sketch_name).toBe("Path");
      expect(lastBody.operation).toBe("new_body");
      expect(lastBody.twist_deg).toBe(90);
      expect(r.success).toBe(true);
      expect(r.feature_name).toBe("Sweep1");
      expect(r.body_count).toBe(1);
    });

    it("surfaces a server-side failure unchanged (no false success)", async () => {
      await stopMockServer();
      const port = await startMockServer({
        "/sweep": { success: false, error: "path_sketch_has_no_curve" },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.sweep({ profile_sketch_name: "P", path_sketch_name: "Q" });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/path_sketch_has_no_curve/);
    });
  });

  describe("loft dedicated-route contract", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        "/loft": { success: true, feature_name: "Loft1", body_count: 1 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      lastPath = ""; lastBody = {};
    });
    afterEach(async () => { await stopMockServer(); });

    it("POSTs to /loft with ordered sections + output_type/closed flags", async () => {
      const r = await engine.loft({
        sections: [
          { sketch_name: "Bottom", profile_index: 0 },
          { sketch_name: "Top", profile_index: 0 },
        ],
        output_type: "surface",
        closed: true,
      });
      expect(lastPath).toBe("/loft");
      const sections = lastBody.sections as Array<{ sketch_name: string }>;
      expect(sections).toHaveLength(2);
      expect(sections[0].sketch_name).toBe("Bottom");
      expect(sections[1].sketch_name).toBe("Top");
      expect(lastBody.output_type).toBe("surface");
      expect(lastBody.closed).toBe(true);
      expect(r.success).toBe(true);
      expect(r.feature_name).toBe("Loft1");
    });
  });

  describe("offset-plane sketch contract", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        "/sketch": { success: true, sketch_name: "PRISM Sketch 2", profile_count: 1, shapes_created: 1, new_profiles: 1 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      lastPath = ""; lastBody = {};
    });
    afterEach(async () => { await stopMockServer(); });

    it("forwards offset_mm so the add-in builds a stacked construction plane", async () => {
      const r = await engine.createSketch({
        plane: "XY",
        offset_mm: 25,
        shapes: [{ type: "circle", radius_mm: 10 }],
      });
      expect(lastPath).toBe("/sketch");
      expect(lastBody.plane).toBe("XY");
      expect(lastBody.offset_mm).toBe(25);
      expect(r.success).toBe(true);
    });

    it("does not emit an offset_mm key when omitted (legacy base-plane path)", async () => {
      await engine.createSketch({ plane: "XZ", shapes: [{ type: "circle", radius_mm: 5 }] });
      expect(Object.prototype.hasOwnProperty.call(lastBody, "offset_mm")).toBe(false);
      expect(lastBody.plane).toBe("XZ");
    });
  });
});
