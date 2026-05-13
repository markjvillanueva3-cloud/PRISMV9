import { promises as fs, watch as watchFs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inferAgentIdentity, sanitizeIdentityKey } from "./agent-identity.mjs";
import { startIpcServer } from "./coord-ipc-server.mjs";

const FILES = {
  sharedRoot: "H:\\prism\\state\\shared",
  chatJsonl: "H:\\prism\\state\\shared\\AGENT_CHAT.jsonl",
  workboardJson: "H:\\prism\\state\\shared\\AGENT_WORKBOARD.json",
  statusJson: "H:\\prism\\state\\shared\\AGENT_COORDINATION_STATUS.json",
  statusMarkdown: "H:\\prism\\state\\shared\\AGENT_COORDINATION_STATUS.md",
  daemonState: "H:\\prism\\state\\shared\\AGENT_COORDINATION_DAEMON.json",
  coordSummary: "H:\\prism\\state\\shared\\AGENT_COORDINATION_SUMMARY.json",
  cursorRoot: "H:\\prism\\state\\shared\\agent-coordination\\cursors",
  heartbeatDir: "H:\\prism\\state\\shared\\agent-coordination\\heartbeats",
  rpsChallenge: "H:\\prism\\state\\shared\\RPS_CHALLENGE.json",
  roadmapIndex: "H:\\prism\\mcp-server\\data\\roadmap-index.json",
};

// CPP-MS3-U-CPP25: RPS detection window — if two instances heartbeat the same
// milestone within this many ms, treat as a contention challenge.
const RPS_WINDOW_MS = 2000;

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        parsed[key] = true;
        continue;
      }
      parsed[key] = next;
      index += 1;
      continue;
    }
    parsed._.push(token);
  }
  return parsed;
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readJsonl(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function sanitizeAgentId(agent) {
  return agent.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "agent";
}

async function getCursorUnreadMap(chatEntries) {
  const unread = {};
  if (!(await pathExists(FILES.cursorRoot))) {
    return unread;
  }

  const entries = await fs.readdir(FILES.cursorRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) {
      continue;
    }
    const cursor = await readJson(path.join(FILES.cursorRoot, entry.name), null);
    if (!cursor?.agent) {
      continue;
    }
    const lastSeen = cursor.last_seen_timestamp ?? null;
    unread[cursor.agent] = chatEntries.filter((chatEntry) => {
      if (!chatEntry || chatEntry.agent === cursor.agent) {
        return false;
      }
      if (!lastSeen) {
        return true;
      }
      return chatEntry.timestamp > lastSeen;
    }).length;
  }
  return unread;
}

function buildStatus(chatEntries, workboard, daemonState, unreadByAgent) {
  const latestEntry = chatEntries.length > 0 ? chatEntries[chatEntries.length - 1] : null;
  const agents = Object.values(workboard?.agents ?? {}).sort((left, right) =>
    left.agent.localeCompare(right.agent),
  );
  return {
    generated_at: new Date().toISOString(),
    daemon: daemonState,
    chat_entries: chatEntries.length,
    latest_entry: latestEntry,
    active_agents: agents.length,
    unread_by_agent: unreadByAgent,
    agents: agents.map((agent) => ({
      agent: agent.agent,
      status: agent.status ?? "unknown",
      lane: agent.lane ?? null,
      current: agent.current ?? null,
      next: agent.next ?? null,
      last_updated: agent.last_updated ?? null,
    })),
  };
}

