import os from "node:os";
import process from "node:process";

function sanitizeSegment(value, fallback) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function looksLikeInstance(value) {
  return /[@/#]/.test(value ?? "");
}

function normalizeExplicitInstance(value, fallback) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return fallback;
  }

  const canonicalMatch = raw.match(/^([^@/]+)@([^/]+)\/(.+)$/);
  if (canonicalMatch) {
    return `${sanitizeSegment(canonicalMatch[1], "agent")}@${sanitizeSegment(canonicalMatch[2], "machine")}/${sanitizeSegment(canonicalMatch[3], "session")}`;
  }

  if (looksLikeInstance(raw)) {
    return raw.replace(/\s+/g, "-");
  }

  return sanitizeSegment(raw, fallback);
}

function detectFamilyFromValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("claude")) {
    return "Claude";
  }
  if (normalized.includes("codex")) {
    return "Codex";
  }
  return sanitizeSegment(value, "Agent");
}

function inferFamily(explicitFamily, explicitAgent) {
  if (explicitFamily && String(explicitFamily).trim()) {
    return sanitizeSegment(explicitFamily, "Agent");
  }
  if (explicitAgent && !looksLikeInstance(explicitAgent)) {
    return detectFamilyFromValue(explicitAgent);
  }

  const codexMarkers = [
    process.env.CODEX_THREAD_ID,
    process.env.CODEX_SESSION_ID,
    process.env.CODEX_AGENT_INSTANCE,
    process.env.CODEX_AGENT_NAME,
  ];
  if (codexMarkers.some((marker) => marker && String(marker).trim())) {
    return "Codex";
  }

  const claudeMarkers = [
    process.env.CLAUDE_AGENT_INSTANCE,
    process.env.CLAUDE_AGENT_NAME,
    process.env.CLAUDE_SESSION_ID,
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS,
    process.env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS,
  ];
  if (claudeMarkers.some((marker) => marker && String(marker).trim())) {
    return "Claude";
  }

  const envCandidates = [
    process.env.PRISM_AGENT_FAMILY,
    process.env.AGENT_FAMILY,
    process.env.CLAUDE_AGENT_NAME,
    process.env.CODEX_AGENT_NAME,
    process.env.AGENT_NAME,
    process.env.PRISM_AGENT,
    process.env.TERMINAL_AGENT_FAMILY,
    process.env.TERMINAL_AGENT_NAME,
  ];

  for (const candidate of envCandidates) {
    const family = detectFamilyFromValue(candidate);
    if (family) {
      return family;
    }
  }

  return "Agent";
}

function inferSessionKey() {
  const envCandidates = [
    process.env.PRISM_AGENT_INSTANCE,
    process.env.AGENT_INSTANCE,
    process.env.CLAUDE_AGENT_INSTANCE,
    process.env.CODEX_AGENT_INSTANCE,
    process.env.CLAUDE_SESSION_ID,
    process.env.CODEX_SESSION_ID,
    process.env.CODEX_THREAD_ID,
    process.env.SESSION_ID,
    process.env.WT_SESSION,
    process.env.TERM_SESSION_ID,
    process.env.TERMINAL_SESSION_ID,
    process.env.CONEMU_SESSION_ID,
    process.env.CONEMU_PID,
    process.env.PPID,
  ];

  for (const candidate of envCandidates) {
    if (candidate && String(candidate).trim()) {
      return sanitizeSegment(candidate, "session");
    }
  }

  return `pid-${process.pid}`;
}

export function sanitizeIdentityKey(value, fallback = "agent") {
  return sanitizeSegment(value, fallback);
}

export function inferAgentIdentity(options = {}) {
  const explicitAgent = options.agent ?? "";
  const explicitFamily = options.family ?? "";
  const explicitInstance = options.instance ?? "";

  const family = inferFamily(explicitFamily, explicitAgent);
  const machine = sanitizeSegment(
    process.env.PRISM_MACHINE_NAME || process.env.COMPUTERNAME || os.hostname(),
    "machine",
  );
  const sessionKey = sanitizeSegment(inferSessionKey(), "session");

  let instance = "";
  if (explicitInstance && String(explicitInstance).trim()) {
    instance = normalizeExplicitInstance(explicitInstance, `${family}-${sessionKey}`);
  } else if (explicitAgent && looksLikeInstance(explicitAgent)) {
    instance = normalizeExplicitInstance(explicitAgent, `${family}-${sessionKey}`);
  } else {
    instance = `${family}@${machine}/${sessionKey}`;
  }

  return {
    family,
    machine,
    sessionKey,
    instance,
  };
}
