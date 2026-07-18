import { promises as fs } from "node:fs";
import path from "node:path";

const ROOTS = {
  settings: "C:\\PRISM\\.claude\\settings.json",
  autoRoute: "C:\\PRISM\\.claude\\helpers\\auto-route.sh",
  agentSkills: "C:\\Users\\Admin.DIGITALSTORM-PC\\.agents\\skills",
  codexSkills: "C:\\Users\\Admin.DIGITALSTORM-PC\\.codex\\skills",
};

const OUTPUTS = {
  markdown: "C:\\PRISM\\state\\shared\\HOOK_SKILL_CONTEXT_AUDIT.md",
  json: "C:\\PRISM\\state\\shared\\HOOK_SKILL_CONTEXT_AUDIT.json",
};

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readSkillSummary(skillDir) {
  const skillPath = path.join(skillDir, "SKILL.md");
  try {
    const raw = await fs.readFile(skillPath, "utf8");
    const lines = raw.split(/\r?\n/);
    const descriptionLine = lines.find((line) => line.trim().startsWith("description:"));
    return descriptionLine
      ? descriptionLine.replace(/^description:\s*/, "").trim()
      : "No description found.";
  } catch {
    return null;
  }
}

async function collectSkills(rootDir, scope) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(rootDir, entry.name);
    const description = await readSkillSummary(fullPath);
    if (!description) {
      continue;
    }

    skills.push({
      name: entry.name,
      scope,
      path: fullPath,
      description,
    });
  }

  return skills;
}

function extractHookInventory(settings) {
  const inventory = [];
  for (const [eventName, groups] of Object.entries(settings.hooks ?? {})) {
    for (const group of Array.isArray(groups) ? groups : []) {
      for (const hook of Array.isArray(group.hooks) ? group.hooks : []) {
        if (typeof hook.command !== "string") {
          continue;
        }
        inventory.push({
          event: eventName,
          matcher: group.matcher ?? null,
          command: hook.command,
        });
      }
    }
  }
  return inventory;
}

function buildRecommendations(hookInventory, skills) {
  const helperCommands = hookInventory.map((entry) => entry.command).join("\n");
  const hasSessionCompact = helperCommands.includes("session-start-compact.mjs");
  const hasPostToolCompressor = helperCommands.includes("posttooluse-compressor.mjs");
  const hasCoordinationPoll = helperCommands.includes("agent-coordination.mjs poll");
  const hasCoordinationDaemon = helperCommands.includes("agent-coordination-daemon.mjs start");
  const candidateSkillNames = new Set([
    "activate-features",
    "checkpoint",
    "codebase-memory-exploring",
    "codebase-memory-quality",
    "codebase-memory-reference",
    "codebase-memory-tracing",
    "context-budget",
    "dispatch-format",
    "feature-matrix",
    "memory-prune",
    "model-router",
    "prism-review",
  ]);
  const candidateSkills = skills.filter((skill) => candidateSkillNames.has(skill.name));

  return {
    coverage: {
      hasSessionCompact,
      hasPostToolCompressor,
      hasCoordinationPoll,
      hasCoordinationDaemon,
      autoRoute: {
        contextBudget: false,
        memoryPrune: false,
        checkpoint: false,
        featureMatrix: false,
      },
      candidateSkills: candidateSkills.map((skill) => ({
        name: skill.name,
        scope: skill.scope,
        path: skill.path,
        description: skill.description,
      })),
    },
    gaps: [
      !hasSessionCompact
        ? "SessionStart lacked a dedicated compact context pulse."
        : null,
      !hasPostToolCompressor ? "PostToolUse lacked a large-output compression reminder." : null,
      !hasCoordinationPoll ? "UserPromptSubmit lacks shared agent coordination polling." : null,
      !hasCoordinationDaemon ? "SessionStart lacks a shared coordination watcher bootstrap." : null,
      "hook coverage should stay focused on recovery, compression, and routing; avoid noisy always-on prompts.",
    ].filter(Boolean),
    recommendations: [
      {
        target: "SessionStart",
        purpose: "Inject compact context recovery, memory pressure, SVI watch health, and bridge coverage.",
      },
      {
        target: "PostToolUse(Bash|Read)",
        purpose: "Warn when output volume or file size suggests summarization is better than raw echo.",
      },
      {
        target: "UserPromptSubmit",
        purpose: "Route hook/context/token prompts toward context-budget, memory-prune, checkpoint, and feature-matrix guidance.",
      },
      {
        target: "PreCompact/Stop",
        purpose: "Keep shared directive paths present in survival artifacts so compaction recovery remains durable.",
      },
      {
        target: "SessionStart + UserPromptSubmit",
        purpose: "Keep shared Claude/Codex coordination status warm and inject unseen agent updates before replanning.",
      },
    ],
  };
}

