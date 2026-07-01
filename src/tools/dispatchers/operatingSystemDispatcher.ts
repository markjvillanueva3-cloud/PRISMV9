/**
 * prism_operating_system — Operating-System Shell Dispatcher
 *
 * 27 actions across 9 engines:
 *   Shell (3): shell_bootstrap, shell_employee_profiles, shell_employee_bootstrap
 *   Desk (3): desk_counts, desk_payload, desk_kpi_counts
 *   Jobs (1): job_desk
 *   Program Release (2): program_release_catalog, program_release_workspace
 *   Scheduling (1): scheduling_studies
 *   Shop Floor (1): shop_floor_check_in
 *   Coordination (4): messages_workspace, hot_jobs_list, hot_jobs_set, hot_jobs_clear
 *   Saved Views (4): view_create, view_update, view_delete, view_list
 *   Pins & Recents (4): pin_entity, unpin_entity, pin_list, recent_record, recent_list
 *   Global Search (4): search_global, search_suggest, search_index, search_stats
 *
 * @milestone Sprint-C1 + Session 6-8
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_OPERATING_SYSTEM_SCHEMAS } from "../../schemas/operatingSystemActionSchemas.js";

// Lazy engine cache
let _shellBootstrap: any;
let _jobDesk: any;
let _programRelease: any;
let _scheduling: any;
let _shopFloor: any;
let _hotJobs: any;
let _messages: any;
let _deskPayload: any;
let _globalSearch: any;
let _presetLibrary: any;
let _learningProgression: any;

async function getPresetLibrary() {
  if (!_presetLibrary) { _presetLibrary = await import("../../engines/PresetLibraryEngine.js"); }
  return _presetLibrary.presetLibraryEngine;
}
async function getLearningProgression() {
  if (!_learningProgression) { _learningProgression = await import("../../engines/LearningProgressionEngine.js"); }
  return _learningProgression.learningProgressionEngine;
}

async function getShellBootstrap() {
  if (!_shellBootstrap) { _shellBootstrap = await import("../../engines/ShellBootstrapEngine.js"); }
  return _shellBootstrap.ShellBootstrapEngine;
}
async function getJobDesk() {
  if (!_jobDesk) { _jobDesk = await import("../../engines/JobDeskAggregatorEngine.js"); }
  return _jobDesk.JobDeskAggregatorEngine;
}
async function getProgramRelease() {
  if (!_programRelease) { _programRelease = await import("../../engines/ProgramReleaseCatalogEngine.js"); }
  return _programRelease.ProgramReleaseCatalogEngine;
}
async function getScheduling() {
  if (!_scheduling) { _scheduling = await import("../../engines/SchedulingStudyAggregatorEngine.js"); }
  return _scheduling.SchedulingStudyAggregatorEngine;
}
async function getShopFloor() {
  if (!_shopFloor) { _shopFloor = await import("../../engines/ShopFloorCheckInEngine.js"); }
  return _shopFloor.ShopFloorCheckInEngine;
}
async function getHotJobs() {
  if (!_hotJobs) { _hotJobs = await import("../../engines/OperatingSystemHotJobsEngine.js"); }
  return _hotJobs.OperatingSystemHotJobsEngine;
}
async function getMessages() {
  if (!_messages) { _messages = await import("../../engines/OperatingSystemMessagesEngine.js"); }
  return _messages.OperatingSystemMessagesEngine;
}
async function getDeskPayload() {
  if (!_deskPayload) { _deskPayload = await import("../../engines/DeskPayloadEngine.js"); }
  return _deskPayload.deskPayloadEngine;
}
async function getGlobalSearch() {
  if (!_globalSearch) { _globalSearch = await import("../../engines/GlobalSearchEngine.js"); }
  return _globalSearch.globalSearchEngine;
}

const ACTIONS = [
  "shell_bootstrap",
  "shell_employee_profiles",
  "shell_employee_bootstrap",
  "desk_counts",
  "job_desk",
  "program_release_catalog",
  "program_release_workspace",
  "scheduling_studies",
  "shop_floor_check_in",
  "messages_workspace",
  "hot_jobs_list",
  "hot_jobs_set",
  "hot_jobs_clear",
  "desk_payload",
  "desk_kpi_counts",
  "view_create",
  "view_update",
  "view_delete",
  "view_list",
  "pin_entity",
  "unpin_entity",
  "pin_list",
  "recent_record",
  "recent_list",
  "search_global",
  "search_suggest",
  "search_index",
  "search_stats",
  // ── Preset Library (Session 6-10) ──
  "preset_save",
  "preset_get",
  "preset_list",
  "preset_search",
  "preset_share",
  "preset_unshare",
  "preset_compare",
  "preset_validate",
  "preset_delete",
  "preset_increment_use",
  // ── Learning Progression (Session 6-10) ──
  "course_create",
  "course_get",
  "course_enroll",
  "course_progress",
  "course_search",
  "checkpoint_submit",
  "enrollment_summary",
  "learning_media_add",
  "learning_media_list",
] as const;

export function registerOperatingSystemDispatcher(server: any): void {
  server.tool(
    "prism_operating_system",
    `Operating-system shell, desk, program release, scheduling, and shop floor actions.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: typeof ACTIONS[number];
      params?: Record<string, any>;
    }) => {
      const params = rawParams;
      log.info(`[prism_operating_system] ${action}`);

      const validation = validateActionParams(action, params, ACTION_OPERATING_SYSTEM_SCHEMAS);
      if (!validation.valid) return dispatcherError(validation.errorMessage || "Validation failed", action, "prism_operating_system");

      try {
        switch (action) {
          // ─── Shell ─────────────────────────────────────────────────
          case "shell_bootstrap": {
            const Engine = await getShellBootstrap();
            return slimResponse(Engine.getShellBootstrap(params.jobs, params.approvalCount));
          }
          case "shell_employee_profiles": {
            const Engine = await getShellBootstrap();
            return slimResponse(Engine.getEmployeeShellProfiles());
          }
          case "shell_employee_bootstrap": {
            const Engine = await getShellBootstrap();
            return slimResponse(Engine.getEmployeeShellBootstrap(
              params.profileId, params.jobs, params.hotJobs, params.approvalCount,
            ));
          }

          // ─── Desk ──────────────────────────────────────────────────
          case "desk_counts": {
            const Engine = await getShellBootstrap();
            const bootstrap = Engine.getShellBootstrap(params.jobs, params.approvalCount);
            return slimResponse(bootstrap.deskCounts);
          }

          // ─── Jobs ──────────────────────────────────────────────────
          case "job_desk": {
            const Engine = await getJobDesk();
            const hotSet = new Set<string>(params.hotJobIds || []);
            const records = Engine.buildJobDeskRecords([params.job], hotSet);
            return slimResponse(records[0] || null);
          }

          // ─── Program Release ───────────────────────────────────────
          case "program_release_catalog": {
            const Engine = await getProgramRelease();
            return slimResponse(Engine.getCatalog());
          }
          case "program_release_workspace": {
            const Engine = await getProgramRelease();
            return slimResponse(Engine.buildWorkspace(params));
          }

          // ─── Scheduling ────────────────────────────────────────────
          case "scheduling_studies": {
            const Engine = await getScheduling();
            return slimResponse(Engine.buildStudies({
              jobShopResult: params.jobShopResult || null,
              singleResult: params.singleResult || null,
              johnsonsResult: params.johnsonsResult || null,
              cpmResult: params.cpmResult || null,
            }));
          }

          // ─── Shop Floor ────────────────────────────────────────────
          case "shop_floor_check_in": {
            const Engine = await getShopFloor();
            const subAction = params.action;
            switch (subAction) {
              case "register":
                return slimResponse(Engine.registerJob(params));
              case "check-in":
                return slimResponse(Engine.checkIntoDepartment(params));
              case "build-tasks":
                return slimResponse(Engine.buildTrackedTasks(params.trackedJob || null, params.department || "All", params.role));
              case "roi-signals":
                return slimResponse(Engine.buildRoiSignals(params));
              default:
                return dispatcherError(`Unknown shop_floor_check_in sub-action: ${subAction}`, action, "prism_operating_system");
            }
          }

          // ─── Coordination ───────────────────────────────────────────
          case "messages_workspace": {
            const Engine = await getMessages();
            return slimResponse(Engine.buildWorkspace(params));
          }
          case "hot_jobs_list": {
            const Engine = await getHotJobs();
            return slimResponse(Engine.list());
          }
          case "hot_jobs_set": {
            const Engine = await getHotJobs();
            return slimResponse(Engine.set(params as any));
          }
          case "hot_jobs_clear": {
            const Engine = await getHotJobs();
            return slimResponse(Engine.clear(params.jobId));
          }

          // ─── Desk Payload (Session 6-8) ──────────────────────────────
          case "desk_payload": {
            const engine = await getDeskPayload();
            return slimResponse(engine.getDeskPayload(params.role || "viewer", params.data || {}));
          }
          case "desk_kpi_counts": {
            const engine = await getDeskPayload();
            return slimResponse(engine.getDeskCounts(params.data || {}));
          }

          // ─── Saved Views ──────────────────────────────────────────────
          case "view_create": {
            const engine = await getDeskPayload();
            return slimResponse(engine.createSavedView(params));
          }
          case "view_update": {
            const engine = await getDeskPayload();
            return slimResponse(engine.updateSavedView(params));
          }
          case "view_delete": {
            const engine = await getDeskPayload();
            return slimResponse(engine.deleteSavedView(params.view_id, params.user_id));
          }
          case "view_list": {
            const engine = await getDeskPayload();
            return slimResponse(engine.listSavedViews(params.user_id, params.entity_type));
          }

          // ─── Pins & Recents ───────────────────────────────────────────
          case "pin_entity": {
            const engine = await getDeskPayload();
            return slimResponse(engine.pinEntity(params.user_id, params.entity_type, params.entity_id, params.title));
          }
          case "unpin_entity": {
            const engine = await getDeskPayload();
            return slimResponse(engine.unpinEntity(params.pin_id, params.user_id));
          }
          case "pin_list": {
            const engine = await getDeskPayload();
            return slimResponse(engine.listPins(params.user_id));
          }
          case "recent_record": {
            const engine = await getDeskPayload();
            return slimResponse(engine.recordAccess(params.user_id, params.entity_type, params.entity_id, params.title));
          }
          case "recent_list": {
            const engine = await getDeskPayload();
            return slimResponse(engine.listRecents(params.user_id, params.limit));
          }

          // ─── Global Search (Session 6-8) ──────────────────────────────
          case "search_global": {
            const engine = await getGlobalSearch();
            return slimResponse(engine.search(params));
          }
          case "search_suggest": {
            const engine = await getGlobalSearch();
            return slimResponse(engine.suggest(params));
          }
          case "search_index": {
            const engine = await getGlobalSearch();
            return slimResponse(engine.indexEntities(params.entities || []));
          }
          case "search_stats": {
            const engine = await getGlobalSearch();
            return slimResponse(engine.getStats());
          }

          // ─── Preset Library (Session 6-10) ─────────────────────────────
          case "preset_save": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.savePreset(params));
          }
          case "preset_get": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.getPreset(params.preset_id, params.user_id));
          }
          case "preset_list": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.listPresets(params));
          }
          case "preset_search": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.searchPresets(params));
          }
          case "preset_share": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.sharePreset(params.preset_id, params.user_id));
          }
          case "preset_unshare": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.unsharePreset(params.preset_id, params.user_id));
          }
          case "preset_compare": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.comparePresets(params.preset_ids, params.user_id));
          }
          case "preset_validate": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.validatePreset(params.preset_id));
          }
          case "preset_delete": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.deletePreset(params.preset_id, params.user_id));
          }
          case "preset_increment_use": {
            const engine = await getPresetLibrary();
            return slimResponse(engine.incrementUseCount(params.preset_id));
          }

          // ─── Learning Progression (Session 6-10) ──────────────────────────
          case "course_create": {
            const engine = await getLearningProgression();
            return slimResponse(engine.createCourse(params));
          }
          case "course_get": {
            const engine = await getLearningProgression();
            return slimResponse(engine.getCourse(params.course_id));
          }
          case "course_enroll": {
            const engine = await getLearningProgression();
            return slimResponse(engine.enroll(params));
          }
          case "course_progress": {
            const engine = await getLearningProgression();
            return slimResponse(engine.getProgress(params.user_id, params.course_id));
          }
          case "course_search": {
            const engine = await getLearningProgression();
            return slimResponse(engine.searchCourses(params));
          }
          case "checkpoint_submit": {
            const engine = await getLearningProgression();
            return slimResponse(engine.submitCheckpoint(params));
          }
          case "enrollment_summary": {
            const engine = await getLearningProgression();
            return slimResponse(engine.getEnrollmentSummary(params.user_id));
          }
          case "learning_media_add": {
            const engine = await getLearningProgression();
            return slimResponse(engine.addMedia(params));
          }
          case "learning_media_list": {
            const engine = await getLearningProgression();
            return slimResponse(engine.listMedia(params.course_id, params.module_idx));
          }

          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_operating_system");
        }
      } catch (err: any) {
        log.error(`[prism_operating_system] ${action} failed: ${err.message}`);
        return dispatcherError(err.message, action, "prism_operating_system");
      }
    },
  );
}
