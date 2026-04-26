/**
 * Integration test for PPG Master Post API routes
 * PPG-WIRE-MS0 U-PPGW04 — verifies /ppg/master/* routes wire to camDispatcher
 *
 * Tests E2E flow: Express route → callTool → camDispatcher → engine
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Router } from "express";
import { createPpgRouter } from "../../routes/ppg.js";

// Mock callTool to intercept dispatcher calls and verify wiring
const mockCallTool = vi.fn();

describe("PPG Master Post Routes E2E (U-PPGW04)", () => {
  let router: Router;

  beforeEach(() => {
    vi.clearAllMocks();
    router = createPpgRouter(mockCallTool);
  });

  // ─── Hurco V11 Route Tests ────────────────────────────────────────────

  describe("POST /master/hurco-v11", () => {
    const findHandler = () => {
      const stack = (router as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ method: string; handle: Function }> } }> }).stack;
      const layer = stack.find((l) => l.route?.path === "/master/hurco-v11");
      if (!layer?.route) throw new Error("Route /master/hurco-v11 not found");
      const postHandler = layer.route.stack.find((s) => s.method === "post");
      if (!postHandler) throw new Error("POST handler not found");
      return postHandler.handle;
    };

    it("routes to prism_cam:master_post_hurco_v11 with OD facing operation", async () => {
      const expectedGcode = "O1234\n(HURCO VMX24 - OD FACING)\nG20 G90 G40\nT01 M06\nG00 X2.0 Y0.0\nS3500 M03\nG01 Z-0.1 F10.0\nM30\n%";
      mockCallTool.mockResolvedValueOnce({
        gcode: expectedGcode,
        program_number: 1234,
        controller: "hurco_winmax",
        operations_count: 1,
      });

      const req = {
        body: {
          program_number: 1234,
          operations: [{
            operation_type: "face",
            tool_number: 1,
            spindle_rpm: 3500,
            feed_ipm: 10.0,
            depth_of_cut_inch: 0.1,
            material_iso: "P",
          }],
        },
      };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(mockCallTool).toHaveBeenCalledTimes(1);
      expect(mockCallTool).toHaveBeenCalledWith(
        "prism_cam",
        "master_post_hurco_v11",
        req.body
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          gcode: expectedGcode,
          program_number: 1234,
          controller: "hurco_winmax",
          operations_count: 1,
        },
      });
    });

    it("returns 500 with error message on dispatcher failure", async () => {
      mockCallTool.mockRejectedValueOnce(new Error("Invalid tool orientation: must be 1-9"));

      const req = { body: { operations: [{ tool_orientation: 99 }] } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: "Invalid tool orientation: must be 1-9",
      });
    });

    it("handles empty operations array gracefully", async () => {
      mockCallTool.mockResolvedValueOnce({
        gcode: "O0001\n(EMPTY PROGRAM)\nM30\n%",
        program_number: 1,
        operations_count: 0,
        warnings: ["No operations provided"],
      });

      const req = { body: { operations: [] } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({
          operations_count: 0,
          warnings: ["No operations provided"],
        }),
      });
    });
  });

  // ─── Okuma B250 Route Tests ───────────────────────────────────────────

  describe("POST /master/okuma-b250", () => {
    const findHandler = () => {
      const stack = (router as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ method: string; handle: Function }> } }> }).stack;
      const layer = stack.find((l) => l.route?.path === "/master/okuma-b250");
      if (!layer?.route) throw new Error("Route /master/okuma-b250 not found");
      const postHandler = layer.route.stack.find((s) => s.method === "post");
      if (!postHandler) throw new Error("POST handler not found");
      return postHandler.handle;
    };

    it("routes to prism_cam:master_post_okuma_b250 with OD roughing", async () => {
      const expectedGcode = "O5678\n(OKUMA LB250 - OD ROUGH)\nG21 G90\nG96 S200 M03\nG50 S3000\nT0101\nG00 X52.0 Z5.0\nG72 W2.0 R0.5\nG72 P100 Q200 U0.5 W0.1 F0.25\nM30\n%";
      mockCallTool.mockResolvedValueOnce({
        gcode: expectedGcode,
        program_number: 5678,
        controller: "okuma_osp_p300l",
        css_enabled: true,
        css_max_rpm: 3000,
      });

      const req = {
        body: {
          program_number: 5678,
          operations: [{
            operation_type: "od_rough",
            tool_number: 1,
            tool_orientation: 3,
            insert_radius_mm: 0.8,
            css_m_min: 200,
            css_max_rpm: 3000,
            feed_mm_rev: 0.25,
            depth_of_cut_mm: 2.0,
            material_iso: "P",
            start_x: 52,
            start_z: 5,
            end_x: 40,
            end_z: -80,
          }],
        },
      };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(mockCallTool).toHaveBeenCalledWith(
        "prism_cam",
        "master_post_okuma_b250",
        req.body
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({
          controller: "okuma_osp_p300l",
          css_enabled: true,
        }),
      });
    });

    it("returns 500 on negative CSS speed", async () => {
      mockCallTool.mockRejectedValueOnce(new Error("CSS speed must be positive: got -100 m/min"));

      const req = { body: { operations: [{ css_m_min: -100 }] } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: "CSS speed must be positive: got -100 m/min",
      });
    });

    it("returns 500 on invalid thread pitch", async () => {
      mockCallTool.mockRejectedValueOnce(new Error("Thread pitch 0mm is invalid"));

      const req = { body: { operations: [{ operation_type: "thread", thread_pitch_mm: 0 }] } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: "Thread pitch 0mm is invalid",
      });
    });
  });

  // ─── Mitsubishi MV1200R Route Tests ───────────────────────────────────

  describe("POST /master/mitsubishi-mv1200r", () => {
    const findHandler = () => {
      const stack = (router as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ method: string; handle: Function }> } }> }).stack;
      const layer = stack.find((l) => l.route?.path === "/master/mitsubishi-mv1200r");
      if (!layer?.route) throw new Error("Route /master/mitsubishi-mv1200r not found");
      const postHandler = layer.route.stack.find((s) => s.method === "post");
      if (!postHandler) throw new Error("POST handler not found");
      return postHandler.handle;
    };

    it("routes to prism_cam:master_post_mitsubishi_mv1200r with wire cut", async () => {
      const expectedGcode = "%\nO9001\n(MITSUBISHI MV1200R - WIRE CUT)\nG90 G17 G21\nG92 X0 Y0\nM50\nG01 X10.0 Y0.0 F100\nM02\n%";
      mockCallTool.mockResolvedValueOnce({
        gcode: expectedGcode,
        program_number: 9001,
        controller: "mitsubishi_m800v",
        wire_diameter_mm: 0.25,
        skim_cuts: 3,
      });

      const req = {
        body: {
          program_number: 9001,
          wire_diameter_mm: 0.25,
          operations: [{
            operation_type: "wire_cut",
            start_x: 0,
            start_y: 0,
            end_x: 10,
            end_y: 0,
            skim_passes: 3,
          }],
        },
      };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(mockCallTool).toHaveBeenCalledWith(
        "prism_cam",
        "master_post_mitsubishi_mv1200r",
        req.body
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({
          controller: "mitsubishi_m800v",
          wire_diameter_mm: 0.25,
          skim_cuts: 3,
        }),
      });
    });

    it("returns 500 on unsupported wire diameter", async () => {
      mockCallTool.mockRejectedValueOnce(new Error("Wire diameter 0.5mm not supported; use 0.1-0.3mm"));

      const req = { body: { wire_diameter_mm: 0.5 } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: "Wire diameter 0.5mm not supported; use 0.1-0.3mm",
      });
    });

    it("returns 500 on flushing pressure out of range", async () => {
      mockCallTool.mockRejectedValueOnce(new Error("Flushing pressure 50 bar exceeds max 20 bar"));

      const req = { body: { flushing_pressure_bar: 50 } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: "Flushing pressure 50 bar exceeds max 20 bar",
      });
    });
  });

  // ─── Auto-Route Tests ─────────────────────────────────────────────────

  describe("POST /master/auto", () => {
    const findHandler = () => {
      const stack = (router as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ method: string; handle: Function }> } }> }).stack;
      const layer = stack.find((l) => l.route?.path === "/master/auto");
      if (!layer?.route) throw new Error("Route /master/auto not found");
      const postHandler = layer.route.stack.find((s) => s.method === "post");
      if (!postHandler) throw new Error("POST handler not found");
      return postHandler.handle;
    };

    it("routes to prism_cam:master_post_by_machine and resolves hurco", async () => {
      mockCallTool.mockResolvedValueOnce({
        gcode: "O1000\nM30\n%",
        machine_matched: "hurco_vmx24",
        post_used: "hurco_v11",
        controller: "hurco_winmax",
      });

      const req = {
        body: {
          machine_model: "hurco_vmx24",
          operations: [{ operation_type: "drill", tool_number: 5 }],
        },
      };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(mockCallTool).toHaveBeenCalledWith(
        "prism_cam",
        "master_post_by_machine",
        req.body
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({
          machine_matched: "hurco_vmx24",
          post_used: "hurco_v11",
        }),
      });
    });

    it("routes to okuma for LB250 model", async () => {
      mockCallTool.mockResolvedValueOnce({
        gcode: "O2000\nG96 S180\nM30\n%",
        machine_matched: "okuma_lb250ii_m",
        post_used: "okuma_b250",
        controller: "okuma_osp_p300l",
      });

      const req = {
        body: {
          machine_model: "okuma_lb250ii_m",
          operations: [{ operation_type: "od_finish" }],
        },
      };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({
          post_used: "okuma_b250",
          controller: "okuma_osp_p300l",
        }),
      });
    });

    it("returns 500 for unknown machine model", async () => {
      mockCallTool.mockRejectedValueOnce(
        new Error("No master post found for machine: unknown_machine_xyz")
      );

      const req = { body: { machine_model: "unknown_machine_xyz" } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: "No master post found for machine: unknown_machine_xyz",
      });
    });

    it("returns 500 when machine_model is missing", async () => {
      mockCallTool.mockRejectedValueOnce(
        new Error("machine_model is required for auto-routing")
      );

      const req = { body: { operations: [] } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await findHandler()(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: "machine_model is required for auto-routing",
      });
    });
  });
});
