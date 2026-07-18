// command-telemetry-record.test.mjs — node:test suite for the U-CK26
// PostToolUse Skill telemetry producer (.claude/hooks/command-telemetry-record.mjs).
//
// Verifies pure decision core (decideRecord), the injectable writer
// (recordViaPsk), chatId derivation (deriveChatId), AND ships TWO subprocess
// oracles per spec:
//   (1) hermetic-fake oracle — proves hook spawns psk with exact argv and
//       NEVER touches the live pipeline-telemetry.jsonl;
//   (2) real-writer E2E — proves producer→canonical-writer→jsonl wiring
//       end-to-end (closes the ghost-orphan class CK26 was opened to fix).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, statSync, chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

import {
  decideRecord,
  recordViaPsk,
  deriveChatId,
  main,
} from "../../../.claude/hooks/command-telemetry-record.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(__dirname, "..", "..", "..", ".claude", "hooks", "command-telemetry-record.mjs");
const PSK_REAL = resolve(__dirname, "..", "..", "..", ".claude", "kernel", "psk.mjs");
const LIVE_JSONL = resolve(__dirname, "..", "..", "..", "state", "shared", "pipeline-telemetry.jsonl");

// ────────────────────────────────────────────────────────────────────────
// decideRecord — pure core
// ────────────────────────────────────────────────────────────────────────

test("decideRecord: Skill tool with input.skill → record command_invoked", () => {
  const d = decideRecord({
    toolName: "Skill",
    toolInput: { skill: "checkin-foxtrot" },
    toolResponse: { content: [{ type: "text", text: "ok" }] },
  });
  assert.equal(d.shouldRecord, true);
  assert.equal(d.event, "command_invoked");
  assert.equal(d.command, "checkin-foxtrot");
  assert.equal(d.outcome, "ok");
  assert.equal(d.latency_ms, null);
});

test("decideRecord: non-Skill tool → no-op", () => {
  for (const name of ["Bash", "Read", "Edit", "Write", "Grep", "", undefined, null, 42]) {
    const d = decideRecord({ toolName: name, toolInput: { skill: "x" } });
    assert.equal(d.shouldRecord, false, `toolName=${JSON.stringify(name)} must not record`);
    assert.match(d.reason, /non-skill-tool/);
  }
});

test("decideRecord: Skill tool but missing skill name → fail-safe no-op (never garbage row)", () => {
  for (const input of [null, undefined, {}, { skill: "" }, { skill: "   " }, { skill: 42 },
                       { other_field: "x" }, "string-not-object"]) {
    const d = decideRecord({ toolName: "Skill", toolInput: input });
    assert.equal(d.shouldRecord, false, `input=${JSON.stringify(input)} must not record`);
  }
});

test("decideRecord: falls back to name / command field when skill absent", () => {
  const a = decideRecord({ toolName: "Skill", toolInput: { name: "fallback-name" } });
  assert.equal(a.shouldRecord, true);
  assert.equal(a.command, "fallback-name");
  const b = decideRecord({ toolName: "Skill", toolInput: { command: "fallback-cmd" } });
  assert.equal(b.shouldRecord, true);
  assert.equal(b.command, "fallback-cmd");
  // skill wins over name/command
  const c = decideRecord({ toolName: "Skill", toolInput: { skill: "winner", name: "loser" } });
  assert.equal(c.command, "winner");
});

test("decideRecord: outcome detection (ok / error / unknown)", () => {
  const ok = decideRecord({ toolName: "Skill", toolInput: { skill: "s" }, toolResponse: { content: [] } });
  assert.equal(ok.outcome, "ok");

  const err1 = decideRecord({ toolName: "Skill", toolInput: { skill: "s" }, toolResponse: { is_error: true } });
  assert.equal(err1.outcome, "error");

  const err2 = decideRecord({ toolName: "Skill", toolInput: { skill: "s" }, toolResponse: { error: "boom" } });
  assert.equal(err2.outcome, "error");

  const unknown = decideRecord({ toolName: "Skill", toolInput: { skill: "s" }, toolResponse: null });
  assert.equal(unknown.outcome, "unknown");

  // is_error not strictly true → still ok (only the exact sentinel triggers error)
  const okNotError = decideRecord({ toolName: "Skill", toolInput: { skill: "s" }, toolResponse: { is_error: false } });
  assert.equal(okNotError.outcome, "ok");
});

