#!/usr/bin/env python3
"""Chat-archive ingestion -> Obsidian vault (permanent memory). Resumable, idempotent.

Sources:
  claude-code-cli : H:/.claude/projects/**/*.jsonl
  codex           : C:/Users/wompu/.codex/sessions/**/*.jsonl
  claude-desktop  : C:/Users/wompu/AppData/Roaming/Claude/claude-code-sessions/**/*.json

Each session -> one markdown note (YAML frontmatter + capped transcript) under
H:/prism/knowledge/chat-archive/<source>/<YYYY-MM>/.  A SQLite manifest makes re-runs
skip unchanged files (idempotent / resumable).
"""
import os, sys, re, json, sqlite3, hashlib, argparse, datetime, traceback
import glob as glob_module

VAULT    = "H:/prism/knowledge/chat-archive"
PIPE     = os.path.join(VAULT, "_pipeline")
MANIFEST = os.path.join(PIPE, "manifest.db")
MAX_MSGS_FULL  = 40
MAX_BODY_CHARS = 2000
MAX_TOOL_CHARS = 400

SOURCES = {
    "claude-code-cli": {"root": "H:/.claude/projects", "glob": ".jsonl"},
    "codex":           {"root": "C:/Users/wompu/.codex/sessions", "glob": ".jsonl"},
    "claude-desktop":  {"root": "C:/Users/wompu/AppData/Roaming/Claude/claude-code-sessions", "glob": ".json"},
}

def db():
    con = sqlite3.connect(MANIFEST)
    con.execute("CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, source TEXT, mtime REAL, size INTEGER, note_path TEXT, session_id TEXT, msg_count INTEGER, status TEXT, ingested_at TEXT, err TEXT)")
    con.commit(); return con

def walk(root, ext):
    if not os.path.isdir(root): return
    for dp, _, fns in os.walk(root):
        for fn in fns:
            if fn.endswith(ext): yield os.path.join(dp, fn)

def clean_text(t):
    """Strip CC slash-command XML wrappers and caveat noise for readable titles/bodies."""
    if not t: return ""
    t = re.sub(r"<command-(name|message|args)>(.*?)</command-\1>", r"\2", t, flags=re.S)
    t = re.sub(r"</?(command-[a-z]+|local-command-[a-z]+)>", "", t)
    t = re.sub(r"<[^>]{1,40}>", "", t)  # leftover short tags only
    return t.strip()

WRAPPER_RE = re.compile(r"^\s*<(environment_context|user_instructions|permissions|system)", re.I)

def first_user_title(msgs):
    fallback = None
    for m in msgs:
        if m["role"] != "user":
            continue
        raw = m["text"]
        if WRAPPER_RE.match(raw):
            continue  # skip env/permission wrapper blocks
        c = re.sub(r"\s+", " ", clean_text(raw)).strip()
        c = re.sub(r"^<[a-z_]+>\s*", "", c)  # strip a leading bare tag if any
        if c:
            if fallback is None:
                fallback = c[:80]
            # prefer a line that looks like a real instruction (has letters + space)
            if len(c) > 8:
                return c[:80]
    return fallback

def safe(s, n=80):
    s = re.sub(r"[^A-Za-z0-9._ -]", "_", str(s)).strip().strip(".")
    return (s or "untitled")[:n]

def trunc(t, n):
    t = "" if t is None else str(t)
    return t if len(t) <= n else t[:n] + ("\n... [+%d chars truncated]" % (len(t) - n))

def yaml_block(d):
    out = ["---"]
    for k, v in d.items():
        if isinstance(v, list):
            out.append("%s:" % k)
            for x in v: out.append("  - " + json.dumps(x, ensure_ascii=False))
        else:
            out.append("%s: %s" % (k, json.dumps(v, ensure_ascii=False)))
    out.append("---"); return "\n".join(out)

