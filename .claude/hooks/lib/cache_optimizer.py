#!/usr/bin/env python3
"""Cache TTL auto-tuning using gradient descent on P(stale) target."""
import json, os, math

STATS_FILE = os.path.expanduser("~/.prism/coordination-stats.json")
CACHE_CONFIG_FILE = os.path.expanduser("~/.prism/cache-config.json")


def load_cache_config():
    if os.path.exists(CACHE_CONFIG_FILE):
        with open(CACHE_CONFIG_FILE) as f:
            return json.load(f)
    return {
        "caches": {
            "ActionSchemaCache": {"ttl_ms": 120000, "target_stale_rate": 0.01},
            "DispatcherMap": {"ttl_ms": 60000, "target_stale_rate": 0.01},
            "EngineRegistry": {"ttl_ms": 300000, "target_stale_rate": 0.01},
            "GenericCache": {"ttl_ms": 3600000, "target_stale_rate": 0.05},
        }
    }


def optimize_ttls():
    """Adjust TTLs based on observed stale rates."""
    config = load_cache_config()
    stats = {}
    if os.path.exists(STATS_FILE):
        with open(STATS_FILE) as f:
            stats = json.load(f)

    cache_stats = stats.get("cache_stats", {})
    adjustments = []

    for cache_name, cache_config in config["caches"].items():
        cs = cache_stats.get(cache_name, {})
        hits = cs.get("hits", 0)
        stale = cs.get("stale", 0)
        misses = cs.get("misses", 0)
        total = hits + misses

        if total < 10:
            continue

        observed_stale_rate = stale / max(1, hits)
        target = cache_config["target_stale_rate"]
        current_ttl = cache_config["ttl_ms"]

        if observed_stale_rate > target * 1.5:
            new_ttl = max(10000, int(current_ttl * 0.8))
            adjustments.append({
                "cache": cache_name,
                "old_ttl_ms": current_ttl,
                "new_ttl_ms": new_ttl,
                "reason": f"stale rate {observed_stale_rate:.4f} > target {target}"
            })
            cache_config["ttl_ms"] = new_ttl
        elif observed_stale_rate < target * 0.2 and hits > 50:
            new_ttl = min(7200000, int(current_ttl * 1.1))
            adjustments.append({
                "cache": cache_name,
                "old_ttl_ms": current_ttl,
                "new_ttl_ms": new_ttl,
                "reason": f"stale rate {observed_stale_rate:.4f} well below target {target}"
            })
            cache_config["ttl_ms"] = new_ttl

    os.makedirs(os.path.dirname(CACHE_CONFIG_FILE), exist_ok=True)
    with open(CACHE_CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

    return {"adjustments": adjustments, "config": config}


if __name__ == "__main__":
    result = optimize_ttls()
    print(json.dumps(result, indent=2))
