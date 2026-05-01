const fs = require("fs");
const idx = JSON.parse(fs.readFileSync("C:/PRISM/skills-consolidated/SKILL_INDEX.json", "utf-8"));
const skills = idx.skills;
console.log("Type: " + typeof skills);
if (typeof skills === "object" && !Array.isArray(skills)) {
  const keys = Object.keys(skills);
  console.log("Skill count (keys): " + keys.length);
  let withTrig = 0, totalTrig = 0;
  for (const k of keys) {
    const s = skills[k];
    const t = s.triggers || s.keywords || [];
    if (Array.isArray(t) && t.length > 0) { withTrig++; totalTrig += t.length; }
  }
  console.log("With triggers: " + withTrig + " (" + Math.round(withTrig/keys.length*100) + "%)");
  console.log("Total trigger keywords: " + totalTrig);
  console.log("Avg triggers/skill: " + (withTrig > 0 ? (totalTrig/withTrig).toFixed(1) : 0));
  // Sample one
  const sample = skills[keys[0]];
  console.log("Sample: " + JSON.stringify({id: keys[0], triggers: sample.triggers?.slice(0,5), phases: sample.phases}));
} else if (Array.isArray(skills)) {
  console.log("Array length: " + skills.length);
}
