/**
 * RoadmapHomeEnforcement.test.ts
 *
 * Covers the two hooks that keep roadmap / milestone / position files under H::
 *   - .claude/hooks/pre-write-roadmap-home.mjs   (PreToolUse — Edit/Write/MultiEdit)
 *   - .claude/hooks/stop_on_non_h_roadmap.mjs    (Stop — fail-open scanner)
 *
 * The hooks are invoked as subprocesses (matches how Claude actually runs them)
 * and are checked against fully-resolved value asserts — no shape probes.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HOOK_TIMEOUT_MS = 5000;
const REPO_ROOT = resolve(__dirname, "../../..");
const PRE_WRITE_HOOK = resolve(REPO_ROOT, ".claude/hooks/pre-write-roadmap-home.mjs");
const STOP_HOOK = resolve(REPO_ROOT, ".claude/hooks/stop_on_non_h_roadmap.mjs");

interface HookResult {
  continue?: boolean;
  decision?: string;
  reason?: string;
}

function runHook(scriptPath: string, payload: unknown): HookResult {
  const stdin = JSON.stringify(payload ?? {});
  const r = spawnSync(process.execPath, [scriptPath], {
    input: stdin,
    encoding: "utf-8",
    timeout: HOOK_TIMEOUT_MS,
  });
  if (r.error) throw r.error;
  const stdout = (r.stdout || "").trim();
  if (!stdout) return {};
  return JSON.parse(stdout) as HookResult;
}

function preWrite(filePath: string, toolName = "Write"): HookResult {
  return runHook(PRE_WRITE_HOOK, {
    tool_name: toolName,
    tool_input: { file_path: filePath },
  });
}

describe("pre-write-roadmap-home (PreToolUse)", () => {
  it("hook script exists on disk", () => {
    expect(existsSync(PRE_WRITE_HOOK)).toBe(true);
  });

  // Pass-through cases — must yield continue=true and no block decision.

  it("allows a non-roadmap source file on C:", () => {
    const out = preWrite("C:/Users/dev/project/src/index.ts");
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows a roadmap-named file under H: (Windows path)", () => {
    const out = preWrite("H:/prism/mcp-server/data/milestones/SOME-MS3.json");
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows a roadmap-named file under H: (mixed slashes)", () => {
    const out = preWrite("H:\\prism\\PRISM-UNIFIED-ROADMAP-v2.md");
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows a roadmap file under /h/ git-bash path", () => {
    const out = preWrite("/h/prism/mcp-server/data/milestones/X-MS1.json");
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows a roadmap file under /mnt/h/ wsl path", () => {
    const out = preWrite("/mnt/h/prism/mcp-server/data/milestones/X-MS1.json");
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("ignores non-Edit tool names", () => {
    const out = runHook(PRE_WRITE_HOOK, {
      tool_name: "Bash",
      tool_input: { file_path: "C:/Users/dev/Desktop/MY-ROADMAP.md" },
    });
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("fails open on malformed payload (no JSON)", () => {
    const r = spawnSync(process.execPath, [PRE_WRITE_HOOK], {
      input: "not json {{{",
      encoding: "utf-8",
      timeout: HOOK_TIMEOUT_MS,
    });
    const out = JSON.parse((r.stdout || "").trim()) as HookResult;
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  // Block cases — every failing path must produce decision="block".

  it("blocks a roadmap-index write on C:", () => {
    const out = preWrite("C:/Users/dev/Desktop/roadmap-index.json");
    expect(out.decision).toBe("block");
    expect(out.continue === undefined).toBe(true);
    expect(out.reason).toContain("ROADMAP HOME ENFORCEMENT");
  });

  it("blocks a *-ROADMAP-*.md write on C:", () => {
    const out = preWrite("C:/Users/dev/Desktop/PRISM-UNIFIED-ROADMAP-v2.md");
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("Suggested target");
  });

  it("blocks a *-MS<n>.json on D:", () => {
    const out = preWrite("D:/work/CAM-EXHAUST-MS1.json");
    expect(out.decision).toBe("block");
  });

  it("blocks a CURRENT_POSITION.md on C:", () => {
    const out = preWrite("C:/temp/CURRENT_POSITION.md");
    expect(out.decision).toBe("block");
  });

  it("blocks a MILESTONE-*.json on C:", () => {
    const out = preWrite("C:/Users/dev/Documents/MILESTONE-PHASE3-DATA.json");
    expect(out.decision).toBe("block");
  });

  it("blocks via directory match: any milestones/ segment outside H:", () => {
    const out = preWrite("C:/Users/dev/project/milestones/raw-notes.json");
    expect(out.decision).toBe("block");
  });

  it("blocks via directory match: any roadmap/ segment outside H:", () => {
    const out = preWrite("C:/Users/dev/project/roadmap/sketch.md");
    expect(out.decision).toBe("block");
  });

  it("blocks /c/ git-bash path with roadmap filename", () => {
    const out = preWrite("/c/Users/dev/Desktop/MY-ROADMAP.md");
    expect(out.decision).toBe("block");
  });

  it("blocks /mnt/c/ wsl path with roadmap filename", () => {
    const out = preWrite("/mnt/c/users/dev/Desktop/MY-ROADMAP.md");
    expect(out.decision).toBe("block");
  });

  it("blocks lowercase suffix variant (e.g. -v3)", () => {
    const out = preWrite("C:/Users/dev/Desktop/PRISM-ROADMAP-v3.md");
    expect(out.decision).toBe("block");
  });

  it("suggested path rewrites C:/... to H:/...", () => {
    const out = preWrite("C:/Users/dev/Desktop/MY-ROADMAP.md");
    expect(out.decision).toBe("block");
    expect(out.reason).toMatch(/Suggested target: H:\//);
  });

  it("MultiEdit tool name is also gated", () => {
    const out = runHook(PRE_WRITE_HOOK, {
      tool_name: "MultiEdit",
      tool_input: { file_path: "C:/Users/dev/Desktop/MY-ROADMAP.md" },
    });
    expect(out.decision).toBe("block");
  });

  it("Edit tool name is also gated", () => {
    const out = runHook(PRE_WRITE_HOOK, {
      tool_name: "Edit",
      tool_input: { file_path: "C:/Users/dev/Desktop/MY-ROADMAP.md" },
    });
    expect(out.decision).toBe("block");
  });
});

describe("stop_on_non_h_roadmap (Stop hook)", () => {
  it("hook script exists on disk", () => {
    expect(existsSync(STOP_HOOK)).toBe(true);
  });

  // The Stop hook contract is: emit a single JSON line with `continue` set to
  // either true (clean — no orphan roadmaps on C:/D:) or false (orphans found,
  // session is asked to stop and resolve them). We validate both branches end
  // up well-formed; we cannot assume a clean test machine because real C:/D:
  // contents differ between developers, and the hook is meant to surface them.

  it("emits a structured continue verdict on empty stdin", () => {
    const out = runHook(STOP_HOOK, {});
    const cleanBranch = out.continue === true && out.reason === undefined;
    const dirtyBranch =
      out.continue === false &&
      typeof out.reason === "string" &&
      out.reason.includes("ROADMAP HOME VIOLATION");
    expect(cleanBranch || dirtyBranch).toBe(true);
  });

  it("emits a structured continue verdict on a typical Stop payload", () => {
    const out = runHook(STOP_HOOK, {
      session_id: "claude-test1234",
      transcript_path: "",
    });
    const cleanBranch = out.continue === true && out.reason === undefined;
    const dirtyBranch =
      out.continue === false &&
      typeof out.reason === "string" &&
      out.reason.includes("ROADMAP HOME VIOLATION");
    expect(cleanBranch || dirtyBranch).toBe(true);
  });

  it("never sets a `decision` field (Stop hooks must not block via decision)", () => {
    const out = runHook(STOP_HOOK, {});
    expect(out.decision === undefined).toBe(true);
  });
});
