/**
 * Live Context Sync - File change watching and synchronization
 * Tools: context_watch_start, context_watch_stop, context_changes, context_snapshot
 */
import { watch, FSWatcher } from 'chokidar';
import { stat, readdir } from 'fs/promises';
import { join, relative } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { watchers, Watcher, FileChange, cleanupWatcher } from '../state.js';
import { config } from '../config.js';

const DEFAULT_IGNORE = ['**/node_modules/**', '**/.git/**', '**/.mcp-*/**', '**/dist/**', '**/*.log'];

export interface ContextWatchStartParams {
  paths: string[];
  events?: ('create' | 'modify' | 'delete' | 'rename')[];
  ignore_patterns?: string[];
}

export interface ContextWatchStartResult { watcher_id: string; watching: string[]; started_at: string; }

export function contextWatchStart(params: ContextWatchStartParams): ContextWatchStartResult {
  const watcherId = uuidv4();
  const events = params.events ?? ['create', 'modify', 'delete'];
  const ignored = [...DEFAULT_IGNORE, ...(params.ignore_patterns ?? [])];
  
  const fsWatcher = watch(params.paths, { ignored, persistent: true, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: config.watchDebounceMs } });
  
  const watcher: Watcher = { id: watcherId, paths: params.paths, watcher: fsWatcher, events, changes: [], startedAt: new Date(), maxChanges: 1000 };
  
  const addChange = (type: FileChange['type'], path: string, oldPath?: string) => {
    if (!events.includes(type)) return;
    watcher.changes.push({ type, path: relative(config.workingDir, path), timestamp: new Date(), oldPath: oldPath ? relative(config.workingDir, oldPath) : undefined });
    while (watcher.changes.length > watcher.maxChanges) watcher.changes.shift();
  };
  
  fsWatcher.on('add', (path) => addChange('create', path));
  fsWatcher.on('change', (path) => addChange('modify', path));
  fsWatcher.on('unlink', (path) => addChange('delete', path));
  
  watchers.set(watcherId, watcher);
  return { watcher_id: watcherId, watching: params.paths, started_at: watcher.startedAt.toISOString() };
}

export interface ContextWatchStopResult { stopped: boolean; }

export function contextWatchStop(watcherId: string): ContextWatchStopResult {
  const watcher = watchers.get(watcherId);
  if (!watcher) return { stopped: false };
  cleanupWatcher(watcherId);
  return { stopped: true };
}

export interface ContextChangesResult {
  events: Array<{ type: FileChange['type']; path: string; timestamp: string; old_path?: string }>;
  files_affected: number;
  context_stale: boolean;
}

export function contextChanges(watcherId: string, since?: string): ContextChangesResult {
  const watcher = watchers.get(watcherId);
  if (!watcher) return { events: [], files_affected: 0, context_stale: false };
  
  let changes = watcher.changes;
  if (since) { const sinceDate = new Date(since); changes = changes.filter(c => c.timestamp > sinceDate); }
  
  const uniqueFiles = new Set(changes.map(c => c.path));
  return { events: changes.map(c => ({ type: c.type, path: c.path, timestamp: c.timestamp.toISOString(), old_path: c.oldPath })), files_affected: uniqueFiles.size, context_stale: changes.length > 10 };
}

export interface ContextSnapshotResult { files: Array<{ path: string; size_bytes: number; modified_at: string }>; total_files: number; last_change: string; }

export async function contextSnapshot(watcherId: string): Promise<ContextSnapshotResult> {
  const watcher = watchers.get(watcherId);
  if (!watcher) return { files: [], total_files: 0, last_change: new Date().toISOString() };
  
  const files: ContextSnapshotResult['files'] = [];
  for (const basePath of watcher.paths) {
    try {
      const entries = await readdir(basePath, { withFileTypes: true, recursive: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = join(entry.parentPath || basePath, entry.name);
          const stats = await stat(fullPath).catch(() => null);
          if (stats) files.push({ path: relative(config.workingDir, fullPath), size_bytes: stats.size, modified_at: stats.mtime.toISOString() });
        }
      }
    } catch {}
  }
  
  const lastChange = watcher.changes.length > 0 ? watcher.changes[watcher.changes.length - 1].timestamp.toISOString() : watcher.startedAt.toISOString();
  return { files: files.slice(0, 500), total_files: files.length, last_change: lastChange };
}
