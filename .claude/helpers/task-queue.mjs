import { promises as fs } from "node:fs";
import path from "node:path";
import { inferAgentIdentity } from "./agent-identity.mjs";

const FILES = {
  queueJson: "H:\\prism\\state\\shared\\TASK_QUEUE.json",
  queueMarkdown: "H:\\prism\\state\\shared\\TASK_QUEUE.md",
  workboardJson: "H:\\prism\\state\\shared\\AGENT_WORKBOARD.json",
  workboardMarkdown: "H:\\prism\\state\\shared\\AGENT_WORKBOARD.md",
  chatJsonl: "H:\\prism\\state\\shared\\AGENT_CHAT.jsonl",
  chatMarkdown: "H:\\prism\\state\\shared\\AGENT_CHAT.md",
};

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// --- Utilities ---

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        parsed[key] = true;
        continue;
      }
      parsed[key] = next;
      i++;
    } else {
      parsed._.push(token);
    }
  }
  return parsed;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeTaskStatus(status) {
  return status === "complete" ? "completed" : status;
}

function normalizeQueue(queue) {
  if (!queue || !Array.isArray(queue.tasks)) {
    return { version: 1, updated_at: now(), tasks: [] };
  }

  for (const task of queue.tasks) {
    task.status = normalizeTaskStatus(task.status);
    normalizeTaskRouting(task);
  }

  return queue;
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function appendJsonl(filePath, entry) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, JSON.stringify(entry) + "\n", "utf8");
}

function now() {
  return new Date().toISOString();
}

function getPreferredFamily(task) {
  const preferred = task.preferred_family || task.owner_family || "any";
  return preferred === "any" ? null : preferred;
}

function getClaimPolicy(task) {
  if (task.claim_policy) {
    return task.claim_policy;
  }
  const owner = task.owner_family || task.preferred_family || "any";
  return owner === "any" ? "open" : "preferred";
}

function normalizeTaskRouting(task) {
  const preferredFamily = getPreferredFamily(task);
  task.preferred_family = preferredFamily;
  task.claim_policy = getClaimPolicy(task);
  if (!task.owner_family) {
    task.owner_family = preferredFamily || "any";
  }
  return task;
}

function canClaimTask(task, identity) {
  const policy = getClaimPolicy(task);
  const preferredFamily = getPreferredFamily(task);

  if (policy === "restricted") {
    return !preferredFamily || preferredFamily === identity.family;
  }

  return true;
}

function isPreferredForIdentity(task, identity) {
  const preferredFamily = getPreferredFamily(task);
  return preferredFamily ? preferredFamily === identity.family : true;
}

// --- Queue operations ---

async function loadQueue() {
  return normalizeQueue(
    await readJson(FILES.queueJson, { version: 1, updated_at: now(), tasks: [] }),
  );
}

async function saveQueue(queue) {
  normalizeQueue(queue);
  queue.updated_at = now();
  queue.updated = queue.updated_at;
  queue.total = queue.tasks.length;
  if (!queue.source) {
    queue.source = "PRISM-UNIFIED-ROADMAP-v2.md + roadmap envelopes";
  }
  // Recompute blocked status
  const completedIds = new Set(queue.tasks.filter(t => t.status === "completed").map(t => t.id));
  for (const task of queue.tasks) {
    if (task.status === "completed") continue;
    if (task.blocked_by && task.blocked_by.length > 0) {
      const allMet = task.blocked_by.every(dep => completedIds.has(dep));
      if (!allMet && task.status !== "claimed" && task.status !== "in_progress") {
        task.status = "blocked";
      } else if (allMet && task.status === "blocked") {
        task.status = "available";
      }
    }
  }
  await writeJson(FILES.queueJson, queue);
  await writeMarkdown(queue);
}

