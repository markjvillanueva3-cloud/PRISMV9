process.env.TRANSPORT = process.env.TRANSPORT || "http";
process.env.PORT = process.env.PORT || "3000";
process.env.HOST = process.env.HOST || "127.0.0.1";

await import("../dist/index.js");
