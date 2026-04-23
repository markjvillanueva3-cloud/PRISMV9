import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../constants.js";
import { safeWriteSync } from "../utils/atomicWrite.js";

const STATE_DIR = PATHS.STATE_DIR;
const HANDOFF_PACKAGE_FILE = path.join(STATE_DIR, "HANDOFF_PACKAGE.json");

function readJsonIfExists<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function autoWarmStartData(): {
  success: boolean;
  registry_status: Record<string, unknown>;
  recent_errors: any[];
  top_failures: string[];
  session_info: { session: string; phase: string; quick_resume: string };
  roadmap_next: string[];
} {
  const result = {
    success: true,
    registry_status: {} as Record<string, unknown>,
    recent_errors: [] as any[],
    top_failures: [] as string[],
    session_info: {
      session: "unknown",
      phase: "unknown",
      quick_resume: "None",
    },
    roadmap_next: [] as string[],
  };

  const currentState = readJsonIfExists<any>(path.join(STATE_DIR, "CURRENT_STATE.json"));
  if (currentState) {
    result.session_info = {
      session: String(currentState.session ?? currentState.sessionNumber ?? "unknown"),
      phase: String(currentState.phase ?? currentState.currentPhase ?? "unknown"),
      quick_resume: String(currentState.quickResume ?? currentState.quick_resume ?? "None"),
    };
  }

  const recentActions = readJsonIfExists<any>(path.join(STATE_DIR, "RECENT_ACTIONS.json"));
  if (Array.isArray(recentActions?.actions)) {
    const failures = recentActions.actions.filter((entry: any) => entry && entry.success === false);
    result.recent_errors = failures.slice(-5);
    const grouped = new Map<string, number>();
    for (const failure of failures) {
      const key = String(failure.tool ?? failure.action ?? "unknown");
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    result.top_failures = [...grouped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}:${count}`);
  }

  const roadmapPath = path.join(STATE_DIR, "shared", "ROADMAP_COLLABORATION_STATE.md");
  if (fs.existsSync(roadmapPath)) {
    const roadmap = fs.readFileSync(roadmapPath, "utf-8");
    result.roadmap_next = roadmap
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .map((line) => line.replace(/^- /, "").trim())
      .slice(0, 5);
  }

  const claimsDir = path.join(PATHS.MCP_SERVER, "data", "claims");
  result.registry_status = {
    extracted_dir_exists: fs.existsSync(PATHS.EXTRACTED_DIR),
    state_dir_exists: fs.existsSync(STATE_DIR),
    claims_dir_exists: fs.existsSync(claimsDir),
  };

  return result;
}

export function markHandoffResumed(): boolean {
  try {
    if (!fs.existsSync(HANDOFF_PACKAGE_FILE)) return false;
    const pkg = JSON.parse(fs.readFileSync(HANDOFF_PACKAGE_FILE, "utf-8"));
    pkg.resumed = true;
    pkg.resumed_at = new Date().toISOString();
    safeWriteSync(HANDOFF_PACKAGE_FILE, JSON.stringify(pkg, null, 2));
    return true;
  } catch {
    return false;
  }
}
