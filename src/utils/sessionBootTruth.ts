import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CURRENT_STATE_STALE_MINUTES = 6 * 60;
const SHARED_STATE_STALE_MINUTES = 2 * 60;
const RECENT_ERROR_STALE_MINUTES = 4 * 60;
const SESSION_MEMORY_STALE_MINUTES = 24 * 60;
const GSD_STALE_MINUTES = 7 * 24 * 60;

export interface FileFreshness {
  source: string;
  exists: boolean;
  last_modified?: string;
  age_minutes?: number;
  stale: boolean;
  stale_after_minutes: number;
}

export interface SessionBootTruthOptions {
  stateDir: string;
  mcpRoot: string;
  agentFamily?: string;
  machineName?: string;
  pid?: number;
  now?: Date;
}

function sanitizeToken(value: string | undefined, fallback: string): string {
  const clean = (value || "").replace(/[^A-Za-z0-9_-]+/g, "");
  return clean || fallback;
}

export function buildSessionBootInstanceId(options: {
  agentFamily?: string;
  machineName?: string;
  pid?: number;
  now?: Date;
} = {}): string {
  const now = options.now ?? new Date();
  const family = sanitizeToken(
    options.agentFamily
      ?? process.env.PRISM_AGENT_FAMILY
      ?? process.env.CODEX_AGENT_FAMILY
      ?? "prism",
    "prism",
  );
  const machine = sanitizeToken(
    options.machineName
      ?? process.env.COMPUTERNAME
      ?? os.hostname(),
    "unknown",
  );
  const pid = options.pid ?? process.pid;
  return `${family}@${machine}/pid-${pid}-${now.getTime()}`;
}

export function describeFileFreshness(filePath: string, staleAfterMinutes: number, now: Date = new Date()): FileFreshness {
  try {
    const stat = fs.statSync(filePath);
    const ageMinutes = Math.max(0, Math.round((now.getTime() - stat.mtime.getTime()) / 60000));
    return {
      source: toRelativeSource(filePath),
      exists: true,
      last_modified: stat.mtime.toISOString(),
      age_minutes: ageMinutes,
      stale: ageMinutes > staleAfterMinutes,
      stale_after_minutes: staleAfterMinutes,
    };
  } catch {
    return {
      source: toRelativeSource(filePath),
      exists: false,
      stale: true,
      stale_after_minutes: staleAfterMinutes,
    };
  }
}

