try {
  const res = await fetch("http://127.0.0.1:3100/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/list", params:{} })
  });
  console.log("STATUS", res.status);
  const t = await res.text();
  console.log("UP:", t.slice(0,120));
} catch(e) { console.log("DOWN:", e.cause?.code || e.message); }
