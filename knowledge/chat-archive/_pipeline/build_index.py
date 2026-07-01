#!/usr/bin/env python3
"""Build Obsidian index/MOC layer over the chat-archive from the ingest manifest.

Outputs (under H:/prism/knowledge/chat-archive/_index):
  00-Chat-Archive-Home.md      master dashboard (counts + Dataview tables)
  MOC-<source>.md              per-tool map-of-content (monthly breakdown + Dataview)
  Plans-and-Roadmaps.md        sessions whose title/content imply plans/roadmaps
  Timeline.md                  month-by-month volume
Idempotent: regenerates all index files each run from the manifest.
"""
import os, sqlite3, datetime, collections, re

VAULT    = "H:/prism/knowledge/chat-archive"
PIPE     = os.path.join(VAULT, "_pipeline")
MANIFEST = os.path.join(PIPE, "manifest.db")
IDX      = os.path.join(VAULT, "_index")
os.makedirs(IDX, exist_ok=True)

PLAN_RE = re.compile(r"\b(plan|roadmap|milestone|phase|architecture|design|spec|strategy|backlog|checklist)\b", re.I)

def fm_title(note):
    """Read the 'title:' from a note's YAML frontmatter (best-effort)."""
    try:
        with open(note, encoding="utf-8", errors="replace") as fh:
            inblock = False
            for i, line in enumerate(fh):
                s = line.rstrip("\n")
                if i == 0 and s.strip() == "---": inblock = True; continue
                if inblock and s.strip() == "---": break
                if inblock:
                    m = re.match(r'title:\s*(.*)$', s)
                    if m: return m.group(1).strip().strip('"')
    except Exception: pass
    return ""

def rows():
    con = sqlite3.connect(MANIFEST)
    return con.execute("SELECT source,note_path,session_id,msg_count,ingested_at,path FROM files WHERE status='ok'").fetchall()

def rel(note):
    note = note.replace("\\", "/")
    i = note.find("/chat-archive/")
    return note[i + len("/chat-archive/"):] if i >= 0 else os.path.basename(note)

def link(note):
    base = os.path.splitext(os.path.basename(note))[0]
    return "[[%s]]" % base

def write(name, text):
    open(os.path.join(IDX, name), "w", encoding="utf-8").write(text)

def main():
    data = rows()
    by_source = collections.Counter()
    msgs_by_source = collections.Counter()
    by_month = collections.Counter()
    plan_notes = []
    for source, note, sid, mc, ing, path in data:
        by_source[source] += 1
        msgs_by_source[source] += (mc or 0)
        # month from note dir
        m = re.search(r"/([0-9]{4}-[0-9]{2})/", note.replace("\\", "/"))
        month = m.group(1) if m else "undated"
        by_month[month] += 1
        ttl = fm_title(note)
        if PLAN_RE.search(ttl) or PLAN_RE.search(os.path.basename(note)):
            plan_notes.append((source, month, note, ttl))

    total = sum(by_source.values()); tmsg = sum(msgs_by_source.values())
    now = datetime.datetime.now().isoformat(timespec="seconds")

    # ---- master home ----
    h = ["---", "type: chat-archive-home", "tags: [chat-archive, MOC, index]", "updated: %s" % now, "---", "",
         "# 🗂️ Chat Archive — Permanent Memory", "",
         "> Unified, permanent archive of every Claude Code CLI, Codex, and Claude Desktop session, ingested into this vault. Generated %s." % now, "",
         "## Totals", "", "| Source | Sessions | Messages |", "|---|---:|---:|"]
    for s in sorted(by_source):
        h.append("| [[MOC-%s]] | %d | %d |" % (s, by_source[s], msgs_by_source[s]))
    h.append("| **TOTAL** | **%d** | **%d** |" % (total, tmsg))
    h += ["", "## Maps of Content", "",
          "- [[MOC-claude-code-cli]]", "- [[MOC-codex]]", "- [[MOC-claude-desktop]]",
          "- [[Plans-and-Roadmaps]]", "- [[Timeline]]", "",
          "## All sessions (Dataview)", "",
          "```dataview", "TABLE source, date, messages, cwd",
          'FROM "chat-archive"', "WHERE type = \"chat-session\"", "SORT date DESC", "LIMIT 200", "```", "",
          "_Requires the Dataview plugin. The table above is live; the counts above are a snapshot._", ""]
    write("00-Chat-Archive-Home.md", "\n".join(h))

    # ---- per-source MOCs ----
    src_month = collections.defaultdict(collections.Counter)
    for source, note, sid, mc, ing, path in data:
        m = re.search(r"/([0-9]{4}-[0-9]{2})/", note.replace("\\", "/"))
        src_month[source][m.group(1) if m else "undated"] += 1
    for s in sorted(by_source):
        body = ["---", "type: chat-archive-moc", "source: %s" % s, "tags: [chat-archive, MOC]", "updated: %s" % now, "---", "",
                "# MOC — %s" % s, "", "Back to [[00-Chat-Archive-Home]].", "",
                "**%d sessions · %d messages**" % (by_source[s], msgs_by_source[s]), "",
                "## By month", "", "| Month | Sessions |", "|---|---:|"]
        for mo in sorted(src_month[s], reverse=True):
            body.append("| %s | %d |" % (mo, src_month[s][mo]))
        body += ["", "## Sessions (Dataview)", "", "```dataview",
                 "TABLE date, messages, user_msgs, assistant_msgs, cwd",
                 'FROM "chat-archive/%s"' % s, "WHERE type = \"chat-session\"", "SORT date DESC", "```", ""]
        write("MOC-%s.md" % s, "\n".join(body))

    # ---- plans & roadmaps ----
    p = ["---", "type: chat-archive-plans", "tags: [chat-archive, plans, roadmap, MOC]", "updated: %s" % now, "---", "",
         "# 🧭 Plans & Roadmaps (across all chats)", "", "Back to [[00-Chat-Archive-Home]].", "",
         "Sessions whose title mentions plan / roadmap / milestone / phase / architecture / design / spec / strategy / backlog.", "",
         "**%d candidate sessions.**" % len(plan_notes), "", "| Source | Month | Title | Session |", "|---|---|---|---|"]
    for source, month, note, ttl in sorted(plan_notes, key=lambda x: x[2], reverse=True):
        p.append("| %s | %s | %s | %s |" % (source, month, (ttl or "")[:60], link(note)))
    p += ["", "## Live (Dataview, title contains plan/roadmap)", "", "```dataview",
          "TABLE source, date, messages",
          'FROM "chat-archive"',
          'WHERE type = "chat-session" AND (econtains(file.name, "plan") OR econtains(file.name, "roadmap") OR econtains(file.name, "milestone"))',
          "SORT date DESC", "```", ""]
    write("Plans-and-Roadmaps.md", "\n".join(p))

    # ---- timeline ----
    t = ["---", "type: chat-archive-timeline", "tags: [chat-archive, timeline]", "updated: %s" % now, "---", "",
         "# 📅 Timeline", "", "Back to [[00-Chat-Archive-Home]].", "", "| Month | Sessions |", "|---|---:|"]
    for mo in sorted(by_month, reverse=True):
        t.append("| %s | %d |" % (mo, by_month[mo]))
    write("Timeline.md", "\n".join(t))

    print("INDEX built: %d sessions, %d sources, %d plan-notes, %d months" % (total, len(by_source), len(plan_notes), len(by_month)))

if __name__ == "__main__":
    main()
