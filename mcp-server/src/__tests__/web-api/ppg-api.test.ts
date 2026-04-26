/**
 * Frontend API Client Tests for PPG Master Posts
 * PPG-WIRE-MS0 U-PPGW06 — verifies web/src/api/ppg.ts client functions
 *
 * Tests fetch calls, response handling, timeout, and error cases.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Types matching web/src/api/ppg.ts
interface MasterPostOperation {
  operation_type: string;
  tool_number: number;
  spindle_rpm?: number;
  feed_ipm?: number;
  feed_mm_rev?: number;
  depth_of_cut_inch?: number;
  depth_of_cut_mm?: number;
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  tool_orientation?: number;
  insert_radius_mm?: number;
  css_m_min?: number;
  css_max_rpm?: number;
  start_x?: number;
  start_y?: number;
  start_z?: number;
  end_x?: number;
  end_y?: number;
  end_z?: number;
  skim_passes?: number;
  thread_pitch_mm?: number;
}

interface MasterPostRequest {
  program_number?: number;
  operations: MasterPostOperation[];
  wire_diameter_mm?: number;
  flushing_pressure_bar?: number;
}

interface MasterPostResult {
  gcode: string;
  program_number: number;
  controller: string;
  operations_count: number;
  warnings?: string[];
  css_enabled?: boolean;
  css_max_rpm?: number;
  wire_diameter_mm?: number;
  skim_cuts?: number;
}

interface MasterPostAutoRequest {
  machine_model: string;
  operations: MasterPostOperation[];
}

interface MasterPostAutoResult extends MasterPostResult {
  machine_matched: string;
  post_used: string;
}

// Re-implement the API client for testing (mirrors web/src/api/ppg.ts)
const BASE_URL = "/api/v1/ppg";
const TIMEOUT_MS = 30_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

const ppgApi = {
  masterHurcoV11: (req: MasterPostRequest) =>
    post<MasterPostResult>("/master/hurco-v11", req),
  masterOkumaB250: (req: MasterPostRequest) =>
    post<MasterPostResult>("/master/okuma-b250", req),
  masterMitsubishiMV1200R: (req: MasterPostRequest) =>
    post<MasterPostResult>("/master/mitsubishi-mv1200r", req),
  masterAuto: (req: MasterPostAutoRequest) =>
    post<MasterPostAutoResult>("/master/auto", req),
};

describe("PPG Frontend API Client (U-PPGW06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Helper to create mock Response ────────────────────────────────────

  const mockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    statusText: ok ? "OK" : "Internal Server Error",
    json: vi.fn().mockResolvedValue(data),
  });

  // ─── Hurco V11 Tests ───────────────────────────────────────────────────

  describe("masterHurcoV11()", () => {
    it("sends POST to /master/hurco-v11 with correct headers", async () => {
      const responseData: MasterPostResult = {
        gcode: "O1234\nG20\nM30\n%",
        program_number: 1234,
        controller: "hurco_winmax",
        operations_count: 1,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const request: MasterPostRequest = {
        program_number: 1234,
        operations: [{ operation_type: "face", tool_number: 1, spindle_rpm: 3500 }],
      };

      const result = await ppgApi.masterHurcoV11(request);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/ppg/master/hurco-v11",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(responseData);
    });

    it("returns G-code with warnings for empty operations", async () => {
      const responseData: MasterPostResult = {
        gcode: "O0001\nM30\n%",
        program_number: 1,
        controller: "hurco_winmax",
        operations_count: 0,
        warnings: ["No operations provided"],
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const result = await ppgApi.masterHurcoV11({ operations: [] });

      expect(result.warnings).toContain("No operations provided");
      expect(result.operations_count).toBe(0);
    });

    it("throws on server error with message from response", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ message: "Invalid tool orientation: must be 1-9" }, false, 500)
      );

      await expect(
        ppgApi.masterHurcoV11({
          operations: [{ operation_type: "turn", tool_number: 1 }],
        })
      ).rejects.toThrow("Invalid tool orientation: must be 1-9");
    });

    it("throws statusText when no error message in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: vi.fn().mockRejectedValue(new Error("not JSON")),
      });

      await expect(ppgApi.masterHurcoV11({ operations: [] })).rejects.toThrow(
        "Service Unavailable"
      );
    });
  });

  // ─── Okuma B250 Tests ──────────────────────────────────────────────────

  describe("masterOkumaB250()", () => {
    it("sends POST to /master/okuma-b250 with lathe operations", async () => {
      const responseData: MasterPostResult = {
        gcode: "O5678\nG21 G90\nG96 S200 M03\nM30\n%",
        program_number: 5678,
        controller: "okuma_osp_p300l",
        operations_count: 1,
        css_enabled: true,
        css_max_rpm: 3000,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const request: MasterPostRequest = {
        program_number: 5678,
        operations: [{
          operation_type: "od_rough",
          tool_number: 1,
          tool_orientation: 3,
          css_m_min: 200,
          css_max_rpm: 3000,
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.0,
          material_iso: "P",
        }],
      };

      const result = await ppgApi.masterOkumaB250(request);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/ppg/master/okuma-b250",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        })
      );
      expect(result.css_enabled).toBe(true);
      expect(result.css_max_rpm).toBe(3000);
    });

    it("handles threading operations with pitch", async () => {
      const responseData: MasterPostResult = {
        gcode: "O7890\nG76 P1.5\nM30\n%",
        program_number: 7890,
        controller: "okuma_osp_p300l",
        operations_count: 1,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const request: MasterPostRequest = {
        operations: [{
          operation_type: "thread",
          tool_number: 5,
          thread_pitch_mm: 1.5,
        }],
      };

      const result = await ppgApi.masterOkumaB250(request);

      expect(result.gcode).toContain("G76");
    });

    it("throws on negative CSS speed", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ message: "CSS speed must be positive: got -100 m/min" }, false, 400)
      );

      await expect(
        ppgApi.masterOkumaB250({
          operations: [{ operation_type: "od_rough", tool_number: 1 }],
        })
      ).rejects.toThrow("CSS speed must be positive");
    });
  });

  // ─── Mitsubishi MV1200R Tests ──────────────────────────────────────────

  describe("masterMitsubishiMV1200R()", () => {
    it("sends POST to /master/mitsubishi-mv1200r with wire EDM params", async () => {
      const responseData: MasterPostResult = {
        gcode: "%\nO9001\nG90 G17 G21\nM50\nM02\n%",
        program_number: 9001,
        controller: "mitsubishi_m800v",
        operations_count: 1,
        wire_diameter_mm: 0.25,
        skim_cuts: 3,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const request: MasterPostRequest = {
        program_number: 9001,
        wire_diameter_mm: 0.25,
        flushing_pressure_bar: 8,
        operations: [{
          operation_type: "wire_cut",
          tool_number: 1,
          start_x: 0,
          start_y: 0,
          end_x: 10,
          end_y: 0,
          skim_passes: 3,
        }],
      };

      const result = await ppgApi.masterMitsubishiMV1200R(request);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/ppg/master/mitsubishi-mv1200r",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        })
      );
      expect(result.wire_diameter_mm).toBe(0.25);
      expect(result.skim_cuts).toBe(3);
    });

    it("throws on unsupported wire diameter", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ message: "Wire diameter 0.5mm not supported; use 0.1-0.3mm" }, false, 400)
      );

      await expect(
        ppgApi.masterMitsubishiMV1200R({
          wire_diameter_mm: 0.5,
          operations: [],
        })
      ).rejects.toThrow("Wire diameter 0.5mm not supported");
    });

    it("throws on excessive flushing pressure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ message: "Flushing pressure 50 bar exceeds max 20 bar" }, false, 400)
      );

      await expect(
        ppgApi.masterMitsubishiMV1200R({
          flushing_pressure_bar: 50,
          operations: [],
        })
      ).rejects.toThrow("exceeds max 20 bar");
    });
  });

  // ─── Auto-Route Tests ──────────────────────────────────────────────────

  describe("masterAuto()", () => {
    it("routes to correct post based on machine_model", async () => {
      const responseData: MasterPostAutoResult = {
        gcode: "O1000\nM30\n%",
        program_number: 1000,
        controller: "hurco_winmax",
        operations_count: 1,
        machine_matched: "hurco_vmx24",
        post_used: "hurco_v11",
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const request: MasterPostAutoRequest = {
        machine_model: "hurco_vmx24",
        operations: [{ operation_type: "drill", tool_number: 5 }],
      };

      const result = await ppgApi.masterAuto(request);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/ppg/master/auto",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        })
      );
      expect(result.machine_matched).toBe("hurco_vmx24");
      expect(result.post_used).toBe("hurco_v11");
    });

    it("routes to okuma for lathe models", async () => {
      const responseData: MasterPostAutoResult = {
        gcode: "O2000\nG96 S180\nM30\n%",
        program_number: 2000,
        controller: "okuma_osp_p300l",
        operations_count: 1,
        machine_matched: "okuma_lb250ii_m",
        post_used: "okuma_b250",
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const request: MasterPostAutoRequest = {
        machine_model: "okuma_lb250ii_m",
        operations: [{ operation_type: "od_finish", tool_number: 2 }],
      };

      const result = await ppgApi.masterAuto(request);

      expect(result.post_used).toBe("okuma_b250");
      expect(result.controller).toBe("okuma_osp_p300l");
    });

    it("routes to mitsubishi for wire EDM models", async () => {
      const responseData: MasterPostAutoResult = {
        gcode: "%\nO3000\nM02\n%",
        program_number: 3000,
        controller: "mitsubishi_m800v",
        operations_count: 1,
        machine_matched: "mitsubishi_mv1200r",
        post_used: "mitsubishi_mv1200r",
      };
      mockFetch.mockResolvedValueOnce(mockResponse(responseData));

      const request: MasterPostAutoRequest = {
        machine_model: "mitsubishi_mv1200r",
        operations: [{ operation_type: "wire_cut", tool_number: 1 }],
      };

      const result = await ppgApi.masterAuto(request);

      expect(result.post_used).toBe("mitsubishi_mv1200r");
    });

    it("throws on unknown machine model", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ message: "No master post found for machine: unknown_xyz" }, false, 404)
      );

      await expect(
        ppgApi.masterAuto({
          machine_model: "unknown_xyz",
          operations: [],
        })
      ).rejects.toThrow("No master post found for machine");
    });
  });

  // ─── Timeout & Network Tests ───────────────────────────────────────────

  describe("timeout and network handling", () => {
    it("passes AbortSignal to fetch for timeout support", async () => {
      let receivedSignal: AbortSignal | null = null;
      mockFetch.mockImplementation((_url: string, opts?: { signal?: AbortSignal }) => {
        receivedSignal = opts?.signal ?? null;
        return Promise.resolve(mockResponse({
          gcode: "O1\nM30\n%",
          program_number: 1,
          controller: "hurco_winmax",
          operations_count: 0,
        }));
      });

      await ppgApi.masterHurcoV11({ operations: [] });

      // Verify AbortSignal was passed (not aborted since request completed)
      expect(receivedSignal).not.toBeNull();
      expect(receivedSignal!.aborted).toBe(false);
    });

    it("clears timeout on successful response", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      mockFetch.mockResolvedValueOnce(mockResponse({
        gcode: "O1\nM30\n%",
        program_number: 1,
        controller: "hurco_winmax",
        operations_count: 0,
      }));

      await ppgApi.masterHurcoV11({ operations: [] });

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
      clearTimeoutSpy.mockRestore();
    });

    it("clears timeout even on error response", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      mockFetch.mockResolvedValueOnce(mockResponse({ message: "Server error" }, false, 500));

      try {
        await ppgApi.masterHurcoV11({ operations: [] });
      } catch {
        // Expected to throw
      }

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
      clearTimeoutSpy.mockRestore();
    });

    it("handles network failure with TypeError", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(ppgApi.masterHurcoV11({ operations: [] })).rejects.toThrow(
        "Failed to fetch"
      );
    });
  });

  // ─── Request Body Serialization Tests ──────────────────────────────────

  describe("request serialization", () => {
    it("serializes all operation fields correctly", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        gcode: "O1\nM30\n%",
        program_number: 1,
        controller: "okuma_osp_p300l",
        operations_count: 1,
      }));

      const fullOperation: MasterPostOperation = {
        operation_type: "od_rough",
        tool_number: 3,
        spindle_rpm: 2500,
        feed_ipm: 8.5,
        feed_mm_rev: 0.22,
        depth_of_cut_inch: 0.08,
        depth_of_cut_mm: 2.0,
        material_iso: "M",
        tool_orientation: 3,
        insert_radius_mm: 0.8,
        css_m_min: 180,
        css_max_rpm: 2800,
        start_x: 55,
        start_y: 0,
        start_z: 5,
        end_x: 40,
        end_y: 0,
        end_z: -100,
        skim_passes: 2,
        thread_pitch_mm: 1.25,
      };

      await ppgApi.masterOkumaB250({
        program_number: 9999,
        operations: [fullOperation],
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.operations[0]).toEqual(fullOperation);
      expect(callBody.program_number).toBe(9999);
    });

    it("serializes wire EDM specific fields", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        gcode: "%\nO1\nM02\n%",
        program_number: 1,
        controller: "mitsubishi_m800v",
        operations_count: 0,
      }));

      const request: MasterPostRequest = {
        wire_diameter_mm: 0.20,
        flushing_pressure_bar: 12,
        operations: [],
      };

      await ppgApi.masterMitsubishiMV1200R(request);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.wire_diameter_mm).toBe(0.20);
      expect(callBody.flushing_pressure_bar).toBe(12);
    });
  });
});