test("decideRecord: latency_ms passthrough (input + response), rejects NaN/Infinity/non-number", () => {
  const a = decideRecord({ toolName: "Skill", toolInput: { skill: "s", latency_ms: 123 } });
  assert.equal(a.latency_ms, 123);
  const b = decideRecord({ toolName: "Skill", toolInput: { skill: "s" }, toolResponse: { latency_ms: 456 } });
  assert.equal(b.latency_ms, 456);
  // input wins over response
  const c = decideRecord({ toolName: "Skill", toolInput: { skill: "s", latency_ms: 1 }, toolResponse: { latency_ms: 2 } });
  assert.equal(c.latency_ms, 1);
  // Adversarial
  for (const bad of [NaN, Infinity, -Infinity, "789", null, undefined, {}]) {
    const d = decideRecord({ toolName: "Skill", toolInput: { skill: "s", latency_ms: bad } });
    assert.equal(d.latency_ms, null, `latency_ms=${String(bad)} must not pass through`);
  }
});

test("decideRecord: oversize skill name clamped to 256 chars (DoS-safe)", () => {
  const huge = "x".repeat(10000);
  const d = decideRecord({ toolName: "Skill", toolInput: { skill: huge } });
  assert.equal(d.shouldRecord, true);
  assert.equal(d.command.length, 256);
});

test("decideRecord: adversarial top-level args do not throw", () => {
  for (const a of [undefined, null, "", 12345, [], "Skill"]) {
    const d = decideRecord(a);
    assert.equal(typeof d, "object");
    assert.equal(d.shouldRecord, false, `args=${JSON.stringify(a)} must not record`);
  }
});

// ────────────────────────────────────────────────────────────────────────
// deriveChatId — case-fold guard (mirrors slot-bind-enforce P0)
// ────────────────────────────────────────────────────────────────────────

test("deriveChatId: byte-matches sessionId.slice(0,8), NO case-fold", () => {
  assert.equal(deriveChatId("2D30AB0C-rest"), "claude-2D30AB0C",
    "case-fold would re-create the cross-chat-id divergence bug");
  assert.equal(deriveChatId("abc12345-foo"), "claude-abc12345");
  assert.equal(deriveChatId("12345678"), "claude-12345678");
});

test("deriveChatId: invalid sessionIds → null (never guesses)", () => {
  // Semantics match slot-bind-enforce.mjs — the first 8 chars must be
  // ASCII-alnum; non-alnum *within* the first 8 → null, but a non-alnum
  // suffix (uuid hyphen at position 9, or anything else after) is fine.
  for (const sid of [undefined, null, "", "short", "1234567", 12345, {}, [], NaN,
                     "with spa", "!@#$%^&*", "abcd!fgh"]) {
    assert.equal(deriveChatId(sid), null, `sid=${JSON.stringify(sid)} must yield null`);
  }
  // Real-shape uuid4 session_ids → claude-<first8> (canonical form).
  assert.equal(deriveChatId("deadbeef-1234-5678"), "claude-deadbeef");
  assert.equal(deriveChatId("f09b33aa-foo!@#"), "claude-f09b33aa");
});

// ────────────────────────────────────────────────────────────────────────
// recordViaPsk — injectable writer
// ────────────────────────────────────────────────────────────────────────

