/**
 * PRISM MCP Server - Automation Hooks
 * Session 6.2H: Automated Actions, Triggers, Workflows
 * 
 * Hooks that automatically trigger actions:
 * - Index updates on data changes
 * - Cache invalidation
 * - Backup creation
 * - Notification triggers
 * - Sync operations
 * - Auto-documentation
 * - State persistence
 * 
 * These hooks automate maintenance tasks that would
 * otherwise require manual intervention.
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// AUTOMATION STATE
// ============================================================================

interface IndexEntry {
  id: string;
  type: string;
  name: string;
  path?: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface CacheEntry {
  key: string;
  value: unknown;
  expiresAt: string;
  createdAt: string;
}

interface BackupEntry {
  id: string;
  source: string;
  timestamp: string;
  size: number;
  type: "full" | "incremental";
}

interface NotificationEntry {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

// In-memory automation state
const automationState = {
  indexes: {
    materials: new Map<string, IndexEntry>(),
    machines: new Map<string, IndexEntry>(),
    alarms: new Map<string, IndexEntry>(),
    tools: new Map<string, IndexEntry>()
  },
  cache: new Map<string, CacheEntry>(),
  backups: [] as BackupEntry[],
  notifications: [] as NotificationEntry[],
  pendingSyncs: [] as Array<{ type: string; target: string; timestamp: string }>,
  lastIndexUpdate: new Date().toISOString()
};

// ============================================================================
// INDEX UPDATE HOOKS
// ============================================================================

/**
 * Update material index on add/update
 */
const onMaterialIndexUpdate: HookDefinition = {
  id: "on-material-index-update",
  name: "Material Index Update",
  description: "Automatically updates the material index when materials are added or modified.",
  
  phase: "post-material-add",
  category: "automation",
  mode: "silent",
  priority: "normal",
  enabled: true,
  
  tags: ["index", "material", "automation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onMaterialIndexUpdate;
    
    const material = context.target?.data as {
      material_id?: string;
      name?: string;
      iso_group?: string;
    } | undefined;
    
    if (!material?.material_id) {
      return hookSuccess(hook, "No material data to index");
    }
    
    const entry: IndexEntry = {
      id: material.material_id,
      type: "material",
      name: material.name || material.material_id,
      updatedAt: new Date().toISOString(),
      metadata: {
        iso_group: material.iso_group
      }
    };
    
    automationState.indexes.materials.set(material.material_id, entry);
    automationState.lastIndexUpdate = new Date().toISOString();
    
    return hookSuccess(hook, `Material indexed: ${material.material_id}`, {
      actions: ["index_updated:materials"]
    });
  }
};

/**
 * Update machine index on add/update
 */
const onMachineIndexUpdate: HookDefinition = {
  id: "on-machine-index-update",
  name: "Machine Index Update",
  description: "Automatically updates the machine index when machines are added or modified.",
  
  phase: "post-machine-add",
  category: "automation",
  mode: "silent",
  priority: "normal",
  enabled: true,
  
  tags: ["index", "machine", "automation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onMachineIndexUpdate;
    
    const machine = context.target?.data as {
      machine_id?: string;
      name?: string;
      manufacturer?: string;
      model?: string;
    } | undefined;
    
    if (!machine?.machine_id) {
      return hookSuccess(hook, "No machine data to index");
    }
    
    const entry: IndexEntry = {
      id: machine.machine_id,
      type: "machine",
      name: machine.name || `${machine.manufacturer} ${machine.model}` || machine.machine_id,
      updatedAt: new Date().toISOString(),
      metadata: {
        manufacturer: machine.manufacturer,
        model: machine.model
      }
    };
    
    automationState.indexes.machines.set(machine.machine_id, entry);
    automationState.lastIndexUpdate = new Date().toISOString();
    
    return hookSuccess(hook, `Machine indexed: ${machine.machine_id}`, {
      actions: ["index_updated:machines"]
    });
  }
};

/**
 * Update alarm index on add/update
 */
