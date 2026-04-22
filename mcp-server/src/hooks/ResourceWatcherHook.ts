/**
 * ResourceWatcherHook.ts — KAR-MS1 U-KAR06
 * File watcher hook for real-time detection of new resources.
 *
 * Design decision: Uses polling (not chokidar) by default because:
 * 1. JM Die resources are on network/mapped drives
 * 2. fs.watch is unreliable on network shares
 * 3. Polling with mtime comparison is more robust
 *
 * Exit criteria:
 * - Detects new .pdf/.min/.json files
 * - Classifies category
 * - Queues within 5s (polling interval)
 *
 * @module ResourceWatcherHook
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";
import { folderScannerEngine, type ScannedFile, type FileType } from "../engines/FolderScannerEngine.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface WatcherConfig {
  /** Directories to watch */
  watchPaths: string[];

  /** Polling interval in milliseconds (default: 5000) */
  pollIntervalMs: number;

  /** File extensions to watch */
  extensions: string[];

  /** Maximum depth for recursive scanning */
  maxDepth: number;

  /** Whether watcher is active */
  enabled: boolean;
}

export interface WatcherState {
  /** Last poll timestamp */
  lastPollAt: string | null;

  /** Files detected in last poll */
  lastPollFiles: number;

  /** New files detected since last poll */
  newFilesSinceLastPoll: number;

  /** Changed files detected since last poll */
  changedFilesSinceLastPoll: number;

  /** Total polls since session start */
  totalPolls: number;

  /** Total new files queued this session */
  totalNewFilesQueued: number;

  /** Active poll timer ID (if running) */
  pollTimerId: ReturnType<typeof setInterval> | null;

  /** Is currently polling */
  isPolling: boolean;
}

export interface DetectedFile {
  path: string;
  filename: string;
  fileType: FileType;
  category: string;
  size: number;
  mtime: number;
  isNew: boolean;
  isChanged: boolean;
  detectedAt: string;
}

export type WatcherEventType = "file_added" | "file_changed" | "poll_complete" | "watcher_started" | "watcher_stopped";

export interface WatcherEvent {
  type: WatcherEventType;
  timestamp: string;
  data: {
    files?: DetectedFile[];
    count?: number;
    path?: string;
  };
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [
    "H:/prism/resources",
    "H:/PRISM/JM DIE",
  ],
  pollIntervalMs: 5000, // 5 seconds per exit criteria
  extensions: [".pdf", ".min", ".json", ".nc", ".hnc", ".mcx-8", ".mcx"],
  maxDepth: 15,
  enabled: true,
};

// ============================================================================
// WATCHER STATE (Module-level singleton)
// ============================================================================

let watcherState: WatcherState = {
  lastPollAt: null,
  lastPollFiles: 0,
  newFilesSinceLastPoll: 0,
  changedFilesSinceLastPoll: 0,
  totalPolls: 0,
  totalNewFilesQueued: 0,
  pollTimerId: null,
  isPolling: false,
};

let watcherConfig: WatcherConfig = { ...DEFAULT_CONFIG };
const eventListeners: Array<(event: WatcherEvent) => void> = [];

// ============================================================================
// WATCHER FUNCTIONS
// ============================================================================

/**
 * Emit watcher event to all listeners.
 */
function emitEvent(event: WatcherEvent): void {
  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (e) {
      log.warn(`[ResourceWatcher] Event listener error: ${e}`);
    }
  }
}

/**
 * Perform a single poll scan.
 */
function pollOnce(): { newFiles: DetectedFile[]; changedFiles: DetectedFile[]; errors: string[] } {
  const newFiles: DetectedFile[] = [];
  const changedFiles: DetectedFile[] = [];
  const errors: string[] = [];

  for (const watchPath of watcherConfig.watchPaths) {
    try {
      // Check if path exists
      if (!fs.existsSync(watchPath)) {
        continue;
      }

      const scanResult = folderScannerEngine.scan({
        root_path: watchPath,
        max_depth: watcherConfig.maxDepth,
        include_unchanged: false,
      });

      // Filter by configured extensions
      const relevantFiles = scanResult.files.filter(f => {
        const ext = path.extname(f.filename).toLowerCase();
        return watcherConfig.extensions.some(e => e.toLowerCase() === ext);
      });

      // Categorize files
      for (const file of relevantFiles) {
        const detected: DetectedFile = {
          path: file.file_path,
          filename: file.filename,
          fileType: file.file_type,
          category: mapFileTypeToCategory(file.file_type),
          size: file.size_bytes,
          mtime: file.mtime_ms,
          isNew: file.is_new,
          isChanged: file.is_changed,
          detectedAt: new Date().toISOString(),
        };

        if (file.is_new) {
          newFiles.push(detected);
        } else if (file.is_changed) {
          changedFiles.push(detected);
        }
      }

      if (scanResult.errors.length > 0) {
        errors.push(...scanResult.errors.slice(0, 3));
      }

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      errors.push(`Poll failed for ${watchPath}: ${errMsg}`);
    }
  }

  return { newFiles, changedFiles, errors };
}

