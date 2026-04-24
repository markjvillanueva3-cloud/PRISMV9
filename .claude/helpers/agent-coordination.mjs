import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { inferAgentIdentity, sanitizeIdentityKey } from "./agent-identity.mjs";
import { writeAtomic } from "./atomic-write.mjs";

const FILES = {
  chatJsonl: "H:\\prism\\state\\shared\\AGENT_CHAT.jsonl",
  chatMarkdown: "H:\\prism\\state\\shared\\AGENT_CHAT.md",
  workboardJson: "H:\\prism\\state\\shared\\AGENT_WORKBOARD.json",
  workboardMarkdown: "H:\\prism\\state\\shared\\AGENT_WORKBOARD.md",
  statusJson: "H:\\prism\\state\\shared\\AGENT_COORDINATION_STATUS.json",
  statusMarkdown: "H:\\prism\\state\\shared\\AGENT_COORDINATION_STATUS.md",
  cursorRoot: "H:\\prism\\state\\shared\\agent-coordination\\cursors",
};

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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback) {
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

async function readCursor(agentInstance) {
  const cursorPath = path.join(FILES.cursorRoot, `${sanitizeIdentityKey(agentInstance)}.json`);
  return {
    path: cursorPath,
    state: await readJson(cursorPath, {
      agent_instance: agentInstance,
      last_seen_timestamp: null,
      last_seen_entry_id: null,
      updated_at: null,
    }),
  };
}

async function writeCursor(agentInstance, cursorState) {
  const cursorPath = path.join(FILES.cursorRoot, `${sanitizeIdentityKey(agentInstance)}.json`);
  await ensureParent(cursorPath);
  await writeAtomic(
    cursorPath,
    `${JSON.stringify({ agent_instance: agentInstance, ...cursorState }, null, 2)}\n`,
  );
}

function inferIdentity(parsedArgs) {
  return inferAgentIdentity({
    agent: typeof parsedArgs.agent === "string" ? parsedArgs.agent : "",
    family: typeof parsedArgs["agent-family"] === "string" ? parsedArgs["agent-family"] : "",
    instance: typeof parsedArgs["agent-instance"] === "string" ? parsedArgs["agent-instance"] : "",
  });
}

function parseStructuredMessage(rawMessage) {
  const segments = rawMessage
    .split(/\r?\n|[|;]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const structured = {
    message: "",
    status: null,
    lane: null,
    current: null,
    next: null,
    completed: [],
  };

  const freeform = [];
  for (const segment of segments) {
    const separatorIndex = segment.indexOf(":");
    if (separatorIndex === -1) {
      freeform.push(segment);
      continue;
    }
    const key = segment.slice(0, separatorIndex).trim().toLowerCase();
    const value = segment.slice(separatorIndex + 1).trim();
    if (!value) {
      continue;
    }
    if (key === "status") {
      structured.status = value;
      continue;
    }
    if (key === "lane") {
      structured.lane = value;
      continue;
    }
    if (key === "current") {
      structured.current = value;
      continue;
    }
    if (key === "next") {
      structured.next = value;
      continue;
    }
    if (key === "done" || key === "completed" || key === "complete") {
      structured.completed.push(
        ...value.split(/,\s*/).map((item) => item.trim()).filter(Boolean),
      );
      continue;
    }
    freeform.push(segment);
  }

  structured.message = freeform.join(" | ");
  if (!structured.message) {
    const generated = [];
    if (structured.current) {
      generated.push(`Current: ${structured.current}`);
    }
    if (structured.next) {
      generated.push(`Next: ${structured.next}`);
    }
    if (structured.completed.length > 0) {
      generated.push(`Done: ${structured.completed.join(", ")}`);
    }
    if (structured.status) {
      generated.push(`Status: ${structured.status}`);
    }
    structured.message = generated.join(" | ") || "Status update";
  }

  return structured;
}

function createChatEntry(identity, structured, rawMessage) {
  const now = new Date().toISOString();
  return {
    id: `chat-${Date.now()}`,
    timestamp: now,
    agent: identity.family,
    agent_family: identity.family,
    agent_instance: identity.instance,
    machine: identity.machine,
    session_key: identity.sessionKey,
    lane: structured.lane,
    status: structured.status,
    current: structured.current,
    next: structured.next,
    completed: structured.completed,
    message: structured.message,
    raw_message: rawMessage,
  };
}

function createDefaultWorkboard() {
  return {
    updated_at: new Date().toISOString(),
    instances: {},
    families: {},
  };
}

function updateWorkboard(workboard, entry) {
  const nextBoard = workboard && typeof workboard === "object" ? workboard : createDefaultWorkboard();
  const instances = nextBoard.instances ?? nextBoard.agents ?? {};
  const currentRecord = instances?.[entry.agent_instance] ?? {
    agent: entry.agent_family,
    agent_family: entry.agent_family,
    agent_instance: entry.agent_instance,
    machine: entry.machine ?? null,
    session_key: entry.session_key ?? null,
    status: "unknown",
    lane: null,
    current: null,
    next: null,
    completed_recent: [],
    last_message: null,
    last_updated: null,
  };

  const completedRecent = Array.isArray(currentRecord.completed_recent)
    ? [...currentRecord.completed_recent]
    : [];
  for (const item of entry.completed ?? []) {
    completedRecent.unshift({
      item,
      timestamp: entry.timestamp,
    });
  }

  const updatedRecord = {
    ...currentRecord,
    agent: entry.agent_family,
    agent_family: entry.agent_family,
    agent_instance: entry.agent_instance,
    machine: entry.machine ?? currentRecord.machine,
    session_key: entry.session_key ?? currentRecord.session_key,
    status: entry.status ?? currentRecord.status,
    lane: entry.lane ?? currentRecord.lane,
    current: entry.current ?? currentRecord.current,
    next: entry.next ?? currentRecord.next,
    completed_recent: completedRecent.slice(0, 10),
    last_message: entry.message,
    last_updated: entry.timestamp,
  };

  nextBoard.updated_at = entry.timestamp;
  nextBoard.instances = {
    ...instances,
    [entry.agent_instance]: updatedRecord,
  };
  nextBoard.agents = nextBoard.instances;

  const familyInstances = Object.values(nextBoard.instances).filter(
    (candidate) => candidate.agent_family === entry.agent_family,
  );
  nextBoard.families = {
    ...(nextBoard.families ?? {}),
    [entry.agent_family]: {
      family: entry.agent_family,
      active_instances: familyInstances.length,
      instances: familyInstances
        .map((candidate) => candidate.agent_instance)
        .sort((left, right) => left.localeCompare(right)),
      last_updated: entry.timestamp,
    },
  };
  return nextBoard;
}

function renderWorkboardMarkdown(workboard) {
  const instances = Object.values(workboard.instances ?? workboard.agents ?? {}).sort((left, right) =>
    left.agent_instance.localeCompare(right.agent_instance),
  );
  const families = Object.values(workboard.families ?? {}).sort((left, right) =>
    left.family.localeCompare(right.family),
  );

  const lines = [];
  lines.push("# Agent Workboard");
  lines.push("");
  lines.push(`Updated: ${workboard.updated_at}`);
  lines.push("");
  lines.push("## Agent Families");
  lines.push("");
  if (families.length === 0) {
    lines.push("- none");
  } else {
    for (const family of families) {
      lines.push(`- ${family.family}: ${family.active_instances} instance(s)`);
    }
  }
  lines.push("");
  for (const agent of instances) {
    lines.push(`## ${agent.agent_instance}`);
    lines.push(`- Family: ${agent.agent_family ?? agent.agent ?? "unknown"}`);
    lines.push(`- Machine: ${agent.machine ?? "unknown"}`);
    lines.push(`- Session: ${agent.session_key ?? "unknown"}`);
    lines.push(`- Status: ${agent.status ?? "unknown"}`);
    lines.push(`- Lane: ${agent.lane ?? "unspecified"}`);
    lines.push(`- Current: ${agent.current ?? "not set"}`);
    lines.push(`- Next: ${agent.next ?? "not set"}`);
    lines.push(`- Last Message: ${agent.last_message ?? "none"}`);
    lines.push(`- Last Updated: ${agent.last_updated ?? "unknown"}`);
    lines.push("- Recent Completed:");
    const completed = Array.isArray(agent.completed_recent) ? agent.completed_recent : [];
    if (completed.length === 0) {
      lines.push("  none");
    } else {
      for (const item of completed.slice(0, 5)) {
        lines.push(`  ${item.timestamp} — ${item.item}`);
      }
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function renderChatMarkdown(entries) {
  const lines = [];
  lines.push("# Agent Chat");
  lines.push("");
  lines.push(`Updated: ${new Date().toISOString()}`);
  lines.push("");
  for (const entry of entries.slice(-40).reverse()) {
    const tags = [];
    if (entry.status) {
      tags.push(`status=${entry.status}`);
    }
    if (entry.agent_instance) {
      tags.push(`instance=${entry.agent_instance}`);
    }
    if (entry.lane) {
      tags.push(`lane=${entry.lane}`);
    }
    if (entry.current) {
      tags.push(`current=${entry.current}`);
    }
    if (entry.next) {
      tags.push(`next=${entry.next}`);
    }
    if (Array.isArray(entry.completed) && entry.completed.length > 0) {
      tags.push(`done=${entry.completed.join(", ")}`);
    }
    const suffix = tags.length > 0 ? ` [${tags.join(" | ")}]` : "";
    lines.push(`- ${entry.timestamp} — ${entry.agent}: ${entry.message}${suffix}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildStatus(chatEntries, workboard, existingStatus = null) {
  const latestEntry = chatEntries.length > 0 ? chatEntries[chatEntries.length - 1] : null;
  const instances = Object.values(workboard?.instances ?? workboard?.agents ?? {}).sort((left, right) =>
    left.agent_instance.localeCompare(right.agent_instance),
  );
  const families = Object.values(workboard?.families ?? {}).sort((left, right) =>
    left.family.localeCompare(right.family),
  );
  return {
    generated_at: new Date().toISOString(),
    daemon: existingStatus?.daemon ?? null,
    chat_entries: chatEntries.length,
    latest_entry: latestEntry,
    active_agents: instances.length,
    active_families: families.length,
    unread_by_agent: existingStatus?.unread_by_agent ?? {},
    families: families.map((family) => ({
      family: family.family,
      active_instances: family.active_instances,
      instances: family.instances,
      last_updated: family.last_updated ?? null,
    })),
    agents: instances.map((agent) => ({
      agent: agent.agent_family ?? agent.agent,
      agent_family: agent.agent_family ?? agent.agent,
      agent_instance: agent.agent_instance ?? agent.agent,
      machine: agent.machine ?? null,
      session_key: agent.session_key ?? null,
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
  if (status.daemon) {
    lines.push(`Daemon: ${status.daemon.active ? "active" : "inactive"}${status.daemon.pid ? ` | pid=${status.daemon.pid}` : ""}`);
  }
  lines.push(`Active Instances: ${status.active_agents}`);
  lines.push(`Active Families: ${status.active_families ?? 0}`);
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
  lines.push("## Agent Families");
  lines.push("");
  const familyEntries = Array.isArray(status.families) ? status.families : [];
  if (familyEntries.length === 0) {
    lines.push("- No agent families recorded yet.");
  } else {
    for (const family of familyEntries) {
      lines.push(`- ${family.family}: ${family.active_instances} instance(s)`);
    }
  }
  lines.push("");
  lines.push("## Active Work");
  lines.push("");
  if (status.agents.length === 0) {
    lines.push("- No active agents recorded yet.");
  } else {
    for (const agent of status.agents) {
      lines.push(`- ${agent.agent_instance}: ${agent.status} | family=${agent.agent_family ?? agent.agent ?? "unknown"} | current=${agent.current ?? "not set"} | next=${agent.next ?? "not set"}${agent.lane ? ` | lane=${agent.lane}` : ""}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeArtifacts(chatEntries, workboard) {
  const existingStatus = await readJson(FILES.statusJson, null);
  const status = buildStatus(chatEntries, workboard, existingStatus);
  await Promise.all([
    ensureParent(FILES.chatJsonl),
    ensureParent(FILES.chatMarkdown),
    ensureParent(FILES.workboardJson),
    ensureParent(FILES.workboardMarkdown),
    ensureParent(FILES.statusJson),
    ensureParent(FILES.statusMarkdown),
  ]);

  await Promise.all([
    writeAtomic(
      FILES.chatJsonl,
      `${chatEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    ),
    writeAtomic(FILES.chatMarkdown, renderChatMarkdown(chatEntries)),
    writeAtomic(FILES.workboardJson, `${JSON.stringify(workboard, null, 2)}\n`),
    writeAtomic(FILES.workboardMarkdown, renderWorkboardMarkdown(workboard)),
    writeAtomic(FILES.statusJson, `${JSON.stringify(status, null, 2)}\n`),
    writeAtomic(FILES.statusMarkdown, renderStatusMarkdown(status)),
  ]);
}

function buildPollSummary(identity, unseenEntries, workboard) {
  if (unseenEntries.length === 0) {
    return "";
  }

  const latestPerAgent = new Map();
  for (const entry of unseenEntries) {
    latestPerAgent.set(entry.agent, entry);
  }

  const parts = [];
  parts.push(`COORDINATION UPDATE for ${identity.instance}: ${unseenEntries.length} unseen shared note${unseenEntries.length === 1 ? "" : "s"}.`);
  for (const entry of [...latestPerAgent.values()].slice(-3)) {
    const workboardAgent = workboard?.instances?.[entry.agent_instance] ?? workboard?.agents?.[entry.agent_instance] ?? null;
    const current = workboardAgent?.current ? ` current=${workboardAgent.current};` : "";
    const next = workboardAgent?.next ? ` next=${workboardAgent.next};` : "";
    parts.push(`${entry.agent_instance ?? entry.agent} at ${entry.timestamp}: ${entry.message}.${current}${next}`.trim());
  }
  parts.push("Shared coordination surfaces: H:/prism/state/shared/AGENT_WORKBOARD.md and H:/prism/state/shared/AGENT_CHAT.md.");
  return parts.join(" ");
}

async function postCommand(parsedArgs) {
  const identity = inferIdentity(parsedArgs);
  const rawMessage =
    typeof parsedArgs.message === "string" && parsedArgs.message.length > 0
      ? parsedArgs.message
      : parsedArgs._.slice(1).join(" ");
  if (!rawMessage.trim()) {
    throw new Error("No message provided. Use --message or pass freeform text after the command.");
  }

  const structured = parseStructuredMessage(rawMessage);
  if (typeof parsedArgs.status === "string") {
    structured.status = parsedArgs.status;
  }
  if (typeof parsedArgs.lane === "string") {
    structured.lane = parsedArgs.lane;
  }
  if (typeof parsedArgs.current === "string") {
    structured.current = parsedArgs.current;
  }
  if (typeof parsedArgs.next === "string") {
    structured.next = parsedArgs.next;
  }
  if (typeof parsedArgs.done === "string") {
    structured.completed.push(
      ...parsedArgs.done.split(/,\s*/).map((item) => item.trim()).filter(Boolean),
    );
  }

  const entry = createChatEntry(identity, structured, rawMessage);
  const [chatEntries, workboard] = await Promise.all([
    readJsonl(FILES.chatJsonl),
    readJson(FILES.workboardJson, createDefaultWorkboard()),
  ]);

  const nextEntries = [...chatEntries, entry].slice(-200);
  const nextBoard = updateWorkboard(workboard, entry);
  await writeArtifacts(nextEntries, nextBoard);

  process.stdout.write(
    JSON.stringify({
      ok: true,
      agent: identity.family,
      agent_instance: identity.instance,
      chat: FILES.chatMarkdown,
      workboard: FILES.workboardMarkdown,
      entry,
    }),
  );
}

async function summaryCommand() {
  const [chatEntries, workboard] = await Promise.all([
    readJsonl(FILES.chatJsonl),
    readJson(FILES.workboardJson, createDefaultWorkboard()),
  ]);

  const summary = {
    ok: true,
    chat_entries: chatEntries.length,
    agents: Object.keys(workboard.instances ?? workboard.agents ?? {}).length,
    families: Object.keys(workboard.families ?? {}).length,
    chat: FILES.chatMarkdown,
    workboard: FILES.workboardMarkdown,
    last_entry: chatEntries.length > 0 ? chatEntries[chatEntries.length - 1] : null,
  };
  process.stdout.write(JSON.stringify(summary));
}

async function initCommand() {
  const chatEntries = await readJsonl(FILES.chatJsonl);
  const workboard = await readJson(FILES.workboardJson, createDefaultWorkboard());
  await writeArtifacts(chatEntries, workboard);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      initialized: true,
      chat: FILES.chatMarkdown,
      workboard: FILES.workboardMarkdown,
    }),
  );
}

async function pollCommand(parsedArgs) {
  const identity = inferIdentity(parsedArgs);
  const consume = parsedArgs.consume !== "false";
  const [chatEntries, workboard, cursor] = await Promise.all([
    readJsonl(FILES.chatJsonl),
    readJson(FILES.workboardJson, createDefaultWorkboard()),
    readCursor(identity.instance),
  ]);

  const lastSeen = cursor.state?.last_seen_timestamp ?? null;
  const unseenEntries = chatEntries.filter((entry) => {
    if (!entry || (entry.agent_instance ?? entry.agent) === identity.instance) {
      return false;
    }
    if (!lastSeen) {
      return true;
    }
    return entry.timestamp > lastSeen;
  });

  if (consume && unseenEntries.length > 0) {
    const newest = unseenEntries[unseenEntries.length - 1];
    await writeCursor(identity.instance, {
      last_seen_timestamp: newest.timestamp,
      last_seen_entry_id: newest.id ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  const additionalContext = buildPollSummary(identity, unseenEntries, workboard);
  process.stdout.write(
    JSON.stringify({
      additionalContext,
      unseen: unseenEntries.length,
      agent: identity.family,
      agent_instance: identity.instance,
      chat: FILES.chatMarkdown,
      workboard: FILES.workboardMarkdown,
    }),
  );
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const command = parsedArgs._[0] ?? "summary";

  if (command === "post") {
    await postCommand(parsedArgs);
    return;
  }
  if (command === "summary") {
    await summaryCommand();
    return;
  }
  if (command === "init") {
    await initCommand();
    return;
  }
  if (command === "poll") {
    await pollCommand(parsedArgs);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
