/**
 * PRISM MCP Server — Operating-System Routes
 * 9 endpoints backing the operating-system shell, job desk, program release,
 * scheduling study, and shop floor check-in UIs.
 */
import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import type { CallToolFn } from "./index.js";
import { ShellBootstrapEngine } from "../engines/ShellBootstrapEngine.js";
import { JobDeskAggregatorEngine } from "../engines/JobDeskAggregatorEngine.js";
import { ProgramReleaseCatalogEngine } from "../engines/ProgramReleaseCatalogEngine.js";
import { SchedulingStudyAggregatorEngine } from "../engines/SchedulingStudyAggregatorEngine.js";
import { jobLifecycleEngine } from "../engines/JobLifecycleEngine.js";
import { ShopFloorCheckInEngine, type JobTrackingPayload } from "../engines/ShopFloorCheckInEngine.js";
import { OperatingSystemHotJobsEngine } from "../engines/OperatingSystemHotJobsEngine.js";
import { OperatingSystemMessagesEngine } from "../engines/OperatingSystemMessagesEngine.js";
import { OperatingSystemJobPacketEngine } from "../engines/OperatingSystemJobPacketEngine.js";
import { deskPayloadEngine } from "../engines/DeskPayloadEngine.js";
import { globalSearchEngine } from "../engines/GlobalSearchEngine.js";
import { fileUserMachineProfileRepository } from "../services/FileUserMachineProfileRepository.js";
import { calculatorToolCribWorkspaceService } from "../services/CalculatorToolCribWorkspaceService.js";
import { UserMachineProfileService } from "../services/UserMachineProfileService.js";
import { buildProgramReleaseUserMachineProfileSelection } from "../utils/programReleaseMachineCatalog.js";

const userMachineProfileService = new UserMachineProfileService(
  fileUserMachineProfileRepository,
);

function buildDepartmentOperation(code: string, quantity: number, cycleSecondsBase: number) {
  const normalized = code.trim().toUpperCase();
  switch (normalized) {
    case "CAD":
      return {
        id: "cad-work",
        code: "CAD",
        label: "CAD work",
        title: "CAD work",
        department: "CAD work",
        quantityTarget: quantity,
        cycleSeconds: 0,
        note: "Model revisions, print cleanup, and design-release alignment.",
        processType: "programming" as const,
      };
    case "CAM":
      return {
        id: "cam-programming",
        code: "CAM",
        label: "CAM programming",
        title: "CAM programming",
        department: "CAM programming",
        quantityTarget: quantity,
        cycleSeconds: 0,
        note: "Toolpath programming, simulation, and setup-sheet confirmation.",
        processType: "programming" as const,
      };
    case "OP10":
      return {
        id: "setup",
        code: "OP10",
        label: "Job setup",
        title: "Job setup",
        department: "Job setup",
        quantityTarget: quantity,
        cycleSeconds: 0,
        note: "Fixture, offsets, prove-out, and first-piece setup.",
        processType: "setup" as const,
      };
    case "OP20":
      return {
        id: "run-cycle",
        code: "OP20",
        label: "Run cycle",
        title: "Run cycle",
        department: "Run cycle",
        quantityTarget: quantity,
        cycleSeconds: cycleSecondsBase,
        note: "Cycle production time with parts completed and extras captured.",
        processType: "production_run" as const,
      };
    case "OP25":
      return {
        id: "secondary-op",
        code: "OP25",
        label: "Secondary op / deburr",
        title: "Secondary op / deburr",
        department: "Run cycle",
        quantityTarget: quantity,
        cycleSeconds: Math.max(Math.round(cycleSecondsBase * 0.35), 16),
        note: "Secondary handling, deburr, or support work between cycles.",
        processType: "secondary_ops" as const,
      };
    case "OP30":
      return {
        id: "inspection",
        code: "OP30",
        label: "Inspection",
        title: "Inspection",
        department: "Quality",
        quantityTarget: quantity,
        cycleSeconds: Math.max(Math.round(cycleSecondsBase * 0.3), 12),
        note: "First-article, in-process, and final inspection coverage.",
        processType: "inspection" as const,
      };
    case "OP40":
      return {
        id: "shipping",
        code: "OP40",
        label: "Packout / shipping",
        title: "Packout / shipping",
        department: "Shipping",
        quantityTarget: quantity,
        cycleSeconds: 0,
        note: "Packout, labels, customer documentation, and carrier handoff.",
        processType: "material_handling" as const,
      };
    default:
      return {
        id: normalized.toLowerCase(),
        code: normalized,
        label: normalized,
        title: normalized,
        department: "Run cycle",
        quantityTarget: quantity,
        cycleSeconds: cycleSecondsBase,
        note: `${normalized} is ready for floor tracking.`,
        processType: "production_run" as const,
      };
  }
}

