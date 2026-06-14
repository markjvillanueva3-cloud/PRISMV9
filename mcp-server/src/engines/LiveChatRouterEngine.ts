/**
 * LiveChatRouterEngine — QUOTING-PIPELINE-MS0 / U-QP07
 *
 * Brokers a user-facing chat session through to TroubleshootingAssistantEngine
 * (the 120K LLM) + ConversationalMemoryEngine, with citation provenance.
 *
 * MS0 ships SESSION LIFECYCLE + CITATION PROVENANCE + MEMORY THREADING.
 * The actual assistant invocation is delegated to TroubleshootingAssistantEngine
 * via a configurable callback so this engine is testable without LLM I/O.
 *
 * Per R12 fail-loud:
 *   - Closed/expired session → reject the turn explicitly, never silently re-open
 *   - Missing assistant callback → return error response, never fabricate
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP07-LIVE-CHAT-ROUTER
 * @author slot:charlie /goal-13 iter4, 2026-05-24
 */

import { randomUUID } from "node:crypto";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
  /** Citations attached to assistant turns (engine name + relevance score). */
  citations?: Array<{ source: string; relevance: number; excerpt?: string }>;
}

export interface ChatSession {
  id: string;
  opened_at: number;
  last_activity_at: number;
  state: "open" | "closed" | "expired";
  turns: ChatTurn[];
}

export type AssistantCallback = (userText: string, history: ChatTurn[]) => Promise<{
  text: string;
  citations?: Array<{ source: string; relevance: number; excerpt?: string }>;
}>;

export interface ChatRouterConfig {
  /** Auto-expire idle sessions after N ms (default 30 min). */
  idle_timeout_ms?: number;
  /** Bound the history sent to the assistant (default 20 turns). */
  max_history_turns?: number;
}

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_MAX_HISTORY = 20;

export class LiveChatRouterEngine {
  private sessions = new Map<string, ChatSession>();
  private assistantCb: AssistantCallback | null = null;
  private cfg: Required<ChatRouterConfig>;

  constructor(cfg?: ChatRouterConfig) {
    this.cfg = {
      idle_timeout_ms: cfg?.idle_timeout_ms ?? DEFAULT_IDLE_TIMEOUT_MS,
      max_history_turns: cfg?.max_history_turns ?? DEFAULT_MAX_HISTORY,
    };
  }

  /** Wire the assistant backend (defaults: TroubleshootingAssistantEngine). */
  setAssistantCallback(cb: AssistantCallback): void {
    this.assistantCb = cb;
  }

  /** Open a fresh session. */
  openSession(): ChatSession {
    const now = Date.now();
    const sess: ChatSession = {
      id: randomUUID(),
      opened_at: now,
      last_activity_at: now,
      state: "open",
      turns: [],
    };
    this.sessions.set(sess.id, sess);
    return sess;
  }

  /** Submit a user turn; returns the assistant response turn. */
  async turn(sessionId: string, userText: string): Promise<ChatTurn> {
    const sess = this.sessions.get(sessionId);
    if (!sess) {
      return {
        id: randomUUID(),
        role: "assistant",
        text: `[error] unknown session ${sessionId}`,
        ts: Date.now(),
        citations: [],
      };
    }
    // Expire idle sessions
    if (sess.state === "open" && Date.now() - sess.last_activity_at > this.cfg.idle_timeout_ms) {
      sess.state = "expired";
    }
    if (sess.state !== "open") {
      return {
        id: randomUUID(),
        role: "assistant",
        text: `[error] session is ${sess.state}; open a new session`,
        ts: Date.now(),
        citations: [],
      };
    }
    if (!userText || userText.trim().length === 0) {
      return {
        id: randomUUID(),
        role: "assistant",
        text: "[error] empty user turn",
        ts: Date.now(),
        citations: [],
      };
    }
    if (!this.assistantCb) {
      return {
        id: randomUUID(),
        role: "assistant",
        text: "[error] no assistant callback configured — call setAssistantCallback() first",
        ts: Date.now(),
        citations: [],
      };
    }

    const userTurn: ChatTurn = {
      id: randomUUID(),
      role: "user",
      text: userText,
      ts: Date.now(),
    };
    sess.turns.push(userTurn);
    sess.last_activity_at = userTurn.ts;

    // Bound history sent to the assistant (R12: explicit cap, not silent drop)
    const history = sess.turns.slice(-this.cfg.max_history_turns);
    const resp = await this.assistantCb(userText, history);
    const asstTurn: ChatTurn = {
      id: randomUUID(),
      role: "assistant",
      text: resp.text,
      ts: Date.now(),
      citations: resp.citations ?? [],
    };
    sess.turns.push(asstTurn);
    sess.last_activity_at = asstTurn.ts;
    return asstTurn;
  }

  /** Close a session explicitly. */
  closeSession(sessionId: string): boolean {
    const sess = this.sessions.get(sessionId);
    if (!sess) return false;
    sess.state = "closed";
    return true;
  }

  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /** Number of live sessions (open + recently-active). */
  liveSessionCount(): number {
    let n = 0;
    for (const s of this.sessions.values()) if (s.state === "open") n++;
    return n;
  }
}

export const liveChatRouterEngine = new LiveChatRouterEngine();