async function writeMarkdown(queue) {
  const lines = [
    "# Task Queue",
    "",
    `Updated: ${queue.updated_at || queue.updated || now()}`,
    "",
  ];

  if (queue.source) {
    lines.push(`Source: ${queue.source}`);
    lines.push("");
  }

  const groups = { in_progress: [], claimed: [], available: [], blocked: [], completed: [] };
  for (const t of queue.tasks) {
    (groups[t.status] || groups.available).push(t);
  }

  for (const [status, tasks] of Object.entries(groups)) {
    if (tasks.length === 0) continue;
    const icon = { in_progress: "🔨", claimed: "🔒", available: "📋", blocked: "⛔", completed: "✅" }[status] || "❓";
    lines.push(`## ${icon} ${status.toUpperCase()} (${tasks.length})`);
    lines.push("");
    for (const t of tasks.sort((a, b) => a.priority - b.priority)) {
      const owner = t.preferred_family || t.owner_family || "any";
      const claimPolicy = t.claim_policy || getClaimPolicy(t);
      const claim = t.claimed_by ? ` — claimed by ${t.claimed_by}` : "";
      const deps = t.blocked_by?.length ? ` [blocks: ${t.blocked_by.join(", ")}]` : "";
      lines.push(`- **${t.id}** (${owner}, ${claimPolicy}, P${t.priority}): ${t.title}${claim}${deps}`);
      if (t.description) lines.push(`  ${t.description}`);
    }
    lines.push("");
  }

  // Summary
  const total = queue.tasks.length;
  const done = groups.completed.length;
  const active = groups.in_progress.length + groups.claimed.length;
  const avail = groups.available.length;
  const blocked = groups.blocked.length;
  lines.push(`---`);
  lines.push(`Total: ${total} | Done: ${done} | Active: ${active} | Available: ${avail} | Blocked: ${blocked}`);

  await fs.writeFile(FILES.queueMarkdown, lines.join("\n") + "\n", "utf8");
}

// --- Commands ---

async function cmdList(identity) {
  const queue = await loadQueue();
  const result = {
    ok: true,
    command: "list",
    total: queue.tasks.length,
    by_status: {},
    your_tasks: [],
    your_family_available: [],
  };

  for (const t of queue.tasks) {
    result.by_status[t.status] = (result.by_status[t.status] || 0) + 1;
    if (t.claimed_by === identity.instance) {
      result.your_tasks.push({ id: t.id, title: t.title, status: t.status });
    }
    if (t.status === "available" && canClaimTask(t, identity)) {
      result.your_family_available.push({ id: t.id, title: t.title, priority: t.priority });
    }
  }
  result.your_family_available.sort((a, b) => a.priority - b.priority);
  return result;
}

async function cmdNext(identity) {
  const queue = await loadQueue();
  // Reap stale first
  await reapStale(queue);

  const available = queue.tasks
    .filter(t => t.status === "available")
    .filter(t => canClaimTask(t, identity))
    .sort((a, b) => {
      const priorityDelta = a.priority - b.priority;
      if (priorityDelta !== 0) return priorityDelta;
      const preferredDelta = Number(!isPreferredForIdentity(a, identity)) - Number(!isPreferredForIdentity(b, identity));
      if (preferredDelta !== 0) return preferredDelta;
      return a.id.localeCompare(b.id);
    });

  if (available.length === 0) {
    return { ok: true, command: "next", task: null, message: `No available tasks for ${identity.family}` };
  }

  return {
    ok: true,
    command: "next",
    task: available[0],
    remaining: available.length - 1,
    message: `Next task: ${available[0].id} — ${available[0].title}`,
  };
}

async function cmdClaim(identity, taskId) {
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };
  if (task.status === "completed") return { ok: false, error: `Task ${taskId} already completed` };
  if (task.status === "blocked") return { ok: false, error: `Task ${taskId} is blocked by: ${task.blocked_by.join(", ")}` };
  if (task.claimed_by && task.claimed_by !== identity.instance) {
    return { ok: false, error: `Task ${taskId} already claimed by ${task.claimed_by}` };
  }
  if (!canClaimTask(task, identity)) {
    const preferredFamily = getPreferredFamily(task);
    return { ok: false, error: `Task ${taskId} claim policy is ${getClaimPolicy(task)} and preferred family is ${preferredFamily || "any"}; you are ${identity.family}` };
  }

  task.status = "claimed";
  task.claimed_by = identity.instance;
  task.claimed_at = now();
  task.heartbeat_at = now();
  await saveQueue(queue);

  return { ok: true, command: "claim", task_id: taskId, claimed_by: identity.instance };
}

async function cmdStart(identity, taskId) {
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };
  if (task.claimed_by !== identity.instance) {
    return { ok: false, error: `Task ${taskId} not claimed by you (claimed by ${task.claimed_by || "nobody"})` };
  }

  task.status = "in_progress";
  task.heartbeat_at = now();
  await saveQueue(queue);

  // Update workboard
  await updateWorkboard(identity, {
    status: "working",
    current: `Working on ${task.id}: ${task.title}`,
    lane: task.sprint || "convergence",
  });

  return { ok: true, command: "start", task_id: taskId };
}

async function cmdHeartbeat(identity, taskId) {
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };
  if (task.claimed_by !== identity.instance) {
    return { ok: false, error: `Task ${taskId} not claimed by you` };
  }

  task.heartbeat_at = now();
  await saveQueue(queue);
  return { ok: true, command: "heartbeat", task_id: taskId, heartbeat_at: task.heartbeat_at };
}

