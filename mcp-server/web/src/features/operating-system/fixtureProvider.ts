import { buildJobTrackingPacket } from '../../utils/jobTracking';
import type { OperatingSystemServices } from './contracts';
import {
  buildAlarmCommerceWorkspace,
  buildProgramPurchaseRecommendations,
  SHELL_COMMERCE_CATALOG,
} from './commerceFixtures';
import { buildHotShiftPriorities, clearHotJob, isHotJob, listHotJobs, markHotJob, rankJobsForTodo, subscribeHotJobs } from './hotJobSignals';
import { buildJobApprovals, buildJobDeskRecords, buildJobIntakePreview } from './jobDeskFixtures';
import { INVENTORY_OPERATIONS_WORKSPACE } from './inventoryOperationsFixtures';
import { PLATFORM_LEARNING_SNAPSHOT } from './learningIntelligenceFixtures';
import { buildMessagesWorkspaceFixture, EMAIL_LOGIN_OPTIONS, resolveEmailLoginFixture } from './messageFixtures';
import { buildProgramReleaseWorkspace, PROGRAM_RELEASE_CATALOG } from './programReleaseFixtures';
import { buildSchedulingStudies, buildScheduleReleaseRecord } from './schedulingFixtures';
import {
  EMPLOYEE_BOOTSTRAPS,
  FIXTURE_RESULTS,
  SHELL_BOOTSTRAP,
  listEmployeeProfileSummaries,
  matchesSearchResult,
} from './shellFixtures';
import {
  createShellSavedView,
  deleteShellSavedView,
  readShellSavedViews,
  updateShellSavedView,
} from './shellSavedViewsState';
import { buildRoiSignals, buildTrackedTasks, checkIntoDepartment, recordTaskEvent, registerTrackedJob } from './shopFloorFixtures';

function buildPinnedRecords(current: typeof FIXTURE_RESULTS, record: typeof FIXTURE_RESULTS[number]) {
  if (current.some((entry) => entry.id === record.id)) {
    return current;
  }

  return [record, ...current.filter((entry) => entry.id !== record.id)].slice(0, 8);
}

function buildRecentRecords(current: typeof FIXTURE_RESULTS, record: typeof FIXTURE_RESULTS[number]) {
  return [record, ...current.filter((entry) => entry.id !== record.id)].slice(0, 6);
}

