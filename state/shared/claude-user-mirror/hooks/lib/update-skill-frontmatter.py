#!/usr/bin/env python3
"""CCM-MS3: Batch-update skill SKILL.md frontmatter from skill-classification.json.

Usage:
    python update-skill-frontmatter.py [--dry-run]
"""
import json, os, re, sys

CLASSIFICATION_PATH = os.path.join(
    os.path.expanduser("~"), ".claude", "skills", "skill-classification.json"
)
SKILL_DIRS = [
    os.path.join(os.path.expanduser("~"), ".claude", "skills"),
    "C:/PRISM/.claude/worktrees/sharp-jennings/skills-consolidated",
]

DRY_RUN = "--dry-run" in sys.argv
updated = 0
skipped = 0
not_found_list = []


def find_skill_file(skill_name):
    for base_dir in SKILL_DIRS:
        for prefix in ["", "prism-"]:
            path = os.path.join(base_dir, prefix + skill_name, "SKILL.md")
            if os.path.isfile(path):
                return path
    return None


def update_frontmatter(filepath, model, effort, allowed_tools=None, fork_context=False):
    global updated, skipped

    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    if not content.startswith("---"):
        # Prepend frontmatter to files that lack it
        skill_name = os.path.basename(os.path.dirname(filepath))
        fm_lines = ["---", "name: " + skill_name, "model: " + model, "effort: " + effort]
        if allowed_tools:
            fm_lines.append("allowed-tools: " + allowed_tools)
        if fork_context:
            fm_lines.append("fork-context: true")
        fm_lines.append("---")
        fm_lines.append("")
        new_content = chr(10).join(fm_lines) + content
        if DRY_RUN:
            print("  [DRY-RUN] Would prepend FM: " + filepath)
        else:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print("  [ADD] " + filepath + " (model=" + model + ")")
        updated += 1
        return

    # Find closing --- after the opening one
    NL = chr(10)
    m = re.search(NL + "---[ " + chr(9) + "]*" + NL, content[3:])
    if not m:
        m = re.search(NL + "---[ " + chr(9) + "]*$", content[3:])
        if not m:
            print("  [WARN] Malformed frontmatter: " + filepath)
            skipped += 1
            return

    fm_text = content[4 : m.start() + 3]
    body = content[m.end() + 3 :]

    # Filter out fields we will replace
    flines = fm_text.split(NL)
    filtered = []
    skip_cont = False
    for line in flines:
        if skip_cont:
            if line.startswith("  ") or line.startswith(chr(9)):
                continue
            skip_cont = False
        if re.match(r"^(model|effort|allowed-tools|fork-context)\s*:", line):
            skip_cont = True
            continue
        filtered.append(line)

    while filtered and filtered[-1].strip() == "":
        filtered.pop()

    filtered.append("model: " + model)
    filtered.append("effort: " + effort)
    if allowed_tools:
        filtered.append("allowed-tools: " + allowed_tools)
    if fork_context:
        filtered.append("fork-context: true")

    new_content = "---" + NL + NL.join(filtered) + NL + "---" + NL + body

    if DRY_RUN:
        print("  [DRY-RUN] Would update: " + filepath + " (model=" + model + ")")
    else:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("  [OK] " + filepath + " (model=" + model + ")")
    updated += 1


def main():
    global not_found_list
    if not os.path.isfile(CLASSIFICATION_PATH):
        print("ERROR: " + CLASSIFICATION_PATH + " not found")
        sys.exit(1)

    with open(CLASSIFICATION_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    read_only_set = set(data.get("read_only", {}).get("skills", []))
    fork_set = set(data.get("fork_context", {}).get("skills", []))

    print("=== CCM-MS3 Skill Frontmatter Updater ===")
    print("Classification: " + CLASSIFICATION_PATH)
    if DRY_RUN:
        print("MODE: dry-run (no files modified)")
    print()

    for tier_key in ["haiku_tier", "sonnet_tier", "opus_tier"]:
        tier = data[tier_key]
        model = tier["model"]
        effort = tier["effort"]
        skills = tier["skills"]
        print("--- " + tier_key + " (model=" + model + ", effort=" + effort + ", count=" + str(len(skills)) + ") ---")

        for skill_name in skills:
            filepath = find_skill_file(skill_name)
            if filepath is None:
                not_found_list.append(skill_name)
                continue
            at = "Read, Grep, Glob" if skill_name in read_only_set else None
            fc = skill_name in fork_set
            update_frontmatter(filepath, model, effort, at, fc)
        print()

    print("=== Summary ===")
    print("Updated: " + str(updated))
    print("Skipped: " + str(skipped))
    print("Not found: " + str(len(not_found_list)))
    if not_found_list:
        nf = ", ".join(not_found_list[:30])
        print("  Missing: " + nf)
        if len(not_found_list) > 30:
            print("  ... and " + str(len(not_found_list) - 30) + " more")


if __name__ == "__main__":
    main()
