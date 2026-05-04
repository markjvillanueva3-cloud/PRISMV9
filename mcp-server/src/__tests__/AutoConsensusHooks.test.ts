/**
 * Auto-fire consensus hooks — UserPromptSubmit + PreToolUse-critical-edit.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
 *
 * Tests run the hooks as subprocesses (just like the harness does) and
 * assert on the JSON they emit to stdout. Real fs against temp dirs.
 * No mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { consensusObsidianPersistenceEngine, type ConsensusResultLike } from "../engines/ConsensusObsidianPersistenceEngine.js";

const HOOK_USERPROMPT = "H:/prism-iooms0/.claude/hooks/auto-consensus-userprompt.mjs";
const HOOK_CRITEDIT = "H:/prism-iooms0/.claude/hooks/auto-consensus-critical-edit.mjs";
const NODE_BIN = process.execPath;

let tmpRoot: string;
let queuePath: string;

function fakeResult(rec: "accept" | "review" | "escalate" = "accept"): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: true, answer: "Use a hashmap.", latencyMs: 1000, tokens: 30, error: null },
    ],
    successCount: 1,
    agreementScore: 0.9,
    consensus: { answer: "Use a hashmap.", voters: ["gpt-5.5"], confidence: 0.9 },
    recommendation: rec,
    totalLatencyMs: 3000,
    factCheck: {},
  };
}

function runHook(hookPath: string, stdinJson: object): { stdout: string; stderr: string; status: number | null; parsed: { continue?: boolean; hookSpecificOutput?: { hookEventName?: string; additionalContext?: string; permissionDecision?: string; permissionDecisionReason?: string } } | null } {
  const proc = spawnSync(NODE_BIN, [hookPath], {
    input: JSON.stringify(stdinJson),
    encoding: "utf-8",
    env: {
      ...process.env,
      PRISM_WIKI_ROOT: tmpRoot,
      PRISM_CONSENSUS_QUEUE: queuePath,
    },
    timeout: 5000,
  });
  let parsed = null;
  try { parsed = JSON.parse(proc.stdout); } catch { /* leave null */ }
  return { stdout: proc.stdout, stderr: proc.stderr, status: proc.status, parsed };
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hooks-test-"));
  queuePath = path.join(tmpRoot, "consensus-queue.jsonl");
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("auto-consensus-userprompt — opt-out + intent gating", () => {
  it("returns empty additionalContext on prompt below MIN_PROMPT_LEN", () => {
    const r = runHook(HOOK_USERPROMPT, { prompt: "hi", session_id: "s1" });
    expect(r.status).toBe(0);
    expect(r.parsed?.continue).toBe(true);
    expect(r.parsed?.hookSpecificOutput?.additionalContext).toBe("");
  });

  it("returns empty on opt-out token [no-consensus]", () => {
    const r = runHook(HOOK_USERPROMPT, {
      prompt: "Please refactor the module [no-consensus] for me",
      session_id: "s1",
    });
    expect(r.parsed?.hookSpecificOutput?.additionalContext).toBe("");
  });

  it("returns empty on prompt without dev-intent keywords", () => {
    const r = runHook(HOOK_USERPROMPT, {
      prompt: "What is the weather like today in San Francisco",
      session_id: "s1",
    });
    expect(r.parsed?.hookSpecificOutput?.additionalContext).toBe("");
  });

  it("hookEventName is 'UserPromptSubmit' when responding", () => {
    const r = runHook(HOOK_USERPROMPT, {
      prompt: "Should we refactor the dispatcher to use a hashmap?",
      session_id: "s1",
    });
    expect(r.parsed?.hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
  });
});

describe("auto-consensus-userprompt — cache-first recall", () => {
  it("surfaces cached answer when artifact exists", () => {
    const PROMPT = "Should we refactor the dispatcher to use a hashmap or a btree?";
    consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      taskType: "decide",
      sourceSession: "previous",
      result: fakeResult("accept"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });

    const r = runHook(HOOK_USERPROMPT, { prompt: PROMPT, session_id: "current" });
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("Consensus cache hit");
    expect(ctx).toContain("recommendation: `accept`");
    expect(ctx).toContain("Use a hashmap.");
  });

  it("queues prompt when no cache hit", () => {
    const r = runHook(HOOK_USERPROMPT, {
      prompt: "Should we refactor X to use Y for performance?",
      session_id: "s1",
    });
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("Consensus queued");
    expect(fs.existsSync(queuePath)).toBe(true);
    const queueRaw = fs.readFileSync(queuePath, "utf-8");
    expect(queueRaw.split("\n").filter((l) => l.length > 0)).toHaveLength(1);
    const entry = JSON.parse(queueRaw.split("\n")[0]);
    expect(entry.task_type).toBe("auto-userprompt");
    expect(entry.session_id).toBe("s1");
  });

  it("respects PRISM_WIKI_ROOT override", () => {
    const PROMPT = "build a new test suite for the recall caching engine";
    consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = runHook(HOOK_USERPROMPT, { prompt: PROMPT, session_id: "s1" });
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("cache hit");
  });
});