function buildTrackedJobFromLifecycleJob(jobId: string): JobTrackingPayload | null {
  const job = jobLifecycleEngine.getJob(jobId);
  if (!job || "error" in job) return null;

  const quantity = Math.max(job.quantity || 0, 1);
  const cycleSecondsBase = Math.max(
    Math.round((((job.time_tracking?.estimated_hours ?? 8) * 3600) / quantity)),
    24,
  );
  const operations = ["CAD", "CAM", "OP10", "OP20", "OP25", "OP30", "OP40"].map((code) =>
    buildDepartmentOperation(code, quantity, cycleSecondsBase),
  );

  return {
    jobId: job.id,
    partNumber: job.part_number || "UNASSIGNED",
    customer: job.customer || "Pending customer",
    status: job.status,
    operations,
  };
}

function buildTrackedJobFromScan(scanInput: unknown): JobTrackingPayload | null {
  if (typeof scanInput !== "string") return null;
  const raw = scanInput.trim();
  if (!raw.startsWith("PRISMJOB|")) return null;

  const entries = raw.split("|").slice(1).map((segment) => {
    const [key, ...rest] = segment.split("=");
    return [key, decodeURIComponent(rest.join("="))] as const;
  });
  const values = Object.fromEntries(entries);
  const quantity = Math.max(Number(values.qty || 0) || 0, 1);
  const operationCodes = (values.operations ? values.operations.split(",") : ["OP10", "OP20", "OP30"])
    .filter(Boolean)
    .map((code) => code.trim().toUpperCase());
  if (operationCodes.includes("OP20") && !operationCodes.includes("OP25")) {
    const runIndex = operationCodes.indexOf("OP20");
    operationCodes.splice(runIndex + 1, 0, "OP25");
  }
  const operations = operationCodes.map((code) => buildDepartmentOperation(code, quantity, 120));

  return {
    jobId: values.job || "UNKNOWN-JOB",
    partNumber: values.part || "Unspecified",
    customer: values.customer || "Unknown customer",
    status: "tracked",
    operations,
  };
}

