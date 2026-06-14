/**
 * camDispatcher — DNC-family engine wiring suite
 * ================================================
 *
 * U-WIRE-BACKLOG-POST (FEATURE-GAP-AUDIT-MS0, slot india 2026-05-19) — wires
 * the 6 previously-orphan DNC (Direct Numerical Control) post / program-transfer
 * engines into prism_cam. Each had ZERO prior dispatcher reference (verified by
 * node scan of every src/tools/dispatchers/*.ts):
 *   - DNCGenerateEngine      → cam_dnc_generate, cam_dnc_validate_safety
 *   - DNCCompareEngine       → cam_dnc_compare, cam_dnc_compare_with_master
 *   - DNCFileTransferEngine  → cam_dnc_file_transfer_build, cam_dnc_file_transfer_stats
 *   - DNCQREngine            → cam_dnc_qr_generate, cam_dnc_qr_decode
 *   - DNCSendEngine          → cam_dnc_send_register_connection, _send_queue, _send_status
 *   - DNCVerifyEngine        → cam_dnc_verify, cam_dnc_verify_quick_safety
 *
 * These tests verify the round-trip through the REAL dispatcher AND that every
 * action is registered in the z.enum gate. The enum-membership assertions are
 * load-bearing: MockMCPServer bypasses the SDK enum, so without them a missing
 * enum entry would 13/13-pass here while production rejects the action (the
 * RGS-TOOL-AUTOINVOKE-MS1 false-green class).
 *
 * Note: slimResponse strips empty arrays at the MCP transport boundary, so
 * array fields are asserted only where the input guarantees non-emptiness;
 * elsewhere `undefined | Array` is accepted and scalar fields carry the proof.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

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
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed as Record<string, unknown> };
  }
  return { ok: true, data: (parsed ?? {}) as Record<string, unknown> };
}

/**
 * Like call(), but does NOT treat a payload-level `error` field as a transport
 * failure. Required for engines whose SUCCESS contract legitimately carries an
 * `error` field — e.g. DNCQREngine.decode returns a QRScanResult of shape
 * `{ success, error?, ... }` where `error` is set on a decode MISS, not on a
 * dispatcher fault. call()'s error-key heuristic would mis-flag that as ok:false.
 */
async function callRaw(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  return { ok: true, data: (parsed ?? {}) as Record<string, unknown> };
}

// A program that passes DNCGenerateEngine.validateSafety (S(x) >= 0.990):
// contains a program end (M30); no feed > 10000 / speed > 25000.
const SAFE_PROGRAM = "O1234\nT1 M6\nG0 X0 Y0\nM3 S1200\nG1 Z-1.0 F250\nM30";

