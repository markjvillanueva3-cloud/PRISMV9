const fs = require("fs");
const path = require("path");
// Find SKILL_INDEX.json
const paths = [
  "C:/PRISM/skills-consolidated/SKILL_INDEX.json",
  "C:/PRISM/mcp-server/data/SKILL_INDEX.json",
  "C:/PRISM/state/SKILL_INDEX.json"
];
for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log("FOUND: " + p);
    const idx = JSON.parse(fs.readFileSync(p, "utf-8"));
    const skills = idx.skills || idx.entries || Object.values(idx);
    let total = 0, withTrig = 0, totalTrig = 0;
    if (Array.isArray(skills)) {
      for (const s of skills) {
        total++;
        const t = s.triggers || s.keywords || [];
        if (t.length > 0) { withTrig++; totalTrig += t.length; }
      }
    } else {
      console.log("Structure: " + typeof skills + ", keys: " + Object.keys(idx).join(", "));
    }
    console.log("Total: " + total + ", With triggers: " + withTrig + " (" + Math.round(withTrig/total*100) + "%)");
    console.log("Total trigger keywords: " + totalTrig);
    break;
  }
}
// Also check consolidated skill count
const skillDir = "C:/PRISM/skills-consolidated";
if (fs.existsSync(skillDir)) {
  const dirs = fs.readdirSync(skillDir).filter(f => fs.statSync(path.join(skillDir, f)).isDirectory());
  console.log("Skill directories: " + dirs.length);
}
