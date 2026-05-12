/**
 * RoadmapCloseOut.test.ts — comprehensive vitest coverage for the
 * close-out-milestone orchestrator + enforce-roadmap-closeout Stop hook.
 *
 * SCOPE
 *   Both scripts already ship with their own --self-test (25 + 26 cases).
 *   This file runs vitest-native coverage so:
 *     a) CI runs them automatically with the rest of the suite,
 *     b) failures surface in the standard vitest UI,
 *     c) the orchestrator's pure helpers get exercised through the public
 *        export surface (not only via the CLI), which catches regressions
 *        the CLI smoke path can hide,
 *     d) the bundled self-tests are also executed via subprocess so any
 *        future divergence between this file and the script-local cases is
 *        caught by both.
 *
 * COVERAGE FLOOR (per CLAUDE.md `feedback_always_close_out` requirement)
 *   - Happy path  ............. parseArgs, snapshotEnvelope, atomicWriteJson,
 *                               detectClosingDrift, buildBlockMessage,
 *                               renderChatBusSummary, COMMIT_PREFIX_RE.
 *   - Failure modes (≥3) ...... malformed envelope, missing index file,
 *                               NaN completed_units, wrong-type entries.
 *   - Adversarial (≥2) ........ null inputs, case-sensitive ids,
 *                               status word normalization edge.
 *   - Spanning shapes (≥3) .... OCN-style drift / post-orchestrator
 *                               idempotent / empty-fleet.
 *   - Integration ............. real fs round-trip of close-out semantics
 *                               in an os.tmpdir() scratch directory + each
 *                               script's --self-test exit code.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

import {
  parseArgs,
  snapshotEnvelope,
  atomicWriteJson,
  readJson,
  renderChatBusSummary,
  COMMIT_PREFIX_RE,
} from "../../../scripts/close-out-milestone.mjs";

import {
  detectClosingDrift,
  buildBlockMessage,
  metadata as hookMetadata,
} from "../../../.claude/hooks/enforce-roadmap-closeout.mjs";

// ─── Orchestrator: parseArgs ────────────────────────────────────────────────

describe("parseArgs (orchestrator)", () => {
  it("parses --milestone <ID>", () => {
    const r = parseArgs(["--milestone", "OCTOPUS-NEURAL-MS0"]);
    expect(r.milestone).toBe("OCTOPUS-NEURAL-MS0");
  });
  it("parses --milestone=<ID> (equals syntax)", () => {
    const r = parseArgs(["--milestone=FOO-MS1"]);
    expect(r.milestone).toBe("FOO-MS1");
  });
  it("parses bare flags", () => {
    const r = parseArgs(["--auto", "--json", "--no-write", "--skip-chat-bus", "--skip-regen", "--force"]);
    expect(r.auto).toBe(true);
    expect(r.json).toBe(true);
    expect(r.noWrite).toBe(true);
    expect(r.skipChatBus).toBe(true);
    expect(r.skipRegen).toBe(true);
    expect(r.force).toBe(true);
  });
  it("treats unknown flags as inert (no throw)", () => {
    expect(() => parseArgs(["--definitely-not-a-flag"])).not.toThrow();
  });
});

// ─── Orchestrator: snapshotEnvelope ─────────────────────────────────────────

describe("snapshotEnvelope (orchestrator)", () => {
  it("extracts the canonical keys", () => {
    const s = snapshotEnvelope({
      id: "X",
      status: "completed",
      completed_units: 5,
      total_units: 5,
      updated_at: "2026-05-12T00:00:00.000Z",
      extraField: "ignored",
    });
    expect(s).toEqual({
      id: "X",
      status: "completed",
      completed_units: 5,
      total_units: 5,
      updated_at: "2026-05-12T00:00:00.000Z",
    });
  });
  it("tolerates NaN completed_units without throwing", () => {
    const s = snapshotEnvelope({ id: "X", status: "completed", completed_units: Number.NaN, total_units: 7 });
    // NaN propagates (not silently coerced) — main()'s mutation path supplies
    // the fallback. snapshot is intentionally lossless.
    expect(Number.isNaN(s.completed_units)).toBe(true);
    expect(s.total_units).toBe(7);
  });
});

// ─── Orchestrator: atomicWriteJson round-trip ───────────────────────────────

describe("atomicWriteJson (orchestrator)", () => {
  it("writes + reads-back identical JSON", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-closeout-test-"));
    const target = path.join(tmp, "out.json");
    const payload = { a: 1, b: [2, 3], c: { d: "e" } };
    atomicWriteJson(target, payload);
    const round = JSON.parse(fs.readFileSync(target, "utf-8"));
    expect(round).toEqual(payload);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

// ─── Orchestrator: readJson ─────────────────────────────────────────────────

describe("readJson (orchestrator)", () => {
  it("reads existing valid JSON", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-closeout-test-"));
    const target = path.join(tmp, "x.json");
    fs.writeFileSync(target, JSON.stringify({ ok: true }));
    expect(readJson(target)).toEqual({ ok: true });
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  it("returns null on missing file (defensive)", () => {
    expect(readJson("/this/path/does/not/exist.json")).toBeNull();
  });
});

// ─── Orchestrator: renderChatBusSummary ─────────────────────────────────────

describe("renderChatBusSummary (orchestrator)", () => {
  it("includes id + envelope counts + index status + regen flags (full shape)", () => {
    const result = {
      envelope: { after: { status: "completed", completed_units: 5, total_units: 5 } },
      roadmapIndex: { changed: true, after: { status: "complete" } },
      regen: { milestoneProgress: { code: 0 }, buildState: { code: 0 } },
    };
    const out = renderChatBusSummary("OCTOPUS-NEURAL-MS0", result);
    expect(out).toContain("OCTOPUS-NEURAL-MS0");
    expect(out).toContain("5/5");
    expect(out).toContain("+roadmap-index");
    expect(out).toContain("+MILESTONE_PROGRESS");
    expect(out).toContain("+BUILD_STATE");
  });
  it("omits regen tags when sub-scripts did not run", () => {
    const result = {
      envelope: { after: { status: "completed", completed_units: 2, total_units: 2 } },
      roadmapIndex: { changed: false, after: { status: "complete" } },
      regen: { milestoneProgress: null, buildState: null },
    };
    const out = renderChatBusSummary("OTHER-MS0", result);
    expect(out).not.toContain("+roadmap-index");
    expect(out).not.toContain("+MILESTONE_PROGRESS");
  });
});

// ─── Orchestrator: COMMIT_PREFIX_RE ─────────────────────────────────────────

describe("COMMIT_PREFIX_RE (orchestrator)", () => {
  it("matches plain [SCOPE-MS0]/U-…", () => {
    const m = "[OCTOPUS-NEURAL-MS0]/U-OCN01: stuff".match(COMMIT_PREFIX_RE);
    expect(m?.[1]).toBe("OCTOPUS-NEURAL-MS0");
  });
  it("picks SCOPE bracket past leading [MAIN] tag", () => {
    const m = "[MAIN] [OCTOPUS-NEURAL-MS0]/U-OCN05: stuff".match(COMMIT_PREFIX_RE);
    expect(m?.[1]).toBe("OCTOPUS-NEURAL-MS0");
  });
  it("does not match non-conforming subjects", () => {
    expect("fix typo".match(COMMIT_PREFIX_RE)).toBeNull();
    expect("[scope]/U-x01: bad caps".match(COMMIT_PREFIX_RE)).toBeNull();
    expect("[SCOPE-MS0]/u-X01: lowercase u".match(COMMIT_PREFIX_RE)).toBeNull();
  });
});

// ─── Hook: detectClosingDrift ───────────────────────────────────────────────

describe("detectClosingDrift (Stop hook)", () => {
  it("happy: in-sync milestone produces no drift", () => {
    const envs = [{ id: "FOO-MS0", status: "completed", completed_units: 2, total_units: 2 }];
    const idx  = [{ id: "FOO-MS0", status: "complete",  completed_units: 2, total_units: 2 }];
    expect(detectClosingDrift(envs, idx)).toEqual([]);
  });

  it("OCN-shape: envelope completed, index not_started → drift", () => {
    const envs = [{ id: "OCTOPUS-NEURAL-MS0", status: "completed", completed_units: 5, total_units: 5 }];
    const idx  = [{ id: "OCTOPUS-NEURAL-MS0", status: "not_started", completed_units: 0, total_units: 5 }];
    const d = detectClosingDrift(envs, idx);
    expect(d).toHaveLength(1);
    expect(d[0].id).toBe("OCTOPUS-NEURAL-MS0");
    expect(d[0].envelopeCu).toBe(5);
    expect(d[0].indexCu).toBe(0);
  });

  it("normalization: index `complete` ≈ envelope `completed` (no false drift)", () => {
    const envs = [{ id: "X", status: "completed", completed_units: 3, total_units: 3 }];
    const idx  = [{ id: "X", status: "complete",  completed_units: 3, total_units: 3 }];
    expect(detectClosingDrift(envs, idx)).toEqual([]);
  });

  it("normalization: kebab `not-started` still drifts vs envelope `completed`", () => {
    const envs = [{ id: "X", status: "completed" }];
    const idx  = [{ id: "X", status: "not-started" }];
    expect(detectClosingDrift(envs, idx)).toHaveLength(1);
  });

  it("failure mode 1: malformed envelopes are filtered, valid ones still detected", () => {
    const envs = [
      null,
      "string-not-object",
      { /* no id */ status: "completed" },
      { id: 42, status: "completed" }, // non-string id
      { id: "VALID-MS0", status: "completed" },
    ];
    const idx = [{ id: "VALID-MS0", status: "not_started" }];
    const d = detectClosingDrift(envs as unknown[], idx);
    expect(d).toHaveLength(1);
    expect(d[0].id).toBe("VALID-MS0");
  });

  it("failure mode 2: unindexed milestone (envelope exists, index entry absent) is out-of-scope", () => {
    const envs = [{ id: "UNINDEXED-MS0", status: "completed" }];
    expect(detectClosingDrift(envs, [])).toEqual([]);
  });

  it("failure mode 3: reverse drift (index complete, envelope not) is out-of-scope", () => {
    const envs = [{ id: "REV-MS0", status: "not_started" }];
    const idx  = [{ id: "REV-MS0", status: "complete" }];
    expect(detectClosingDrift(envs, idx)).toEqual([]);
  });

  it("adversarial 1: null inputs do not throw", () => {
    expect(() => detectClosingDrift(null as unknown as never[], null as unknown as never[])).not.toThrow();
    expect(detectClosingDrift(null as unknown as never[], null as unknown as never[])).toEqual([]);
  });

  it("adversarial 2: ids are case-sensitive (no fuzzy match)", () => {
    const envs = [{ id: "case-ms0", status: "completed" }];
    const idx  = [{ id: "CASE-MS0", status: "not_started" }];
    expect(detectClosingDrift(envs, idx)).toEqual([]);
  });

  it("spanning A (OCN production shape): drift", () => {
    const d = detectClosingDrift(
      [{ id: "OCTOPUS-NEURAL-MS0", status: "completed", completed_units: 5, total_units: 5 }],
      [{ id: "OCTOPUS-NEURAL-MS0", status: "not_started", completed_units: 0, total_units: 5 }],
    );
    expect(d).toHaveLength(1);
  });

  it("spanning B (post-orchestrator state): silent", () => {
    const d = detectClosingDrift(
      [{ id: "OCTOPUS-NEURAL-MS0", status: "completed", completed_units: 5, total_units: 5 }],
      [{
        id: "OCTOPUS-NEURAL-MS0", status: "complete", completed_units: 5, total_units: 5,
        completed_at: "2026-05-12T00:00:00.000Z", _legacyStatus: "not_started",
      }],
    );
    expect(d).toEqual([]);
  });

  it("spanning C (empty fleet): silent", () => {
    expect(detectClosingDrift([], [])).toEqual([]);
  });
});