async function cmdComplete(identity, taskId, notes) {
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };
  if (task.status === "completed") return { ok: true, command: "complete", task_id: taskId, message: "Already completed" };
  if (task.claimed_by && task.claimed_by !== identity.instance) {
    return { ok: false, error: `Task ${taskId} is currently claimed by ${task.claimed_by}` };
  }
  if (!canClaimTask(task, identity)) {
    const preferredFamily = getPreferredFamily(task);
    return { ok: false, error: `Task ${taskId} claim policy is ${getClaimPolicy(task)} and preferred family is ${preferredFamily || "any"}; you are ${identity.family}` };
  }

  task.status = "completed";
  task.completed_at = now();
  task.completed_by = identity.instance;
  if (notes) task.notes = notes;
  await saveQueue(queue);

  // Find what got unblocked
  const unblocked = queue.tasks
    .filter(t => t.status === "available" && t.blocked_by?.includes(taskId))
    .map(t => t.id);

  // Post to chat
  await postChat(identity, `Completed task ${taskId}: ${task.title}${unblocked.length ? `. Unblocked: ${unblocked.join(", ")}` : ""}`);

  // Update workboard
  const nextTask = queue.tasks
    .filter(t => t.status === "available" && canClaimTask(t, identity))
    .sort((a, b) => {
      const priorityDelta = a.priority - b.priority;
      if (priorityDelta !== 0) return priorityDelta;
      const preferredDelta = Number(!isPreferredForIdentity(a, identity)) - Number(!isPreferredForIdentity(b, identity));
      if (preferredDelta !== 0) return preferredDelta;
      return a.id.localeCompare(b.id);
    })[0];

  await updateWorkboard(identity, {
    status: "ready",
    current: `Completed ${task.id}`,
    next: nextTask ? `${nextTask.id}: ${nextTask.title}` : "No more tasks available",
    done: task.title,
    lane: task.sprint || "convergence",
  });

  return { ok: true, command: "complete", task_id: taskId, unblocked };
}

async function cmdRelease(identity, taskId) {
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };
  if (task.claimed_by !== identity.instance) {
    return { ok: false, error: `Task ${taskId} not claimed by you` };
  }

  task.status = "available";
  task.claimed_by = null;
  task.claimed_at = null;
  task.heartbeat_at = null;
  await saveQueue(queue);
  return { ok: true, command: "release", task_id: taskId };
}

async function cmdAdopt(identity, taskId) {
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };
  if (task.status === "completed") return { ok: false, error: `Task ${taskId} already completed` };
  if (!canClaimTask(task, identity)) {
    const preferredFamily = getPreferredFamily(task);
    return { ok: false, error: `Task ${taskId} claim policy is ${getClaimPolicy(task)} and preferred family is ${preferredFamily || "any"}; you are ${identity.family}` };
  }
  if (!task.claimed_by || task.claimed_by === identity.instance) {
    return cmdClaim(identity, taskId);
  }

  const heartbeatTime = task.heartbeat_at ? new Date(task.heartbeat_at).getTime() : 0;
  const isStale = !heartbeatTime || heartbeatTime < Date.now() - STALE_THRESHOLD_MS;
  if (!isStale) {
    return { ok: false, error: `Task ${taskId} is actively claimed by ${task.claimed_by}; stale adoption is not allowed yet.` };
  }

  const previousClaim = task.claimed_by;
  task.status = "claimed";
  task.claimed_by = identity.instance;
  task.claimed_at = now();
  task.heartbeat_at = now();
  await saveQueue(queue);
  await postChat(identity, `Adopted stale task ${taskId} from ${previousClaim}`);
  return { ok: true, command: "adopt", task_id: taskId, adopted_from: previousClaim, claimed_by: identity.instance };
}

async function cmdTransfer(identity, taskId, targetInstance) {
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };
  if (task.claimed_by !== identity.instance) {
    return { ok: false, error: `Task ${taskId} not claimed by you` };
  }
  if (!targetInstance) {
    return { ok: false, error: "Transfer requires --to <agent-instance>" };
  }

  task.claimed_by = targetInstance;
  task.claimed_at = now();
  task.heartbeat_at = now();
  await saveQueue(queue);
  await postChat(identity, `Transferred task ${taskId} to ${targetInstance}`);
  return { ok: true, command: "transfer", task_id: taskId, transferred_to: targetInstance };
}

