import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "..");
const USER_HOME = os.homedir();

const FILES = {
  repoStartup: path.join(REPO_ROOT, ".claude", "commands", "startup.md"),
  repoForgeTriple: path.join(REPO_ROOT, ".claude", "commands", "forge-triple.md"),
  repoCodexAgents: path.join(REPO_ROOT, ".codex", "AGENTS.md"),
  startup: path.join(USER_HOME, ".claude", "commands", "startup.md"),
  forgeTriple: path.join(USER_HOME, ".claude", "commands", "forge-triple.md"),
  codexAgents: path.join(USER_HOME, ".codex", "AGENTS.md"),
  codexConfig: path.join(USER_HOME, ".codex", "config.toml"),
  pluginStartup: path.join(
    USER_HOME,
    "plugins",
    "prism-ops",
    "commands",
    "startup.md",
  ),
  pluginMcpUtil: path.join(
    USER_HOME,
    "plugins",
    "prism-ops",
    "commands",
    "mcp-full-utilization.md",
  ),
  pluginCompact: path.join(
    USER_HOME,
    "plugins",
    "prism-ops",
    "commands",
    "compact.md",
  ),
  generator: path.join(REPO_ROOT, "scripts", "index", "build-command-bridge.mjs"),
  workspaceMcp: path.join(REPO_ROOT, ".mcp.json"),
  serverMcp: path.join(REPO_ROOT, "mcp-server", ".mcp.json"),
  claudeSettings: path.join(REPO_ROOT, ".claude", "settings.json"),
  bridgeDoc: path.join(REPO_ROOT, "state", "shared", "CLAUDE-CODEX-COMMAND-BRIDGE.md"),
  registry: path.join(
    REPO_ROOT,
    "state",
    "shared",
    "claude-codex-command-registry.json",
  ),
};

const UNIFIED_DIRECTIVE = "CLAUDE-CODEX-MCP-DIRECTIVE.md";
const RETIRED_DIRECTIVES = [
  "CLAUDE-CODEX-MCP-DEVELOPMENT-DIRECTIVE.md",
  "CLAUDE-CODEX-MCP-FULL-UTILIZATION-DIRECTIVE.md",
  "CLAUDE-CODEX-MCP-FULL-POWER-PLAYBOOK.md",
];
const STALE_MACHINE_MARKERS = ["Admin.DIGITALSTORM-PC"];

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readJson(filePath) {
  const text = await readText(filePath);
  if (text == null) {
    return null;
  }
  return JSON.parse(text);
}

function pass(name, filePath, details) {
  return { name, ok: true, file: filePath, details };
}

function fail(name, filePath, details) {
  return { name, ok: false, file: filePath, details };
}

async function checkUnifiedDirective(name, filePath) {
  const text = await readText(filePath);
  if (text == null) {
    return fail(name, filePath, "Missing file.");
  }
  if (!text.includes(UNIFIED_DIRECTIVE)) {
    return fail(name, filePath, `Missing ${UNIFIED_DIRECTIVE}.`);
  }

  const retiredHits = RETIRED_DIRECTIVES.filter((token) => text.includes(token));
  if (retiredHits.length > 0) {
    return fail(
      name,
      filePath,
      `Still references retired directives: ${retiredHits.join(", ")}.`,
    );
  }

  return pass(name, filePath, `Uses ${UNIFIED_DIRECTIVE} without retired MCP docs.`);
}

async function checkRepoCanonical(name, filePath, requiredTokens, forbiddenTokens = []) {
  const text = await readText(filePath);
  if (text == null) {
    return fail(name, filePath, "Missing file.");
  }

  const missing = requiredTokens.filter((token) => !text.includes(token));
  const forbidden = forbiddenTokens.filter((token) => text.includes(token));

  if (missing.length > 0 || forbidden.length > 0) {
    return fail(
      name,
      filePath,
      `Missing tokens: ${missing.join(", ") || "none"}; forbidden tokens: ${
        forbidden.join(", ") || "none"
      }.`,
    );
  }

  return pass(name, filePath, "Repo canonical file is present and H-drive rooted.");
}

