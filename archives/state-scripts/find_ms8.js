const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/data/docs/roadmap/PHASE_R1_REGISTRY.md", "utf-8");
const lines = c.split("\n");
let ms8Start = -1, ms8End = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/##.*MS[- ]?8/) || lines[i].match(/MS8.*Formula/i) || lines[i].match(/MS8.*Alarm/i)) {
    ms8Start = i;
  }
  if (ms8Start >= 0 && ms8End < 0 && i > ms8Start + 5 && (lines[i].match(/##.*MS[- ]?9/) || lines[i].match(/##.*MS[- ]?10/))) {
    ms8End = i;
  }
}
// Also find alarm-related sections
let alarmLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase().includes("alarm") && !lines[i].includes("<!--")) {
    alarmLines.push("L" + (i+1) + ": " + lines[i].trim());
  }
}
console.log("MS8 at lines: " + (ms8Start+1) + " to " + (ms8End > 0 ? ms8End+1 : "?"));
if (ms8Start >= 0) {
  const end = ms8End > 0 ? ms8End : Math.min(ms8Start + 80, lines.length);
  console.log("\n" + lines.slice(ms8Start, end).join("\n"));
}
if (alarmLines.length > 0) {
  console.log("\nALARM REFS:");
  alarmLines.slice(0, 10).forEach(l => console.log(l));
}
