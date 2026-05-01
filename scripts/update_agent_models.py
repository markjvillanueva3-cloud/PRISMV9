import json, os, glob

AGENTS_DIR = r"C:\PRISM\data\agents"
replacements = {
    "claude-opus-4-20250514": "claude-opus-4-6",
    "claude-sonnet-4-20250514": "claude-sonnet-4-5-20250929",
    "claude-haiku-4-20250514": "claude-haiku-4-5-20251001",
}

updated = 0
for f in glob.glob(os.path.join(AGENTS_DIR, "AGT-*.json")):
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
    if content != original:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        updated += 1
        print(f"UPDATED: {os.path.basename(f)}")

print(f"\nTotal updated: {updated}")
