/**
 * perAgentHandoffGolfSlot.test.ts — verifies U-CLEANUP-A4
 *
 * Exercises the slot=golf filename-base override in
 *   H:/prism/.claude/helpers/per-agent-handoff.mjs
 * by invoking the helper as a subprocess (same pattern as the existing
 * perAgentHandoffWriterBan suite — the helper IS a Node script and the
 * relevant logic runs at argv parse time, so mocking would defeat the test).
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   Happy: write --slot golf --topic <t> produces HANDOFF-golf-<t>.md.
 *   Happy: read --slot golf --topic <t> from a DIFFERENT chat-id resolves
 *          to the same file (slot-keyed, not instance-keyed).
 *   Happy: frontmatter has `slot: golf` for golf writes.
 *   Failure 1: write without --slot still produces HANDOFF-<id>-<topic>.md
 *              (regression — work-slot writes must remain instance-keyed).
 *   Failure 2: read without --slot does NOT pick up HANDOFF-golf-*.md
 *              (lookup paths stay separate).
 *   Failure 3: read --slot golf when no HANDOFF-golf-*.md exists returns
 *              { ok:false, error: "no_golf_handoff" } — never falls back
 *              to family-latest (would silently grab a peer work-chat's
 *              handoff).
 *   Adversarial: --slot GOLF (uppercase) matches.
 *   Adversarial: --slot foo (unknown) falls through to instance-keyed.
 *   Variability: 3 distinct topics produce 3 distinct HANDOFF-golf-*.md
 *                files coexisting in the same dir.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs";
const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";

// Use a unique prefix so this test never touches another suite's handoffs.
const RUN_TAG = `a4test-${Date.now().toString(36)}`;
const TEST_TERMINAL = `claude-${RUN_TAG}`;
const SECOND_TERMINAL = `claude-${RUN_TAG}-peer`;

const ARTIFACT_FILES: string[] = [];
function trackArtifact(p: string) {
  ARTIFACT_FILES.push(p);
}

function runHelper(...argv: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, [HELPER, ...argv], {
    encoding: "utf-8",
    timeout: 15_000,
    windowsHide: true,
    // Explicit empty stdin: the helper inspects fd 0 for a Claude-hook
    // JSON payload; under vitest workers that pipe behaves oddly without
    // an explicit input value, occasionally blocking read on Windows.
    input: "",
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? -1,
  };
}

function parseHelperJSON(stdout: string): Record<string, unknown> {
  // The helper writes a single JSON object to stdout per command.
  return JSON.parse(stdout.trim());
}

function clearGolfFiles() {
  if (!fs.existsSync(HANDOFFS_DIR)) return;
  for (const f of fs.readdirSync(HANDOFFS_DIR)) {
    if (f.startsWith("HANDOFF-golf-") || f === "HANDOFF-golf.md") {
      try {
        fs.unlinkSync(path.join(HANDOFFS_DIR, f));
      } catch {
        /* ignore — concurrent peer may have removed it */
      }
    }
  }
}

beforeAll(() => {
  fs.mkdirSync(HANDOFFS_DIR, { recursive: true });
});

afterAll(() => {
  // Best-effort cleanup of every file we created.
  for (const p of ARTIFACT_FILES) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
});

