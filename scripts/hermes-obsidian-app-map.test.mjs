// scripts/hermes-obsidian-app-map.test.mjs
// Tests for the Hermes+Obsidian blind-mapping observability surface.
// Real reference values from the live 2026-06-08 app state (config v0/latest 28,
// the 400 extra-usage error, the claude-opus-4-8 turn) — not stubs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  redactSecret,
  summarizeHermesStatus,
  classifyConfigDrift,
  extractLastTurn,
  extractFreshestError,
  buildMapReport,
} from "./hermes-obsidian-app-map.mjs";

// ---------- redactSecret ----------
test("redactSecret keeps 4-char prefix + length, never the full secret", () => {
  const key = "17618a35131fb454a54c89853ccc75ee618b9eeecd26e272a7b73b771a45dfd4";
  const out = redactSecret(key);
  assert.equal(out, "1761…(64 chars, redacted)");
  assert.ok(!out.includes(key.slice(4)), "must not leak the body of the secret");
});
test("redactSecret reports absent for null/empty", () => {
  assert.equal(redactSecret(null), "(absent)");
  assert.equal(redactSecret(undefined), "(absent)");
  assert.equal(redactSecret(""), "(absent)");
});

// ---------- summarizeHermesStatus ----------
test("summarizeHermesStatus maps the real live /api/status payload", () => {
  const live = {
    version: "0.16.0", release_date: "2026.6.5",
    config_version: 0, latest_config_version: 28,
    gateway_running: false, gateway_pid: null, gateway_state: null, gateway_exit_reason: null,
    active_sessions: 0, auth_required: false, auth_providers: [],
  };
  const s = summarizeHermesStatus(live);
  assert.equal(s.reachable, true);
  assert.equal(s.version, "0.16.0");
  assert.equal(s.gatewayRunning, false);
  assert.equal(s.configVersion, 0);
  assert.equal(s.latestConfigVersion, 28);
  assert.equal(s.activeSessions, 0);
  assert.equal(s.authRequired, false);
});
test("summarizeHermesStatus reports unreachable on null/non-object", () => {
  assert.equal(summarizeHermesStatus(null).reachable, false);
  assert.equal(summarizeHermesStatus(undefined).reachable, false);
  assert.equal(summarizeHermesStatus("nope").reachable, false);
});
test("summarizeHermesStatus treats gateway_running:true as running, missing as not", () => {
  assert.equal(summarizeHermesStatus({ gateway_running: true }).gatewayRunning, true);
  assert.equal(summarizeHermesStatus({}).gatewayRunning, false); // absent → false, not undefined
});

// ---------- classifyConfigDrift ----------
test("classifyConfigDrift flags the real v0-vs-v28 gap as behind", () => {
  const d = classifyConfigDrift(0, 28);
  assert.equal(d.ok, false);
  assert.equal(d.drift, 28);
  assert.equal(d.severity, "behind");
  assert.match(d.note, /28 version\(s\) behind/);
});
test("classifyConfigDrift ok when current >= latest", () => {
  assert.equal(classifyConfigDrift(28, 28).ok, true);
  assert.equal(classifyConfigDrift(29, 28).ok, true); // ahead is still ok (drift clamped to 0)
  assert.equal(classifyConfigDrift(28, 28).drift, 0);
});
test("classifyConfigDrift unknown when versions not numbers", () => {
  assert.equal(classifyConfigDrift(undefined, 28).severity, "unknown");
  assert.equal(classifyConfigDrift(0, undefined).severity, "unknown");
});

// ---------- extractLastTurn ----------
test("extractLastTurn pulls model/provider/msg from the real agent.log line", () => {
  const log = [
    "2026-06-08 11:20:05,798 INFO tui_gateway.ws: ws accepted peer=127.0.0.1:14147",
    "2026-06-08 11:26:41,512 INFO [20260608_112639_7c8934] agent.conversation_loop: conversation turn: session=20260608_112639_7c8934 model=claude-opus-4-8 provider=anthropic platform=tui history=0 msg='are you setup fully now to run the prism fleet?'",
  ].join("\n");
  const t = extractLastTurn(log);
  assert.equal(t.model, "claude-opus-4-8");
  assert.equal(t.provider, "anthropic");
  assert.equal(t.msg, "are you setup fully now to run the prism fleet?");
});
test("extractLastTurn returns the LAST turn when several exist", () => {
  const log = [
    "conversation turn: session=a model=qwen2.5-coder:32b provider=openai msg='first'",
    "conversation turn: session=b model=claude-opus-4-8 provider=anthropic msg='second'",
  ].join("\n");
  assert.equal(extractLastTurn(log).msg, "second");
  assert.equal(extractLastTurn(log).model, "claude-opus-4-8");
});
test("extractLastTurn null on empty / no-match / non-string", () => {
  assert.equal(extractLastTurn(""), null);
  assert.equal(extractLastTurn("no turns here"), null);
  assert.equal(extractLastTurn(null), null);
});

