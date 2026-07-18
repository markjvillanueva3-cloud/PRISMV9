import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const materialSearch = vi.fn();
const materialGetByIdOrName = vi.fn();
const materialLoad = vi.fn();
const machineSearch = vi.fn();
const machineGetByIdOrModel = vi.fn();
const machineLoad = vi.fn();
const toolSearch = vi.fn();
const toolGetByIdOrCatalog = vi.fn();
const toolLoad = vi.fn();

vi.mock("../registries/MaterialRegistry.js", () => ({
  materialRegistry: {
    load: materialLoad,
    search: materialSearch,
    getByIdOrName: materialGetByIdOrName,
  },
}));

vi.mock("../registries/MachineRegistry.js", () => ({
  machineRegistry: {
    load: machineLoad,
    search: machineSearch,
    getByIdOrModel: machineGetByIdOrModel,
  },
}));

vi.mock("../registries/ToolRegistry.js", () => ({
  toolRegistry: {
    load: toolLoad,
    search: toolSearch,
    getByIdOrCatalog: toolGetByIdOrCatalog,
  },
}));

type CallRecord = {
  toolName: string;
  action: string;
  params?: Record<string, unknown>;
};

let server: http.Server;
let port = 0;
const calls: CallRecord[] = [];

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
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
              "Content-Length": Buffer.byteLength(serialized).toString(),
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