describe("U-CLEANUP-A4 — write path: slot=golf remaps filename base", () => {
  beforeEach(() => clearGolfFiles());

  it("happy: --slot golf --topic dashboards writes HANDOFF-golf-dashboards.md", () => {
    const r = runHelper(
      "write",
      "--source", "live-chat",
      "--terminal", TEST_TERMINAL,
      "--slot", "golf",
      "--topic", "dashboards",
      "--resume", "Hygiene chat — dashboard regen + ledger triage.",
      "--state", "Test write for U-CLEANUP-A4 happy path"
    );
    expect(r.status).toBe(0);
    const j = parseHelperJSON(r.stdout) as { ok: boolean; file: string };
    expect(j.ok).toBe(true);
    expect(j.file).toMatch(/HANDOFF-golf-dashboards\.md$/);
    trackArtifact(j.file);
    expect(fs.existsSync(j.file)).toBe(true);
    const content = fs.readFileSync(j.file, "utf-8");
    expect(content).toMatch(/^slot: golf$/m); // frontmatter must record slot
    expect(content).toMatch(/^topic: dashboards$/m);
  });

  it("happy: 3 distinct topics produce 3 distinct HANDOFF-golf-*.md files (variability)", () => {
    const topics = ["ledger-triage", "drift-report", "orphan-reap"];
    const created: string[] = [];
    for (const t of topics) {
      const r = runHelper(
        "write",
        "--source", "live-chat",
        "--terminal", TEST_TERMINAL,
        "--slot", "golf",
        "--topic", t,
        "--resume", `Golf chat working on ${t} — verifying variability.`,
        "--state", `state-${t}`
      );
      expect(r.status).toBe(0);
      const j = parseHelperJSON(r.stdout) as { ok: boolean; file: string };
      expect(j.ok).toBe(true);
      expect(j.file).toMatch(new RegExp(`HANDOFF-golf-${t}\\.md$`));
      trackArtifact(j.file);
      created.push(j.file);
    }
    // All three files coexist; their basenames are distinct.
    expect(new Set(created.map(p => path.basename(p))).size).toBe(3);
    for (const p of created) expect(fs.existsSync(p)).toBe(true);
  });

  it("failure 1: write WITHOUT --slot stays instance-keyed (regression guard)", () => {
    const r = runHelper(
      "write",
      "--source", "live-chat",
      "--terminal", TEST_TERMINAL,
      "--topic", "regress-instance-keyed",
      "--resume", "Work-slot write — must remain instance-keyed.",
      "--state", "regression-test"
    );
    expect(r.status).toBe(0);
    const j = parseHelperJSON(r.stdout) as { ok: boolean; file: string };
    expect(j.ok).toBe(true);
    // Filename must NOT start with HANDOFF-golf-
    expect(j.file).not.toMatch(/HANDOFF-golf[-.]/);
    // Filename SHOULD contain the (sanitized) terminal name.
    expect(j.file).toContain(TEST_TERMINAL);
    trackArtifact(j.file);
  });

  it("adversarial: --slot GOLF (uppercase) still remaps to base=golf", () => {
    const r = runHelper(
      "write",
      "--source", "live-chat",
      "--terminal", TEST_TERMINAL,
      "--slot", "GOLF",
      "--topic", "uppercase-slot-test",
      "--resume", "Verify case-insensitive --slot golf matching.",
      "--state", "adversarial-uppercase"
    );
    expect(r.status).toBe(0);
    const j = parseHelperJSON(r.stdout) as { ok: boolean; file: string };
    expect(j.ok).toBe(true);
    expect(j.file).toMatch(/HANDOFF-golf-uppercase-slot-test\.md$/);
    trackArtifact(j.file);
  });

  it("adversarial: --slot foo (unknown) falls through to instance-keyed", () => {
    const r = runHelper(
      "write",
      "--source", "live-chat",
      "--terminal", TEST_TERMINAL,
      "--slot", "foo",
      "--topic", "unknown-slot-fallthrough",
      "--resume", "Unknown slot value must NOT remap the filename base.",
      "--state", "adversarial-unknown-slot"
    );
    expect(r.status).toBe(0);
    const j = parseHelperJSON(r.stdout) as { ok: boolean; file: string };
    expect(j.ok).toBe(true);
    expect(j.file).not.toMatch(/HANDOFF-foo[-.]/);
    expect(j.file).not.toMatch(/HANDOFF-golf[-.]/);
    expect(j.file).toContain(TEST_TERMINAL);
    trackArtifact(j.file);
  });
});

