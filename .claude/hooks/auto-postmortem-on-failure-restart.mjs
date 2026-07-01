#!/usr/bin/env node
// tier: T4
/**
 * auto-postmortem-on-failure-restart.mjs — Stop hook
 *
 * OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE
 *
 * Watches Stop event telemetry. When the same session has logged ≥3
 * Stop attempts within a 5-minute rolling window AND the working tree
 * has uncommitted changes, fires AutoPostmortemEngine to write a
 * structured postmortem to knowledge/memories/mistakes/<date>-<sig>.md.
 *
 * Fail-safe: continueOnError. NEVER blocks Stop — telemetry-only.
 * Disable: PRISM_AUTO_POSTMORTEM=0.
 *
 * Trigger source: H:/prism/mcp-server/data/state/stop-events.jsonl
 *   appended by stop-events-record.mjs (sibling hook); each line:
 *   { ts, sessionId, uncommitted, errorSig?, filesTouched? }
 *
 * Falls back to inferring the current session's stops from the hook
 * input payload if the ledger is missing or empty (single-stop case).
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE
 */

import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";

const LEDGER = "H:/prism/mcp-server/data/state/stop-events.jsonl";
const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";
const ROLLING_WINDOW_MS = 5 * 60 * 1000;
const MIN_STOP_COUNT = 3;

function tele(decision, extra) {
  try {
    appendFileSync(
      TELEMETRY,
      JSON.stringify({ ts: new Date().toISOString(), hook: "auto-postmortem-on-failure-restart", decision, ...extra }) + "\n",
      "utf8",
    );
  } catch { /* never block on telemetry */ }
}

function readStdinSafe() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function readSessionStops(sessionId) {
  if (!existsSync(LEDGER)) return [];
  try {
    const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/).filter(Boolean);
    const cutoff = Date.now() - ROLLING_WINDOW_MS;
    const out = [];
    for (const l of lines) {
      let rec;
      try { rec = JSON.parse(l); } catch { continue; }
      if (rec.sessionId !== sessionId) continue;
      const ts = Date.parse(rec.ts);
      if (!Number.isFinite(ts) || ts < cutoff) continue;
      out.push({
        ts: rec.ts,
        uncommitted: !!rec.uncommitted,
        errorSig: rec.errorSig,
        filesTouched: Array.isArray(rec.filesTouched) ? rec.filesTouched : undefined,
      });
    }
    return out;
  } catch { return []; }
}

function gitWorktreeUncommitted() {
  try {
    const out = execSync("git status --porcelain=v1 2>nul", { windowsHide: true,
      cwd: "H:/prism", encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim().length > 0;
  } catch { return false; }
}

function gitRecentCommits(n = 3) {
  try {
    const out = execSync(`git log --oneline -${n} 2>nul`, { windowsHide: true,
      cwd: "H:/prism", encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"],
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch { return []; }
}

function appendStopRecord(sessionId, uncommitted, payload) {
  try {
    const rec = {
      ts: new Date().toISOString(),
      sessionId,
      uncommitted,
      errorSig: payload?.stop_reason ?? payload?.reason,
      filesTouched: payload?.files_touched,
    };
    appendFileSync(LEDGER, JSON.stringify(rec) + "\n", "utf8");
    return rec;
  } catch { return null; }
}

async function main() {
  if (process.env.PRISM_AUTO_POSTMORTEM === "0") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const raw = readStdinSafe();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { /* keep empty */ }

  const sessionId = payload.session_id ?? payload.sessionId ?? "unknown";
  const uncommitted = gitWorktreeUncommitted();

  // Record this stop event so future invocations can detect bursts.
  appendStopRecord(sessionId, uncommitted, payload);

  // Read all stops from this session in the rolling window.
  const sessionStops = readSessionStops(sessionId);

  if (sessionStops.length < MIN_STOP_COUNT) {
    tele("noop-too-few-stops", { count: sessionStops.length, sessionId });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (!sessionStops.some((e) => e.uncommitted)) {
    tele("noop-clean-stops", { count: sessionStops.length, sessionId });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Lazy-import the engine — avoid loading TS at every Stop.
  let autoPostmortemEngine;
  try {
    const mod = await import("file:///H:/prism/mcp-server/dist/engines/AutoPostmortemEngine.js")
      .catch(async () => {
        // Dev fallback: try tsx loader on the source.
        const tsx = await import("tsx/esm/api");
        return tsx.tsImport(
          "H:/prism/mcp-server/src/engines/AutoPostmortemEngine.ts",
          import.meta.url,
        );
      });
    autoPostmortemEngine = mod.autoPostmortemEngine;
  } catch (err) {
    tele("noop-engine-load-fail", { error: String(err?.message ?? err) });
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `[auto-postmortem] engine load failed: ${err?.message ?? err}`,
    }));
    return;
  }

  const recentCommits = gitRecentCommits(3);
  const result = autoPostmortemEngine.evaluate(
    { events: sessionStops, recentCommits, errorDescription: payload.error_description },
    { apply: true },
  );

  tele(result.action, {
    sessionId,
    signature: result.signature,
    path: result.path,
    stop_count: sessionStops.length,
  });

  // Always continue. The user's Stop is honored regardless.
  process.stdout.write(
    JSON.stringify({
      continue: true,
      systemMessage:
        result.action === "wrote"
          ? `📝 [auto-postmortem] Wrote ${result.path} (${sessionStops.length} stops, sig ${result.signature}). The vault talks back.`
          : undefined,
    }),
  );
}

main().catch((err) => {
  tele("error", { error: String(err?.message ?? err) });
  process.stdout.write(JSON.stringify({ continue: true }));
});
