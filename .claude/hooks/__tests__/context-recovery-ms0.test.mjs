/**
 * context-recovery-ms0.test.mjs -- CONTEXT-RECOVERY-MS0/U-CR01 (slot:tango, 2026-06-10)
 *
 * Guards the three surfaces that 3-of-3 scrutiny flagged as untested:
 *   1. getRecoveryPointer() (the resume-path injector helper) -- fail-soft on a
 *      bad slot / absent file, real pointer when a today-file exists.
 *   2. The SessionStart `resume` matcher WIRING in settings.json -- this is the
 *      P0 the review caught (the hook is inert on `claude --resume` unless a
 *      `matcher:"resume"` arm carries it). Settings-wiring drift is a known
 *      fleet hazard (feedback_settings_wiring_drift_2026_05_16) so it gets a
 *      standing assertion.
 *   3. scripts/recover-today-context.mjs `--slot` argv hardening -- a traversal
 *      / regex-metachar slot must be rejected (no write, no unlink, no crash).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(__dirname, "../session-start-auto-resume.mjs");
const SCRIPT = path.resolve(__dirname, "../../../scripts/recover-today-context.mjs");
const RECOVERY_DIR = "H:/prism/state/shared/context-recovery";
const NODE = process.execPath;

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("getRecoveryPointer: non-canonical slot -> empty (no I/O, no throw)", async () => {
  const { getRecoveryPointer } = await import(pathToFileURL(HOOK).href);
  assert.equal(getRecoveryPointer("zzznotaslot"), "");
  assert.equal(getRecoveryPointer(""), "");
  assert.equal(getRecoveryPointer(null), "");
  assert.equal(getRecoveryPointer("../../etc/passwd"), "");
});

test("getRecoveryPointer: absent today-file -> empty; present -> real pointer", async () => {
  const { getRecoveryPointer } = await import(pathToFileURL(HOOK).href);
  // `golf` is a canonical slot but not in today's active set -> no file -> "".
  const fixture = path.join(RECOVERY_DIR, `golf-TODAY-${todayStamp()}.md`);
  const preexisting = fs.existsSync(fixture);
  if (!preexisting) {
    assert.equal(getRecoveryPointer("golf"), "", "no file should yield empty pointer");
    fs.mkdirSync(RECOVERY_DIR, { recursive: true });
    fs.writeFileSync(fixture, "# fixture\n", "utf-8");
  }
  try {
    const ptr = getRecoveryPointer("golf");
    assert.match(ptr, /CONTEXT RECOVERY available/);
    assert.match(ptr, /golf-TODAY-/);
    assert.ok(ptr.includes("golf"), "pointer names the slot");
  } finally {
    if (!preexisting) { try { fs.unlinkSync(fixture); } catch { /* ignore */ } }
  }
});

test("settings.json: SessionStart has a `resume` arm carrying session-start-auto-resume (P0 guard)", () => {
  // Read whichever settings file is present (H: is the canonical mirror master).
  const candidates = ["H:/.claude/settings.json", `${process.env.USERPROFILE || process.env.HOME || ""}/.claude/settings.json`];
  let settings = null;
  for (const c of candidates) {
    try { settings = JSON.parse(fs.readFileSync(c, "utf-8")); break; } catch { /* try next */ }
  }
  assert.ok(settings, "could not read any settings.json");
  const arms = (settings.hooks && settings.hooks.SessionStart) || [];
  const resumeArm = arms.find(
    (a) => a.matcher === "resume" &&
      (a.hooks || []).some((h) => (h.command || "").includes("session-start-auto-resume")),
  );
  assert.ok(resumeArm, "SessionStart MUST have a matcher:'resume' arm with session-start-auto-resume.mjs, else the recovery pointer is inert on `claude --resume`");
});

// Helper: run the CLI capturing combined stdout+stderr regardless of exit code.
// A rejected slot exits 2 (usage: "no valid target") which is CLEAN -- the bug we
// guard against is a write outside the dir or a RegExp SyntaxError crash (exit 1).
function runCli(slotArg) {
  try {
    const out = execFileSync(NODE, [SCRIPT, "--slot", slotArg], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    return { out, code: 0 };
  } catch (e) {
    return { out: `${e.stdout || ""}${e.stderr || ""}`, code: e.status ?? 1 };
  }
}

test("recover-today-context: --slot traversal is rejected (guard fires, no write, no crash)", () => {
  const evil = "../../../tmp/cr-ms0-traversal-probe";
  const target = path.resolve(RECOVERY_DIR, `${evil}-TODAY-${todayStamp()}.md`);
  const { out } = runCli(evil);
  assert.match(out, /ignoring invalid --slot/, "argv guard must reject the traversal slot");
  assert.equal(fs.existsSync(target), false, "traversal must not write a file outside the recovery dir");
  assert.doesNotMatch(out, /SyntaxError|Invalid regular expression/, "must not crash");
});

test("recover-today-context: --slot regex metachar is rejected, no RegExp throw", () => {
  const { out } = runCli("a)(b");
  assert.match(out, /ignoring invalid --slot/, "argv guard must reject the metachar slot");
  assert.doesNotMatch(out, /SyntaxError|Invalid regular expression/, "metachar slot must not surface a RegExp SyntaxError");
});
