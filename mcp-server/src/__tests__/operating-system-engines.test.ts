/**
 * Sprint C1 — Operating-System Engines + Routes Tests
 * Tests for ShellBootstrap, JobDeskAggregator, ProgramReleaseCatalog,
 * SchedulingStudyAggregator, and ShopFloorCheckIn engines.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { ShellBootstrapEngine } from "../engines/ShellBootstrapEngine.js";
import { JobDeskAggregatorEngine } from "../engines/JobDeskAggregatorEngine.js";
import { ProgramReleaseCatalogEngine } from "../engines/ProgramReleaseCatalogEngine.js";
import { SchedulingStudyAggregatorEngine } from "../engines/SchedulingStudyAggregatorEngine.js";
import { ShopFloorCheckInEngine } from "../engines/ShopFloorCheckInEngine.js";
import { shopConfigurationEngine, ShopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";
import { getJMDieSelectorSeedSummary } from "../utils/jmDieSelectorCatalog.js";
import { invalidateProgramReleaseMachineCatalogCache } from "../utils/programReleaseMachineCatalog.js";

// ─── ShellBootstrapEngine ─────────────────────────────────────────────────────

describe("ShellBootstrapEngine", () => {
  const SAMPLE_JOBS = [
    { id: "JOB-001", status: "in_progress", customer: "Acme", part_number: "BRKT-100" },
    { id: "JOB-002", status: "at_risk", customer: "Boeing", part_number: "FLNG-200" },
    { id: "JOB-003", status: "pending", customer: "SpaceX", part_number: "MNT-300" },
    { id: "JOB-004", status: "running", customer: "Tesla", part_number: "HSG-400" },
  ];

  it("returns desk counts from job statuses", () => {
    const result = ShellBootstrapEngine.getShellBootstrap(SAMPLE_JOBS, 5);
    expect(result.deskCounts.liveJobs).toBe(2); // in_progress + running
    expect(result.deskCounts.atRisk).toBe(1);
    expect(result.deskCounts.inbox).toBe(1); // pending
    expect(result.deskCounts.approvals).toBe(5);
  });

  it("returns pinned and recent entities", () => {
    const result = ShellBootstrapEngine.getShellBootstrap(SAMPLE_JOBS);
    expect(result.pinnedEntities).toHaveLength(3);
    expect(result.recentEntities).toHaveLength(1);
    expect(result.pinnedEntities[0].id).toBe("JOB-001");
    expect(result.pinnedEntities[0].type).toBe("Job");
  });

  it("returns empty counts for no jobs", () => {
    const result = ShellBootstrapEngine.getShellBootstrap([]);
    expect(result.deskCounts.liveJobs).toBe(0);
    expect(result.deskCounts.atRisk).toBe(0);
    expect(result.deskCounts.inbox).toBe(0);
  });

  it("lists 6 employee profiles", () => {
    const profiles = ShellBootstrapEngine.getEmployeeShellProfiles();
    expect(profiles).toHaveLength(6);
    expect(profiles.map((p) => p.id)).toContain("machinist");
    expect(profiles.map((p) => p.id)).toContain("manager");
  });

  it("returns role-filtered employee bootstrap", () => {
    const result = ShellBootstrapEngine.getEmployeeShellBootstrap("programmer", SAMPLE_JOBS, [], 2);
    expect(result.profileId).toBe("programmer");
    expect(result.employeeId).toBe("EMP-0002");
    expect(result.displayName).toBe("Jordan Vance");
    expect(result.department).toBe("Programming");
    expect(result.homeModules.length).toBeGreaterThan(0);
    expect(result.navGroups.length).toBeGreaterThan(0);
    expect(result.deskCounts.approvals).toBe(2);
    expect(result.accessCards.some((card) => card.id === "ac-machine-authority" && card.value === "17")).toBe(true);
    expect(result.policyNote).toContain("shared machine registry");
  });

  it("defaults to machinist for unknown profile", () => {
    const result = ShellBootstrapEngine.getEmployeeShellBootstrap("nonexistent");
    expect(result.profileId).toBe("machinist");
  });

  it("machinist has restricted finance surfaces", () => {
    const result = ShellBootstrapEngine.getEmployeeShellBootstrap("machinist");
    expect(result.restrictedSurfaces.length).toBeGreaterThan(0);
    expect(result.restrictedSurfaces.some((s) => s.label.includes("Financial"))).toBe(true);
  });

  it("manager has no restricted surfaces", () => {
    const result = ShellBootstrapEngine.getEmployeeShellBootstrap("manager");
    expect(result.restrictedSurfaces).toHaveLength(0);
  });

  it("includes hot jobs in shift priorities", () => {
    const hotJobs = [
      { jobId: "JOB-HOT", partNumber: "HOT-1", customer: "Rush", dueDate: "2026-03-30", note: "ASAP", setBy: "Lead", setAt: "2026-03-28" },
    ];
    const result = ShellBootstrapEngine.getEmployeeShellBootstrap("lead", [], hotJobs);
    expect(result.shiftPriorities.some((p) => p.label === "HOT")).toBe(true);
    expect(result.hotJobs).toHaveLength(1);
  });
});

// ─── JobDeskAggregatorEngine ──────────────────────────────────────────────────

describe("JobDeskAggregatorEngine", () => {
  const JOB_WITH_ROUTING = {
    id: "JOB-100",
    status: "in_progress",
    customer: "Acme",
    part_number: "BRKT-100",
    material: "6061-T6",
    routing: [
      { step: 1, operation: "Face Mill", work_center: "Haas VF-2", estimated_time_min: 15, actual_time_min: 12, status: "complete" },
      { step: 2, operation: "Profile", work_center: "Haas VF-2", estimated_time_min: 30, actual_time_min: 0, status: "in_progress" },
      { step: 3, operation: "Drill", work_center: "Haas VF-2", estimated_time_min: 10, status: "pending" },
    ],
    status_history: [
      { status: "ordered", timestamp: "2026-03-25T08:00:00Z", user: "system" },
      { status: "in_progress", timestamp: "2026-03-26T09:00:00Z", user: "operator" },
    ],
  };

  it("builds desk records for multiple jobs", () => {
    const records = JobDeskAggregatorEngine.buildJobDeskRecords([JOB_WITH_ROUTING]);
    expect(records).toHaveLength(1);
    expect(records[0].jobId).toBe("JOB-100");
    expect(records[0].owner).toBe("Acme");
  });

  it("builds traveler steps from routing", () => {
    const records = JobDeskAggregatorEngine.buildJobDeskRecords([JOB_WITH_ROUTING]);
    const traveler = records[0].traveler;
    expect(traveler).toHaveLength(3);
    expect(traveler[0].status).toBe("complete");
    expect(traveler[1].status).toBe("running");
    expect(traveler[2].status).toBe("ready");
    expect(traveler[0].code).toBe("OP010");
  });

  it("detects over-estimate in traveler notes", () => {
    const overJob = {
      ...JOB_WITH_ROUTING,
      routing: [
        { step: 1, operation: "Long Op", work_center: "VMC", estimated_time_min: 10, actual_time_min: 15, status: "complete" },
      ],
    };
    const records = JobDeskAggregatorEngine.buildJobDeskRecords([overJob]);
    expect(records[0].traveler[0].note).toContain("Over estimate");
  });

  it("marks hot jobs", () => {
    const records = JobDeskAggregatorEngine.buildJobDeskRecords([JOB_WITH_ROUTING], new Set(["JOB-100"]));
    expect(records[0].isHot).toBe(true);
    expect(records[0].nextActions[0]).toContain("PRIORITY");
  });

  it("builds approval chain", () => {
    const approvals = JobDeskAggregatorEngine.buildJobApprovals(JOB_WITH_ROUTING);
    expect(approvals).toHaveLength(3);
    expect(approvals[0].label).toBe("Engineering");
    expect(approvals[0].status).toBe("approved"); // in_progress means eng approved
    expect(approvals[1].label).toBe("Quality");
    expect(approvals[2].label).toBe("Shipping");
  });

  it("builds timeline from status history", () => {
    const records = JobDeskAggregatorEngine.buildJobDeskRecords([JOB_WITH_ROUTING]);
    expect(records[0].timeline).toHaveLength(2);
    expect(records[0].timeline[0].title).toContain("ordered");
  });

  it("builds job packet", () => {
    const packet = JobDeskAggregatorEngine.buildJobPacket(JOB_WITH_ROUTING);
    expect(packet.jobId).toBe("JOB-100");
    expect(packet.customer).toBe("Acme");
    expect(packet.desk.traveler).toHaveLength(3);
  });

  it("handles empty input gracefully", () => {
    expect(JobDeskAggregatorEngine.buildJobDeskRecords([])).toHaveLength(0);
    expect(JobDeskAggregatorEngine.buildJobDeskRecords(null as any)).toHaveLength(0);
  });
});

// ─── ProgramReleaseCatalogEngine ──────────────────────────────────────────────

describe("ProgramReleaseCatalogEngine", () => {
  beforeEach(() => {
    shopConfigurationEngine.resetProfile(ShopConfigurationEngine.DEFAULT_PROFILE_ID);
    invalidateProgramReleaseMachineCatalogCache();
  });

  it("returns catalog with all sections", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    expect(catalog.partClasses.length).toBeGreaterThan(0);
    expect(catalog.machines.length).toBeGreaterThan(0);
    expect(catalog.toolholders.length).toBeGreaterThan(0);
    expect(catalog.toolingPackages.length).toBeGreaterThan(0);
    expect(catalog.fixtures.length).toBeGreaterThan(0);
    expect(catalog.stockProfiles.length).toBeGreaterThan(0);
    expect(catalog.cadSources.length).toBeGreaterThan(0);
  });

  it("projects enriched machine profiles into the release catalog", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    expect(catalog.machines.length).toBeGreaterThan(20);

    const okuma = catalog.machines.find((machine) => /GENOS M460V-5AX/i.test(machine.label));
    expect(okuma).toBeDefined();
    expect(okuma?.controller).toContain("OSP-P300MA-H");
    expect(okuma?.spindle).toContain("CAT 40 Big+");
    expect(okuma?.maxRpm).toBe(15000);
  });

  it("anchors JM Die overlays to canonical shop machine ids and controller truth", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();

    const roku = catalog.machines.find((machine) => machine.id === "VMC-05");
    expect(roku).toBeDefined();
    expect(roku?.label).toMatch(/Roku-Roku HC 658-II/i);
    expect(roku?.controller).toBe("Fanuc 31i-B5");
    expect(roku?.machineRatePerHour).toBe(110);

    const multus = catalog.machines.find((machine) => machine.id === "LTH-07");
    expect(multus).toBeDefined();
    expect(multus?.controller).toBe("OSP-P300SA");
    expect(multus?.familyId).toBe("mill-turn");
  });

  it("keeps non-program-release EDM machines out of the JM Die overlay ids", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    expect(catalog.machines.find((machine) => machine.id === "EDM-01")).toBeUndefined();
    expect(catalog.machines.find((machine) => machine.id === "WEDM-01")).toBeUndefined();
  });

  it("projects JM Die selector resources for holders, tooling, and stock", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();

    const er32Holder = catalog.toolholders.find((holder) => holder.id === "th-jmd-big-er32-4nl");
    expect(er32Holder).toBeDefined();
    expect(er32Holder?.label).toBe("BIG DAISHOWA ER-32-4NL");
    expect(er32Holder?.note).toContain("JM Die Fusion exports");

    const baselinePackage = catalog.toolingPackages.find((pkg) => pkg.id === "tp-jmd-release-baseline");
    expect(baselinePackage).toBeDefined();
    expect(baselinePackage?.note).toContain("shop-proven tools");

    const a2Stock = catalog.stockProfiles.find((stock) => stock.id === "stk-jmd-a2-plate");
    expect(a2Stock).toBeDefined();
    expect(a2Stock?.material).toBe("A2 tool steel");
  });

  it("tracks seeded selector resources separately from pending JM Die folders", () => {
    const summary = getJMDieSelectorSeedSummary();

    expect(summary.shop_id).toBe("jm-die");
    expect(summary.toolholder_count).toBeGreaterThanOrEqual(5);
    expect(summary.tooling_package_count).toBeGreaterThanOrEqual(4);
    expect(summary.stock_profile_count).toBeGreaterThanOrEqual(5);
    expect(summary.live_tool_count).toBeGreaterThan(200);
    expect(summary.tooling_categories).toContain("turning");
    expect(summary.tool_holders_root_present).toBe(false);
    expect(summary.tooling_root_present).toBe(false);
    expect(summary.materials_root_present).toBe(false);
  });

  it("builds workspace from valid input", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    const workspace = ProgramReleaseCatalogEngine.buildWorkspace({
      partClassId: catalog.partClasses[0].id,
      machineId: catalog.machines[0].id,
      toolholderId: catalog.toolholders[0].id,
      toolingPackageId: catalog.toolingPackages[0].id,
      fixtureId: catalog.fixtures[0].id,
      stockId: catalog.stockProfiles[0].id,
      cadSourceId: catalog.cadSources[0].id,
    });
    expect(workspace.metrics.length).toBeGreaterThan(0);
    expect(workspace.operationPlan.length).toBeGreaterThan(0);
    expect(workspace.quoteLines.length).toBeGreaterThan(0);
    expect(workspace.selectedMachine.id).toBe(catalog.machines[0].id);
  });

  it("falls back to defaults for unknown IDs", () => {
    const workspace = ProgramReleaseCatalogEngine.buildWorkspace({
      partClassId: "nonexistent",
      machineId: "nonexistent",
      toolholderId: "nonexistent",
      toolingPackageId: "nonexistent",
      fixtureId: "nonexistent",
      stockId: "nonexistent",
      cadSourceId: "nonexistent",
    });
    expect(workspace.selectedPartClass).toBeDefined();
    expect(workspace.selectedMachine).toBeDefined();
  });

  it("generates cost breakdown in quote lines", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    const workspace = ProgramReleaseCatalogEngine.buildWorkspace({
      partClassId: catalog.partClasses[0].id,
      machineId: catalog.machines[0].id,
      toolholderId: catalog.toolholders[0].id,
      toolingPackageId: catalog.toolingPackages[0].id,
      fixtureId: catalog.fixtures[0].id,
      stockId: catalog.stockProfiles[0].id,
      cadSourceId: catalog.cadSources[0].id,
    });
    const totalLine = workspace.quoteLines.find((l) => l.label === "Total");
    expect(totalLine).toBeDefined();
    expect(totalLine!.value).toMatch(/^\$/);
  });

  it("flags high-volatility material alert", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    const tiStock = catalog.stockProfiles.find((s) => s.volatility === "high");
    if (tiStock) {
      const workspace = ProgramReleaseCatalogEngine.buildWorkspace({
        partClassId: catalog.partClasses[0].id,
        machineId: catalog.machines[0].id,
        toolholderId: catalog.toolholders[0].id,
        toolingPackageId: catalog.toolingPackages[0].id,
        fixtureId: catalog.fixtures[0].id,
        stockId: tiStock.id,
        cadSourceId: catalog.cadSources[0].id,
      });
      expect(workspace.alerts.some((a) => a.includes("volatile"))).toBe(true);
    }
  });

  it("builds a workspace for a projected registry-backed machine", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    const okuma = catalog.machines.find((machine) => /GENOS M460V-5AX/i.test(machine.label));
    expect(okuma).toBeDefined();

    const workspace = ProgramReleaseCatalogEngine.buildWorkspace({
      partClassId: catalog.partClasses[0].id,
      machineId: okuma!.id,
      toolholderId: catalog.toolholders[0].id,
      toolingPackageId: catalog.toolingPackages[0].id,
      fixtureId: catalog.fixtures[0].id,
      stockId: catalog.stockProfiles[0].id,
      cadSourceId: catalog.cadSources[0].id,
    });

    expect(workspace.selectedMachine.label).toMatch(/GENOS M460V-5AX/i);
    expect(workspace.selectedMachine.controller).toContain("OSP-P300MA-H");
  });

  it("supports searching the projected machine catalog for downstream consumers", () => {
    const result = ProgramReleaseCatalogEngine.searchMachines({
      query: "okuma genos",
      limit: 10,
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.machines.some((machine) => /GENOS M460V-5AX/i.test(machine.label))).toBe(true);
    expect(result.hasMore || result.machines.length <= 10).toBe(true);
  });

  it("filters projected machine search by controller", () => {
    const result = ProgramReleaseCatalogEngine.searchMachines({
      controller: "osp-p300ma-h",
      limit: 25,
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.machines.every((machine) => machine.controller.toLowerCase().includes("osp-p300ma-h"))).toBe(true);
  });

  it("returns machine-search facets for downstream categorized selectors", () => {
    const result = ProgramReleaseCatalogEngine.searchMachines({
      query: "okuma",
      limit: 15,
    });

    expect(result.facets.manufacturers.length).toBeGreaterThan(0);
    expect(result.facets.families.length).toBeGreaterThan(0);
    expect(result.facets.kinematics.length).toBeGreaterThan(0);
    expect(result.facets.controllers.length).toBeGreaterThan(0);
    expect(result.facets.manufacturers.some((facet) => facet.id === "okuma" && facet.label === "Okuma")).toBe(true);
    expect(result.facets.families.some((facet) => facet.id === "5-axis" && facet.label === "5-Axis Machining Center")).toBe(true);
    expect(result.facets.controllers.some((facet) => facet.value.includes("OSP"))).toBe(true);
  });

  it("supports filtering the projected machine search by normalized family id", () => {
    const result = ProgramReleaseCatalogEngine.searchMachines({
      familyId: "lathe",
      limit: 25,
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.machines.every((machine) => machine.familyId === "lathe")).toBe(true);
  });

  it("supports filtering the projected machine search by manufacturer", () => {
    const result = ProgramReleaseCatalogEngine.searchMachines({
      manufacturer: "okuma",
      limit: 25,
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.machines.every((machine) => machine.manufacturer.toLowerCase() === "okuma")).toBe(true);
  });

  it("preserves multi-word manufacturer facet labels", () => {
    const result = ProgramReleaseCatalogEngine.searchMachines({
      query: "dmg mori",
      limit: 20,
    });

    expect(result.facets.manufacturers.some((facet) => facet.id === "dmg-mori" && facet.label === "DMG MORI")).toBe(true);
  });

  it("returns a projected registry-backed machine by id", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    const okuma = catalog.machines.find((machine) => /GENOS M460V-5AX/i.test(machine.label));
    expect(okuma).toBeDefined();

    const machine = ProgramReleaseCatalogEngine.getMachine(okuma!.id);
    expect(machine).toBeDefined();
    expect(machine?.label).toMatch(/GENOS M460V-5AX/i);
    expect(machine?.controller).toContain("OSP-P300MA-H");
  });

  it("returns canonical JM Die overlay machines by exact shop id", () => {
    const machine = ProgramReleaseCatalogEngine.getMachine("VMC-05");
    expect(machine).toBeDefined();
    expect(machine?.label).toMatch(/Roku-Roku HC 658-II/i);
    expect(machine?.controller).toBe("Fanuc 31i-B5");
  });

  it("deduplicates projected machine ids for downstream selectors", () => {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();
    const uniqueIds = new Set(catalog.machines.map((machine) => machine.id));

    expect(uniqueIds.size).toBe(catalog.machines.length);
  });

  it("deduplicates search results by projected machine id", () => {
    const result = ProgramReleaseCatalogEngine.searchMachines({
      limit: 1000,
    });
    const uniqueIds = new Set(result.machines.map((machine) => machine.id));

    expect(uniqueIds.size).toBe(result.machines.length);
  });
});

// ─── SchedulingStudyAggregatorEngine ──────────────────────────────────────────

describe("SchedulingStudyAggregatorEngine", () => {
  it("builds job-shop study from results", () => {
    const studies = SchedulingStudyAggregatorEngine.buildStudies({
      jobShopResult: {
        makespan: 240,
        jobs: [
          { id: "J1", machine: "M1", start: 0, end: 60 },
          { id: "J2", machine: "M1", start: 60, end: 120 },
          { id: "J3", machine: "M2", start: 0, end: 90 },
        ],
        utilization: { M1: 0.85, M2: 0.75 },
      },
      singleResult: null,
      johnsonsResult: null,
      cpmResult: null,
    });
    expect(studies).toHaveLength(1);
    expect(studies[0].key).toBe("job-shop");
    expect(studies[0].metrics.length).toBeGreaterThan(0);
    expect(studies[0].machineLanes).toHaveLength(2);
  });

  it("builds single-machine study", () => {
    const studies = SchedulingStudyAggregatorEngine.buildStudies({
      jobShopResult: null,
      singleResult: { sequence: ["A", "B", "C"], totalWeightedCompletion: 150, avgFlowTime: 50 },
      johnsonsResult: null,
      cpmResult: null,
    });
    expect(studies).toHaveLength(1);
    expect(studies[0].key).toBe("single-machine");
    expect(studies[0].sequence).toHaveLength(3);
  });

  it("builds Johnson's study", () => {
    const studies = SchedulingStudyAggregatorEngine.buildStudies({
      jobShopResult: null,
      singleResult: null,
      johnsonsResult: { sequence: ["X", "Y"], makespan: 100, machine1Idle: 10, machine2Idle: 20 },
      cpmResult: null,
    });
    expect(studies).toHaveLength(1);
    expect(studies[0].key).toBe("johnsons");
  });

  it("builds CPM study", () => {
    const studies = SchedulingStudyAggregatorEngine.buildStudies({
      jobShopResult: null,
      singleResult: null,
      johnsonsResult: null,
      cpmResult: { criticalPath: ["A", "B", "C"], projectDuration: 200, slack: { A: 0, B: 0, C: 0, D: 15 } },
    });
    expect(studies).toHaveLength(1);
    expect(studies[0].key).toBe("cpm");
    expect(studies[0].sequence).toHaveLength(3);
  });

  it("aggregates multiple algorithms", () => {
    const studies = SchedulingStudyAggregatorEngine.buildStudies({
      jobShopResult: { makespan: 100, jobs: [], utilization: { M1: 0.5 } },
      singleResult: { sequence: ["A"], totalWeightedCompletion: 10, avgFlowTime: 10 },
      johnsonsResult: null,
      cpmResult: { criticalPath: ["X"], projectDuration: 50, slack: { X: 0 } },
    });
    expect(studies).toHaveLength(3);
  });

  it("returns empty study when no inputs", () => {
    const studies = SchedulingStudyAggregatorEngine.buildStudies({
      jobShopResult: null,
      singleResult: null,
      johnsonsResult: null,
      cpmResult: null,
    });
    expect(studies).toHaveLength(1);
    expect(studies[0].key).toBe("empty");
  });

  it("flags overloaded schedule as critical", () => {
    const studies = SchedulingStudyAggregatorEngine.buildStudies({
      jobShopResult: { makespan: 100, jobs: [], utilization: { M1: 0.98 } },
      singleResult: null,
      johnsonsResult: null,
      cpmResult: null,
    });
    expect(studies[0].tone).toBe("critical");
    expect(studies[0].exceptions.length).toBeGreaterThan(0);
  });
});

// ─── ShopFloorCheckInEngine ───────────────────────────────────────────────────

describe("ShopFloorCheckInEngine", () => {
  const PAYLOAD = {
    jobId: "JOB-500",
    partNumber: "PART-X",
    customer: "Acme",
    status: "in_progress",
    operations: [
      { code: "OP010", title: "Face Mill", department: "Machining", quantityTarget: 10, cycleSeconds: 120 },
      { code: "OP020", title: "Inspect", department: "Quality", quantityTarget: 10, cycleSeconds: 60 },
    ],
  };

  it("builds tracked tasks for a department", () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(PAYLOAD, "Machining");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].operationCode).toBe("OP010");
    expect(tasks[0].status).toBe("idle");
  });

  it("builds all tasks when department is All", () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(PAYLOAD, "All");
    expect(tasks).toHaveLength(2);
  });

  it("returns empty for null payload", () => {
    expect(ShopFloorCheckInEngine.buildTrackedTasks(null, "Machining")).toHaveLength(0);
  });

  it("registers a job", () => {
    const result = ShopFloorCheckInEngine.registerJob({
      scanInput: "PRISMJOB|JOB-500",
      jobId: "JOB-500",
      selectedDepartment: "Machining",
      employee: { first_name: "Avery", role: "Machinist", department: "Machining" },
    });
    expect(result.jobId).toBe("JOB-500");
    expect(result.message).toContain("JOB-500");
    expect(result.message).toContain("Avery");
  });

  it("returns error for empty job ID", () => {
    const result = ShopFloorCheckInEngine.registerJob({
      scanInput: "",
      jobId: "",
      selectedDepartment: "Machining",
    });
    expect(result.jobId).toBe("");
    expect(result.message).toContain("No job ID");
  });

  it("checks into department", () => {
    const result = ShopFloorCheckInEngine.checkIntoDepartment({
      trackedJob: PAYLOAD,
      employee: { id: "EMP-001", first_name: "Avery", last_name: "Stone" },
      selectedDepartment: "Machining",
      existingCheckIns: [],
      existingTasks: [],
    });
    expect(result.duplicate).toBe(false);
    expect(result.entry).toBeDefined();
    expect(result.entry!.employeeName).toBe("Avery Stone");
    expect(result.checkIns).toHaveLength(1);
    expect(result.checkIns[0]).toEqual(result.entry);
    expect(result.tasks).toHaveLength(1);
  });

  it("detects duplicate check-in", () => {
    const existing = [{
      id: "c1", jobId: "JOB-500", department: "Machining",
      employeeId: "EMP-001", employeeName: "Avery Stone", scannedAt: "2026-03-28",
    }];
    const result = ShopFloorCheckInEngine.checkIntoDepartment({
      trackedJob: PAYLOAD,
      employee: { id: "EMP-001", first_name: "Avery" },
      selectedDepartment: "Machining",
      existingCheckIns: existing,
      existingTasks: [],
    });
    expect(result.duplicate).toBe(true);
    expect(result.checkIns).toEqual(existing);
  });

  it("rejects check-in without job", () => {
    const result = ShopFloorCheckInEngine.checkIntoDepartment({
      trackedJob: null,
      employee: { first_name: "Test" },
      selectedDepartment: "Machining",
      existingCheckIns: [],
      existingTasks: [],
    });
    expect(result.message).toContain("No job registered");
    expect(result.checkIns).toEqual([]);
  });

  it("generates ROI signals", () => {
    const signals = ShopFloorCheckInEngine.buildRoiSignals({
      tasks: [
        { id: "t1", title: "Op", department: "M", operationCode: "OP010", quantityTarget: 10, cycleSeconds: 60, note: "", status: "completed", elapsedSeconds: 600, partsCompleted: 8, extraParts: 2 },
      ],
      nowMs: Date.now(),
      cycleVariance: -0.15,
      totalExtras: 2,
    });
    expect(signals.some((s) => s.includes("Throughput"))).toBe(true);
    expect(signals.some((s) => s.includes("under estimate"))).toBe(true);
    expect(signals.some((s) => s.includes("extra part"))).toBe(true);
  });

  it("returns empty signals for no tasks", () => {
    const signals = ShopFloorCheckInEngine.buildRoiSignals({
      tasks: [],
      nowMs: Date.now(),
      cycleVariance: 0,
      totalExtras: 0,
    });
    expect(signals).toHaveLength(0);
  });
});
