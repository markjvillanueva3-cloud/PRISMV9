import { describe, expect, it } from 'vitest';
import { ShopFloorCheckInEngine } from '../engines/ShopFloorCheckInEngine';

const makePayload = (overrides: Record<string, any> = {}) => ({
  jobId: 'JOB-100',
  partNumber: 'BRKT-1',
  customer: 'Orbit Aero',
  status: 'tracked' as const,
  operations: [
    { code: 'OP10', title: 'Job setup', label: 'Job setup', department: 'Job setup', quantityTarget: 24, cycleSeconds: 0, processType: 'setup' as const },
    { code: 'OP20', title: 'Run cycle', label: 'Run cycle', department: 'Run cycle', quantityTarget: 24, cycleSeconds: 96, processType: 'production_run' as const },
    { code: 'OP25', title: 'Secondary op / deburr', label: 'Secondary op / deburr', department: 'Run cycle', quantityTarget: 24, cycleSeconds: 30, processType: 'secondary_ops' as const },
    { code: 'OP30', title: 'Inspection', label: 'Inspection', department: 'Quality', quantityTarget: 24, cycleSeconds: 18, processType: 'inspection' as const },
  ],
  ...overrides,
});

const makeEmployee = (overrides: Record<string, any> = {}) => ({
  id: 'emp-001',
  first_name: 'John',
  last_name: 'Smith',
  department: 'Machining',
  role: 'operator',
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════
// buildTrackedTasks
// ═══════════════════════════════════════════════════════════════════════

describe('ShopFloorCheckInEngine — buildTrackedTasks', () => {
  it('filters operations visible to the selected department', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(makePayload(), 'Job setup');
    expect(tasks.map(t => t.operationCode)).toEqual(['OP10', 'OP20', 'OP25']);
    expect(tasks.map(t => t.processType)).toEqual(['setup', 'production_run', 'secondary_ops']);
  });

  it('preserves operator-facing metadata for mobile cards', () => {
    const payload = makePayload({
      operations: [{
        id: 'cam-prog', code: 'CAM', title: 'CAM programming', label: 'CAM programming',
        department: 'CAM programming', quantityTarget: 12, cycleSeconds: 0,
        note: 'Toolpath and setup-sheet verification.', processType: 'programming' as const, machineId: 'MILL-07',
      }],
    });
    const [task] = ShopFloorCheckInEngine.buildTrackedTasks(payload, 'CAM programming');
    expect(task.operationId).toBe('cam-prog');
    expect(task.operationLabel).toBe('CAM programming');
    expect(task.processType).toBe('programming');
    expect(task.machineId).toBe('MILL-07');
    expect(task.note).toContain('Toolpath');
  });

  it('returns empty array for null payload', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(null, 'Machining');
    expect(tasks).toEqual([]);
  });

  it('returns empty array for payload with no operations', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(makePayload({ operations: [] }), 'Job setup');
    expect(tasks).toEqual([]);
  });

  it('assigns unique task IDs per operation', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(makePayload(), 'Job setup');
    const ids = tasks.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(id).toContain('JOB-100'));
  });

  it('sets initial status to idle with zero counters', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(makePayload(), 'Job setup');
    for (const t of tasks) {
      expect(t.status).toBe('idle');
      expect(t.elapsedSeconds).toBe(0);
      expect(t.partsCompleted).toBe(0);
    }
  });

  it('carries through quantityTarget and cycleSeconds', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(makePayload(), 'Job setup');
    const runTask = tasks.find(t => t.operationCode === 'OP20');
    expect(runTask).toBeDefined();
    expect(runTask!.quantityTarget).toBe(24);
    expect(runTask!.cycleSeconds).toBe(96);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// registerJob
// ═══════════════════════════════════════════════════════════════════════

describe('ShopFloorCheckInEngine — registerJob', () => {
  it('returns structured result with job ID and department', () => {
    const result = ShopFloorCheckInEngine.registerJob({
      scanInput: 'QR-JOB-500', jobId: 'JOB-500',
      selectedDepartment: 'Machining', employee: makeEmployee(),
    });
    expect(result.jobId).toBe('JOB-500');
    expect(result.selectedDepartment).toBe('Machining');
    expect(result.message).toContain('JOB-500');
    expect(result.message).toContain('Machining');
  });

  it('returns error message for empty job ID', () => {
    const result = ShopFloorCheckInEngine.registerJob({
      scanInput: '', jobId: '', selectedDepartment: 'Machining',
    });
    expect(result.jobId).toBe('');
    expect(result.message).toContain('No job ID');
  });

  it('trims whitespace from job ID', () => {
    const result = ShopFloorCheckInEngine.registerJob({
      scanInput: '  JOB-600  ', jobId: '  JOB-600  ',
      selectedDepartment: 'Machining',
    });
    expect(result.jobId).toBe('JOB-600');
  });

  it('includes employee name in message when provided', () => {
    const result = ShopFloorCheckInEngine.registerJob({
      scanInput: 'QR', jobId: 'JOB-700',
      selectedDepartment: 'Quality', employee: makeEmployee({ first_name: 'Maria' }),
    });
    expect(result.message).toContain('Maria');
  });

  it('handles missing employee gracefully', () => {
    const result = ShopFloorCheckInEngine.registerJob({
      scanInput: 'QR', jobId: 'JOB-800',
      selectedDepartment: 'Shipping',
    });
    expect(result.message).toContain('No operator');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// checkIntoDepartment
// ═══════════════════════════════════════════════════════════════════════

describe('ShopFloorCheckInEngine — checkIntoDepartment', () => {
  it('checks employee into department successfully', () => {
    const result = ShopFloorCheckInEngine.checkIntoDepartment({
      trackedJob: makePayload(), employee: makeEmployee(),
      selectedDepartment: 'Job setup', existingCheckIns: [], existingTasks: [],
      nowMs: 1700000000000,
    });
    expect(result.duplicate).toBe(false);
    expect(result.message).toContain('John Smith');
    expect(result.message).toContain('Job setup');
    expect(result.entry).toBeDefined();
    expect(result.entry!.employeeId).toBe('emp-001');
    expect(result.checkIns).toHaveLength(1);
    expect(result.checkIns[0]).toEqual(result.entry);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  it('detects duplicate check-in', () => {
    const existing = [{
      id: 'checkin-1', jobId: 'JOB-100', department: 'Job setup',
      employeeId: 'emp-001', employeeName: 'John Smith', scannedAt: new Date().toISOString(),
    }];
    const result = ShopFloorCheckInEngine.checkIntoDepartment({
      trackedJob: makePayload(), employee: makeEmployee(),
      selectedDepartment: 'Job setup', existingCheckIns: existing, existingTasks: [],
    });
    expect(result.duplicate).toBe(true);
    expect(result.message).toContain('already checked in');
    expect(result.checkIns).toEqual(existing);
  });

  it('returns error when no job registered', () => {
    const result = ShopFloorCheckInEngine.checkIntoDepartment({
      trackedJob: null, employee: makeEmployee(),
      selectedDepartment: 'Machining', existingCheckIns: [], existingTasks: [],
    });
    expect(result.message).toContain('No job registered');
    expect(result.checkIns).toEqual([]);
  });

  it('returns error when no employee identified', () => {
    const result = ShopFloorCheckInEngine.checkIntoDepartment({
      trackedJob: makePayload(), employee: null,
      selectedDepartment: 'Machining', existingCheckIns: [], existingTasks: [],
    });
    expect(result.message).toContain('No employee');
    expect(result.checkIns).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// recordTaskEvent
// ═══════════════════════════════════════════════════════════════════════

describe('ShopFloorCheckInEngine — recordTaskEvent', () => {
  it('pauses the currently running task when another task starts', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(makePayload(), 'Job setup');
    const runTask = tasks.find((task) => task.operationCode === 'OP20');
    const secondaryTask = tasks.find((task) => task.operationCode === 'OP25');

    expect(runTask).toBeDefined();
    expect(secondaryTask).toBeDefined();

    const started = ShopFloorCheckInEngine.recordTaskEvent({
      tasks,
      taskId: runTask!.id,
      action: 'start',
      nowMs: 1000,
    }).tasks;

    const switched = ShopFloorCheckInEngine.recordTaskEvent({
      tasks: started,
      taskId: secondaryTask!.id,
      action: 'start',
      nowMs: 4000,
    }).tasks;

    expect(switched.find((task) => task.id === runTask!.id)).toMatchObject({
      status: 'paused',
      elapsedSeconds: 3,
      startedAtMs: undefined,
    });
    expect(switched.find((task) => task.id === secondaryTask!.id)).toMatchObject({
      status: 'running',
      startedAtMs: 4000,
    });
  });

  it('preserves counter overrides when a task completes through the route contract', () => {
    const tasks = ShopFloorCheckInEngine.buildTrackedTasks(makePayload(), 'Job setup');
    const runTask = tasks.find((task) => task.operationCode === 'OP20');

    expect(runTask).toBeDefined();

    const started = ShopFloorCheckInEngine.recordTaskEvent({
      tasks,
      taskId: runTask!.id,
      action: 'start',
      nowMs: 2000,
    }).tasks;

    const completed = ShopFloorCheckInEngine.recordTaskEvent({
      tasks: started,
      taskId: runTask!.id,
      action: 'complete',
      nowMs: 5000,
      partsCompleted: 6,
      extraParts: 2,
    }).tasks;

    expect(completed.find((task) => task.id === runTask!.id)).toMatchObject({
      status: 'completed',
      elapsedSeconds: 3,
      partsCompleted: 6,
      extraParts: 2,
      startedAtMs: undefined,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// buildRoiSignals
// ═══════════════════════════════════════════════════════════════════════

describe('ShopFloorCheckInEngine — buildRoiSignals', () => {
  it('returns empty signals for empty tasks', () => {
    const signals = ShopFloorCheckInEngine.buildRoiSignals({
      tasks: [], nowMs: Date.now(), cycleVariance: 0, totalExtras: 0,
    });
    expect(signals).toEqual([]);
  });

  it('generates throughput signal when parts completed', () => {
    const tasks = [{
      id: 't1', title: 'Run', department: 'Machining', operationId: 'op1',
      operationLabel: 'Run', operationCode: 'OP20', processType: 'production_run' as const,
      quantityTarget: 24, cycleSeconds: 96, status: 'completed' as const,
      elapsedSeconds: 2400, partsCompleted: 12, extraParts: 0,
    }];
    const signals = ShopFloorCheckInEngine.buildRoiSignals({
      tasks, nowMs: Date.now(), cycleVariance: 0, totalExtras: 0,
    });
    expect(signals.some(s => s.includes('Throughput'))).toBe(true);
    expect(signals.some(s => s.includes('12/24'))).toBe(true);
  });

  it('generates cycle variance signal when over estimate', () => {
    const tasks = [{
      id: 't1', title: 'Run', department: 'Machining', operationId: 'op1',
      operationLabel: 'Run', operationCode: 'OP20', processType: 'production_run' as const,
      quantityTarget: 24, cycleSeconds: 96, status: 'running' as const,
      elapsedSeconds: 120, partsCompleted: 1, extraParts: 0,
    }];
    const signals = ShopFloorCheckInEngine.buildRoiSignals({
      tasks, nowMs: Date.now(), cycleVariance: 0.25, totalExtras: 0,
    });
    expect(signals.some(s => s.includes('over'))).toBe(true);
  });
});
