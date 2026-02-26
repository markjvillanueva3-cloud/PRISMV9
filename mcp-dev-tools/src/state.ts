/**
 * MCP Dev Tools - In-Memory State Management
 */
import { ChildProcess } from 'child_process';
import { FSWatcher } from 'chokidar';

export interface Task {
  id: string;
  label: string;
  command: string;
  workingDir: string;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'killed';
  pid?: number;
  process?: ChildProcess;
  output: string[];
  exitCode?: number;
  startedAt: Date;
  completedAt?: Date;
  timeoutMinutes: number;
  timeoutHandle?: NodeJS.Timeout;
}

export interface Checkpoint {
  id: string;
  label: string;
  createdAt: Date;
  paths: string[];
  archivePath: string;
  filesCaptured: number;
  sizeBytes: number;
  gitState?: { branch: string; commit: string; dirty: boolean };
}

export interface FileChange {
  type: 'create' | 'modify' | 'delete' | 'rename';
  path: string;
  timestamp: Date;
  oldPath?: string;
}

export interface Watcher {
  id: string;
  paths: string[];
  watcher: FSWatcher;
  events: ('create' | 'modify' | 'delete' | 'rename')[];
  changes: FileChange[];
  startedAt: Date;
  maxChanges: number;
}

export const tasks = new Map<string, Task>();
export const checkpoints = new Map<string, Checkpoint>();
export const watchers = new Map<string, Watcher>();

export function cleanupTask(taskId: string): void {
  const task = tasks.get(taskId);
  if (task) {
    if (task.timeoutHandle) clearTimeout(task.timeoutHandle);
    if (task.process && !task.process.killed) task.process.kill('SIGTERM');
  }
}

export function cleanupWatcher(watcherId: string): void {
  const watcher = watchers.get(watcherId);
  if (watcher) { watcher.watcher.close(); watchers.delete(watcherId); }
}

export function cleanupAll(): void {
  for (const [id] of tasks) cleanupTask(id);
  for (const [id] of watchers) cleanupWatcher(id);
}

process.on('SIGINT', () => { cleanupAll(); process.exit(0); });
process.on('SIGTERM', () => { cleanupAll(); process.exit(0); });