/**
 * Map file type to extraction category.
 */
function mapFileTypeToCategory(fileType: FileType): string {
  const mapping: Record<FileType, string> = {
    pdf: "handbook",
    cnc_program: "cnc_program",
    cam_file: "cnc_program",
    spreadsheet: "business_data",
    cad_file: "technical_drawing",
    drawing: "technical_drawing",
    tool_database: "tool_catalog",
    material_db: "material_data",
    formula_script: "knowledge_script",
    config_file: "configuration",
    image: "image",
    post_processor: "post_config",
    probing_cycle: "probing",
    hypermill_file: "hypermill",
    macro_vba: "macro",
    archive: "archive",
    other: "unknown",
  };
  return mapping[fileType] || "unknown";
}

/**
 * Poll handler - called by interval timer.
 */
function handlePoll(): void {
  if (watcherState.isPolling) {
    log.debug("[ResourceWatcher] Skipping poll - already in progress");
    return;
  }

  watcherState.isPolling = true;

  try {
    const { newFiles, changedFiles, errors } = pollOnce();

    // Update state
    watcherState.lastPollAt = new Date().toISOString();
    watcherState.newFilesSinceLastPoll = newFiles.length;
    watcherState.changedFilesSinceLastPoll = changedFiles.length;
    watcherState.totalPolls++;
    watcherState.totalNewFilesQueued += newFiles.length;

    // Emit events for new files
    if (newFiles.length > 0) {
      emitEvent({
        type: "file_added",
        timestamp: new Date().toISOString(),
        data: { files: newFiles, count: newFiles.length },
      });
      log.info(`[ResourceWatcher] Detected ${newFiles.length} new file(s)`);
    }

    // Emit events for changed files
    if (changedFiles.length > 0) {
      emitEvent({
        type: "file_changed",
        timestamp: new Date().toISOString(),
        data: { files: changedFiles, count: changedFiles.length },
      });
      log.info(`[ResourceWatcher] Detected ${changedFiles.length} changed file(s)`);
    }

    // Emit poll complete event
    emitEvent({
      type: "poll_complete",
      timestamp: new Date().toISOString(),
      data: { count: newFiles.length + changedFiles.length },
    });

    if (errors.length > 0) {
      log.warn(`[ResourceWatcher] Poll errors: ${errors.join(", ")}`);
    }

  } finally {
    watcherState.isPolling = false;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Start the resource watcher.
 */
export function startWatcher(config?: Partial<WatcherConfig>): void {
  if (watcherState.pollTimerId) {
    log.warn("[ResourceWatcher] Watcher already running");
    return;
  }

  // Merge config
  watcherConfig = { ...DEFAULT_CONFIG, ...config };

  if (!watcherConfig.enabled) {
    log.info("[ResourceWatcher] Watcher disabled by config");
    return;
  }

  // Start polling
  watcherState.pollTimerId = setInterval(handlePoll, watcherConfig.pollIntervalMs);

  // Do an initial poll
  handlePoll();

  emitEvent({
    type: "watcher_started",
    timestamp: new Date().toISOString(),
    data: { count: watcherConfig.watchPaths.length },
  });

  log.info(`[ResourceWatcher] Started with ${watcherConfig.pollIntervalMs}ms interval`);
}

/**
 * Stop the resource watcher.
 */
export function stopWatcher(): void {
  if (watcherState.pollTimerId) {
    clearInterval(watcherState.pollTimerId);
    watcherState.pollTimerId = null;

    emitEvent({
      type: "watcher_stopped",
      timestamp: new Date().toISOString(),
      data: {},
    });

    log.info("[ResourceWatcher] Stopped");
  }
}

/**
 * Get current watcher state.
 */
export function getWatcherState(): WatcherState {
  return { ...watcherState };
}

/**
 * Get watcher configuration.
 */
export function getWatcherConfig(): WatcherConfig {
  return { ...watcherConfig };
}

/**
 * Add event listener.
 */
export function addWatcherListener(listener: (event: WatcherEvent) => void): void {
  eventListeners.push(listener);
}

/**
 * Remove event listener.
 */
export function removeWatcherListener(listener: (event: WatcherEvent) => void): void {
  const idx = eventListeners.indexOf(listener);
  if (idx >= 0) {
    eventListeners.splice(idx, 1);
  }
}

/**
 * Trigger an immediate poll (for manual refresh).
 */
export function triggerPoll(): { newFiles: DetectedFile[]; changedFiles: DetectedFile[] } {
  const { newFiles, changedFiles } = pollOnce();
  return { newFiles, changedFiles };
}

// ============================================================================
// HOOK DEFINITIONS
// ============================================================================

/**
 * Hook to start resource watcher on session start.
 */
export const onSessionStartResourceWatcher: HookDefinition = {
  id: "on-session-start-resource-watcher",
  name: "Start Resource Watcher",
  description: "Starts the file watcher for real-time resource detection (polling mode).",

  phase: "on-session-start",
  category: "lifecycle",
  mode: "logging",
  priority: "low", // After resource scan
  enabled: true,

  tags: ["session", "watcher", "resources", "kar"],

  handler: (context: HookContext): HookResult => {
    const hook = onSessionStartResourceWatcher;

    // Check if watcher should be enabled
    const watcherEnabled = context.metadata?.enableResourceWatcher !== false;

    if (!watcherEnabled) {
      return hookSuccess(hook, "Resource watcher disabled by config", {
        data: { enabled: false }
      });
    }

    // Start watcher
    startWatcher();

    const state = getWatcherState();

    return hookSuccess(hook, "Resource watcher started (polling mode)", {
      data: {
        enabled: true,
        pollIntervalMs: watcherConfig.pollIntervalMs,
        watchPaths: watcherConfig.watchPaths,
        initialPollFiles: state.newFilesSinceLastPoll + state.changedFilesSinceLastPoll,
      },
      actions: ["resource_watcher_started"],
    });
  }
};

/**
 * Hook to stop resource watcher on session end.
 */
export const onSessionEndResourceWatcher: HookDefinition = {
  id: "on-session-end-resource-watcher",
  name: "Stop Resource Watcher",
  description: "Stops the file watcher on session end to release resources.",

  phase: "on-session-end",
  category: "lifecycle",
  mode: "logging",
  priority: "low",
  enabled: true,

  tags: ["session", "watcher", "cleanup", "kar"],

  handler: (context: HookContext): HookResult => {
    const hook = onSessionEndResourceWatcher;

    const state = getWatcherState();
    const summary = {
      totalPolls: state.totalPolls,
      totalNewFilesQueued: state.totalNewFilesQueued,
      lastPollAt: state.lastPollAt,
    };

    stopWatcher();

    return hookSuccess(hook, `Resource watcher stopped. ${state.totalNewFilesQueued} files queued this session.`, {
      data: summary,
      actions: ["resource_watcher_stopped"],
    });
  }
};

/**
 * Hook to report watcher status on checkpoint.
 */
export const onCheckpointResourceWatcherStatus: HookDefinition = {
  id: "on-checkpoint-resource-watcher-status",
  name: "Resource Watcher Status",
  description: "Reports resource watcher status at checkpoint.",

  phase: "on-session-checkpoint",
  category: "lifecycle",
  mode: "logging",
  priority: "low",
  enabled: true,

  tags: ["checkpoint", "watcher", "status", "kar"],

  handler: (context: HookContext): HookResult => {
    const hook = onCheckpointResourceWatcherStatus;

    const state = getWatcherState();

    if (!state.pollTimerId) {
      return hookSuccess(hook, "Resource watcher not running");
    }

    return hookSuccess(hook, `Watcher: ${state.totalPolls} polls, ${state.totalNewFilesQueued} files queued`, {
      data: {
        isRunning: true,
        totalPolls: state.totalPolls,
        totalNewFilesQueued: state.totalNewFilesQueued,
        lastPollAt: state.lastPollAt,
        newFilesSinceLastPoll: state.newFilesSinceLastPoll,
        changedFilesSinceLastPoll: state.changedFilesSinceLastPoll,
      },
    });
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const resourceWatcherHooks: HookDefinition[] = [
  onSessionStartResourceWatcher,
  onSessionEndResourceWatcher,
  onCheckpointResourceWatcherStatus,
];
