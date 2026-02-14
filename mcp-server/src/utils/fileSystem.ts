/**
 * PRISM MCP Server - File System Utilities
 * Re-exports from files.ts for backward compatibility
 */

// Re-export everything from files.ts
export {
  readJsonFile,
  readTextFile,
  fileExists,
  directoryExists,
  writeJsonFile,
  writeTextFile,
  appendToFile,
  listFiles,
  getFileStats,
  findFiles,
  searchInFiles,
  normalizePath,
  relativePath,
  ensureDir,
  countLines
} from "./files.js";

// Alias for listDirectory (maps to listFiles)
import { listFiles } from "./files.js";

/**
 * List directory contents (alias for listFiles)
 * @returns Array of filenames (not full paths) - use path.join(dirPath, filename) to get full path
 */
export async function listDirectory(
  dirPath: string,
  options?: { extension?: string; recursive?: boolean; fullPath?: boolean }
): Promise<string[]> {
  return listFiles(dirPath, options);
}