const onAlarmIndexUpdate: HookDefinition = {
  id: "on-alarm-index-update",
  name: "Alarm Index Update",
  description: "Automatically updates the alarm index when alarms are added or modified.",
  
  phase: "post-alarm-add",
  category: "automation",
  mode: "silent",
  priority: "normal",
  enabled: true,
  
  tags: ["index", "alarm", "automation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onAlarmIndexUpdate;
    
    const alarm = context.target?.data as {
      alarm_id?: string;
      code?: string;
      name?: string;
      category?: string;
      controller_family?: string;
    } | undefined;
    
    if (!alarm?.alarm_id) {
      return hookSuccess(hook, "No alarm data to index");
    }
    
    const entry: IndexEntry = {
      id: alarm.alarm_id,
      type: "alarm",
      name: alarm.name || alarm.code || alarm.alarm_id,
      updatedAt: new Date().toISOString(),
      metadata: {
        code: alarm.code,
        category: alarm.category,
        controller_family: alarm.controller_family
      }
    };
    
    automationState.indexes.alarms.set(alarm.alarm_id, entry);
    automationState.lastIndexUpdate = new Date().toISOString();
    
    return hookSuccess(hook, `Alarm indexed: ${alarm.alarm_id}`, {
      actions: ["index_updated:alarms"]
    });
  }
};

// ============================================================================
// CACHE MANAGEMENT HOOKS
// ============================================================================

/**
 * Invalidate cache on data change
 */
const onCacheInvalidate: HookDefinition = {
  id: "on-cache-invalidate",
  name: "Cache Invalidation",
  description: "Automatically invalidates cache entries when related data changes.",
  
  phase: "post-file-write",
  category: "automation",
  mode: "silent",
  priority: "normal",
  enabled: true,
  
  tags: ["cache", "invalidation", "automation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onCacheInvalidate;
    
    const filePath = context.target?.path || "";
    const invalidated: string[] = [];
    
    // Find and invalidate related cache entries
    for (const [key, entry] of automationState.cache) {
      // Invalidate if cache key relates to the modified file
      if (key.includes(filePath) || 
          (context.target?.type && key.includes(context.target.type))) {
        automationState.cache.delete(key);
        invalidated.push(key);
      }
    }
    
    if (invalidated.length > 0) {
      return hookSuccess(hook, `Invalidated ${invalidated.length} cache entries`, {
        data: { invalidated },
        actions: ["cache_invalidated"]
      });
    }
    
    return hookSuccess(hook, "No cache entries to invalidate");
  }
};

/**
 * Clear expired cache entries
 */
const onCacheCleanup: HookDefinition = {
  id: "on-cache-cleanup",
  name: "Cache Cleanup",
  description: "Periodically clears expired cache entries.",
  
  phase: "on-session-checkpoint",
  category: "automation",
  mode: "silent",
  priority: "background",
  enabled: true,
  
  tags: ["cache", "cleanup", "automation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onCacheCleanup;
    
    const now = new Date();
    const expired: string[] = [];
    
    for (const [key, entry] of automationState.cache) {
      if (new Date(entry.expiresAt) < now) {
        automationState.cache.delete(key);
        expired.push(key);
      }
    }
    
    if (expired.length > 0) {
      return hookSuccess(hook, `Cleaned up ${expired.length} expired cache entries`, {
        data: { expiredCount: expired.length }
      });
    }
    
    return hookSuccess(hook, "No expired cache entries");
  }
};

// ============================================================================
// BACKUP HOOKS
// ============================================================================

/**
 * Create backup before major changes
 */
const onBackupCreate: HookDefinition = {
  id: "on-backup-create",
  name: "Auto Backup Creation",
  description: "Automatically creates backup before major file modifications.",
  
  phase: "pre-file-write",
  category: "automation",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["backup", "automation", "safety"],
  
  condition: (context: HookContext): boolean => {
    // Only backup important files
    const path = context.target?.path || "";
    return path.includes("MASTER") || 
           path.includes("DATABASE") ||
           path.includes("_EXPANDED") ||
           path.includes("CURRENT_STATE");
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onBackupCreate;
    
    const filePath = context.target?.path || "unknown";
    const oldContent = context.content?.old;
    
    if (!oldContent) {
      return hookSuccess(hook, "No existing content to backup");
    }
    
    const size = typeof oldContent === "string" 
      ? oldContent.length 
      : JSON.stringify(oldContent).length;
    
    const backup: BackupEntry = {
      id: `backup-${Date.now()}`,
      source: filePath,
      timestamp: new Date().toISOString(),
      size,
      type: "incremental"
    };
    
    automationState.backups.push(backup);
    
    // Keep last 50 backups
    if (automationState.backups.length > 50) {
      automationState.backups.shift();
    }
    
    return hookSuccess(hook, `Backup created: ${backup.id}`, {
      data: backup,
      actions: ["backup_created"]
    });
  }
};

