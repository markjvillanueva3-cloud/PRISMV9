/**
 * psk-u-ck29.test.mjs — U-CK29 cross-session learning loop tests.
 *
 * Closes COMMAND-KERNEL-MS0/U-CK29:
 *   1. outcome events route to telemetry + os/sessions/<sid>.jsonl journal
 *   2. recommend retrieves analogies from those journals
 *   3. cross-session loop is closed end-to-end
 *
 * Hermetic: PRISM_OS_SESSIONS_DIR + PRISM_TELEMETRY_PATH redirect every
 * append target into a tmpdir so the live state/shared/ isn't polluted.
 *
 * Run: node --test .claude/kernel/psk-u-ck29.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dispatch } from "./psk.mjs";

function makeTmp(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `psk-u-ck29-${label}-`));
}
async function withEnv(envOverrides, fn) {
  const prev = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    prev[k] = process.env[k];
    if (v == null) { delete process.env[k]; } else { process.env[k] = v; }
  }
  // Must `await` fn() before the finally — otherwise the finally fires
  // synchronously and restores the env BEFORE fn's awaits resolve, so any
  // post-first-await env read in fn picks up the restored default.
  try { return await fn(); } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v == null) { delete process.env[k]; } else { process.env[k] = v; }
    }
  }
}

// --------------------------------------------------------------------------
// JOURNALING — record(event:"outcome") tees to os/sessions/<sid>.jsonl
// --------------------------------------------------------------------------
test("record event=outcome tees to session journal when sessionId is given", async () => {
  const sessionsDir = makeTmp("journal-tee");
  const tmpTel = path.join(makeTmp("tel"), "telemetry.jsonl");
  await withEnv(
    { PRISM_OS_SESSIONS_DIR: sessionsDir, PRISM_TELEMETRY_PATH: tmpTel },
    async () => {
      const r = await dispatch("record", {
        event: "outcome",
        command: "/forge-triple",
        outcome: "success",
        sessionId: "claude-aaaa1111",
      });
      assert.equal(r.ok, true);
      assert.equal(r.result.sessionJournalWritten, true);
      assert.ok(r.result.sessionJournalFile?.endsWith("claude-aaaa1111.jsonl"));
      const journal = fs.readFileSync(r.result.sessionJournalFile, "utf8");
      const e = JSON.parse(journal.trim());
      assert.equal(e.event, "outcome");
      assert.equal(e.command, "/forge-triple");
      assert.equal(e.outcome, "success");
      assert.equal(e.sessionId, "claude-aaaa1111");
    },
  );
});

test("record event=non-outcome does NOT touch the session journal", async () => {
  const sessionsDir = makeTmp("no-tee");
  const tmpTel = path.join(makeTmp("tel"), "telemetry.jsonl");
  await withEnv(
    { PRISM_OS_SESSIONS_DIR: sessionsDir, PRISM_TELEMETRY_PATH: tmpTel },
    async () => {
      const r = await dispatch("record", {
        event: "fire", command: "/some-skill", outcome: "success",
        sessionId: "claude-bbbb2222",
      });
      assert.equal(r.ok, true);
      assert.equal(r.result.sessionJournalWritten, false);
      assert.equal(r.result.sessionJournalFile, null);
      // No file should have been created in the sessions dir.
      const files = fs.readdirSync(sessionsDir);
      assert.deepEqual(files, []);
    },
  );
});

test("record event=outcome without sessionId still writes telemetry, no journal", async () => {
  const sessionsDir = makeTmp("no-sid");
  const tmpTel = path.join(makeTmp("tel"), "telemetry.jsonl");
  await withEnv(
    { PRISM_OS_SESSIONS_DIR: sessionsDir, PRISM_TELEMETRY_PATH: tmpTel },
    async () => {
      const r = await dispatch("record", {
        event: "outcome", command: "/x", outcome: "success",
      });
      assert.equal(r.ok, true);
      assert.equal(r.result.sessionJournalWritten, false);
      assert.equal(r.result.sessionJournalFile, null);
      // Telemetry still landed.
      assert.ok(fs.existsSync(tmpTel));
    },
  );
});

test("record rejects directory-traversal sessionId via SESSION_ID_RE", async () => {
  const sessionsDir = makeTmp("bad-sid");
  const tmpTel = path.join(makeTmp("tel"), "telemetry.jsonl");
  await withEnv(
    { PRISM_OS_SESSIONS_DIR: sessionsDir, PRISM_TELEMETRY_PATH: tmpTel },
    async () => {
      const r = await dispatch("record", {
        event: "outcome", command: "/x", outcome: "success",
        sessionId: "../../etc/passwd",
      });
      assert.equal(r.ok, true, "telemetry path still landed");
      assert.equal(r.result.sessionJournalWritten, false);
      assert.match(r.result.sessionJournalError ?? "", /invalid sessionId/);
      // No file written under the (legitimate) sessions dir.
      assert.deepEqual(fs.readdirSync(sessionsDir), []);
    },
  );
});

test("record outcome — multiple entries append, not overwrite", async () => {
  const sessionsDir = makeTmp("append");
  const tmpTel = path.join(makeTmp("tel"), "telemetry.jsonl");
  await withEnv(
    { PRISM_OS_SESSIONS_DIR: sessionsDir, PRISM_TELEMETRY_PATH: tmpTel },
    async () => {
      for (let i = 0; i < 3; i++) {
        await dispatch("record", {
          event: "outcome", command: `/cmd${i}`, outcome: "success",
          sessionId: "claude-cccc3333",
        });
      }
      const journal = path.join(sessionsDir, "claude-cccc3333.jsonl");
      const lines = fs.readFileSync(journal, "utf8").trim().split("\n");
      assert.equal(lines.length, 3);
      const cmds = lines.map((l) => JSON.parse(l).command);
      assert.deepEqual(cmds, ["/cmd0", "/cmd1", "/cmd2"]);
    },
  );
});

// --------------------------------------------------------------------------
// RETRIEVAL — recommend reads journals + scores by keyword overlap
// --------------------------------------------------------------------------
async function seedJournal(sessionsDir, sid, entries) {
  const file = path.join(sessionsDir, `${sid}.jsonl`);
  const lines = entries.map((e) => JSON.stringify({ ...e, sessionId: sid })).join("\n") + "\n";
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(file, lines, "utf8");
  return file;
}

test("recommend returns analogies matching a query keyword, sorted by score", async () => {
  const sessionsDir = makeTmp("retrieve");
  await seedJournal(sessionsDir, "claude-dddd4444", [
    { ts: "2026-05-19T10:00:00Z", event: "outcome", command: "/forge-triple deflection engine", outcome: "success" },
    { ts: "2026-05-19T11:00:00Z", event: "outcome", command: "/scrutinize cad", outcome: "success" },
    { ts: "2026-05-19T12:00:00Z", event: "outcome", command: "/forge-triple deflection beam", outcome: "failure" },
    { ts: "2026-05-19T13:00:00Z", event: "fire", command: "/noise", outcome: "success" }, // not outcome
  ]);
  await withEnv({ PRISM_OS_SESSIONS_DIR: sessionsDir }, async () => {
    const r = await dispatch("recommend", { query: "deflection forge", k: 5 });
    assert.equal(r.ok, true);
    assert.equal(r.result.returned, 2);
    assert.equal(r.result.scanned, 4);
    // Both deflection-forge entries should score 2 (deflection + forge); event=fire excluded.
    assert.ok(r.result.analogies.every((a) => a.score === 2));
    // Tie-break newest first → /forge-triple deflection beam (12:00) before engine (10:00).
    assert.match(r.result.analogies[0].command, /beam/);
  });
});

test("recommend with no query returns top-K by recency (all outcomes)", async () => {
  const sessionsDir = makeTmp("noquery");
  await seedJournal(sessionsDir, "claude-eeee5555", [
    { ts: "2026-05-19T10:00:00Z", event: "outcome", command: "/a", outcome: "success" },
    { ts: "2026-05-19T12:00:00Z", event: "outcome", command: "/b", outcome: "success" },
    { ts: "2026-05-19T11:00:00Z", event: "outcome", command: "/c", outcome: "success" },
  ]);
  await withEnv({ PRISM_OS_SESSIONS_DIR: sessionsDir }, async () => {
    const r = await dispatch("recommend", { k: 2 });
    assert.equal(r.ok, true);
    assert.equal(r.result.returned, 2);
    // No query → all kept (score==0), recency tie-break → /b then /c.
    assert.equal(r.result.analogies[0].command, "/b");
    assert.equal(r.result.analogies[1].command, "/c");
  });
});

test("recommend k is clamped to RECOMMEND_MAX_K and to ≥1", async () => {
  const sessionsDir = makeTmp("kclamp");
  await seedJournal(sessionsDir, "claude-ffff6666", [
    { ts: "2026-05-19T10:00:00Z", event: "outcome", command: "/x", outcome: "success" },
  ]);
  await withEnv({ PRISM_OS_SESSIONS_DIR: sessionsDir }, async () => {
    const rHuge = await dispatch("recommend", { k: 999999 });
    assert.equal(rHuge.ok, true);
    assert.equal(rHuge.result.k, 50);
    const rNeg = await dispatch("recommend", { k: -5 });
    assert.equal(rNeg.result.k, 1);
    const rBad = await dispatch("recommend", { k: "lots" });
    assert.equal(rBad.result.k, 5, "non-number k falls back to default 5");
  });
});

test("recommend returns empty analogies when no journals exist", async () => {
  const sessionsDir = path.join(makeTmp("empty"), "no-such-subdir");
  await withEnv({ PRISM_OS_SESSIONS_DIR: sessionsDir }, async () => {
    const r = await dispatch("recommend", { query: "anything" });
    assert.equal(r.ok, true);
    assert.deepEqual(r.result.analogies, []);
    assert.equal(r.result.available.sessionsDir, false);
  });
});

test("recommend skips malformed JSONL lines without throwing", async () => {
  const sessionsDir = makeTmp("malformed");
  const file = path.join(sessionsDir, "claude-gggg7777.jsonl");
  fs.writeFileSync(file,
    [
      '{"ts":"2026-05-19T10:00:00Z","event":"outcome","command":"/good","outcome":"success"}',
      "{this is not json}",
      "",
      '{"ts":"2026-05-19T11:00:00Z","event":"outcome","command":"/also-good","outcome":"success"}',
    ].join("\n") + "\n",
    "utf8",
  );
  await withEnv({ PRISM_OS_SESSIONS_DIR: sessionsDir }, async () => {
    const r = await dispatch("recommend", {});
    assert.equal(r.ok, true);
    assert.equal(r.result.returned, 2, "two good lines surface; bad line silently skipped");
  });
});

// --------------------------------------------------------------------------
// END-TO-END — record then recommend, same process, no shared globals
// --------------------------------------------------------------------------
test("end-to-end: record outcomes then recommend retrieves them by query", async () => {
  const sessionsDir = makeTmp("e2e");
  const tmpTel = path.join(makeTmp("tel"), "telemetry.jsonl");
  await withEnv(
    { PRISM_OS_SESSIONS_DIR: sessionsDir, PRISM_TELEMETRY_PATH: tmpTel },
    async () => {
      await dispatch("record", {
        event: "outcome", command: "/dedup engine", outcome: "success",
        sessionId: "claude-hhhh8888",
      });
      await dispatch("record", {
        event: "outcome", command: "/forge-triple dedup", outcome: "success",
        sessionId: "claude-hhhh8888",
      });
      const r = await dispatch("recommend", { query: "dedup", k: 3 });
      assert.equal(r.ok, true);
      assert.equal(r.result.returned, 2);
      assert.ok(r.result.analogies.every((a) => /dedup/.test(a.command)));
      assert.ok(r.result.analogies.every((a) => a.sessionId === "claude-hhhh8888"));
    },
  );
});

test("end-to-end: recommend pulls analogies across MULTIPLE sessions", async () => {
  const sessionsDir = makeTmp("multi");
  await seedJournal(sessionsDir, "claude-iiii9999", [
    { ts: "2026-05-19T10:00:00Z", event: "outcome", command: "/handoff write", outcome: "success" },
  ]);
  await seedJournal(sessionsDir, "claude-jjjjaaaa", [
    { ts: "2026-05-19T11:00:00Z", event: "outcome", command: "/handoff read", outcome: "success" },
  ]);
  await withEnv({ PRISM_OS_SESSIONS_DIR: sessionsDir }, async () => {
    const r = await dispatch("recommend", { query: "handoff", k: 5 });
    assert.equal(r.ok, true);
    assert.equal(r.result.returned, 2);
    const sids = r.result.analogies.map((a) => a.sessionId).sort();
    assert.deepEqual(sids, ["claude-iiii9999", "claude-jjjjaaaa"]);
  });
});