export const fixtureOperatingSystemServices: OperatingSystemServices = {
  async getShellBootstrap() {
    return SHELL_BOOTSTRAP;
  },

  async getEmployeeShellProfiles() {
    return listEmployeeProfileSummaries();
  },

  async getEmailLoginOptions() {
    return EMAIL_LOGIN_OPTIONS;
  },

  async resolveEmailLogin(email) {
    return resolveEmailLoginFixture(email);
  },

  async getEmployeeShellBootstrap(profileId) {
    const base = EMPLOYEE_BOOTSTRAPS[profileId ?? 'machinist'] ?? EMPLOYEE_BOOTSTRAPS.machinist;
    const hotJobs = listHotJobs();
    return {
      ...base,
      hotJobs,
      shiftPriorities: [...buildHotShiftPriorities(hotJobs), ...base.shiftPriorities],
    };
  },

  async getDeskCounts() {
    return SHELL_BOOTSTRAP.deskCounts;
  },

  async search(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return FIXTURE_RESULTS.filter((record) => matchesSearchResult(record, normalized)).slice(0, 8);
  },

  findRecordByFocus(pathname, search) {
    const params = new URLSearchParams(search);
    const focusId = params.get('focusId');
    if (!focusId) {
      return null;
    }

    return FIXTURE_RESULTS.find((record) => record.id === focusId && record.workspaceRoute === pathname) ?? null;
  },

  async getShellRecordState() {
    return {
      pinnedRecords: SHELL_BOOTSTRAP.pinnedEntities,
      recentRecords: SHELL_BOOTSTRAP.recentEntities,
    };
  },

  async pinShellRecord(record, currentPinnedRecords) {
    const baseline = currentPinnedRecords.length > 0 ? currentPinnedRecords : SHELL_BOOTSTRAP.pinnedEntities;
    return buildPinnedRecords(baseline, record);
  },

  async unpinShellRecord(record, currentPinnedRecords) {
    const baseline = currentPinnedRecords.length > 0 ? currentPinnedRecords : SHELL_BOOTSTRAP.pinnedEntities;
    return baseline.filter((entry) => entry.id !== record.id);
  },

  async recordShellRecordAccess(record, currentRecentRecords) {
    const baseline = currentRecentRecords.length > 0 ? currentRecentRecords : SHELL_BOOTSTRAP.recentEntities;
    return buildRecentRecords(baseline, record);
  },

  async getShellSavedViews(entityType) {
    return readShellSavedViews(entityType);
  },

  async createShellSavedView(input) {
    return createShellSavedView(input);
  },

  async updateShellSavedView(input) {
    return updateShellSavedView(input);
  },

  async deleteShellSavedView(viewId, entityType) {
    return deleteShellSavedView(viewId, entityType);
  },

  async buildJobApprovals(job) {
    return buildJobApprovals(job);
  },

  buildScheduleReleaseRecord(input) {
    return buildScheduleReleaseRecord(input);
  },

  async buildJobDeskRecords(jobs) {
    const hotMap = new Map(listHotJobs().map((record) => [record.jobId, record]));
    return buildJobDeskRecords(jobs).map((record) => ({
      ...record,
      isHot: hotMap.has(record.jobId),
      hotNote: hotMap.get(record.jobId)?.note ?? null,
    }));
  },

  async buildJobPacket(job, options) {
    return buildJobTrackingPacket(job, options);
  },

  async buildJobIntakePreview(form) {
    return buildJobIntakePreview(form);
  },

  async buildStudies(inputs) {
    return buildSchedulingStudies(inputs);
  },

  async getProgramReleaseCatalog() {
    return PROGRAM_RELEASE_CATALOG;
  },

  async getProgramReleaseDefaultMachineProfile() {
    return null;
  },

  async saveProgramReleaseMachineProfile(input) {
    const machine = PROGRAM_RELEASE_CATALOG.machines.find((item) => item.id === input.machineId) ?? PROGRAM_RELEASE_CATALOG.machines[0];
    return {
      profileId: `fixture-program-release-${machine.id}`,
      userId: input.userId,
      workspaceId: input.workspaceId,
      displayName: input.displayName?.trim() || `${machine.label} Program Release default`,
      machineId: machine.id,
      machineLabel: machine.label,
      selectedControllerId: machine.controller,
      selectedSpindlePackageId: machine.spindle,
      enabledCoolantStrategyIds: ['flood'],
      canDriveProgramRelease: true,
    };
  },

  async getCalculatorDefaultMachineProfile() {
    return null;
  },

  async saveCalculatorMachineProfile(input) {
    const machine = input.selection.machine;
    return {
      profileId: `fixture-calculator-${machine.id}`,
      userId: input.userId,
      workspaceId: input.workspaceId,
      displayName: input.displayName?.trim() || `${machine.manufacturer} ${machine.model} calculator default`,
      machineMode: input.selection.machineMode,
      machineId: machine.id,
      machineLabel: `${machine.manufacturer} ${machine.model}`,
      selectedControllerId: input.selection.selectedControllerId,
      selectedSpindlePackageId: input.selection.selectedSpindlePackageId,
      enabledCoolantStrategyIds: [...input.selection.enabledCoolantStrategyIds],
      enabledControllerFeatureIds: [...input.selection.enabledControllerFeatureIds],
      enabledMachineFeatureIds: [...(input.selection.enabledMachineFeatureIds ?? [])],
      toolingStationCountOverride: input.selection.toolingStationCountOverride,
      measuredPerformance: input.selection.measuredPerformance,
      canDriveCalculatorSelections: true,
    };
  },

  async buildProgramReleaseWorkspace(input) {
    return buildProgramReleaseWorkspace(input);
  },

  async buildTrackedTasks(packet, department, role) {
    return buildTrackedTasks(packet, department, role);
  },

  async registerJob(input) {
    return registerTrackedJob(input);
  },

  async checkIntoDepartment(input) {
    return checkIntoDepartment(input);
  },

  async buildRoiSignals(input) {
    return buildRoiSignals(input);
  },

  async recordTaskEvent(input) {
    return recordTaskEvent(input);
  },

  async getHotJobs() {
    return listHotJobs();
  },

  subscribeHotJobs(listener) {
    return subscribeHotJobs(listener);
  },

  isJobHot(jobId) {
    return isHotJob(jobId);
  },

  async setJobHot(input) {
    return markHotJob(input);
  },

  async clearJobHot(jobId) {
    return clearHotJob(jobId);
  },

  rankJobsForTodo(jobs) {
    return rankJobsForTodo(jobs);
  },

  async getPlatformLearningSnapshot() {
    return PLATFORM_LEARNING_SNAPSHOT;
  },

  async getMessagesWorkspace(input) {
    return buildMessagesWorkspaceFixture(input);
  },

  async getInventoryOperationsWorkspace() {
    return INVENTORY_OPERATIONS_WORKSPACE;
  },

  async getCalculatorToolCribWorkspace(input = {}) {
    return {
      userId: input.userId?.trim() || 'calculator-default',
      workspaceId: input.workspaceId?.trim() || 'calculator',
      summary: 'No imported shop tooling intelligence yet. Use upload intake or the local CAD/CAM scan to start building My Shop crib memory.',
      lastUpdatedAt: null,
      imports: [],
      partNumbers: [],
      toolingPartNumbers: [],
      discoveredLibraries: [],
    };
  },

  async ingestCalculatorToolCribDocument(input) {
    return {
      userId: input.userId,
      workspaceId: input.workspaceId?.trim() || 'calculator',
      summary: '1 import staged for My Shop review. Customer contact and title-block details were auto-redacted before this intake was stored.',
      lastUpdatedAt: '2026-04-02T22:45:00.000Z',
      imports: [
        {
          id: 'fixture-tool-crib-import',
          userId: input.userId,
          workspaceId: input.workspaceId?.trim() || 'calculator',
          sourceType: input.sourceType,
          sourceLabel: 'email intake',
          filename: 'redacted-email.eml',
          importedAt: '2026-04-02T22:45:00.000Z',
          status: 'ready',
          summary: 'Fixture intake extracted one part number and one tooling clue. Customer contact and title-block details were auto-redacted before this intake was stored.',
          redaction: {
            applied: true,
            replacementCount: 3,
            redactedFields: ['customer contacts', 'email addresses', 'document labels'],
            note: 'Customer contact and title-block details were auto-redacted before this intake was stored.',
          },
          suggestions: [
            {
              id: 'fixture-part-number',
              kind: 'part_number',
              label: 'Part: IMP-4821',
              partNumber: 'IMP-4821',
              confidence: 0.72,
              evidence: input.filename,
              action: 'Attach to the active part and quote context.',
              sourceType: input.sourceType,
            },
          ],
        },
      ],
      partNumbers: ['IMP-4821'],
      toolingPartNumbers: [],
      discoveredLibraries: [],
    };
  },

  async scanCalculatorToolCribSources(input) {
    if (!input.approvedByUser) {
      throw new Error('Explicit user approval is required before scanning local CAD/CAM tooling sources.');
    }

    return {
      userId: input.userId,
      workspaceId: input.workspaceId?.trim() || 'calculator',
      summary: '1 discovered CAD/CAM tooling library is staged for review.',
      lastUpdatedAt: '2026-04-02T22:45:00.000Z',
      imports: [],
      partNumbers: [],
      toolingPartNumbers: [],
      discoveredLibraries: [
        {
          id: 'fixture-library-fusion',
          softwareFamily: 'fusion_360',
          softwareLabel: 'Fusion 360',
          path: 'C:/Users/Mark/Documents/Fusion 360/Tool Library/shop-tools.json',
          confidence: 0.83,
          matchedBy: ['Fusion 360', 'tool', '.json'],
        },
      ],
    };
  },

  async getShellCommerceCatalog() {
    return SHELL_COMMERCE_CATALOG;
  },

  async getProgramPurchaseRecommendations(input) {
    return buildProgramPurchaseRecommendations(input);
  },

  async getAlarmCommerceWorkspace(input) {
    return buildAlarmCommerceWorkspace(input);
  },
};
