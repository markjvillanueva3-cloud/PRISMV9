import type { HotJobRecord } from "./ShellBootstrapEngine.js";

type HotJobInput = Partial<HotJobRecord> & Pick<HotJobRecord, "jobId">;

const DEFAULT_NOTE = "Upper management flagged this job hot for shop-wide execution ordering.";
const DEFAULT_SET_BY = "Upper management";

function toDueRank(value?: string) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function normalizeRecord(record: HotJobInput): HotJobRecord {
  return {
    jobId: record.jobId,
    partNumber: record.partNumber?.trim() || record.jobId,
    customer: record.customer?.trim() || "Unassigned customer",
    dueDate: record.dueDate?.trim() || "Unscheduled",
    note: record.note?.trim() || DEFAULT_NOTE,
    setBy: record.setBy?.trim() || DEFAULT_SET_BY,
    setAt: record.setAt?.trim() || new Date().toISOString(),
  };
}

function sortHotJobs(records: HotJobRecord[]) {
  return [...records].sort((left, right) => {
    const dueRank = toDueRank(left.dueDate) - toDueRank(right.dueDate);
    if (dueRank !== 0) {
      return dueRank;
    }

    const setAtRank = Date.parse(right.setAt) - Date.parse(left.setAt);
    if (Number.isFinite(setAtRank) && setAtRank !== 0) {
      return setAtRank;
    }

    return left.jobId.localeCompare(right.jobId);
  });
}

export class OperatingSystemHotJobsEngine {
  private static records: HotJobRecord[] = [];

  static list() {
    return sortHotJobs(OperatingSystemHotJobsEngine.records);
  }

  static ids() {
    return OperatingSystemHotJobsEngine.list().map((record) => record.jobId);
  }

  static isHot(jobId: string) {
    return OperatingSystemHotJobsEngine.records.some((record) => record.jobId === jobId);
  }

  static set(input: HotJobInput) {
    const nextRecord = normalizeRecord(input);
    const existing = OperatingSystemHotJobsEngine.records.filter((record) => record.jobId !== nextRecord.jobId);
    OperatingSystemHotJobsEngine.records = sortHotJobs([...existing, nextRecord]);
    return OperatingSystemHotJobsEngine.list();
  }

  static clear(jobId: string) {
    OperatingSystemHotJobsEngine.records = OperatingSystemHotJobsEngine.records.filter((record) => record.jobId !== jobId);
    return OperatingSystemHotJobsEngine.list();
  }

  static replace(records: HotJobRecord[]) {
    OperatingSystemHotJobsEngine.records = sortHotJobs(records.map((record) => normalizeRecord(record)));
    return OperatingSystemHotJobsEngine.list();
  }

  static reset() {
    OperatingSystemHotJobsEngine.records = [];
  }
}

export const operatingSystemHotJobsEngine = new OperatingSystemHotJobsEngine();
