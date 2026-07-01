/**
 * generate-domain-soul-agents.mts -- DOMAIN-SOUL-AGENTS / U2.
 *
 * Emits one spawnable Claude subagent definition per chat-slot DOMAIN
 * (`.claude/agents/<slot>-<domain>.md`), composing the slot SOUL
 * (`state/shared/slot-souls/<slot>.md`) with that slot's galaxy doctrine via the
 * pure `DomainSoulAgentRenderEngine` (the single source of truth). Operator directive
 * 2026-06-30: "make each chat slot domain an agent soul."
 *
 * Mirrors `scripts/generate-galaxy-souls.mjs`: reuses the canonical `SLOT_GALAXY_MAP`
 * + the vetted `parseSlotSoul`/`firstHeadline` helpers; idempotent (SHA-skip unchanged
 * files); writes through the engine so a soul edit deterministically re-emits its agent.
 *
 * Run as a .mts so it can import the TS render engine directly under tsx (the
 * esbuild bundle exposes no per-file dist/engines/*.js to import). Self-reexecs under
 * tsx if launched with bare node (the Node-24 .js->.ts dynamic-import trap).
 *
 * Usage:
 *   node scripts/generate-domain-soul-agents.mts            # write all agents
 *   node scripts/generate-domain-soul-agents.mts --dry-run  # show, no write
 *   node scripts/generate-domain-soul-agents.mts --json
 *
 * Exit 0 always on a clean run (verifier-style); non-zero only on a hard I/O error.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

// --- tsx self-reexec guard (Node-24 .js->.ts dynamic-import trap) -----------
// If we are NOT already under tsx, re-exec via the local tsx binary so the `.ts` engine
// import below resolves. FAIL LOUD if we cannot reexec -- a bare `node ...mts` invocation
// type-strips this file but then SILENTLY fails the cross-file `.ts` dynamic import, exiting
// 0 with no output (a cron silent-no-op hazard; 3-of-3 arm-C finding). We refuse to continue
// without a TS loader rather than no-op silently.
if (!process.env.__DSA_TSX_REEXEC) {
  const here = fileURLToPath(import.meta.url);
  const binDir = path.resolve(path.dirname(here), "..", "mcp-server", "node_modules", ".bin");
  // Try platform variants in order; Git Bash (POSIX) prefers the extensionless shim, cmd.exe the .cmd.
  const candidates =
    process.platform === "win32" ? ["tsx.cmd", "tsx", "tsx.exe"] : ["tsx"];
  const tsxBin = candidates.map((c) => path.join(binDir, c)).find((p) => fs.existsSync(p));
  if (tsxBin) {
    const res = spawnSync(tsxBin, [here, ...process.argv.slice(2)], {
      stdio: "inherit",
      env: { ...process.env, __DSA_TSX_REEXEC: "1" },
      shell: process.platform === "win32", // .cmd needs a shell to spawn on Windows
    });
    if (res.error) {
      console.error(`generate-domain-soul-agents: FATAL -- could not spawn tsx (${tsxBin}): ${res.error.message}`);
      console.error("  Run directly under tsx: node mcp-server/node_modules/.bin/tsx scripts/generate-domain-soul-agents.mts");
      process.exit(2);
    }
    process.exit(res.status ?? 0);
  }
  // No tsx binary at all -> fail loud (do NOT fall through to a silent no-op).
  console.error("generate-domain-soul-agents: FATAL -- tsx not found in mcp-server/node_modules/.bin.");
  console.error("  Install deps (cd mcp-server && npm ci) or run under a TS-capable loader.");
  process.exit(2);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SLOT_SOULS_DIR = path.join(ROOT, "state/shared/slot-souls");
const AGENTS_DIR = path.join(ROOT, ".claude/agents");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const JSON_OUT = args.has("--json");

function readOptional(p: string): string {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function sha(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** First real headline of a doctrine file (galaxy identity), SKIPPING a leading YAML
 *  frontmatter block. Without the frontmatter skip, a SOUL.md whose first body line is a
 *  `key: value` frontmatter pair (e.g. `galaxy: quoting`) leaks into the agent description
 *  as a garbage identity (3-of-3 arm-A finding). We strip the `---...---` fence first, then
 *  take the first non-empty H1/blockquote-stripped line that is NOT itself a `key: value`. */
