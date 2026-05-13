/**
 * goalCompleteGate.test.ts
 *
 * Tests for `.claude/hooks/goal-complete-gate.mjs` — the Stop hook that gates
 * Anthropic's built-in `/goal` slash command on close-out audit freshness +
 * candidate triage.
 *
 * Test surface: invoke the hook as a subprocess with crafted transcript +
 * audit fixtures. Assert the JSON decision shape that comes back on stdout.
 *
 * Coverage:
 *   - happy path: /goal NOT in transcript → approve
 *   - missing audit + /goal invoked → block
 *   - stale audit + /goal invoked → block
 *   - audit schema malformed (no results[]) + /goal invoked → block (schema lock)
 *   - audit with untriaged candidates + /goal invoked → block with punch list
 *   - audit with all candidates triaged via CLOSE-OUT-DEFERRED.md → approve
 *   - PRISM_GOAL_GATE_AUDIT_BYPASS=1 + untriaged → approve (logged)
 *   - PRISM_GOAL_GATE_DISABLE=1 → approve regardless
 *
 * Hook contract: emits a single JSON object on stdout with shape
 *   { decision: "approve" }       — gate clears, Stop chain continues
 *   { decision: "block", reason, systemMessage }  — Stop blocked
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const HOOK_PATH = path.resolve(__dirname, "../../../.claude/hooks/goal-complete-gate.mjs");
const REPO_ROOT = path.resolve(__dirname, "../../../");
const CANDIDATES_JSON = path.join(REPO_ROOT, "state/shared/CLOSE-OUT-CANDIDATES.json");
const DEFERRED_MD = path.join(REPO_ROOT, "state/shared/CLOSE-OUT-DEFERRED.md");
const BACKUP_SUFFIX = `.test-backup-${process.pid}-${Date.now()}`;

interface HookResponse {
  decision: "approve" | "block";
  reason?: string;
  systemMessage?: string;
}

function backupIfExists(target: string): string | null {
  if (fs.existsSync(target)) {
    const backup = target + BACKUP_SUFFIX;
    fs.renameSync(target, backup);
    return backup;
  }
  return null;
}

function restoreBackup(target: string, backup: string | null): void {
  // Always start by removing the test-written file (if any)
  if (fs.existsSync(target)) fs.unlinkSync(target);
  if (backup && fs.existsSync(backup)) fs.renameSync(backup, target);
}

function writeTranscript(content: string): string {
  const file = path.join(os.tmpdir(), `goal-gate-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  fs.writeFileSync(file, content);
  return file;
}

function invokeHook(opts: {
  transcriptPath?: string;
  env?: Record<string, string>;
} = {}): HookResponse {
  const event = JSON.stringify({ transcript_path: opts.transcriptPath || "" });
  const result = spawnSync(process.execPath, [HOOK_PATH], {
    input: event,
    encoding: "utf8",
    env: { ...process.env, ...(opts.env || {}) },
    timeout: 10000,
  });
  if (result.status !== 0 && result.status !== null) {
    throw new Error(`hook exited ${result.status}: ${result.stderr}`);
  }
  const out = result.stdout.trim();
  if (!out) throw new Error(`hook produced no output. stderr: ${result.stderr}`);
  return JSON.parse(out) as HookResponse;
}

describe("goal-complete-gate hook", () => {
  let candidatesBackup: string | null = null;
  let deferredBackup: string | null = null;
  const tempFiles: string[] = [];

  beforeEach(() => {
    candidatesBackup = backupIfExists(CANDIDATES_JSON);
    deferredBackup = backupIfExists(DEFERRED_MD);
  });

  afterEach(() => {
    restoreBackup(CANDIDATES_JSON, candidatesBackup);
    restoreBackup(DEFERRED_MD, deferredBackup);
    for (const f of tempFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* */ }
    }
    tempFiles.length = 0;
  });

  function newTranscript(content: string): string {
    const f = writeTranscript(content);
    tempFiles.push(f);
    return f;
  }

  function writeAudit(payload: object): void {
    fs.mkdirSync(path.dirname(CANDIDATES_JSON), { recursive: true });
    fs.writeFileSync(CANDIDATES_JSON, JSON.stringify(payload, null, 2));
  }

  function writeDeferred(content: string): void {
    fs.mkdirSync(path.dirname(DEFERRED_MD), { recursive: true });
    fs.writeFileSync(DEFERRED_MD, content);
  }

  it("approves when /goal not invoked (no transcript)", () => {
    const r = invokeHook();
    expect(r.decision).toBe("approve");
  });

  it("approves when /goal not invoked (transcript without /goal marker)", () => {
    const transcript = newTranscript(`{"role":"user","content":"hello"}\n{"role":"assistant","content":"hi"}\n`);
    const r = invokeHook({ transcriptPath: transcript });
    expect(r.decision).toBe("approve");
  });

  it("BLOCKS when /goal invoked but audit file is missing", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    // ensure no audit file
    if (fs.existsSync(CANDIDATES_JSON)) fs.unlinkSync(CANDIDATES_JSON);
    const r = invokeHook({ transcriptPath: transcript });
    expect(r.decision).toBe("block");
    expect(r.reason).toContain("audit report missing");
    expect(r.systemMessage).toContain("audit-close-out-candidates.mjs");
  });

  it("BLOCKS when /goal invoked + audit stale (>2h)", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    writeAudit({ schemaVersion: "1.0.0", results: [] });
    // Backdate mtime by 3 hours
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    fs.utimesSync(CANDIDATES_JSON, threeHoursAgo / 1000, threeHoursAgo / 1000);
    const r = invokeHook({ transcriptPath: transcript });
    expect(r.decision).toBe("block");
    expect(r.reason).toContain("stale");
  });

  it("BLOCKS when /goal invoked + audit schema malformed (no results[])", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    // Schema lock: write a JSON without the required `results` array
    writeAudit({ schemaVersion: "1.0.0", malformed: true } as any);
    const r = invokeHook({ transcriptPath: transcript });
    expect(r.decision).toBe("block");
    expect(r.reason).toMatch(/audit unreadable|missing required/);
  });

  it("BLOCKS when /goal invoked + fresh audit + untriaged candidates", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    writeAudit({
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      results: [{ milestone: "TEST-MS", candidates: [
        { unit_id: "U-TEST-UNTRIAGED-XYZ", title: "test", confidence: 1.0 },
      ]}],
    });
    // No deferred file → unit is untriaged
    if (fs.existsSync(DEFERRED_MD)) fs.unlinkSync(DEFERRED_MD);
    const r = invokeHook({ transcriptPath: transcript });
    expect(r.decision).toBe("block");
    expect(r.reason).toContain("untriaged");
    expect(r.systemMessage).toContain("U-TEST-UNTRIAGED-XYZ");
  });

  it("APPROVES when /goal invoked + audit candidates triaged via CLOSE-OUT-DEFERRED.md", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    writeAudit({
      schemaVersion: "1.0.0",
      results: [{ milestone: "TEST-MS", candidates: [
        { unit_id: "U-TEST-DEFERRED-ABC", title: "test", confidence: 1.0 },
      ]}],
    });
    writeDeferred("U-TEST-DEFERRED-ABC | tester | 2026-05-13 | defer-to-followup: test-only entry");
    const r = invokeHook({ transcriptPath: transcript });
    expect(r.decision).toBe("approve");
  });

  it("APPROVES when /goal invoked + audit fresh + zero candidates", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    writeAudit({ schemaVersion: "1.0.0", results: [] });
    const r = invokeHook({ transcriptPath: transcript });
    expect(r.decision).toBe("approve");
  });

  it("APPROVES via PRISM_GOAL_GATE_AUDIT_BYPASS=1 even with untriaged candidates", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    writeAudit({
      schemaVersion: "1.0.0",
      results: [{ milestone: "TEST-MS", candidates: [
        { unit_id: "U-TEST-BYPASS-XYZ", title: "test", confidence: 1.0 },
      ]}],
    });
    const r = invokeHook({ transcriptPath: transcript, env: { PRISM_GOAL_GATE_AUDIT_BYPASS: "1" } });
    expect(r.decision).toBe("approve");
  });

  it("APPROVES via PRISM_GOAL_GATE_DISABLE=1 regardless of /goal state", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    // No audit at all — would normally block
    if (fs.existsSync(CANDIDATES_JSON)) fs.unlinkSync(CANDIDATES_JSON);
    const r = invokeHook({ transcriptPath: transcript, env: { PRISM_GOAL_GATE_DISABLE: "1" } });
    expect(r.decision).toBe("approve");
  });

  it("honors PRISM_GOAL_GATE_STALE_HRS=N for stale threshold tuning", () => {
    const transcript = newTranscript(`<command-name>/goal</command-name>\n`);
    writeAudit({ schemaVersion: "1.0.0", results: [] });
    // Backdate by 1h
    const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;
    fs.utimesSync(CANDIDATES_JSON, oneHourAgo / 1000, oneHourAgo / 1000);
    // With threshold 0.5h → should block; with default 2h → should approve
    const rTight = invokeHook({ transcriptPath: transcript, env: { PRISM_GOAL_GATE_STALE_HRS: "0.5" } });
    expect(rTight.decision).toBe("block");
    expect(rTight.reason).toContain("stale");
    const rLoose = invokeHook({ transcriptPath: transcript, env: { PRISM_GOAL_GATE_STALE_HRS: "2" } });
    expect(rLoose.decision).toBe("approve");
  });
});
