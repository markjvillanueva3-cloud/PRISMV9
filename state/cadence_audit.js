const fs = require("fs");
const d = fs.readFileSync("C:/PRISM/mcp-server/dist/index.js", "utf-8");
const fns = ["autoTodoRefresh","autoContextPressure","autoCheckpoint","autoAttentionScore",
  "autoCompactionDetect","autoRecoveryManifest","autoSurvivalSave","autoSkillHint",
  "autoAgentRecommend","autoScriptRecommend","autoPhaseSkillLoader","autoSkillContextMatch",
  "autoNLHookEvaluator","autoHookActivationPhaseCheck","autoD4PerfSummary","autoD4BatchTick"];
for (const fn of fns) {
  const present = d.includes("async function " + fn) || d.includes("function " + fn);
  const called = d.includes(fn + "(");
  console.log(fn + ": def=" + present + " called=" + called);
}
