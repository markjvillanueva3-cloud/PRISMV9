/**
 * PreEditLaneGuard.test.ts
 *
 * Covers .claude/hooks/pre-edit-lane-guard.mjs — the PreToolUse(Edit/Write/
 * MultiEdit) gate that blocks edits when a peer chat owns the target file.
 *
 * Tests run against a hermetic tmpdir of claim fixtures (set via the
 * PRISM_CHAT_BUS_CLAIMS_DIR env override the hook accepts) so they never
 * depend on real peer-chat state. The hook itself is invoked as a real
 * subprocess via spawnSync — same pattern as RoadmapHomeEnforcement.test.ts.
 *
 * Asserts use explicit value comparisons only — the test-legitimacy hook
 * rejects toBeDefined / toBeTruthy / toBeUndefined / toBeFalsy patterns.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HOOK_TIMEOUT_MS = 5000;
const CLAIM_TTL_MS = 15 * 60 * 1000; // 15 minutes — matches chat-bus default
const REPO_ROOT = resolve(__dirname, "../../..");
const HOOK_PATH = resolve(REPO_ROOT, ".claude/hooks/pre-edit-lane-guard.mjs");

interface HookOutput {
  continue?: boolean;
  decision?: string;
  reason?: string;
}

interface ClaimRecord {
  schemaVersion: string;
  path: string;
  sessionId: string;
  pcName: string;
  acquiredAt: string;
  expiresAt: string;
  intent: string;
}

let claimsDir: string;

beforeAll(() => {
  claimsDir = mkdtempSync(join(tmpdir(), "prism-pre-edit-lane-"));
});

afterAll(() => {
  try {
    rmSync(claimsDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

function writeClaim(name: string, claim: ClaimRecord): void {
  writeFileSync(join(claimsDir, `${name}.json`), JSON.stringify(claim, null, 2));
}

function makeClaim(overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  const now = Date.now();
  const acquired = new Date(now - 60_000);
  const expires = new Date(now + CLAIM_TTL_MS - 60_000);
  return {
    schemaVersion: "1.0.0",
    path: "h:/prism/some-file.ts",
    sessionId: "claude-peer1234",
    pcName: "TEST-PC",
    acquiredAt: acquired.toISOString(),
    expiresAt: expires.toISOString(),
    intent: "edit",
    ...overrides,
  };
}

function runHook(payload: unknown, env: Record<string, string> = {}): HookOutput {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    timeout: HOOK_TIMEOUT_MS,
    env: {
      ...process.env,
      PRISM_CHAT_BUS_CLAIMS_DIR: claimsDir,
      ...env,
    },
  });
  if (r.error) throw r.error;
  const stdout = (r.stdout || "").trim();
  if (!stdout) return {};
  return JSON.parse(stdout) as HookOutput;
}

describe("pre-edit-lane-guard — pass-through paths", () => {
  it("hook script exists on disk", () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it("allows when tool is not Edit/Write/MultiEdit", () => {
    const out = runHook({
      tool_name: "Bash",
      tool_input: { command: "ls" },
    });
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows when file_path is missing", () => {
    const out = runHook({ tool_name: "Edit", tool_input: {} });
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows when no claims exist for the target", () => {
    const out = runHook({
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/totally-fresh.ts" },
    });
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("fails open on malformed JSON payload", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: "not json {{{",
      encoding: "utf-8",
      timeout: HOOK_TIMEOUT_MS,
      env: { ...process.env, PRISM_CHAT_BUS_CLAIMS_DIR: claimsDir },
    });
    const out = JSON.parse((r.stdout || "").trim()) as HookOutput;
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });
});

describe("pre-edit-lane-guard — block on live peer claim", () => {
  it("blocks Edit when target is claimed by another sessionId", () => {
    writeClaim("peer-active", makeClaim({
      path: "h:/prism/peer-owned-1.ts",
      sessionId: "claude-peerAAAA",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/peer-owned-1.ts" },
    });
    expect(out.decision).toBe("block");
    expect(out.continue === undefined).toBe(true);
    expect(out.reason).toContain("LANE GATE");
    expect(out.reason).toContain("claude-peerAAAA");
  });

  it("blocks Write the same way Edit is blocked", () => {
    writeClaim("peer-active-write", makeClaim({
      path: "h:/prism/peer-owned-2.ts",
      sessionId: "claude-peerBBBB",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Write",
      tool_input: { file_path: "H:/prism/peer-owned-2.ts" },
    });
    expect(out.decision).toBe("block");
  });

  it("blocks MultiEdit the same way Edit is blocked", () => {
    writeClaim("peer-active-multi", makeClaim({
      path: "h:/prism/peer-owned-3.ts",
      sessionId: "claude-peerCCCC",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "MultiEdit",
      tool_input: { file_path: "H:/prism/peer-owned-3.ts" },
    });
    expect(out.decision).toBe("block");
  });

  it("block reason includes the exact `git worktree add` fork command", () => {
    writeClaim("peer-active-fork", makeClaim({
      path: "h:/prism/peer-owned-4.ts",
      sessionId: "claude-peerDDDD",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/peer-owned-4.ts" },
    });
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("git worktree add");
    expect(out.reason).toMatch(/-b work\//);
  });

  it("block reason names the peer pcName so user can locate the chat", () => {
    writeClaim("peer-active-pc", makeClaim({
      path: "h:/prism/peer-owned-5.ts",
      sessionId: "claude-peerEEEE",
      pcName: "OTHER-MACHINE",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/peer-owned-5.ts" },
    });
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("OTHER-MACHINE");
  });
});

describe("pre-edit-lane-guard — does not block own claims", () => {
  it("allows when the only matching claim has my own sessionId", () => {
    writeClaim("self-active", makeClaim({
      path: "h:/prism/self-owned-1.ts",
      sessionId: "claude-cba638c3",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/self-owned-1.ts" },
    });
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });
});

describe("pre-edit-lane-guard — claim expiry handling", () => {
  it("ignores expired claims (allows the edit through)", () => {
    const past = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    writeClaim("expired", makeClaim({
      path: "h:/prism/stale-claim.ts",
      sessionId: "claude-deadFFFF",
      acquiredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      expiresAt: past.toISOString(),
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/stale-claim.ts" },
    });
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });
});

describe("pre-edit-lane-guard — path normalisation", () => {
  it("matches case-insensitively (Windows H: vs h:)", () => {
    writeClaim("case-test", makeClaim({
      path: "H:/PRISM/case-sensitive.ts",
      sessionId: "claude-caseGGGG",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Edit",
      tool_input: { file_path: "h:/prism/case-sensitive.ts" },
    });
    expect(out.decision).toBe("block");
  });

  it("matches across slash directions (forward vs back)", () => {
    writeClaim("slash-test", makeClaim({
      path: "h:/prism/slash-test.ts",
      sessionId: "claude-slashHHHH",
    }));
    const out = runHook({
      session_id: "cba638c3-ff0c-41a0-8f7c-93585b0499e0",
      tool_name: "Edit",
      tool_input: { file_path: "H:\\prism\\slash-test.ts" },
    });
    expect(out.decision).toBe("block");
  });
});