describe("auto-consensus-critical-edit — file classifier", () => {
  it("allows non-critical files without queue/notice", () => {
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism-iooms0/mcp-server/src/utils/Logger.ts",
        old_string: "old",
        new_string: "new",
      },
    });
    expect(r.parsed?.hookSpecificOutput?.permissionDecision).toBe("allow");
    expect(r.parsed?.hookSpecificOutput?.permissionDecisionReason).toBe("");
  });

  it("allows non-Edit/Write tools (e.g. Read)", () => {
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Read",
      tool_input: { file_path: "H:/prism/mcp-server/src/physics/constants.ts" },
    });
    expect(r.parsed?.hookSpecificOutput?.permissionDecision).toBe("allow");
    expect(r.parsed?.hookSpecificOutput?.permissionDecisionReason).toBe("");
  });

  it("queues consensus for critical-file edits without cache", () => {
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/physics/constants.ts",
        old_string: "kc1.1=1800",
        new_string: "kc1.1=1900",
      },
    });
    expect(r.parsed?.hookSpecificOutput?.permissionDecision).toBe("allow");
    const reason = r.parsed?.hookSpecificOutput?.permissionDecisionReason ?? "";
    expect(reason).toContain("no consensus cache");
    expect(reason).toContain("constants.ts");
    expect(fs.existsSync(queuePath)).toBe(true);
    const entry = JSON.parse(fs.readFileSync(queuePath, "utf-8").split("\n")[0]);
    expect(entry.task_type).toBe("auto-critical-edit");
    expect(entry.tool).toBe("Edit");
  });

  it("recognizes dispatcher files as critical", () => {
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Edit",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/tools/dispatchers/safetyDispatcher.ts",
        old_string: "validate_physics",
        new_string: "validate_physics_v2",
      },
    });
    const reason = r.parsed?.hookSpecificOutput?.permissionDecisionReason ?? "";
    expect(reason.length).toBeGreaterThan(0); // non-empty means it was classified critical
  });

  it("recognizes Kienzle/Taylor engine files as critical", () => {
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Write",
      tool_input: {
        file_path: "H:/prism/mcp-server/src/engines/KienzleForceEngine.ts",
        content: "new content",
      },
    });
    const reason = r.parsed?.hookSpecificOutput?.permissionDecisionReason ?? "";
    expect(reason.length).toBeGreaterThan(0);
  });
});

describe("auto-consensus-critical-edit — cache hit drives ask vs allow", () => {
  it("ESCALATE recommendation on cache → permissionDecision=ask", () => {
    const FILE = "H:/prism/mcp-server/src/physics/constants.ts";
    const oldStr = "old code";
    const newStr = "new code";
    const composed = `Critical-file edit review for ${FILE} via Edit\n\nOLD:\n${oldStr}\n\nNEW:\n${newStr}`;
    consensusObsidianPersistenceEngine.persist({
      prompt: composed,
      taskType: "auto-critical-edit",
      result: fakeResult("escalate"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Edit",
      tool_input: { file_path: FILE, old_string: oldStr, new_string: newStr },
    });
    expect(r.parsed?.hookSpecificOutput?.permissionDecision).toBe("ask");
    const reason = r.parsed?.hookSpecificOutput?.permissionDecisionReason ?? "";
    expect(reason).toContain("ESCALATE");
  });

  it("ACCEPT recommendation on cache → permissionDecision=allow with reason", () => {
    const FILE = "H:/prism/mcp-server/src/physics/constants.ts";
    const oldStr = "kc=1800";
    const newStr = "kc=1850";
    const composed = `Critical-file edit review for ${FILE} via Edit\n\nOLD:\n${oldStr}\n\nNEW:\n${newStr}`;
    consensusObsidianPersistenceEngine.persist({
      prompt: composed,
      result: fakeResult("accept"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Edit",
      tool_input: { file_path: FILE, old_string: oldStr, new_string: newStr },
    });
    expect(r.parsed?.hookSpecificOutput?.permissionDecision).toBe("allow");
    const reason = r.parsed?.hookSpecificOutput?.permissionDecisionReason ?? "";
    expect(reason).toContain("cache hit");
    expect(reason).toContain("accept");
  });

  it("REVIEW recommendation on cache → permissionDecision=allow", () => {
    const FILE = "H:/prism/mcp-server/src/engines/SafetyValidatorEngine.ts";
    const oldStr = "old";
    const newStr = "new";
    const composed = `Critical-file edit review for ${FILE} via Edit\n\nOLD:\n${oldStr}\n\nNEW:\n${newStr}`;
    consensusObsidianPersistenceEngine.persist({
      prompt: composed,
      result: fakeResult("review"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = runHook(HOOK_CRITEDIT, {
      tool_name: "Edit",
      tool_input: { file_path: FILE, old_string: oldStr, new_string: newStr },
    });
    expect(r.parsed?.hookSpecificOutput?.permissionDecision).toBe("allow");
    expect(r.parsed?.hookSpecificOutput?.permissionDecisionReason).toContain("review");
  });
});

describe("auto-consensus hooks — failure-mode robustness", () => {
  it("userprompt hook never throws on malformed stdin", () => {
    const proc = spawnSync(NODE_BIN, [HOOK_USERPROMPT], {
      input: "{not json",
      encoding: "utf-8",
      env: { ...process.env, PRISM_WIKI_ROOT: tmpRoot, PRISM_CONSENSUS_QUEUE: queuePath },
      timeout: 5000,
    });
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout);
    expect(parsed.continue).toBe(true);
  });

  it("crit-edit hook never throws on missing tool_input", () => {
    const r = runHook(HOOK_CRITEDIT, { tool_name: "Edit" });
    expect(r.status).toBe(0);
    expect(r.parsed?.continue).toBe(true);
    expect(r.parsed?.hookSpecificOutput?.permissionDecision).toBe("allow");
  });

  it("userprompt hook never throws on empty stdin", () => {
    const proc = spawnSync(NODE_BIN, [HOOK_USERPROMPT], {
      input: "",
      encoding: "utf-8",
      env: { ...process.env, PRISM_WIKI_ROOT: tmpRoot, PRISM_CONSENSUS_QUEUE: queuePath },
      timeout: 5000,
    });
    expect(proc.status).toBe(0);
  });
});