test("recordViaPsk: builds correct argv and uses detached spawn", () => {
  let captured = null;
  const fakeSpawn = (bin, argv, opts) => {
    captured = { bin, argv, opts };
    return { unref() { /* noop */ } };
  };
  const r = recordViaPsk(
    { event: "command_invoked", command: "skill-x", outcome: "ok", latency_ms: 42, chatId: "claude-deadbeef" },
    { pskPath: "/fake/psk.mjs", spawnImpl: fakeSpawn, nodeBin: "/fake/node" }
  );
  assert.equal(r.ok, true);
  assert.equal(captured.bin, "/fake/node");
  // ARM-B P1 FIX: string-valued flags use `--key=value` form so a value
  // starting with `--` cannot collide with psk's argv parser.
  assert.deepEqual(captured.argv, [
    "/fake/psk.mjs", "record",
    "--event=command_invoked",
    "--command=skill-x",
    "--outcome=ok",
    "--latency_ms", "42",
    `--extra=${JSON.stringify({ chatId: "claude-deadbeef" })}`,
  ]);
  assert.equal(captured.opts.detached, true);
  assert.equal(captured.opts.stdio, "ignore");
});

test("recordViaPsk: P1 GUARD — command starting with `--` does NOT collide with psk argv parser", () => {
  // Regression oracle for the ARM-B P1 finding: a skill literally named
  // `--telemetry-file` (or any `--<flag>` name) MUST NOT be treated by psk
  // as a new flag. The `=` form makes this lexically impossible.
  let captured = null;
  const fakeSpawn = (bin, argv) => { captured = argv; return { unref() {} }; };
  recordViaPsk(
    { event: "command_invoked", command: "--telemetry-file", outcome: "ok", latency_ms: null },
    { pskPath: "/p", spawnImpl: fakeSpawn, nodeBin: "/n" }
  );
  // The command must appear AFTER the `=` not as a separate argv (which
  // psk would re-parse as a flag).
  assert.ok(captured.includes("--command=--telemetry-file"));
  // And NEVER bare:
  assert.equal(captured.includes("--command"), false,
    "bare --command argv re-introduces the P1 collision class");
});

test("recordViaPsk: omits --latency_ms and --extra when null/absent", () => {
  let captured = null;
  const fakeSpawn = (bin, argv) => { captured = argv; return { unref() {} }; };
  recordViaPsk(
    { event: "command_invoked", command: "s", outcome: "ok", latency_ms: null },
    { pskPath: "/p", spawnImpl: fakeSpawn, nodeBin: "/n" }
  );
  assert.equal(captured.includes("--latency_ms"), false);
  assert.equal(captured.includes("--extra"), false);
});

test("recordViaPsk: spawn throw → ok:false, never bubbles", () => {
  const r = recordViaPsk(
    { event: "command_invoked", command: "s", outcome: "ok", latency_ms: null },
    { pskPath: "/p", spawnImpl: () => { throw new Error("ENOENT"); }, nodeBin: "/n" }
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /ENOENT/);
});

// ────────────────────────────────────────────────────────────────────────
// main — programmatic invocation with injected stdin / env
// ────────────────────────────────────────────────────────────────────────

test("main: PRISM_CMD_TELEMETRY_DISABLE=1 → inert no-op (no spawn)", async () => {
  let spawnCalled = false;
  const stdout = [];
  const r = await main({
    readStdin: () => JSON.stringify({ tool_name: "Skill", tool_input: { skill: "s" } }),
    stdoutWrite: (s) => stdout.push(s),
    env: { PRISM_CMD_TELEMETRY_DISABLE: "1" },
    spawnImpl: () => { spawnCalled = true; return { unref() {} }; },
  });
  assert.equal(r.acted, false);
  assert.equal(r.reason, "disabled");
  assert.equal(spawnCalled, false);
  assert.match(stdout.join(""), /"continue":true/);
});

test("main: malformed stdin → ack + no-op (never throws)", async () => {
  const stdout = [];
  const r = await main({
    readStdin: () => "not-json{",
    stdoutWrite: (s) => stdout.push(s),
    env: {},
    spawnImpl: () => { throw new Error("should not reach"); },
  });
  assert.equal(r.acted, false);
  assert.match(stdout.join(""), /"continue":true/);
});

