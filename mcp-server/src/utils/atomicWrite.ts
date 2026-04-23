/**
 * atomicWrite — async atomic file writer for JSON state files.
 *
 * Writes to <path>.tmp then renames to <path>. NTFS rename within same
 * volume is atomic, avoiding truncate-then-write race conditions.
 *
 * Unlike atomicSessionWrite.atomicWriteJson (sync, takes object), this:
 * - Is async (returns Promise)
 * - Takes pre-stringified content (caller controls formatting)
 *
 * Used by CADFileIndexerEngine and similar engines that write large indexes.
 *
 * @module utils/atomicWrite
 */

import { promises as fs } from "node:fs";
import { dirname } from "node:path";

/**
 * Atomic write: write to .tmp file, then rename over target.
 * @param targetPath - Final destination path
 * @param content - Pre-stringified content to write
 */
export async function atomicWrite(targetPath: string, content: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;
  const dir = dirname(targetPath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Write to temp file
  await fs.writeFile(tmpPath, content, "utf-8");

  // Atomic rename
  await fs.rename(tmpPath, targetPath);
}

/**
 * Atomic write JSON: serialize then atomic write.
 * @param targetPath - Final destination path
 * @param data - Object to serialize and write
 * @param indent - JSON indent (default 2)
 */
export async function atomicWriteJson(
  targetPath: string,
  data: unknown,
  indent: number = 2
): Promise<void> {
  const content = JSON.stringify(data, null, indent);
  await atomicWrite(targetPath, content);
}