async function reapStale(queue) {
  const threshold = Date.now() - STALE_THRESHOLD_MS;
  const reaped = [];
  for (const task of queue.tasks) {
    if ((task.status === "claimed" || task.status === "in_progress") && task.heartbeat_at) {
      const hb = new Date(task.heartbeat_at).getTime();
      if (hb < threshold) {
        reaped.push({ id: task.id, was_claimed_by: task.claimed_by });
        task.status = "available";
        task.claimed_by = null;
        task.claimed_at = null;
        task.heartbeat_at = null;
      }
    }
  }
  if (reaped.length > 0) {
    await saveQueue(queue);
  }
  return reaped;
}

async function cmdReap() {
  const queue = await loadQueue();
  const reaped = await reapStale(queue);
  return { ok: true, command: "reap", reaped_count: reaped.length, reaped };
}

async function cmdAdd(taskJson) {
  const queue = await loadQueue();
  const task = typeof taskJson === "string" ? JSON.parse(taskJson) : taskJson;
  if (!task.id) return { ok: false, error: "Task must have an id" };
  if (queue.tasks.find(t => t.id === task.id)) {
    return { ok: false, error: `Task ${task.id} already exists` };
  }

  // Defaults
  task.status = task.status || "available";
  task.blocked_by = task.blocked_by || [];
  task.claimed_by = task.claimed_by || null;
  task.claimed_at = task.claimed_at || null;
  task.heartbeat_at = task.heartbeat_at || null;
  task.completed_at = task.completed_at || null;
  task.completed_by = task.completed_by || null;
  task.priority = task.priority ?? 50;
  task.estimated_loc = task.estimated_loc ?? 0;
  task.files = task.files || [];
  task.description = task.description || "";
  task.notes = task.notes || "";

  queue.tasks.push(task);
  await saveQueue(queue);
  return { ok: true, command: "add", task_id: task.id };
}

// --- Workboard integration ---

async function updateWorkboard(identity, fields) {
  try {
    const wb = await readJson(FILES.workboardJson, { updated_at: now(), agents: {}, instances: {}, families: {} });
    const key = identity.instance;

    const entry = wb.instances[key] || wb.agents[key] || {};
    entry.agent = identity.family;
    entry.agent_family = identity.family;
    entry.agent_instance = identity.instance;
    entry.machine = identity.machine;
    entry.session_key = identity.sessionKey;
    if (fields.status) entry.status = fields.status;
    if (fields.lane) entry.lane = fields.lane;
    if (fields.current) entry.current = fields.current;
    if (fields.next) entry.next = fields.next;
    if (fields.done) {
      entry.completed_recent = entry.completed_recent || [];
      entry.completed_recent.unshift({ item: fields.done, timestamp: now() });
      entry.completed_recent = entry.completed_recent.slice(0, 10);
    }
    entry.last_message = `${fields.current || ""} | next: ${fields.next || ""}`;
    entry.last_updated = now();

    wb.agents[key] = entry;
    wb.instances[key] = entry;

    // Update families
    if (!wb.families[identity.family]) {
      wb.families[identity.family] = { family: identity.family, active_instances: [], instances: [], last_updated: now() };
    }
    const fam = wb.families[identity.family];
    // Codex writes active_instances as a number; normalize to array
    const instanceList = Array.isArray(fam.instances) ? fam.instances : (Array.isArray(fam.active_instances) ? fam.active_instances : []);
    if (!instanceList.includes(key)) {
      instanceList.push(key);
    }
    fam.instances = instanceList;
    fam.active_instances = instanceList;
    fam.active_count = instanceList.length;
    fam.last_updated = now();

    wb.updated_at = now();
    await writeJson(FILES.workboardJson, wb);

    // Regenerate markdown
    await regenerateWorkboardMd(wb);
  } catch (err) {
    // Non-fatal — don't break task queue over workboard write failure
    console.error("Workboard update failed:", err.message);
  }
}

