const fs = require("fs");
const idx = JSON.parse(fs.readFileSync("C:/PRISM/skills-consolidated/SKILL_INDEX.json", "utf-8"));
let total = 0, withTriggers = 0, totalTriggers = 0;
for (const s of idx.skills || []) {
  total++;
  if (s.triggers && s.triggers.length > 0) { withTriggers++; totalTriggers += s.triggers.length; }
}
console.log("Total skills: " + total);
console.log("With triggers: " + withTriggers + " (" + Math.round(withTriggers/total*100) + "%)");
console.log("Total trigger keywords: " + totalTriggers);
console.log("Avg triggers/skill: " + (totalTriggers/withTriggers).toFixed(1));
