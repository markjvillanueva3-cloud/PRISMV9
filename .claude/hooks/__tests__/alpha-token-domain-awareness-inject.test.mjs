// Tests for alpha-token-domain-awareness-inject.mjs (U-ALPHA-AWARENESS-AUTOREFRESH).
// Unit: decideRegen (pure). Integration: real subprocess oracle proving refresh-on-read
// (the "hermetic fakes don't prove wiring" regression-log mandate).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HOOK = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "alpha-token-domain-awareness-inject.mjs",
);
const { decideRegen } = await import(pathToFileURL(HOOK).href);

// ---------- unit: decideRegen (pure) ----------
test("decideRegen: disabled -> false (read-only)", () => {
  assert.equal(decideRegen({ fileExists: false, ageHrs: 999, staleHrs: 24, disabled: true }), false);
});
test("decideRegen: absent -> true (must generate)", () => {
  assert.equal(decideRegen({ fileExists: false, ageHrs: null, staleHrs: 24, disabled: false }), true);
});
test("decideRegen: fresh -> false (no churn)", () => {
  assert.equal(decideRegen({ fileExists: true, ageHrs: 1, staleHrs: 24, disabled: false }), false);
});
test("decideRegen: stale -> true (refresh)", () => {
  assert.equal(decideRegen({ fileExists: true, ageHrs: 99, staleHrs: 24, disabled: false }), true);
});
test("decideRegen: exists + age unknown -> false (conservative)", () => {
  assert.equal(decideRegen({ fileExists: true, ageHrs: null, staleHrs: 24, disabled: false }), false);
});
test("decideRegen: boundary age == staleHrs -> false (strictly greater)", () => {
  assert.equal(decideRegen({ fileExists: true, ageHrs: 24, staleHrs: 24, disabled: false }), false);
});

// ---------- integration: real subprocess oracle ----------
const FAKE_GEN =
  'export function gatherInputs(){return {};}\n' +
  'export function computeAwareness(){return {summary:{}};}\n' +
  'export function renderMarkdown(){return "# REGEN-SENTINEL\\n**Verdict:** test-regenerated";}\n';
const AWARE_REL = "state/shared/TOKEN-OPTIMIZATION-AWARENESS.md";

function setupRoot({ slot = "alpha", withAwareness = false, awarenessContent = "" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "tok-aware-"));
  mkdirSync(join(root, "state/shared"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(
    join(root, "state/shared/chat-slots.json"),
    JSON.stringify({ slots: { [slot]: { chatId: "claude-deadbeef" } } }),
  );
  writeFileSync(join(root, "scripts/token-awareness-snapshot.mjs"), FAKE_GEN);
  if (withAwareness) writeFileSync(join(root, AWARE_REL), awarenessContent);
  return root;
}

function runHook(root, extraEnv = {}) {
  return execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: "DEADBEEF-1234" }),
    env: { ...process.env, PRISM_ROOT: root, PRISM_BOOT_SLOT: "", ...extraEnv },
    encoding: "utf8",
  });
}

test("integration: absent surface -> regenerated in-process before read", () => {
  const root = setupRoot({ withAwareness: false });
  try {
    const out = runHook(root);
    const file = join(root, AWARE_REL);
    assert.ok(existsSync(file), "awareness file created by in-process regen");
    assert.match(readFileSync(file, "utf8"), /REGEN-SENTINEL/, "file holds generator output");
    assert.match(out, /Token-optimization domain awareness/, "hook injects the headline");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("integration: fresh surface -> NOT regenerated (no churn)", () => {
  const root = setupRoot({ withAwareness: true, awarenessContent: "**Verdict:** FRESH-SENTINEL\n" });
  try {
    runHook(root);
    assert.match(
      readFileSync(join(root, AWARE_REL), "utf8"),
      /FRESH-SENTINEL/,
      "a fresh file (age ~0 < 24h) is left untouched",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("integration: PRISM_TOKEN_AWARENESS_NO_AUTOREGEN=1 disables regen", () => {
  const root = setupRoot({ withAwareness: false });
  try {
    runHook(root, { PRISM_TOKEN_AWARENESS_NO_AUTOREGEN: "1" });
    assert.ok(!existsSync(join(root, AWARE_REL)), "knob keeps it read-only: no file written");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("integration: non-alpha slot -> silent no-op, never regenerates", () => {
  const root = setupRoot({ slot: "bravo", withAwareness: false });
  try {
    const out = runHook(root);
    assert.equal(out.trim(), "", "non-alpha emits nothing");
    assert.ok(
      !existsSync(join(root, AWARE_REL)),
      "regen runs only after the alpha gate, so non-alpha never writes",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("integration: generator that THROWS on import -> fail-soft, fallback still injected (R12)", () => {
  const root = mkdtempSync(join(tmpdir(), "tok-aware-"));
  try {
    mkdirSync(join(root, "state/shared"), { recursive: true });
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(
      join(root, "state/shared/chat-slots.json"),
      JSON.stringify({ slots: { alpha: { chatId: "claude-deadbeef" } } }),
    );
    // generator that throws at module-evaluation time
    writeFileSync(join(root, "scripts/token-awareness-snapshot.mjs"), 'throw new Error("boom on import");\n');
    const out = runHook(root);
    assert.ok(!existsSync(join(root, AWARE_REL)), "throwing generator writes nothing (fail-soft)");
    assert.match(out, /not yet generated/i, "inject degrades to the fallback block, never blocked");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("integration: generator MISSING renderMarkdown export -> fail-soft, no write (R12)", () => {
  const root = mkdtempSync(join(tmpdir(), "tok-aware-"));
  try {
    mkdirSync(join(root, "state/shared"), { recursive: true });
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(
      join(root, "state/shared/chat-slots.json"),
      JSON.stringify({ slots: { alpha: { chatId: "claude-deadbeef" } } }),
    );
    // valid module, but lacks the required renderMarkdown export
    writeFileSync(join(root, "scripts/token-awareness-snapshot.mjs"), "export function gatherInputs(){return {};}\n");
    const out = runHook(root);
    assert.ok(!existsSync(join(root, AWARE_REL)), "malformed generator (missing export) writes nothing");
    assert.match(out, /not yet generated/i, "inject still degrades to the fallback block");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
