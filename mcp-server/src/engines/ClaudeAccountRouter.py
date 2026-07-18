"""
ClaudeAccountRouter
Manages switching between multiple Anthropic accounts to avoid rate limits.
"""

import json
from pathlib import Path
from typing import Dict, Optional

POOL_PATH = Path("H:/prism/state/shared/CLAUDE_ACCOUNT_POOL.json")

def load_pool() -> Dict:
    if not POOL_PATH.exists():
        return {"accounts": [], "current_index": 0}
    return json.loads(POOL_PATH.read_text())

def save_pool(pool: Dict):
    POOL_PATH.write_text(json.dumps(pool, indent=2))

def get_next_account() -> Optional[Dict]:
    pool = load_pool()
    accounts = [a for a in pool.get("accounts", []) if a.get("status") == "active"]
    
    if not accounts:
        return None
    
    idx = pool.get("current_index", 0) % len(accounts)
    account = accounts[idx]
    
    # Move to next account
    pool["current_index"] = (idx + 1) % len(accounts)
    save_pool(pool)
    
    return account

def get_account_by_name(name: str) -> Optional[Dict]:
    pool = load_pool()
    for acc in pool.get("accounts", []):
        if acc.get("name") == name:
            return acc
    return None

def set_account_status(name: str, status: str):
    pool = load_pool()
    for acc in pool.get("accounts", []):
        if acc.get("name") == name:
            acc["status"] = status
    save_pool(pool)

print("ClaudeAccountRouter ready")
