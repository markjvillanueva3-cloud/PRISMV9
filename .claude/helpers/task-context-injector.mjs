import { promises as fs } from "node:fs";
import process from "node:process";

const POSITION_FILES = [
  "H:\\prism\\state\\CURRENT_POSITION.md",
  "H:\\prism\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
];

async function readPosition() {
  for (const filePath of POSITION_FILES) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      return raw
        .split(/\r?\n/)
        .slice(0, 3)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
    } catch {
      // continue
    }
  }
  return "unknown";
}

async function main() {
  const originalPrompt = process.env.TOOL_INPUT_prompt ?? "";
  if (!originalPrompt.trim()) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const position = await readPosition();
  let prefix =
    `PRISM CONTEXT: Project at H:\\prism\\mcp-server. Build: npm run build. Tests: npx vitest run. 32 dispatchers, 111 tests. Position: ${position}`;
  prefix = prefix.slice(0, 200);

  process.stdout.write(
    JSON.stringify({
      updatedInput: {
        prompt: `${prefix}\n\n${originalPrompt}`,
      },
    }),
  );
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