async function regenerateWorkboardMd(wb) {
  const lines = [
    "# Agent Workboard",
    "",
    `Updated: ${wb.updated_at}`,
    "",
    "## Agent Families",
    "",
  ];

  for (const [name, fam] of Object.entries(wb.families || {})) {
    lines.push(`- ${name}: ${fam.active_count || fam.active_instances?.length || 0} instance(s)`);
  }
  lines.push("");

  for (const [key, entry] of Object.entries(wb.instances || {})) {
    lines.push(`## ${key}`);
    lines.push(`- Family: ${entry.agent_family || entry.agent}`);
    lines.push(`- Machine: ${entry.machine || "unknown"}`);
    lines.push(`- Session: ${entry.session_key || "unknown"}`);
    lines.push(`- Status: ${entry.status || "unknown"}`);
    lines.push(`- Lane: ${entry.lane || "default"}`);
    lines.push(`- Current: ${entry.current || "idle"}`);
    lines.push(`- Next: ${entry.next || "none"}`);
    lines.push(`- Last Message: ${entry.last_message || ""}`);
    lines.push(`- Last Updated: ${entry.last_updated || ""}`);
    if (entry.completed_recent?.length) {
      lines.push("- Recent Completed:");
      for (const c of entry.completed_recent.slice(0, 5)) {
        lines.push(`  ${c.timestamp} — ${c.item}`);
      }
    }
    lines.push("");
  }

  await fs.writeFile(FILES.workboardMarkdown, lines.join("\n") + "\n", "utf8");
}

// --- Chat integration ---

async function postChat(identity, message) {
  try {
    const entry = {
      id: `chat-${Date.now()}`,
      timestamp: now(),
      agent: identity.family,
      agent_family: identity.family,
      agent_instance: identity.instance,
      machine: identity.machine,
      session_key: identity.sessionKey,
      message,
    };
    await appendJsonl(FILES.chatJsonl, entry);

    // Append to markdown
    const mdLine = `- ${entry.timestamp} — ${identity.family}: ${message} [instance=${identity.instance}]\n`;
    const existing = await fs.readFile(FILES.chatMarkdown, "utf8").catch(() => "# Agent Chat\n\n");
    const headerEnd = existing.indexOf("\n\n");
    const header = existing.slice(0, headerEnd > 0 ? headerEnd : 0);
    const body = existing.slice(headerEnd > 0 ? headerEnd + 2 : 0);
    await fs.writeFile(
      FILES.chatMarkdown,
      `# Agent Chat\n\nUpdated: ${now()}\n\n${mdLine}${body}`,
      "utf8",
    );
  } catch (err) {
    console.error("Chat post failed:", err.message);
  }
}

// --- Rock Paper Scissors conflict resolution ---

const RPS_FILE = "H:\\prism\\state\\shared\\RPS_CHALLENGE.json";

async function cmdChallenge(identity, taskId, move) {
  const validMoves = ["r", "p", "s"];
  if (!validMoves.includes(move)) {
    return { ok: false, error: `Invalid move "${move}". Use r (rock), p (paper), or s (scissors).` };
  }
  const queue = await loadQueue();
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) return { ok: false, error: `Task ${taskId} not found` };

  // Load or create challenge state
  let challenge = await readJson(RPS_FILE, null);

  // If no active challenge for this task, create one
  if (!challenge || challenge.task_id !== taskId || challenge.resolved) {
    challenge = {
      task_id: taskId,
      created_at: now(),
      resolved: false,
      players: { [identity.instance]: { move, timestamp: now(), family: identity.family } },
      winner: null,
      reason: null,
    };
    await writeJson(RPS_FILE, challenge);
    await postChat(identity, `RPS CHALLENGE: ${identity.family} threw ${move} for task ${taskId}. Waiting for opponent...`);
    return { ok: true, command: "challenge", status: "waiting", task_id: taskId, your_move: move, message: "Challenge posted. Waiting for opponent to play." };
  }

  // Second player
  const players = Object.keys(challenge.players);
  if (players.includes(identity.instance)) {
    return { ok: false, error: "You already played in this challenge. Wait for opponent." };
  }

  challenge.players[identity.instance] = { move, timestamp: now(), family: identity.family };

  // Resolve
  const [p1Key, p2Key] = Object.keys(challenge.players);
  const m1 = challenge.players[p1Key].move;
  const m2 = challenge.players[p2Key].move;

  const beats = { r: "s", s: "p", p: "r" };
  let winnerKey, loserKey, reason;

  if (m1 === m2) {
    // Tie — first player gets priority (speed advantage)
    winnerKey = p1Key;
    loserKey = p2Key;
    reason = `Tie (${m1} vs ${m2}) — first player wins by speed`;
  } else if (beats[m1] === m2) {
    winnerKey = p1Key;
    loserKey = p2Key;
    reason = `${m1} beats ${m2}`;
  } else {
    winnerKey = p2Key;
    loserKey = p1Key;
    reason = `${m2} beats ${m1}`;
  }

  challenge.resolved = true;
  challenge.winner = winnerKey;
  challenge.loser = loserKey;
  challenge.reason = reason;
  challenge.resolved_at = now();
  await writeJson(RPS_FILE, challenge);

  // Auto-claim for winner
  if (task.status === "available" || (task.claimed_by && task.claimed_by !== winnerKey)) {
    task.status = "claimed";
    task.claimed_by = winnerKey;
    task.claimed_at = now();
    task.heartbeat_at = now();
    await saveQueue(queue);
  }

  const winnerFamily = challenge.players[winnerKey].family;
  const loserFamily = challenge.players[loserKey].family;
  await postChat(identity, `RPS RESOLVED: ${winnerFamily} wins (${reason})! Task ${taskId} → ${winnerKey}`);

  return {
    ok: true,
    command: "challenge",
    status: "resolved",
    task_id: taskId,
    winner: winnerKey,
    winner_family: winnerFamily,
    loser: loserKey,
    loser_family: loserFamily,
    reason,
    message: `${winnerFamily} wins! ${reason}. Task ${taskId} claimed by ${winnerKey}.`,
  };
}

