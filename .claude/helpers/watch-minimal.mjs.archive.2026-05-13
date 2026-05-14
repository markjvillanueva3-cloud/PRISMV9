#!/usr/bin/env node
// Minimal persistent emitter — proves Monitor persistence + diagnoses death cause
process.stdout.write(`[${new Date().toISOString().slice(11,19)}Z] minimal armed pid=${process.pid}\n`);

let ticks = 0;
const interval = setInterval(() => {
  ticks += 1;
  process.stdout.write(`[${new Date().toISOString().slice(11,19)}Z] tick ${ticks} pid=${process.pid}\n`);
}, 30000);

process.on("SIGINT", () => { process.stdout.write("[sigint] bye\n"); process.exit(0); });
process.on("SIGTERM", () => { process.stdout.write("[sigterm] bye\n"); process.exit(0); });
process.on("SIGHUP", () => { process.stdout.write("[sighup] bye\n"); process.exit(0); });
process.on("SIGBREAK", () => { process.stdout.write("[sigbreak] bye\n"); process.exit(0); });
process.on("disconnect", () => { process.stdout.write("[disconnect] bye\n"); process.exit(0); });
process.on("exit", (code) => { process.stderr.write(`[exit] code=${code} ticks=${ticks}\n`); });
