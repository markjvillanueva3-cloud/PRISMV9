/**
 * MCP Dev Tools - Configuration
 */
import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  workingDir: string;
  checkpointDir: string;
  indexDir: string;
  cacheDir: string;
  maxCheckpoints: number;
  maxTaskHistory: number;
  taskTimeoutMinutes: number;
  watchDebounceMs: number;
}

const defaultWorkingDir = process.cwd();

export const config: Config = {
  workingDir: process.env.MCP_WORKING_DIR || defaultWorkingDir,
  checkpointDir: join(defaultWorkingDir, '.mcp-checkpoints'),
  indexDir: join(defaultWorkingDir, '.mcp-index'),
  cacheDir: join(defaultWorkingDir, '.mcp-cache'),
  maxCheckpoints: 50,
  maxTaskHistory: 100,
  taskTimeoutMinutes: 10,
  watchDebounceMs: 100,
};

export function updateWorkingDir(dir: string): void {
  config.workingDir = dir;
  config.checkpointDir = join(dir, '.mcp-checkpoints');
  config.indexDir = join(dir, '.mcp-index');
  config.cacheDir = join(dir, '.mcp-cache');
}