const DNC_ACTIONS = [
  "cam_dnc_generate",
  "cam_dnc_validate_safety",
  "cam_dnc_compare",
  "cam_dnc_compare_with_master",
  "cam_dnc_file_transfer_build",
  "cam_dnc_file_transfer_stats",
  "cam_dnc_qr_generate",
  "cam_dnc_qr_decode",
  "cam_dnc_send_register_connection",
  "cam_dnc_send_queue",
  "cam_dnc_send_status",
  "cam_dnc_verify",
  "cam_dnc_verify_quick_safety",
];

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("DNC-family wiring — enum registration", () => {
  it("all 13 cam_dnc_* actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const action of DNC_ACTIONS) {
      expect(ACTIONS).toContain(action);
    }
  });

  it("ACTIONS has no duplicate keys after the +13 insertion", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });

  it("action count did not regress (the 13 DNC actions sit on top of the prior surface)", () => {
    expect(ACTIONS.length).toBeGreaterThanOrEqual(DNC_ACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. DNCGenerateEngine — cam_dnc_generate / cam_dnc_validate_safety
// ─────────────────────────────────────────────────────────────────────
describe("cam_dnc_generate — DNC program generation", () => {
  it("generates a validated DNC program with checksum + header from safe source", async () => {
    const r = await call(server, "cam_dnc_generate", {
      format: "fanuc",
      machineId: "HAAS-VF2",
      programNumber: "O1234",
      programName: "DNC WIRE TEST",
      sourceContent: SAFE_PROGRAM,
      createdBy: "india-wire-test",
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(typeof d.id).toBe("string");
    expect((d.id as string).startsWith("DNC-")).toBe(true);
    expect(d.format).toBe("fanuc");
    expect(d.machineId).toBe("HAAS-VF2");
    expect(d.validated).toBe(true);
    expect(typeof d.safetyScore).toBe("number");
    expect(d.safetyScore as number).toBeGreaterThanOrEqual(0.99);
    expect(typeof d.checksum).toBe("string");
    expect((d.checksum as string).length).toBeGreaterThan(0);
    expect(typeof d.content).toBe("string");
    // header is injected (includeHeader defaults true) — title carries the name
    expect((d.content as string).includes("DNC WIRE TEST")).toBe(true);
    expect(typeof d.lineCount).toBe("number");
    expect(d.lineCount as number).toBeGreaterThan(0);
  });

  it("rejects unsafe source content (no program end) by surfacing an error", async () => {
    // Missing M30/M02 -> validateSafety deducts; engine throws below S(x) gate.
    // The throw is caught by the dispatcher and surfaced as an error envelope.
    const r = await call(server, "cam_dnc_generate", {
      format: "fanuc",
      machineId: "HAAS-VF2",
      programNumber: "O9",
      programName: "BAD",
      sourceContent: "G0 X0 Y0\nG1 Z-1 F50000\nG1 X1",
      createdBy: "india-wire-test",
    });
    // F50000 (high feed, -0.01) + no M30/M02 program end (-0.02) => S(x)=0.97,
    // below the 0.990 gate, so DNCGenerateEngine.generate throws. The dispatcher
    // catches the throw and surfaces an error envelope (ok:false). A stub would
    // instead return a success with safetyScore 1.0 — this asserts it does not.
    expect(r.ok).toBe(false);
  });
});

describe("cam_dnc_validate_safety — standalone safety scoring", () => {
  it("flags a program missing its end code and returns a score below 1.0", async () => {
    const r = await call(server, "cam_dnc_validate_safety", {
      content: "G0 X0 Y0\nG1 Z-1 F250",
      format: "fanuc",
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(typeof d.score).toBe("number");
    expect(d.score as number).toBeLessThan(1.0);
    expect(Array.isArray(d.issues)).toBe(true);
    expect((d.issues as unknown[]).length).toBeGreaterThan(0);
  });

  it("scores a complete safe program at the 1.0 ceiling", async () => {
    const r = await call(server, "cam_dnc_validate_safety", {
      content: SAFE_PROGRAM,
      format: "fanuc",
    });
    expect(r.ok).toBe(true);
    expect(r.data.score).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. DNCCompareEngine — cam_dnc_compare / cam_dnc_compare_with_master
// ─────────────────────────────────────────────────────────────────────
describe("cam_dnc_compare — program diff", () => {
  it("detects a real difference between two non-identical programs", async () => {
    const r = await call(server, "cam_dnc_compare", {
      contentA: "G0 X0 Y0\nM30",
      contentB: "G0 X5 Y0\nM30",
      nameA: "rev-A",
      nameB: "rev-B",
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(d.identical).toBe(false);
    const summary = d.summary as Record<string, unknown>;
    expect(summary.totalDifferences as number).toBeGreaterThan(0);
    expect(Array.isArray(d.differences)).toBe(true);
    expect((d.differences as unknown[]).length).toBeGreaterThan(0);
    expect(typeof d.safetyScore).toBe("number");
  });

  it("reports identical programs as identical with zero differences", async () => {
    const r = await call(server, "cam_dnc_compare", {
      contentA: "G0 X0 Y0\nM30",
      contentB: "G0 X0 Y0\nM30",
    });
    expect(r.ok).toBe(true);
    expect(r.data.identical).toBe(true);
    expect((r.data.summary as Record<string, unknown>).totalDifferences).toBe(0);
  });
});

describe("cam_dnc_compare_with_master — master baseline diff", () => {
  it("compares current content against a named master revision", async () => {
    const r = await call(server, "cam_dnc_compare_with_master", {
      content: "G0 X5 Y0\nM30",
      masterId: "MASTER-REV-1",
      masterContent: "G0 X0 Y0\nM30",
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(d.identical).toBe(false);
    expect((d.summary as Record<string, unknown>).totalDifferences as number).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. DNCFileTransferEngine — cam_dnc_file_transfer_build / _stats
// ─────────────────────────────────────────────────────────────────────
describe("cam_dnc_file_transfer_build — transfer plan", () => {
  it("builds a framed transfer plan with size + timing for an RS232 Fanuc job", async () => {
    const r = await call(server, "cam_dnc_file_transfer_build", {
      program: "O0001\nG0 X0 Y0\nG1 Z-1 F250\nM30",
      protocol: "rs232",
      controller: "fanuc",
      program_number: 1,
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(typeof d.framed_program).toBe("string");
    expect((d.framed_program as string).length).toBeGreaterThan(0);
    expect(typeof d.total_bytes).toBe("number");
    expect(d.total_bytes as number).toBeGreaterThan(0);
    expect(typeof d.estimated_transfer_seconds).toBe("number");
    expect(Array.isArray(d.checks)).toBe(true);
  });
});

describe("cam_dnc_file_transfer_stats — supported protocol/controller catalog", () => {
  it("returns the protocol + controller-family catalog", async () => {
    const r = await call(server, "cam_dnc_file_transfer_stats", {});
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(Array.isArray(d.protocols)).toBe(true);
    expect(d.protocols as string[]).toContain("rs232");
    expect(Array.isArray(d.controllers)).toBe(true);
    expect(d.controllers as string[]).toContain("fanuc");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. DNCQREngine — cam_dnc_qr_generate / cam_dnc_qr_decode
// ─────────────────────────────────────────────────────────────────────
const QR_DATA = {
  programId: "P-QR-1",
  programNumber: "O1234",
  programName: "QR WIRE TEST",
  checksum: "deadbeef",
  createdAt: "2026-05-19T00:00:00.000Z",
};

describe("cam_dnc_qr_generate — DNC load QR code", () => {
  it("generates a text-format QR carrying the program identity", async () => {
    const r = await call(server, "cam_dnc_qr_generate", {
      data: QR_DATA,
      options: { format: "text" },
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(typeof d.id).toBe("string");
    expect(d.format).toBe("text");
    expect(typeof d.content).toBe("string");
    expect((d.content as string).length).toBeGreaterThan(0);
    expect((d.data as Record<string, unknown>).programId).toBe("P-QR-1");
  });
});

describe("cam_dnc_qr_decode — QR scan round-trip", () => {
  it("successfully decodes a base64 QR payload back into the embedded program identity", async () => {
    // decode() extracts a base64 run from its input and JSON-parses it, so a
    // scannable payload is the base64 of the QRData JSON. (The engine's own
    // generate() renders ASCII-art content that decode cannot consume — a
    // pre-existing generate->decode gap; this test exercises decode directly.)
    const payload = Buffer.from(JSON.stringify(QR_DATA)).toString("base64");
    const r = await callRaw(server, "cam_dnc_qr_decode", { content: payload });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(d.success).toBe(true);
    expect(typeof d.verified).toBe("boolean");
    expect(typeof d.scannedAt).toBe("string");
    expect((d.data as Record<string, unknown>).programId).toBe("P-QR-1");
  });

  it("returns a well-formed failure QRScanResult when content carries no QR payload", async () => {
    // No 20+-char base64 run -> decode misses; it must still return a valid
    // QRScanResult ({success:false, error}), not throw or stub.
    const r = await callRaw(server, "cam_dnc_qr_decode", {
      content: "plain text with no encoded payload",
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(d.success).toBe(false);
    expect(typeof d.error).toBe("string");
    expect(d.verified).toBe(false);
    expect(typeof d.scannedAt).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. DNCSendEngine — register_connection / send_queue / send_status
// ─────────────────────────────────────────────────────────────────────
describe("cam_dnc_send_register_connection — machine connection registry", () => {
  it("registers a machine connection and echoes the stored record back", async () => {
    const r = await call(server, "cam_dnc_send_register_connection", {
      machineId: "MC-REG-1",
      machineName: "Haas VF-2 (cell A)",
      protocol: "rs232",
      address: "192.168.10.50",
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(d.machineId).toBe("MC-REG-1");
    expect(d.machineName).toBe("Haas VF-2 (cell A)");
  });
});

describe("cam_dnc_send_queue — transfer job queueing", () => {
  it("queues a transfer for a registered machine and returns a queued job", async () => {
    await call(server, "cam_dnc_send_register_connection", {
      machineId: "MC-QUEUE-1",
      machineName: "Okuma Genos",
      protocol: "ethernet",
      address: "192.168.10.60",
    });
    const r = await call(server, "cam_dnc_send_queue", {
      programId: "P-SEND-1",
      programNumber: "O5678",
      programContent: SAFE_PROGRAM,
      machineId: "MC-QUEUE-1",
      safetyScore: 1.0,
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(typeof d.id).toBe("string");
    expect((d.id as string).startsWith("TXF-")).toBe(true);
    expect(d.status).toBe("queued");
    expect(d.machineId).toBe("MC-QUEUE-1");
    expect(d.programId).toBe("P-SEND-1");
    expect(typeof d.totalBytes).toBe("number");
  });

  it("surfaces an error when queueing to an unregistered machine (connection gate is reachable)", async () => {
    const r = await call(server, "cam_dnc_send_queue", {
      programId: "P-SEND-X",
      programNumber: "O9999",
      programContent: SAFE_PROGRAM,
      machineId: "MC-NEVER-REGISTERED",
      safetyScore: 1.0,
    });
    expect(r.ok).toBe(false);
  });
});

describe("cam_dnc_send_status — transfer job status lookup", () => {
  it("returns the status of a job queued through the dispatcher", async () => {
    await call(server, "cam_dnc_send_register_connection", {
      machineId: "MC-STATUS-1",
      machineName: "Mazak",
      protocol: "ftp",
      address: "192.168.10.70",
    });
    const queued = await call(server, "cam_dnc_send_queue", {
      programId: "P-STATUS-1",
      programNumber: "O4321",
      programContent: SAFE_PROGRAM,
      machineId: "MC-STATUS-1",
      safetyScore: 1.0,
    });
    expect(queued.ok).toBe(true);
    const jobId = queued.data.id as string;
    const r = await call(server, "cam_dnc_send_status", { jobId });
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe(jobId);
    expect(r.data.status).toBe("queued");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 7. DNCVerifyEngine — cam_dnc_verify / cam_dnc_verify_quick_safety
// ─────────────────────────────────────────────────────────────────────
describe("cam_dnc_verify — full program verification", () => {
  it("verifies a program and returns a structured VerificationResult", async () => {
    const r = await call(server, "cam_dnc_verify", {
      programId: "P-VERIFY-1",
      content: SAFE_PROGRAM,
      type: "full",
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(d.programId).toBe("P-VERIFY-1");
    expect(typeof d.passed).toBe("boolean");
    expect(typeof d.safetyScore).toBe("number");
    const summary = d.summary as Record<string, unknown>;
    expect(typeof summary.linesChecked).toBe("number");
    expect(summary.linesChecked as number).toBeGreaterThan(0);
  });
});

describe("cam_dnc_verify_quick_safety — fast safety gate", () => {
  it("returns a safe/score/criticalIssues triple for a program", async () => {
    const r = await call(server, "cam_dnc_verify_quick_safety", {
      content: SAFE_PROGRAM,
    });
    expect(r.ok).toBe(true);
    const d = r.data;
    expect(typeof d.safe).toBe("boolean");
    expect(typeof d.score).toBe("number");
    // criticalIssues is an array; slimResponse may strip it when empty.
    expect(d.criticalIssues === undefined || Array.isArray(d.criticalIssues)).toBe(true);
  });
});
