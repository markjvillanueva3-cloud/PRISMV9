/**
 * MCP Dev Tools - Background Task Orchestrator
 * TIER 1 GAME CHANGER: Async execution for tests, builds, lints
 */

import { execa, ExecaChildProcess } from 'execa';
import { v4 as uuid } from 'uuid';
import treeKill from 'tree-kill';
import { Task, tasks, cleanupTask } from '../state.js';
import { config } from '../config.js';

// ============ TASK_SPAWN ============

export interface TaskSpawnParams {
  command: string;
  label: string;
  working_dir?: string;
  timeout_minutes?: number;
  env?: Record<string, string>;
}

export interface TaskSpawnResult {
  task_id: string;
  status: 'running';
  started_at: string;
  pid?: number;
}

export async function taskSpawn(params: TaskSpawnParams): Promise<TaskSpawnResult> {
  const taskId = uuid();
  const timeoutMinutes = params.timeout_minutes || config.taskTimeoutMinutes;
  const workingDir = params.working_dir || config.workingDir;

  const task: Task = {
    id: taskId,
    label: params.label,
    command: params.command,
    workingDir,
    status: 'running',
    output: [],
    startedAt: new Date(),
    timeoutMinutes,
  };

  // Start process
  const proc = execa(params.command, {
    shell: true,
    cwd: workingDir,
    env: { ...process.env, ...params.env },
    all: true,
    reject: false,
  });

  task.process = proc as unknown as import('child_process').ChildProcess;
  task.pid = proc.pid;

  // Collect output
  proc.all?.on('data', (chunk: Buffer) => {
    const lines = chunk.toString().split('\n').filter(l => l.length > 0);
    task.output.push(...lines);
  });

  // Handle completion
  proc.then((result) => {
    task.status = result.exitCode === 0 ? 'completed' : 'failed';
    task.exitCode = result.exitCode ?? -1;
    task.completedAt = new Date();
    if (task.timeoutHandle) clearTimeout(task.timeoutHandle);
  }).catch(() => {
    task.status = 'failed';
    task.completedAt = new Date();
  });

  // Set timeout
  task.timeoutHandle = setTimeout(() => {
    if (task.status === 'running') {
      task.status = 'timeout';
      task.completedAt = new Date();
      if (task.pid) {
        treeKill(task.pid, 'SIGTERM');
      }
    }
  }, timeoutMinutes * 60 * 1000);

  tasks.set(taskId, task);

  // Prune old tasks if over limit
  if (tasks.size > config.maxTaskHistory) {
    const sorted = [...tasks.entries()]
      .filter(([, t]) => t.status !== 'running')
      .sort((a, b) => a[1].startedAt.getTime() - b[1].startedAt.getTime());
    
    while (tasks.size > config.maxTaskHistory && sorted.length > 0) {
      const [oldId] = sorted.shift()!;
      tasks.delete(oldId);
    }
  }

  return {
    task_id: taskId,
    status: 'running',
    started_at: task.startedAt.toISOString(),
    pid: task.pid,
  };
}

// ============ TASK_STATUS ============

export interface TaskStatusParams {
  task_id: string;
}

export interface TaskStatusResult {
  task_id: string;
  label: string;
  command: string;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'killed';
  exit_code?: number;
  output: string;
  duration_ms: number;
  started_at: string;
  completed_at?: string;
}

export function taskStatus(params: TaskStatusParams): TaskStatusResult {
  const task = tasks.get(params.task_id);
  if (!task) {
    throw new Error(`Task not found: ${params.task_id}`);
  }

  const endTime = task.completedAt || new Date();
  const durationMs = endTime.getTime() - task.startedAt.getTime();

  return {
    task_id: task.id,
    label: task.label,
    command: task.command,
    status: task.status,
    exit_code: task.exitCode,
    output: task.output.join('\n'),
    duration_ms: durationMs,
    started_at: task.startedAt.toISOString(),
    completed_at: task.completedAt?.toISOString(),
  };
}

// ============ TASK_STREAM ============

export interface TaskStreamParams {
  task_id: string;
  since_line?: number;
}

export interface TaskStreamResult {
  new_lines: string[];
  total_lines: number;
  completed: boolean;
  exit_code?: number;
}

export function taskStream(params: TaskStreamParams): TaskStreamResult {
  const task = tasks.get(params.task_id);
  if (!task) {
    throw new Error(`Task not found: ${params.task_id}`);
  }

  const sinceLine = params.since_line || 0;
  const newLines = task.output.slice(sinceLine);

  return {
    new_lines: newLines,
    total_lines: task.output.length,
    completed: task.status !== 'running',
    exit_code: task.exitCode,
  };
}

// ============ TASK_KILL ============

export interface TaskKillParams {
  task_id: string;
}

export interface TaskKillResult {
  killed: boolean;
  final_output: string;
}

export async function taskKill(params: TaskKillParams): Promise<TaskKillResult> {
  const task = tasks.get(params.task_id);
  if (!task) {
    throw new Error(`Task not found: ${params.task_id}`);
  }

  if (task.status !== 'running') {
    return {
      killed: false,
      final_output: task.output.join('\n'),
    };
  }

  return new Promise((resolve) => {
    if (task.pid) {
      treeKill(task.pid, 'SIGTERM', (err) => {
        task.status = 'killed';
        task.completedAt = new Date();
        if (task.timeoutHandle) clearTimeout(task.timeoutHandle);
        
        resolve({
          killed: !err,
          final_output: task.output.join('\n'),
        });
      });
    } else {
      resolve({
        killed: false,
        final_output: task.output.join('\n'),
      });
    }
  });
}

// ============ TASK_LIST ============

export interface TaskListParams {
  status_filter?: 'running' | 'completed' | 'failed';
  limit?: number;
}

export interface TaskListResult {
  tasks: Array<{
    task_id: string;
    label: string;
    status: string;
    started_at: string;
    duration_ms: number;
  }>;
}

export function taskList(params: TaskListParams): TaskListResult {
  let taskArray = [...tasks.values()];

  if (params.status_filter) {
    taskArray = taskArray.filter(t => t.status === params.status_filter);
  }

  taskArray.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  if (params.limit) {
    taskArray = taskArray.slice(0, params.limit);
  }

  return {
    tasks: taskArray.map(t => ({
      task_id: t.id,
      label: t.label,
      status: t.status,
      started_at: t.startedAt.toISOString(),
      duration_ms: (t.completedAt || new Date()).getTime() - t.startedAt.getTime(),
    })),
  };
}