def parse_ccli(path):
    meta = {"cwd": None, "session_id": None, "title": None, "first_ts": None, "last_ts": None}
    msgs = []
    for line in open(path, encoding="utf-8", errors="replace"):
        line = line.strip()
        if not line: continue
        try: o = json.loads(line)
        except Exception: continue
        if not isinstance(o, dict): continue
        t = o.get("type")
        if o.get("sessionId") and not meta["session_id"]: meta["session_id"] = o["sessionId"]
        if o.get("cwd"): meta["cwd"] = o["cwd"]
        if t == "ai-title" and o.get("title") and not meta["title"]: meta["title"] = o["title"]
        ts = o.get("timestamp")
        if ts:
            meta["first_ts"] = meta["first_ts"] or ts; meta["last_ts"] = ts
        if t in ("user", "assistant"):
            m = o.get("message", {})
            if not isinstance(m, dict): continue
            role = m.get("role", t); cont = m.get("content"); text = ""
            if isinstance(cont, str): text = cont
            elif isinstance(cont, list):
                parts = []
                for b in cont:
                    if not isinstance(b, dict): continue
                    bt = b.get("type")
                    if bt == "text": parts.append(b.get("text", ""))
                    elif bt == "tool_use": parts.append("[tool_use: %s]" % b.get("name"))
                    elif bt == "tool_result":
                        c = b.get("content")
                        parts.append("[tool_result] " + trunc(c if isinstance(c, str) else json.dumps(c), MAX_TOOL_CHARS))
                text = "\n".join(p for p in parts if p)
            if text.startswith("<local-command-caveat>"): continue
            if text.strip(): msgs.append({"role": role, "text": text, "ts": ts, "kind": t})
    return meta, msgs

def parse_codex(path):
    meta = {"cwd": None, "session_id": None, "title": None, "first_ts": None, "last_ts": None, "model": None}
    msgs = []
    for line in open(path, encoding="utf-8", errors="replace"):
        line = line.strip()
        if not line: continue
        try: o = json.loads(line)
        except Exception: continue
        if not isinstance(o, dict): continue
        t = o.get("type"); p = o.get("payload", {})
        if not isinstance(p, dict): p = {}
        ts = o.get("timestamp")
        if ts:
            meta["first_ts"] = meta["first_ts"] or ts; meta["last_ts"] = ts
        if t == "session_meta":
            meta["session_id"] = p.get("id"); meta["cwd"] = p.get("cwd"); meta["model"] = p.get("model_provider")
        elif t == "response_item" and p.get("type") == "message":
            role = p.get("role", "?")
            if role in ("system", "developer"): continue
            cont = p.get("content"); parts = []
            if isinstance(cont, list):
                for b in cont:
                    if isinstance(b, dict) and b.get("type") in ("input_text", "output_text", "text"):
                        parts.append(b.get("text", ""))
            text = "\n".join(x for x in parts if x)
            if text.strip(): msgs.append({"role": role, "text": text, "ts": ts, "kind": "message"})
        elif t == "event_msg" and p.get("type") == "agent_message":
            text = p.get("message", "")
            if text.strip(): msgs.append({"role": "assistant", "text": text, "ts": ts, "kind": "agent_message"})
        elif t == "event_msg" and p.get("type") == "user_message":
            text = p.get("message", "")
            if text and not text.startswith("<") and text.strip():
                msgs.append({"role": "user", "text": text, "ts": ts, "kind": "user_message"})
    return meta, msgs

def _epoch_to_iso(v):
    """Claude Desktop stores ms-epoch ints. Convert to ISO; pass ISO strings through."""
    if v is None: return None
    if isinstance(v, str):
        return v if v else None
    try:
        n = float(v)
        if n > 1e11: n /= 1000.0  # ms -> s
        return datetime.datetime.fromtimestamp(n).isoformat(timespec="seconds")
    except Exception:
        return None

def _cli_transcript_for(cli_session_id):
    """Resolve a desktop session's cliSessionId to the already-ingested CLI .jsonl, if present."""
    if not cli_session_id: return None
    try:
        hits = glob_module.glob("H:/.claude/projects/**/%s.jsonl" % cli_session_id, recursive=True)
        return hits[0].replace("\\", "/") if hits else None
    except Exception:
        return None

