/**
 * CrossTerminalBroadcastEngine — real-value contract tests
 * =======================================================
 *
 * Closes the test gap for COORD-MS0/U-COORD08 (Add /broadcast Command).
 * Covers the existing broadcast() / getRecentEvents() / hasRegistryChanged()
 * surfaces plus the newly-added operator-message broadcast method.
 *
 * @milestone COORD-MS0 / U-COORD08
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CrossTerminalBroadcastEngine,
  crossTerminalBroadcastEngine,
  TRIM_LINE_CAP,
  TRIM_BYTE_FLOOR,
  type BroadcastEvent,
  type OperatorMessageType,
} from "../engines/CrossTerminalBroadcastEngine.js";

function makeTempChannel(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-broadcast-"));
  return path.join(dir, "BROADCAST_CHANNEL.jsonl");
}

function readChannelLines(file: string): BroadcastEvent[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as BroadcastEvent);
}

describe("CrossTerminalBroadcastEngine", () => {
  let engine: CrossTerminalBroadcastEngine;
  let channel: string;

  beforeEach(() => {
    engine = new CrossTerminalBroadcastEngine();
    channel = makeTempChannel();
    engine._setBroadcastPath(channel);
  });

  // ─── construction ────────────────────────────────────────────────────────

  it("exports a singleton + class", () => {
    expect(crossTerminalBroadcastEngine).toBeInstanceOf(CrossTerminalBroadcastEngine);
  });

  it("session id is deterministic for the same instance", () => {
    const id1 = engine.getSessionId();
    const id2 = engine.getSessionId();
    expect(id1).toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });

  // ─── broadcastOperatorMessage — input validation ─────────────────────────

  it("rejects empty content with discriminated error", async () => {
    const r = await engine.broadcastOperatorMessage("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_message");
  });

  it("rejects whitespace-only content", async () => {
    const r = await engine.broadcastOperatorMessage("   \t  \n  ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_message");
  });

  it("rejects non-string content", async () => {
    // @ts-expect-error — intentional bad input
    const r = await engine.broadcastOperatorMessage(42);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_message");
  });

  it("rejects invalid msgType with discriminated error", async () => {
    const r = await engine.broadcastOperatorMessage(
      "hello",
      // @ts-expect-error — intentional bad input
      "shout",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_message_type");
  });

  // ─── broadcastOperatorMessage — happy path ───────────────────────────────

  it("happy path: writes a single event with type='operator_message'", async () => {
    const r = await engine.broadcastOperatorMessage("hello peers", "info");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.event.type).toBe("operator_message");
      expect(r.event.sessionId).toBe(engine.getSessionId());
      expect(r.event.payload?.content).toBe("hello peers");
      expect(r.event.payload?.msgType).toBe("info");
      expect(r.channel).toBe(channel);
    }
    const lines = readChannelLines(channel);
    expect(lines.length).toBe(1);
    expect(lines[0].type).toBe("operator_message");
    expect(lines[0].payload?.content).toBe("hello peers");
  });

  it("default msgType is 'info' when omitted", async () => {
    const r = await engine.broadcastOperatorMessage("default msg");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.payload?.msgType).toBe("info");
  });

  it("preserves msgType=warning", async () => {
    const r = await engine.broadcastOperatorMessage("merge freeze starts at 5pm", "warning");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.payload?.msgType).toBe("warning");
  });

  it("preserves msgType=request", async () => {
    const r = await engine.broadcastOperatorMessage("anyone free to review my PR?", "request");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.payload?.msgType).toBe("request");
  });

  it("preserves msgType=response", async () => {
    const r = await engine.broadcastOperatorMessage("yep — taking it", "response");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.payload?.msgType).toBe("response");
  });

  it("trims content but preserves internal whitespace", async () => {
    const r = await engine.broadcastOperatorMessage("  hello   world  ", "info");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.payload?.content).toBe("hello   world");
  });

  // ─── append-only invariant ───────────────────────────────────────────────

  it("multiple broadcasts append (not overwrite) to the channel", async () => {
    await engine.broadcastOperatorMessage("msg 1", "info");
    await engine.broadcastOperatorMessage("msg 2", "warning");
    await engine.broadcastOperatorMessage("msg 3", "request");
    const lines = readChannelLines(channel);
    expect(lines.length).toBe(3);
    expect((lines[0].payload?.content)).toBe("msg 1");
    expect((lines[1].payload?.content)).toBe("msg 2");
    expect((lines[2].payload?.content)).toBe("msg 3");
    expect((lines[0].payload?.msgType)).toBe("info");
    expect((lines[1].payload?.msgType)).toBe("warning");
    expect((lines[2].payload?.msgType)).toBe("request");
  });

  it("timestamps are monotonically non-decreasing across broadcasts", async () => {
    const r1 = await engine.broadcastOperatorMessage("first", "info");
    // Small delay to ensure timestamp differs by at least 1ms.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const r2 = await engine.broadcastOperatorMessage("second", "info");
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      const t1 = new Date(r1.event.timestamp).getTime();
      const t2 = new Date(r2.event.timestamp).getTime();
      expect(t2).toBeGreaterThanOrEqual(t1);
    }
  });

  // ─── recent_event_count delivery confirmation ────────────────────────────

  it("recent_event_count >= 1 immediately after own broadcast", async () => {
    const r = await engine.broadcastOperatorMessage("hello", "info");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.recent_event_count).toBeGreaterThanOrEqual(1);
  });

  it("recent_event_count grows with successive broadcasts in <30s window", async () => {
    const r1 = await engine.broadcastOperatorMessage("a", "info");
    const r2 = await engine.broadcastOperatorMessage("b", "info");
    const r3 = await engine.broadcastOperatorMessage("c", "info");
    expect(r1.ok && r2.ok && r3.ok).toBe(true);
    if (r1.ok && r2.ok && r3.ok) {
      expect(r1.recent_event_count).toBe(1);
      expect(r2.recent_event_count).toBe(2);
      expect(r3.recent_event_count).toBe(3);
    }
  });

  // ─── getRecentEvents / getExternalEvents ────────────────────────────────

  it("getRecentEvents returns chronological events from the channel", async () => {
    await engine.broadcastOperatorMessage("first", "info");
    await engine.broadcastOperatorMessage("second", "warning");
    const events = await engine.getRecentEvents();
    expect(events.length).toBe(2);
    expect(events[0].payload?.content).toBe("first");
    expect(events[1].payload?.content).toBe("second");
  });

  it("getRecentEvents respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await engine.broadcastOperatorMessage(`msg ${i}`, "info");
    }
    const events = await engine.getRecentEvents(2);
    expect(events.length).toBe(2);
    expect(events[0].payload?.content).toBe("msg 3");
    expect(events[1].payload?.content).toBe("msg 4");
  });

  it("getRecentEvents returns empty array when channel doesn't exist yet", async () => {
    const fresh = new CrossTerminalBroadcastEngine();
    fresh._setBroadcastPath(path.join(os.tmpdir(), `nonexistent-${Date.now()}.jsonl`));
    const events = await fresh.getRecentEvents();
    expect(events.length).toBe(0);
  });

  it("getRecentEvents skips malformed lines", async () => {
    fs.mkdirSync(path.dirname(channel), { recursive: true });
    const validLine = JSON.stringify({
      type: "operator_message",
      timestamp: new Date().toISOString(),
      sessionId: "test-sess",
      payload: { content: "valid" },
    });
    fs.writeFileSync(channel, validLine + "\nNOT JSON\n" + validLine + "\n");
    const events = await engine.getRecentEvents();
    expect(events.length).toBe(2);
    expect(events[0].payload?.content).toBe("valid");
  });

  // ─── existing broadcast() method still works ─────────────────────────────

  it("legacy broadcast() with cache_invalidate writes correctly", async () => {
    await engine.broadcast({ type: "cache_invalidate", payload: { reason: "test" } });
    const events = await engine.getRecentEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("cache_invalidate");
    expect(events[0].payload?.reason).toBe("test");
  });

  it("legacy notifyAssetAdded() writes asset_added event", async () => {
    await engine.notifyAssetAdded("engine", "FooEngine", "src/engines/FooEngine.ts");
    const events = await engine.getRecentEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("asset_added");
    expect(events[0].payload?.assetName).toBe("FooEngine");
  });

  it("legacy forceInvalidateAll() writes cache_invalidate event", async () => {
    await engine.forceInvalidateAll();
    const events = await engine.getRecentEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("cache_invalidate");
    expect(events[0].payload?.reason).toBe("manual_invalidate");
  });

  // ─── adversarial / edge cases ────────────────────────────────────────────

  it("very long content (10KB) is accepted and round-trips intact", async () => {
    const long = "x".repeat(10_000);
    const r = await engine.broadcastOperatorMessage(long, "info");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.payload?.content).toBe(long);
    const events = await engine.getRecentEvents();
    expect(events[0].payload?.content).toBe(long);
  });

  it("content with embedded newlines is preserved verbatim within JSONL line", async () => {
    const multi = "line one\nline two\nline three";
    const r = await engine.broadcastOperatorMessage(multi, "info");
    expect(r.ok).toBe(true);
    const events = await engine.getRecentEvents();
    expect(events[0].payload?.content).toBe(multi);
  });

  it("subscribe() callback fires on local broadcast", async () => {
    let received: BroadcastEvent | null = null;
    const sub = engine.subscribe((evt) => {
      received = evt;
    });
    await engine.broadcastOperatorMessage("listen up", "info");
    expect(received).not.toBe(null);
    if (received !== null) {
      // @ts-expect-error — received is BroadcastEvent | null but narrowed to BroadcastEvent above
      expect(received.type).toBe("operator_message");
    }
    sub.unsubscribe();
  });

  // ─── COORD-MS0/U-COORD08-HARDEN ──────────────────────────────────────────
  // (1) atomic-rename trim under concurrent appends
  // (2) setMaxListeners raised above EventEmitter default of 10

  it("concurrent broadcasts produce a well-formed JSONL channel — atomic appends AND atomic-rename trim", async () => {
    // SCOPE — this is a SINGLE-PROCESS unit test. Vitest sync I/O serializes
    // within one Node event loop, so we cannot prove cross-PROCESS rename
    // atomicity here (that's a kernel guarantee on POSIX rename + NTFS
    // ReplaceFile, exercised in production by 6+ concurrent chat sessions).
    // What we CAN prove deterministically:
    //   1. The trim path fires once the pre-seeded channel is over both
    //      thresholds (read TRIM_LINE_CAP + TRIM_BYTE_FLOOR straight from
    //      the engine module so the test doesn't drift when those change).
    //   2. Every line in the post-trim file parses as JSON (a torn write
    //      from the previous non-atomic implementation would fail this).
    //   3. The line count stays in [TRIM_LINE_CAP, TRIM_LINE_CAP + N] — the
    //      file is bounded; appends are not lost outright (worst case some
    //      of the N concurrent payloads land in another writer's
    //      read→rename window and are trimmed away, which is documented
    //      residual behaviour in the engine JSDoc).
    //   4. No `.trim-*.tmp` orphan files are leaked under success.
    fs.mkdirSync(path.dirname(channel), { recursive: true });

    // Pre-seed at TRIM_LINE_CAP + 10 lines, padded to comfortably exceed
    // TRIM_BYTE_FLOOR. Pull both thresholds from the engine so the test
    // auto-scales if either constant ever changes.
    const seedCount = TRIM_LINE_CAP + 10;
    // Pad each seed line so total bytes exceed TRIM_BYTE_FLOOR with margin.
    // (TRIM_BYTE_FLOOR / seedCount) gives bytes-per-line; double it for headroom.
    const padBytes = Math.max(40, Math.ceil((TRIM_BYTE_FLOOR / seedCount) * 2));
    const PADDING = "p".repeat(padBytes);
    const seedLines: string[] = [];
    for (let i = 0; i < seedCount; i++) {
      seedLines.push(
        JSON.stringify({
          type: "operator_message",
          timestamp: new Date(Date.now() - (seedCount - i) * 1000).toISOString(),
          sessionId: "seed-session",
          payload: { msgType: "info", content: `seed-${i}-${PADDING}`, from: "seed-session" },
        }),
      );
    }
    fs.writeFileSync(channel, seedLines.join("\n") + "\n");
    const seedStat = fs.statSync(channel);
    // Both trim triggers must now be live before we start.
    expect(seedStat.size).toBeGreaterThan(TRIM_BYTE_FLOOR);
    expect(seedLines.length).toBeGreaterThan(TRIM_LINE_CAP);

    // Fire 20 concurrent broadcasts. Each one must (1) append atomically and
    // (2) immediately trim back to TRIM_LINE_CAP via rename.
    const N = 20;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        engine.broadcastOperatorMessage(`concurrent-${i}`, "info"),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);

    const raw = fs.readFileSync(channel, "utf8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    // Bounded growth: file never balloons past TRIM_LINE_CAP + N.
    expect(lines.length).toBeGreaterThanOrEqual(TRIM_LINE_CAP);
    expect(lines.length).toBeLessThanOrEqual(TRIM_LINE_CAP + N);
    // Atomicity check #1: every line parseable. Torn writes would throw
    // inside JSON.parse; a non-atomic writeFileSync racing with appendFileSync
    // could leave a partial line, and this assertion would fail.
    const parsed: BroadcastEvent[] = lines.map((l) => JSON.parse(l) as BroadcastEvent);
    expect(parsed.every((e) => e.type === "operator_message")).toBe(true);
    // At least one of the 20 concurrent payloads survives the trim window.
    // (The exact number is timing-dependent — that's documented residual
    // behaviour, not a flake, because we only retain the last TRIM_LINE_CAP.)
    const survivingNewContents = parsed.filter((e) =>
      typeof e.payload?.content === "string" &&
      (e.payload.content as string).startsWith("concurrent-"),
    );
    expect(survivingNewContents.length).toBeGreaterThanOrEqual(1);
    // Atomicity check #2: no orphan temp files survived under success path.
    // (A non-atomic implementation wouldn't create temps at all, so this is
    // primarily a sanity check on the new code path's cleanup discipline.)
    const dirEntries = fs.readdirSync(path.dirname(channel));
    const orphanTemps = dirEntries.filter((e) => e.includes(".trim-") && e.endsWith(".tmp"));
    expect(orphanTemps.length).toBe(0);
  });

  it("setMaxListeners is raised to 50 — 30 subscribers do not trigger MaxListenersExceededWarning", () => {
    // EventEmitter default is 10. Without the hardening fix, mounting 11+
    // listeners would emit MaxListenersExceededWarning on stderr. Verify
    // (a) the engine reports its cap as 50, and (b) we can subscribe 30
    // times without process-level warnings firing.
    expect(engine.getMaxListeners()).toBe(50);

    // Capture any 'warning' event with name MaxListenersExceededWarning.
    const warnings: NodeJS.ErrnoException[] = [];
    const onWarn = (w: NodeJS.ErrnoException) => {
      if (w?.name === "MaxListenersExceededWarning") warnings.push(w);
    };
    process.on("warning", onWarn);

    const subs: Array<{ unsubscribe: () => void }> = [];
    try {
      for (let i = 0; i < 30; i++) {
        subs.push(engine.subscribe(() => { /* sink */ }));
      }
      expect(engine.listenerCount("change")).toBe(30);
      expect(warnings.length).toBe(0);
    } finally {
      process.off("warning", onWarn);
      for (const s of subs) s.unsubscribe();
    }
    // All listeners detached cleanly.
    expect(engine.listenerCount("change")).toBe(0);
  });
});