async function checkProfileLauncher(name, filePath, targetPath) {
  const text = await readText(filePath);
  if (text == null) {
    return fail(name, filePath, "Missing file.");
  }

  if (!text.includes(targetPath)) {
    return fail(name, filePath, `Launcher is not pointing at ${targetPath}.`);
  }

  if (text.includes("C:/PRISM") || text.includes("H:/PRISM/.claude/helpers/")) {
    return fail(
      name,
      filePath,
      "Launcher should stay thin and point at the repo command instead of embedding the protocol.",
    );
  }

  return pass(name, filePath, `Thin launcher points at ${targetPath}.`);
}

async function checkGeneratorSource() {
  const text = await readText(FILES.generator);
  if (text == null) {
    return fail("bridge_generator_present", FILES.generator, "Missing file.");
  }

  const missing = [];
  if (!text.includes('os.homedir()')) {
    missing.push("os.homedir()");
  }
  if (!text.includes("fileURLToPath(import.meta.url)")) {
    missing.push("fileURLToPath(import.meta.url)");
  }

  const staleHits = [
    ...RETIRED_DIRECTIVES.filter((token) => text.includes(token)),
    ...STALE_MACHINE_MARKERS.filter((token) => text.includes(token)),
    "C:\\PRISM\\.claude\\commands",
  ].filter((token) => text.includes(token));

  if (missing.length > 0 || staleHits.length > 0) {
    return fail(
      "bridge_generator_dynamic_paths",
      FILES.generator,
      `Missing dynamic markers: ${missing.join(", ") || "none"}; stale markers: ${
        staleHits.join(", ") || "none"
      }.`,
    );
  }

  return pass(
    "bridge_generator_dynamic_paths",
    FILES.generator,
    "Generator derives the current user home and repo root instead of hard-coded machine paths.",
  );
}

async function checkConfigToml() {
  const text = await readText(FILES.codexConfig);
  if (text == null) {
    return fail("codex_config_prism_servers", FILES.codexConfig, "Missing file.");
  }

  const requiredTokens = [
    "[mcp_servers.prism]",
    "[mcp_servers.prism_safe]",
    '[plugins."build-web-apps@openai-curated"]',
    '[plugins."figma@openai-curated"]',
    "[projects.'H:\\']",
  ];
  const missing = requiredTokens.filter((token) => !text.includes(token));
  if (missing.length > 0) {
    return fail(
      "codex_config_prism_servers",
      FILES.codexConfig,
      `Missing config tokens: ${missing.join(", ")}.`,
    );
  }

  return pass(
    "codex_config_prism_servers",
    FILES.codexConfig,
    "Config advertises PRISM MCP servers, plugin surfaces, and H:\\ trust.",
  );
}

async function checkMcpJson(name, filePath) {
  const json = await readJson(filePath);
  if (json == null) {
    return fail(name, filePath, "Missing file.");
  }

  const serverKeys = Object.keys(json.mcpServers ?? {});
  const missing = ["prism", "prism_safe"].filter((key) => !serverKeys.includes(key));
  if (missing.length > 0) {
    return fail(name, filePath, `Missing MCP servers: ${missing.join(", ")}.`);
  }

  return pass(name, filePath, `Advertises MCP servers: ${serverKeys.join(", ")}.`);
}

async function checkSettingsHooks() {
  const json = await readJson(FILES.claudeSettings);
  if (json == null) {
    return fail("claude_settings_hooks", FILES.claudeSettings, "Missing file.");
  }

  const preTool = Array.isArray(json.hooks?.PreToolUse) ? json.hooks.PreToolUse : [];
  const postTool = Array.isArray(json.hooks?.PostToolUse) ? json.hooks.PostToolUse : [];

  const hasPrismHook = preTool.some((entry) => entry.matcher === "^mcp__prism");
  const hasBashHook = preTool.some((entry) => entry.matcher === "^Bash$");
  const hasTestGate = postTool.some((entry) =>
    (entry.hooks ?? []).some(
      (hook) => typeof hook.command === "string" && hook.command.includes("test-quality-gate.mjs"),
    ),
  );

  if (!hasPrismHook || !hasBashHook || !hasTestGate) {
    return fail(
      "claude_settings_hooks",
      FILES.claudeSettings,
      `Missing hook coverage: prism=${hasPrismHook}, bash=${hasBashHook}, testGate=${hasTestGate}.`,
    );
  }

  return pass(
    "claude_settings_hooks",
    FILES.claudeSettings,
    "Shared settings include prism MCP, bash interception, and test-quality gating hooks.",
  );
}

