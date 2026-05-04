/**
 * DriftDetectionManifest — schema + content invariants
 * =====================================================
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P19-U01.
 *
 * The .ps1 installer is data-driven from scripts/drift-detection-manifest.json.
 * If the manifest goes out of sync with the installer's expectations,
 * Windows Task Scheduler registration silently breaks. These tests pin
 * the structural contract so regressions are caught at build-time.
 *
 * Coverage:
 *   - manifest exists and parses
 *   - schemaVersion follows MAJOR.MINOR.PATCH
 *   - drift threshold is sane (0 < pct ≤ 100)
 *   - every task has id + schedule.kind + script_path + interpreter
 *   - clock-scheduled tasks have non-null schtasks_args
 *   - event-triggered tasks have null schtasks_args
 *   - every interpreter is one of the 3 supported (node|tsx|python)
 *   - script_paths are repo-relative (no absolute Windows paths)
 *   - task ids are unique
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P19-U01
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const MANIFEST_PATH = resolve(REPO_ROOT, "scripts", "drift-detection-manifest.json");

const SUPPORTED_INTERPRETERS = ["node", "tsx", "python"];
const SUPPORTED_SCHEDULE_KINDS = ["daily", "hourly", "event"];
const SUPPORTED_EVENT_TRIGGERS = ["PreEdit", "SessionEnd", "post-build"];
const MAX_DRIFT_PCT = 100;
const MIN_DRIFT_PCT = 0;

interface Task {
  id: string;
  title: string;
  script_path: string;
  interpreter: string;
  schedule: { kind: string; time?: string; modifier?: number; trigger?: string; debounce_seconds?: number };
  schtasks_args: string[] | null;
  rationale: string;
  skip_if_missing?: boolean;
  missing_note?: string;
  wired_via?: string;
}

interface Manifest {
  schemaVersion: string;
  milestone: string;
  description: string;
  log_file: string;
  log_max_bytes: number;
  drift_alert_threshold_pct: number;
  tasks: Task[];
  notes: string[];
}

const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;

describe("drift-detection-manifest.json — top-level", () => {
  it("has schemaVersion in MAJOR.MINOR.PATCH form", () => {
    expect(manifest.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("declares the right milestone", () => {
    expect(manifest.milestone).toBe("INTEL-OLLAMA-OBSIDIAN-MS0/P19-U01");
  });

  it("has a non-empty description", () => {
    expect(manifest.description.length).toBeGreaterThan(0);
  });

  it("points log_file at mcp-server/data/state/cron-runs.jsonl", () => {
    expect(manifest.log_file).toBe("mcp-server/data/state/cron-runs.jsonl");
  });

  it("has a sane drift threshold (0 < pct ≤ 100)", () => {
    expect(manifest.drift_alert_threshold_pct).toBeGreaterThan(MIN_DRIFT_PCT);
    expect(manifest.drift_alert_threshold_pct).toBeLessThanOrEqual(MAX_DRIFT_PCT);
  });

  it("has log_max_bytes set to a reasonable cap", () => {
    expect(manifest.log_max_bytes).toBeGreaterThanOrEqual(1024);
    expect(manifest.log_max_bytes).toBeLessThanOrEqual(64 * 1024 * 1024);
  });
});

describe("drift-detection-manifest.json — tasks invariants", () => {
  it("has at least one task", () => {
    expect(manifest.tasks.length).toBeGreaterThan(0);
  });

  it("every task has id, title, script_path, interpreter, schedule", () => {
    for (const t of manifest.tasks) {
      expect(typeof t.id).toBe("string");
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.title).toBe("string");
      expect(typeof t.script_path).toBe("string");
      expect(t.script_path.length).toBeGreaterThan(0);
      expect(typeof t.interpreter).toBe("string");
      expect(typeof t.schedule).toBe("object");
      expect(typeof t.schedule.kind).toBe("string");
    }
  });

  it("every interpreter is one of the supported set", () => {
    for (const t of manifest.tasks) {
      expect(SUPPORTED_INTERPRETERS).toContain(t.interpreter);
    }
  });

  it("every schedule.kind is one of the supported set", () => {
    for (const t of manifest.tasks) {
      expect(SUPPORTED_SCHEDULE_KINDS).toContain(t.schedule.kind);
    }
  });

  it("clock-scheduled tasks (daily/hourly) have non-null schtasks_args", () => {
    for (const t of manifest.tasks) {
      if (t.schedule.kind === "daily" || t.schedule.kind === "hourly") {
        expect(Array.isArray(t.schtasks_args)).toBe(true);
        expect(t.schtasks_args!.length).toBeGreaterThan(0);
      }
    }
  });

  it("event-triggered tasks have null schtasks_args (not Task Scheduler entries)", () => {
    for (const t of manifest.tasks) {
      if (t.schedule.kind === "event") {
        expect(t.schtasks_args).toBeNull();
        expect(SUPPORTED_EVENT_TRIGGERS).toContain(t.schedule.trigger);
      }
    }
  });

  it("daily schedules include /SC DAILY and /ST hh:mm in schtasks_args", () => {
    for (const t of manifest.tasks) {
      if (t.schedule.kind !== "daily") continue;
      const args = t.schtasks_args!;
      expect(args).toContain("/SC");
      expect(args).toContain("DAILY");
      expect(args).toContain("/ST");
      const stIdx = args.indexOf("/ST");
      expect(args[stIdx + 1]).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("hourly schedules include /SC HOURLY and /MO N in schtasks_args", () => {
    for (const t of manifest.tasks) {
      if (t.schedule.kind !== "hourly") continue;
      const args = t.schtasks_args!;
      expect(args).toContain("/SC");
      expect(args).toContain("HOURLY");
      expect(args).toContain("/MO");
      const moIdx = args.indexOf("/MO");
      expect(Number(args[moIdx + 1])).toBeGreaterThanOrEqual(1);
    }
  });

  it("script_paths are repo-relative (no absolute Windows paths)", () => {
    for (const t of manifest.tasks) {
      expect(t.script_path).not.toMatch(/^[A-Z]:[\\/]/);
      expect(t.script_path).not.toMatch(/^\//);
    }
  });

  it("task ids are unique", () => {
    const ids = manifest.tasks.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("task ids use lowercase-kebab convention", () => {
    for (const t of manifest.tasks) {
      expect(t.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("rationale is present and non-empty for every task", () => {
    for (const t of manifest.tasks) {
      expect(typeof t.rationale).toBe("string");
      expect(t.rationale.length).toBeGreaterThan(0);
    }
  });

  it("tasks marked skip_if_missing carry a missing_note", () => {
    for (const t of manifest.tasks) {
      if (t.skip_if_missing === true) {
        expect(typeof t.missing_note).toBe("string");
        expect(t.missing_note!.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("drift-detection-manifest.json — agent-2 reference scripts", () => {
  it("includes update-prism-inventory daily refresh", () => {
    const task = manifest.tasks.find((t) => t.script_path.endsWith("update-prism-inventory.mjs"));
    expect(task?.schedule.kind).toBe("daily");
    expect(task?.schedule.time).toBe("06:00");
  });

  it("includes nightly orphan audit slot at 23:00", () => {
    const task = manifest.tasks.find((t) => t.id === "drift-orphan-audit");
    expect(task?.schedule.kind).toBe("daily");
    expect(task?.schedule.time).toBe("23:00");
  });

  it("includes hourly inventory delta slot", () => {
    const task = manifest.tasks.find((t) => t.id === "drift-inventory-delta");
    expect(task?.schedule.kind).toBe("hourly");
    expect(task?.schedule.modifier).toBe(1);
  });

  it("includes self-awareness manifest event-trigger on SessionEnd", () => {
    const task = manifest.tasks.find((t) => t.id === "drift-self-awareness-manifest");
    expect(task?.schedule.kind).toBe("event");
    expect(task?.schedule.trigger).toBe("SessionEnd");
    expect(task?.schtasks_args).toBeNull();
  });

  it("includes populate-skill-triggers post-build trigger", () => {
    const task = manifest.tasks.find((t) => t.id === "drift-populate-skill-triggers");
    expect(task?.schedule.kind).toBe("event");
    expect(task?.schedule.trigger).toBe("post-build");
  });
});
