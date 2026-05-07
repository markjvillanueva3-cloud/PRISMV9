#!/usr/bin/env python3
"""
Detect if running in Cowork/Dispatch mode and adjust output accordingly.

Detection signals:
- CLAUDE_COWORK=1 environment variable
- CLAUDE_DISPATCH=1 environment variable
- Session metadata indicating desktop agent mode
- Truncated terminal width suggesting mobile display

When Cowork/Dispatch detected, enforces:
- Compact output (no verbose explanations)
- Status prefix (OK/WARN/FAIL)
- Max 80-char summaries
- No emojis
- Table limits (3 col, 5 row)
"""
import os, json

def detect_mode():
    """Detect current execution mode."""
    mode = {
        "cowork": os.environ.get("CLAUDE_COWORK", "0") == "1",
        "dispatch": os.environ.get("CLAUDE_DISPATCH", "0") == "1",
        "terminal_width": int(os.environ.get("COLUMNS", "120")),
        "is_mobile": False
    }

    # Narrow terminal suggests Dispatch/mobile
    if mode["terminal_width"] < 60:
        mode["is_mobile"] = True
        mode["dispatch"] = True

    mode["compact_output"] = mode["cowork"] or mode["dispatch"] or mode["is_mobile"]
    return mode

def get_output_rules(mode=None):
    """Get output formatting rules based on detected mode."""
    if mode is None:
        mode = detect_mode()

    if mode["compact_output"]:
        return {
            "max_line_length": 80,
            "max_table_cols": 3,
            "max_table_rows": 5,
            "use_status_prefix": True,  # OK/WARN/FAIL
            "use_suffixes": True,       # K/M for numbers
            "verbose_explanations": False,
            "show_file_paths": "basename",  # basename only
            "emojis": False
        }
    else:
        return {
            "max_line_length": 200,
            "max_table_cols": 10,
            "max_table_rows": 50,
            "use_status_prefix": False,
            "use_suffixes": False,
            "verbose_explanations": True,
            "show_file_paths": "full",
            "emojis": False  # User preference
        }

if __name__ == "__main__":
    mode = detect_mode()
    rules = get_output_rules(mode)
    print(json.dumps({"mode": mode, "output_rules": rules}, indent=2))
