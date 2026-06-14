/**
 * html-companion-guard — isCompanionTarget + checkTwin tests
 *
 * Closes the pre-existing zero-coverage gap that the 2026-05-18 (slot kilo)
 * extension WIDENED. Kilo's extension added two path patterns; the 2026-05-18
 * (slot lima) adopt SHIPPED only one of them:
 *
 *   - PATCH_FILE_RE  (state/shared/dashboards/patches/*.{md,html}) — SHIPPED.
 *   - ROOT_DOC_RE    (root CLAUDE.md / MEMORY.md / .html)         — DEFERRED.
 *
 * The root-doc arm was deferred (Arm B P1#1 of the per-file scrutiny round):
 * the committed CLAUDE.html / MEMORY.html twins are currently drifted, so
 * targeting them now would emit a guaranteed false-DRIFT advisory. It returns
 * in follow-up unit U-HTML-GUARD-ROOTDOC alongside regenerated non-drifted
 * twins. The four "root doc → false" tests below are the REGRESSION ORACLE for
 * that deferral: re-adding ROOT_DOC_RE without the regenerated twins flips them
 * and fails the suite — exactly the guard the deferral needs.
 *
 * Uses node:test (not vitest) — matches sibling convention.
 *
 * Coverage: spec match, research match, dashboards/patches match, root-doc
 * NON-match (deferral oracle), nested patches NO match, random non-companion
 * paths NO match, both forward-slash and backslash inputs, and the
 * classifier→drift-engine (isCompanionTarget→checkTwin) composition over the
 * shipped patch-sibling target class — matching / stale / missing-meta /
 * missing-twin.
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { isCompanionTarget, checkTwin } from "../html-companion-guard.mjs";

// ─── SPEC_FILE_RE positives ──────────────────────────────────────────────────

test("isCompanionTarget: state/shared/specs/foo.md → true", () => {
  assert.equal(isCompanionTarget("state/shared/specs/foo.md"), true);
});

test("isCompanionTarget: state/shared/specs/nested/dir/bar.html → true", () => {
  assert.equal(isCompanionTarget("state/shared/specs/nested/dir/bar.html"), true);
});

test("isCompanionTarget: state/shared/research/x.md → true", () => {
  assert.equal(isCompanionTarget("state/shared/research/x.md"), true);
});

test("isCompanionTarget: Windows backslash path state\\shared\\specs\\foo.md → true", () => {
  assert.equal(isCompanionTarget("state\\shared\\specs\\foo.md"), true);
});

// ─── PATCH_FILE_RE positives + flat-only enforcement ─────────────────────────

test("isCompanionTarget: state/shared/dashboards/patches/CLAUDE-MD-PATCH-foo.md → true", () => {
  assert.equal(isCompanionTarget("state/shared/dashboards/patches/CLAUDE-MD-PATCH-foo.md"), true);
});

test("isCompanionTarget: state/shared/dashboards/patches/CLAUDE-MD-PATCH-bar.html → true", () => {
  assert.equal(isCompanionTarget("state/shared/dashboards/patches/CLAUDE-MD-PATCH-bar.html"), true);
});

test("isCompanionTarget: NESTED state/shared/dashboards/patches/sub/foo.md → false (flat convention)", () => {
  // Conservative-by-convention: patches dir is flat. If a nested patch appears,
  // the guard silently misses it — flagged in Reviewer B's P2 as enforceable
  // via separate pre-commit if convention is violated. This test pins the
  // current behavior so a future regex widening doesn't change semantics
  // silently.
  assert.equal(isCompanionTarget("state/shared/dashboards/patches/sub/foo.md"), false);
});

// ─── ROOT_DOC deferral oracle (U-HTML-GUARD-ROOTDOC) ─────────────────────────
// Kilo's extension targeted root CLAUDE.md / MEMORY.md (+ .html). The lima
// adopt DEFERRED that arm (Arm B P1#1 — drifted twins would false-flag). These
// four MUST stay `false` until U-HTML-GUARD-ROOTDOC re-adds ROOT_DOC_RE WITH
// regenerated non-drifted twins. A premature re-add flips them — the suite
// fails loud, which is the intended deferral guard.

test("isCompanionTarget: CLAUDE.md (repo root) → false (root-doc arm deferred — U-HTML-GUARD-ROOTDOC)", () => {
  assert.equal(isCompanionTarget("CLAUDE.md"), false);
});

test("isCompanionTarget: MEMORY.md (repo root) → false (root-doc arm deferred — U-HTML-GUARD-ROOTDOC)", () => {
  assert.equal(isCompanionTarget("MEMORY.md"), false);
});

test("isCompanionTarget: CLAUDE.html (repo root) → false (root-doc arm deferred — U-HTML-GUARD-ROOTDOC)", () => {
  assert.equal(isCompanionTarget("CLAUDE.html"), false);
});

test("isCompanionTarget: MEMORY.html (repo root) → false (root-doc arm deferred — U-HTML-GUARD-ROOTDOC)", () => {
  assert.equal(isCompanionTarget("MEMORY.html"), false);
});

test("isCompanionTarget: state/shared/CLAUDE.md → false (not a companion target)", () => {
  assert.equal(isCompanionTarget("state/shared/CLAUDE.md"), false);
});

test("isCompanionTarget: subdir/CLAUDE.md → false", () => {
  assert.equal(isCompanionTarget("subdir/CLAUDE.md"), false);
});

test("isCompanionTarget: CLAUDE-old.md → false (lookalike — and root-doc arm deferred regardless)", () => {
  assert.equal(isCompanionTarget("CLAUDE-old.md"), false);
});

test("isCompanionTarget: MEMORY.md.bak → false (lookalike — and root-doc arm deferred regardless)", () => {
  assert.equal(isCompanionTarget("MEMORY.md.bak"), false);
});

// ─── Non-companion negatives ─────────────────────────────────────────────────

test("isCompanionTarget: random.md → false", () => {
  assert.equal(isCompanionTarget("random.md"), false);
});

test("isCompanionTarget: src/index.ts → false (not a companion-eligible extension)", () => {
  assert.equal(isCompanionTarget("src/index.ts"), false);
});

test("isCompanionTarget: state/shared/some-other-dir/foo.md → false", () => {
  assert.equal(isCompanionTarget("state/shared/some-other-dir/foo.md"), false);
});

test("isCompanionTarget: empty string → false (no crash)", () => {
  assert.equal(isCompanionTarget(""), false);
});

test("isCompanionTarget: undefined → false (no crash — explicit non-string guard)", () => {
  // Defensive — `staged.split("\n")` produces strings, but guard the API.
  assert.equal(isCompanionTarget(undefined), false);
});

// ─── checkTwin() ↔ isCompanionTarget() integration (2026-05-18 slot lima) ────
// P1#2 from the 2-reviewer per-file scrutiny: isCompanionTarget had unit
// coverage but nothing exercised checkTwin() — the drift engine — over the
// SHIPPED target class (state/shared/dashboards/patches/). These four cases
// prove the classifier→drift composition end-to-end on real files: a
// patch-sibling .md/.html pair with a matching hash, a stale hash, a missing
// <meta prism-source-hash>, and a missing .html twin. Each asserts BOTH that
// the path classifies as a companion target AND that checkTwin's drift verdict
// is correct — so a regression in either the regex or the drift logic fails.

const PATCH_REL = "state/shared/dashboards/patches/CLAUDE-MD-PATCH-itdemo.md";

/** Build a tmp repo-root with the patch-sibling .md (+ optional .html) and return {top, stem}. */
function buildPatchTwin(htmlContent /* string | null — null = no .html written */) {
  const top = mkdtempSync(join(tmpdir(), "html-guard-it-"));
  const stem = PATCH_REL.replace(/\.(?:md|html)$/i, "");
  mkdirSync(join(top, "state", "shared", "dashboards", "patches"), { recursive: true });
  writeFileSync(join(top, stem + ".md"), "# Patch demo\n\nbody line\n", "utf8");
  if (htmlContent !== null) writeFileSync(join(top, stem + ".html"), htmlContent, "utf8");
  return { top, stem };
}