function toRelativeSource(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function readTextIfExists(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function findExistingPath(paths: string[]): string | null {
  for (const candidate of paths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function formatAgeMinutes(ageMinutes: number | undefined): string {
  if (typeof ageMinutes !== "number" || !Number.isFinite(ageMinutes)) return "unknown age";
  if (ageMinutes < 60) return `${ageMinutes}m`;
  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function extractSectionLines(markdown: string, heading: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const results: string[] = [];
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (line.trim() === heading.trim()) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    }
    if (inSection) results.push(line);
  }
  return results;
}

function extractSectionLinesByMatch(markdown: string, matcher: (heading: string) => boolean): string[] {
  const lines = markdown.split(/\r?\n/);
  const results: string[] = [];
  let inSection = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (matcher(line.trim())) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    }
    if (inSection) results.push(line);
  }
  return results;
}

export function summarizeRoadmapCollaborationState(markdown: string, freshness: FileFreshness) {
  const mode = markdown.match(/- Mode:\s*`([^`]+)`/)?.[1];
  const gateId = markdown.match(/- ID:\s*`([^`]+)`/)?.[1];
  const gateStatus = markdown.match(/- Status:\s*`([^`]+)`/)?.[1];
  const gateDescription = markdown.match(/- Description:\s*(.+)/)?.[1]?.trim();
  const deliveryPriority = extractSectionLines(markdown, "## Current Delivery Priority")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .slice(0, 5);
  return {
    source: "shared_state",
    freshness,
    mode: mode ?? "unknown",
    current_gate: {
      id: gateId ?? "unknown",
      status: gateStatus ?? "unknown",
      description: gateDescription ?? "unknown",
    },
    delivery_priority: deliveryPriority,
  };
}

export function summarizeTaskQueue(markdown: string, freshness: FileFreshness) {
  const footer = markdown.match(/Total:\s*(\d+)\s*\|\s*Done:\s*(\d+)\s*\|\s*Active:\s*(\d+)\s*\|\s*Available:\s*(\d+)\s*\|\s*Blocked:\s*(\d+)/);
  const claimedCount = Number(markdown.match(/## .*CLAIMED.*\((\d+)\)/)?.[1] ?? 0);
  const availableCount = Number(markdown.match(/## .*AVAILABLE.*\((\d+)\)/)?.[1] ?? footer?.[4] ?? 0);
  const blockedCount = Number(markdown.match(/## .*BLOCKED.*\((\d+)\)/)?.[1] ?? footer?.[5] ?? 0);
  const completedCount = Number(markdown.match(/## .*COMPLETED.*\((\d+)\)/)?.[1] ?? footer?.[2] ?? 0);
  const availablePreview = extractSectionLinesByMatch(markdown, (heading) => heading.includes("AVAILABLE"))
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- **"))
    .map((line) => {
      const match = line.match(/^- \*\*([^*]+)\*\*.*?:\s*(.+?)(?:\s+\[|$)/);
      return match ? { id: match[1], title: match[2].trim() } : null;
    })
    .filter((item): item is { id: string; title: string } => item !== null)
    .slice(0, 5);
  return {
    source: "shared_state",
    freshness,
    counts: {
      claimed: claimedCount,
      available: availableCount,
      blocked: blockedCount,
      completed: completedCount,
      total: footer ? Number(footer[1]) : undefined,
    },
    available_preview: availablePreview,
  };
}

function summarizeGsdQuick(markdown: string, freshness: FileFreshness) {
  const sections = markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, "").trim())
    .slice(0, 8);
  return {
    status: freshness.stale ? "stale_summary" : "summary",
    freshness,
    sections_present: sections,
    key_rules: [
      "MCP first",
      "No placeholders",
      "Build via npm run build",
      "Persist state before session end",
    ],
    _hint: freshness.stale
      ? `GSD_QUICK is ${formatAgeMinutes(freshness.age_minutes)} old; exposing summary only.`
      : "GSD_QUICK summary loaded.",
  };
}

function sanitizeWarmStart(warmStart: any, now: Date) {
  if (!warmStart || typeof warmStart !== "object" || Array.isArray(warmStart)) return warmStart;
  const next = { ...warmStart };
  const recentErrors = Array.isArray(warmStart.recent_errors) ? warmStart.recent_errors : [];
  if (recentErrors.length === 0) {
    next.recent_errors = [];
    next.recent_errors_status = "none";
    return next;
  }
  const timestamps = recentErrors
    .map((entry: any) => new Date(entry?.when ?? 0).getTime())
    .filter((value: number) => Number.isFinite(value) && value > 0);
  const freshest = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  const freshestAgeMinutes = freshest > 0 ? Math.round((now.getTime() - freshest) / 60000) : undefined;
  if ((freshestAgeMinutes ?? Infinity) > RECENT_ERROR_STALE_MINUTES) {
    next.recent_errors = [];
    next.recent_errors_status = "stale_suppressed";
    next.recent_errors_suppressed = recentErrors.length;
    next.recent_errors_freshness = {
      freshest_at: freshest > 0 ? new Date(freshest).toISOString() : undefined,
      age_minutes: freshestAgeMinutes,
    };
    next._hint = `Warm-start errors suppressed because the newest entry is ${formatAgeMinutes(freshestAgeMinutes)} old.`;
    return next;
  }
  next.recent_errors = recentErrors.slice(0, 5);
  next.recent_errors_status = "fresh";
  return next;
}

function sanitizeResumeDetection(resumeDetection: any, currentStateFreshness: FileFreshness) {
  if (currentStateFreshness.stale) {
    return {
      scenario: "shared_state_resume",
      confidence: 1,
      stale_local_state: true,
      state_age_seconds: typeof resumeDetection?.state_age_seconds === "number" ? resumeDetection.state_age_seconds : undefined,
      actions: [
        "Read ROADMAP_COLLABORATION_STATE.md",
        "Read TASK_QUEUE.md",
        "Follow the shared /startup stack and coordination state",
      ],
      _hint: `CURRENT_STATE.json is ${formatAgeMinutes(currentStateFreshness.age_minutes)} old; shared PRISM state is canonical.`,
    };
  }
  if (!resumeDetection || typeof resumeDetection !== "object" || Array.isArray(resumeDetection)) {
    return {
      status: "unavailable",
      _hint: "Resume detection unavailable; use shared PRISM state.",
    };
  }
  return {
    ...resumeDetection,
    actions: Array.isArray(resumeDetection.actions) ? resumeDetection.actions.slice(0, 3) : [],
  };
}

function sanitizeEnhancedStartup(enhancedStartup: any) {
  if (!enhancedStartup || typeof enhancedStartup !== "object" || Array.isArray(enhancedStartup)) {
    return enhancedStartup;
  }
  const readinessScore = Number(enhancedStartup.readiness_score);
  if (!Number.isFinite(readinessScore) || typeof enhancedStartup.grade !== "string" || !enhancedStartup.grade) {
    return {
      status: "invalid_output",
      phase: typeof enhancedStartup.phase === "string" ? enhancedStartup.phase : "unknown",
      readiness_score: null,
      _hint: "Enhanced startup returned incomplete fields; rely on shared_state and svi instead.",
    };
  }
  return {
    ...enhancedStartup,
    status: "ok",
  };
}

function sanitizeKeyMemories(keyMemories: any, freshness: FileFreshness) {
  if (!keyMemories || typeof keyMemories !== "object" || Array.isArray(keyMemories)) return keyMemories;
  if (freshness.stale) {
    return {
      status: "stale_memory_snapshot",
      categories: Array.isArray(keyMemories.categories) ? keyMemories.categories : [],
      freshness,
      _hint: `session_memory.json is ${formatAgeMinutes(freshness.age_minutes)} old and is not treated as live resume truth.`,
    };
  }
  return {
    ...keyMemories,
    freshness,
  };
}

export function applySessionBootTruthfulness(result: Record<string, any>, options: SessionBootTruthOptions): Record<string, any> {
  const now = options.now ?? new Date();
  const currentStatePath = path.join(options.stateDir, "CURRENT_STATE.json");
  const sharedRoadmapPath = path.join(options.stateDir, "shared", "ROADMAP_COLLABORATION_STATE.md");
  const sharedTaskQueuePath = path.join(options.stateDir, "shared", "TASK_QUEUE.md");
  const sessionMemoryPath = findExistingPath([
    path.join(options.stateDir, "session_memory.json"),
    path.join(options.stateDir, "SESSION_MEMORY.json"),
  ]);
  const gsdQuickPath = path.join(options.mcpRoot, "data", "docs", "gsd", "GSD_QUICK.md");

  const currentStateFreshness = describeFileFreshness(currentStatePath, CURRENT_STATE_STALE_MINUTES, now);
  const sharedRoadmapFreshness = describeFileFreshness(sharedRoadmapPath, SHARED_STATE_STALE_MINUTES, now);
  const sharedTaskQueueFreshness = describeFileFreshness(sharedTaskQueuePath, SHARED_STATE_STALE_MINUTES, now);
  const sessionMemoryFreshness = describeFileFreshness(
    sessionMemoryPath ?? path.join(options.stateDir, "session_memory.json"),
    SESSION_MEMORY_STALE_MINUTES,
    now,
  );
  const gsdFreshness = describeFileFreshness(gsdQuickPath, GSD_STALE_MINUTES, now);

  const sharedRoadmap = summarizeRoadmapCollaborationState(readTextIfExists(sharedRoadmapPath), sharedRoadmapFreshness);
  const sharedTaskQueue = summarizeTaskQueue(readTextIfExists(sharedTaskQueuePath), sharedTaskQueueFreshness);

  const next = { ...result };
  const existingInstanceId = typeof next.instance_id === "string" ? next.instance_id : "";
  if (!existingInstanceId || existingInstanceId.startsWith("claude-")) {
    next.instance_id = buildSessionBootInstanceId({
      agentFamily: options.agentFamily,
      machineName: options.machineName,
      pid: options.pid,
      now,
    });
  }
  next.current_state_freshness = currentStateFreshness;
  next.shared_state = {
    canonical_resume_source: "state/shared/ROADMAP_COLLABORATION_STATE.md + state/shared/TASK_QUEUE.md",
    roadmap: sharedRoadmap,
    task_queue: sharedTaskQueue,
  };

  if (currentStateFreshness.stale) {
    next.quick_resume = `Shared-state resume required; CURRENT_STATE.json is ${formatAgeMinutes(currentStateFreshness.age_minutes)} old.`;
    next.session = "stale-current-state";
    next.phase = "shared-resume";
  }

  if (sharedRoadmap.mode !== "unknown" || sharedRoadmap.current_gate.id !== "unknown") {
    next.roadmap = {
      source: "shared_state",
      mode: sharedRoadmap.mode,
      gate: sharedRoadmap.current_gate,
      delivery_priority: sharedRoadmap.delivery_priority,
      freshness: sharedRoadmap.freshness,
    };
  }

  const sharedActionItems = sharedRoadmap.delivery_priority.length > 0
    ? sharedRoadmap.delivery_priority
    : sharedTaskQueue.available_preview.map((item) => `${item.id}: ${item.title}`);
  if (currentStateFreshness.stale || !next.action_tracker) {
    next.action_tracker = {
      source: "shared_state",
      status: sharedActionItems.length > 0 ? "shared_delivery_priority" : "shared_state_loaded",
      next_items: sharedActionItems.slice(0, 5),
      freshness: sharedRoadmap.freshness,
    };
  }

  next.warm_start = sanitizeWarmStart(next.warm_start, now);
  next.resume_detection = sanitizeResumeDetection(next.resume_detection, currentStateFreshness);
  next.enhanced_startup = sanitizeEnhancedStartup(next.enhanced_startup);
  next.key_memories = sanitizeKeyMemories(next.key_memories, sessionMemoryFreshness);
  next.gsd_protocol = summarizeGsdQuick(readTextIfExists(gsdQuickPath), gsdFreshness);

  if (next.recent_actions && typeof next.recent_actions === "object" && next.recent_actions.count === 0) {
    next.recent_actions = {
      ...next.recent_actions,
      _hint: "Fresh session boundary; no current-session actions recorded yet.",
    };
  }

  const integrity = Array.isArray(next.integrity) ? [...next.integrity] : [];
  if (currentStateFreshness.stale) {
    integrity.push(`ℹ️ CURRENT_STATE.json is ${formatAgeMinutes(currentStateFreshness.age_minutes)} old; shared state is canonical`);
  }
  if (sharedRoadmapFreshness.exists && !sharedRoadmapFreshness.stale) {
    integrity.push(`✅ Shared roadmap state refreshed ${formatAgeMinutes(sharedRoadmapFreshness.age_minutes)} ago`);
  }
  next.integrity = integrity;

  const suppressed: string[] = [];
  if (currentStateFreshness.stale) suppressed.push("CURRENT_STATE resume fields");
  if (next.warm_start?.recent_errors_status === "stale_suppressed") suppressed.push("warm_start.recent_errors");
  if (next.key_memories?.status === "stale_memory_snapshot") suppressed.push("key_memories");
  if (next.enhanced_startup?.status === "invalid_output") suppressed.push("enhanced_startup");
  next.truthfulness = {
    applied: true,
    updated_at: now.toISOString(),
    stale_local_fields_suppressed: suppressed,
    canonical_sources: [
      "state/shared/ROADMAP_COLLABORATION_STATE.md",
      "state/shared/TASK_QUEUE.md",
      "svi",
    ],
  };

  return next;
}
