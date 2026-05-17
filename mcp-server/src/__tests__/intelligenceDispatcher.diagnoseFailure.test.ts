/**
 * intelligenceDispatcher.diagnoseFailure.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P5-U05
 * Round-trip tests for prism_intelligence:diagnose_failure → DiagnosticReasoningEngine.
 *
 * Verifies the rich alarm-knowledge-base / fault-tree surface is reachable
 * through the dispatcher (distinct from the IntelligenceEngine failure_diagnose
 * symptom matcher) for both symptom-only and alarm-driven diagnosis.
 *
 * Assertions are pinned to the engine's ALARM_KNOWLEDGE base so they fail if
 * the diagnostic logic regresses — not just on presence.
 *
 * @see src/engines/DiagnosticReasoningEngine.ts
 * @see src/tools/dispatchers/intelligenceDispatcher.ts
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
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

describe("intelligenceDispatcher diagnose_failure (P5-U05)", () => {
  it("servo-fault alarm → 'Servo amplifier overload' as top cause + safety-critical warnings", async () => {
    const body = await invoke("diagnose_failure", {
      context: {
        alarm: {
          alarm_code: "SV0401",
          message: "Servo alarm: excessive position error on X axis",
          severity: "fault",
          machine_id: "VMC-01",
          machine_type: "VMC",
          controller: "Fanuc",
          axis: "X",
        },
      },
    });
    expect(body.action).toBe("diagnose_failure");
    expect(typeof body.diagnosis_id).toBe("string");
    expect(body.diagnosis_id as string).toMatch(/^diag-\d+$/);

    const primary = body.primary_diagnosis as Record<string, unknown>;
    // The servo-alarm pattern's highest-probability cause (0.30) per
    // ALARM_KNOWLEDGE is "Servo amplifier overload".
    expect(primary.description).toBe("Servo amplifier overload");

    // Servo-alarm knowledge is safety_critical: true → non-empty warnings.
    expect(Array.isArray(body.safety_warnings)).toBe(true);
    expect((body.safety_warnings as unknown[]).length).toBeGreaterThan(0);

    // 5 documented causes for the servo pattern → 1 primary + 4 differentials.
    expect(body.differential_diagnoses as unknown[]).toHaveLength(4);

    expect(body.confidence as number).toBeGreaterThan(0);
    expect(body.confidence as number).toBeLessThanOrEqual(1);
  });

  it("symptom-only (string symptoms) → servo overload cause from 'Motor hot'+'Position error'", async () => {
    const body = await invoke("diagnose_failure", {
      symptoms: ["Motor hot", "Position error"],
      context: { machine_type: "VMC" },
    });
    expect(body.action).toBe("diagnose_failure");
    const primary = body.primary_diagnosis as Record<string, unknown>;
    // "Motor hot" + "Position error" are the listed symptoms for the
    // "Servo amplifier overload" cause — it must surface as primary.
    expect(primary.description).toBe("Servo amplifier overload");
    expect(Array.isArray(primary.evidence_for)).toBe(true);
    // "Motor hot" + "Position error" are both symptoms of the overload cause.
    expect((primary.evidence_for as string[]).length).toBe(2);

    // KNOWN ENGINE LIMITATION (pre-existing, not a wiring defect, P3 follow-up):
    // DiagnosticReasoningEngine.generateRepairActions() resolves fixes via
    // findAlarmKnowledge(alarm), which regex-matches an alarm message/code.
    // The symptom-only path passes a synthetic alarm (alarm_code "SYMPTOM"),
    // so no knowledge matches → recommended_actions is empty by design here.
    // estimateDowntime() therefore returns its safe fallback envelope.
    expect(Array.isArray(body.recommended_actions)).toBe(true);
    expect(body.recommended_actions as unknown[]).toHaveLength(0);

    const downtime = body.estimated_downtime as Record<string, number>;
    // diagnoseFromSymptoms() hardcodes its own downtime envelope (it does not
    // call estimateDowntime): {best:30, expected:120, worst:480}.
    expect(downtime.best_case_minutes).toBe(30);
    expect(downtime.expected_minutes).toBe(120);
    expect(downtime.worst_case_minutes).toBe(480);
  });

  it("Symptom objects are normalized (object form accepted, confidence preserved)", async () => {
    const body = await invoke("diagnose_failure", {
      symptoms: [
        { description: "Abnormal noise", observed: true, confidence: 0.9, source: "audio" },
        { description: "Vibration", source: "sensor" },
      ],
      context: { machine_type: "Lathe" },
    });
    expect(body.action).toBe("diagnose_failure");
    const primary = body.primary_diagnosis as Record<string, unknown>;
    // "Abnormal noise" + "Vibration" are the spindle-bearing-failure symptoms.
    expect(primary.description).toBe("Spindle bearing failure");
    expect(body.confidence as number).toBeGreaterThan(0);
  });

  it("empty symptoms + no alarm surfaces a descriptive 'symptoms' error", async () => {
    const body = await invoke("diagnose_failure", {});
    expect(body.success).toBe(false);
    expect(JSON.stringify(body).toLowerCase()).toContain("symptom");
  });

  it("schema rejects a symptom object missing required description", async () => {
    const body = await invoke("diagnose_failure", {
      symptoms: [{ observed: true }],
    });
    expect(body.success).toBe(false);
  });
});
