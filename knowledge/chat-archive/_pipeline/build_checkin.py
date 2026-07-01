#!/usr/bin/env python3
"""Generate the ZULU reorientation check-in note from the ingested chat archive.

Reads the manifest + recent notes' frontmatter and writes:
  H:/prism/knowledge/chat-archive/_index/REORIENTATION-<date>.md
A human-readable "where things stand" brief: volume, most-recent activity per tool,
most-active working dirs, and recent plan/roadmap sessions.
"""
import os, sqlite3, datetime, collections, re

VAULT    = "H:/prism/knowledge/chat-archive"
PIPE     = os.path.join(VAULT, "_pipeline")
MANIFEST = os.path.join(PIPE, "manifest.db")
IDX      = os.path.join(VAULT, "_index")

def fm_get(note, keys):
    out = {}
    try:
        with open(note, encoding="utf-8", errors="replace") as fh:
            inblock = False
            for i, line in enumerate(fh):
                line = line.rstrip("\n")
                if i == 0 and line.strip() == "---": inblock = True; continue
                if inblock and line.strip() == "---": break
                if inblock:
                    m = re.match(r"([A-Za-z_]+):\s*(.*)$", line)
                    if m and m.group(1) in keys:
                        out[m.group(1)] = m.group(2).strip().strip('"')
    except Exception: pass
    return out

def main():
    con = sqlite3.connect(MANIFEST)
    rows = con.execute("SELECT source,note_path,session_id,msg_count FROM files WHERE status='ok'").fetchall()
    by_source = collections.Counter(); msgs = collections.Counter()
    cwds = collections.Counter(); recent = collections.defaultdict(list)
    plan_recent = []
    PLAN_RE = re.compile(r"\b(plan|roadmap|milestone|phase|architecture|design|spec|strategy|backlog)\b", re.I)
    for source, note, sid, mc in rows:
        by_source[source] += 1; msgs[source] += (mc or 0)
        meta = fm_get(note, {"date", "cwd", "title", "last_ts"})
        d = meta.get("date", ""); cwd = meta.get("cwd", "")
        if cwd: cwds[cwd] += 1
        recent[source].append((d, meta.get("title", os.path.basename(note)), note))
        if PLAN_RE.search(os.path.basename(note)):
            plan_recent.append((d, source, meta.get("title", ""), note))
    now = datetime.datetime.now()
    out = ["---", "type: reorientation-checkin", "tags: [chat-archive, reorientation, zulu]",
           "date: %s" % now.date().isoformat(), "generated: %s" % now.isoformat(timespec="seconds"), "---", "",
           "# 🧭 ZULU Reorientation Check-in — %s" % now.date().isoformat(), "",
           "Generated from the permanent chat archive. Back to [[00-Chat-Archive-Home]].", "",
           "## Corpus at a glance", "", "| Source | Sessions | Messages |", "|---|---:|---:|"]
    for s in sorted(by_source):
        out.append("| %s | %d | %d |" % (s, by_source[s], msgs[s]))
    out.append("| **TOTAL** | **%d** | **%d** |" % (sum(by_source.values()), sum(msgs.values())))
    out += ["", "## Most-active working directories", "", "| Working dir | Sessions |", "|---|---:|"]
    for cwd, n in cwds.most_common(15):
        out.append("| `%s` | %d |" % (cwd, n))
    out += ["", "## Most recent sessions per tool", ""]
    for s in sorted(recent):
        out.append("### %s" % s)
        for d, title, note in sorted(recent[s], reverse=True)[:8]:
            base = os.path.splitext(os.path.basename(note))[0]
            out.append("- %s — [[%s|%s]]" % (d, base, (title or base)[:70]))
        out.append("")
    out += ["## Recent plans & roadmaps", ""]
    for d, source, title, note in sorted(plan_recent, reverse=True)[:20]:
        base = os.path.splitext(os.path.basename(note))[0]
        out.append("- %s (%s) — [[%s|%s]]" % (d, source, base, (title or base)[:70]))
    out += ["", "---", "_See [[Plans-and-Roadmaps]] and [[Timeline]] for the full breakdown._"]
    os.makedirs(IDX, exist_ok=True)
    dest = os.path.join(IDX, "REORIENTATION-%s.md" % now.date().isoformat())
    open(dest, "w", encoding="utf-8").write("\n".join(out))
    print("CHECK-IN written:", dest, "| sessions:", sum(by_source.values()))

if __name__ == "__main__":
    main()