def parse_desktop(path):
    """Claude Desktop `local_*.json` files are session-METADATA records (no inline message
    array): title, model, effort, ultracode flag, plan path, MCP servers, completedTurns, cwd.
    The full transcript (when one exists) lives in H:/.claude/projects/<proj>/<cliSessionId>.jsonl
    (ingested under the claude-code-cli source). Emit a metadata-rich note that captures the
    desktop-only signal AND backlinks to the full transcript -- never silently drop it as 'empty'."""
    meta = {"cwd": None, "session_id": None, "title": None, "first_ts": None, "last_ts": None}
    msgs = []
    try: o = json.load(open(path, encoding="utf-8", errors="replace"))
    except Exception: return meta, msgs

    # Legacy shape: a real inline messages array (kept for forward-compat with any export format).
    if isinstance(o, dict) and isinstance(o.get("messages"), list) and o["messages"]:
        meta["session_id"] = o.get("id") or o.get("sessionId") or os.path.splitext(os.path.basename(path))[0]
        meta["title"] = o.get("title")
        meta["cwd"] = o.get("cwd")
        for m in o["messages"]:
            if not isinstance(m, dict): continue
            role = m.get("role", "?"); cont = m.get("content"); ts = _epoch_to_iso(m.get("timestamp") or m.get("created_at"))
            if ts:
                meta["first_ts"] = meta["first_ts"] or ts; meta["last_ts"] = ts
            text = ""
            if isinstance(cont, str): text = cont
            elif isinstance(cont, list):
                text = "\n".join(b.get("text", "") for b in cont if isinstance(b, dict) and b.get("type") == "text")
            if text.strip(): msgs.append({"role": role, "text": text, "ts": ts, "kind": "message"})
        return meta, msgs

    if not isinstance(o, dict): return meta, msgs

    # Metadata-record shape (the real Claude Desktop on this box).
    meta["session_id"] = o.get("sessionId") or o.get("id") or os.path.splitext(os.path.basename(path))[0]
    meta["title"] = o.get("title")
    meta["cwd"] = o.get("cwd") or o.get("originCwd")
    created = _epoch_to_iso(o.get("createdAt"))
    last = _epoch_to_iso(o.get("lastActivityAt") or o.get("lastFocusedAt"))
    meta["first_ts"] = created or last
    meta["last_ts"] = last or created

    cli_id = o.get("cliSessionId")
    cli_path = _cli_transcript_for(cli_id)
    mcp_servers = []
    rms = o.get("remoteMcpServersConfig")
    if isinstance(rms, list):
        for s in rms:
            if isinstance(s, dict) and s.get("name"): mcp_servers.append(s["name"])
    local_tools = set()
    em = o.get("enabledMcpTools")
    if isinstance(em, dict):
        for k in em.keys():
            if isinstance(k, str) and k.startswith("local:prism:"): local_tools.add(k.split(":", 2)[-1])

    lines = []
    lines.append("**Claude Desktop session metadata record.** The desktop app stores per-session")
    lines.append("settings here; the conversation transcript (if captured) lives in the CLI store.")
    lines.append("")
    if o.get("model"):   lines.append("- **model:** %s" % o["model"])
    if o.get("effort"):  lines.append("- **effort:** %s" % o["effort"])
    ss = o.get("sessionSettings")
    if isinstance(ss, dict) and ss.get("ultracode"): lines.append("- **ultracode:** enabled (dynamic-workflow harness)")
    if o.get("permissionMode"): lines.append("- **permissionMode:** %s" % o["permissionMode"])
    if o.get("completedTurns") is not None: lines.append("- **completedTurns:** %s" % o["completedTurns"])
    if o.get("contextExceededCount"): lines.append("- **contextExceededCount:** %s" % o["contextExceededCount"])
    if o.get("planPath"): lines.append("- **planPath:** `%s`" % o["planPath"])
    if meta["cwd"]: lines.append("- **cwd:** `%s`" % meta["cwd"])
    if mcp_servers: lines.append("- **remote MCP servers:** %s" % ", ".join(sorted(set(mcp_servers))))
    if local_tools: lines.append("- **prism MCP tools enabled:** %s" % ", ".join(sorted(local_tools)))
    if cli_id:
        lines.append("- **cliSessionId:** `%s`" % cli_id)
        if cli_path:
            lines.append("- **full transcript (ingested):** `%s`" % cli_path)
        else:
            lines.append("- **full transcript:** not found in CLI store (metadata-only session)")
    lines.append("")
    lines.append("> This note preserves the desktop-only signal (model/effort/ultracode/plan/MCP "
                 "surface). For the conversation itself, open the linked CLI transcript.")

    msgs.append({"role": "session-metadata", "text": "\n".join(lines),
                 "ts": meta["first_ts"], "kind": "desktop-meta"})
    return meta, msgs

PARSERS = {"claude-code-cli": parse_ccli, "codex": parse_codex, "claude-desktop": parse_desktop}