test("main: valid Skill payload → spawns + acks", async () => {
  let spawnedArgv = null;
  const stdout = [];
  const r = await main({
    readStdin: () => JSON.stringify({
      session_id: "abcd1234-rest",
      tool_name: "Skill",
      tool_input: { skill: "checkin-foxtrot" },
      tool_response: { content: [] },
    }),
    stdoutWrite: (s) => stdout.push(s),
    env: {},
    spawnImpl: (bin, argv) => { spawnedArgv = argv; return { unref() {} }; },
    nodeBin: "/fake/node",
  });
  assert.equal(r.acted, true);
  assert.equal(r.chatId, "claude-abcd1234");
  assert.ok(spawnedArgv);
  // `--key=value` form per ARM-B P1 fix.
  assert.ok(spawnedArgv.includes("--event=command_invoked"));
  assert.ok(spawnedArgv.includes("--command=checkin-foxtrot"));
  assert.ok(spawnedArgv.some((a) => typeof a === "string" && a.startsWith("--extra=")));
  assert.match(stdout.join(""), /"continue":true/);
});

// ────────────────────────────────────────────────────────────────────────
// (1) Subprocess oracle — hermetic fake psk + assert LIVE jsonl untouched
// ────────────────────────────────────────────────────────────────────────

test("E2E hermetic: spawned hook invokes psk fake with exact argv; LIVE jsonl untouched", () => {
  const tdir = mkdtempSync(join(tmpdir(), "ck26-hermetic-"));
  try {
    const fakePsk = join(tdir, "psk-fake.mjs");
    const captureFile = join(tdir, "captured-argv.json");
    // Hermetic fake: write the received argv to a file then exit. NEVER
    // touches pipeline-telemetry.jsonl.
    writeFileSync(fakePsk, `
import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(captureFile)}, JSON.stringify(process.argv.slice(2)));
process.exit(0);
`, "utf8");

    // Snapshot the live jsonl mtime BEFORE the hook runs so we can assert
    // it is NOT touched. If absent, snapshot null.
    const beforeMtime = existsSync(LIVE_JSONL) ? statSync(LIVE_JSONL).mtimeMs : null;
    const beforeSize  = existsSync(LIVE_JSONL) ? statSync(LIVE_JSONL).size : null;

    const payload = JSON.stringify({
      session_id: "fffeeed1-x",
      tool_name: "Skill",
      tool_input: { skill: "test-hermetic-skill", latency_ms: 17 },
      tool_response: { content: [] },
    });
    // ARM-B P1 FIX: explicitly UNSET PRISM_TELEMETRY_PATH so a parent-env
    // override (CI / dev shell) cannot retarget the LIVE jsonl snapshot
    // oracle. The fake psk doesn't honor the env anyway, but a future
    // regression where the hook writes the jsonl directly would silently
    // pass otherwise.
    const hermeticEnv = { ...process.env, PRISM_CMD_TELEMETRY_PSK: fakePsk };
    delete hermeticEnv.PRISM_TELEMETRY_PATH;
    const result = spawnSync(process.execPath, [HOOK], {
      input: payload,
      env: hermeticEnv,
      encoding: "utf8",
      timeout: 10000,
    });

    assert.equal(result.status, 0, `hook exit non-zero: ${result.stderr}`);
    assert.match(result.stdout, /"continue":true/);

    // The hook spawns the writer DETACHED — wait briefly for the child to
    // flush and exit. 1500ms is plenty for a node startup + writeFileSync.
    const deadline = Date.now() + 3000;
    while (!existsSync(captureFile) && Date.now() < deadline) {
      // tiny spin (no async sleep in node:test sync test)
      spawnSync(process.execPath, ["-e", "setTimeout(()=>process.exit(0), 50)"]);
    }
    assert.ok(existsSync(captureFile), "fake psk was not invoked (capture file missing)");
    const captured = JSON.parse(readFileSync(captureFile, "utf8"));
    // ARM-B P1 FIX: `--key=value` form is the new contract.
    assert.equal(captured[0], "record");
    assert.ok(captured.includes("--event=command_invoked"));
    assert.ok(captured.includes("--command=test-hermetic-skill"));
    // No BARE --command (would re-introduce the argv-collision class).
    assert.equal(captured.includes("--command"), false);
    assert.ok(captured.includes("--latency_ms"));
    const latIdx = captured.indexOf("--latency_ms");
    assert.equal(captured[latIdx + 1], "17");

    // The LIVE jsonl must be untouched (this is the load-bearing assertion
    // the test seam exists for).
    if (beforeMtime !== null) {
      const afterMtime = statSync(LIVE_JSONL).mtimeMs;
      const afterSize  = statSync(LIVE_JSONL).size;
      assert.equal(afterMtime, beforeMtime, "LIVE pipeline-telemetry.jsonl mtime changed — test seam leaked");
      assert.equal(afterSize, beforeSize, "LIVE pipeline-telemetry.jsonl size changed — test seam leaked");
    }
  } finally {
    rmSync(tdir, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────────────────────────────
// (2) Real-writer E2E — point at REAL psk + tmpdir telemetry; assert real
// command_invoked line lands (closes the ghost-orphan class).
// ────────────────────────────────────────────────────────────────────────

test("E2E real-writer: producer → canonical psk.mjs → tmpdir jsonl emits real command_invoked event", () => {
  const tdir = mkdtempSync(join(tmpdir(), "ck26-real-"));
  try {
    const tmpJsonl = join(tdir, "pipeline-telemetry.jsonl");

    const payload = JSON.stringify({
      session_id: "11112222-rest",
      tool_name: "Skill",
      tool_input: { skill: "test-real-skill" },
      tool_response: { content: [] },
    });
    const result = spawnSync(process.execPath, [HOOK], {
      input: payload,
      env: {
        ...process.env,
        // Use REAL psk; redirect its output to our tmp jsonl via the
        // existing PRISM_TELEMETRY_PATH knob.
        PRISM_TELEMETRY_PATH: tmpJsonl,
      },
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.status, 0, `hook exit non-zero: ${result.stderr}`);
    assert.match(result.stdout, /"continue":true/);

    // Wait for the detached psk writer to flush.
    const deadline = Date.now() + 5000;
    while (!existsSync(tmpJsonl) && Date.now() < deadline) {
      spawnSync(process.execPath, ["-e", "setTimeout(()=>process.exit(0), 75)"]);
    }
    assert.ok(existsSync(tmpJsonl), "real psk writer never produced the tmp jsonl");
    const lines = readFileSync(tmpJsonl, "utf8").trim().split(/\n+/).filter(Boolean);
    assert.ok(lines.length >= 1, `expected ≥1 event, got ${lines.length}`);
    const entry = JSON.parse(lines[lines.length - 1]);
    assert.equal(entry.event, "command_invoked",
      "ghost-orphan class NOT closed — producer→canonical-writer wiring broken");
    assert.equal(entry.command, "test-real-skill");
    assert.equal(entry.outcome, "ok");
    // extra is serialized JSON string per kernel contract; chatId inside.
    assert.ok(entry.extra && entry.extra.includes("claude-11112222"));
  } finally {
    rmSync(tdir, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────────────────────────────
// FAIL-ON-REVERT regression guards (the small load-bearing invariants)
// ────────────────────────────────────────────────────────────────────────

test("REGRESSION: hook does NOT use spawnSync (latency-killer guard)", () => {
  const src = readFileSync(HOOK, "utf8");
  // Strip comments cheaply
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.equal(/\bspawnSync\b/.test(stripped), false,
    "spawnSync re-introduced in hook source — would block the fleet hot path");
});

test("REGRESSION: hook stdio is 'ignore' (cannot leak child stdout into harness)", () => {
  const src = readFileSync(HOOK, "utf8");
  assert.match(src, /stdio:\s*"ignore"/, "stdio:'ignore' invariant removed");
  assert.match(src, /detached:\s*true/, "detached:true invariant removed");
});

test("REGRESSION: deriveChatId source contains NO toLowerCase (case-fold revert guard)", () => {
  const src = readFileSync(HOOK, "utf8");
  // Match only inside the deriveChatId function body.
  const m = src.match(/export function deriveChatId\([\s\S]*?\n\}/);
  assert.ok(m, "deriveChatId function not found");
  assert.equal(/toLowerCase/.test(m[0]), false,
    "toLowerCase re-added to deriveChatId — re-creates cross-chat-id divergence");
});
