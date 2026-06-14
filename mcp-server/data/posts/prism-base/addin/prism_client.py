"""
prism_client.py - reference PRISM post-data client (Tier-2 add-in core, slot:echo).

Implements the platform-agnostic CONTRACT.md: live MCP bridge (127.0.0.1:3100/mcp,
JSON-RPC tools/call) with cache-sidecar fallback. Pure stdlib so it runs inside Fusion's
Python (adsk) and headless. The C# Mastercam/hyperMILL adapters reimplement THIS contract.

The HTTP transport is injectable (`http=`) so the whole live+cache+fallback algorithm is
unit-tested without a network (see prism_client_test.py). Fail-soft by design: a request
that can be served neither live nor from cache raises PrismUnavailable, and the add-in
falls back to the operator's manual Tier-1 entry (never a silent guessed number).
"""

import json
import time
import hashlib
import os
import tempfile

DEFAULT_BRIDGE = os.environ.get("MCP_HTTP_URL", "http://127.0.0.1:3100/mcp")
SCHEMA_VERSION = "1.0.0"
DEFAULT_T_READY = 1.5
DEFAULT_T_CALL = 8.0
DEFAULT_MAX_STALE_S = 24 * 3600


class PrismUnavailable(Exception):
    """Raised when a request can be served neither live nor from cache."""


def canonical_json(obj):
    """Stable JSON for hashing (sorted keys, no whitespace)."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))


def request_key(action, payload):
    return hashlib.sha256((str(action) + "|" + canonical_json(payload or {})).encode("utf-8")).hexdigest()


def _default_http(method, url, body, timeout):
    """Real transport (urllib). Returns (status:int, text:str). Never raises for HTTP
    status; raises only on connection/timeout failure (caller treats as live-down)."""
    import urllib.request
    import urllib.error
    data = body.encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode(), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, (e.read().decode("utf-8", "replace") if hasattr(e, "read") else "")


class PrismPostClient(object):
    def __init__(self, bridge_url=DEFAULT_BRIDGE, cache_path=None, http=None, now=None,
                 t_ready=DEFAULT_T_READY, t_call=DEFAULT_T_CALL, max_stale_s=DEFAULT_MAX_STALE_S):
        self.bridge_url = bridge_url
        self.ready_url = bridge_url.rsplit("/mcp", 1)[0] + "/ready"
        self.cache_path = cache_path
        self._http = http or _default_http
        self._now = now or time.time
        self.t_ready = t_ready
        self.t_call = t_call
        self.max_stale_s = max_stale_s
        self._rpc_id = 0

    # ── readiness ──
    def ready(self):
        try:
            status, _ = self._http("GET", self.ready_url, None, self.t_ready)
            return 200 <= int(status) < 300
        except Exception:
            return False

    # ── MCP envelope parsing ──
    @staticmethod
    def _parse_mcp(text):
        env = json.loads(text)
        if isinstance(env, dict) and env.get("error"):
            raise ValueError("mcp error: " + str(env["error"]))
        result = (env or {}).get("result", env)
        if isinstance(result, dict) and "structuredContent" in result and result["structuredContent"] is not None:
            return result["structuredContent"]
        content = (result or {}).get("content") if isinstance(result, dict) else None
        if isinstance(content, list) and content and isinstance(content[0], dict) and "text" in content[0]:
            txt = content[0]["text"]
            try:
                return json.loads(txt)
            except (ValueError, TypeError):
                return {"text": txt}
        return result

    def _live(self, dispatcher, action, payload):
        self._rpc_id += 1
        body = canonical_json({
            "jsonrpc": "2.0", "id": self._rpc_id, "method": "tools/call",
            "params": {"name": dispatcher, "arguments": dict(payload or {}, action=action)},
        })
        status, text = self._http("POST", self.bridge_url, body, self.t_call)
        if not (200 <= int(status) < 300):
            raise ValueError("bridge HTTP " + str(status))
        return self._parse_mcp(text)

    # ── cache sidecar ──
    def _load_cache(self):
        if not self.cache_path or not os.path.exists(self.cache_path):
            return {"schemaVersion": SCHEMA_VERSION, "entries": {}, "tools": {}, "operations": {}}
        try:
            with open(self.cache_path, "r", encoding="utf-8") as f:
                c = json.load(f)
            c.setdefault("entries", {}); c.setdefault("tools", {}); c.setdefault("operations", {})
            return c
        except (ValueError, OSError):
            return {"schemaVersion": SCHEMA_VERSION, "entries": {}, "tools": {}, "operations": {}}

    def _save_cache(self, cache):
        if not self.cache_path:
            return
        cache["schemaVersion"] = SCHEMA_VERSION
        d = os.path.dirname(os.path.abspath(self.cache_path)) or "."
        if not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(cache, f, indent=2)
            os.replace(tmp, self.cache_path)  # atomic
        finally:
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except OSError:
                    pass

    def _cache_write(self, action, key, data):
        cache = self._load_cache()
        cache["entries"][key] = {"action": action, "payloadHash": key, "ts": self._now(), "source": "live", "data": data}
        self._save_cache(cache)

    def _cache_read(self, key):
        cache = self._load_cache()
        return cache["entries"].get(key)

    # ── the contract: live-first, cache-fallback ──
    def request(self, dispatcher, action, payload=None):
        """Returns (data, source) where source in {live, cache, cache-stale}.
        Raises PrismUnavailable when neither live nor cache can serve it."""
        payload = payload or {}
        key = request_key(action, payload)
        if self.ready():
            try:
                data = self._live(dispatcher, action, payload)
                self._cache_write(action, key, data)
                return data, "live"
            except Exception:
                pass  # fall through to cache
        cached = self._cache_read(key)
        if cached is not None:
            age = self._now() - float(cached.get("ts", 0))
            return cached.get("data"), ("cache" if age <= self.max_stale_s else "cache-stale")
        raise PrismUnavailable("no live bridge and no cache for action '" + str(action) + "'")

    # ── convenience wrappers (shape per CONTRACT.md §2) ──
    def speed_feed(self, params):
        return self.request("prism_cam", "cam_speedfeed_compute", params)

    def tool_data(self, tool_number, extra=None):
        return self.request("prism_cam", "tool_catalog_lookup", dict(extra or {}, toolNumber=tool_number))
