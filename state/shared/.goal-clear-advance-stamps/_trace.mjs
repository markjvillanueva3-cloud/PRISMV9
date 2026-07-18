// EXACT copy of live injectResumeLoop regex logic (stop-goal-clear-advance.mjs:213-237)
const RESUME_LOOP_MARKER = "## RESUME_LOOP";
const MAX_ADVANCE = 9;
function liveInject(content, count) {
  const block = `

${RESUME_LOOP_MARKER}

**GOAL CLEARED auto-advance** (advance ${count}/${MAX_ADVANCE}).

Next unit: FOO-MS0 / U-BAR
Source: pick-unit
Claimed: yes

NEXT ACTION.

(Injected; cap = ${MAX_ADVANCE}.)
`;
  const re = new RegExp(`\\n*${RESUME_LOOP_MARKER}[\\s\\S]*?(?=\\n## |$)`);
  const stripped = re.test(content) ? content.replace(re, "") : content;
  return stripped.replace(/\s*$/, "") + block;
}

const orig = "# Handoff\n\n## State\nimportant prior content\n\n## Next Steps\nkeep me\n";
const c1 = liveInject(orig, 1);
const c2 = liveInject(c1, 2);
console.log("blocks after 2 injects:", (c2.match(/## RESUME_LOOP/g) || []).length);
console.log("State preserved:", /## State\nimportant prior content/.test(c2));
console.log("NextSteps preserved:", /## Next Steps\nkeep me/.test(c2));
console.log("not glued:", !/\S## RESUME_LOOP/.test(c2));
console.log("no leftover count1:", !/advance 1\//.test(c2));
const c3 = liveInject(c2, 3);
console.log("blocks after 3:", (c3.match(/## RESUME_LOOP/g) || []).length);
console.log("converged (len delta c3-c2):", c3.length - c2.length);

// Diagnose match span on c1
const m = c1.match(new RegExp(`\\n*${RESUME_LOOP_MARKER}[\\s\\S]*?(?=\\n## |$)`));
console.log("match len:", m[0].length, "of total:", c1.length);
console.log("prefix-before-match ends with 'keep me':", c1.slice(0, c1.indexOf(m[0])).endsWith("keep me"));

// Adversarial: NO trailing newline at EOF
const noNL = "# H\n\n## RESUME_LOOP\n\nold\nbody";
const cn = liveInject(noNL, 1);
console.log("\n[no-EOF-newline] blocks:", (cn.match(/## RESUME_LOOP/g) || []).length, "old gone:", !/\nold\nbody/.test(cn));

// Adversarial: block FOLLOWED by a real section
const mid = "# H\n\n## RESUME_LOOP\n\nold body\n\n## Keep\nbody\n";
const cm = liveInject(mid, 1);
console.log("[followed-by-section] Keep survives:", /## Keep\nbody/.test(cm), "old gone:", !/old body/.test(cm), "blocks:", (cm.match(/## RESUME_LOOP/g) || []).length);
