import { promises as fs } from "node:fs";
import path from "node:path";
import { inferAgentIdentity } from "./agent-identity.mjs";

const FILES = {
  jsonl: "H:\\prism\\state\\shared\\SUBAGENT_ACTIVITY.jsonl",
  markdown: "H:\\prism\\state\\shared\\SUBAGENT_ACTIVITY.md",
};

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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

function renderMarkdown(entries) {
  const lines = [];
  lines.push("# Subagent Activity");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Recent Results");
  lines.push("");
  if (entries.length === 0) {
    lines.push("- none yet");
  } else {
    for (const entry of entries.slice(-25).reverse()) {
      lines.push(
        `- ${entry.timestamp} — ${entry.parent_family} [instance=${entry.parent_instance}] spawned ${entry.subagent_type} -> success=${entry.success}`,
      );
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const identity = inferAgentIdentity();
  const subagentType = process.env.TOOL_INPUT_subagent_type?.trim() || "unknown";
  const success = String(process.env.TOOL_SUCCESS ?? "unknown").trim();

  const entry = {
    timestamp: new Date().toISOString(),
    parent_family: identity.family,
    parent_instance: identity.instance,
    machine: identity.machine,
    session_key: identity.sessionKey,
    subagent_type: subagentType,
    success,
  };

  const entries = await readJsonl(FILES.jsonl);
  entries.push(entry);

  await Promise.all([ensureParent(FILES.jsonl), ensureParent(FILES.markdown)]);
  await Promise.all([
    fs.writeFile(
      FILES.jsonl,
      `${entries.map((item) => JSON.stringify(item)).join("\n")}\n`,
      "utf8",
    ),
    fs.writeFile(FILES.markdown, renderMarkdown(entries), "utf8"),
  ]);

  const recentEntries = entries.slice(-200);
  const successCount = recentEntries.filter((item) => item.success === "true").length;
  const rate = recentEntries.length > 0 ? Math.round((successCount / recentEntries.length) * 100) : 0;

  process.stdout.write(
    JSON.stringify({
      additionalContext: `Spawned agent '${subagentType}' completed (${success}). Shared subagent activity is logged at ${FILES.markdown}. Recent total=${recentEntries.length}, success rate=${rate}%.`,
    }),
  );
}

main().catch(() => {
  process.stdout.write(
    JSON.stringify({
      additionalContext: "Spawned agent completed. Shared subagent activity logging was unavailable.",
    }),
  );
});
