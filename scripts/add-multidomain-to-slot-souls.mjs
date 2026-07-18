#!/usr/bin/env node
/**
 * add-multidomain-to-slot-souls.mjs -- one-shot, idempotent reconciler.
 *
 * Operator directive 2026-06-30 ("all chats can access multiple domains ... full
 * access to the codebase"): stamp every slot soul in state/shared/slot-souls/<slot>.md
 * with full multi-domain codebase access -- a `codebase_access: full` + `multi_domain: true`
 * frontmatter pair and a `## Codebase access` body section. The galaxy souls
 * (mcp-server/src/engines/<galaxy>/SOUL.md) get this from the generator
 * (galaxy-soul-render.mjs); slot souls are hand-authored INPUT to that generator, so
 * they need the same stamp applied directly here.
 *
 * Idempotent: re-running is a no-op for already-stamped files (skips both the
 * frontmatter pair and the body section if present). Preserves domain_filter as the
 * prefer-own-domain-first hint -- multi-domain is access, not a license to abandon the
 * slot's specialty. Worktree/lane guards are unchanged (git tree, not domain).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "state/shared/slot-souls");

const FM_LINES = ["codebase_access: full", "multi_domain: true"];

function bodySection(slotTitle) {
  return [
    "## Codebase access",
    "",
    `- **Full multi-domain access** (operator directive 2026-06-30): this slot may read, reason over, and work in ANY domain across the whole codebase -- not only its specialty.`,
    `- **Prefer own domain first:** lead your specialty by default (the \`domain_filter\` above is a focus hint, not a wall). Take cross-domain work when it serves the operator's goal or when your own queue is dry -- never idle.`,
    "- **Coordinate** cross-domain work via chat-bus + `[MAIN-FORCE]` commits on the shared trunk so a peer slot does not double-build the same artifact. Worktree/lane isolation guards (which git tree you commit from) are unchanged -- they are NOT domain guards.",
    "",
  ].join("\n");
}

function stampSoul(raw) {
  let changed = false;
  let s = raw;

  // 1. Frontmatter: insert the two fields before the closing '---' if not already present.
  const fmMatch = s.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch && !/codebase_access:/.test(fmMatch[1])) {
    const fm = fmMatch[1];
    // Insert after domain_filter line if present, else at end of frontmatter block.
    let newFm;
    if (/^domain_filter:.*$/m.test(fm)) {
      newFm = fm.replace(/^(domain_filter:.*)$/m, `$1\n${FM_LINES.join("\n")}`);
    } else {
      newFm = `${fm}\n${FM_LINES.join("\n")}`;
    }
    s = s.replace(fmMatch[0], `---\n${newFm}\n---`);
    changed = true;
  }

  // 2. Body section: insert after the first non-frontmatter paragraph (the intro), if not present.
  if (!/^## Codebase access/m.test(s)) {
    // Find the end of the frontmatter, then the first blank line AFTER the H1 title + intro para.
    const afterFm = s.indexOf("\n---", 3);
    const bodyStart = afterFm >= 0 ? afterFm + 4 : 0;
    const body = s.slice(bodyStart);
    // insert the section after the first H1 (# ...) and its following paragraph
    const h1 = body.match(/^# .+$/m);
    if (h1) {
      const h1Idx = body.indexOf(h1[0]) + h1[0].length;
      // find the end of the paragraph immediately after the H1 (next blank line after some prose)
      const rest = body.slice(h1Idx);
      // skip leading blank lines, then the first paragraph, then insert at the next blank line
      const paraEnd = rest.search(/\n\n(?=\S)/);
      const insertAt = paraEnd >= 0 ? h1Idx + paraEnd + 2 : h1Idx + 1;
      const newBody = body.slice(0, insertAt) + "\n" + bodySection() + "\n" + body.slice(insertAt);
      s = s.slice(0, bodyStart) + newBody;
    } else {
      // no H1 -> append the section at end
      s = s.replace(/\s*$/, "\n\n" + bodySection());
    }
    changed = true;
  }

  return { s, changed };
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error(`slot-souls dir not found: ${DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
  let stamped = 0;
  let already = 0;
  for (const f of files) {
    const p = path.join(DIR, f);
    const raw = fs.readFileSync(p, "utf8");
    const { s, changed } = stampSoul(raw);
    if (changed) {
      fs.writeFileSync(p, s, "utf8");
      stamped++;
    } else {
      already++;
    }
  }
  console.log(`slot souls: stamped ${stamped}, already-stamped ${already}, total ${files.length}`);
}

main();
