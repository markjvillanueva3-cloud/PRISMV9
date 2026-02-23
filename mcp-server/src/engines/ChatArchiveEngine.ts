/**
 * ChatArchiveEngine — session chat storage, summaries, search
 * Phase REORG: Chat Archive & Memory System
 *
 * Actions:
 *   chat_start   — create new session, load recent summaries
 *   chat_save    — append exchange to current session
 *   chat_end     — finalize session, generate summary entry
 *   chat_list    — list archived sessions with metadata
 *   chat_search  — full-text search across sessions/summaries
 *   chat_stats   — archive statistics
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionEntry {
  id: number;
  date: string;
  focus: string;
  transcript: string;
  summary: string;
  keyTopics: string[];
  outcomes: string[];
  filesCreated: string[];
  metrics: { omega: number; safety: number; ralphScore: number };
}

interface ChatIndex {
  lastUpdated: string;
  totalSessions: number;
  sessions: SessionEntry[];
  quickLookup: Record<string, number[]>;
}

// ── Paths ──────────────────────────────────────────────────────────────────

const CHATS_DIR = path.join(PATHS.MCP_SERVER, "data", "chats");
const SESSIONS_DIR = path.join(CHATS_DIR, "sessions");
const SUMMARIES_DIR = path.join(CHATS_DIR, "summaries");
const INDEX_FILE = path.join(CHATS_DIR, "index.json");

// ── Helpers ────────────────────────────────────────────────────────────────

function ensureDirs(): void {
  for (const dir of [CHATS_DIR, SESSIONS_DIR, SUMMARIES_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function readIndex(): ChatIndex {
  ensureDirs();
  if (!fs.existsSync(INDEX_FILE)) {
    return { lastUpdated: new Date().toISOString(), totalSessions: 0, sessions: [], quickLookup: {} };
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
}

function writeIndex(index: ChatIndex): void {
  index.lastUpdated = new Date().toISOString();
  index.totalSessions = index.sessions.length;
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Action Implementations ─────────────────────────────────────────────────

function chatStart(params: Record<string, unknown>): unknown {
  const focus = (params.focus as string) || "General Session";
  const loadRecent = (params.load_recent as number) || 3;

  const index = readIndex();
  const nextId = index.sessions.length > 0
    ? Math.max(...index.sessions.map(s => s.id)) + 1
    : 1;

  const date = todayStr();
  const transcriptPath = `sessions/session-${nextId}-${date}.md`;
  const summaryPath = `summaries/session-${nextId}-summary.md`;

  // Create session transcript file
  const header = `# Session ${nextId} — ${date}\n## Focus: ${focus}\n\n---\n\n`;
  fs.writeFileSync(path.join(CHATS_DIR, transcriptPath), header);

  // Add to index
  const entry: SessionEntry = {
    id: nextId,
    date,
    focus,
    transcript: transcriptPath,
    summary: summaryPath,
    keyTopics: [],
    outcomes: [],
    filesCreated: [],
    metrics: { omega: 0, safety: 0, ralphScore: 0 },
  };
  index.sessions.push(entry);
  writeIndex(index);

  // Load recent summaries for context
  const recentSummaries: { id: number; focus: string; summary: string }[] = [];
  const recentSessions = index.sessions
    .filter(s => s.id !== nextId)
    .sort((a, b) => b.id - a.id)
    .slice(0, loadRecent);

  for (const s of recentSessions) {
    const sumFile = path.join(CHATS_DIR, s.summary);
    if (fs.existsSync(sumFile)) {
      recentSummaries.push({
        id: s.id,
        focus: s.focus,
        summary: fs.readFileSync(sumFile, "utf-8").slice(0, 2000),
      });
    }
  }

  return {
    session_id: nextId,
    date,
    focus,
    transcript: transcriptPath,
    recent_context: recentSummaries,
    message: `Session ${nextId} started. ${recentSummaries.length} recent summaries loaded.`,
  };
}

function chatSave(params: Record<string, unknown>): unknown {
  const sessionId = params.session_id as number;
  const content = params.content as string;
  const exchangeNum = params.exchange as number | undefined;

  if (!sessionId || !content) {
    return { error: "session_id and content are required" };
  }

  const index = readIndex();
  const session = index.sessions.find(s => s.id === sessionId);
  if (!session) return { error: `Session ${sessionId} not found` };

  const transcriptFile = path.join(CHATS_DIR, session.transcript);
  if (!fs.existsSync(transcriptFile)) {
    return { error: `Transcript file not found: ${session.transcript}` };
  }

  const prefix = exchangeNum ? `### Exchange ${exchangeNum}\n` : "";
  const entry = `${prefix}${content}\n\n---\n\n`;
  fs.appendFileSync(transcriptFile, entry);

  // Update topics from content keywords
  const topicWords = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const newTopics = [...new Set(topicWords)]
    .filter(w => !session.keyTopics.includes(w))
    .slice(0, 5);
  session.keyTopics.push(...newTopics);
  writeIndex(index);

  return {
    session_id: sessionId,
    saved: true,
    transcript: session.transcript,
    topics_added: newTopics.length,
  };
}

function chatEnd(params: Record<string, unknown>): unknown {
  const sessionId = params.session_id as number;
  const summary = params.summary as string;
  const outcomes = (params.outcomes as string[]) || [];
  const filesCreated = (params.files_created as string[]) || [];
  const metrics = params.metrics as { omega?: number; safety?: number; ralphScore?: number } | undefined;

  if (!sessionId) return { error: "session_id is required" };

  const index = readIndex();
  const session = index.sessions.find(s => s.id === sessionId);
  if (!session) return { error: `Session ${sessionId} not found` };

  // Write summary file
  if (summary) {
    const sumContent = `# Session ${sessionId} Summary\n## ${session.date} — ${session.focus}\n\n${summary}\n\n### Outcomes\n${outcomes.map(o => `- ${o}`).join("\n")}\n\n### Files Created/Modified\n${filesCreated.map(f => `- ${f}`).join("\n")}\n`;
    fs.writeFileSync(path.join(CHATS_DIR, session.summary), sumContent);
  }

  // Update session metadata
  session.outcomes = outcomes;
  session.filesCreated = filesCreated;
  if (metrics) {
    session.metrics = {
      omega: metrics.omega || 0,
      safety: metrics.safety || 0,
      ralphScore: metrics.ralphScore || 0,
    };
  }

  // Update quickLookup
  for (const topic of session.keyTopics) {
    if (!index.quickLookup[topic]) index.quickLookup[topic] = [];
    if (!index.quickLookup[topic].includes(sessionId)) {
      index.quickLookup[topic].push(sessionId);
    }
  }

  writeIndex(index);

  return {
    session_id: sessionId,
    closed: true,
    summary_written: !!summary,
    outcomes_count: outcomes.length,
    total_topics: session.keyTopics.length,
  };
}

function chatList(params: Record<string, unknown>): unknown {
  const limit = (params.limit as number) || 20;
  const topic = params.topic as string | undefined;

  const index = readIndex();
  let sessions = [...index.sessions].sort((a, b) => b.id - a.id);

  if (topic) {
    const matchIds = index.quickLookup[topic.toLowerCase()] || [];
    if (matchIds.length > 0) {
      sessions = sessions.filter(s => matchIds.includes(s.id));
    } else {
      sessions = sessions.filter(s =>
        s.keyTopics.some(t => t.includes(topic.toLowerCase())) ||
        s.focus.toLowerCase().includes(topic.toLowerCase())
      );
    }
  }

  return {
    total_sessions: index.totalSessions,
    showing: Math.min(sessions.length, limit),
    sessions: sessions.slice(0, limit).map(s => ({
      id: s.id,
      date: s.date,
      focus: s.focus,
      topics: s.keyTopics.slice(0, 5),
      outcomes_count: s.outcomes.length,
      metrics: s.metrics,
    })),
  };
}

function chatSearch(params: Record<string, unknown>): unknown {
  const query = (params.query as string || "").toLowerCase();
  const scope = (params.scope as string) || "all"; // all, transcripts, summaries

  if (!query) return { error: "query is required" };

  const index = readIndex();
  const results: { session_id: number; source: string; matches: string[] }[] = [];

  for (const session of index.sessions) {
    if (scope === "all" || scope === "transcripts") {
      const tFile = path.join(CHATS_DIR, session.transcript);
      if (fs.existsSync(tFile)) {
        const content = fs.readFileSync(tFile, "utf-8");
        if (content.toLowerCase().includes(query)) {
          const lines = content.split("\n").filter(l => l.toLowerCase().includes(query));
          results.push({
            session_id: session.id,
            source: "transcript",
            matches: lines.slice(0, 5).map(l => l.trim().slice(0, 200)),
          });
        }
      }
    }

    if (scope === "all" || scope === "summaries") {
      const sFile = path.join(CHATS_DIR, session.summary);
      if (fs.existsSync(sFile)) {
        const content = fs.readFileSync(sFile, "utf-8");
        if (content.toLowerCase().includes(query)) {
          const lines = content.split("\n").filter(l => l.toLowerCase().includes(query));
          results.push({
            session_id: session.id,
            source: "summary",
            matches: lines.slice(0, 5).map(l => l.trim().slice(0, 200)),
          });
        }
      }
    }
  }

  // Also check quickLookup
  const topicMatches = Object.entries(index.quickLookup)
    .filter(([key]) => key.includes(query))
    .map(([key, ids]) => ({ topic: key, sessions: ids }));

  return {
    query,
    scope,
    total_results: results.length,
    results,
    topic_matches: topicMatches,
  };
}

function chatStats(_params: Record<string, unknown>): unknown {
  const index = readIndex();

  let totalTranscriptSize = 0;
  let totalSummarySize = 0;

  for (const session of index.sessions) {
    const tFile = path.join(CHATS_DIR, session.transcript);
    const sFile = path.join(CHATS_DIR, session.summary);
    if (fs.existsSync(tFile)) totalTranscriptSize += fs.statSync(tFile).size;
    if (fs.existsSync(sFile)) totalSummarySize += fs.statSync(sFile).size;
  }

  const allTopics = [...new Set(index.sessions.flatMap(s => s.keyTopics))];

  return {
    total_sessions: index.totalSessions,
    last_updated: index.lastUpdated,
    storage: {
      transcripts_bytes: totalTranscriptSize,
      summaries_bytes: totalSummarySize,
      total_bytes: totalTranscriptSize + totalSummarySize,
    },
    topics: {
      unique_count: allTopics.length,
      top_topics: Object.entries(index.quickLookup)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 10)
        .map(([topic, ids]) => ({ topic, session_count: ids.length })),
    },
    metrics_avg: index.sessions.length > 0 ? {
      omega: Math.round(index.sessions.reduce((s, e) => s + e.metrics.omega, 0) / index.sessions.length * 100) / 100,
      safety: Math.round(index.sessions.reduce((s, e) => s + e.metrics.safety, 0) / index.sessions.length * 100) / 100,
      ralphScore: Math.round(index.sessions.reduce((s, e) => s + e.metrics.ralphScore, 0) / index.sessions.length * 100) / 100,
    } : { omega: 0, safety: 0, ralphScore: 0 },
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeChatArchiveAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "chat_start":  return chatStart(params);
    case "chat_save":   return chatSave(params);
    case "chat_end":    return chatEnd(params);
    case "chat_list":   return chatList(params);
    case "chat_search": return chatSearch(params);
    case "chat_stats":  return chatStats(params);
    default:
      return { error: `Unknown ChatArchive action: ${action}` };
  }
}