function firstHeadline(text: string): string {
  let body = String(text || "");
  const fm = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  if (fm) body = fm[1];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/^#+\s*/, "").replace(/^>\s*/, "").trim();
    if (!line || line.startsWith("---")) continue;
    // Skip a bare `key: value` frontmatter-style line (no spaces before the colon, lower-case key).
    if (/^[a-z_][a-z0-9_]*:\s/.test(line) && !/\s/.test(line.split(":")[0])) continue;
    return line.slice(0, 300);
  }
  return "";
}

/** Minimal slot-soul frontmatter parse -- mirrors SoulFrontmatterReaderEngine's
 *  flat-YAML dialect (scalars + list-of-scalars). Returns the SlotSoul-ish object the
 *  render engine consumes. */
function parseSlotSoul(text: string): Record<string, unknown> | null {
  const m = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const fm = m[1];
  const body = m[2];
  const out: Record<string, unknown> = { body };
  const lines = fm.split(/\r?\n/);
  let curList: string[] | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.length) continue;
    if (curList && /^\s{2,}-\s+/.test(line)) {
      curList.push(line.replace(/^\s*-\s+/, "").trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === "") {
      curList = [];
      out[key] = curList;
    } else {
      curList = null;
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  // Lazy imports (after the tsx reexec guarantees TS resolves).
  const { DomainSoulAgentRenderEngine } = await import(
    pathToFileURL(path.join(ENGINES_DIR, "DomainSoulAgentRenderEngine.ts")).href
  );
  const { SLOT_GALAXY_MAP } = await import(pathToFileURL(path.join(ROOT, "scripts/lib/slot-galaxy-map.mjs")).href);

  const results: Array<{ slot: string; agent: string; status: string }> = [];
  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const [slot, galaxy] of Object.entries(SLOT_GALAXY_MAP as Record<string, string>)) {
    // zebra is a legacy alias for zulu's galaxy -- skip to avoid a duplicate agent.
    if (slot === "zebra") {
      results.push({ slot, agent: "(alias of zulu)", status: "skipped-alias" });
      continue;
    }
    const soulRaw = readOptional(path.join(SLOT_SOULS_DIR, `${slot}.md`));
    if (!soulRaw) {
      results.push({ slot, agent: "", status: "no-soul" });
      continue;
    }
    const soul = parseSlotSoul(soulRaw);
    if (!soul || !soul.slot) {
      results.push({ slot, agent: "", status: "parse-failed" });
      failed++;
      continue;
    }
    const gDir = path.join(ENGINES_DIR, galaxy);
    const identity =
      firstHeadline(readOptional(path.join(gDir, "SOUL.md"))) ||
      firstHeadline(readOptional(path.join(gDir, "CLAUDE.md"))) ||
      firstHeadline(readOptional(path.join(gDir, "MEMORY.md")));
    const knowledgePaths = ["CLAUDE.md", "MEMORY.md", "PATHS.md", "TOOLBELT.md"]
      .filter((f) => fs.existsSync(path.join(gDir, f)))
      .map((f) => `mcp-server/src/engines/${galaxy}/${f}`);

    const r = DomainSoulAgentRenderEngine.renderAgent(soul, {
      domain: galaxy,
      identity: identity || undefined,
      knowledgePaths: knowledgePaths.length ? knowledgePaths : undefined,
    });
    if (!r.ok) {
      results.push({ slot, agent: "", status: `render-failed: ${r.errors.join(", ")}` });
      failed++;
      continue;
    }
    const outPath = path.join(AGENTS_DIR, `${r.name}.md`);
    const existing = readOptional(outPath);
    if (existing && sha(existing) === sha(r.content)) {
      results.push({ slot, agent: r.name, status: "unchanged" });
      skipped++;
      continue;
    }
    if (!DRY) {
      fs.mkdirSync(AGENTS_DIR, { recursive: true });
      fs.writeFileSync(outPath, r.content, "utf8");
    }
    results.push({ slot, agent: r.name, status: DRY ? "would-write" : "written" });
    written++;
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ written, skipped, failed, results }, null, 2) + "\n");
  } else {
    for (const r of results) console.log(`  ${r.slot.padEnd(9)} ${r.agent.padEnd(24)} ${r.status}`);
    console.log(
      `domain-soul agents: ${DRY ? "would-write" : "wrote"} ${written}, unchanged ${skipped}, failed ${failed} ` +
        `(of ${Object.keys(SLOT_GALAXY_MAP as Record<string, string>).length} slots)`
    );
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("generate-domain-soul-agents: FATAL", e?.message || e);
  process.exit(2);
});
