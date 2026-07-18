import json, os, glob
roots = {
  "claude-code-sessions": "C:/Users/wompu/AppData/Roaming/Claude/claude-code-sessions",
  "local-agent-mode": "C:/Users/wompu/AppData/Roaming/Claude/local-agent-mode-sessions",
}
for label, root in roots.items():
    files = glob.glob(root + "/**/*.json", recursive=True)
    print("\n==== %s : %d json files ====" % (label, len(files)))
    cand = sorted(files, key=lambda p: -os.path.getsize(p))[:3]
    for f in cand:
        sz = os.path.getsize(f)
        print("\n--- %s (%d bytes) ---" % (os.path.basename(f), sz))
        try:
            o = json.load(open(f, encoding="utf-8", errors="replace"))
        except Exception as e:
            print("  parse err:", e); continue
        print("  toplevel type:", type(o).__name__)
        if isinstance(o, dict):
            for k in list(o.keys())[:25]:
                v = o[k]
                desc = ("len=%d" % len(v)) if isinstance(v,(list,dict,str)) else repr(v)[:50]
                print("   key:", k, "->", type(v).__name__, desc)
            for k,v in o.items():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    print("   ARRAY '%s' item0 keys:" % k, list(v[0].keys())[:15])
        elif isinstance(o, list):
            print("  list len", len(o))
            if o and isinstance(o[0], dict):
                print("  item0 keys:", list(o[0].keys())[:15])
