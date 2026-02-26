const fs = require("fs");
const c = fs.readFileSync("C:\\PRISM\\mcp-server\\src\\tools\\autoHookWrapper.ts", "utf-8");
const lines = c.split("\n");

// Find the function that contains the NL hook callsite
// Look for the wrapping function signature near the callsite
for (let i = 1470; i < 1490; i++) {
  if (lines[i] && (lines[i].includes("autoNLHookEvaluator") || lines[i].includes("callNum"))) {
    console.log(`L${i+1}: ${lines[i].trimEnd()}`);
  }
}

// Now find the outer function signature - search backwards from line 1476
for (let i = 1475; i >= 0; i--) {
  if (lines[i] && (lines[i].includes("async function") || lines[i].includes("export async") || lines[i].includes("const wrapped"))) {
    console.log(`\nFUNC at L${i+1}: ${lines[i].trimEnd()}`);
    // Show next few lines for params
    for (let j = i; j < i+5; j++) {
      console.log(`  L${j+1}: ${lines[j].trimEnd()}`);
    }
    break;
  }
}

// Find what variable 'action' maps to - search for action2 or actionName
for (let i = 1470; i < 1500; i++) {
  if (lines[i] && (lines[i].includes("action2") || lines[i].includes("action,") || lines[i].includes("actionName"))) {
    console.log(`ACTION_REF L${i+1}: ${lines[i].trimEnd()}`);
  }
}