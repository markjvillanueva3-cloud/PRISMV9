/**
 * psk-syscalls.test.ts — COMMAND-KERNEL-MS0 / U-CK03 acceptance contracts
 *
 * Exit conditions from the milestone envelope:
 *   - psk handoff read|write delegates to per-agent-handoff.mjs unchanged
 *   - psk checkin runs the chat-slots reclaim+claim+drift+commit-hygiene flow in one call
 *   - psk pick delegates to pick-unit.mjs (passes flags through)
 *
 * Tests assert delegation (no helper reimplementation) by:
 *   1. Reading the source and verifying it spawns the helper scripts
 *      (vs copying their internal logic).
 *   2. Live-dispatching each syscall and verifying the returned shape
 *      matches what the helper actually emits — concrete-value asserts.
 *   3. Exercising the new `composite` subcommand + TodoWrite absorption
 *      by reading the resulting on-disk artifacts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REPO_ROOT = "H:/prism";
const PSK_PATH = path.join(REPO_ROOT, ".claude", "kernel", "psk.mjs");
const HANDOFF_HELPER = path.join(REPO_ROOT, ".claude", "helpers", "per-agent-handoff.mjs");
const SLOTS_HELPER = path.join(REPO_ROOT, ".claude", "helpers", "chat-slots.mjs");
const PICK_SCRIPT = path.join(REPO_ROOT, "scripts", "pick-unit.mjs");
const DRIFT_SCRIPT = path.join(REPO_ROOT, "scripts", "audit-roadmap-drift.mjs");

// Live psk module — imported in beforeAll, NOT at top level. A top-level
// `await import` is a top-level await, which this repo's vitest transform
// rejects with "Invalid or unexpected token" (0 tests run). The working
// U-CK01/U-CK02 psk tests (psk.test.ts, psk-whoami.test.ts) both import
// inside beforeAll — match that pattern. pathToFileURL() produces a valid
// file:///H:/... URL (a hand-built `file://${winPath}` parses the drive
// letter as a URL hostname, which vite's resolver rejects).
let psk: typeof import("../../../.claude/kernel/psk.mjs");
beforeAll(async () => {
  psk = await import(pathToFileURL(PSK_PATH).href);
});

// ──────────────────────────────────────────────────────────────────────────
// A. Source-level delegation contract — no helper logic reimplemented.
// ──────────────────────────────────────────────────────────────────────────
describe("U-CK03 delegation contract — source-level", () => {
  const source = fs.readFileSync(PSK_PATH, "utf8");

  it("syscall_handoff invokes per-agent-handoff.mjs (does not reimplement)", () => {
    expect(source).toMatch(/syscall_handoff[\s\S]{0,3000}per-agent-handoff\.mjs/);
    // Negative: no internal handoff-file path construction.
    // Per-agent-handoff.mjs owns state/shared/handoffs/HANDOFF-<id>.md path math.
    expect(source).not.toMatch(/HANDOFF-\$\{.*\}\.md/);
  });

  it("syscall_checkin invokes chat-slots.mjs (does not reimplement)", () => {
    expect(source).toMatch(/syscall_checkin[\s\S]{0,4000}chat-slots\.mjs/);
    // Negative: no slot-rename / heartbeat-write logic inline.
    expect(source).not.toMatch(/"lastHeartbeat":\s*new Date/);
  });

  it("syscall_pick invokes pick-unit.mjs (does not reimplement)", () => {
    expect(source).toMatch(/syscall_pick[\s\S]{0,2000}pick-unit\.mjs/);
    // Negative: no roadmap-priority sort code inline.
    expect(source).not.toMatch(/roadmap_priority[\s\S]{0,200}\.sort\(/);
  });

  it("the three helper scripts exist on disk (delegation targets resolvable)", () => {
    expect(fs.existsSync(HANDOFF_HELPER)).toBe(true);
    expect(fs.existsSync(SLOTS_HELPER)).toBe(true);
    expect(fs.existsSync(PICK_SCRIPT)).toBe(true);
  });

  it("composite checkin path references the drift script", () => {
    expect(source).toMatch(/audit-roadmap-drift\.mjs/);
    expect(fs.existsSync(DRIFT_SCRIPT)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// B. formatTasksBlock — pure, exported, fully bounded.
// ──────────────────────────────────────────────────────────────────────────
describe("formatTasksBlock pure contract (U-TODOWRITE-HANDOFF-BRIDGE absorption)", () => {
  it("returns empty string for empty array", () => {
    expect(psk.formatTasksBlock([])).toBe("");
  });

  it("returns empty string for null input", () => {
    expect(psk.formatTasksBlock(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(psk.formatTasksBlock(undefined)).toBe("");
  });

  it("returns empty string for non-array input (string)", () => {
    expect(psk.formatTasksBlock("not an array" as unknown as unknown[])).toBe("");
  });

  it("emits a snapshot marker + one bullet per task with correct status glyphs", () => {
    const out = psk.formatTasksBlock([
      { subject: "Task A", status: "pending" },
      { subject: "Task B", status: "in_progress" },
      { subject: "Task C", status: "completed" },
    ]);
    expect(out).toContain("## Open tasks (TodoWrite snapshot)");
    expect(out).toMatch(/- \[ \] pending: Task A/);
    expect(out).toMatch(/- \[~\] in_progress: Task B/);
    expect(out).toMatch(/- \[x\] completed: Task C/);
  });

  it("accepts {title} as an alias for {subject}", () => {
    const out = psk.formatTasksBlock([{ title: "Aliased", status: "pending" }]);
    expect(out).toContain("- [ ] pending: Aliased");
  });

  it("defaults unknown status to 'pending' (safety — no enum injection)", () => {
    const out = psk.formatTasksBlock([
      { subject: "Spoofed", status: "MAGIC_STATUS" as unknown as string },
    ]);
    expect(out).toMatch(/- \[ \] pending: Spoofed/);
    expect(out).not.toContain("MAGIC_STATUS");
  });

  it("sanitizes embedded newlines (prevents breaking the list item)", () => {
    const out = psk.formatTasksBlock([
      { subject: "line1\nline2\nline3", status: "pending" },
    ]);
    expect(out).toMatch(/- \[ \] pending: line1 line2 line3/);
    // No bare newlines mid-subject would mean the list item splits.
    expect(out.split("\n").filter((ln) => ln.startsWith("- ")).length).toBe(1);
  });

  it("caps subject at 256 chars — bullet line content matches /x{256}/", () => {
    const longSubject = "x".repeat(1000);
    const out = psk.formatTasksBlock([{ subject: longSubject, status: "pending" }]);
    const bulletLine = out.split("\n").find((ln) => ln.startsWith("- "));
    // Concrete check: the bullet MUST contain exactly 256 'x' chars (not 1000, not 0).
    expect(bulletLine).toBe("- [ ] pending: " + "x".repeat(256));
  });

  it("caps array length at 50 + emits truncation footer with exact omitted count", () => {
    const many = Array.from({ length: 70 }, (_, i) => ({
      subject: `T${i}`,
      status: "pending" as const,
    }));
    const out = psk.formatTasksBlock(many);
    const bullets = out.split("\n").filter((ln) => /^- \[/.test(ln));
    expect(bullets.length).toBe(50);
    expect(out).toContain("- (truncated: 20 more tasks omitted)");
    // First & last surviving bullets are deterministic.
    expect(bullets[0]).toBe("- [ ] pending: T0");
    expect(bullets[49]).toBe("- [ ] pending: T49");
  });

  it("drops items with empty/missing subject silently (returns '' when all dropped)", () => {
    const out = psk.formatTasksBlock([
      { status: "pending" },
      { subject: "", status: "pending" },
      { subject: "   ", status: "pending" },
    ]);
    expect(out).toBe("");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// C. dispatch('handoff', {tasks:...}) — TodoWrite block prepended to state.
// ──────────────────────────────────────────────────────────────────────────
describe("dispatch('handoff', write, {tasks}) — absorption preserves delegation", () => {
  const TEST_TERMINAL = `psk-test-${Date.now().toString(36)}`;
  const HANDOFF_DIR = path.join(REPO_ROOT, "state", "shared", "handoffs");

  it("write with tasks creates handoff file containing the snapshot block", async () => {
    const r = await psk.dispatch("handoff", {
      subcommand: "write",
      terminal: TEST_TERMINAL,
      topic: "psk-syscalls-test",
      resume: "U-CK03 verification — delete after read",
      state: "Pre-existing state body.",
      tasks: [
        { subject: "Build U-CK03", status: "in_progress" },
        { subject: "Run scrutiny", status: "pending" },
      ],
    });
    expect(r.syscall).toBe("handoff");
    expect(r.ok).toBe(true);
    // Find the file the helper wrote.
    const files = fs.readdirSync(HANDOFF_DIR)
      .filter((f) => f.includes(TEST_TERMINAL) && f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(1);
    const body = fs.readFileSync(path.join(HANDOFF_DIR, files[0]), "utf8");
    expect(body).toContain("## Open tasks (TodoWrite snapshot)");
    expect(body).toContain("- [~] in_progress: Build U-CK03");
    expect(body).toContain("- [ ] pending: Run scrutiny");
    expect(body).toContain("Pre-existing state body.");
    // Cleanup
    for (const f of files) fs.unlinkSync(path.join(HANDOFF_DIR, f));
  });

  it("write without tasks does NOT inject snapshot marker", async () => {
    const r = await psk.dispatch("handoff", {
      subcommand: "write",
      terminal: TEST_TERMINAL + "-no-tasks",
      topic: "psk-syscalls-test",
      resume: "No tasks here",
      state: "Just a state body.",
    });
    expect(r.ok).toBe(true);
    const files = fs.readdirSync(HANDOFF_DIR)
      .filter((f) => f.includes(TEST_TERMINAL + "-no-tasks") && f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(1);
    const body = fs.readFileSync(path.join(HANDOFF_DIR, files[0]), "utf8");
    expect(body).not.toContain("## Open tasks (TodoWrite snapshot)");
    expect(body).toContain("Just a state body.");
    for (const f of files) fs.unlinkSync(path.join(HANDOFF_DIR, f));
  });

  it("write with empty tasks array does NOT inject snapshot marker", async () => {
    const r = await psk.dispatch("handoff", {
      subcommand: "write",
      terminal: TEST_TERMINAL + "-empty",
      topic: "psk-syscalls-test",
      resume: "Empty tasks",
      state: "S",
      tasks: [],
    });
    expect(r.ok).toBe(true);
    const files = fs.readdirSync(HANDOFF_DIR)
      .filter((f) => f.includes(TEST_TERMINAL + "-empty") && f.endsWith(".md"));
    const body = fs.readFileSync(path.join(HANDOFF_DIR, files[0]), "utf8");
    expect(body).not.toContain("## Open tasks (TodoWrite snapshot)");
    for (const f of files) fs.unlinkSync(path.join(HANDOFF_DIR, f));
  });

  it("write preserves an already-present TodoWrite marker (exactly one marker)", async () => {
    const stateWithMarker = "Pre-existing state.\n\n## Open tasks (TodoWrite snapshot)\n- [ ] already here\n";
    const r = await psk.dispatch("handoff", {
      subcommand: "write",
      terminal: TEST_TERMINAL + "-marker",
      topic: "psk-syscalls-test",
      resume: "Marker present",
      state: stateWithMarker,
      tasks: [{ subject: "Would be duplicated", status: "pending" }],
    });
    expect(r.ok).toBe(true);
    const files = fs.readdirSync(HANDOFF_DIR)
      .filter((f) => f.includes(TEST_TERMINAL + "-marker") && f.endsWith(".md"));
    const body = fs.readFileSync(path.join(HANDOFF_DIR, files[0]), "utf8");
    const markerCount = (body.match(/## Open tasks \(TodoWrite snapshot\)/g) || []).length;
    expect(markerCount).toBe(1);
    expect(body).not.toContain("Would be duplicated");
    for (const f of files) fs.unlinkSync(path.join(HANDOFF_DIR, f));
  });

  it("path-traversal terminal IS still rejected (P1-1 guard intact)", async () => {
    const r = await psk.dispatch("handoff", {
      subcommand: "write",
      terminal: "../../etc/passwd",
      resume: "x",
    });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/invalid terminal/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// D. dispatch('checkin', {subcommand:'composite'}) — reclaim+claim+drift+hygiene.
// ──────────────────────────────────────────────────────────────────────────
describe("dispatch('checkin', composite) — U-CK03 composite contract", () => {
  it("composite envelope sets composite=true + shell_only=true + numeric elapsedMs", async () => {
    const r = await psk.dispatch("checkin", { subcommand: "composite" });
    expect(r.syscall).toBe("checkin");
    expect(r.composite).toBe(true);
    expect(r.shell_only).toBe(true);
    expect(typeof r.result.elapsedMs).toBe("number");
    expect(r.result.elapsedMs).toBeGreaterThan(0);
    expect(r.result.elapsedMs).toBeLessThan(60000); // budget
  });

  it("composite reclaim sub-step returns chat-slots reclaim payload (kept array present)", async () => {
    const r = await psk.dispatch("checkin", { subcommand: "composite" });
    const reclaim = r.result.reclaim;
    // chat-slots reclaim emits {ok:true, reclaimed:[...], kept:[...]}.
    expect(typeof reclaim).toBe("object");
    expect(reclaim).not.toBeNull();
    // kept[] field is always present in the helper's output (may be empty).
    expect(Array.isArray(reclaim.kept) || Array.isArray(reclaim.reclaimed)).toBe(true);
  });

  it("composite commit-hygiene branch EQUALS the live git branch from a sibling subprocess", async () => {
    const r = await psk.dispatch("checkin", { subcommand: "composite" });
    const h = r.result.commitHygiene;
    const liveBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
    expect(h.branch).toBe(liveBranch);
  });

  it("composite commit-hygiene worktree IS an absolute existing directory", async () => {
    const r = await psk.dispatch("checkin", { subcommand: "composite" });
    const h = r.result.commitHygiene;
    expect(typeof h.worktree).toBe("string");
    expect(path.isAbsolute(h.worktree)).toBe(true);
    expect(fs.statSync(h.worktree).isDirectory()).toBe(true);
  });

  it("composite commit-hygiene dirty/staged/untracked are non-negative integers", async () => {
    const r = await psk.dispatch("checkin", { subcommand: "composite" });
    const h = r.result.commitHygiene;
    // On this big repo, status always succeeds; the counts are integers ≥0.
    expect(Number.isInteger(h.dirty)).toBe(true);
    expect(h.dirty).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h.staged)).toBe(true);
    expect(h.staged).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h.untracked)).toBe(true);
    expect(h.untracked).toBeGreaterThanOrEqual(0);
  });

  it("composite degraded=true when claim sub-step fails — error names the failing step", async () => {
    const r = await psk.dispatch("checkin", { subcommand: "composite" });
    // No-args claim → chat-slots rejects → claim sub-step degraded.
    expect(r.result.degraded).toBe(true);
    expect(r.ok).toBe(false);
    expect(Array.isArray(r.result.errors)).toBe(true);
    expect(r.result.errors.length).toBeGreaterThan(0);
    const claimErr = r.result.errors.find((e: { step: string }) => e.step === "claim");
    expect(typeof claimErr).toBe("object");
    expect(claimErr).not.toBeNull();
    expect(typeof claimErr.error).toBe("string");
    expect(claimErr.error.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// E. Legacy checkin subcommands — back-compat preserved (U-CK01 contract).
// ──────────────────────────────────────────────────────────────────────────
describe("dispatch('checkin', legacy) — back-compat with U-CK01 callers", () => {
  it("default subcommand returns shape with syscall='checkin' and composite UNSET", async () => {
    const r = await psk.dispatch("checkin", {});
    expect(r.syscall).toBe("checkin");
    expect(typeof r.ok).toBe("boolean");
    // CRITICAL: legacy path must NOT set composite:true (would silently
    // re-route every legacy U-CK01 caller into the heavy composite flow).
    expect(r.composite).toBe(undefined);
  });

  it("subcommand 'status' returns no composite envelope", async () => {
    const r = await psk.dispatch("checkin", { subcommand: "status" });
    expect(r.syscall).toBe("checkin");
    expect(r.composite).toBe(undefined);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// F. dispatch('pick', {chatId, noClaimFilter}) — new flags pass through.
// ──────────────────────────────────────────────────────────────────────────
describe("dispatch('pick', U-CK03 flags) — chatId + noClaimFilter passthrough", () => {
  it("chatId forwarded — pick-unit JSON response is structured (not {text:...} fallback)", async () => {
    const r = await psk.dispatch("pick", {
      slot: "bravo",
      chatId: "claude-test-passthrough",
      limit: 1,
    });
    expect(r.syscall).toBe("pick");
    expect(r.ok).toBe(true);
    // pick-unit --json emits a structured object. maybeJson() fallback path
    // returns {text:"..."} when stdout couldn't be parsed — that would mean
    // the --json flag didn't take effect. Either way it's a regression.
    const keys = Object.keys(r.result).sort();
    expect(keys).not.toEqual(["text"]);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("noClaimFilter=true bypasses peer-claim filtering (response parses as JSON)", async () => {
    const r = await psk.dispatch("pick", {
      slot: "bravo",
      noClaimFilter: true,
      limit: 1,
    });
    expect(r.ok).toBe(true);
    expect(r.syscall).toBe("pick");
    const keys = Object.keys(r.result).sort();
    expect(keys).not.toEqual(["text"]);
  });

  it("noClaimFilter=false (default) leaves filter active — still parses as JSON", async () => {
    const r = await psk.dispatch("pick", { slot: "bravo", limit: 1 });
    expect(r.ok).toBe(true);
    const keys = Object.keys(r.result).sort();
    expect(keys).not.toEqual(["text"]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// G. Fail-soft invariant — explicit per-syscall checks (no synthetic loop).
// ──────────────────────────────────────────────────────────────────────────
describe("FAIL-SOFT INVARIANT (U-CK01 contract preserved) — explicit per-syscall", () => {
  it("dispatch('whoami', {}) returns {ok:boolean, syscall:'whoami'}", async () => {
    const r = await psk.dispatch("whoami", {});
    expect(r.syscall).toBe("whoami");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('manifest', {}) returns {ok:boolean, syscall:'manifest'}", async () => {
    const r = await psk.dispatch("manifest", {});
    expect(r.syscall).toBe("manifest");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('position', {}) returns {ok:boolean, syscall:'position'}", async () => {
    const r = await psk.dispatch("position", {});
    expect(r.syscall).toBe("position");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('delta', {}) returns {ok:boolean, syscall:'delta'}", async () => {
    const r = await psk.dispatch("delta", {});
    expect(r.syscall).toBe("delta");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('tools', {}) returns {ok:boolean, syscall:'tools'}", async () => {
    const r = await psk.dispatch("tools", {});
    expect(r.syscall).toBe("tools");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('pick', {}) returns {ok:boolean, syscall:'pick'}", async () => {
    const r = await psk.dispatch("pick", {});
    expect(r.syscall).toBe("pick");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('checkin', {}) returns {ok:boolean, syscall:'checkin'}", async () => {
    const r = await psk.dispatch("checkin", {});
    expect(r.syscall).toBe("checkin");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('handoff', {}) returns {ok:boolean, syscall:'handoff'}", async () => {
    const r = await psk.dispatch("handoff", {});
    expect(r.syscall).toBe("handoff");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('record', {}) returns {ok:boolean, syscall:'record'}", async () => {
    const r = await psk.dispatch("record", {});
    expect(r.syscall).toBe("record");
    expect(typeof r.ok).toBe("boolean");
  });

  it("dispatch('recommend', {}) returns {ok:boolean, syscall:'recommend'}", async () => {
    const r = await psk.dispatch("recommend", {});
    expect(r.syscall).toBe("recommend");
    expect(typeof r.ok).toBe("boolean");
  });
});
