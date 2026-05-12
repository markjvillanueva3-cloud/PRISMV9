import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";
import { OperatingSystemHotJobsEngine } from "../engines/OperatingSystemHotJobsEngine.js";
import { ProgramReleaseCatalogEngine } from "../engines/ProgramReleaseCatalogEngine.js";

let server: http.Server;
let port = 0;
let machineProfileStoreDir: string | null = null;
let toolCribStoreDir: string | null = null;

function buildProgramReleaseMachineProfilePayload() {
  return {
    profile: {
      profileId: "profile-okuma-m460-program-release",
      userId: "user-mark",
      workspaceId: "program-release",
      displayName: "Shop Okuma M460 release default",
      machine: {
        machineId: "okuma_genos_m460v_5ax",
        canonicalMachineId: "okuma_genos_m460v_5ax",
        packageId: "okuma_genos_m460v_5ax::p300ma_h::15000_cat40_big_plus",
        manufacturerId: "okuma",
        manufacturerLabel: "Okuma",
        modelLabel: "GENOS M460V-5AX",
        familyId: "5_axis_vertical",
        familyLabel: "5-Axis Vertical",
        controllerPackages: [
          {
            controllerId: "osp_p300ma_h",
            controllerLabel: "OSP-P300MA-H",
            controlFeatures: [
              {
                id: "cas",
                label: "CAS",
                availability: {
                  enabled: true,
                  source: "shop_audit",
                },
              },
            ],
          },
        ],
        spindlePackages: [
          {
            id: "15000_cat40_big_plus",
            label: "15,000 RPM CAT 40 Big+",
            taper: "CAT 40 Big+",
            maxRpm: 15000,
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
        ],
        coolantStrategies: [
          {
            id: "flood",
            label: "Flood",
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
          {
            id: "through_spindle",
            label: "Through-spindle",
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
        ],
        kinematics: {
          familyId: "5_axis_vertical",
          familyLabel: "5-Axis Vertical",
          topology: "5_axis_vertical",
          travelXIn: 30,
          travelYIn: 20,
          travelZIn: 18,
        },
        sourceRecords: ["shop_audit:okuma_m460"],
      },
      selectedControllerId: "osp_p300ma_h",
      enabledControllerFeatureIds: ["cas"],
      selectedSpindlePackageId: "15000_cat40_big_plus",
      enabledCoolantStrategyIds: ["flood", "through_spindle"],
    },
    source: "shop_audit",
    makeDefault: true,
  };
}

function buildCalculatorMachineProfilePayload() {
  return {
    profile: {
      profileId: "calculator-okuma-m460-default",
      userId: "user-mark",
      workspaceId: "calculator",
      displayName: "Shop Okuma M460 calculator default",
      machine: {
        machineId: "okuma_genos_m460v_5ax",
        canonicalMachineId: "okuma_genos_m460v_5ax",
        packageId: "okuma_genos_m460v_5ax::osp_p300ma_h::15000_cat40_big_plus",
        manufacturerId: "okuma",
        manufacturerLabel: "Okuma",
        modelLabel: "GENOS M460V-5AX",
        familyId: "5_axis_vertical",
        familyLabel: "5-Axis Vertical",
        controllerPackages: [
          {
            controllerId: "osp_p300ma_h",
            controllerLabel: "OSP-P300MA-H",
            controlFeatures: [
              {
                id: "cas",
                label: "CAS",
                availability: {
                  enabled: true,
                  source: "shop_audit",
                },
              },
              {
                id: "high_speed_mode",
                label: "High-speed machining mode",
                availability: {
                  enabled: true,
                  source: "shop_audit",
                },
              },
            ],
          },
        ],
        spindlePackages: [
          {
            id: "15000_cat40_big_plus",
            label: "15,000 RPM CAT 40 Big+",
            taper: "CAT 40 Big+",
            maxRpm: 15000,
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
        ],
        coolantStrategies: [
          {
            id: "flood",
            label: "Flood",
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
          {
            id: "tsc",
            label: "Through-spindle",
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
          {
            id: "through_air",
            label: "Through-air",
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
          {
            id: "air",
            label: "Air blast",
            availability: {
              enabled: true,
              source: "shop_audit",
            },
          },
        ],
        kinematics: {
          familyId: "5_axis_vertical",
          familyLabel: "5-Axis Vertical",
          topology: "5_axis_vertical",
          travelXIn: 30,
          travelYIn: 20,
          travelZIn: 18,
        },
        sourceRecords: ["shop_audit:okuma_m460"],
      },
      selectedControllerId: "osp_p300ma_h",
      enabledControllerFeatureIds: ["cas", "high_speed_mode"],
      selectedSpindlePackageId: "15000_cat40_big_plus",
      toolingStationCountOverride: 48,
      enabledCoolantStrategyIds: ["flood", "tsc", "through_air", "air"],
    },
    source: "shop_audit",
    makeDefault: true,
  };
}

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
    if (serialized) {
      req.write(serialized);
    }
    req.end();
  });
}

describe("Operating-system authority routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async () => ({ ok: true }));

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
    OperatingSystemHotJobsEngine.reset();
  });

  afterEach(async () => {
    delete process.env.PRISM_USER_MACHINE_PROFILE_STORE_PATH;
    delete process.env.PRISM_CALCULATOR_TOOL_CRIB_STORE_PATH;
    if (machineProfileStoreDir) {
      await rm(machineProfileStoreDir, { recursive: true, force: true });
      machineProfileStoreDir = null;
    }
    if (toolCribStoreDir) {
      await rm(toolCribStoreDir, { recursive: true, force: true });
      toolCribStoreDir = null;
    }
  });

  it("sets, lists, and clears backend hot jobs", async () => {
    const setResponse = await httpRequest("POST", "/api/v1/operating-system/hot-jobs/set", {
      jobId: "JOB-4821",
      partNumber: "IMP-4821",
      customer: "Archer Precision",
      dueDate: "2026-03-30",
      note: "Customer pull-in approved.",
      setBy: "Olivia Reyes",
    });

    expect(setResponse.status).toBe(200);
    expect(setResponse.data.data).toHaveLength(1);
    expect(setResponse.data.data[0]).toMatchObject({
      jobId: "JOB-4821",
      partNumber: "IMP-4821",
      customer: "Archer Precision",
    });

    const listResponse = await httpRequest("GET", "/api/v1/operating-system/hot-jobs");
    expect(listResponse.status).toBe(200);
    expect(listResponse.data.data).toHaveLength(1);

    const clearResponse = await httpRequest("POST", "/api/v1/operating-system/hot-jobs/clear", {
      jobId: "JOB-4821",
    });
    expect(clearResponse.status).toBe(200);
    expect(clearResponse.data.data).toEqual([]);
  });

  it("feeds backend hot jobs into employee bootstrap when body hot jobs are omitted", async () => {
    await httpRequest("POST", "/api/v1/operating-system/hot-jobs/set", {
      jobId: "JOB-4821",
      partNumber: "IMP-4821",
      customer: "Archer Precision",
      dueDate: "2026-03-30",
      note: "Run this first.",
      setBy: "Olivia Reyes",
    });

    const response = await httpRequest("POST", "/api/v1/operating-system/shell/employee/lead", {
      jobs: [],
      approvalCount: 1,
    });

    expect(response.status).toBe(200);
    expect(response.data.data.hotJobs).toHaveLength(1);
    expect(response.data.data.shiftPriorities.some((priority: any) => priority.label === "HOT")).toBe(true);
  });

  it("returns a planner workspace with requested thread selection", async () => {
    const response = await httpRequest("POST", "/api/v1/operating-system/messages/workspace", {
      profileId: "planner",
      threadId: "thread-planner-orders",
    });

    expect(response.status).toBe(200);
    expect(response.data.data.identityLabel).toContain("Jordan Vale");
    expect(response.data.data.selectedThreadId).toBe("thread-planner-orders");
    expect(response.data.data.activeMailbox).toBe("jordan.vale@orchidprecision.com");
    expect(response.data.data.linkedRecords[0]).toMatchObject({
      id: "ORD-5124",
      workspaceRoute: "/order-tracking",
    });
  });

  it("supports email-based identity selection for messages workspace", async () => {
    const response = await httpRequest("POST", "/api/v1/operating-system/messages/workspace", {
      email: "morgan.hale@orchidprecision.com",
    });

    expect(response.status).toBe(200);
    expect(response.data.data.identityLabel).toContain("Morgan Hale");
    expect(response.data.data.threads.length).toBeGreaterThan(0);
    expect(response.data.data.actionLabels.length).toBeGreaterThan(0);
  });

  it("fails closed when hot-job mutation requests omit jobId", async () => {
    const setResponse = await httpRequest("POST", "/api/v1/operating-system/hot-jobs/set", {
      partNumber: "IMP-4821",
    });

    expect(setResponse.status).toBe(400);
    expect(setResponse.data).toMatchObject({
      ok: false,
      error: "Missing jobId in request body",
    });

    const clearResponse = await httpRequest("POST", "/api/v1/operating-system/hot-jobs/clear", {});

    expect(clearResponse.status).toBe(400);
    expect(clearResponse.data).toMatchObject({
      ok: false,
      error: "Missing jobId in request body",
    });
  });

  it("persists and reads default program-release machine profiles", async () => {
    machineProfileStoreDir = await mkdtemp(path.join(os.tmpdir(), "prism-user-machine-profiles-"));
    process.env.PRISM_USER_MACHINE_PROFILE_STORE_PATH = path.join(
      machineProfileStoreDir,
      "profiles.json",
    );

    const saveResponse = await httpRequest(
      "POST",
      "/api/v1/operating-system/program-release/machine-profile",
      buildProgramReleaseMachineProfilePayload(),
    );

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.data.data).toMatchObject({
      created: true,
      updated: false,
      defaulted: true,
      version: 1,
    });

    const defaultResponse = await httpRequest(
      "GET",
      "/api/v1/operating-system/program-release/machine-profile/default/user-mark?workspaceId=program-release",
    );

    expect(defaultResponse.status).toBe(200);
    expect(defaultResponse.data.data).toMatchObject({
      profile: {
        profileId: "profile-okuma-m460-program-release",
        displayName: "Shop Okuma M460 release default",
        selectedControllerId: "osp_p300ma_h",
        selectedSpindlePackageId: "15000_cat40_big_plus",
        machine: {
          machineId: "okuma_genos_m460v_5ax",
          modelLabel: "GENOS M460V-5AX",
        },
      },
      canDriveProgramRelease: true,
    });

    const profileResponse = await httpRequest(
      "GET",
      "/api/v1/operating-system/program-release/machine-profile/profile-okuma-m460-program-release",
    );

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.data.data.profile.profileId).toBe(
      "profile-okuma-m460-program-release",
    );
  });

  it("builds and persists a program-release machine profile from a machine selection", async () => {
    machineProfileStoreDir = await mkdtemp(path.join(os.tmpdir(), "prism-user-machine-profiles-"));
    process.env.PRISM_USER_MACHINE_PROFILE_STORE_PATH = path.join(
      machineProfileStoreDir,
      "profiles.json",
    );

    const machine = ProgramReleaseCatalogEngine.getCatalog().machines[0];

    const saveResponse = await httpRequest(
      "POST",
      "/api/v1/operating-system/program-release/machine-profile",
      {
        selection: {
          userId: "user-selection",
          workspaceId: "program-release",
          machineId: machine.id,
          displayName: `${machine.label} saved from selection`,
        },
        makeDefault: true,
      },
    );

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.data.data).toMatchObject({
      created: true,
      updated: false,
      defaulted: true,
      profile: {
        profile: {
          userId: "user-selection",
          displayName: `${machine.label} saved from selection`,
          machine: {
            machineId: machine.id,
            modelLabel: machine.label,
          },
        },
        canDriveProgramRelease: true,
      },
    });

    const defaultResponse = await httpRequest(
      "GET",
      "/api/v1/operating-system/program-release/machine-profile/default/user-selection?workspaceId=program-release",
    );

    expect(defaultResponse.status).toBe(200);
    expect(defaultResponse.data.data).toMatchObject({
      profile: {
        userId: "user-selection",
        displayName: `${machine.label} saved from selection`,
        machine: {
          machineId: machine.id,
          modelLabel: machine.label,
        },
      },
      canDriveProgramRelease: true,
    });
  });

  it("persists and reads default calculator machine profiles", async () => {
    machineProfileStoreDir = await mkdtemp(path.join(os.tmpdir(), "prism-user-machine-profiles-"));
    process.env.PRISM_USER_MACHINE_PROFILE_STORE_PATH = path.join(
      machineProfileStoreDir,
      "profiles.json",
    );

    const saveResponse = await httpRequest(
      "POST",
      "/api/v1/operating-system/calculator/machine-profile",
      buildCalculatorMachineProfilePayload(),
    );

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.data.data).toMatchObject({
      created: true,
      updated: false,
      defaulted: true,
      version: 1,
    });

    const defaultResponse = await httpRequest(
      "GET",
      "/api/v1/operating-system/calculator/machine-profile/default/user-mark?workspaceId=calculator",
    );

    expect(defaultResponse.status).toBe(200);
    expect(defaultResponse.data.data).toMatchObject({
      profile: {
        profileId: "calculator-okuma-m460-default",
        displayName: "Shop Okuma M460 calculator default",
        selectedControllerId: "osp_p300ma_h",
        selectedSpindlePackageId: "15000_cat40_big_plus",
        enabledControllerFeatureIds: ["cas", "high_speed_mode"],
        toolingStationCountOverride: 48,
        enabledCoolantStrategyIds: ["flood", "tsc", "through_air", "air"],
        machine: {
          machineId: "okuma_genos_m460v_5ax",
          modelLabel: "GENOS M460V-5AX",
          kinematics: {
            topology: "5_axis_vertical",
          },
        },
      },
      canDriveCalculatorSelections: true,
    });

    const profileResponse = await httpRequest(
      "GET",
      "/api/v1/operating-system/calculator/machine-profile/calculator-okuma-m460-default",
    );

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.data.data.profile.profileId).toBe(
      "calculator-okuma-m460-default",
    );
  });

  it("extracts tooling and part numbers into the calculator tool crib workspace", async () => {
    toolCribStoreDir = await mkdtemp(path.join(os.tmpdir(), "prism-tool-crib-"));
    process.env.PRISM_CALCULATOR_TOOL_CRIB_STORE_PATH = path.join(
      toolCribStoreDir,
      "workspace.json",
    );

    const intakeResponse = await httpRequest(
      "POST",
      "/api/v1/operating-system/calculator/tool-crib/document-intake",
      {
        userId: "user-mark",
        workspaceId: "calculator",
        sourceType: "rfq",
        filename: "ACME-Aerospace-Print.pdf",
        title: "ACME Aerospace LLC print package",
        contentText:
          "Customer: ACME Aerospace LLC\nAttn: Jane Doe\nEmail: jane.doe@acme-aero.com\nPhone: 555-212-9911\nShip To: 1200 Jet Park Drive\nCustomer part number: IMP-4821\nTool: Kennametal 1.250 FACE MILL KSSM-1250R04\nHolder: Haimer CAT40-PowerShrink-080\nQty: 2",
      },
    );

    expect(intakeResponse.status).toBe(200);
    expect(intakeResponse.data.data.summary).toContain("tooling");
    expect(intakeResponse.data.data.imports[0].summary).toContain("auto-redacted");
    expect(intakeResponse.data.data.partNumbers).toContain("IMP-4821");
    expect(intakeResponse.data.data.toolingPartNumbers).toContain("KSSM-1250R04");
    expect(intakeResponse.data.data.imports[0].sourceLabel).toBe("rfq print intake");
    expect(intakeResponse.data.data.imports[0].filename).toBe("redacted-print.pdf");
    expect(intakeResponse.data.data.imports[0].redaction.applied).toBe(true);
    expect(intakeResponse.data.data.imports[0].redaction.redactedFields).toEqual(
      expect.arrayContaining(["customer contacts", "customer channels", "document labels"]),
    );

    const workspaceResponse = await httpRequest(
      "GET",
      "/api/v1/operating-system/calculator/tool-crib/user-mark?workspaceId=calculator",
    );

    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.data.data.imports).toHaveLength(1);
    expect(workspaceResponse.data.data.imports[0].summary).toContain("auto-redacted");
    expect(
      workspaceResponse.data.data.imports[0].suggestions.some(
        (suggestion: any) => suggestion.partNumber === "KSSM-1250R04",
      ),
    ).toBe(true);
  });

  it("requires explicit approval before scanning local CAD/CAM tooling sources", async () => {
    const response = await httpRequest(
      "POST",
      "/api/v1/operating-system/calculator/tool-crib/local-scan",
      {
        userId: "user-mark",
        workspaceId: "calculator",
        approvedByUser: false,
      },
    );

    expect(response.status).toBe(400);
    expect(response.data.error).toContain("Explicit user approval");
  });

  it("scans local CAD/CAM source paths and stores discovered tooling libraries", async () => {
    toolCribStoreDir = await mkdtemp(path.join(os.tmpdir(), "prism-tool-crib-"));
    process.env.PRISM_CALCULATOR_TOOL_CRIB_STORE_PATH = path.join(
      toolCribStoreDir,
      "workspace.json",
    );

    const scanRoot = path.join(toolCribStoreDir, "scan-root", "Autodesk", "Fusion 360", "Tool Library");
    await mkdir(scanRoot, { recursive: true });
    await writeFile(path.join(scanRoot, "mill_tool_library.json"), JSON.stringify({ tools: [] }), "utf8");

    const response = await httpRequest(
      "POST",
      "/api/v1/operating-system/calculator/tool-crib/local-scan",
      {
        userId: "user-mark",
        workspaceId: "calculator",
        approvedByUser: true,
        roots: [path.join(toolCribStoreDir, "scan-root")],
        maxResults: 8,
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.data.discoveredLibraries.length).toBeGreaterThan(0);
    expect(response.data.data.discoveredLibraries[0].path).toContain("mill_tool_library.json");
  });

  it("returns approvals and a tracking packet for a job desk", async () => {
    const job = {
      id: "JOB-100",
      customer: "Acme",
      part_number: "BRKT-100",
      description: "Mounting bracket",
      status: "in_progress",
      quantity: 24,
      due_date: "2026-03-31",
      priority: "high",
      material: "6061-T6",
      estimated_hours: 12,
      actual_hours: 6,
      created_at: "2026-03-29",
    };

    const approvalsResponse = await httpRequest("POST", "/api/v1/operating-system/jobs/JOB-100/approvals", {
      job,
    });

    expect(approvalsResponse.status).toBe(200);
    expect(approvalsResponse.data.data).toHaveLength(3);
    expect(approvalsResponse.data.data[0]).toMatchObject({
      label: "Engineering",
      status: "approved",
    });

    const packetResponse = await httpRequest("POST", "/api/v1/operating-system/jobs/JOB-100/packet", {
      job,
      options: { seed: 2 },
    });

    expect(packetResponse.status).toBe(200);
    expect(packetResponse.data.data).toMatchObject({
      jobId: "JOB-100",
      customer: "Acme",
      partNumber: "BRKT-100",
      material: "6061-T6",
    });
    expect(packetResponse.data.data.qrPayload).toContain("PRISMJOB|");
    expect(packetResponse.data.data.operations.length).toBeGreaterThan(0);
    expect(packetResponse.data.data.departments.length).toBeGreaterThan(0);
  });

  it("builds a draft intake preview job and packet", async () => {
    const response = await httpRequest("POST", "/api/v1/operating-system/jobs/intake-preview", {
      customer: "Archer Precision",
      part_number: "IMP-4821",
      description: "Impeller package",
      quantity: "12",
      material: "17-4PH",
      due_date: "2026-04-03",
      priority: "rush",
    });

    expect(response.status).toBe(200);
    expect(response.data.data.previewJob).toMatchObject({
      customer: "Archer Precision",
      part_number: "IMP-4821",
      priority: "rush",
    });
    expect(response.data.data.packet).toMatchObject({
      customer: "Archer Precision",
      partNumber: "IMP-4821",
      priority: "rush",
    });
    expect(response.data.data.packet.qrPayload).toContain("job=");
  });

  it("fails closed when approval and packet endpoints omit the job payload", async () => {
    const approvalsResponse = await httpRequest("POST", "/api/v1/operating-system/jobs/JOB-100/approvals", {});

    expect(approvalsResponse.status).toBe(400);
    expect(approvalsResponse.data).toMatchObject({
      ok: false,
      error: "Missing job in request body",
    });

    const packetResponse = await httpRequest("POST", "/api/v1/operating-system/jobs/JOB-100/packet", {});

    expect(packetResponse.status).toBe(400);
    expect(packetResponse.data).toMatchObject({
      ok: false,
      error: "Missing job in request body",
    });
  });
});