function applyAutoRouteCoverage(report, autoRouteText) {
  const coverage = report.coverage.autoRoute;
  coverage.contextBudget = autoRouteText.includes('skills+=("context-budget")');
  coverage.memoryPrune = autoRouteText.includes('skills+=("memory-prune")');
  coverage.checkpoint = autoRouteText.includes('skills+=("checkpoint")');
  coverage.featureMatrix = autoRouteText.includes('skills+=("feature-matrix")');

  const missingRoutes = Object.entries(coverage)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  if (missingRoutes.length > 0) {
    report.gaps.unshift(
      `auto-route is missing targeted context/token routing for: ${missingRoutes.join(", ")}`,
    );
  }
}

function renderMarkdown(report, hookCount, skillCount) {
  const lines = [];
  lines.push("# Hook + Skill Context Audit");
  lines.push("");
  lines.push(`Generated: ${report.generated_at}`);
  lines.push("");
  lines.push("## Current Surface");
  lines.push("");
  lines.push(`- Hook entries indexed: ${hookCount}`);
  lines.push(`- Skills indexed: ${skillCount}`);
  lines.push(
    `- Session-start compact pulse installed: ${report.coverage.hasSessionCompact ? "yes" : "no"}`,
  );
  lines.push(
    `- Post-tool compressor installed: ${report.coverage.hasPostToolCompressor ? "yes" : "no"}`,
  );
  lines.push(
    `- Coordination poll installed: ${report.coverage.hasCoordinationPoll ? "yes" : "no"}`,
  );
  lines.push(
    `- Coordination daemon bootstrap installed: ${report.coverage.hasCoordinationDaemon ? "yes" : "no"}`,
  );
  lines.push(
    `- Auto-route context coverage: context-budget=${report.coverage.autoRoute.contextBudget ? "yes" : "no"}, memory-prune=${report.coverage.autoRoute.memoryPrune ? "yes" : "no"}, checkpoint=${report.coverage.autoRoute.checkpoint ? "yes" : "no"}, feature-matrix=${report.coverage.autoRoute.featureMatrix ? "yes" : "no"}`,
  );
  lines.push("");
  lines.push("## High-Value Skill Candidates");
  lines.push("");
  for (const skill of report.coverage.candidateSkills) {
    lines.push(`- \`${skill.name}\` (${skill.scope}) — ${skill.description}`);
  }
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  for (const gap of report.gaps) {
    lines.push(`- ${gap}`);
  }
  lines.push("");
  lines.push("## Recommendations");
  lines.push("");
  for (const recommendation of report.recommendations) {
    lines.push(`- ${recommendation.target} — ${recommendation.purpose}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const [settings, autoRouteText, agentSkills, codexSkills] = await Promise.all([
    readJson(ROOTS.settings),
    fs.readFile(ROOTS.autoRoute, "utf8"),
    collectSkills(ROOTS.agentSkills, "agent"),
    collectSkills(ROOTS.codexSkills, "codex"),
  ]);

  const hookInventory = extractHookInventory(settings);
  const allSkills = [...agentSkills, ...codexSkills];
  const report = buildRecommendations(hookInventory, allSkills);
  applyAutoRouteCoverage(report, autoRouteText);
  const payload = {
    generated_at: new Date().toISOString(),
    ...report,
  };

  await fs.writeFile(OUTPUTS.json, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.writeFile(
    OUTPUTS.markdown,
    renderMarkdown(payload, hookInventory.length, allSkills.length),
    "utf8",
  );

  process.stdout.write(
    JSON.stringify({
      ok: true,
      markdown: OUTPUTS.markdown,
      json: OUTPUTS.json,
      hooks: hookInventory.length,
      skills: allSkills.length,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
