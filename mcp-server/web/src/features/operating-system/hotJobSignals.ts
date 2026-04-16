import type { EmployeeShiftPriority, HotJobRecord, Job } from './contracts';

const HOT_JOB_STORAGE_KEY = 'prism.hot-jobs.v1';
const HOT_JOB_EVENT = 'prism:hot-jobs-changed';

let fallbackHotJobs: HotJobRecord[] = [];

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toDueRank(value?: string) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function normalizeRecord(record: Partial<HotJobRecord> & Pick<HotJobRecord, 'jobId'>): HotJobRecord {
  return {
    jobId: record.jobId,
    partNumber: record.partNumber?.trim() || record.jobId,
    customer: record.customer?.trim() || 'Unassigned customer',
    dueDate: record.dueDate?.trim() || 'Unscheduled',
    note: record.note?.trim() || 'Upper management flagged this job hot for shop-wide execution ordering.',
    setBy: record.setBy?.trim() || 'Upper management',
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

function readHotJobs(): HotJobRecord[] {
  if (!hasStorage()) {
    return sortHotJobs(fallbackHotJobs);
  }

  try {
    const raw = window.localStorage.getItem(HOT_JOB_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortHotJobs(
      parsed
        .filter((entry): entry is Partial<HotJobRecord> & Pick<HotJobRecord, 'jobId'> => Boolean(entry?.jobId))
        .map((entry) => normalizeRecord(entry)),
    );
  } catch {
    return [];
  }
}

function writeHotJobs(records: HotJobRecord[]) {
  const sorted = sortHotJobs(records);
  fallbackHotJobs = sorted;

  if (!hasStorage()) {
    return;
  }

  window.localStorage.setItem(HOT_JOB_STORAGE_KEY, JSON.stringify(sorted));
  window.dispatchEvent(new CustomEvent<HotJobRecord[]>(HOT_JOB_EVENT, { detail: sorted }));
}

export function listHotJobs() {
  return readHotJobs();
}

export function isHotJob(jobId: string) {
  return readHotJobs().some((record) => record.jobId === jobId);
}

export function markHotJob(record: Partial<HotJobRecord> & Pick<HotJobRecord, 'jobId'>) {
  const nextRecord = normalizeRecord(record);
  const existing = readHotJobs().filter((entry) => entry.jobId !== nextRecord.jobId);
  writeHotJobs([...existing, nextRecord]);
  return readHotJobs();
}

export function clearHotJob(jobId: string) {
  writeHotJobs(readHotJobs().filter((record) => record.jobId !== jobId));
  return readHotJobs();
}

export function replaceHotJobs(records: HotJobRecord[]) {
  writeHotJobs(records.map((record) => normalizeRecord(record)));
  return readHotJobs();
}

export function resetHotJobs() {
  fallbackHotJobs = [];

  if (!hasStorage()) {
    return;
  }

  window.localStorage.removeItem(HOT_JOB_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent<HotJobRecord[]>(HOT_JOB_EVENT, { detail: [] }));
}

export function subscribeHotJobs(listener: (records: HotJobRecord[]) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const syncHotJobs = () => listener(readHotJobs());
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== HOT_JOB_STORAGE_KEY) {
      return;
    }

    syncHotJobs();
  };
  const handleHotJobEvent = () => {
    syncHotJobs();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(HOT_JOB_EVENT, handleHotJobEvent);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(HOT_JOB_EVENT, handleHotJobEvent);
  };
}

function priorityWeight(priority: Job['priority']) {
  if (priority === 'rush') return 0;
  if (priority === 'high') return 1;
  if (priority === 'normal') return 2;
  return 3;
}

export function rankJobsForTodo(jobs: Job[]) {
  const hotMap = new Map(readHotJobs().map((record) => [record.jobId, record]));

  return [...jobs].sort((left, right) => {
    const leftHot = hotMap.has(left.id) ? 0 : 1;
    const rightHot = hotMap.has(right.id) ? 0 : 1;
    if (leftHot !== rightHot) {
      return leftHot - rightHot;
    }

    const dueRank = toDueRank(left.due_date) - toDueRank(right.due_date);
    if (dueRank !== 0) {
      return dueRank;
    }

    const priorityRank = priorityWeight(left.priority) - priorityWeight(right.priority);
    if (priorityRank !== 0) {
      return priorityRank;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildHotShiftPriorities(hotJobs: HotJobRecord[]): EmployeeShiftPriority[] {
  return hotJobs.slice(0, 3).map((hotJob, index) => ({
    id: `hot-job-priority-${hotJob.jobId}`,
    label: index === 0 ? 'Hot now' : 'Hot queue',
    title: `${hotJob.partNumber} · ${hotJob.customer}`,
    detail: `${hotJob.note} Due ${hotJob.dueDate}. Keep this ahead of normal due-date ordering until management clears the hot flag.`,
    to: `/jobs?focusId=${encodeURIComponent(hotJob.jobId)}&focusType=job`,
    badge: hotJob.dueDate === 'Unscheduled' ? 'Hot job' : `Due ${hotJob.dueDate}`,
    tone: 'rose',
  }));
}
