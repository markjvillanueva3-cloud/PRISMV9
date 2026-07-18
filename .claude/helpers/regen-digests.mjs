/**
 * regen-digests.mjs — Regenerate all 4 PRISM reference digest files
 *
 * Scans the live codebase and rewrites:
 *   1. ENGINE_DIGEST.md      — all engines with 1-line descriptions
 *   2. DISPATCHER_DIGEST.md  — all dispatchers with action counts
 *   3. DIRECTORY_DIGEST.md   — directory tree with domain routing
 *   4. MASTER_INDEX_COMPACT.md — aggregated system overview
 *
 * Designed to run in ≤10s as a PreCompact hook.
 * Usage: node regen-digests.mjs [--quiet]
 */
import { promises as fs } from "node:fs";
import { join, basename, relative } from "node:path";
import { writeAtomic } from "./atomic-write.mjs";

const PRISM_ROOT = "H:/prism";
const MCP_ROOT = join(PRISM_ROOT, "mcp-server");
const SRC = join(MCP_ROOT, "src");
const ENGINES_DIR = join(SRC, "engines");
const DISPATCHERS_DIR = join(SRC, "tools/dispatchers");
const TESTS_DIR = join(SRC, "__tests__");
const ALGORITHMS_DIR = join(SRC, "algorithms");
const REGISTRIES_DIR = join(SRC, "registries");
const HOOKS_DIR = join(SRC, "hooks");
const SCHEMAS_DIR = join(SRC, "schemas");

const DOCS_OUT = join(MCP_ROOT, "data/docs");
const COMPACT_OUT = join(MCP_ROOT, "src/data/docs");

const quiet = process.argv.includes("--quiet");
function info(msg) {
  if (!quiet) process.stderr.write(`[regen] ${msg}\n`);
}

// ─── Utilities ──────────────────────────────────────────────────

async function findFiles(dir, ext = ".ts") {
  const results = [];
  async function walk(d) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const full = join(d, e.name);
      if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist" && e.name !== ".git") {
        await walk(full);
      } else if (e.isFile() && e.name.endsWith(ext)) {
        results.push(full);
      }
    }
  }
  await walk(dir);
  return results;
}