// ---------- extractFreshestError ----------
test("extractFreshestError pulls the real 400 extra-usage error + http code", () => {
  const log = [
    "2026-06-08 11:26:41,512 INFO conversation turn: model=claude-opus-4-8",
    "2026-06-08 11:26:45,844 ERROR [20260608_112639_7c8934] agent.conversation_loop: Non-retryable client error: Error code: 400 - third-party extra usage",
  ].join("\n");
  const e = extractFreshestError(log);
  assert.equal(e.http, 400);
  assert.match(e.line, /Non-retryable/);
});
test("extractFreshestError returns the LAST error, with error_type kind", () => {
  const log = [
    "WARNING something error_type=TimeoutError happened",
    "WARNING later error_type=BadRequestError HTTP 429 happened",
  ].join("\n");
  const e = extractFreshestError(log);
  assert.equal(e.kind, "BadRequestError");
  assert.equal(e.http, 429);
});
test("extractFreshestError null when no error lines", () => {
  assert.equal(extractFreshestError("INFO all good\nINFO still good"), null);
  assert.equal(extractFreshestError(""), null);
});

// ---------- buildMapReport (integration of the pure parts) ----------
test("buildMapReport surfaces the real triple-blocker (gateway down + config drift + 400)", () => {
  const hermes = {
    status: summarizeHermesStatus({
      version: "0.16.0", config_version: 0, latest_config_version: 28,
      gateway_running: false, active_sessions: 0, auth_required: false,
    }),
    lastTurn: { model: "claude-opus-4-8", provider: "anthropic", msg: "hi" },
    lastError: { line: "Error code: 400 - Third-party apps now draw from your extra usage, not your plan limits", http: 400 },
  };
  const obsidian = { reachable: true, apiKey: "1761…(64 chars, redacted)", activeNoteReadable: false, syncLock: false };
  const r = buildMapReport({ hermes, obsidian, processes: null, stampIso: null });
  // all three known blockers present
  assert.ok(r.blockers.some((b) => /GATEWAY is not running/.test(b)), "gateway blocker");
  assert.ok(r.blockers.some((b) => /version\(s\) behind/.test(b)), "config-drift blocker");
  assert.ok(r.blockers.some((b) => /extra-usage/.test(b)), "400 extra-usage blocker");
  assert.equal(r.configDrift.drift, 28);
});
test("buildMapReport surfaces Obsidian-down blocker, none when healthy", () => {
  const healthyHermes = {
    status: summarizeHermesStatus({ version: "0.16.0", config_version: 28, latest_config_version: 28, gateway_running: true }),
    lastTurn: null, lastError: null,
  };
  const down = buildMapReport({ hermes: healthyHermes, obsidian: { reachable: false, reason: "timeout", syncLock: false }, processes: null });
  assert.ok(down.blockers.some((b) => /Obsidian REST API .* DOWN/.test(b)));
  const up = buildMapReport({ hermes: healthyHermes, obsidian: { reachable: true, syncLock: false }, processes: null });
  assert.equal(up.blockers.length, 0, "no blockers when both apps healthy + config current");
});
test("buildMapReport flags a DOWN Hermes as a blocker, never silent-healthy", () => {
  // Regression: a down app previously read as "No blockers detected" because the
  // reachable-only checks were vacuously false. An unreachable app IS a blocker.
  const hermes = { status: summarizeHermesStatus(null), lastTurn: null, lastError: null };
  const r = buildMapReport({ hermes, obsidian: { reachable: true, syncLock: false }, processes: null });
  assert.ok(r.blockers.some((b) => /UNREACHABLE/.test(b)), "down Hermes must surface an UNREACHABLE blocker");
  assert.ok(r.blockers.length >= 1, "a down app is never zero-blocker");
});

test("buildMapReport flags 429 distinctly from 400", () => {
  const hermes = {
    status: summarizeHermesStatus({ config_version: 28, latest_config_version: 28, gateway_running: true }),
    lastTurn: null, lastError: { line: "Error code: 429 rate limited", http: 429 },
  };
  const r = buildMapReport({ hermes, obsidian: { reachable: true, syncLock: false }, processes: null });
  assert.ok(r.blockers.some((b) => /429.*rate-limited/.test(b)));
  assert.ok(!r.blockers.some((b) => /extra-usage/.test(b)), "429 must not be misreported as the 400 billing blocker");
});