describe("Data routes", () => {
  beforeAll(async () => {
    const { createDataRouter } = await import("../routes/data.js");
    const app = express();
    app.use(express.json());
    app.use(
      "/api/v1/data",
      createDataRouter(async (toolName, action, params) => {
        calls.push({ toolName, action, params });
        return {
          action,
          echoed: params ?? {},
        };
      }),
    );

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
    materialSearch.mockReset();
    materialGetByIdOrName.mockReset();
    materialLoad.mockReset();
    machineSearch.mockReset();
    machineGetByIdOrModel.mockReset();
    machineLoad.mockReset();
    toolSearch.mockReset();
    toolGetByIdOrCatalog.mockReset();
    toolLoad.mockReset();
  });

  it("returns real material objects from the registry search", async () => {
    materialSearch.mockResolvedValue({
      materials: [
        {
          material_id: "H13",
          name: "H13 Tool Steel",
          iso_group: "P",
        },
      ],
      total: 1,
      hasMore: false,
    });

    const response = await httpRequest("POST", "/api/v1/data/material/search", {
      query: "h13",
      limit: 5,
      offset: 0,
    });

    expect(response.status).toBe(200);
    expect(response.data.result.materials[0]).toMatchObject({
      material_id: "H13",
      name: "H13 Tool Steel",
      iso_group: "P",
    });
    expect(materialSearch).toHaveBeenCalledWith({
      query: "h13",
      limit: 5,
      offset: 0,
    });
    expect(calls).toHaveLength(0);
  });

  it("returns real machine objects from the registry search", async () => {
    machineLoad.mockResolvedValue(undefined);
    machineSearch.mockReturnValue({
      machines: [
        {
          id: "okuma_genos_m460v_5ax",
          manufacturer: "Okuma",
          model: "GENOS M460V-5AX",
          type: "5-axis vertical",
        },
      ],
      total: 1,
      hasMore: false,
    });

    const response = await httpRequest("POST", "/api/v1/data/machine/search", {
      manufacturer: "Okuma",
      limit: 5,
      offset: 0,
    });

    expect(response.status).toBe(200);
    expect(response.data.result.machines[0]).toMatchObject({
      id: "okuma_genos_m460v_5ax",
      manufacturer: "Okuma",
      model: "GENOS M460V-5AX",
      type: "5-axis vertical",
    });
    expect(machineLoad).toHaveBeenCalledTimes(1);
    expect(machineSearch).toHaveBeenCalledWith({
      manufacturer: "Okuma",
      limit: 5,
      offset: 0,
    });
    expect(calls).toHaveLength(0);
  });

  it("returns the aggregated calculator machine catalog when the calculator catalog flag is enabled", async () => {
    machineLoad.mockResolvedValue(undefined);
    machineSearch.mockReturnValue({
      machines: [
        {
          id: "okuma_genos_m460v_5ax",
          manufacturer: "Okuma",
          model: "GENOS M460V-5AX",
          type: "5AXIS_TRUNNION",
        },
      ],
      total: 1,
      hasMore: false,
    });

    const response = await httpRequest("POST", "/api/v1/data/machine/search", {
      calculatorCatalog: true,
      limit: 5000,
      offset: 0,
    });

    expect(response.status).toBe(200);
    expect(response.data.result.source).toBe("aggregated");
    expect(response.data.result.total).toBeGreaterThan(1000);
    expect(response.data.result.machines.some((item: any) => item.id === "okuma_genos_m460v_5ax")).toBe(true);
    expect(response.data.result.machines.some((item: any) => item.source_profile === true)).toBe(true);
    expect(machineLoad).toHaveBeenCalledTimes(1);
    expect(machineSearch).toHaveBeenCalledWith({
      limit: 5000,
      offset: 0,
    });
    expect(calls).toHaveLength(0);
  });

  it("resolves machine and material gets through the registries", async () => {
    materialLoad.mockResolvedValue(undefined);
    materialGetByIdOrName.mockResolvedValue({
      material_id: "4140_PH",
      name: "4140 Prehard",
    });
    machineLoad.mockResolvedValue(undefined);
    machineGetByIdOrModel.mockReturnValue({
      id: "haas_vf_2",
      manufacturer: "Haas",
      model: "VF-2",
    });

    const [materialResponse, machineResponse] = await Promise.all([
      httpRequest("GET", "/api/v1/data/material/4140_PH"),
      httpRequest("GET", "/api/v1/data/machine/haas_vf_2"),
    ]);

    expect(materialResponse.status).toBe(200);
    expect(materialResponse.data.result).toMatchObject({
      material_id: "4140_PH",
      name: "4140 Prehard",
    });
    expect(machineResponse.status).toBe(200);
    expect(machineResponse.data.result).toMatchObject({
      id: "haas_vf_2",
      manufacturer: "Haas",
      model: "VF-2",
    });
    expect(calls).toHaveLength(0);
  });

  it("returns real tool objects from the registry search", async () => {
    toolLoad.mockResolvedValue(undefined);
    toolSearch.mockReturnValue({
      tools: [
        {
          id: "tool_emuge_001",
          catalogNumber: "EMUGE-001",
          type: "endmill",
          manufacturer: "Emuge",
        },
      ],
      total: 1,
      hasMore: false,
    });

    const response = await httpRequest("POST", "/api/v1/data/tool/search", {
      query: "emuge",
      limit: 3,
    });

    expect(response.status).toBe(200);
    expect(response.data.result.tools[0]).toMatchObject({
      id: "tool_emuge_001",
      catalogNumber: "EMUGE-001",
      type: "endmill",
      manufacturer: "Emuge",
    });
    expect(toolLoad).toHaveBeenCalledTimes(1);
    expect(toolSearch).toHaveBeenCalledWith({
      query: "emuge",
      limit: 3,
    });
    expect(calls).toHaveLength(0);
  });

  it("returns calculator programming packages directly from the backend route", async () => {
    const response = await httpRequest("POST", "/api/v1/data/programming/catalog", {
      mode: "lathe",
    });

    expect(response.status).toBe(200);
    expect(response.data.result.source).toBe("curated");
    expect(response.data.result.programming.length).toBeGreaterThan(0);
    expect(response.data.result.programming.every((item: { mode: string }) => item.mode === "lathe")).toBe(true);
    expect(response.data.result.programming.some((item: { id: string }) => item.id === "mastercam-lathe")).toBe(true);
    expect(response.data.result.programming.some((item: { id: string }) => item.id === "manual-lathe")).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("returns calculator workholding catalog bundles by machine mode", async () => {
    const response = await httpRequest("POST", "/api/v1/data/workholding/catalog", {
      mode: "mill",
    });

    expect(response.status).toBe(200);
    expect(["database", "hybrid"]).toContain(response.data.result.source);
    expect(response.data.result.liveCount).toBeGreaterThan(0);
    expect(response.data.result.categoryOptions.length).toBeGreaterThan(0);
    expect(response.data.result.brandOptions.length).toBeGreaterThan(0);
    expect(
      response.data.result.presetOptions.some((item: any) =>
        item.id === "kurt-dl640"
        || item.id === "orange-vise-ov6-200ds3"
        || item.id === "schunk-kontec-ks"
        || item.id === "prism-reference-vacuum-fixture",
      ),
    ).toBe(true);
    expect(response.data.result.brandOptions.some((item: any) => item.id === "lang-technik")).toBe(true);
    expect(response.data.result.stabilityOptions.some((item: any) => item.id === "production-stable")).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("returns the tool-coating select catalog via GET /coating/catalog", async () => {
    const response = await httpRequest("GET", "/api/v1/data/coating/catalog");
    expect(response.status).toBe(200);
    expect(["database", "curated"]).toContain(response.data.result.source);
    expect(response.data.result.options.length).toBeGreaterThan(0);
    expect(response.data.result.options.some((o: any) => o.id === "tialn")).toBe(true);
    expect(typeof response.data.result.recommendedByMaterial).toBe("object");
    expect(calls).toHaveLength(0);
  });

  it("returns the indexable-insert select catalog via GET /insert/catalog", async () => {
    const response = await httpRequest("GET", "/api/v1/data/insert/catalog");
    expect(response.status).toBe(200);
    expect(["database", "curated"]).toContain(response.data.result.source);
    expect(response.data.result.options.length).toBeGreaterThan(0);
    expect(Array.isArray(response.data.result.manufacturers)).toBe(true);
    expect(response.data.result.manufacturers.length).toBeGreaterThan(0);
    expect(calls).toHaveLength(0);
  });

  it("returns the coolant-method select catalog via GET /coolant/catalog", async () => {
    const response = await httpRequest("GET", "/api/v1/data/coolant/catalog");
    expect(response.status).toBe(200);
    expect(["database", "curated"]).toContain(response.data.result.source);
    expect(response.data.result.options.some((o: any) => o.id === "flood")).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("returns the coolant-product select catalog via GET /coolant-product/catalog", async () => {
    const response = await httpRequest("GET", "/api/v1/data/coolant-product/catalog");
    expect(response.status).toBe(200);
    expect(["database", "curated"]).toContain(response.data.result.source);
    expect(response.data.result.options.length).toBeGreaterThan(0);
    expect(Array.isArray(response.data.result.vendors)).toBe(true);
    expect(response.data.result.coolingTypes.some((t: string) => t === "flood" || t === "mql")).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("returns the turning-insert select catalog via GET /turning-insert/catalog", async () => {
    const response = await httpRequest("GET", "/api/v1/data/turning-insert/catalog");
    expect(response.status).toBe(200);
    expect(["database", "curated"]).toContain(response.data.result.source);
    expect(response.data.result.options.some((o: any) => o.id === "cnmg-120408")).toBe(true);
    expect(Array.isArray(response.data.result.shapes)).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("returns the raw-material stock select catalog via GET /stock/catalog", async () => {
    const response = await httpRequest("GET", "/api/v1/data/stock/catalog");
    expect(response.status).toBe(200);
    expect(["database", "curated"]).toContain(response.data.result.source);
    expect(response.data.result.options.length).toBeGreaterThan(0);
    expect(Array.isArray(response.data.result.forms)).toBe(true);
    expect(Array.isArray(response.data.result.isoGroups)).toBe(true);
    expect(calls).toHaveLength(0);
  });
});
