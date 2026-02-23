try {
  require("C:\\PRISM\\mcp-server\\dist\\index.js");
} catch(e) {
  if (e.message && e.message.includes("Invalid regular expression")) {
    require("fs").writeFileSync("C:\\PRISM\\state\\trigger_output.txt", "STILL BROKEN: " + e.message);
  } else {
    require("fs").writeFileSync("C:\\PRISM\\state\\trigger_output.txt", "LOADS OK (other error expected: " + e.message?.substring(0,100) + ")");
  }
}