// --- File lock for concurrent edit prevention ---

const LOCKS_FILE = "H:\\prism\\state\\shared\\FILE_LOCKS.json";
const LOCK_STALE_MS = 5 * 60 * 1000; // 5 minutes

async function cmdFileLock(identity, filePath) {
  const locks = await readJson(LOCKS_FILE, { locks: {} });
  const normalized = filePath.replace(/\\/g, "/");

  // Check for existing lock
  const existing = locks.locks[normalized];
  if (existing) {
    const age = Date.now() - new Date(existing.locked_at).getTime();
    if (age < LOCK_STALE_MS && existing.locked_by !== identity.instance) {
      return {
        ok: false,
        error: `File locked by ${existing.locked_by} (${existing.family}) since ${existing.locked_at}. Use 'challenge' to contest via RPS.`,
        locked_by: existing.locked_by,
        family: existing.family,
      };
    }
  }

  locks.locks[normalized] = {
    locked_by: identity.instance,
    family: identity.family,
    locked_at: now(),
  };
  await writeJson(LOCKS_FILE, locks);
  return { ok: true, command: "file-lock", path: normalized, locked_by: identity.instance };
}

async function cmdFileUnlock(identity, filePath) {
  const locks = await readJson(LOCKS_FILE, { locks: {} });
  const normalized = filePath.replace(/\\/g, "/");
  const existing = locks.locks[normalized];
  if (!existing) return { ok: true, command: "file-unlock", path: normalized, message: "Not locked" };
  if (existing.locked_by !== identity.instance) {
    return { ok: false, error: `File locked by ${existing.locked_by}, not you` };
  }
  delete locks.locks[normalized];
  await writeJson(LOCKS_FILE, locks);
  return { ok: true, command: "file-unlock", path: normalized };
}

async function cmdFileLocks() {
  const locks = await readJson(LOCKS_FILE, { locks: {} });
  const stale = Date.now() - LOCK_STALE_MS;
  const active = {};
  for (const [path, lock] of Object.entries(locks.locks)) {
    if (new Date(lock.locked_at).getTime() > stale) active[path] = lock;
  }
  return { ok: true, command: "file-locks", active_count: Object.keys(active).length, locks: active };
}

// --- Reconcile: auto-detect completed tasks from filesystem ---

const MCP_ROOT = "H:\\prism\\mcp-server";

/**
 * Task completion probes — maps task ID patterns to filesystem checks.
 * Each probe returns true if the task's deliverables exist on disk.
 */