async function readHead(filePath, bytes = 2048) {
  let handle;
  try {
    handle = await fs.open(filePath, "r");
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buf, 0, bytes, 0);
    return buf.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    await handle?.close();
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── ENGINE DIGEST ──────────────────────────────────────────────

async function generateEngineDigest() {
  const files = await findFiles(ENGINES_DIR);
  const engineFiles = files.filter(
    (f) =>
      !f.includes(".test.") &&
      !f.includes(".spec.") &&
      !f.includes("__tests__") &&
      !basename(f).startsWith("index."),
  );

  info(`Scanning ${engineFiles.length} engine files...`);

  const entries = [];

  // Read first 5KB of each file for JSDoc description
  const heads = await Promise.all(engineFiles.map((f) => readHead(f, 5120)));

  for (let i = 0; i < engineFiles.length; i++) {
    const head = heads[i];
    const file = engineFiles[i];

    // Use filename as the engine name (most reliable — files ARE the engines)
    const fileName = basename(file, ".ts");

    // Extract description from JSDoc first meaningful line
    let description = "";

    if (head) {
      // Only consider JSDoc blocks in the first ~1500 bytes (avoid internal function docs)
      const topHead = head.slice(0, 1500);

      // Pattern 1: /** ClassName — Description  (most common)
      const dashDesc = topHead.match(
        /\/\*\*[\s\S]*?\*\s*\w+\s*—\s*(.+?)(?:\s*\n|\s*\*\/)/,
      );
      if (dashDesc) {
        const candidate = dashDesc[1].trim().replace(/\s*\*\s*$/, "");
        // Skip if it looks like a milestone tag (e.g., CK-MS12 U04, R10-Rev8, CAMX-MS13)
        const isMilestoneTag = /^[A-Z]+-[A-Z]*\d|^R\d+-Rev\d|^PRISM\s+MCP\s+Server/i.test(candidate);
        if (!isMilestoneTag) {
          description = candidate;
        }
      }

      // Pattern 2: First meaningful JSDoc line (skip tags and milestone IDs)
      if (!description) {
        const jsdocBlock = topHead.match(/\/\*\*([\s\S]*?)\*\//);
        if (jsdocBlock) {
          const lines = jsdocBlock[1].split("\n");
          for (const line of lines) {
            const clean = line.replace(/^\s*\*\s*/, "").trim();
            if (!clean || clean.length <= 10 || clean.startsWith("@") || clean.startsWith("*")) continue;
            // Skip separator lines (====, ----, etc.)
            if (/^[=\-~*]{4,}$/.test(clean)) continue;
            // Take everything after " — " if present, or the whole line
            const dashSplit = clean.split(/\s*—\s*/);
            let candidate = dashSplit.length > 1 ? dashSplit.slice(1).join(" — ") : clean;
            // Skip milestone tags and generic prefixes
            if (/^[A-Z]+-[A-Z]*\d|^R\d+-Rev\d|^PRISM\s+MCP/i.test(candidate)) continue;
            description = candidate;
            break;
          }
        }
      }
    }

    // Fallback: humanize the filename
    if (!description) {
      description = fileName
        .replace(/Engine$/, "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
    }

    // Sanitize markdown-active chars and truncate
    description = description.replace(/[|[\]]/g, "");
    if (description.length > 120) {
      description = description.slice(0, 117) + "...";
    }

    entries.push({ className: fileName, description });
  }

  // Sort alphabetically
  entries.sort((a, b) => a.className.localeCompare(b.className));

  // Deduplicate by class name (shouldn't happen with filenames, but safe)
  const seen = new Set();
  const unique = entries.filter((e) => {
    if (seen.has(e.className)) return false;
    seen.add(e.className);
    return true;
  });

  // Generate markdown
  const lines = [
    "# ENGINE DIGEST",
    `## ${unique.length} engines indexed`,
    `## Auto-generated: ${today()}`,
    "",
  ];
  for (const e of unique) {
    lines.push(`- **${e.className}**: ${e.description}`);
  }

  const content = lines.join("\n") + "\n";
  await writeAtomic(join(DOCS_OUT, "ENGINE_DIGEST.md"), content, { fsync: false });
  info(`ENGINE_DIGEST: ${unique.length} engines`);
  return { count: unique.length, entries: unique };
}

// ─── DISPATCHER DIGEST ──────────────────────────────────────────

async function generateDispatcherDigest() {
  const files = await findFiles(DISPATCHERS_DIR);
  const dispFiles = files.filter(
    (f) =>
      f.includes("Dispatcher") || f.includes("dispatcher"),
  );

  info(`Scanning ${dispFiles.length} dispatcher files...`);

  const entries = [];
  let totalActions = 0;

  for (const f of dispFiles) {
    let content;
    try {
      content = await fs.readFile(f, "utf8");
    } catch {
      continue;
    }

    // Extract dispatcher name from filename
    const name = basename(f, ".ts");

    // Extract ACTIONS — handles multiple real-world patterns:
    //   1. const ACTIONS = ["a","b"] as const
    //   2. z.enum(["a","b"])
    //   3. const ACTIONS = [...SUB1, ...SUB2] (spread from sub-arrays)
    //   4. const ACTIONS = Object.keys(ACTION_MAP) (key-based)
    //   5. Single-quoted strings ('action')
    let actionCount = 0;

    // Pattern 1: Direct array with string literals (double or single quoted)
    // Match ACTIONS, ALL_ACTIONS, or any *_ACTIONS variant
    const actionsBlock = content.match(
      /const\s+(?:ALL_)?ACTIONS\s*=\s*\[([\s\S]*?)\]\s*(?:as\s+const)?/,
    );
    if (actionsBlock) {
      const actionItems = actionsBlock[1].match(/["'][^"']+["']/g);
      actionCount = actionItems ? actionItems.length : 0;

      // Pattern 3: Spread syntax — count actions in referenced sub-arrays/sets
      if (actionCount === 0 || actionsBlock[1].includes("...")) {
        const spreadRefs = actionsBlock[1].match(/\.\.\.(\w+)/g);
        if (spreadRefs) {
          let spreadCount = 0;
          for (const ref of spreadRefs) {
            const varName = ref.replace("...", "");
            // Try array: const VAR = ["a","b"]
            const subArrayPattern = new RegExp(
              `const\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*(?:as\\s+const)?`,
            );
            const subArrayMatch = content.match(subArrayPattern);
            if (subArrayMatch) {
              const subItems = subArrayMatch[1].match(/["'][^"']+["']/g);
              if (subItems) { spreadCount += subItems.length; continue; }
            }
            // Try Set: const VAR = new Set(["a","b"])
            const subSetPattern = new RegExp(
              `const\\s+${varName}\\s*=\\s*new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)`,
            );
            const subSetMatch = content.match(subSetPattern);
            if (subSetMatch) {
              const subItems = subSetMatch[1].match(/["'][^"']+["']/g);
              if (subItems) spreadCount += subItems.length;
            }
          }
          if (spreadCount > actionCount) actionCount = spreadCount;
        }
      }
    }

    // Pattern 4: Object.keys(ACTION_MAP) or Object.keys(MAP)
    if (actionCount === 0) {
      const keysMatch = content.match(
        /const\s+ACTIONS\s*=\s*Object\.keys\((\w+)\)/,
      );
      if (keysMatch) {
        const mapName = keysMatch[1];
        const mapPattern = new RegExp(
          `const\\s+${mapName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`,
        );
        const mapMatch = content.match(mapPattern);
        if (mapMatch) {
          // Count keys — look for string keys or identifier keys followed by :
          const keys = mapMatch[1].match(/^\s*["']?[\w-]+["']?\s*:/gm);
          actionCount = keys ? keys.length : 0;
        }
      }
    }

    // Pattern 2: z.enum([...]) directly
    if (actionCount === 0) {
      const enumBlock = content.match(
        /z\.enum\(\[([\s\S]*?)\]\)/,
      );
      if (enumBlock) {
        const items = enumBlock[1].match(/["'][^"']+["']/g);
        actionCount = items ? items.length : 0;
      }
    }

    // Pattern 5: z.enum with variable reference — count the variable's array
    if (actionCount === 0) {
      const enumVarMatch = content.match(/z\.enum\((\w+)\s/);
      if (enumVarMatch) {
        const varName = enumVarMatch[1];
        const varPattern = new RegExp(
          `const\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`,
        );
        const varMatch = content.match(varPattern);
        if (varMatch) {
          const items = varMatch[1].match(/["'][^"']+["']/g);
          actionCount = items ? items.length : 0;
        }
      }
    }

    // Extract MCP tool name from server.tool("prism_*"
    let toolName = "";
    const toolMatch = content.match(
      /server\.tool\(\s*"(prism_[^"]+)"/,
    );
    if (toolMatch) {
      toolName = toolMatch[1];
    }

    // Extract domain description from JSDoc or server.tool description
    let domain = "";
    const descMatch = content.match(
      /\*\s*(?:prism_\w+|[\w]+Dispatcher)\s*—\s*(.+)/,
    );
    if (descMatch) {
      domain = descMatch[1].trim();
    }
    if (!domain) {
      // Try from server.tool description
      const serverDesc = content.match(
        /server\.tool\([^,]+,\s*`([^`]{5,80})/,
      );
      if (serverDesc) {
        let desc = serverDesc[1].split("—")[0].trim();
        // Clean up template literal fragments and trailing artifacts
        desc = desc.replace(/\$\{[^}]*\}/g, "").replace(/\s*Actions:\s*\.?\s*$/, "").replace(/\s+/g, " ").trim();
        if (desc.length > 60) desc = desc.slice(0, 57) + "...";
        domain = desc;
      }
    }
    if (!domain) {
      domain = name.replace(/Dispatcher$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    }

    totalActions += actionCount;
    entries.push({ name, toolName, domain, actionCount });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const lines = [
    "# PRISM Dispatcher Digest",
    "",
    `**${entries.length} dispatchers** route MCP actions to engines.`,
    "Each dispatcher handles a specific manufacturing/system domain.",
    `Updated: ${today()} (auto-generated from source code)`,
    "",
    "## Dispatcher Map",
    "",
    "| Dispatcher | Domain | Actions |",
    "|-----------|--------|---------|",
  ];
  for (const e of entries) {
    lines.push(
      `| ${e.name} | ${e.toolName ? `${e.toolName} — ` : ""}${e.domain} | ${e.actionCount} |`,
    );
  }
  lines.push("");
  lines.push(`**Total actions across all dispatchers: ${totalActions}**`);

  const content = lines.join("\n") + "\n";
  await writeAtomic(join(DOCS_OUT, "DISPATCHER_DIGEST.md"), content, { fsync: false });
  info(`DISPATCHER_DIGEST: ${entries.length} dispatchers, ${totalActions} actions`);
  return { count: entries.length, actionCount: totalActions };
}

// ─── DIRECTORY DIGEST ───────────────────────────────────────────

async function generateDirectoryDigest() {
  info("Scanning directory structure...");

  const dirCounts = {};
  let totalDirs = 0;
  let totalFiles = 0;

  async function walkCount(dir, depth = 0) {
    if (depth > 6) return; // Don't go too deep
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const rel = relative(MCP_ROOT, dir).replace(/\\/g, "/") || ".";
    let fileCount = 0;

    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
      if (e.isDirectory()) {
        totalDirs++;
        await walkCount(join(dir, e.name), depth + 1);
      } else if (e.isFile()) {
        fileCount++;
        totalFiles++;
      }
    }

    if (fileCount > 0 && depth <= 4) {
      dirCounts[rel] = fileCount;
    }
  }

  await walkCount(SRC);

  // Generate quick lookup table
  const lines = [
    "# PRISM Directory Digest",
    "",
    "**Purpose**: Token-efficient reference for the entire mcp-server file system.",
    "Load this file (~800 tokens) instead of running Glob/Grep to find things.",
    "",
    `**Generated**: ${today()} | **Directories**: ${totalDirs} | **Files**: ${totalFiles}`,
    "",
    "## Quick Lookup",
    "",
    "| What you need | Where to look | Shortcode |",
    "|--------------|---------------|-----------|",
    "| Engine code | `src/engines/` | E0001-E1300+ |",
    "| Action routing | `src/tools/dispatchers/` | D01-D79 |",
    "| Algorithms | `src/algorithms/` | A01-A51 |",
    "| Tests | `src/__tests__/` | T0001-T0900+ |",
    "| Tool catalogs | `src/data/` | C01-C67 |",
    "| Action schemas | `src/schemas/` | — |",
    "| API routes | `src/routes/` | — |",
    "| Type definitions | `src/types/` | — |",
    "| Milestones | `data/milestones/` | -- |",
    "| Documentation | `data/docs/` | DOC01-DOC36 |",
    "| Hooks | `src/hooks/` | H01-H21 |",
    "| Registries | `src/registries/` | RG01-RG22 |",
    "| Utils | `src/utils/` | U01-U16 |",
    "| Web pages | `web/src/pages/` | — |",
    "| Material data | `data/materials/` | — |",
    "| Roadmap | `data/docs/roadmap/` | — |",
    "",
    "## Domain Routing",
    "",
    "When a query mentions these topics, look here:",
    "",
    "- **cutting/machining/force/speed/feed** -> `src/engines/ (E*), src/algorithms/, src/data/`",
    "- **tool selection/catalog/holder** -> `src/data/ (tool catalogs), src/registries/ToolCatalogRegistry`",
    "- **G-code/post-processor/CAM** -> `src/engines/*GCode*, *Cam*, *PostProcess*, *Toolpath*`",
    "- **machine profiles/kinematics** -> `src/data/machine-*-catalog*.ts`",
    "- **material properties/database** -> `src/registries/MaterialDatabase*, data/materials/`",
    "- **quoting/costing/economics** -> `src/engines/*Cost*, *Quote*, *Economic*, *Price*`",
    "- **quality/SPC/capability** -> `src/engines/*Quality*, *Statistical*, *Process*, *Capability*`",
    "- **safety/risk/OSHA** -> `src/engines/*Safety*, src/hooks/SafetyChain*`",
    "- **welding/joining** -> `src/engines/*Weld*, *Solder*, *Braz*, *FSW*`",
    "- **casting/molding** -> `src/engines/*Cast*, *Mold*, *Injection*, *Rotational*`",
    "- **coating/plating/surface** -> `src/engines/*Coat*, *Plat*, *Spray*, *PVD*, *CVD*`",
    "- **forming/stamping/bending** -> `src/engines/*Form*, *Stamp*, *Bend*, *Roll*, *Press*`",
    "- **thermal/heat treatment** -> `src/engines/*Thermal*, *Heat*, *Quench*, *Anneal*`",
    "- **monitoring/sensor/vibration** -> `src/engines/*Monitor*, *Sensor*, *Vibrat*, *Acoustic*`",
    "- **statistics/Monte Carlo/DOE** -> `src/engines/*Statistic*, *MonteCarlo*, *DOE*, *Bayesian*`",
    "- **chatter/stability/damping** -> `src/engines/*Chatter*, *Stability*, *Damp*, *Vibrat*`",
    "- **deflection/stiffness** -> `src/engines/*Deflect*, *Stiff*, *Compliance*`",
    "- **wear/tool life** -> `src/engines/*Wear*, *Life*, *Usui*, *Taylor*`",
    "- **surface finish/roughness** -> `src/engines/*Surface*, *Finish*, *Roughness*, *Integrity*`",
    "- **token optimization** -> `src/engines/*Token*, *Context*, *Session*, *Compact*, *Output*`",
    "- **playbook/best practices** -> `src/engines/MachiningPlaybookEngine.ts`",
    "- **tribal knowledge/tips** -> `src/registries/TribalKnowledgeEngine*, data/*.json (tips)`",
    "- **EDM/wire/sinker** -> `src/engines/*EDM*, *Wire*, *Sinker*`",
    "- **grinding** -> `src/engines/*Grind*`",
    "- **laser/waterjet** -> `src/engines/*Laser*, *Waterjet*, *AWJ*`",
    "- **turning/lathe** -> `src/engines/*Turn*, *Lathe*, *Bore*`",
    "- **multi-axis/5-axis** -> `src/engines/*FiveAxis*, *MultiAxis*, *RTCP*`",
    "",
    "## Top-Level Directory Sizes",
    "",
  ];

  // Add top dirs sorted by file count
  const sorted = Object.entries(dirCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  for (const [dir, count] of sorted) {
    lines.push(`- \`${dir}/\` — ${count} files`);
  }

  const content = lines.join("\n") + "\n";
  await writeAtomic(join(DOCS_OUT, "DIRECTORY_DIGEST.md"), content, { fsync: false });
  info(`DIRECTORY_DIGEST: ${totalDirs} dirs, ${totalFiles} files`);
  return { dirCount: totalDirs, fileCount: totalFiles };
}

// ─── MASTER INDEX COMPACT ───────────────────────────────────────

async function generateMasterIndex(engineCount, dispatcherCount, actionCount) {
  info("Generating MASTER_INDEX_COMPACT...");

  // Count ancillary items
  const [testFiles, algoFiles, registryFiles, hookFiles, schemaFiles] =
    await Promise.all([
      findFiles(TESTS_DIR).then((f) => f.filter((p) => p.includes(".test.") || p.includes(".spec.")).length),
      findFiles(ALGORITHMS_DIR).then((f) => f.filter((p) => !p.includes(".test.") && !basename(p).startsWith("index.")).length),
      findFiles(REGISTRIES_DIR).then((f) => f.filter((p) => !p.includes(".test.") && !basename(p).startsWith("index.")).length),
      findFiles(HOOKS_DIR).then((f) => f.filter((p) => !p.includes(".test.") && !basename(p).startsWith("index.")).length),
      findFiles(SCHEMAS_DIR).then((f) => f.length),
    ]);

  // Count Claude helpers
  let claudeHooks = 0;
  let claudeSkills = 0;
  let claudeCommands = 0;
  try {
    const helpers = await fs.readdir(join(PRISM_ROOT, ".claude/helpers"));
    claudeHooks = helpers.filter((f) => f.endsWith(".mjs") || f.endsWith(".sh")).length;
  } catch {}
  try {
    const skills = await fs.readdir(join(PRISM_ROOT, ".claude/skills"));
    claudeSkills = skills.length;
  } catch {}
  try {
    const cmds = await fs.readdir(join(PRISM_ROOT, ".claude/commands"));
    claudeCommands = cmds.filter((f) => f.endsWith(".md")).length;
  } catch {}

  const lines = [
    "# PRISM v9 — Master Index (Compact)",
    `Generated: ${today()}`,
    "",
    "## Counts",
    `- Engines: ${engineCount} | Algorithms: ${algoFiles} | Dispatchers: ${dispatcherCount} | Actions: ${actionCount}`,
    `- Tests: ${testFiles} files | Schemas: ${schemaFiles} | Hooks: ${hookFiles}`,
    `- Tools: ~95K catalog | Machines: 910 | Materials: 2,957`,
    `- Registries: ${registryFiles} | Claude Hooks: ${claudeHooks} | Skills: ${claudeSkills} | Commands: ${claudeCommands}`,
    "",
    "## Architecture (11 Layers)",
    "L0: Safety Chain | L1: Physics | L2: Materials | L3: Tools",
    "L4: Machine | L5: Process | L6: Quality | L7: Economics",
    "L8: Integration | L9: Intelligence | L10: Presentation",
    "",
    "## Key Subsystems",
    "- **Speed/Feed**: SpeedFeedOrchestratorEngine (67-point hub), Kienzle/Taylor/Johnson-Cook",
    "- **Post-Processing**: PostProcessorPipelineEngine (38 stages, 20 dialects)",
    "- **CAM Kernel**: 13 milestones (CK-MS0-MS13), 5-axis, mill-turn, self-learning",
    "- **Simulation**: 6 engines, Vericut-class G-code verification",
    "- **Feasibility**: 7 engines, forward-simulation, 43 failure modes",
    "- **Stochastic**: 9 engines, MC/FOSM/PCE/Sobol/Bayesian",
    "- **Quality**: UnifiedPhysicsVerifier, CrossPipelineWhatIf, AutoCalibration",
    "- **CLI**: 8 commands (sf/sim/quote/program/post/tool/playbook/calc)",
    "- **Tribal**: 3,700+ tips, 18 CAM systems",
    "- **Playbook**: 296 rules across 42 categories, physics-enriched",
    "- **Fusion 360**: Code generation + live bridge (port 18360)",
    "- **Video**: Action replay, interactive learning, CadQuery/Playwright gen",
    "",
    "## Entry Points",
    "- ToolRouter: 107 patterns -> 44 dispatcher targets",
    "- CLI: `prism <command>` (8 commands, 4 output formats)",
    "- MCP: Tool-based dispatcher access",
    `- Web: 70+ pages`,
    "",
    "## Reference Files (read BEFORE searching)",
    `- ENGINE_DIGEST.md: mcp-server/data/docs/ENGINE_DIGEST.md (${engineCount} engines)`,
    `- DISPATCHER_DIGEST.md: mcp-server/data/docs/DISPATCHER_DIGEST.md (${dispatcherCount} dispatchers)`,
    "- DIRECTORY_DIGEST.md: mcp-server/data/docs/DIRECTORY_DIGEST.md (domain→path routing)",
    "- MASTER_INDEX_COMPACT.md: this file",
  ];

  const content = lines.join("\n") + "\n";
  await writeAtomic(join(COMPACT_OUT, "MASTER_INDEX_COMPACT.md"), content, { fsync: false });

  // Also write a copy to data/docs for discoverability
  await writeAtomic(join(DOCS_OUT, "MASTER_INDEX_COMPACT.md"), content, { fsync: false }).catch(() => {});

  info(`MASTER_INDEX: ${engineCount} engines, ${dispatcherCount} dispatchers, ${actionCount} actions, ${testFiles} tests`);
  return { testFiles, algoFiles, registryFiles, hookFiles };
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  info("Regenerating all digest files...");

  // Generate engine + dispatcher + directory in parallel
  const [engineResult, dispResult, dirResult] = await Promise.all([
    generateEngineDigest(),
    generateDispatcherDigest(),
    generateDirectoryDigest(),
  ]);

  // Master index depends on the above counts
  const masterResult = await generateMasterIndex(
    engineResult.count,
    dispResult.count,
    dispResult.actionCount,
  );

  // Reset the ref-first session flag so the next search gets the full injection
  // (critical after compaction clears context)
  await fs.unlink(join("H:/prism/.claude/cache", "ref-first-injected.flag")).catch(() => {});

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const summary = `Digests regenerated in ${elapsed}s: ${engineResult.count} engines, ${dispResult.count} dispatchers, ${dispResult.actionCount} actions, ${masterResult.testFiles} tests`;
  info(summary);

  // Output for hook consumption
  process.stdout.write(JSON.stringify({ digestsRegenerated: true, summary }));
}

main().catch((err) => {
  process.stderr.write(`[regen] Error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({ digestsRegenerated: false, error: err.message }));
  process.exit(0); // Don't fail the hook
});