function renderStatusMarkdown(status) {
  const lines = [];
  lines.push("# Agent Coordination Status");
  lines.push("");
  lines.push(`Generated: ${status.generated_at}`);
  lines.push(`Daemon: ${status.daemon?.active ? "active" : "inactive"}${status.daemon?.pid ? ` | pid=${status.daemon.pid}` : ""}`);
  lines.push(`Active Agents: ${status.active_agents}`);
  lines.push(`Chat Entries: ${status.chat_entries}`);
  lines.push("");
  if (status.latest_entry) {
    lines.push("## Latest Entry");
    lines.push("");
    lines.push(`- ${status.latest_entry.timestamp} — ${status.latest_entry.agent}: ${status.latest_entry.message}`);
    lines.push("");
  }
  lines.push("## Unread By Agent");
  lines.push("");
  const unreadEntries = Object.entries(status.unread_by_agent ?? {});
  if (unreadEntries.length === 0) {
    lines.push("- No unread cursors tracked yet.");
  } else {
    for (const [agent, count] of unreadEntries.sort((left, right) => left[0].localeCompare(right[0]))) {
      lines.push(`- ${agent}: ${count}`);
    }
  }
  lines.push("");
  lines.push("## Active Work");
  lines.push("");
  if (status.agents.length === 0) {
    lines.push("- No active agents recorded yet.");
  } else {
    for (const agent of status.agents) {
      lines.push(`- ${agent.agent}: ${agent.status} | current=${agent.current ?? "not set"} | next=${agent.next ?? "not set"}${agent.lane ? ` | lane=${agent.lane}` : ""}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeDaemonState(state) {
  await ensureParent(FILES.daemonState);
  await fs.writeFile(FILES.daemonState, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function refreshStatus(daemonState) {
  const chatEntries = await readJsonl(FILES.chatJsonl);
  const [workboard, unreadByAgent] = await Promise.all([
    readJson(FILES.workboardJson, { updated_at: null, agents: {} }),
    getCursorUnreadMap(chatEntries),
  ]);
  const status = buildStatus(chatEntries, workboard, daemonState, unreadByAgent);
  await Promise.all([
    ensureParent(FILES.statusJson),
    ensureParent(FILES.statusMarkdown),
  ]);
  await Promise.all([
    fs.writeFile(FILES.statusJson, `${JSON.stringify(status, null, 2)}\n`, "utf8"),
    fs.writeFile(FILES.statusMarkdown, renderStatusMarkdown(status), "utf8"),
  ]);
  return status;
}

function isProcessAlive(pid) {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function startCommand() {
  const existing = await readJson(FILES.daemonState, null);
  if (existing?.pid && isProcessAlive(existing.pid)) {
    process.stdout.write(JSON.stringify({ ok: true, already_running: true, pid: existing.pid, state: FILES.daemonState }));
    return;
  }

  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "run"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  process.stdout.write(JSON.stringify({ ok: true, started: true, pid: child.pid, state: FILES.daemonState }));
}

async function stopCommand() {
  const existing = await readJson(FILES.daemonState, null);
  if (!existing?.pid || !isProcessAlive(existing.pid)) {
    process.stdout.write(JSON.stringify({ ok: true, stopped: false, reason: "not_running" }));
    return;
  }
  try {
    process.kill(existing.pid);
  } catch {
    // ignore
  }
  await writeDaemonState({
    active: false,
    pid: existing.pid,
    stopped_at: new Date().toISOString(),
    started_at: existing.started_at ?? null,
    last_heartbeat: existing.last_heartbeat ?? null,
  });
  process.stdout.write(JSON.stringify({ ok: true, stopped: true, pid: existing.pid }));
}

async function statusCommand() {
  const existing = await readJson(FILES.daemonState, { active: false });
  process.stdout.write(JSON.stringify({ ok: true, ...existing }));
}

async function runCommand() {
  const startedAt = new Date().toISOString();
  let debounceTimer = null;

  // U-COORD11: cached snapshots served over IPC. Refreshed every `update()`.
  let lastStatus = null;

  const update = async () => {
    const daemonState = {
      active: true,
      pid: process.pid,
      started_at: startedAt,
      last_heartbeat: new Date().toISOString(),
      watching: [FILES.chatJsonl, FILES.workboardJson, FILES.cursorRoot],
    };
    await writeDaemonState(daemonState);
    lastStatus = await refreshStatus(daemonState);
  };

  const triggerUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      update().catch(() => {});
    }, 250);
  };

  await update();

  // U-COORD11: start IPC server for hook queries. Skip entirely on env opt-out
  // so the file-only path stays available without rewriting hooks.
  let ipc = null;
  if (process.env.PRISM_COORD_IPC_DISABLE !== "1") {
    try {
      ipc = await startIpcServer({
        getStatus: () => lastStatus ?? readJson(FILES.statusJson, {}),
        getCoordSummary: () => readJson(FILES.coordSummary, { note: "summary not generated" }),
        getActiveSessions: () => {
          const agents = lastStatus?.agents ?? [];
          return agents.map((a) => ({
            chatId: a?.session_key ?? a?.agent_instance ?? null,
            lastSeen: a?.last_seen ?? null,
            slot: a?.slot ?? null,
            branch: a?.branch ?? null,
            topic: a?.topic ?? null,
            agent: a?.agent_family ?? a?.agent ?? null,
          }));
        },
      });
    } catch (err) {
      // Non-fatal: daemon continues without IPC. Hooks fall back to file reads.
      // eslint-disable-next-line no-console
      console.error(`[coord-daemon] ipc server failed to start: ${err.message}`);
    }
  }

  const watcher = watchFs(FILES.sharedRoot, { persistent: true, recursive: true }, (_eventType, filename) => {
    const name = typeof filename === "string" ? filename : "";
    if (!name.startsWith("AGENT_") && !name.startsWith("agent-coordination")) {
      return;
    }
    triggerUpdate();
  });

  const heartbeat = setInterval(() => {
    update().catch(() => {});
  }, 15000);

  const shutdown = async () => {
    clearInterval(heartbeat);
    watcher.close();
    if (ipc) {
      try {
        await ipc.stop();
      } catch {
        // ignore — server already gone
      }
    }
    await writeDaemonState({
      active: false,
      pid: process.pid,
      started_at: startedAt,
      stopped_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
    });
    process.exit(0);
  };

  // SIGINT/SIGTERM are the canonical exit signals on POSIX; SIGHUP fires when
  // the parent terminal closes; SIGBREAK is the Windows Ctrl-Break equivalent.
  // Covering all four means ipc.stop() always runs and the named pipe / UDS
  // socket is reclaimed cleanly on every exit path that we can intercept.
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGHUP", shutdown);
  if (process.platform === "win32") {
    process.on("SIGBREAK", shutdown);
  }
  // Last-resort: uncaughtException / unhandledRejection — log + close pipe + exit.
  // We don't try to recover; corrupt state is worse than a daemon restart.
  process.on("uncaughtException", (err) => {
    console.error(`[coord-daemon] uncaughtException: ${err?.stack ?? err}`);
    shutdown().catch(() => process.exit(1));
  });
  process.on("unhandledRejection", (reason) => {
    console.error(`[coord-daemon] unhandledRejection: ${reason}`);
    shutdown().catch(() => process.exit(1));
  });
}

/**
 * CPP-MS3-U-CPP25: Resolve the milestone this terminal has claimed in
 * roadmap-index.json. Matches by hostname+pid segment in `claimed_by`.
 * Returns null if no claim is found or the roadmap is unreadable.
 */
async function findClaimedMilestone(identity) {
  const roadmap = await readJson(FILES.roadmapIndex, null);
  if (!roadmap || !Array.isArray(roadmap.milestones)) {
    return null;
  }
  const markers = [identity.machine, identity.sessionKey, identity.instance].filter(Boolean);
  for (const milestone of roadmap.milestones) {
    const claimedBy = typeof milestone?.claimed_by === "string" ? milestone.claimed_by : "";
    if (!claimedBy) continue;
    if (markers.some((marker) => claimedBy.includes(marker))) {
      return { id: milestone.id, title: milestone.title ?? null, claimed_by: claimedBy };
    }
  }
  return null;
}

/**
 * CPP-MS3-U-CPP25: Append an RPS contention entry when two instances claim
 * the same milestone at the same instant (timestamps within RPS_WINDOW_MS).
 */
async function appendRpsChallenge(entry) {
  const existing = await readJson(FILES.rpsChallenge, null);
  const record = existing && typeof existing === "object" ? { ...existing } : {};
  if (!Array.isArray(record.challenges)) {
    record.challenges = [];
  }
  if (!("schemaVersion" in record)) {
    record.schemaVersion = "1.0.0";
  }
  record.resolved = false; // a new challenge means arbitration is pending
  record.challenges.push(entry);
  await ensureParent(FILES.rpsChallenge);
  await fs.writeFile(FILES.rpsChallenge, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

/**
 * CPP-MS3-U-CPP25: Per-instance heartbeat command.
 *
 * Usage: node agent-coordination-daemon.mjs heartbeat [--instance X] [--milestone Y]
 *
 * Writes state/shared/agent-coordination/heartbeats/<instance>.json and, if
 * another heartbeat file claims the same milestone within RPS_WINDOW_MS,
 * appends a contention entry to RPS_CHALLENGE.json.
 */
async function heartbeatCommand(parsedArgs) {
  const identity = inferAgentIdentity({
    instance: typeof parsedArgs.instance === "string" ? parsedArgs.instance : "",
  });
  const heartbeatKey = sanitizeIdentityKey(identity.instance, `${identity.family}-${identity.sessionKey}`);
  const heartbeatPath = path.join(FILES.heartbeatDir, `${heartbeatKey}.json`);

  let milestoneId = typeof parsedArgs.milestone === "string" ? parsedArgs.milestone : "";
  if (!milestoneId) {
    const claimed = await findClaimedMilestone(identity);
    milestoneId = claimed?.id ?? "";
  }

  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const record = {
    schemaVersion: "1.0.0",
    instance: identity.instance,
    family: identity.family,
    machine: identity.machine,
    session_key: identity.sessionKey,
    milestone_id: milestoneId || null,
    pid: process.pid,
    timestamp,
    timestamp_ms: now,
  };
  await ensureParent(heartbeatPath);
  await fs.writeFile(heartbeatPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  // Scan sibling heartbeats for same-milestone contention within RPS window.
  const conflicts = [];
  if (milestoneId) {
    try {
      const entries = await fs.readdir(FILES.heartbeatDir);
      for (const name of entries) {
        if (!name.endsWith(".json")) continue;
        if (name === `${heartbeatKey}.json`) continue;
        const otherPath = path.join(FILES.heartbeatDir, name);
        const other = await readJson(otherPath, null);
        if (!other || other.milestone_id !== milestoneId) continue;
        const otherMs = typeof other.timestamp_ms === "number"
          ? other.timestamp_ms
          : Date.parse(other.timestamp || "");
        if (!Number.isFinite(otherMs)) continue;
        const delta = Math.abs(now - otherMs);
        if (delta <= RPS_WINDOW_MS) {
          conflicts.push({
            other_instance: other.instance,
            other_timestamp: other.timestamp,
            delta_ms: delta,
          });
        }
      }
    } catch {
      // Heartbeat dir missing / unreadable — treat as no conflicts.
    }
  }

  let challengeLogged = false;
  if (conflicts.length > 0) {
    const rpsEntry = {
      challenge_id: `rps-${now}-${heartbeatKey}`,
      milestone_id: milestoneId,
      detected_at: timestamp,
      primary: {
        instance: identity.instance,
        timestamp,
        pid: process.pid,
      },
      contenders: conflicts,
      window_ms: RPS_WINDOW_MS,
      resolution: "pending",
      note: "Two or more instances heartbeat the same milestone within the RPS window. Manual arbitration required (user releases one claim).",
    };
    await appendRpsChallenge(rpsEntry);
    challengeLogged = true;
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    heartbeat_path: heartbeatPath,
    instance: identity.instance,
    milestone_id: milestoneId || null,
    conflicts: conflicts.length,
    challenge_logged: challengeLogged,
  }));
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const command = parsedArgs._[0] ?? "status";

  if (command === "start") {
    await startCommand();
    return;
  }
  if (command === "stop") {
    await stopCommand();
    return;
  }
  if (command === "status") {
    await statusCommand();
    return;
  }
  if (command === "run") {
    await runCommand();
    return;
  }
  if (command === "refresh") {
    const existing = await readJson(FILES.daemonState, {
      active: false,
      pid: null,
      started_at: null,
      last_heartbeat: new Date().toISOString(),
    });
    const status = await refreshStatus(existing);
    process.stdout.write(JSON.stringify({ ok: true, status_file: FILES.statusJson, active_agents: status.active_agents }));
    return;
  }
  if (command === "heartbeat") {
    await heartbeatCommand(parsedArgs);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