const TASK_PROBES = {
  // Route-wiring tasks: check route file + client functions
  "M-1-3-DFM1": async () => {
    return await fileContains(`${MCP_ROOT}/src/routes/dfm.ts`, "createDfmRouter") &&
           await fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "dfmAnalyze");
  },
  "M-2-1-BIZ1": async () => {
    return await fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "quoteInstant") &&
           await fileContains(`${MCP_ROOT}/src/routes/quotes.ts`, "quotes/instant");
  },
  "M-2-2-LEARN1": async () => {
    return await fileContains(`${MCP_ROOT}/web/src/api/learningProgression.ts`, "listLearningCourses") &&
           await fileContains(`${MCP_ROOT}/src/routes/presets-learning.ts`, "learning/courses");
  },
  "M-2-4-LIVE1": async () => {
    return await fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "machineLiveList") &&
           await fileContains(`${MCP_ROOT}/src/routes/machineLive.ts`, "createMachineLiveRouter");
  },
  "M-2-3-OS1": async () => {
    return await fileExists(`${MCP_ROOT}/web/src/hooks/useLearningCourseRegistry.ts`);
  },
  // AUTO-0..7 engine tasks
  "AUTO-0-QS1": async () => fileExists(`${MCP_ROOT}/src/engines/QualityScoreEngine.ts`),
  "AUTO-0-QS2": async () => fileContains(`${MCP_ROOT}/src/tools/dispatchers/devDispatcher.ts`, "quality_score"),
  "AUTO-1-AW1": async () => fileExists(`${MCP_ROOT}/src/engines/AutoWiringEngine.ts`),
  "AUTO-1-AW2": async () => fileContains(`${MCP_ROOT}/src/tools/dispatchers/devDispatcher.ts`, "auto_wire"),
  "AUTO-2-AS1": async () => fileExists(`${MCP_ROOT}/src/engines/AutoSchemaGeneratorEngine.ts`),
  "AUTO-3-AT1": async () => fileExists(`${MCP_ROOT}/src/engines/AutoTestGeneratorEngine.ts`),
  "AUTO-4-AR1": async () => fileExists(`${MCP_ROOT}/src/engines/RouteSyncValidatorEngine.ts`),
  "AUTO-5-FA1": async () => fileExists(`${MCP_ROOT}/src/engines/FormulaValidationEngine.ts`),
  "AUTO-6-SI1": async () => fileExists(`${MCP_ROOT}/src/engines/SelfImprovementPatternEngine.ts`),
  "AUTO-7-CD1": async () => fileExists(`${MCP_ROOT}/src/engines/QualityDashboardEngine.ts`),
  // M-0 fixes
  "M-0-1-RFIX1": async () => fileContains(`${MCP_ROOT}/src/routes/quote.ts`, "createQuoteAliasRouter"),
  "M-0-1-RFIX2": async () => fileContains(`${MCP_ROOT}/src/routes/index.ts`, "billing"),
  "M-0-2-PROV1": async () => fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "messagesWorkspace"),
  "M-0-2-PROV2": async () => fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "jobApprovals"),
  "M-0-2-TESTS": async () => fileExists(`${MCP_ROOT}/src/__tests__/dfm-routes.test.ts`),
  // M-1 backend tasks
  "M-1-1-PARTS1": async () => fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "partsUpload"),
  "M-1-2-TRAV1": async () => fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "travelerCreate"),
  "M-1-3-PORT1": async () => fileContains(`${MCP_ROOT}/web/src/api/client.ts`, "portalShare"),
  "M-1-3-PSET1": async () => fileContains(`${MCP_ROOT}/src/routes/presets-learning.ts`, "presets"),
  // Frontend tasks (Codex)
  "M-0-2-FE-SWAP": async () => fileContains(`${MCP_ROOT}/web/src/api/dashboard.ts`, "machine-live"),
  "M-1-1-PARTS2": async () => fileExists(`${MCP_ROOT}/web/src/pages/PartsLibraryPage.tsx`) || fileContains(`${MCP_ROOT}/web/src/pages/ProgramReleasePage.tsx`, "parts"),
  "M-1-2-TRAV2": async () => fileExists(`${MCP_ROOT}/web/src/pages/TravelerPage.tsx`) || fileExists(`${MCP_ROOT}/web/src/pages/DispatchBoardPage.tsx`),
  "M-1-3-PORT2": async () => fileExists(`${MCP_ROOT}/web/src/pages/CustomerPortalPage.tsx`),
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileContains(filePath, substring) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content.includes(substring);
  } catch {
    return false;
  }
}

function refreshClaimedTaskHeartbeats(queue, identity) {
  const refreshedAt = now();
  const refreshed = [];

  for (const task of queue.tasks) {
    if (task.claimed_by !== identity.instance) {
      continue;
    }
    if (task.status !== "claimed" && task.status !== "in_progress") {
      continue;
    }
    task.heartbeat_at = refreshedAt;
    refreshed.push({
      id: task.id,
      title: task.title,
      status: task.status,
      heartbeat_at: refreshedAt,
    });
  }

  return refreshed;
}

async function reconcileQueue(queue, identity, noteText = "Auto-reconciled: deliverables verified on disk.") {
  const reconciledRecords = [];
  const checked = [];

  for (const task of queue.tasks) {
    if (task.status === "completed") continue;

    const probe = TASK_PROBES[task.id];
    if (!probe) continue;

    checked.push(task.id);

    try {
      const done = await probe();
      if (!done) {
        continue;
      }

      task.status = "completed";
      task.completed_at = now();
      task.completed_by = `${identity.instance} (auto-reconcile)`;
      task.notes = (task.notes ? `${task.notes} | ` : "") + noteText;
      reconciledRecords.push({ id: task.id, title: task.title });
    } catch {
      // Probe failed — skip, don't mark incomplete work as done
    }
  }

  return {
    checked,
    reconciledRecords,
  };
}

