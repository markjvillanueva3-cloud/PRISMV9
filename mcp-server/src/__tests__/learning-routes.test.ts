import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

type CallRecord = {
  toolName: string;
  action: string;
  params?: Record<string, any>;
};

let server: http.Server;
let port = 0;
const calls: CallRecord[] = [];

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, any>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: serialized
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(serialized),
            }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (serialized) req.write(serialized);
    req.end();
  });
}

describe("Learning route adapter", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });

      if (toolName === "prism_business" && action === "learning_plan") {
        return {
          operator_id: params?.operator_id ?? "OP-001",
          target_role: params?.target_role ?? "programmer",
          total_hours: 18,
          modules: [
            {
              id: "LM-001",
              title: "Machine Safety Fundamentals",
              category: "safety",
              prerequisite_skills: [],
              target_level: "beginner",
              duration_hours: 4,
              description: "Safety basics",
            },
            {
              id: "LM-010",
              title: "CAM Programming Basics",
              category: "cam_programming",
              prerequisite_skills: [],
              target_level: "advanced",
              duration_hours: 14,
              description: "CAM workflow",
            },
          ],
        };
      }

      if (toolName === "prism_business" && action === "learning_progress") {
        return {
          operator_id: params?.operator_id ?? "OP-001",
          modules_completed: 1,
          modules_total: 2,
          completion_pct: 50,
        };
      }

      if (toolName === "prism_business" && action === "learning_recommend") {
        return [
          {
            id: "LM-011",
            title: "Advanced CAM — 3D & 5-Axis",
            category: "cam_programming",
            prerequisite_skills: ["g_code_basics"],
            target_level: "advanced",
            duration_hours: 10,
            description: "Five-axis fundamentals",
          },
        ];
      }

      if (toolName === "prism_knowledge" && action === "tribal_search") {
        return [
          {
            id: "tk-001",
            title: "Keep chip load steady in stainless",
            body: "Avoid dwelling and keep a constant chip load to prevent work hardening.",
            category: "speeds_feeds",
            confidence: 92,
            tags: ["stainless", "chip-load"],
          },
        ];
      }

      if (toolName === "prism_cam" && action === "smart_tool_select") {
        return {
          candidates: [
            {
              tool_id: "tool-001",
              designation: "10mm 4FL Carbide EM",
              type: "end_mill",
              manufacturer: "Sandvik",
              diameter_mm: 10,
              flute_count: 4,
              coating: "TiAlN",
              score: 88,
              recommended_params: {
                rpm: 8200,
                feed_mmpt: 0.08,
                ap_mm: 6,
                ae_mm: 2,
              },
            },
          ],
        };
      }

      if (toolName === "prism_calc" && action === "material_select_recommend") {
        return [
          {
            material_id: "6061_t6",
            name: "6061-T6 Aluminum",
            iso_group: "N",
            score: 91,
            properties: { tensile_strength_MPa: 310 },
            rationale: ["Easy to machine"],
            trade_offs: ["Lower hardness than steel"],
          },
        ];
      }

      if (toolName === "prism_calc" && action === "machine_recommend") {
        return [
          {
            machine_id: "haas_vf2",
            name: "Haas VF-2",
            type: "VMC",
            score: 84,
            travel: { x: 762, y: 406, z: 508 },
            spindle: { max_rpm: 8100, power_kW: 22.4 },
            accuracy_mm: 0.013,
            rationale: ["Travel covers the part"],
          },
        ];
      }

      if (toolName === "prism_machine_live" && action === "digital_twin_state") {
        return {
          machine_id: "M001",
          machine_name: "Haas VF-2",
          state: "running",
          spindle_rpm: 8000,
          feed_rate_mm_min: 2400,
          temperature_C: 32.5,
          vibration_mm_s: 0.9,
        };
      }

      throw new Error(`Unexpected tool call: ${toolName}:${action}`);
    });

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(() => {
    calls.length = 0;
  });

  it("normalizes dashboard progress from business learning actions", async () => {
    const response = await httpRequest("POST", "/api/v1/learning/progress", {});
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ toolName: "prism_business", action: "learning_plan" });
    expect(calls[1]).toMatchObject({ toolName: "prism_business", action: "learning_progress" });
    expect(response.data.data).toMatchObject({
      modules_completed: 1,
      modules_total: 2,
      total_hours: 4,
      current_streak_days: 1,
    });
    expect(response.data.data.domain_progress.CAM).toBe(0);
    expect(response.data.data.badges).toHaveLength(4);
    expect(response.data.data.daily_history).toHaveLength(7);
  });

  it("normalizes recommended learning modules for the dashboard", async () => {
    const response = await httpRequest("POST", "/api/v1/learning/recommend", { count: 1 });
    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({ toolName: "prism_business", action: "learning_recommend" });
    expect(response.data.data[0]).toMatchObject({
      id: "LM-011",
      domain: "CAM",
      difficulty: "advanced",
      duration_min: 600,
      status: "available",
    });
  });

  it("routes tribal knowledge through prism_knowledge and normalizes tip cards", async () => {
    const response = await httpRequest("POST", "/api/v1/learning/tribal", { query: "stainless" });
    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({ toolName: "prism_knowledge", action: "tribal_search" });
    expect(response.data.data[0]).toMatchObject({
      id: "tk-001",
      title: "Keep chip load steady in stainless",
      source: "tribal",
      domain: "CAM",
    });
  });

  it("normalizes smart tool selector output for the tool wizard", async () => {
    const response = await httpRequest("POST", "/api/v1/learning/select/tool", {
      operation: "Face Milling",
      material: "4140 Steel",
      count: 1,
    });
    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({ toolName: "prism_cam", action: "smart_tool_select" });
    expect(response.data.data[0]).toMatchObject({
      id: "tool-001",
      name: "10mm 4FL Carbide EM",
      manufacturer: "Sandvik",
      match_score: 0.88,
    });
    expect(response.data.data[0].specs).toMatchObject({
      diameter_mm: 10,
      flutes: 4,
      coating: "TiAlN",
    });
  });

  it("normalizes the digital twin panel payload from prism_machine_live", async () => {
    const response = await httpRequest("POST", "/api/v1/learning/twin", { action: "status", machine_id: "M001" });
    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({ toolName: "prism_machine_live", action: "digital_twin_state" });
    expect(response.data.data).toMatchObject({
      machine_id: "M001",
      machine_name: "Haas VF-2",
      status: "running",
      spindle_rpm: 8000,
      feed_rate_mmmin: 2400,
    });
    expect(response.data.data.alerts).toEqual([]);
  });
});
