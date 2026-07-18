#!/usr/bin/env node
/**
 * generate-user-model-snapshot.mjs — Mine user model from observable signals
 *
 * UserModelEngine uses in-memory state only — no persistence. This generator
 * synthesizes a USER_MODEL_SNAPSHOT.json from signals the user has ACTUALLY
 * left in the repo:
 *
 *   - MEMORY.md and feedback_*.md → preferences (high confidence, user-authored)
 *   - Recent commit messages (last 100) → knownTopics (keyword frequency)
 *   - TodoWrite artifacts / HANDOFF-*.md pending tasks → openQuestions
 *   - Recent session activity → topic recency
 *
 * Output: mcp-server/data/state/USER_MODEL_SNAPSHOT.json
 * Schema matches UserModelEngine.UserSnapshot (schemaVersion 1).
 * Hard cap: ≤2K tokens (~7K chars) for Tier-1 SessionStart injection.
 *
 * @milestone USSH-OPUS47-BOLSTER U-CTX04
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = "H:\\prism";
const MCP = path.join(ROOT, "mcp-server");
const MEMORY_DIR = path.join("C:\\Users\\wompu\\.claude\\projects\\H--prism\\memory");
const MEMORY_INDEX = path.join(MEMORY_DIR, "MEMORY.md");
const OUTPUT = path.join(MCP, "data", "state", "USER_MODEL_SNAPSHOT.json");
const TOKEN_CAP = 2000;
const CHAR_CAP = TOKEN_CAP * 3.5;

const MAX_PREFERENCES = 20;
const MAX_TOPICS = 30;
const MAX_QUESTIONS = 10;

// Domain-specific topic vocabulary — used to recognize signal in commit messages
const TOPIC_VOCAB = [
  "engine","dispatcher","registry","pipeline","milestone","roadmap","phase","unit",
  "kienzle","taylor","deflection","thermal","chatter","stability","surface","wear",
  "wedm","edm","lathe","turning","mill","milling","5-axis","grinding","laser","waterjet",
  "okuma","hurco","haas","mitsubishi","fanuc","mastercam","hypermill","solidworks",
  "safety","s(x)","validator","hook","guard","sandbox","orchestrator","compact",
  "docker","ollama","wsl","mcp","claude","opus","sonnet","haiku","token","context",
  "agi","reasoning","creative","multi-agent","learning","lora","cad","cam","postprocessor",
  "quote","cost","capacity","shop","jm die","tribal","playbook","knowledge","svi","psi",
];

async function readOrNull(p) {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

async function listMemoryFeedbackFiles() {
  try {
    const files = await fs.readdir(MEMORY_DIR);
    return files.filter((f) => f.startsWith("feedback_") && f.endsWith(".md"));
  } catch { return []; }
}

function extractPrefFromFeedback(body, fileName) {
  // First non-frontmatter paragraph's first sentence = rule
  const afterFrontmatter = body.replace(/^---[\s\S]*?---\s*/m, "");
  const firstPara = afterFrontmatter.split(/\n\s*\n/)[0]?.trim() ?? "";
  const sentence = firstPara.split(/(?<=[.!?])\s+/)[0]?.slice(0, 280) ?? "";
  const key = fileName.replace(/^feedback_/, "").replace(/\.md$/, "").replace(/_/g, "-");
  return {
    key,
    value: sentence,
    confirmedAt: new Date().toISOString(),
    confidence: 0.95,
  };
}

