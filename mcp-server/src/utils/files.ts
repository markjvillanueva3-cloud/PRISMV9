/**
 * PRISM MCP Server - File Operations
 * Centralized file system utilities with error handling
 */

import { promises as fs } from "fs";
import * as path from "path";
import { FileSystemError } from "./errors.js";
import { log } from "./Logger.js";

// ============================================================================
// FILE READING
// ============================================================================

/**
 * Read JSON file with type safety
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new FileSystemError("read", filePath, error as Error);
    }
    throw new FileSystemError("parse", filePath, error as Error);
  }
}

/**
 * Read text file
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    throw new FileSystemError("read", filePath, error as Error);
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// ============================================================================
// FILE WRITING
// ============================================================================

/**
 * Write JSON file with pretty formatting
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    log.debug(`Written: ${filePath}`);
  } catch (error) {
    throw new FileSystemError("write", filePath, error as Error);
  }
}

/**
 * Write text file
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    log.debug(`Written: ${filePath}`);
  } catch (error) {
    throw new FileSystemError("write", filePath, error as Error);
  }
}

/**
 * Append to file
 */
export async function appendToFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.appendFile(filePath, content, "utf-8");
  } catch (error) {
    throw new FileSystemError("append", filePath, error as Error);
  }
}

// ============================================================================
// DIRECTORY OPERATIONS
// ============================================================================

/**
 * List files in directory with optional extension filter
 * @returns Array of filenames (not full paths) - use path.join(dirPath, filename) to get full path
 */
export async function listFiles(
  dirPath: string,
  options?: { extension?: string; recursive?: boolean; fullPath?: boolean }
): Promise<string[]> {
  const { extension, recursive = false, fullPath = false } = options ?? {};
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];
    
    for (const entry of entries) {
      const entryFullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && recursive) {
        // For recursive, always pass fullPath option to maintain consistency
        const subFiles = await listFiles(entryFullPath, { ...options, fullPath: true });
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (!extension || entry.name.endsWith(extension)) {
          // Return filename only by default, full path if requested
          files.push(fullPath ? entryFullPath : entry.name);
        }
      }
    }
    
    return files;
  } catch (error) {
    throw new FileSystemError("list", dirPath, error as Error);
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<{
  size: number;
  created: Date;
  modified: Date;
  isDirectory: boolean;
}> {
  try {
    const stat = await fs.stat(filePath);
    return {
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      isDirectory: stat.isDirectory()
    };
  } catch (error) {
    throw new FileSystemError("stat", filePath, error as Error);
  }
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

/**
 * Find files matching pattern
 */
export async function findFiles(
  dirPath: string,
  pattern: RegExp,
  options?: { maxResults?: number }
): Promise<string[]> {
  const { maxResults = 100 } = options ?? {};
  const results: string[] = [];
  
  async function search(currentPath: string): Promise<void> {
    if (results.length >= maxResults) return;
    
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) return;
        
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            await search(fullPath);
          }
        } else if (pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }
  
  await search(dirPath);
  return results;
}

/**
 * Search file content for pattern
 */
export async function searchInFiles(
  files: string[],
  pattern: RegExp,
  options?: { maxResults?: number; contextLines?: number }
): Promise<Array<{ file: string; line: number; content: string; context?: string[] }>> {
  const { maxResults = 50, contextLines = 0 } = options ?? {};
  const results: Array<{ file: string; line: number; content: string; context?: string[] }> = [];
  
  for (const file of files) {
    if (results.length >= maxResults) break;
    
    try {
      const content = await fs.readFile(file, "utf-8");
      const lines = content.split("\n");
      
      for (let i = 0; i < lines.length; i++) {
        if (results.length >= maxResults) break;
        
        if (pattern.test(lines[i])) {
          const result: { file: string; line: number; content: string; context?: string[] } = {
            file,
            line: i + 1,
            content: lines[i].trim()
          };
          
          if (contextLines > 0) {
            const start = Math.max(0, i - contextLines);
            const end = Math.min(lines.length, i + contextLines + 1);
            result.context = lines.slice(start, end);
          }
          
          results.push(result);
        }
      }
    } catch {
      // Skip files we can't read
    }
  }
  
  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize path for cross-platform compatibility
 */
export function normalizePath(inputPath: string): string {
  return path.normalize(inputPath).replace(/\\/g, "/");
}

/**
 * Get relative path from base
 */
export function relativePath(from: string, to: string): string {
  return path.relative(from, to).replace(/\\/g, "/");
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Count lines in file
 */
export async function countLines(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, "utf-8");
  return content.split("\n").length;
}

/**
 * List directory contents (files and subdirectories)
 */
export async function listDirectory(
  dirPath: string,
  options?: { recursive?: boolean; includeHidden?: boolean }
): Promise<Array<{ name: string; path: string; isDirectory: boolean; size?: number }>> {
  const { recursive = false, includeHidden = false } = options ?? {};
  const results: Array<{ name: string; path: string; isDirectory: boolean; size?: number }> = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip hidden files unless requested
      if (!includeHidden && entry.name.startsWith(".")) continue;
      
      const fullPath = path.join(dirPath, entry.name);
      const isDir = entry.isDirectory();
      
      const item: { name: string; path: string; isDirectory: boolean; size?: number } = {
        name: entry.name,
        path: fullPath,
        isDirectory: isDir
      };
      
      if (!isDir) {
        try {
          const stat = await fs.stat(fullPath);
          item.size = stat.size;
        } catch {
          // Skip if we can't stat
        }
      }
      
      results.push(item);
      
      if (recursive && isDir && entry.name !== "node_modules") {
        const subItems = await listDirectory(fullPath, options);
        results.push(...subItems);
      }
    }
    
    return results;
  } catch (error) {
    throw new FileSystemError("list", dirPath, error as Error);
  }
}