// ─── Hook: buildBlockMessage ────────────────────────────────────────────────

describe("buildBlockMessage (Stop hook)", () => {
  it("includes every drifted id + the orchestrator command + bypass env", () => {
    const msg = buildBlockMessage(
      [
        { id: "A-MS0", envelopeStatus: "completed", indexStatus: "not_started",
          indexCu: 0, indexTu: 3, envelopeCu: 3, envelopeTu: 3 },
        { id: "B-MS0", envelopeStatus: "completed", indexStatus: "in_progress",
          indexCu: 1, indexTu: 2, envelopeCu: 2, envelopeTu: 2 },
      ],
      1, 3,
    );
    expect(msg).toContain("A-MS0");
    expect(msg).toContain("B-MS0");
    expect(msg).toContain("close-out-milestone.mjs");
    expect(msg).toContain("PRISM_CLOSEOUT_GATE_BYPASS");
    expect(msg).toContain("Attempt 1/3");
  });
});

// ─── Hook: metadata contract ────────────────────────────────────────────────

describe("hook metadata", () => {
  it("declares Stop / blocking:true / bypass env", () => {
    expect(hookMetadata.id).toBe("enforce-roadmap-closeout");
    expect(hookMetadata.event).toBe("Stop");
    expect(hookMetadata.blocking).toBe(true);
    expect(hookMetadata.bypassEnv).toBe("PRISM_CLOSEOUT_GATE_BYPASS");
    expect(hookMetadata.ceiling).toBeGreaterThan(0);
  });
});

