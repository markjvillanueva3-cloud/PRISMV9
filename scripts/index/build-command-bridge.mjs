import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "..");
const USER_HOME = os.homedir();

const SOURCE_ROOTS = {
  globalCommands: path.join(USER_HOME, ".claude", "commands"),
  projectCommands: path.join(REPO_ROOT, ".claude", "commands"),
  projectSettings: path.join(REPO_ROOT, ".claude", "settings.json"),
  projectHelpers: path.join(REPO_ROOT, ".claude", "helpers"),
};

const OUTPUTS = {
  registry: path.join(
    REPO_ROOT,
    "state",
    "shared",
    "claude-codex-command-registry.json",
  ),
  bridgeDoc: path.join(
    REPO_ROOT,
    "state",
    "shared",
    "CLAUDE-CODEX-COMMAND-BRIDGE.md",
  ),
};

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdownFiles(rootPath) {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const discovered = [];

  async function visit(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const sortedEntries = entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    for (const entry of sortedEntries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        discovered.push(entryPath);
      }
    }
  }

  await visit(rootPath);
  return discovered;
}

function parseFrontmatter(content) {
  if (!content.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const endMarker = content.indexOf("\n---", 3);
  if (endMarker === -1) {
    return { frontmatter: {}, body: content };
  }

  const rawFrontmatter = content.slice(3, endMarker).trim();
  const body = content.slice(endMarker + 4).replace(/^\r?\n/, "");
  const frontmatter = {};

  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

function summarizeMarkdown(body) {
  const lines = body.split(/\r?\n/);
  let title = null;
  let summary = null;
  let paragraph = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!title && line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    if (!line) {
      if (paragraph.length > 0 && !summary) {
        summary = paragraph.join(" ").replace(/\s+/g, " ").trim();
        break;
      }
      continue;
    }
    if (line.startsWith("## ")) {
      if (paragraph.length > 0 && !summary) {
        summary = paragraph.join(" ").replace(/\s+/g, " ").trim();
      }
      break;
    }
    if (!line.startsWith("#")) {
      paragraph.push(line);
    }
  }

  if (!summary && paragraph.length > 0) {
    summary = paragraph.join(" ").replace(/\s+/g, " ").trim();
  }

  return {
    title,
    summary,
  };
}

function normalizeRelative(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function stripMarkdownExtension(relativePath) {
  return relativePath.replace(/\.md$/i, "");
}

function bashStyleToWindowsPath(candidate) {
  if (candidate.startsWith("/c/")) {
    return `C:\\${candidate.slice(3).replaceAll("/", "\\")}`;
  }
  if (candidate.startsWith("C:/")) {
    return candidate.replaceAll("/", "\\");
  }
  return candidate;
}

function extractPrismPaths(commandText) {
  const collected = new Set();
  const bashMatches = commandText.match(/\/c\/PRISM\/[^\s"'|;&)]+/g) ?? [];
  const windowsMatches = commandText.match(/C:\\PRISM\\[^\s"'|;&)]+/g) ?? [];
  const slashMatches = commandText.match(/C:\/PRISM\/[^\s"'|;&)]+/g) ?? [];

  for (const match of [...bashMatches, ...windowsMatches, ...slashMatches]) {
    collected.add(bashStyleToWindowsPath(match));
  }

  return [...collected].sort((left, right) => left.localeCompare(right));
}

function inferHelperRefs(commandText) {
  return extractPrismPaths(commandText).filter((item) =>
    item.includes("\\.claude\\helpers\\"),
  );
}

function getInvocationKind(relativePath) {
  return relativePath.includes("/") ? "pack_member" : "slash_command";
}

function getSlashCommand(relativePath) {
  if (relativePath.includes("/")) {
    return null;
  }
  return `/${path.basename(relativePath, ".md")}`;
}

async function buildMarkdownCommandEntries(rootPath, sourceScope) {
  const markdownFiles = await walkMarkdownFiles(rootPath);
  const commands = [];

  for (const absolutePath of markdownFiles) {
    const relativePath = normalizeRelative(path.relative(rootPath, absolutePath));
    const content = await fs.readFile(absolutePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    const { title, summary } = summarizeMarkdown(body);
    const commandKey = stripMarkdownExtension(relativePath);
    const invocationKind = getInvocationKind(relativePath);
    const slashCommand = getSlashCommand(relativePath);

    commands.push({
      id: `${sourceScope}:${commandKey}`,
      source_scope: sourceScope,
      execution_kind: "markdown_macro",
      command_key: commandKey,
      slash_command: slashCommand,
      slash_command_guess: slashCommand ?? `/${path.basename(relativePath, ".md")}`,
      invocation_kind: invocationKind,
      mirror_strategy: "read_markdown_spec",
      supports_codex_mirroring: true,
      path: absolutePath,
      relative_path: relativePath,
      categories: commandKey.includes("/") ? commandKey.split("/").slice(0, -1) : [],
      title: title ?? path.basename(relativePath, ".md"),
      summary:
        summary ??
        "No summary extracted. Read the command file directly before mirroring it.",
      frontmatter,
      notes:
        invocationKind === "pack_member"
          ? [
              "This file lives inside a repo command pack. The exact Claude slash alias may depend on pack routing, so use the relative path and file contents as the canonical spec.",
            ]
          : [],
    });
  }

  return commands.sort((left, right) =>
    left.command_key.localeCompare(right.command_key),
  );
}

function flattenHookEntries(settings) {
  const hooksConfig = settings?.hooks ?? {};
  const hookEntries = [];

  for (const [eventName, groups] of Object.entries(hooksConfig)) {
    const normalizedGroups = Array.isArray(groups) ? groups : [];
    normalizedGroups.forEach((group, groupIndex) => {
      const hooks = Array.isArray(group.hooks) ? group.hooks : [];
      hooks.forEach((hook, hookIndex) => {
        const commandText = typeof hook.command === "string" ? hook.command : null;
        if (!commandText) {
          return;
        }

        hookEntries.push({
          id: `${eventName}:${groupIndex}:${hookIndex}`,
          event: eventName,
          matcher: group.matcher ?? null,
          type: hook.type ?? "command",
          command: commandText,
          timeout_ms: hook.timeout ?? null,
          async: hook.async ?? false,
          continue_on_error: hook.continueOnError ?? false,
          prism_paths: extractPrismPaths(commandText),
          helper_refs: inferHelperRefs(commandText),
        });
      });
    });
  }

  return hookEntries;
}

function buildVirtualCommands(hookEntries) {
  const virtualCommands = [];
  const compactStages = hookEntries.filter(
    (entry) =>
      entry.matcher === "compact" ||
      entry.command.includes("pre-compact.mjs") ||
      entry.command.includes("pre-compact.sh") ||
      entry.command.includes("compaction-survival.mjs") ||
      entry.command.includes("compaction-survival.sh") ||
      entry.command.includes(".compaction-survival.md"),
  );

  if (compactStages.length > 0) {
    const helperRefs = new Set();
    const artifactRefs = new Set();
    for (const stage of compactStages) {
      for (const helperRef of stage.helper_refs) {
        helperRefs.add(helperRef);
      }
      for (const prismPath of stage.prism_paths) {
        artifactRefs.add(prismPath);
      }
    }

    virtualCommands.push({
      id: "virtual:compact",
      slash_command: "/compact",
      source_scope: "project_hooks",
      execution_kind: "hook_pipeline",
      mirror_strategy: "follow_hook_pipeline",
      supports_codex_mirroring: true,
      summary:
        "Hook-backed compaction pipeline that snapshots critical state before compaction and restores recovery context on the next compact-aware session start.",
      stages: compactStages.map((stage) => ({
        event: stage.event,
        matcher: stage.matcher,
        command: stage.command,
        timeout_ms: stage.timeout_ms,
        async: stage.async,
        continue_on_error: stage.continue_on_error,
      })),
      helper_refs: [...helperRefs].sort((left, right) => left.localeCompare(right)),
      artifact_refs: [...artifactRefs].sort((left, right) => left.localeCompare(right)),
      notes: [
        "Codex can mirror the behavior by consulting the helper scripts and survival artifact, but cannot invoke Claude's slash-command runtime directly.",
      ],
    });
  }

  return virtualCommands;
}

async function buildHelperIndex(rootPath) {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const helperFiles = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile()) {
      continue;
    }

    const absolutePath = path.join(rootPath, entry.name);
    let purpose = null;
    if (/\.(md|sh|js|mjs|cjs)$/i.test(entry.name)) {
      const content = await fs.readFile(absolutePath, "utf8");
      purpose = inferHelperPurpose(content, entry.name);
    }

    helperFiles.push({
      name: entry.name,
      path: absolutePath,
      purpose:
        purpose ??
        `Helper artifact indexed from ${SOURCE_ROOTS.projectHelpers}. Read the file directly for details.`,
    });
  }

  return helperFiles;
}

function inferHelperPurpose(content, filename) {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const nonEmptyLines = lines.filter(Boolean);

  for (const line of nonEmptyLines) {
    if (line.startsWith("#!")) {
      continue;
    }
    if (line.startsWith("#")) {
      return line.replace(/^#+\s*/, "").trim();
    }
    if (line.startsWith("//")) {
      return line.replace(/^\/\/\s*/, "").trim();
    }
    if (line.startsWith("/*")) {
      return line.replace(/^\/\*\s*/, "").replace(/\*\/$/, "").trim();
    }
    if (!line.startsWith("set -") && !line.startsWith("{")) {
      return `${filename}: ${line}`.trim();
    }
  }

  return null;
}

function renderBridgeMarkdown(registry) {
  const lines = [];
  const counts = registry.overview;
  const compactVirtual = registry.virtual_commands.find(
    (entry) => entry.slash_command === "/compact",
  );
  const startupCommand = registry.commands.find(
    (entry) => entry.slash_command === "/startup" && entry.source_scope === "global",
  );
  const chatCommand =
    registry.commands.find(
      (entry) => entry.slash_command === "/chat" && entry.source_scope === "project",
    ) ??
    registry.commands.find(
      (entry) => entry.slash_command === "/chat" && entry.source_scope === "global",
    );
  const rgsSyncCommand =
    registry.commands.find(
      (entry) => entry.slash_command === "/rgs-sync" && entry.source_scope === "project",
    ) ??
    registry.commands.find(
      (entry) => entry.slash_command === "/rgs-sync" && entry.source_scope === "global",
    );

  lines.push("# Claude/Codex Command Bridge");
  lines.push("");
  lines.push(`Generated: ${registry.generated_at}`);
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "This is the canonical shared bridge for Claude and Codex command behavior inside PRISM.",
  );
  lines.push(
    "It indexes file-backed slash-command specs plus hook-backed command pipelines so both agents can reference the same durable sources instead of relying on one-off prompts or memory.",
  );
  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push(`- Global markdown command specs: ${counts.global_markdown_commands}`);
  lines.push(`- Project markdown command specs: ${counts.project_markdown_commands}`);
  lines.push(`- Hook pipeline entries indexed: ${counts.hook_entries}`);
  lines.push(`- Helper artifacts indexed: ${counts.helper_files}`);
  lines.push(`- Virtual command pipelines: ${counts.virtual_commands}`);
  lines.push("");
  lines.push("## Canonical Sources");
  lines.push("");
  lines.push(`- Global commands: \`${registry.sources.global_commands}\``);
  lines.push(`- Project commands: \`${registry.sources.project_commands}\``);
  lines.push(`- Hook config: \`${registry.sources.project_settings}\``);
  lines.push(`- Helper scripts: \`${registry.sources.project_helpers}\``);
  lines.push(`- Registry JSON: \`${registry.outputs.registry}\``);
  lines.push("");
  lines.push("## Mirroring Rules");
  lines.push("");
  lines.push(
    "- Codex can mirror any command indexed as `execution_kind: markdown_macro` by reading the command spec file and following it as instructions.",
  );
  lines.push(
    "- Codex can mirror any command indexed as `execution_kind: hook_pipeline` by following the underlying settings and helper scripts.",
  );
  lines.push(
    "- Hidden Claude built-ins that are not exposed through command files, settings, or helpers are out of scope until they are surfaced in files.",
  );
  lines.push("");
  lines.push("## Key Shared Commands");
  lines.push("");
  if (startupCommand) {
    lines.push(`- \`/startup\` → \`${startupCommand.path}\``);
    lines.push(`  ${startupCommand.summary}`);
  }
  if (chatCommand) {
    lines.push(`- \`/chat\` → \`${chatCommand.path}\``);
    lines.push(`  ${chatCommand.summary}`);
  }
  if (rgsSyncCommand) {
    lines.push(`- \`/rgs-sync\` → \`${rgsSyncCommand.path}\``);
    lines.push(`  ${rgsSyncCommand.summary}`);
  }
  if (compactVirtual) {
    lines.push(`- \`/compact\` → hook pipeline from \`${registry.sources.project_settings}\``);
    lines.push(`  ${compactVirtual.summary}`);
  }
  lines.push("- Use the registry JSON for the full command inventory, including repo command packs.");
  lines.push("");
  if (compactVirtual) {
    lines.push("## `/compact` Pipeline");
    lines.push("");
    for (const stage of compactVirtual.stages) {
      const matcherText = stage.matcher ? ` | matcher: \`${stage.matcher}\`` : "";
      lines.push(`- ${stage.event}${matcherText} → \`${stage.command}\``);
    }
    lines.push("");
    lines.push("Supporting artifacts:");
    for (const artifact of compactVirtual.artifact_refs) {
      lines.push(`- \`${artifact}\``);
    }
    lines.push("");
  }
  lines.push("## Reconnect Protocol");
  lines.push("");
  lines.push("1. Read this bridge file.");
  lines.push(`2. Read \`${registry.outputs.registry}\` for the full inventory.`);
  lines.push("3. For markdown commands, open the indexed command spec and mirror it directly.");
  lines.push("4. For hook pipelines, follow the indexed settings hooks and helper scripts.");
  lines.push("5. If a command is missing from the registry, treat it as a potential built-in and verify before mirroring it.");
  lines.push("");
  lines.push("## Refresh Procedure");
  lines.push("");
  lines.push("Run:");
  lines.push("");
  lines.push("```powershell");
  lines.push(`node "${registry.generator}"`);
  lines.push("```");
  lines.push("");
  lines.push("Re-read both outputs after any command, settings, or helper change.");
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  for (const limitation of registry.limitations) {
    lines.push(`- ${limitation}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function ensureParentDir(targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
}

async function main() {
  const [globalCommands, projectCommands, settingsRaw, helperIndex] = await Promise.all([
    buildMarkdownCommandEntries(SOURCE_ROOTS.globalCommands, "global"),
    buildMarkdownCommandEntries(SOURCE_ROOTS.projectCommands, "project"),
    fs.readFile(SOURCE_ROOTS.projectSettings, "utf8"),
    buildHelperIndex(SOURCE_ROOTS.projectHelpers),
  ]);

  const settings = JSON.parse(settingsRaw);
  const hookEntries = flattenHookEntries(settings);
  const virtualCommands = buildVirtualCommands(hookEntries);
  const registry = {
    generated_at: new Date().toISOString(),
    generator: SCRIPT_PATH,
    sources: {
      global_commands: SOURCE_ROOTS.globalCommands,
      project_commands: SOURCE_ROOTS.projectCommands,
      project_settings: SOURCE_ROOTS.projectSettings,
      project_helpers: SOURCE_ROOTS.projectHelpers,
    },
    outputs: {
      registry: OUTPUTS.registry,
      bridge_doc: OUTPUTS.bridgeDoc,
    },
    overview: {
      global_markdown_commands: globalCommands.length,
      project_markdown_commands: projectCommands.length,
      hook_entries: hookEntries.length,
      helper_files: helperIndex.length,
      virtual_commands: virtualCommands.length,
      total_file_backed_commands: globalCommands.length + projectCommands.length,
    },
    commands: [...globalCommands, ...projectCommands],
    virtual_commands: virtualCommands,
    hook_entries: hookEntries,
    helper_files: helperIndex,
    limitations: [
      "The registry covers only command behavior exposed through markdown files, project settings, or helper scripts.",
      "Codex can mirror behavior from these sources, but cannot invoke Claude's private slash-command runtime directly.",
      "Repo command-pack members may not have a guaranteed one-to-one slash alias; use their relative command key and file path as the canonical reference.",
      "Refresh this registry after any command, settings, or helper change.",
    ],
  };

  await Promise.all([
    ensureParentDir(OUTPUTS.registry),
    ensureParentDir(OUTPUTS.bridgeDoc),
  ]);

  await fs.writeFile(OUTPUTS.registry, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  await fs.writeFile(OUTPUTS.bridgeDoc, renderBridgeMarkdown(registry), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        registry: OUTPUTS.registry,
        bridge_doc: OUTPUTS.bridgeDoc,
        overview: registry.overview,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