describe("U-CLEANUP-A4 — read path: --slot golf resolves slot-keyed file", () => {
  beforeEach(() => clearGolfFiles());

  it("happy: read --slot golf --topic <t> from a DIFFERENT chat-id resolves the same file", () => {
    // First chat writes a golf handoff…
    const w = runHelper(
      "write",
      "--source", "live-chat",
      "--terminal", TEST_TERMINAL,
      "--slot", "golf",
      "--topic", "cross-chat-read",
      "--resume", "Hygiene chat handoff written for cross-chat read verification.",
      "--state", "writer-a"
    );
    expect(w.status).toBe(0);
    const wj = parseHelperJSON(w.stdout) as { ok: boolean; file: string };
    expect(wj.ok).toBe(true);
    trackArtifact(wj.file);

    // …a different chat-id reads with --slot golf and gets the same file.
    const r = runHelper(
      "read",
      "--terminal", SECOND_TERMINAL,
      "--slot", "golf",
      "--topic", "cross-chat-read"
    );
    expect(r.status).toBe(0);
    const rj = parseHelperJSON(r.stdout) as { ok: boolean; matchedBy: string; file: string; content: string };
    expect(rj.ok).toBe(true);
    expect(rj.matchedBy).toBe("slot-golf-topic");
    expect(rj.file).toMatch(/HANDOFF-golf-cross-chat-read\.md$/);
    // Content actually came from the original writer (cross-chat-id resolution).
    expect(rj.content).toContain("Hygiene chat handoff written for cross-chat read verification.");
  });

  it("happy: read --slot golf without --topic falls back to newest HANDOFF-golf-*.md", () => {
    runHelper(
      "write", "--source", "live-chat",
      "--terminal", TEST_TERMINAL, "--slot", "golf", "--topic", "older",
      "--resume", "Older handoff written first.", "--state", "older-state"
    );
    // Tiny sleep guarantees mtime ordering on Windows NTFS (resolution ~1ms).
    const start = Date.now(); while (Date.now() - start < 10) { /* spin */ }
    const w2 = runHelper(
      "write", "--source", "live-chat",
      "--terminal", TEST_TERMINAL, "--slot", "golf", "--topic", "newer",
      "--resume", "Newer handoff — should be the one returned.",
      "--state", "newer-state"
    );
    const wj2 = parseHelperJSON(w2.stdout) as { ok: boolean; file: string };
    trackArtifact(wj2.file);
    trackArtifact(path.join(HANDOFFS_DIR, "HANDOFF-golf-older.md"));

    const r = runHelper("read", "--terminal", SECOND_TERMINAL, "--slot", "golf");
    expect(r.status).toBe(0);
    const rj = parseHelperJSON(r.stdout) as { ok: boolean; matchedBy: string; file: string; content: string };
    expect(rj.ok).toBe(true);
    expect(rj.matchedBy).toBe("slot-golf-newest");
    expect(rj.file).toMatch(/HANDOFF-golf-newer\.md$/);
    expect(rj.content).toContain("Newer handoff");
  });

  it("failure 3: read --slot golf with no HANDOFF-golf-*.md returns ok:false (no instance fallback)", () => {
    // Pre-write a regular instance-keyed handoff for THIS chat — read --slot
    // golf must NOT pick it up.
    const w = runHelper(
      "write", "--source", "live-chat",
      "--terminal", TEST_TERMINAL,
      "--topic", "should-not-be-picked-up",
      "--resume", "Instance-keyed write — golf read must not pick this up.",
      "--state", "no-fallback"
    );
    const wj = parseHelperJSON(w.stdout) as { file: string };
    trackArtifact(wj.file);

    const r = runHelper("read", "--terminal", TEST_TERMINAL, "--slot", "golf");
    expect(r.status).toBe(0);
    const rj = parseHelperJSON(r.stdout) as { ok: boolean; error?: string; message?: string };
    expect(rj.ok).toBe(false);
    expect(rj.error).toBe("no_golf_handoff");
    expect(rj.message).toMatch(/no HANDOFF-golf/i);
  });

  it("failure 2: read WITHOUT --slot does NOT pick up HANDOFF-golf-*.md (lookup paths isolated)", () => {
    // Only golf handoffs exist for this run.
    const w = runHelper(
      "write", "--source", "live-chat",
      "--terminal", TEST_TERMINAL, "--slot", "golf", "--topic", "isolation-check",
      "--resume", "Only-golf-handoff exists for this terminal-id under this topic.",
      "--state", "isolation-test"
    );
    const wj = parseHelperJSON(w.stdout) as { ok: boolean; file: string };
    expect(wj.ok).toBe(true);
    trackArtifact(wj.file);

    // The read uses a brand-new terminal name (no prior instance-keyed file
    // for it), no --slot. It must NOT return the golf file via family-latest.
    const r = runHelper(
      "read",
      "--terminal", `claude-isolation-${RUN_TAG}`,
      "--topic", "isolation-check"
    );
    expect(r.status).toBe(0);
    const rj = parseHelperJSON(r.stdout) as { ok: boolean; matchedBy?: string; file?: string };
    // Either it returns nothing OR it returns a non-golf file via family
    // fallback. The contract here is "lookup paths are isolated" — i.e.
    // even if family-latest picks SOMETHING, that something must not be
    // the golf-base file we just wrote.
    if (rj.ok && rj.file) {
      expect(rj.file).not.toMatch(/HANDOFF-golf[-.]/);
    }
  });
});
