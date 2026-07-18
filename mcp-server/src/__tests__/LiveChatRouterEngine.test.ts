/**
 * Tests for LiveChatRouterEngine — QUOTING-PIPELINE-MS0 / U-QP07.
 * Session lifecycle + citation provenance + R12 fail-loud invariants.
 */
import { describe, it, expect } from "vitest";
import { LiveChatRouterEngine } from "../engines/LiveChatRouterEngine.js";

function mkEng() {
  const eng = new LiveChatRouterEngine({ idle_timeout_ms: 200, max_history_turns: 4 });
  eng.setAssistantCallback(async (userText, history) => ({
    text: `echo:${userText} (history=${history.length})`,
    citations: [
      { source: "TroubleshootingAssistantEngine", relevance: 0.9, excerpt: "matched pattern" },
      { source: "CAMTribalRAGEngine", relevance: 0.7 },
    ],
  }));
  return eng;
}

describe("LiveChatRouterEngine — session lifecycle", () => {
  it("openSession creates an open session with empty turns + nonzero opened_at", () => {
    const eng = mkEng();
    const sess = eng.openSession();
    expect(sess.state).toBe("open");
    expect(sess.turns.length).toBe(0);
    expect(sess.opened_at).toBeGreaterThan(0);
  });

  it("turn returns assistant response with text + citations attached", async () => {
    const eng = mkEng();
    const sess = eng.openSession();
    const reply = await eng.turn(sess.id, "why does my tool break?");
    expect(reply.role).toBe("assistant");
    expect(reply.text).toMatch(/echo:why does my tool break/);
    expect(reply.citations?.length).toBe(2);
    expect(reply.citations?.[0].source).toBe("TroubleshootingAssistantEngine");
  });

  it("session.turns grows by 2 per round-trip (user + assistant)", async () => {
    const eng = mkEng();
    const sess = eng.openSession();
    await eng.turn(sess.id, "Q1");
    await eng.turn(sess.id, "Q2");
    const got = eng.getSession(sess.id);
    expect(got?.turns.length).toBe(4); // 2 user + 2 assistant
  });

  it("closeSession transitions state to closed; subsequent turn rejected", async () => {
    const eng = mkEng();
    const sess = eng.openSession();
    expect(eng.closeSession(sess.id)).toBe(true);
    const reply = await eng.turn(sess.id, "Q3");
    expect(reply.text).toMatch(/\[error\] session is closed/);
  });
});

describe("LiveChatRouterEngine — failure modes (R12 fail-loud)", () => {
  it("unknown session id → assistant returns explicit error, no fabricated answer", async () => {
    const eng = mkEng();
    const reply = await eng.turn("non-existent-id", "Q");
    expect(reply.text).toMatch(/\[error\] unknown session/);
  });

  it("empty user turn → explicit error", async () => {
    const eng = mkEng();
    const sess = eng.openSession();
    const reply = await eng.turn(sess.id, "");
    expect(reply.text).toMatch(/\[error\] empty user turn/);
  });

  it("no assistant callback configured → explicit error, not silent empty", async () => {
    const eng = new LiveChatRouterEngine();
    const sess = eng.openSession();
    const reply = await eng.turn(sess.id, "Q");
    expect(reply.text).toMatch(/no assistant callback/);
  });

  it("expired session (after idle timeout) → state=expired, turn rejected", async () => {
    const eng = mkEng();
    const sess = eng.openSession();
    // Idle timeout is 200ms in mkEng
    await new Promise((r) => setTimeout(r, 250));
    const reply = await eng.turn(sess.id, "Q");
    expect(reply.text).toMatch(/\[error\] session is expired/);
  });
});

describe("LiveChatRouterEngine — history bounding (R12 explicit cap)", () => {
  it("history sent to assistant capped at max_history_turns (default in mkEng = 4)", async () => {
    const eng = mkEng();
    const sess = eng.openSession();
    let lastHistorySize = 0;
    eng.setAssistantCallback(async (_userText, history) => {
      lastHistorySize = history.length;
      return { text: "ok", citations: [] };
    });
    for (let i = 0; i < 10; i++) {
      await eng.turn(sess.id, `Q${i}`);
    }
    expect(lastHistorySize).toBeLessThanOrEqual(4);
  });
});

describe("LiveChatRouterEngine — liveSessionCount", () => {
  it("counts only open sessions; closed sessions not included", () => {
    const eng = mkEng();
    const s1 = eng.openSession();
    eng.openSession();
    eng.openSession();
    expect(eng.liveSessionCount()).toBe(3);
    eng.closeSession(s1.id);
    expect(eng.liveSessionCount()).toBe(2);
  });
});
