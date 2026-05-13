// tier: T4
import { spawnSync } from "node:child_process";

const cases = [
  { name: "C .claude/commands/ -- BLOCK", path: "C:\\Users\\wompu\\.claude\\commands\\foo.md", expect: "deny" },
  { name: "C .claude/hooks/ -- BLOCK", path: "C:\\Users\\wompu\\.claude\\hooks\\bar.mjs", expect: "deny" },
  { name: "C .claude/agents/ -- BLOCK", path: "C:\\Users\\wompu\\.claude\\agents\\myagent.md", expect: "deny" },
  { name: "C .claude/skills/ -- BLOCK", path: "C:\\Users\\wompu\\.claude\\skills\\x.md", expect: "deny" },
  { name: "C .claude/rules/ -- BLOCK", path: "C:\\Users\\wompu\\.claude\\rules\\x.md", expect: "deny" },
  { name: "C .claude/plans/ -- BLOCK", path: "C:\\Users\\wompu\\.claude\\plans\\x.md", expect: "deny" },
  { name: "C hookify-*.md root -- BLOCK", path: "C:\\Users\\wompu\\.claude\\hookify-build.local.md", expect: "deny" },
  { name: "C .claude/projects/ -- ALLOW", path: "C:\\Users\\wompu\\.claude\\projects\\H--prism\\memory\\MEMORY.md", expect: "allow" },
  { name: "C .claude/sessions/ -- ALLOW", path: "C:\\Users\\wompu\\.claude\\sessions\\abc.json", expect: "allow" },
  { name: "C .claude/todos/ -- ALLOW", path: "C:\\Users\\wompu\\.claude\\todos\\xyz.json", expect: "allow" },
  { name: "C .claude/cache/ -- ALLOW", path: "C:\\Users\\wompu\\.claude\\cache\\data.bin", expect: "allow" },
  { name: "C .claude/settings.json -- ALLOW", path: "C:\\Users\\wompu\\.claude\\settings.json", expect: "allow" },
  { name: "C .claude/history.jsonl -- ALLOW", path: "C:\\Users\\wompu\\.claude\\history.jsonl", expect: "allow" },
  { name: "H .claude/commands/ -- ALLOW (not on C:)", path: "H:\\.claude\\commands\\foo.md", expect: "allow" },
  { name: "H prism/src -- ALLOW", path: "H:\\prism\\mcp-server\\src\\engine.ts", expect: "allow" },
  { name: "C prism project file -- BLOCK", path: "C:\\Users\\wompu\\prism\\src\\engine.ts", expect: "deny" },
  { name: "bash /c/Users/.../commands -- BLOCK", path: "/c/Users/wompu/.claude/commands/foo.md", expect: "deny" },
  { name: "bash /c/Users/.../projects -- ALLOW", path: "/c/Users/wompu/.claude/projects/x.md", expect: "allow" },
];

let fail = 0;
for (const c of cases) {
  const payload = JSON.stringify({ tool_name: "Write", tool_input: { file_path: c.path } });
  const res = spawnSync("node", ["H:/prism/.claude/hooks/h-drive-enforcement.mjs"], {
    input: payload,
    encoding: "utf-8",
  });
  const out = res.stdout.trim();
  let decision = "allow";
  if (out) {
    try {
      const j = JSON.parse(out);
      decision = j.hookSpecificOutput?.permissionDecision ?? "allow";
    } catch { decision = "parse-error"; }
  }
  const ok = decision === c.expect;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}  [got=${decision} exp=${c.expect}]`);
}
console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAIL"}`);
process.exit(fail === 0 ? 0 : 1);
