const fs = require("fs");
const file = "C:\\PRISM\\mcp-server\\src\\tools\\autoHookWrapper.ts";
let content = fs.readFileSync(file, "utf-8");

// Fix the invalid regex: \s*??\s*CURRENT -> \s*(?:\u2190|\?\?)\s*CURRENT
const old = '.replace(/\\s*??\\s*CURRENT$/i, "")';
const fixed = '.replace(/\\s*(?:\\u2190|\\?\\?)\\s*CURRENT$/i, "")';

if (content.includes(old)) {
  content = content.replace(old, fixed);
  fs.writeFileSync(file, content);
  fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", "FIXED: regex escaped");
} else {
  fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", "Pattern not found - checking...\n" + 
    content.substring(content.indexOf("CURRENT$") - 80, content.indexOf("CURRENT$") + 30));
}