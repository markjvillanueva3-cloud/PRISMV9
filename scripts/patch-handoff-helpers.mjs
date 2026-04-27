#!/usr/bin/env node
/**
 * patch-handoff-helpers.mjs — One-shot patcher for precompact-handoff.mjs
 * + enforce-handoff-topic.mjs to use the new derive-session-topic helper.
 *
 * Preserves existing line endings (CRLF on Windows).
 */
import fs from "node:fs";

const PRECOMPACT = "H:/prism/.claude/helpers/precompact-handoff.mjs";
const ENFORCE = "H:/prism/.claude/hooks/enforce-handoff-topic.mjs";

function patchFile(filePath, patches) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  let content = raw;
  let applied = 0;
  for (const { name, find, replace } of patches) {
    const findStr = find.split("\n").join(eol);
    const replaceStr = replace.split("\n").join(eol);
    if (!content.includes(findStr)) {
      console.error(`SKIP ${filePath}: patch "${name}" not found`);
      continue;
    }
    content = content.replace(findStr, replaceStr);
    console.log(`OK ${filePath}: applied "${name}"`);
    applied++;
  }
  if (applied > 0) {
    fs.writeFileSync(filePath, content);
  }
  return applied;
}

// === precompact-handoff.mjs patches ===
patchFile(PRECOMPACT, [
  {
    name: "import-derive-session-topic",
    find: `import { inferAgentIdentity } from "./agent-identity.mjs";`,
    replace: `import { inferAgentIdentity } from "./agent-identity.mjs";
import { deriveSessionTopic } from "./derive-session-topic.mjs";`,
  },
  {
    name: "use-derived-topic",
    find: `  // Step 2.5: Extract topic slug for filename
  const topic = extractTopicSlug();`,
    replace: `  // Step 2.5: Derive topic — prefer THIS chat's existing handoff or state markers
  // over global git log (which can mis-attribute peer chats' work to us).
  const derived = deriveSessionTopic(identity.instance);
  const topic = derived.topic;`,
  },
]);

// === enforce-handoff-topic.mjs patches ===
patchFile(ENFORCE, [
  {
    name: "import-derive-session-topic",
    find: `import { spawnSync } from "node:child_process";`,
    replace: `import { spawnSync } from "node:child_process";
import { deriveSessionTopic } from "../helpers/derive-session-topic.mjs";`,
  },
  {
    name: "use-derived-topic-in-enforce",
    find: `  const topic = sanitizeTopic(extractTopicSlug());`,
    replace: `  // Prefer THIS chat's existing handoff topic / state markers over global git log
  const derived = deriveSessionTopic(sessionId);
  const topic = sanitizeTopic(derived.topic);`,
  },
]);

console.log("done");