async function checkGeneratedBridge() {
  const text = await readText(FILES.bridgeDoc);
  if (text == null) {
    return fail("command_bridge_generated", FILES.bridgeDoc, "Missing file.");
  }

  const staleHits = STALE_MACHINE_MARKERS.filter((token) => text.includes(token));
  if (!text.includes(USER_HOME) || !text.includes(REPO_ROOT) || staleHits.length > 0) {
    return fail(
      "command_bridge_generated",
      FILES.bridgeDoc,
      `Expected live paths for user/repo. stale markers: ${staleHits.join(", ") || "none"}.`,
    );
  }

  return pass(
    "command_bridge_generated",
    FILES.bridgeDoc,
    "Bridge references the live home and workspace paths.",
  );
}

async function checkGeneratedRegistry() {
  const json = await readJson(FILES.registry);
  if (json == null) {
    return fail("command_registry_generated", FILES.registry, "Missing file.");
  }

  const sourceRoot = json.sources?.global_commands;
  const projectRoot = json.sources?.project_commands;
  const staleHits = STALE_MACHINE_MARKERS.filter((token) =>
    JSON.stringify(json).includes(token),
  );

  if (sourceRoot !== path.join(USER_HOME, ".claude", "commands")) {
    return fail(
      "command_registry_generated",
      FILES.registry,
      `Unexpected global command root: ${sourceRoot ?? "missing"}.`,
    );
  }
  if (projectRoot !== path.join(REPO_ROOT, ".claude", "commands")) {
    return fail(
      "command_registry_generated",
      FILES.registry,
      `Unexpected project command root: ${projectRoot ?? "missing"}.`,
    );
  }
  if (staleHits.length > 0) {
    return fail(
      "command_registry_generated",
      FILES.registry,
      `Registry still contains stale machine markers: ${staleHits.join(", ")}.`,
    );
  }

  return pass(
    "command_registry_generated",
    FILES.registry,
    `Registry indexed ${json.overview?.total_file_backed_commands ?? "unknown"} file-backed commands from live paths.`,
  );
}

async function main() {
  const checks = await Promise.all([
    checkRepoCanonical("repo_startup_canonical", FILES.repoStartup, ["H:/PRISM/state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md", "H:/PRISM/state/HANDOFF.md"], ["C:/PRISM"]),
    checkRepoCanonical("repo_forge_triple_canonical", FILES.repoForgeTriple, ["H:/PRISM/mcp-server/data/docs/MASTER_INDEX_COMPACT.md"], ["C:/PRISM"]),
    checkRepoCanonical("repo_codex_agents_canonical", FILES.repoCodexAgents, ["H:/PRISM/.claude/commands/startup.md", "H:/PRISM/.claude/commands/forge-triple.md"]),
    checkProfileLauncher("profile_startup_launcher", FILES.startup, "H:/PRISM/.claude/commands/startup.md"),
    checkProfileLauncher("profile_forge_triple_launcher", FILES.forgeTriple, "H:/PRISM/.claude/commands/forge-triple.md"),
    checkUnifiedDirective("codex_agents_uses_unified_directive", FILES.codexAgents),
    checkUnifiedDirective("plugin_startup_uses_unified_directive", FILES.pluginStartup),
    checkUnifiedDirective("plugin_mcp_util_uses_unified_directive", FILES.pluginMcpUtil),
    checkUnifiedDirective("plugin_compact_uses_unified_directive", FILES.pluginCompact),
    checkGeneratorSource(),
    checkConfigToml(),
    checkMcpJson("workspace_mcp_advertises_prism", FILES.workspaceMcp),
    checkMcpJson("server_mcp_advertises_prism", FILES.serverMcp),
    checkSettingsHooks(),
    checkGeneratedBridge(),
    checkGeneratedRegistry(),
  ]);

  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.length - passed;

  console.log(
    JSON.stringify(
      {
        ok: failed === 0,
        repo_root: REPO_ROOT,
        user_home: USER_HOME,
        summary: {
          total: checks.length,
          passed,
          failed,
        },
        checks,
      },
      null,
      2,
    ),
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
