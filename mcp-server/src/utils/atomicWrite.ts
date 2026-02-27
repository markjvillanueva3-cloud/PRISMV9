/**
 * PRISM MCP Server - Atomic Write Utility
 * Writes via .tmp → rename for crash-safe file operations.
 * Serialized via queue to prevent parallel write corruption.
 * 
 * @module utils/atomicWrite
 * @safety CRITICAL — Used for all state file writes. Corruption = data loss.
 */

import { writeFile, rename, unlink } from 'fs/promises';
import { writeFileSync, renameSync, unlinkSync } from 'fs';
import path from 'path';

// Per-file serialization — prevents concurrent writes to the SAME file
// while allowing parallel writes to DIFFERENT files
const writeChains = new Map<string, Promise<void>>();

/**
 * Atomically write data to a file.
 * Writes to a temporary file first, then renames to target.
 * If the process crashes mid-write, only the .tmp file is affected.
 * 
 * @param filePath - Absolute or relative path to target file
 * @param data - String content to write
 * @throws {Error} If write or rename fails after cleanup attempt
 */
export async function atomicWrite(filePath: string, data: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const tmpPath = `${resolved}.${Date.now()}.tmp`;

  // Chain writes per-file to serialize access to the same path
  const prev = writeChains.get(resolved) ?? Promise.resolve();
  const operation = prev.then(async () => {
    try {
      await writeFile(tmpPath, data, 'utf-8');
      await rename(tmpPath, resolved);
    } catch (err: unknown) {
      // Best-effort cleanup of orphaned .tmp file
      try { await unlink(tmpPath); } catch { /* ignore cleanup failure */ }
      throw err;
    }
  });

  writeChains.set(resolved, operation.catch(() => { /* prevent chain from breaking on error */ }));
  return operation;
}

/**
 * Synchronous atomic write — drop-in replacement for fs.writeFileSync.
 * Writes to .tmp then renames for crash-safety.
 * Use this for all state/checkpoint file writes.
 */
export function safeWriteSync(filePath: string, data: string, encoding: BufferEncoding = 'utf-8'): void {
  const resolved = path.resolve(filePath);
  const tmpPath = `${resolved}.${Date.now()}.tmp`;
  try {
    writeFileSync(tmpPath, data, encoding);
    renameSync(tmpPath, resolved);
  } catch (err: unknown) {
    try { unlinkSync(tmpPath); } catch { /* ignore cleanup failure */ }
    throw err;
  }
}
