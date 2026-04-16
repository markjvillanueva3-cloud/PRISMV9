/**
 * Unified telemetry path resolution.
 * All telemetry writes go to ~/.prism/telemetry/ for cross-session persistence.
 * Falls back to process.cwd()/state/telemetry/ if home dir is not writable.
 */
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, accessSync, constants } from 'fs';

let _telemetryDir: string | null = null;

export function getTelemetryDir(): string {
  if (_telemetryDir) return _telemetryDir;

  const primaryDir = join(homedir(), '.prism', 'telemetry');
  try {
    mkdirSync(primaryDir, { recursive: true });
    accessSync(primaryDir, constants.W_OK);
    _telemetryDir = primaryDir;
  } catch {
    // Fallback to local state directory
    const fallbackDir = join(process.cwd(), 'state', 'telemetry');
    try {
      mkdirSync(fallbackDir, { recursive: true });
      _telemetryDir = fallbackDir;
    } catch {
      _telemetryDir = primaryDir; // Hope for the best
    }
  }
  return _telemetryDir;
}

export function getTelemetryFile(filename: string): string {
  return join(getTelemetryDir(), filename);
}
