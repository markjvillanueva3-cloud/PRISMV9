/**
 * PRISM MCP Server — Operating-System Routes
 * 9 endpoints backing the operating-system shell, job desk, program release,
 * scheduling study, and shop floor check-in UIs.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { ShellBootstrapEngine } from "../engines/ShellBootstrapEngine.js";
import { JobDeskAggregatorEngine } from "../engines/JobDeskAggregatorEngine.js";
import { ProgramReleaseCatalogEngine } from "../engines/ProgramReleaseCatalogEngine.js";
import { SchedulingStudyAggregatorEngine } from "../engines/SchedulingStudyAggregatorEngine.js";
import { ShopFloorCheckInEngine } from "../engines/ShopFloorCheckInEngine.js";
import { OperatingSystemHotJobsEngine } from "../engines/OperatingSystemHotJobsEngine.js";
import { OperatingSystemMessagesEngine } from "../engines/OperatingSystemMessagesEngine.js";
import { OperatingSystemJobPacketEngine } from "../engines/OperatingSystemJobPacketEngine.js";
import { operatingSystemIntelligenceEngine } from "../engines/OperatingSystemIntelligenceEngine.js";
import {
  milestoneIntelligenceEngine,
  type MilestoneSyncInput,
  type MilestoneSyncResult,
} from "../engines/MilestoneIntelligenceEngine.js";
import { deskPayloadEngine } from "../engines/DeskPayloadEngine.js";
import { globalSearchEngine } from "../engines/GlobalSearchEngine.js";
import { fileUserMachineProfileRepository } from "../services/FileUserMachineProfileRepository.js";
import { calculatorToolCribWorkspaceService } from "../services/CalculatorToolCribWorkspaceService.js";
import { UserMachineProfileService } from "../services/UserMachineProfileService.js";
import { buildProgramReleaseUserMachineProfileSelection } from "../utils/programReleaseMachineCatalog.js";

const userMachineProfileService = new UserMachineProfileService(
  fileUserMachineProfileRepository,
);

function safeSyncMutation(input?: MilestoneSyncInput): MilestoneSyncResult | null {
  if (!input?.job_id?.trim()) {
    return null;
  }

  try {
    return milestoneIntelligenceEngine.syncMutation(input);
  } catch {
    return null;
  }
}

function attachPrismSync<T>(payload: T, prismSync: MilestoneSyncResult | null): T | (T & { prism_sync: MilestoneSyncResult }) {
  if (!prismSync || typeof payload !== "object" || payload === null) {
    return payload;
  }

  return {
    ...(payload as Record<string, unknown>),
    prism_sync: prismSync,
  } as T & { prism_sync: MilestoneSyncResult };
}

export function createOperatingSystemRouter(_callTool: CallToolFn): Router {
  const router = Router();

  // POST /operating-system/shell/bootstrap — Shell navigation + desk counts
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

  // POST /operating-system/intelligence/workspace — Internal AI, CLI, chain, and agent snapshot
  router.post("/intelligence/workspace", async (_req, res) => {
    try {
      const result = await operatingSystemIntelligenceEngine.buildWorkspace();
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/intelligence/analyze — Prompt classification + reasoning synthesis
  router.post("/intelligence/analyze", async (req, res) => {
    try {
      const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
      if (!prompt) {
        res.status(400).json({ ok: false, error: "Missing prompt in request body" });
        return;
      }

      const result = await operatingSystemIntelligenceEngine.analyzePrompt(prompt);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /operating-system/intelligence/shop-floor — Structured shop-floor reasoning + next action synthesis
  router.post("/intelligence/shop-floor", async (req, res) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ ok: false, error: "Missing shop-floor context in request body" });
        return;
      }

      const result = await operatingSystemIntelligenceEngine.analyzeShopFloorContext(req.body);
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
      let prismSync: MilestoneSyncResult | null = null;

      switch (action) {
        case "register":
          result = ShopFloorCheckInEngine.registerJob(params);
          prismSync = safeSyncMutation({
            job_id: result.trackedJob?.jobId ?? result.jobId ?? params.jobId,
            source: "shop-floor-clock",
            trigger: "shop-floor-job-registered",
            operation: result.operation,
            department: result.selectedDepartment,
            note: result.message,
          });
          break;
        case "check-in":
          result = ShopFloorCheckInEngine.checkIntoDepartment(params);
          if (!result.duplicate) {
            prismSync = safeSyncMutation({
              job_id: result.entry?.jobId ?? params.trackedJob?.jobId,
              source: "shop-floor-clock",
              trigger: "shop-floor-department-check-in",
              operation: Array.isArray(params.trackedJob?.operations) ? params.trackedJob.operations[0] : undefined,
              department: result.entry?.department ?? params.selectedDepartment,
              note: result.message,
            });
          }
          break;
        case "build-tasks":
          result = ShopFloorCheckInEngine.buildTrackedTasks(
            params.trackedJob || null,
            params.department || "All",
            params.role,
          );
          break;
        case "task-event":
          result = {
            acknowledged: true,
            trigger: params.trigger,
            taskId: params.taskId,
            note: params.note,
          };
          prismSync = safeSyncMutation({
            job_id: params.jobId,
            source: "shop-floor-clock",
            trigger: params.trigger,
            operation: params.operation,
            department: params.department,
            quantity_completed: params.quantityCompleted,
            scrap_qty: params.scrapQty,
            note: params.note,
          });
          break;
        case "roi-signals":
          result = ShopFloorCheckInEngine.buildRoiSignals(params);
          break;
        default:
          res.status(400).json({ ok: false, error: `Unknown action: ${action}. Use register, check-in, build-tasks, task-event, or roi-signals.` });
            return;
        }

        res.json({ ok: true, data: attachPrismSync(result, prismSync) });
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