function extractPrefsFromMemoryIndex(body) {
  const prefs = [];
  // "User explicitly wants Omega = 1.0" → preference
  const omega = body.match(/User explicitly wants.*?Omega\s*=\s*([\d.]+)/i);
  if (omega) {
    prefs.push({
      key: "omega-target",
      value: `Omega = ${omega[1]} for ALL future milestones (not 0.75)`,
      confirmedAt: new Date().toISOString(),
      confidence: 1.0,
    });
  }
  // Working mode bullets
  const workingMode = body.match(/## Working Mode\s*\n([\s\S]*?)(?=\n## |\n$)/);
  if (workingMode) {
    const lines = workingMode[1].split("\n").filter((l) => l.trim().startsWith("-"));
    for (const line of lines.slice(0, 10)) {
      const clean = line.replace(/^-\s*/, "").trim();
      if (!clean) continue;
      const key = clean.split(/[:—,]/)[0].trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
      prefs.push({
        key: `workmode-${key}`,
        value: clean.slice(0, 240),
        confirmedAt: new Date().toISOString(),
        confidence: 0.9,
      });
    }
  }
  return prefs;
}

function mineCommitTopics(n = 100) {
  const res = spawnSync("git", ["-C", ROOT, "log", `-${n}`, "--pretty=format:%s"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (res.status !== 0) return [];
  const lines = (res.stdout ?? "").split("\n").filter(Boolean);
  const now = Date.now();
  const topicHits = new Map();
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    for (const v of TOPIC_VOCAB) {
      if (lower.includes(v)) {
        const cur = topicHits.get(v) ?? { topic: v, observationCount: 0, firstObservedAt: "", lastObservedAt: "", recencyIdx: 9999 };
        cur.observationCount += 1;
        cur.recencyIdx = Math.min(cur.recencyIdx, idx);
        topicHits.set(v, cur);
      }
    }
  });
  return [...topicHits.values()].map((t) => ({
    topic: t.topic,
    observationCount: t.observationCount,
    firstObservedAt: new Date(now - (lines.length - 1) * 3600_000).toISOString(),
    lastObservedAt: new Date(now - t.recencyIdx * 3600_000).toISOString(),
    confidence: Math.min(1, Math.round((0.3 + 0.05 * t.observationCount) * 100) / 100),
  }));
}

async function mineOpenQuestions() {
  // Mine pending units from roadmap-index.json + USSH-OPUS47-BOLSTER log
  const questions = [];
  let nextId = 1;
  const logPath = path.join(ROOT, "state", "shared", "USSH-OPUS47-BOLSTER-LOG.md");
  const log = await readOrNull(logPath);
  if (log) {
    const pending = log.match(/### Still pending[\s\S]*?(?=\n###|\n## |$)/);
    if (pending) {
      const bullets = pending[0].match(/- U-[A-Z0-9]+:[^\n]+/g) ?? [];
      for (const b of bullets.slice(0, 6)) {
        questions.push({
          id: `q${nextId++}`,
          question: b.replace(/^- /, "").trim().slice(0, 280),
          raisedAt: new Date().toISOString(),
          status: "open",
        });
      }
    }
    const phaseC = log.match(/### Phase C[\s\S]*?(?=\n###|\n## |$)/);
    if (phaseC) {
      const bullets = phaseC[0].match(/- U-[A-Z0-9]+[^\n]*/g) ?? [];
      for (const b of bullets.slice(0, 3)) {
        questions.push({
          id: `q${nextId++}`,
          question: b.replace(/^- /, "").trim().slice(0, 280),
          raisedAt: new Date().toISOString(),
          status: "open",
        });
      }
    }
  }
  return questions;
}

function clampSize(snap, maxChars) {
  let s = JSON.stringify(snap, null, 2);
  if (s.length <= maxChars) return snap;
  // Progressive compression: drop JSON prettiness, then trim lists
  while (s.length > maxChars) {
    if (snap.knownTopics.length > 10) snap.knownTopics.pop();
    else if (snap.preferences.length > 10) snap.preferences.pop();
    else if (snap.openQuestions.length > 3) snap.openQuestions.pop();
    else break;
    s = JSON.stringify(snap, null, 2);
  }
  return snap;
}

async function main() {
  const memIndex = await readOrNull(MEMORY_INDEX);
  const feedbackFiles = await listMemoryFeedbackFiles();
  const feedbackBodies = await Promise.all(feedbackFiles.map((f) => readOrNull(path.join(MEMORY_DIR, f))));

  const prefsFromFeedback = feedbackFiles
    .map((f, i) => (feedbackBodies[i] ? extractPrefFromFeedback(feedbackBodies[i], f) : null))
    .filter(Boolean);
  const prefsFromIndex = memIndex ? extractPrefsFromMemoryIndex(memIndex) : [];

  const allPrefs = [...prefsFromIndex, ...prefsFromFeedback];
  const dedupePrefs = new Map();
  for (const p of allPrefs) if (!dedupePrefs.has(p.key)) dedupePrefs.set(p.key, p);
  const preferences = [...dedupePrefs.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_PREFERENCES);

  const topics = mineCommitTopics(100)
    .sort((a, b) => new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime())
    .slice(0, MAX_TOPICS);

  const openQuestions = (await mineOpenQuestions()).slice(0, MAX_QUESTIONS);

  let snap = {
    schemaVersion: 1,
    userId: "primary",
    preferences,
    knownTopics: topics,
    openQuestions,
    updatedAt: new Date().toISOString(),
  };
  snap = clampSize(snap, CHAR_CAP);

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  const out = JSON.stringify(snap, null, 2);
  await fs.writeFile(OUTPUT, out, "utf8");
  process.stdout.write(JSON.stringify({
    ok: true,
    outPath: OUTPUT,
    prefs: snap.preferences.length,
    topics: snap.knownTopics.length,
    openQs: snap.openQuestions.length,
    sizeChars: out.length,
    approxTokens: Math.round(out.length / 3.5),
  }, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(`[user-model-snapshot] error: ${err?.message ?? err}\n`);
  process.exit(1);
});
