/**
 * PRISM MCP Server - Atomic Write Utility
 * Writes via .tmp → rename for crash-safe file operations.
 * Serialized via queue to prevent parallel write corruption.
 * 
 * @module utils/atomicWrite
 * @safety CRITICAL — Used for all state file writes. Corruption = data loss.
 */

import { writeFile, rename, unlink } from 'fs/promises';
import path from 'path';

// Serialization queue — prevents concurrent writes to same file
// Using a simple promise chain instead of p-queue to minimize dependencies
let writeChain: Promise<void> = Promise.resolve();

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

  // Chain writes to serialize access
  const operation = writeChain.then(async () => {
    try {
      await writeFile(tmpPath, data, 'utf-8');
      await rename(tmpPath, resolved);
    } catch (err: unknown) {
      // Best-effort cleanup of orphaned .tmp file
      try { await unlink(tmpPath); } catch { /* ignore cleanup failure */ }
      throw err;
    }
  });

  writeChain = operation.catch(() => { /* prevent chain from breaking on error */ });
  return operation;
}
