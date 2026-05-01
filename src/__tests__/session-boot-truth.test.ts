import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";

import {
  applySessionBootTruthfulness,
  buildSessionBootInstanceId,
  describeFileFreshness,
  summarizeRoadmapCollaborationState,
  summarizeTaskQueue,
} from "../utils/sessionBootTruth.js";

function writeFileWithAge(filePath: string, content: string, now: Date, ageMinutes: number): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  const modifiedAt = new Date(now.getTime() - (ageMinutes * 60000));
  fs.utimesSync(filePath, modifiedAt, modifiedAt);
}

describe("session boot truth helpers", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("builds neutral instance ids unless an agent family override is provided", () => {
    const now = new Date("2026-03-31T13:50:00.000Z");

    expect(buildSessionBootInstanceId({ machineName: "MARKV", pid: 7368, now }))
      .toBe(`prism@MARKV/pid-7368-${now.getTime()}`);
    expect(buildSessionBootInstanceId({ agentFamily: "Codex", machineName: "MARKV", pid: 42, now }))
      .toBe(`Codex@MARKV/pid-42-${now.getTime()}`);
  });

  it("parses shared roadmap and task queue summaries from markdown", () => {
    const freshness = {
      source: "test",
      exists: true,
      last_modified: "2026-03-31T13:42:45.779Z",
      age_minutes: 5,
      stale: false,
      stale_after_minutes: 120,
    };
    const roadmap = summarizeRoadmapCollaborationState(`
# Roadmap Collaboration State

## Collaboration Mode

- Mode: \`finish-current-delivery-first\`

## Current Gate

- ID: \`finish-current-backend-and-frontend-work-first\`
- Status: \`active\`
- Description: Finish the current backend and frontend work already in motion before opening a new large roadmap expansion pass.

## Current Delivery Priority

- Finish the current backend execution tranche.
- Finish the current frontend execution tranche.
`, freshness);
    const taskQueue = summarizeTaskQueue(`
# Task Queue

## 🔒 CLAIMED (1)

## 📋 AVAILABLE (2)

- **M-3-3-UX** (Codex, P20): Unified error handling + loading states [blocks: M-3-1-VERIFY]
- **SQ4-4-SVC** (any, P15): Customer service + portal hardening

## ⛔ BLOCKED (1)

## ✅ COMPLETED (35)

---
Total: 39 | Done: 35 | Active: 1 | Available: 2 | Blocked: 1
`, freshness);

    expect(roadmap.mode).toBe("finish-current-delivery-first");
    expect(roadmap.current_gate.id).toBe("finish-current-backend-and-frontend-work-first");
    expect(roadmap.delivery_priority).toContain("Finish the current backend execution tranche.");
    expect(taskQueue.counts.available).toBe(2);
    expect(taskQueue.available_preview[0]).toEqual({
      id: "M-3-3-UX",
      title: "Unified error handling + loading states",
    });
  });

  it("rewrites stale session boot fields to shared-state truth", () => {
    const now = new Date("2026-03-31T14:00:00.000Z");
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-session-boot-"));
    tempDirs.push(tempDir);

    const stateDir = path.join(tempDir, "state");
    const mcpRoot = path.join(tempDir, "mcp-server");

    writeFileWithAge(path.join(stateDir, "CURRENT_STATE.json"), "{\"quickResume\":\"legacy\"}", now, 24 * 60);
    writeFileWithAge(path.join(stateDir, "session_memory.json"), "{\"roadmap\":{}}", now, 3 * 24 * 60);
    writeFileWithAge(path.join(stateDir, "shared", "ROADMAP_COLLABORATION_STATE.md"), `
# Roadmap Collaboration State

## Collaboration Mode

- Mode: \`finish-current-delivery-first\`

## Current Gate

- ID: \`finish-current-backend-and-frontend-work-first\`
- Status: \`active\`
- Description: Finish the current backend and frontend work already in motion before opening a new large roadmap expansion pass.

## Current Delivery Priority

- Finish the current backend execution tranche.
- Keep the shared coordination surfaces up to date while work is in flight.
`, now, 10);
    writeFileWithAge(path.join(stateDir, "shared", "TASK_QUEUE.md"), `
# Task Queue

## 🔒 CLAIMED (1)

## 📋 AVAILABLE (1)

- **M-3-3-UX** (Codex, P20): Unified error handling + loading states [blocks: M-3-1-VERIFY]

## ⛔ BLOCKED (1)

## ✅ COMPLETED (35)

---
Total: 37 | Done: 35 | Active: 1 | Available: 1 | Blocked: 1
`, now, 12);
    writeFileWithAge(path.join(mcpRoot, "data", "docs", "gsd", "GSD_QUICK.md"), `
## SESSION LIFECYCLE
## 6 LAWS
## DECISION TREE
`, now, 10 * 24 * 60);

    const rewritten = applySessionBootTruthfulness({
      instance_id: "claude-7368-legacy",
      quick_resume: "No quick resume",
      session: "unknown",
      phase: "unknown",
      warm_start: {
        registry_status: { machines: 1177 },
        recent_errors: [
          { tool: "prism_calc", when: "2026-03-26T16:08:31.483Z" },
        ],
      },
      resume_detection: {
        scenario: "resume_fresh",
        confidence: 0.7,
        state_age_seconds: 400000,
        actions: ["Read CURRENT_STATE.json"],
      },
      key_memories: {
        categories: ["roadmap", "decisions"],
      },
      enhanced_startup: {
        phase: "unknown",
        _hint: "Readiness: undefined/100 (undefined)",
      },
    }, {
      stateDir,
      mcpRoot,
      now,
      machineName: "MARKV",
      pid: 7368,
    });

    expect(rewritten.instance_id).toBe(`prism@MARKV/pid-7368-${now.getTime()}`);
    expect(rewritten.quick_resume).toContain("Shared-state resume required");
    expect(rewritten.roadmap.source).toBe("shared_state");
    expect(rewritten.roadmap.gate.id).toBe("finish-current-backend-and-frontend-work-first");
    expect(rewritten.action_tracker.source).toBe("shared_state");
    expect(rewritten.warm_start.recent_errors).toEqual([]);
    expect(rewritten.warm_start.recent_errors_status).toBe("stale_suppressed");
    expect(rewritten.resume_detection.scenario).toBe("shared_state_resume");
    expect(rewritten.key_memories.status).toBe("stale_memory_snapshot");
    expect(rewritten.enhanced_startup.status).toBe("invalid_output");
    expect(rewritten.gsd_protocol.status).toBe("stale_summary");
    expect(rewritten.shared_state.task_queue.available_preview[0].id).toBe("M-3-3-UX");
    expect(rewritten.truthfulness.stale_local_fields_suppressed).toContain("CURRENT_STATE resume fields");
  });

  it("reports freshness for existing and missing files", () => {
    const now = new Date("2026-03-31T14:00:00.000Z");
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-session-boot-freshness-"));
    tempDirs.push(tempDir);
    const existingFile = path.join(tempDir, "CURRENT_STATE.json");
    writeFileWithAge(existingFile, "{}", now, 30);

    const existing = describeFileFreshness(existingFile, 60, now);
    const missing = describeFileFreshness(path.join(tempDir, "missing.json"), 60, now);

    expect(existing.exists).toBe(true);
    expect(existing.stale).toBe(false);
    expect(missing.exists).toBe(false);
    expect(missing.stale).toBe(true);
  });
});