export function createOperatingSystemRouter(_callTool: CallToolFn): Router {
  const router = Router();

  // SECURITY (U-ERP-SHOPCONFIG-AUTH): gate the entire operating-system shell.
  // Mounted under the global optionalToken (index.ts) which never rejects anon,
  // so before this line anon could run GET /search across the employee /
  // invoice / purchase_order / customer / quality_record indices (cross-entity
  // PII + financial search) and persist machine-profiles / views / pins /
  // recents. Every route requires a logged-in user; user-scoped routes are keyed
  // by the :userId path param, so login (not a role) is the correct gate here.
  router.use(verifyToken);

  // POST /operating-system/shell/bootstrap - Shell navigation + desk counts
  router.post("/shell/bootstrap", async (req, res) => {
    try {
      const { jobs = [], approvalCount = 0 } = req.body || {};
      const result = ShellBootstrapEngine.getShellBootstrap(jobs, approvalCount);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/shell/employee-profiles — List available role profiles
  router.post("/shell/employee-profiles", async (_req, res) => {
    try {
      const result = ShellBootstrapEngine.getEmployeeShellProfiles();
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/shell/employee/:profileId — Role-filtered employee bootstrap
  router.post("/shell/employee/:profileId", async (req, res) => {
    try {
      const { profileId } = req.params;
      const { jobs = [], hotJobs, approvalCount = 0 } = req.body || {};
      const resolvedHotJobs = Array.isArray(hotJobs) && hotJobs.length > 0
        ? hotJobs
        : OperatingSystemHotJobsEngine.list();
      const result = ShellBootstrapEngine.getEmployeeShellBootstrap(
        profileId,
        jobs,
        resolvedHotJobs,
        approvalCount,
      );
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/desk/counts — Quick desk counts
  router.post("/desk/counts", async (req, res) => {
    try {
      const { jobs = [], approvalCount = 0 } = req.body || {};
      const bootstrap = ShellBootstrapEngine.getShellBootstrap(jobs, approvalCount);
      res.json({ ok: true, data: bootstrap.deskCounts });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/jobs/:jobId/desk — Full job desk record
  router.post("/jobs/:jobId/desk", async (req, res) => {
    try {
      const { job, hotJobIds = [] } = req.body || {};
      if (!job) {
        res.status(400).json({ ok: false, error: "Missing job in request body" });
        return;
      }
      const resolvedHotJobIds = Array.isArray(hotJobIds) && hotJobIds.length > 0
        ? hotJobIds
        : OperatingSystemHotJobsEngine.ids();
      const hotSet = new Set<string>(resolvedHotJobIds);
      const records = JobDeskAggregatorEngine.buildJobDeskRecords([job], hotSet);
      res.json({ ok: true, data: records[0] || null });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/jobs/:jobId/approvals — Current approval chain
  router.post("/jobs/:jobId/approvals", async (req, res) => {
    try {
      const { job } = req.body || {};
      if (!job) {
        res.status(400).json({ ok: false, error: "Missing job in request body" });
        return;
      }

      const result = JobDeskAggregatorEngine.buildJobApprovals(job);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/jobs/:jobId/packet — Tracking packet for shop-floor continuity
  router.post("/jobs/:jobId/packet", async (req, res) => {
    try {
      const { job, options } = req.body || {};
      if (!job) {
        res.status(400).json({ ok: false, error: "Missing job in request body" });
        return;
      }

      const result = OperatingSystemJobPacketEngine.buildJobPacket(job, options);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/jobs/intake-preview — Build draft preview job + packet
  router.post("/jobs/intake-preview", async (req, res) => {
    try {
      const result = OperatingSystemJobPacketEngine.buildIntakePreview(req.body || {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/hot-jobs — Shop-wide hot-job authority
  router.get("/hot-jobs", async (_req, res) => {
    try {
      res.json({ ok: true, data: OperatingSystemHotJobsEngine.list() });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/hot-jobs/set — Mark a job hot
  router.post("/hot-jobs/set", async (req, res) => {
    try {
      const { jobId } = req.body || {};
      if (!jobId || typeof jobId !== "string") {
        res.status(400).json({ ok: false, error: "Missing jobId in request body" });
        return;
      }

      const result = OperatingSystemHotJobsEngine.set(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/hot-jobs/clear — Clear a hot-job flag
  router.post("/hot-jobs/clear", async (req, res) => {
    try {
      const { jobId } = req.body || {};
      if (!jobId || typeof jobId !== "string") {
        res.status(400).json({ ok: false, error: "Missing jobId in request body" });
        return;
      }

      const result = OperatingSystemHotJobsEngine.clear(jobId);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/messages/workspace — Active message workspace snapshot
  router.post("/messages/workspace", async (req, res) => {
    try {
      const result = OperatingSystemMessagesEngine.buildWorkspace(req.body || {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/program-release/catalog — Available machines, tools, fixtures, stock
  router.post("/program-release/catalog", async (_req, res) => {
    try {
      const result = ProgramReleaseCatalogEngine.getCatalog();
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/program-release/machine-search — Query the projected release-safe machine catalog
  router.post("/program-release/machine-search", async (req, res) => {
    try {
      const result = ProgramReleaseCatalogEngine.searchMachines(req.body || {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/program-release/machine/:machineId — Read one projected release-safe machine profile
  router.get("/program-release/machine/:machineId", async (req, res) => {
    try {
      const result = ProgramReleaseCatalogEngine.getMachine(req.params.machineId);
      if (!result) {
        res.status(404).json({ ok: false, error: `Unknown program-release machine: ${req.params.machineId}` });
        return;
      }
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/program-release/machine-profile — Persist a reusable user machine profile
  router.post("/program-release/machine-profile", async (req, res) => {
    try {
      const { profile, selection, source = "user_override", expectedVersion, makeDefault = false } = req.body || {};

      const resolvedProfile =
        profile && typeof profile === "object"
          ? profile
          : selection && typeof selection === "object"
            ? buildProgramReleaseUserMachineProfileSelection(selection)
            : null;

      if (!resolvedProfile) {
        res.status(400).json({ ok: false, error: "Missing profile in request body or invalid machine selection." });
        return;
      }

      const result = await userMachineProfileService.persistProfile({
        profile: resolvedProfile,
        consumer: "program_release",
        source,
        expectedVersion,
        makeDefault,
      });

      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/program-release/machine-profile/default/:userId — Read the user's default release machine profile
  router.get("/program-release/machine-profile/default/:userId", async (req, res) => {
    try {
      const workspaceId = typeof req.query.workspaceId === "string"
        ? req.query.workspaceId
        : undefined;
      const result = await userMachineProfileService.getDefaultProfile(
        req.params.userId,
        "program_release",
        workspaceId,
      );
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/program-release/machine-profile/:profileId — Read one saved machine profile
  router.get("/program-release/machine-profile/:profileId", async (req, res) => {
    try {
      const result = await userMachineProfileService.getProfile(req.params.profileId);
      if (!result) {
        res.status(404).json({ ok: false, error: `Unknown user machine profile: ${req.params.profileId}` });
        return;
      }
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/calculator/machine-profile — Persist a reusable calculator machine profile
  router.post("/calculator/machine-profile", async (req, res) => {
    try {
      const { profile, source = "user_override", expectedVersion, makeDefault = false } = req.body || {};

      if (!profile || typeof profile !== "object") {
        res.status(400).json({ ok: false, error: "Missing calculator machine profile in request body." });
        return;
      }

      const result = await userMachineProfileService.persistProfile({
        profile,
        consumer: "calculator",
        source,
        expectedVersion,
        makeDefault,
      });

      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/calculator/machine-profile/default/:userId — Read the user's default calculator machine profile
  router.get("/calculator/machine-profile/default/:userId", async (req, res) => {
    try {
      const workspaceId = typeof req.query.workspaceId === "string"
        ? req.query.workspaceId
        : undefined;
      const result = await userMachineProfileService.getDefaultProfile(
        req.params.userId,
        "calculator",
        workspaceId,
      );
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/calculator/machine-profile/:profileId — Read one saved calculator machine profile
  router.get("/calculator/machine-profile/:profileId", async (req, res) => {
    try {
      const result = await userMachineProfileService.getProfile(req.params.profileId);
      if (!result) {
        res.status(404).json({ ok: false, error: `Unknown user machine profile: ${req.params.profileId}` });
        return;
      }
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/calculator/tool-crib/:userId — Read the persisted calculator My Shop / tool crib workspace
  router.get("/calculator/tool-crib/:userId", async (req, res) => {
    try {
      const workspaceId = typeof req.query.workspaceId === "string"
        ? req.query.workspaceId
        : undefined;
      const result = await calculatorToolCribWorkspaceService.getWorkspace(req.params.userId, workspaceId);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/calculator/tool-crib/document-intake — Extract tooling + part numbers into My Shop recommendations
  router.post("/calculator/tool-crib/document-intake", async (req, res) => {
    try {
      const { userId, filename, sourceType } = req.body || {};
      if (!userId || typeof userId !== "string") {
        res.status(400).json({ ok: false, error: "Missing userId in request body." });
        return;
      }
      if (!filename || typeof filename !== "string") {
        res.status(400).json({ ok: false, error: "Missing filename in request body." });
        return;
      }
      if (!sourceType || typeof sourceType !== "string") {
        res.status(400).json({ ok: false, error: "Missing sourceType in request body." });
        return;
      }

      const result = await calculatorToolCribWorkspaceService.ingestDocument(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/calculator/tool-crib/local-scan — Run an explicit-consent local CAD/CAM tooling scan
  router.post("/calculator/tool-crib/local-scan", async (req, res) => {
    try {
      const { userId, approvedByUser } = req.body || {};
      if (!userId || typeof userId !== "string") {
        res.status(400).json({ ok: false, error: "Missing userId in request body." });
        return;
      }
      if (approvedByUser !== true) {
        res.status(400).json({ ok: false, error: "Explicit user approval is required before scanning local CAD/CAM tooling sources." });
        return;
      }

      const result = await calculatorToolCribWorkspaceService.runLocalCadCamScan(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/program-release/workspace — Build workspace from selections
  router.post("/program-release/workspace", async (req, res) => {
    try {
      const input = req.body;
      if (!input || !input.partClassId) {
        res.status(400).json({ ok: false, error: "Missing partClassId in request body" });
        return;
      }
      const result = ProgramReleaseCatalogEngine.buildWorkspace(input);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/scheduling/studies — Aggregate scheduling algorithm results
  router.post("/scheduling/studies", async (req, res) => {
    try {
      const inputs = req.body || {};
      const result = SchedulingStudyAggregatorEngine.buildStudies({
        jobShopResult: inputs.jobShopResult || null,
        singleResult: inputs.singleResult || null,
        johnsonsResult: inputs.johnsonsResult || null,
        cpmResult: inputs.cpmResult || null,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/shop-floor/check-in — Department check-in + task assignment
  router.post("/shop-floor/check-in", async (req, res) => {
    try {
      const { action, ...params } = req.body || {};
      let result: any;

      switch (action) {
        case "register": {
          const baseResult = ShopFloorCheckInEngine.registerJob(params);
          const trackedJob =
            buildTrackedJobFromScan(params.scanInput) ??
            buildTrackedJobFromLifecycleJob(baseResult.jobId);
          const tasks = ShopFloorCheckInEngine.buildTrackedTasks(
            trackedJob,
            baseResult.selectedDepartment || "All",
            params.employee?.role,
          );
          result = {
            ...baseResult,
            trackedJob,
            tasks,
            operation: tasks[0]?.operationCode ?? baseResult.operation,
          };
          break;
        }
        case "check-in":
          result = ShopFloorCheckInEngine.checkIntoDepartment(params);
          break;
        case "build-tasks":
          result = ShopFloorCheckInEngine.buildTrackedTasks(
            params.trackedJob || null,
            params.department || "All",
            params.role,
          );
          break;
        case "task-event":
          result = ShopFloorCheckInEngine.recordTaskEvent(params);
          break;
        case "roi-signals":
          result = ShopFloorCheckInEngine.buildRoiSignals(params);
          break;
        default:
          res.status(400).json({ ok: false, error: `Unknown action: ${action}. Use register, check-in, build-tasks, task-event, or roi-signals.` });
          return;
      }

      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── Desk Payloads (Session 6-8) ───────────────────────────────────────────

  // GET /operating-system/desk — Role-based desk payload
  router.get("/desk", async (req, res) => {
    try {
      const role = (req.query.role as string) || "viewer";
      const result = deskPayloadEngine.getDeskPayload(role as any, {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/desk — Role-based desk payload with data
  router.post("/desk", async (req, res) => {
    try {
      const { role = "viewer", data = {} } = req.body || {};
      const result = deskPayloadEngine.getDeskPayload(role, data);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /operating-system/desk/kpi-counts — Quick KPI summary counts
  router.get("/desk/kpi-counts", async (_req, res) => {
    try {
      const result = deskPayloadEngine.getDeskCounts({});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── Saved Views (Session 6-8) ───────────────────────────────────────────

  router.post("/views", async (req, res) => {
    try {
      const result = deskPayloadEngine.createSavedView(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.put("/views", async (req, res) => {
    try {
      const result = deskPayloadEngine.updateSavedView(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.delete("/views/:viewId", async (req, res) => {
    try {
      const result = deskPayloadEngine.deleteSavedView(req.params.viewId, req.body.user_id);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.get("/views/:userId", async (req, res) => {
    try {
      const result = deskPayloadEngine.listSavedViews(req.params.userId, req.query.entity_type as string);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── Pins (Session 6-8) ──────────────────────────────────────────────────

  router.post("/pins", async (req, res) => {
    try {
      const { user_id, entity_type, entity_id, title } = req.body;
      const result = deskPayloadEngine.pinEntity(user_id, entity_type, entity_id, title);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.delete("/pins/:pinId", async (req, res) => {
    try {
      const result = deskPayloadEngine.unpinEntity(req.params.pinId, req.body.user_id);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.get("/pins/:userId", async (req, res) => {
    try {
      const result = deskPayloadEngine.listPins(req.params.userId);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── Recents (Session 6-8) ───────────────────────────────────────────────

  router.post("/recents", async (req, res) => {
    try {
      const { user_id, entity_type, entity_id, title } = req.body;
      const result = deskPayloadEngine.recordAccess(user_id, entity_type, entity_id, title);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.get("/recents/:userId", async (req, res) => {
    try {
      const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
      const result = deskPayloadEngine.listRecents(req.params.userId, limit);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── Global Search (Session 6-8) ─────────────────────────────────────────

  const VALID_SEARCH_TYPES = new Set([
    "part", "quote", "job", "customer", "tool",
    "machine", "invoice", "purchase_order", "employee", "quality_record",
  ]);

  router.get("/search", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const rawTypes = req.query.types ? (req.query.types as string).split(",") : undefined;
      const types = rawTypes?.filter((t) => VALID_SEARCH_TYPES.has(t));
      if (rawTypes && types && types.length === 0) {
        res.status(400).json({ ok: false, error: `Invalid entity types. Valid: ${[...VALID_SEARCH_TYPES].join(", ")}` });
        return;
      }
      const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const result = globalSearchEngine.search({ query: q, types: types as any, limit, offset });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/search/suggest", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const limit = parseInt(req.query.limit as string) || 10;
      const result = globalSearchEngine.suggest({ query: q, limit });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/search/index", async (req, res) => {
    try {
      const result = globalSearchEngine.indexEntities(req.body.entities || []);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.get("/search/stats", async (_req, res) => {
    try {
      const result = globalSearchEngine.getStats();
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
