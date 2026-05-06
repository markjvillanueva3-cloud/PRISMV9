/**
 * perAgentHandoffWriterBan.test.ts — verifies INFRA-HANDOFF-MS0/U-WRITER-BAN
 *
 * Exercises the writer-identity gate in
 *   H:/prism/.claude/helpers/per-agent-handoff.mjs
 * by invoking the helper as a subprocess. This is the only meaningful
 * verification path: the helper IS a Node script and the gate runs at
 * argv parse time, so mocking would defeat the test.
 *
 * Why this test exists:
 *
 *   The PreCompact hook auto-writer was producing generic stubs like
 *   "Pre-compact snapshot (RESUME generated)" that overwrote the meaningful
 *   RESUME directives the live chat had crafted. After /compact, /startup
 *   read these stubs and had no idea what the chat was actually doing.
 *   User feedback (2026-05-06): "ban handlers and subagents from writing
 *   handoffs. live chat claude needs to handle it, we always have issues
 *   with per agent handoffs being generics and stubs".
 *
 * Acceptance:
 *
 *   1. write/stop without --source live-chat returns
 *      { ok: false, error: "writer_banned" } — never touches disk.
 *   2. write with --source live-chat succeeds and persists a real handoff.
 *   3. read still works without --source (read paths are not banned).
 *   4. precompact-handoff.mjs (the PreCompact hook helper) emits a
 *      systemMessage instead of writing — the auto-stub class of bug is
 *      closed at the hook level, not just the helper.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs";
const PRECOMPACT_HOOK = "H:/prism/.claude/helpers/precompact-handoff.mjs";
const TEST_TERMINAL = `claude-banwtest-${Date.now().toString(36)}`;
const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";

interface HelperResult {
  ok?: boolean;
  error?: string;
  op?: string;
  file?: string;
  instance?: string;
  session?: { id?: string; family?: string; terminal?: string };
  raw: string;
}

function runHelper(args: string[], stdin?: string): HelperResult {
  const r = spawnSync(process.execPath, [HELPER, ...args], {
    encoding: "utf-8",
    timeout: 8000,
    windowsHide: true,
    input: stdin,
  });
  const stdout = (r.stdout || "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { raw: stdout };
  }
  // Narrow `unknown` to a typed result. Any field absent in JSON simply stays
  // undefined — no any-spread, no silent mistypes.
  const p = (parsed && typeof parsed === "object") ? parsed as Record<string, unknown> : {};
  const sessRaw = p.session && typeof p.session === "object" ? p.session as Record<string, unknown> : undefined;
  return {
    ok: typeof p.ok === "boolean" ? p.ok : undefined,
    error: typeof p.error === "string" ? p.error : undefined,
    op: typeof p.op === "string" ? p.op : undefined,
    file: typeof p.file === "string" ? p.file : undefined,
    instance: typeof p.instance === "string" ? p.instance : undefined,
    session: sessRaw ? {
      id: typeof sessRaw.id === "string" ? sessRaw.id : undefined,
      family: typeof sessRaw.family === "string" ? sessRaw.family : undefined,
      terminal: typeof sessRaw.terminal === "string" ? sessRaw.terminal : undefined,
    } : undefined,
    raw: stdout,
  };
}

function findHandoffFile(terminal: string): string | null {
  if (!fs.existsSync(HANDOFFS_DIR)) return null;
  const match = fs.readdirSync(HANDOFFS_DIR)
    .find((f) => f.startsWith(`HANDOFF-${terminal}`) && f.endsWith(".md"));
  return match ? path.join(HANDOFFS_DIR, match) : null;
}

describe("per-agent-handoff.mjs writer-ban (INFRA-HANDOFF-MS0/U-WRITER-BAN)", () => {
  beforeAll(() => {
    // Ensure the test terminal is registered so the helper can resolve it.
    // Assert on the result — a silent registration failure here would let the
    // ban tests proceed against an unregistered terminal and produce
    // misleading negatives.
    const r = runHelper(["register", "--terminal", TEST_TERMINAL, "--agent-family", "Claude"]);
    expect(r.ok, `register failed: ${r.raw}`).toBe(true);
    expect(r.session?.id, "register must return a session id").toBeTypeOf("string");
    expect(r.session?.family).toBe("Claude");
  });

  afterAll(() => {
    // Cleanup: remove the test handoff file and unregister the test session.
    const f = findHandoffFile(TEST_TERMINAL);
    if (f && fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    runHelper(["unregister", "--terminal", TEST_TERMINAL]);
  });

  it("write without --source live-chat is rejected with writer_banned", () => {
    const r = runHelper([
      "write",
      "--terminal", TEST_TERMINAL,
      "--resume", "this resume should never be written",
      "--state", "should not persist",
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("writer_banned");
    expect(r.op).toBe("write");
    // Disk must remain untouched by the rejected call.
    const written = findHandoffFile(TEST_TERMINAL);
    if (written) {
      // If a previous test wrote something, the body must not contain our
      // rejected resume — this proves the ban prevented the write, not
      // merely deduped it.
      const body = fs.readFileSync(written, "utf-8");
      expect(body).not.toContain("this resume should never be written");
    }
  });

  it("stop without --source live-chat is rejected with writer_banned", () => {
    const r = runHelper([
      "stop",
      "--terminal", TEST_TERMINAL,
      "--resume", "stop variant should also be banned",
      "--state", "stop bypass attempt",
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("writer_banned");
    expect(r.op).toBe("stop");
  });

  it("write with --source not-live-chat is rejected (no false-positive on similar values)", () => {
    for (const src of ["hook", "subagent", "automation", "true", "live", "live_chat", "Live-Chat ", " "]) {
      const r = runHelper([
        "write",
        "--source", src,
        "--terminal", TEST_TERMINAL,
        "--resume", `attempt with source=${src}`,
        "--state", "should still be banned",
      ]);
      // "Live-Chat" with trailing space normalizes to "live-chat" — that one
      // legitimately passes (case-insensitive trim is the documented contract).
      const expectAllow = src.trim().toLowerCase() === "live-chat";
      if (expectAllow) {
        expect(r.ok, `source=${JSON.stringify(src)} should pass`).toBe(true);
      } else {
        expect(r.ok, `source=${JSON.stringify(src)} should be banned`).toBe(false);
        expect(r.error).toBe("writer_banned");
      }
    }
  });

  it("write with --source live-chat succeeds and persists the handoff", () => {
    const uniqueResume = `live-chat write probe ${Date.now()}`;
    const r = runHelper([
      "write",
      "--source", "live-chat",
      "--terminal", TEST_TERMINAL,
      "--resume", uniqueResume,
      "--state", "verified live-chat path",
    ]);
    expect(r.ok).toBe(true);
    expect(typeof r.file).toBe("string");
    const file = findHandoffFile(TEST_TERMINAL);
    expect(file).not.toBeNull();
    const body = fs.readFileSync(file!, "utf-8");
    expect(body).toContain(uniqueResume);
    expect(body).toContain("verified live-chat path");
  });

  it("read does NOT require --source (read paths are not banned)", () => {
    // Should succeed even without --source — only writers are banned.
    const r = runHelper(["read", "--terminal", TEST_TERMINAL]);
    expect(r.ok).toBe(true);
  });

  it("precompact-handoff.mjs hook emits systemMessage instead of writing", () => {
    // Stub a session_id payload like Claude Code's PreCompact hook does.
    const r = spawnSync(
      process.execPath,
      [PRECOMPACT_HOOK],
      {
        encoding: "utf-8",
        timeout: 8000,
        windowsHide: true,
        input: JSON.stringify({ session_id: "ban-test-session-id-aaaaaaaa" }),
      },
    );
    const stdout = (r.stdout || "").trim();
    const parsed = JSON.parse(stdout);
    expect(parsed.continue).toBe(true);
    expect(typeof parsed.systemMessage).toBe("string");
    // The neutered hook must mention the ban — that's the user-visible
    // contract that distinguishes the new behavior from the old auto-writer.
    expect(parsed.systemMessage).toMatch(/BANNED|ban|banned/);
    // And it must NOT have synthesized a "Pre-compact snapshot (RESUME ...)"
    // string — that was the exact stub class we banned.
    expect(parsed.systemMessage).not.toMatch(/Pre-compact snapshot \(RESUME/);
  });
});