async function cmdReconcile(identity) {
  const queue = await loadQueue();
  const { checked, reconciledRecords } = await reconcileQueue(queue, identity);
  const reconciled = reconciledRecords.map((task) => task.id);

  if (reconciledRecords.length > 0) {
    await saveQueue(queue);
    await postChat(identity, `Auto-reconciled ${reconciled.length} tasks as complete: ${reconciled.join(", ")}`);
  }

  return {
    ok: true,
    command: "reconcile",
    checked: checked.length,
    reconciled_count: reconciledRecords.length,
    reconciled,
    reconciled_records: reconciledRecords,
    message: reconciled.length > 0
      ? `Auto-completed ${reconciled.length} tasks: ${reconciled.join(", ")}`
      : `Checked ${checked.length} tasks — all statuses are correct`,
  };
}

async function cmdCompactSync(identity) {
  const queue = await loadQueue();
  const refreshed = refreshClaimedTaskHeartbeats(queue, identity);
  const { checked, reconciledRecords } = await reconcileQueue(
    queue,
    identity,
    "Auto-reconciled during /compact: deliverables verified on disk.",
  );
  const reconciledIds = new Set(reconciledRecords.map((task) => task.id));
  const activeRefreshed = refreshed.filter((task) => !reconciledIds.has(task.id));

  if (refreshed.length > 0 || reconciledRecords.length > 0) {
    await saveQueue(queue);
  }

  if (reconciledRecords.length > 0) {
    await postChat(
      identity,
      `Pre-compact auto-completed ${reconciledRecords.length} tasks: ${reconciledRecords.map((task) => task.id).join(", ")}`,
    );
  }

  const messageParts = [];
  if (activeRefreshed.length > 0) {
    messageParts.push(`Refreshed ${activeRefreshed.length} active task heartbeat${activeRefreshed.length === 1 ? "" : "s"}`);
  }
  if (reconciledRecords.length > 0) {
    messageParts.push(`Completed ${reconciledRecords.length} task${reconciledRecords.length === 1 ? "" : "s"}: ${reconciledRecords.map((task) => task.id).join(", ")}`);
  }

  return {
    ok: true,
    command: "compact-sync",
    checked: checked.length,
    active_refreshed_count: activeRefreshed.length,
    active_refreshed: activeRefreshed,
    reconciled_count: reconciledRecords.length,
    reconciled: reconciledRecords.map((task) => task.id),
    reconciled_records: reconciledRecords,
    message: messageParts.length > 0
      ? messageParts.join(" | ")
      : `Checked ${checked.length} tasks — no active claims to refresh and no completed tasks to sync`,
  };
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || "list";

  const identity = inferAgentIdentity({
    family: args["agent-family"],
    instance: args["agent-instance"],
  });

  let result;
  switch (command) {
    case "list":
      result = await cmdList(identity);
      break;
    case "next":
      result = await cmdNext(identity);
      break;
    case "claim":
      result = await cmdClaim(identity, args.task);
      break;
    case "start":
      result = await cmdStart(identity, args.task);
      break;
    case "heartbeat":
      result = await cmdHeartbeat(identity, args.task);
      break;
    case "complete":
      result = await cmdComplete(identity, args.task, args.notes);
      break;
    case "release":
      result = await cmdRelease(identity, args.task);
      break;
    case "adopt":
      result = await cmdAdopt(identity, args.task);
      break;
    case "transfer":
      result = await cmdTransfer(identity, args.task, args.to);
      break;
    case "reap":
      result = await cmdReap();
      break;
    case "reconcile":
      result = await cmdReconcile(identity);
      break;
    case "compact-sync":
      result = await cmdCompactSync(identity);
      break;
    case "add":
      result = await cmdAdd(args.task);
      break;
    case "challenge":
      result = await cmdChallenge(identity, args.task, args.move);
      break;
    case "file-lock":
      result = await cmdFileLock(identity, args.path);
      break;
    case "file-unlock":
      result = await cmdFileUnlock(identity, args.path);
      break;
    case "file-locks":
      result = await cmdFileLocks();
      break;
    default:
      result = { ok: false, error: `Unknown command: ${command}` };
  }

  if (identity.family === "Agent" && !args["agent-family"]) {
    result.identity_warning = "Family inference resolved to Agent. Pass --agent-family Claude or --agent-family Codex for deterministic queue behavior.";
  }

  console.log(JSON.stringify(result));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