/** sha256 over the SAME raw bytes checkTwin reads — readFileSync(buffer) → hash. */
function mdHashOf(top, stem) {
  return createHash("sha256").update(readFileSync(join(top, stem + ".md"))).digest("hex");
}

test("checkTwin ∘ isCompanionTarget: patch-sibling, matching hash → no drift", () => {
  assert.equal(isCompanionTarget(PATCH_REL), true, "patch-sibling must classify as a companion target");
  let top;
  try {
    let stem;
    ({ top, stem } = buildPatchTwin("PLACEHOLDER"));
    // Re-write the .html now that we can hash the on-disk .md exactly.
    const good = `<!doctype html><head><meta name="prism-source-hash" content="${mdHashOf(top, stem)}"></head><body>x</body>`;
    writeFileSync(join(top, stem + ".html"), good, "utf8");
    const { drift } = checkTwin(top, stem);
    assert.equal(drift, null, "matching embedded hash must report no drift");
  } finally { if (top) rmSync(top, { recursive: true, force: true }); }
});

test("checkTwin ∘ isCompanionTarget: patch-sibling, stale hash → drift reported", () => {
  let top;
  try {
    let stem;
    const staleHash = "0".repeat(64);
    ({ top, stem } = buildPatchTwin(
      `<!doctype html><head><meta name="prism-source-hash" content="${staleHash}"></head><body>x</body>`));
    const { drift } = checkTwin(top, stem);
    assert.ok(drift, "stale embedded hash must report drift");
    assert.match(drift, /stale/, "drift message must name the staleness: " + drift);
  } finally { if (top) rmSync(top, { recursive: true, force: true }); }
});

test("checkTwin ∘ isCompanionTarget: patch-sibling, missing <meta prism-source-hash> → drift reported", () => {
  let top;
  try {
    let stem;
    ({ top, stem } = buildPatchTwin("<!doctype html><head></head><body>no meta here</body>"));
    const { drift } = checkTwin(top, stem);
    assert.equal(drift, "no <meta prism-source-hash> in the HTML",
      "an HTML twin with no source-hash meta must be flagged as drift");
  } finally { if (top) rmSync(top, { recursive: true, force: true }); }
});

test("checkTwin ∘ isCompanionTarget: patch-sibling .md with NO .html twin → drift reported", () => {
  let top;
  try {
    let stem;
    ({ top, stem } = buildPatchTwin(null)); // no .html written
    const { drift } = checkTwin(top, stem);
    assert.ok(drift, "a staged .md with no .html twin must report drift");
    assert.match(drift, /MISSING/i, "drift message must name the missing twin: " + drift);
  } finally { if (top) rmSync(top, { recursive: true, force: true }); }
});