def render(source, raw_path, meta, msgs):
    sid = meta.get("session_id") or hashlib.md5(raw_path.encode()).hexdigest()[:12]
    first = meta.get("first_ts") or ""
    day = first[:10] if first else datetime.date.fromtimestamp(os.path.getmtime(raw_path)).isoformat()
    nuser = sum(1 for m in msgs if m["role"] == "user")
    nasst = sum(1 for m in msgs if m["role"] == "assistant")
    title = meta.get("title")
    if not title:
        title = first_user_title(msgs)
    title = title or ("%s session %s" % (source, sid[:8]))
    fm = {"type": "chat-session", "source": source, "session_id": sid, "title": title, "date": day,
          "first_ts": first, "last_ts": meta.get("last_ts") or "", "cwd": meta.get("cwd") or "",
          "messages": len(msgs), "user_msgs": nuser, "assistant_msgs": nasst,
          "raw_file": raw_path.replace("\\", "/"), "tags": ["chat-archive", source],
          "ingested": datetime.datetime.now().isoformat(timespec="seconds")}
    hdr = "> **%s** | %s | %d msgs (%d user / %d assistant) | cwd: %s" % (source, day, len(msgs), nuser, nasst, meta.get("cwd") or "")
    lines = [yaml_block(fm), "", "# " + title, "", hdr, "> Raw: `%s`" % fm["raw_file"], "", "## Transcript", ""]
    if len(msgs) <= 2 * MAX_MSGS_FULL:
        keep = msgs
    else:
        gap = {"role": "system", "text": "... [%d middle messages omitted -- see raw_file] ..." % (len(msgs) - 2 * MAX_MSGS_FULL), "ts": None, "kind": "elision"}
        keep = msgs[:MAX_MSGS_FULL] + [gap] + msgs[-MAX_MSGS_FULL:]
    for m in keep:
        who = {"user": "User", "assistant": "Assistant"}.get(m["role"], m["role"])
        ts = (" | " + m["ts"]) if m.get("ts") else ""
        lines.append("### %s%s" % (who, ts)); lines.append(""); lines.append(trunc(m["text"], MAX_BODY_CHARS)); lines.append("")
    out_dir = os.path.join(VAULT, source, day[:7] if len(day) >= 7 else "undated")
    os.makedirs(out_dir, exist_ok=True)
    # Stable filename (date + session id only) so re-ingestion OVERWRITES in place
    # instead of orphaning a renamed copy when title logic improves. Title lives in
    # frontmatter + H1, not the filename.
    note = os.path.join(out_dir, "%s--%s.md" % (day, safe(sid, 24)))
    open(note, "w", encoding="utf-8").write("\n".join(lines))
    return note, sid, len(msgs)

def ingest(sources, limit=None, since=None, force=False):
    con = db(); cur = con.cursor()
    done = {r[0]: (r[1], r[2]) for r in cur.execute("SELECT path,mtime,size FROM files WHERE status='ok'")}
    n_ok = n_skip = n_err = 0
    for source in sources:
        cfg = SOURCES[source]; parser = PARSERS[source]
        for path in walk(cfg["root"], cfg["glob"]):
            try: st = os.stat(path)
            except Exception: continue
            if since and datetime.date.fromtimestamp(st.st_mtime).isoformat() < since: continue
            if (not force) and path in done and abs(done[path][0] - st.st_mtime) < 1 and done[path][1] == st.st_size:
                n_skip += 1; continue
            try:
                meta, msgs = parser(path)
                if not msgs:
                    cur.execute("REPLACE INTO files VALUES(?,?,?,?,?,?,?,?,?,?)", (path, source, st.st_mtime, st.st_size, "", meta.get("session_id") or "", 0, "empty", datetime.datetime.now().isoformat(), "")); con.commit(); continue
                note, sid, mc = render(source, path, meta, msgs)
                cur.execute("REPLACE INTO files VALUES(?,?,?,?,?,?,?,?,?,?)", (path, source, st.st_mtime, st.st_size, note, sid, mc, "ok", datetime.datetime.now().isoformat(), "")); con.commit()
                n_ok += 1
                if n_ok % 200 == 0: print("[%s] %d ok / %d skip / %d err ..." % (source, n_ok, n_skip, n_err), flush=True)
            except Exception:
                n_err += 1
                cur.execute("REPLACE INTO files VALUES(?,?,?,?,?,?,?,?,?,?)", (path, source, st.st_mtime, st.st_size, "", "", 0, "error", datetime.datetime.now().isoformat(), trunc(traceback.format_exc(), 500))); con.commit()
            if limit and n_ok >= limit: break
        if limit and n_ok >= limit: break
    print("DONE sources=%s ok=%d skip=%d err=%d" % (sources, n_ok, n_skip, n_err), flush=True)
    return n_ok, n_skip, n_err

def stats():
    con = db()
    for (src,) in con.execute("SELECT DISTINCT source FROM files"):
        rows = con.execute("SELECT status,count(*),coalesce(sum(msg_count),0) FROM files WHERE source=? GROUP BY status", (src,)).fetchall()
        print(src, {s: (c, m) for s, c, m in rows})
    tot = con.execute("SELECT count(*),coalesce(sum(msg_count),0) FROM files WHERE status='ok'").fetchone()
    print("TOTAL ok-notes=%d total-messages=%d" % (tot[0], tot[1]))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="all")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--since")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args()
    os.makedirs(PIPE, exist_ok=True)
    if a.stats: stats(); sys.exit(0)
    srcs = list(SOURCES) if a.source == "all" else [s for s in a.source.split(",") if s in SOURCES]
    ingest(srcs, a.limit, a.since, a.force)
