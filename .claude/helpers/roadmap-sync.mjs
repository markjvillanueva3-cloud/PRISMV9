import { promises as fs } from "node:fs";
import path from "node:path";
import { inferAgentIdentity, sanitizeIdentityKey } from "./agent-identity.mjs";

const FILES = {
  directive: "H:\\prism\\state\\shared\\CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md",
  stateJson: "H:\\prism\\state\\shared\\ROADMAP_COLLABORATION_STATE.json",
  stateMarkdown: "H:\\prism\\state\\shared\\ROADMAP_COLLABORATION_STATE.md",
};

const DEFAULT_STATE = {
  generated_at: "2026-03-27T00:00:00.000Z",
  sync_schema_version: 2,
  collaboration_mode: "finish-current-delivery-first",
  current_gate: {
    id: "finish-current-backend-and-frontend-work-first",
    status: "active",
    description:
      "Finish the current backend and frontend work already in motion before opening a new large roadmap expansion pass.",
  },
  ownership: {
    Claude: "Backend-first: contracts, persistence, realtime sync, event flow, live system wiring.",
    Codex: "Frontend-first: shells, desks, provider seams, workflow UX, employee/shop-facing integration.",
  },
  current_delivery_priority: [
    "Finish the current backend execution tranche.",
    "Finish the current frontend execution tranche.",
    "Keep the shared coordination surfaces up to date while work is in flight.",
    "Avoid premature roadmap sprawl while current delivery is incomplete.",
  ],
  post_gate_objective: {
    trigger: "Begin only after the current backend/frontend tranche is complete and stable.",
    goal: "Generate a meticulous, dependency-ordered, SVI-aware roadmap to close every remaining major PRISM gap.",
  },
  roadmap_quality_rules: [
    "Sequence by dependency and ownership.",
    "Keep frontend and backend responsibilities explicit.",
    "Call out SVI/Psi impact or coverage effect for major work areas.",
    "Identify missing skills, scripts, hooks, indexes, and MCP capabilities.",
    "Account for self-learning, retention, token efficiency, and context infrastructure.",
    "Prefer high-confidence execution slices over vague mega-epics.",
  ],
  knowledge_domains: [
    "manufacturing engineering",
    "CNC/CAM/process planning",
    "mechanical design and machine kinematics",
    "industrial engineering and operations research",
    "statistics and applied mathematics",
    "materials science",
    "quality engineering and metrology",
    "controls, automation, and instrumentation",
    "cost accounting, quoting, and business operations",
    "supply chain and logistics",
    "software architecture and distributed systems",
    "machine learning, deep learning, and retrieval systems",
    "knowledge management and long-term memory systems",
    "human factors, HCI, and workflow design",
    "cybersecurity and safety engineering",
  ],
  capability_targets: [
    "self-learning",
    "learning retention",
    "deep learning",
    "context retention",
    "token utilization",
    "skills",
    "scripts",
    "hooks",
    "MCP-server capabilities",
    "PRISM feature creation and system-wide improvement",
  ],
  convergence: {
    target:
      "Backend/frontend live-contract convergence on the current active delivery tranche.",
    readiness: "in-progress",
    next_gap_roadmap_trigger:
      "Begin only after current backend/frontend delivery is complete and stable.",
  },
  participants: {},
  families: {},
  sync_records: {},
  last_mode_change: null,
  notes: [],
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

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function inferIdentity(parsedArgs) {
  return inferAgentIdentity({
    agent: typeof parsedArgs.agent === "string" ? parsedArgs.agent : "",
    family: typeof parsedArgs["agent-family"] === "string" ? parsedArgs["agent-family"] : "",
    instance: typeof parsedArgs["agent-instance"] === "string" ? parsedArgs["agent-instance"] : "",
  });
}

function normalizeNote(note) {
  const agentFamily =
    typeof note?.agent_family === "string" && note.agent_family.trim()
      ? note.agent_family.trim()
      : typeof note?.agent === "string" && note.agent.trim()
        ? note.agent.trim()
        : "Agent";
  const agentInstance =
    typeof note?.agent_instance === "string" && note.agent_instance.trim()
      ? note.agent_instance.trim()
      : agentFamily;

  return {
    timestamp:
      typeof note?.timestamp === "string" && note.timestamp.trim()
        ? note.timestamp.trim()
        : new Date().toISOString(),
    agent: agentFamily,
    agent_family: agentFamily,
    agent_instance: agentInstance,
    machine:
      typeof note?.machine === "string" && note.machine.trim() ? note.machine.trim() : null,
    session_key:
      typeof note?.session_key === "string" && note.session_key.trim()
        ? note.session_key.trim()
        : null,
    note: typeof note?.note === "string" ? note.note.trim() : "",
  };
}

function normalizeListLike(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\s*\|\|\s*|\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeParticipant(participantKey, participant) {
  const instance =
    typeof participant?.agent_instance === "string" && participant.agent_instance.trim()
      ? participant.agent_instance.trim()
      : participantKey;
  const family =
    typeof participant?.agent_family === "string" && participant.agent_family.trim()
      ? participant.agent_family.trim()
      : typeof participant?.agent === "string" && participant.agent.trim()
        ? participant.agent.trim()
        : "Agent";

  return {
    agent: family,
    agent_family: family,
    agent_instance: instance,
    machine:
      typeof participant?.machine === "string" && participant.machine.trim()
        ? participant.machine.trim()
        : null,
    session_key:
      typeof participant?.session_key === "string" && participant.session_key.trim()
        ? participant.session_key.trim()
        : null,
    last_note:
      typeof participant?.last_note === "string" && participant.last_note.trim()
        ? participant.last_note.trim()
        : null,
    last_updated:
      typeof participant?.last_updated === "string" && participant.last_updated.trim()
        ? participant.last_updated.trim()
        : null,
    last_action:
      typeof participant?.last_action === "string" && participant.last_action.trim()
        ? participant.last_action.trim()
        : null,
  };
}

function normalizeSyncRecord(syncKey, syncRecord) {
  const instance =
    typeof syncRecord?.agent_instance === "string" && syncRecord.agent_instance.trim()
      ? syncRecord.agent_instance.trim()
      : syncKey;
  const family =
    typeof syncRecord?.agent_family === "string" && syncRecord.agent_family.trim()
      ? syncRecord.agent_family.trim()
      : typeof syncRecord?.agent === "string" && syncRecord.agent.trim()
        ? syncRecord.agent.trim()
        : "Agent";

  return {
    agent: family,
    agent_family: family,
    agent_instance: instance,
    machine:
      typeof syncRecord?.machine === "string" && syncRecord.machine.trim()
        ? syncRecord.machine.trim()
        : null,
    session_key:
      typeof syncRecord?.session_key === "string" && syncRecord.session_key.trim()
        ? syncRecord.session_key.trim()
        : null,
    lane:
      typeof syncRecord?.lane === "string" && syncRecord.lane.trim()
        ? syncRecord.lane.trim()
        : "general",
    status:
      typeof syncRecord?.status === "string" && syncRecord.status.trim()
        ? syncRecord.status.trim()
        : "active",
    current:
      typeof syncRecord?.current === "string" && syncRecord.current.trim()
        ? syncRecord.current.trim()
        : "",
    next:
      typeof syncRecord?.next === "string" && syncRecord.next.trim()
        ? syncRecord.next.trim()
        : "",
    done:
      typeof syncRecord?.done === "string" && syncRecord.done.trim()
        ? syncRecord.done.trim()
        : "",
    blockers: normalizeListLike(syncRecord?.blockers),
    needs_from_other_agent: normalizeListLike(syncRecord?.needs_from_other_agent),
    convergence_target:
      typeof syncRecord?.convergence_target === "string" && syncRecord.convergence_target.trim()
        ? syncRecord.convergence_target.trim()
        : "",
    updated_at:
      typeof syncRecord?.updated_at === "string" && syncRecord.updated_at.trim()
        ? syncRecord.updated_at.trim()
        : null,
  };
}

function rebuildFamilies(participants) {
  const familyMap = {};
  for (const participant of Object.values(participants ?? {})) {
    if (!participant?.agent_family) {
      continue;
    }
    const current = familyMap[participant.agent_family] ?? {
      family: participant.agent_family,
      active_instances: [],
    };
    if (!current.active_instances.includes(participant.agent_instance)) {
      current.active_instances.push(participant.agent_instance);
    }
    familyMap[participant.agent_family] = current;
  }

  for (const family of Object.values(familyMap)) {
    family.active_instances.sort((left, right) => left.localeCompare(right));
    family.active_count = family.active_instances.length;
  }

  return familyMap;
}

function pruneLegacyParticipants(participants) {
  const nextParticipants = {};
  const familySpecificInstances = {};

  for (const participant of Object.values(participants ?? {})) {
    if (!participant?.agent_family) {
      continue;
    }
    const current = familySpecificInstances[participant.agent_family] ?? [];
    const isSpecificInstance =
      participant.agent_instance &&
      participant.agent_instance !== participant.agent_family &&
      (participant.machine || participant.session_key);
    if (isSpecificInstance) {
      current.push(participant.agent_instance);
    }
    familySpecificInstances[participant.agent_family] = current;
  }

  for (const participant of Object.values(participants ?? {})) {
    const specificInstances = familySpecificInstances[participant.agent_family] ?? [];
    const isLegacyPlaceholder =
      participant.agent_instance === participant.agent_family &&
      !participant.machine &&
      !participant.session_key &&
      specificInstances.length > 0;
    if (isLegacyPlaceholder) {
      continue;
    }
    nextParticipants[participant.agent_instance] = participant;
  }

  return nextParticipants;
}

function parseTimestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function instanceSpecificityScore(value) {
  const raw = String(value ?? "");
  let score = 0;
  if (/[@/#]/.test(raw)) {
    score += 10;
  }
  if (/@/.test(raw) && /\//.test(raw)) {
    score += 5;
  }
  return score;
}

function mergeAliasedParticipants(participants) {
  const mergedParticipants = {};
  const aliases = {};

  for (const participant of Object.values(participants ?? {})) {
    if (!participant?.agent_instance || !participant?.agent_family) {
      continue;
    }

    const aliasKey = `${participant.agent_family}:${sanitizeIdentityKey(participant.agent_instance, "agent")}`;
    const existing = aliases[aliasKey];
    if (!existing) {
      aliases[aliasKey] = participant;
      continue;
    }

    const existingScore = instanceSpecificityScore(existing.agent_instance);
    const candidateScore = instanceSpecificityScore(participant.agent_instance);
    const existingUpdated = parseTimestamp(existing.last_updated);
    const candidateUpdated = parseTimestamp(participant.last_updated);

    const canonical =
      candidateScore > existingScore ||
      (candidateScore === existingScore && candidateUpdated >= existingUpdated)
        ? participant
        : existing;
    const latest = candidateUpdated >= existingUpdated ? participant : existing;

    aliases[aliasKey] = {
      ...canonical,
      agent: canonical.agent_family,
      agent_family: canonical.agent_family,
      agent_instance: canonical.agent_instance,
      machine: latest.machine ?? canonical.machine ?? null,
      session_key: canonical.session_key ?? latest.session_key ?? null,
      last_note: latest.last_note ?? canonical.last_note ?? null,
      last_updated:
        latest.last_updated ?? canonical.last_updated ?? null,
      last_action: latest.last_action ?? canonical.last_action ?? null,
    };
  }

  for (const participant of Object.values(aliases)) {
    mergedParticipants[participant.agent_instance] = participant;
  }

  return mergedParticipants;
}

function normalizeState(rawState) {
  const fallback = cloneDefaultState();
  const baseState = rawState && typeof rawState === "object" ? rawState : {};

  const notes = Array.isArray(baseState.notes)
    ? baseState.notes.map((note) => normalizeNote(note)).filter((note) => note.note)
    : [];

  const participants = {};
  const seedParticipants =
    baseState.participants && typeof baseState.participants === "object" ? baseState.participants : {};
  for (const [participantKey, participant] of Object.entries(seedParticipants)) {
    const normalized = normalizeParticipant(participantKey, participant);
    participants[normalized.agent_instance] = normalized;
  }

  for (const note of notes) {
    const current = participants[note.agent_instance] ?? normalizeParticipant(note.agent_instance, note);
    const currentTimestamp = current.last_updated ? Date.parse(current.last_updated) : Number.NaN;
    const noteTimestamp = Date.parse(note.timestamp);
    const shouldPromoteNote =
      !current.last_updated ||
      Number.isNaN(currentTimestamp) ||
      (!Number.isNaN(noteTimestamp) && noteTimestamp >= currentTimestamp) ||
      current.last_action === "note";
    participants[note.agent_instance] = {
      ...current,
      agent: note.agent_family,
      agent_family: note.agent_family,
      agent_instance: note.agent_instance,
      machine: note.machine ?? current.machine,
      session_key: note.session_key ?? current.session_key,
      last_note: shouldPromoteNote ? note.note : current.last_note,
      last_updated: shouldPromoteNote ? note.timestamp : current.last_updated,
      last_action: current.last_action ?? "note",
    };
  }

  const prunedParticipants = mergeAliasedParticipants(pruneLegacyParticipants(participants));
  const syncRecords = {};
  const seedSyncRecords =
    baseState.sync_records && typeof baseState.sync_records === "object" ? baseState.sync_records : {};
  for (const [syncKey, syncRecord] of Object.entries(seedSyncRecords)) {
    const normalized = normalizeSyncRecord(syncKey, syncRecord);
    syncRecords[normalized.agent_instance] = normalized;
  }

  const currentGate = {
    ...fallback.current_gate,
    ...(baseState.current_gate && typeof baseState.current_gate === "object"
      ? baseState.current_gate
      : {}),
  };
  const postGateObjective = {
    ...fallback.post_gate_objective,
    ...(baseState.post_gate_objective && typeof baseState.post_gate_objective === "object"
      ? baseState.post_gate_objective
      : {}),
  };

  const normalizedState = {
    ...fallback,
    ...baseState,
    generated_at:
      typeof baseState.generated_at === "string" && baseState.generated_at.trim()
        ? baseState.generated_at.trim()
        : fallback.generated_at,
    collaboration_mode:
      typeof baseState.collaboration_mode === "string" && baseState.collaboration_mode.trim()
        ? baseState.collaboration_mode.trim()
        : fallback.collaboration_mode,
    current_gate: currentGate,
    ownership:
      baseState.ownership && typeof baseState.ownership === "object"
        ? baseState.ownership
        : fallback.ownership,
    current_delivery_priority: Array.isArray(baseState.current_delivery_priority)
      ? baseState.current_delivery_priority
      : fallback.current_delivery_priority,
    post_gate_objective: postGateObjective,
    roadmap_quality_rules: Array.isArray(baseState.roadmap_quality_rules)
      ? baseState.roadmap_quality_rules
      : fallback.roadmap_quality_rules,
    knowledge_domains: Array.isArray(baseState.knowledge_domains)
      ? baseState.knowledge_domains
      : fallback.knowledge_domains,
    capability_targets: Array.isArray(baseState.capability_targets)
      ? baseState.capability_targets
      : fallback.capability_targets,
    convergence:
      baseState.convergence && typeof baseState.convergence === "object"
        ? {
            ...fallback.convergence,
            ...baseState.convergence,
          }
        : fallback.convergence,
    participants: prunedParticipants,
    families: rebuildFamilies(prunedParticipants),
    sync_records: syncRecords,
    last_mode_change:
      baseState.last_mode_change && typeof baseState.last_mode_change === "object"
        ? baseState.last_mode_change
        : fallback.last_mode_change,
    notes,
  };

  return normalizedState;
}

function upsertParticipant(state, identity, action, noteText = null) {
  const participants = {
    ...(state.participants ?? {}),
  };
  const current = participants[identity.instance] ?? normalizeParticipant(identity.instance, {
    agent_family: identity.family,
    agent_instance: identity.instance,
    machine: identity.machine,
    session_key: identity.sessionKey,
  });
  participants[identity.instance] = {
    ...current,
    agent: identity.family,
    agent_family: identity.family,
    agent_instance: identity.instance,
    machine: identity.machine,
    session_key: identity.sessionKey,
    last_note: noteText ?? current.last_note,
    last_updated: new Date().toISOString(),
    last_action: action,
  };
  const prunedParticipants = mergeAliasedParticipants(pruneLegacyParticipants(participants));
  return {
    ...state,
    participants: prunedParticipants,
    families: rebuildFamilies(prunedParticipants),
  };
}

function upsertSyncRecord(state, identity, patch) {
  const syncRecords = {
    ...(state.sync_records ?? {}),
  };
  const current = syncRecords[identity.instance] ?? normalizeSyncRecord(identity.instance, {
    agent_family: identity.family,
    agent_instance: identity.instance,
    machine: identity.machine,
    session_key: identity.sessionKey,
  });

  syncRecords[identity.instance] = normalizeSyncRecord(identity.instance, {
    ...current,
    ...patch,
    agent: identity.family,
    agent_family: identity.family,
    agent_instance: identity.instance,
    machine: identity.machine,
    session_key: identity.sessionKey,
    updated_at: new Date().toISOString(),
  });

  return {
    ...state,
    sync_records: syncRecords,
  };
}

function renderParticipantSuffix(participant) {
  const parts = [`instance=${participant.agent_instance}`];
  if (participant.machine) {
    parts.push(`machine=${participant.machine}`);
  }
  if (participant.session_key) {
    parts.push(`session=${participant.session_key}`);
  }
  return parts.join(" | ");
}

function renderMarkdown(state) {
  const lines = [];
  lines.push("# Roadmap Collaboration State");
  lines.push("");
  lines.push(`Generated: ${state.generated_at}`);
  lines.push("");
  lines.push("## Collaboration Mode");
  lines.push("");
  lines.push(`- Mode: \`${state.collaboration_mode}\``);
  lines.push("");
  lines.push("## Current Gate");
  lines.push("");
  lines.push(`- ID: \`${state.current_gate.id}\``);
  lines.push(`- Status: \`${state.current_gate.status}\``);
  lines.push(`- Description: ${state.current_gate.description}`);
  lines.push("");
  lines.push("## Ownership");
  lines.push("");
  for (const [agent, description] of Object.entries(state.ownership ?? {})) {
    lines.push(`- ${agent}: ${description}`);
  }
  lines.push("");
  lines.push("## Active Families");
  lines.push("");
  const families = Object.values(state.families ?? {}).sort((left, right) =>
    left.family.localeCompare(right.family),
  );
  if (families.length === 0) {
    lines.push("- none yet");
  } else {
    for (const family of families) {
      lines.push(
        `- ${family.family}: ${family.active_count} active instance(s) (${family.active_instances.join(", ")})`,
      );
    }
  }
  lines.push("");
  lines.push("## Active Participants");
  lines.push("");
  const participants = Object.values(state.participants ?? {}).sort((left, right) =>
    left.agent_instance.localeCompare(right.agent_instance),
  );
  if (participants.length === 0) {
    lines.push("- none yet");
  } else {
    for (const participant of participants) {
      lines.push(
        `- ${participant.agent_family} [${renderParticipantSuffix(participant)}]${participant.last_action ? ` — last action: ${participant.last_action}` : ""}`,
      );
      if (participant.last_note) {
        lines.push(`  last note: ${participant.last_note}`);
      }
      if (participant.last_updated) {
        lines.push(`  updated: ${participant.last_updated}`);
      }
    }
  }
  lines.push("");
  lines.push("## Current Delivery Priority");
  lines.push("");
  for (const item of state.current_delivery_priority ?? []) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## Convergence");
  lines.push("");
  lines.push(`- Target: ${state.convergence?.target ?? "not set"}`);
  lines.push(`- Readiness: \`${state.convergence?.readiness ?? "unknown"}\``);
  lines.push(
    `- Next gap-roadmap trigger: ${state.convergence?.next_gap_roadmap_trigger ?? "not set"}`,
  );
  lines.push("");
  lines.push("## Structured Sync Records");
  lines.push("");
  const syncRecords = Object.values(state.sync_records ?? {}).sort((left, right) =>
    left.agent_instance.localeCompare(right.agent_instance),
  );
  if (syncRecords.length === 0) {
    lines.push("- none yet");
  } else {
    for (const syncRecord of syncRecords) {
      lines.push(
        `- ${syncRecord.agent_family} [${renderParticipantSuffix(syncRecord)}] — lane: ${syncRecord.lane} | status: ${syncRecord.status}`,
      );
      if (syncRecord.current) {
        lines.push(`  current: ${syncRecord.current}`);
      }
      if (syncRecord.next) {
        lines.push(`  next: ${syncRecord.next}`);
      }
      if (syncRecord.done) {
        lines.push(`  done: ${syncRecord.done}`);
      }
      if (syncRecord.blockers.length > 0) {
        lines.push(`  blockers: ${syncRecord.blockers.join(" || ")}`);
      }
      if (syncRecord.needs_from_other_agent.length > 0) {
        lines.push(`  needs: ${syncRecord.needs_from_other_agent.join(" || ")}`);
      }
      if (syncRecord.convergence_target) {
        lines.push(`  convergence target: ${syncRecord.convergence_target}`);
      }
      if (syncRecord.updated_at) {
        lines.push(`  updated: ${syncRecord.updated_at}`);
      }
    }
  }
  lines.push("");
  lines.push("## Post-Gate Objective");
  lines.push("");
  lines.push(`- Trigger: ${state.post_gate_objective?.trigger ?? "not set"}`);
  lines.push(`- Goal: ${state.post_gate_objective?.goal ?? "not set"}`);
  if (state.last_mode_change) {
    lines.push(
      `- Last mode change: ${state.last_mode_change.timestamp} by ${state.last_mode_change.agent_family} [instance=${state.last_mode_change.agent_instance}]`,
    );
  }
  lines.push("");
  lines.push("## Roadmap Quality Rules");
  lines.push("");
  for (const item of state.roadmap_quality_rules ?? []) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## Knowledge Domains");
  lines.push("");
  for (const item of state.knowledge_domains ?? []) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## Capability Targets");
  lines.push("");
  for (const item of state.capability_targets ?? []) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  const notes = Array.isArray(state.notes) ? state.notes : [];
  if (notes.length === 0) {
    lines.push("- none yet");
  } else {
    for (const note of notes.slice(-20).reverse()) {
      const suffixParts = [`instance=${note.agent_instance}`];
      if (note.machine) {
        suffixParts.push(`machine=${note.machine}`);
      }
      if (note.session_key) {
        suffixParts.push(`session=${note.session_key}`);
      }
      lines.push(`- ${note.timestamp} — ${note.agent_family} [${suffixParts.join(" | ")}]: ${note.note}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildFamilySyncOverview(state) {
  const byFamily = {};
  for (const syncRecord of Object.values(state.sync_records ?? {})) {
    const current = byFamily[syncRecord.agent_family];
    if (!current) {
      byFamily[syncRecord.agent_family] = syncRecord;
      continue;
    }
    if (parseTimestamp(syncRecord.updated_at) >= parseTimestamp(current.updated_at)) {
      byFamily[syncRecord.agent_family] = syncRecord;
    }
  }
  for (const participant of Object.values(state.participants ?? {})) {
    if (byFamily[participant.agent_family]) {
      continue;
    }
    byFamily[participant.agent_family] = normalizeSyncRecord(participant.agent_instance, {
      ...participant,
      lane: "participant-note-fallback",
      status: participant.last_action ?? "active",
      current: participant.last_note ?? "",
      updated_at: participant.last_updated ?? null,
    });
  }
  return Object.values(byFamily).sort((left, right) =>
    left.agent_family.localeCompare(right.agent_family),
  );
}

function buildSequencingReminder(state) {
  const gateActive = state.current_gate?.status === "active";
  if (gateActive) {
    return "Finish the active backend/frontend delivery tranche first, keep shared sync records current, and defer the next large gap-roadmap pass until convergence is stable.";
  }
  return "The delivery gate is open; Claude and Codex should coordinate a dependency-ordered, SVI-aware roadmap pass before expanding into new execution tracks.";
}

async function writeState(state) {
  const nextState = normalizeState({
    ...state,
    generated_at: new Date().toISOString(),
  });
  await Promise.all([ensureParent(FILES.stateJson), ensureParent(FILES.stateMarkdown)]);
  await Promise.all([
    fs.writeFile(FILES.stateJson, `${JSON.stringify(nextState, null, 2)}\n`, "utf8"),
    fs.writeFile(FILES.stateMarkdown, renderMarkdown(nextState), "utf8"),
  ]);
  return nextState;
}

async function readState() {
  return normalizeState(await readJson(FILES.stateJson, null));
}

async function initCommand() {
  const existing = await readJson(FILES.stateJson, null);
  const state = await writeState(existing ?? DEFAULT_STATE);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      initialized: true,
      directive: FILES.directive,
      state_json: FILES.stateJson,
      state_markdown: FILES.stateMarkdown,
      collaboration_mode: state.collaboration_mode,
      gate_status: state.current_gate.status,
      participants: Object.keys(state.participants ?? {}).length,
      families: Object.keys(state.families ?? {}).length,
    }),
  );
}

async function statusCommand() {
  const state = await readState();
  const gateActive = state.current_gate?.status === "active";
  const familySyncOverview = buildFamilySyncOverview(state);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      directive: FILES.directive,
      state_json: FILES.stateJson,
      state_markdown: FILES.stateMarkdown,
      collaboration_mode: state.collaboration_mode,
      gate: state.current_gate,
      gate_active: gateActive,
      appropriate_to_start_gap_roadmap: !gateActive,
      post_gate_objective: state.post_gate_objective,
      participants: Object.keys(state.participants ?? {}).length,
      active_families: Object.keys(state.families ?? {}).length,
      convergence: state.convergence,
      sync_records: Object.keys(state.sync_records ?? {}).length,
      family_sync_overview: familySyncOverview,
      families: Object.values(state.families ?? {}).map((family) => ({
        family: family.family,
        active_count: family.active_count,
        active_instances: family.active_instances,
      })),
      notes: Array.isArray(state.notes) ? state.notes.length : 0,
      sequencing_reminder: buildSequencingReminder(state),
      additionalContext:
        `ROADMAP MODE: ${state.collaboration_mode}. Gate ${state.current_gate.id} is ${state.current_gate.status}. ` +
        `Priority remains current backend/frontend completion before a new gap-closing SVI-maximization roadmap begins. ` +
        `Shared state is multi-terminal aware across ${Object.keys(state.families ?? {}).length} family/families and ${Object.keys(state.participants ?? {}).length} active participant instance(s). ` +
        `${buildSequencingReminder(state)}`,
    }),
  );
}

async function noteCommand(parsedArgs) {
  const state = await readState();
  const identity = inferIdentity(parsedArgs);
  const note =
    typeof parsedArgs.note === "string" && parsedArgs.note.trim()
      ? parsedArgs.note.trim()
      : parsedArgs._.slice(1).join(" ").trim();
  if (!note) {
    throw new Error("No note provided. Use --note or pass freeform text after the command.");
  }

  const nextState = upsertParticipant(state, identity, "note", note);
  nextState.notes = [
    ...(Array.isArray(state.notes) ? state.notes : []),
    {
      timestamp: new Date().toISOString(),
      agent: identity.family,
      agent_family: identity.family,
      agent_instance: identity.instance,
      machine: identity.machine,
      session_key: identity.sessionKey,
      note,
    },
  ].slice(-100);

  const written = await writeState(nextState);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      agent: identity.family,
      agent_instance: identity.instance,
      machine: identity.machine,
      session_key: identity.sessionKey,
      state_markdown: FILES.stateMarkdown,
      notes: written.notes.length,
      participants: Object.keys(written.participants ?? {}).length,
      latest_note: written.notes[written.notes.length - 1],
    }),
  );
}

async function setModeCommand(parsedArgs) {
  const state = await readState();
  const identity = inferIdentity(parsedArgs);
  const mode = typeof parsedArgs.mode === "string" ? parsedArgs.mode.trim() : "";
  if (!mode) {
    throw new Error("No mode provided. Use --mode.");
  }

  const nextState = upsertParticipant(state, identity, "set-mode");
  nextState.collaboration_mode = mode;
  nextState.current_gate = {
    ...state.current_gate,
    status:
      typeof parsedArgs.status === "string" && parsedArgs.status.trim()
        ? parsedArgs.status.trim()
        : state.current_gate.status,
    description:
      typeof parsedArgs.description === "string" && parsedArgs.description.trim()
        ? parsedArgs.description.trim()
        : state.current_gate.description,
  };
  nextState.last_mode_change = {
    timestamp: new Date().toISOString(),
    agent: identity.family,
    agent_family: identity.family,
    agent_instance: identity.instance,
    machine: identity.machine,
    session_key: identity.sessionKey,
    mode: nextState.collaboration_mode,
    gate_status: nextState.current_gate.status,
  };

  const note =
    typeof parsedArgs.note === "string" && parsedArgs.note.trim()
      ? parsedArgs.note.trim()
      : "";
  if (note) {
    nextState.notes = [
      ...(Array.isArray(state.notes) ? state.notes : []),
      {
        timestamp: new Date().toISOString(),
        agent: identity.family,
        agent_family: identity.family,
        agent_instance: identity.instance,
        machine: identity.machine,
        session_key: identity.sessionKey,
        note,
      },
    ].slice(-100);
    nextState.participants[identity.instance].last_note = note;
  }

  const written = await writeState(nextState);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      mode: written.collaboration_mode,
      gate: written.current_gate,
      agent: identity.family,
      agent_instance: identity.instance,
      participants: Object.keys(written.participants ?? {}).length,
      state_markdown: FILES.stateMarkdown,
    }),
  );
}

async function syncCommand(parsedArgs) {
  const state = await readState();
  const identity = inferIdentity(parsedArgs);

  const lane = typeof parsedArgs.lane === "string" && parsedArgs.lane.trim() ? parsedArgs.lane.trim() : "general";
  const status =
    typeof parsedArgs.status === "string" && parsedArgs.status.trim()
      ? parsedArgs.status.trim()
      : "active";
  const current =
    typeof parsedArgs.current === "string" && parsedArgs.current.trim()
      ? parsedArgs.current.trim()
      : "";
  const next =
    typeof parsedArgs.next === "string" && parsedArgs.next.trim()
      ? parsedArgs.next.trim()
      : "";
  const done =
    typeof parsedArgs.done === "string" && parsedArgs.done.trim()
      ? parsedArgs.done.trim()
      : "";
  const blockers = normalizeListLike(parsedArgs.blockers);
  const needsFromOtherAgent = normalizeListLike(parsedArgs.needs);
  const convergenceTarget =
    typeof parsedArgs["convergence-target"] === "string" &&
    parsedArgs["convergence-target"].trim()
      ? parsedArgs["convergence-target"].trim()
      : "";

  if (!current && !next && !done && blockers.length === 0 && needsFromOtherAgent.length === 0 && !convergenceTarget) {
    throw new Error(
      "No sync content provided. Use --current, --next, --done, --blockers, --needs, or --convergence-target.",
    );
  }

  let nextState = upsertParticipant(
    state,
    identity,
    "sync",
    current || next || done || blockers[0] || needsFromOtherAgent[0] || convergenceTarget || null,
  );
  nextState = upsertSyncRecord(nextState, identity, {
    lane,
    status,
    current,
    next,
    done,
    blockers,
    needs_from_other_agent: needsFromOtherAgent,
    convergence_target: convergenceTarget,
  });

  const note =
    typeof parsedArgs.note === "string" && parsedArgs.note.trim()
      ? parsedArgs.note.trim()
      : "";
  if (note) {
    nextState.notes = [
      ...(Array.isArray(state.notes) ? state.notes : []),
      {
        timestamp: new Date().toISOString(),
        agent: identity.family,
        agent_family: identity.family,
        agent_instance: identity.instance,
        machine: identity.machine,
        session_key: identity.sessionKey,
        note,
      },
    ].slice(-100);
  }

  const written = await writeState(nextState);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      agent: identity.family,
      agent_instance: identity.instance,
      lane,
      status,
      sync_record: written.sync_records?.[identity.instance] ?? null,
      state_markdown: FILES.stateMarkdown,
      sequencing_reminder: buildSequencingReminder(written),
    }),
  );
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const command = parsedArgs._[0] ?? "status";

  if (command === "init") {
    await initCommand();
    return;
  }
  if (command === "status") {
    await statusCommand();
    return;
  }
  if (command === "note") {
    await noteCommand(parsedArgs);
    return;
  }
  if (command === "set-mode") {
    await setModeCommand(parsedArgs);
    return;
  }
  if (command === "sync") {
    await syncCommand(parsedArgs);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
