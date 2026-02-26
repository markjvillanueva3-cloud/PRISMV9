/**
 * MCP Dev Tools - Checkpoint & Rollback
 * TIER 1 GAME CHANGER: Fearless experimentation with instant revert
 */

import { v4 as uuid } from 'uuid';
import { promises as fs } from 'fs';
import { join, relative, basename } from 'path';
import * as tar from 'tar';
import { simpleGit } from 'simple-git';
import { Checkpoint, checkpoints } from '../state.js';
import { config } from '../config.js';

// ============ CHECKPOINT_CREATE ============

export interface CheckpointCreateParams {
  label: string;
  paths?: string[];
  include_untracked?: boolean;
  include_gitignored?: boolean;
}

export interface CheckpointCreateResult {
  checkpoint_id: string;
  label: string;
  created_at: string;
  files_captured: number;
  size_bytes: number;
  git_state: {
    branch: string;
    commit: string;
    dirty: boolean;
  } | null;
}

async function ensureCheckpointDir(): Promise<void> {
  await fs.mkdir(config.checkpointDir, { recursive: true });
}

async function getGitState(): Promise<{ branch: string; commit: string; dirty: boolean } | null> {
  try {
    const git = simpleGit(config.workingDir);
    const status = await git.status();
    const log = await git.log({ maxCount: 1 });
    
    return {
      branch: status.current || 'unknown',
      commit: log.latest?.hash || 'unknown',
      dirty: !status.isClean(),
    };
  } catch {
    return null;
  }
}

async function collectFiles(
  basePaths: string[],
  includeUntracked: boolean,
  includeGitignored: boolean
): Promise<string[]> {
  const files: string[] = [];
  
  for (const basePath of basePaths) {
    const fullPath = join(config.workingDir, basePath);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        files.push(basePath);
      } else if (stat.isDirectory()) {
        const entries = await fs.readdir(fullPath, { withFileTypes: true, recursive: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const entryPath = join(entry.parentPath || entry.path, entry.name);
            const relPath = relative(config.workingDir, entryPath);
            
            // Skip common ignore patterns
            if (relPath.includes('node_modules') || relPath.includes('.git')) continue;
            if (!includeGitignored && relPath.startsWith('.')) continue;
            
            files.push(relPath);
          }
        }
      }
    } catch {
      // Skip inaccessible paths
    }
  }
  
  return files;
}

export async function checkpointCreate(params: CheckpointCreateParams): Promise<CheckpointCreateResult> {
  await ensureCheckpointDir();
  
  const checkpointId = uuid();
  const paths = params.paths || ['.'];
  const includeUntracked = params.include_untracked !== false;
  const includeGitignored = params.include_gitignored || false;
  
  const files = await collectFiles(paths, includeUntracked, includeGitignored);
  const archivePath = join(config.checkpointDir, `${checkpointId}.tar.gz`);
  
  // Create tar archive
  await tar.create(
    {
      gzip: true,
      file: archivePath,
      cwd: config.workingDir,
    },
    files
  );
  
  const archiveStat = await fs.stat(archivePath);
  const gitState = await getGitState();
  
  const checkpoint: Checkpoint = {
    id: checkpointId,
    label: params.label,
    createdAt: new Date(),
    paths,
    archivePath,
    filesCaptured: files.length,
    sizeBytes: archiveStat.size,
    gitState: gitState || undefined,
  };
  
  checkpoints.set(checkpointId, checkpoint);
  
  // Prune old checkpoints
  if (checkpoints.size > config.maxCheckpoints) {
    const sorted = [...checkpoints.entries()]
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());
    
    while (checkpoints.size > config.maxCheckpoints && sorted.length > 0) {
      const [oldId, oldCp] = sorted.shift()!;
      try {
        await fs.unlink(oldCp.archivePath);
      } catch { /* ignore */ }
      checkpoints.delete(oldId);
    }
  }
  
  return {
    checkpoint_id: checkpointId,
    label: params.label,
    created_at: checkpoint.createdAt.toISOString(),
    files_captured: files.length,
    size_bytes: archiveStat.size,
    git_state: gitState,
  };
}

// ============ CHECKPOINT_LIST ============

export interface CheckpointListParams {
  limit?: number;
}

export interface CheckpointListResult {
  checkpoints: Array<{
    checkpoint_id: string;
    label: string;
    created_at: string;
    files_captured: number;
    size_bytes: number;
  }>;
}