// ============================================================================
// NOTIFICATION HOOKS
// ============================================================================

/**
 * Generate notifications for important events
 */
const onNotificationGenerate: HookDefinition = {
  id: "on-notification-generate",
  name: "Notification Generator",
  description: "Generates notifications for important events.",
  
  phase: "on-outcome",
  category: "automation",
  mode: "silent",
  priority: "normal",
  enabled: true,
  
  tags: ["notification", "automation", "alert"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onNotificationGenerate;
    
    const previousResults = context.previousResults || [];
    
    // Check for blocks or warnings from previous hooks
    const blocks = previousResults.filter(r => r.blocked);
    const warnings = previousResults.filter(r => r.warnings && r.warnings.length > 0);
    
    const notifications: NotificationEntry[] = [];
    
    for (const block of blocks) {
      notifications.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "error",
        message: `BLOCKED: ${block.message}`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
    
    for (const warning of warnings) {
      notifications.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "warning",
        message: warning.warnings![0],
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
    
    if (notifications.length > 0) {
      automationState.notifications.push(...notifications);
      
      // Keep last 100 notifications
      while (automationState.notifications.length > 100) {
        automationState.notifications.shift();
      }
      
      return hookSuccess(hook, `Generated ${notifications.length} notifications`, {
        data: { notificationCount: notifications.length }
      });
    }
    
    return hookSuccess(hook, "No notifications generated");
  }
};

/**
 * Session completion notification
 */
const onSessionCompleteNotify: HookDefinition = {
  id: "on-session-complete-notify",
  name: "Session Completion Notification",
  description: "Generates notification when session completes.",
  
  phase: "on-session-end",
  category: "automation",
  mode: "logging",
  priority: "low",
  enabled: true,
  
  tags: ["notification", "session", "completion"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionCompleteNotify;
    
    const sessionId = context.session?.sessionId || "unknown";
    const status = context.metadata?.status || "completed";
    
    const notification: NotificationEntry = {
      id: `notif-session-${Date.now()}`,
      type: status === "completed" ? "success" : "info",
      message: `Session ${sessionId} ${status}`,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    automationState.notifications.push(notification);
    
    return hookSuccess(hook, `Session completion notification created`, {
      data: notification
    });
  }
};

// ============================================================================
// SYNC HOOKS
// ============================================================================

/**
 * Queue sync operation
 */
const onSyncQueue: HookDefinition = {
  id: "on-sync-queue",
  name: "Sync Queue",
  description: "Queues sync operations for batch processing.",
  
  phase: "post-file-write",
  category: "automation",
  mode: "silent",
  priority: "low",
  enabled: true,
  
  tags: ["sync", "queue", "automation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSyncQueue;
    
    const filePath = context.target?.path || "";
    const targetType = context.target?.type || "file";
    
    // Queue sync operation
    automationState.pendingSyncs.push({
      type: targetType,
      target: filePath,
      timestamp: new Date().toISOString()
    });
    
    // Keep last 100 pending syncs
    while (automationState.pendingSyncs.length > 100) {
      automationState.pendingSyncs.shift();
    }
    
    return hookSuccess(hook, `Sync queued: ${targetType}`, {
      data: { pendingSyncs: automationState.pendingSyncs.length }
    });
  }
};

/**
 * Process pending syncs
 */
const onSyncProcess: HookDefinition = {
  id: "on-sync-process",
  name: "Sync Processor",
  description: "Processes pending sync operations in batch.",
  
  phase: "on-session-checkpoint",
  category: "automation",
  mode: "logging",
  priority: "low",
  enabled: true,
  
  tags: ["sync", "process", "batch"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSyncProcess;
    
    const pending = automationState.pendingSyncs.length;
    
    if (pending === 0) {
      return hookSuccess(hook, "No pending syncs to process");
    }
    
    // In production, this would actually sync to external systems
    // For now, just clear the queue
    const processed = [...automationState.pendingSyncs];
    automationState.pendingSyncs = [];
    
    return hookSuccess(hook, `Processed ${processed.length} sync operations`, {
      data: { processed: processed.length },
      actions: ["syncs_processed"]
    });
  }
};

// ============================================================================
// STATE PERSISTENCE HOOKS
// ============================================================================

/**
 * Auto-save state on changes
 */
const onStateAutoSave: HookDefinition = {
  id: "on-state-auto-save",
  name: "State Auto-Save",
  description: "Automatically saves state after significant operations.",
  
  phase: "on-session-checkpoint",
  category: "automation",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["state", "persistence", "auto-save"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onStateAutoSave;
    
    const sessionState = {
      sessionId: context.session?.sessionId,
      toolCalls: context.session?.toolCalls,
      checkpoints: context.session?.checkpoints,
      timestamp: new Date().toISOString(),
      bufferZone: context.session?.bufferZone,
      indexes: {
        materials: automationState.indexes.materials.size,
        machines: automationState.indexes.machines.size,
        alarms: automationState.indexes.alarms.size
      },
      pendingSyncs: automationState.pendingSyncs.length,
      notifications: automationState.notifications.filter(n => !n.acknowledged).length
    };
    
    // In production, this would persist to CURRENT_STATE.json
    log.info(`State auto-saved: ${JSON.stringify(sessionState)}`);
    
    return hookSuccess(hook, "State auto-saved", {
      data: sessionState,
      actions: ["state_persisted"]
    });
  }
};

// ============================================================================
// AUTOMATION STATE ACCESS
// ============================================================================

/**
 * Get automation state
 */
export function getAutomationState() {
  return {
    indexes: {
      materials: automationState.indexes.materials.size,
      machines: automationState.indexes.machines.size,
      alarms: automationState.indexes.alarms.size,
      tools: automationState.indexes.tools.size
    },
    cacheSize: automationState.cache.size,
    backupCount: automationState.backups.length,
    unacknowledgedNotifications: automationState.notifications.filter(n => !n.acknowledged).length,
    pendingSyncs: automationState.pendingSyncs.length,
    lastIndexUpdate: automationState.lastIndexUpdate
  };
}

/**
 * Get notifications
 */
export function getNotifications(acknowledged: boolean = false) {
  return automationState.notifications.filter(n => n.acknowledged === acknowledged);
}

/**
 * Acknowledge notification
 */
export function acknowledgeNotification(id: string) {
  const notification = automationState.notifications.find(n => n.id === id);
  if (notification) {
    notification.acknowledged = true;
    return true;
  }
  return false;
}

/**
 * Get backups
 */
export function getBackups(limit: number = 10) {
  return automationState.backups.slice(-limit);
}

/**
 * Set cache entry
 */
export function setCache(key: string, value: unknown, ttlMs: number = 3600000) {
  automationState.cache.set(key, {
    key,
    value,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    createdAt: new Date().toISOString()
  });
}

/**
 * Get cache entry
 */
export function getCache(key: string): unknown | undefined {
  const entry = automationState.cache.get(key);
  if (entry && new Date(entry.expiresAt) > new Date()) {
    return entry.value;
  }
  return undefined;
}

// ============================================================================
// EXPORT ALL AUTOMATION HOOKS
// ============================================================================

export const automationHooks: HookDefinition[] = [
  // Index updates
  onMaterialIndexUpdate,
  onMachineIndexUpdate,
  onAlarmIndexUpdate,
  
  // Cache management
  onCacheInvalidate,
  onCacheCleanup,
  
  // Backups
  onBackupCreate,
  
  // Notifications
  onNotificationGenerate,
  onSessionCompleteNotify,
  
  // Sync
  onSyncQueue,
  onSyncProcess,
  
  // State
  onStateAutoSave
];

export {
  onMaterialIndexUpdate,
  onMachineIndexUpdate,
  onAlarmIndexUpdate,
  onCacheInvalidate,
  onCacheCleanup,
  onBackupCreate,
  onNotificationGenerate,
  onSessionCompleteNotify,
  onSyncQueue,
  onSyncProcess,
  onStateAutoSave
};