// ─── Integration: synthetic close-out round-trip in tmpdir ──────────────────

describe("integration: synthetic close-out round-trip", () => {
  it("envelope-completed + index-not_started ⇒ after mutation, index flips to canonical `complete`, others untouched, drift clears", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-closeout-int-"));
    const idxPath = path.join(tmp, "roadmap-index.json");
    const beforeIndex = {
      schemaVersion: "1.0",
      milestones: [
        { id: "OTHER", status: "complete", completed_units: 1, total_units: 1, completed_at: "2026-05-01T00:00:00Z" },
        { id: "TARGET-MS0", status: "not_started", completed_units: 0, total_units: 3 },
      ],
    };
    fs.writeFileSync(idxPath, JSON.stringify(beforeIndex));
    const envelope = { id: "TARGET-MS0", status: "completed", completed_units: 3, total_units: 3, updated_at: "2026-05-12T01:00:00Z" };

    // Pre-drift check
    const driftBefore = detectClosingDrift([envelope], beforeIndex.milestones);
    expect(driftBefore).toHaveLength(1);
    expect(driftBefore[0].id).toBe("TARGET-MS0");

    // Replicate the orchestrator's mutation (matches close-out-milestone.mjs:115-130).
    const idx = JSON.parse(fs.readFileSync(idxPath, "utf-8"));
    const entry = idx.milestones.find((m: { id: string }) => m.id === envelope.id);
    entry._legacyStatus = entry.status;
    entry.status = "complete"; // canonical index word
    entry.completed_units = envelope.completed_units;
    entry.completed_at = envelope.updated_at;
    idx.updated_at = new Date().toISOString();
    atomicWriteJson(idxPath, idx);

    const reread = JSON.parse(fs.readFileSync(idxPath, "utf-8"));
    const target = reread.milestones.find((m: { id: string }) => m.id === "TARGET-MS0");
    const other = reread.milestones.find((m: { id: string }) => m.id === "OTHER");

    expect(target.status).toBe("complete");
    expect(target.completed_units).toBe(3);
    expect(target._legacyStatus).toBe("not_started");
    expect(typeof target.completed_at).toBe("string");
    // Collateral check — OTHER must be byte-identical to before.
    expect(other.status).toBe("complete");
    expect(other.completed_units).toBe(1);
    expect(other.completed_at).toBe("2026-05-01T00:00:00Z");

    // Post-drift check — drift must now be empty for this fleet.
    const driftAfter = detectClosingDrift([envelope], reread.milestones);
    expect(driftAfter).toEqual([]);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

// ─── Subprocess: run each script's bundled --self-test ──────────────────────

describe("subprocess: bundled --self-test exit codes", () => {
  it("close-out-milestone.mjs --self-test exits 0", () => {
    const r = spawnSync(
      process.execPath,
      ["H:/prism/scripts/close-out-milestone.mjs", "--self-test"],
      { encoding: "utf8", timeout: 60_000 },
    );
    if (r.status !== 0) {
      // surface stderr/stdout in vitest output for debuggability
      console.error("orchestrator self-test stdout:", r.stdout);
      console.error("orchestrator self-test stderr:", r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/self-test:\s+\d+\s+passed,\s+0\s+failed/);
  });

  it("enforce-roadmap-closeout.mjs --self-test exits 0", () => {
    const r = spawnSync(
      process.execPath,
      ["H:/prism/.claude/hooks/enforce-roadmap-closeout.mjs", "--self-test"],
      { encoding: "utf8", timeout: 60_000 },
    );
    if (r.status !== 0) {
      console.error("hook self-test stdout:", r.stdout);
      console.error("hook self-test stderr:", r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/self-test:\s+\d+\s+passed,\s+0\s+failed/);
  });
});

// ─── Subprocess: Stop-hook integration with synthetic stdin ─────────────────

describe("subprocess: hook honors PRISM_CLOSEOUT_GATE_BYPASS=1", () => {
  it("bypass env short-circuits to continue:true even with live drift in the repo", () => {
    const r = spawnSync(
      process.execPath,
      ["H:/prism/.claude/hooks/enforce-roadmap-closeout.mjs"],
      {
        encoding: "utf8",
        input: JSON.stringify({ session_id: "vitest-bypass", hook_event_name: "Stop" }),
        env: { ...process.env, PRISM_CLOSEOUT_GATE_BYPASS: "1" },
        timeout: 30_000,
      },
    );
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.additionalContext).toMatch(/bypassed/i);
  });
});
