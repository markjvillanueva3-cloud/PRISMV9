const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const logDir = "C:\\PRISM\\state\\logs";
fs.mkdirSync(logDir, { recursive: true });

const out = fs.openSync(path.join(logDir, "web-dev-direct.log"), "a");
const err = fs.openSync(path.join(logDir, "web-dev-direct.err.log"), "a");

const child = spawn(
  "C:\\Program Files\\nodejs\\npm.cmd",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", "3100"],
  {
    cwd: "C:\\PRISM\\mcp-server\\web",
    detached: true,
    stdio: ["ignore", out, err],
    env: {
      ...process.env,
      SystemRoot: "C:\\Windows",
      windir: "C:\\Windows",
      ComSpec: "C:\\Windows\\System32\\cmd.exe",
      PATHEXT: ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL",
    },
  }
);

child.unref();
console.log(`started_pid=${child.pid}`);
