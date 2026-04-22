const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const logDir = "C:\\PRISM\\state\\logs";
fs.mkdirSync(logDir, { recursive: true });

const out = fs.openSync(path.join(logDir, "backend-http-direct.log"), "a");
const err = fs.openSync(path.join(logDir, "backend-http-direct.err.log"), "a");

const child = spawn(
  "C:\\Program Files\\nodejs\\node.exe",
  ["C:\\PRISM\\mcp-server\\node_modules\\tsx\\dist\\cli.mjs", "C:\\PRISM\\mcp-server\\src\\index.ts"],
  {
    cwd: "C:\\PRISM\\mcp-server",
    detached: true,
    stdio: ["ignore", out, err],
    env: {
      ...process.env,
      TRANSPORT: "http",
      PORT: "3000",
      PRISM_BIND_HOST: "127.0.0.1",
      SystemRoot: "C:\\Windows",
      windir: "C:\\Windows",
      ComSpec: "C:\\Windows\\System32\\cmd.exe",
      PATHEXT: ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL",
    },
  }
);

child.unref();
console.log(`started_pid=${child.pid}`);