export function checkpointList(params: CheckpointListParams): CheckpointListResult {
  let cpArray = [...checkpoints.values()];
  cpArray.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  if (params.limit) {
    cpArray = cpArray.slice(0, params.limit);
  }
  
  return {
    checkpoints: cpArray.map(cp => ({
      checkpoint_id: cp.id,
      label: cp.label,
      created_at: cp.createdAt.toISOString(),
      files_captured: cp.filesCaptured,
      size_bytes: cp.sizeBytes,
    })),
  };
}

// ============ CHECKPOINT_DIFF ============

export interface CheckpointDiffParams {
  checkpoint_id: string;
  paths?: string[];
}

export interface CheckpointDiffResult {
  files_added: string[];
  files_modified: string[];
  files_deleted: string[];
  total_changes: number;
}

export async function checkpointDiff(params: CheckpointDiffParams): Promise<CheckpointDiffResult> {
  const checkpoint = checkpoints.get(params.checkpoint_id);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${params.checkpoint_id}`);
  }
  
  // Extract checkpoint file list
  const checkpointFiles = new Set<string>();
  await tar.list({
    file: checkpoint.archivePath,
    onentry: (entry) => {
      checkpointFiles.add(entry.path);
    },
  });
  
  // Get current files
  const currentFiles = await collectFiles(params.paths || checkpoint.paths, true, false);
  const currentFileSet = new Set(currentFiles);
  
  const filesAdded: string[] = [];
  const filesModified: string[] = [];
  const filesDeleted: string[] = [];
  
  // Files in current but not in checkpoint = added
  for (const file of currentFiles) {
    if (!checkpointFiles.has(file)) {
      filesAdded.push(file);
    } else {
      // Could compare contents for modified, simplified here
      filesModified.push(file);
    }
  }
  
  // Files in checkpoint but not in current = deleted
  for (const file of checkpointFiles) {
    if (!currentFileSet.has(file)) {
      filesDeleted.push(file);
    }
  }
  
  return {
    files_added: filesAdded,
    files_modified: filesModified,
    files_deleted: filesDeleted,
    total_changes: filesAdded.length + filesModified.length + filesDeleted.length,
  };
}

// ============ CHECKPOINT_RESTORE ============

export interface CheckpointRestoreParams {
  checkpoint_id: string;
  paths?: string[];
  dry_run?: boolean;
}

export interface CheckpointRestoreResult {
  restored_files: string[];
  conflicts: Array<{ file: string; reason: string }>;
  dry_run: boolean;
}

export async function checkpointRestore(params: CheckpointRestoreParams): Promise<CheckpointRestoreResult> {
  const checkpoint = checkpoints.get(params.checkpoint_id);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${params.checkpoint_id}`);
  }
  
  const restoredFiles: string[] = [];
  const conflicts: Array<{ file: string; reason: string }> = [];
  
  if (params.dry_run) {
    // Just list what would be restored
    await tar.list({
      file: checkpoint.archivePath,
      onentry: (entry) => {
        if (!params.paths || params.paths.some(p => entry.path.startsWith(p))) {
          restoredFiles.push(entry.path);
        }
      },
    });
  } else {
    // Actually restore
    await tar.extract({
      file: checkpoint.archivePath,
      cwd: config.workingDir,
      filter: (path) => {
        if (params.paths && !params.paths.some(p => path.startsWith(p))) {
          return false;
        }
        restoredFiles.push(path);
        return true;
      },
    });
  }
  
  return {
    restored_files: restoredFiles,
    conflicts,
    dry_run: params.dry_run || false,
  };
}

// ============ CHECKPOINT_DELETE ============

export interface CheckpointDeleteParams {
  checkpoint_id: string;
}

export interface CheckpointDeleteResult {
  deleted: boolean;
  freed_bytes: number;
}

export async function checkpointDelete(params: CheckpointDeleteParams): Promise<CheckpointDeleteResult> {
  const checkpoint = checkpoints.get(params.checkpoint_id);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${params.checkpoint_id}`);
  }
  
  const freedBytes = checkpoint.sizeBytes;
  
  try {
    await fs.unlink(checkpoint.archivePath);
  } catch { /* ignore */ }
  
  checkpoints.delete(params.checkpoint_id);
  
  return {
    deleted: true,
    freed_bytes: freedBytes,
  };
}
