"""
prism_client_test.py - tests for the reference PRISM post-data client.
Run: H:/Tools/python/python.exe -m unittest mcp-server/data/posts/prism-base/addin/prism_client_test.py
(or: python -m unittest discover -s <dir>)
Real-behavior assertions of the CONTRACT.md live+cache-fallback algorithm via an injected
fake HTTP transport (no network) + a temp cache file.
"""
import os
import sys
import json
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prism_client import PrismPostClient, PrismUnavailable, request_key, canonical_json  # noqa: E402


def mcp_ok(payload):
    """A well-formed MCP tools/call result carrying JSON in content[0].text."""
    return 200, json.dumps({"jsonrpc": "2.0", "id": 1, "result": {"content": [{"type": "text", "text": json.dumps(payload)}]}})


class FakeHttp(object):
    """Scriptable transport: records calls, returns queued responses, can simulate down."""
    def __init__(self):
        self.ready_up = True
        self.post_handler = None
        self.calls = []

    def __call__(self, method, url, body, timeout):
        self.calls.append((method, url, body))
        if method == "GET" and url.endswith("/ready"):
            if self.ready_up:
                return 200, "ok"
            raise OSError("connection refused")
        if method == "POST":
            if self.post_handler is None:
                raise OSError("connection refused")
            return self.post_handler(body)
        raise OSError("unexpected " + method + " " + url)


class TestPrismClient(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.cache = os.path.join(self.tmp, "doc.prism-post-cache.json")
        self.clock = [1000.0]
        self.http = FakeHttp()
        self.client = PrismPostClient(cache_path=self.cache, http=self.http, now=lambda: self.clock[0], max_stale_s=3600)

    def test_live_success_returns_live_and_writes_cache(self):
        self.http.post_handler = lambda body: mcp_ok({"rpm": 6000, "feed": 600})
        data, source = self.client.request("prism_cam", "cam_speedfeed_compute", {"toolDia": 0.5})
        self.assertEqual(source, "live")
        self.assertEqual(data["feed"], 600)
        # cache was written through
        self.assertTrue(os.path.exists(self.cache))
        with open(self.cache) as f:
            c = json.load(f)
        key = request_key("cam_speedfeed_compute", {"toolDia": 0.5})
        self.assertIn(key, c["entries"])
        self.assertEqual(c["entries"][key]["data"]["feed"], 600)

    def test_live_down_falls_back_to_fresh_cache(self):
        # prime cache via a live call
        self.http.post_handler = lambda body: mcp_ok({"feed": 555})
        self.client.request("prism_cam", "cam_speedfeed_compute", {"toolDia": 0.25})
        # bridge goes down
        self.http.ready_up = False
        data, source = self.client.request("prism_cam", "cam_speedfeed_compute", {"toolDia": 0.25})
        self.assertEqual(source, "cache")
        self.assertEqual(data["feed"], 555)

    def test_live_post_error_falls_back_to_cache(self):
        # ready() true but POST returns a non-2xx → must fall through to cache, not crash
        self.http.post_handler = lambda body: mcp_ok({"feed": 777})
        self.client.request("prism_cam", "cam_speedfeed_compute", {"x": 1})
        self.http.post_handler = lambda body: (500, "boom")
        data, source = self.client.request("prism_cam", "cam_speedfeed_compute", {"x": 1})
        self.assertEqual(source, "cache")
        self.assertEqual(data["feed"], 777)

    def test_stale_cache_flagged(self):
        self.http.post_handler = lambda body: mcp_ok({"feed": 1})
        self.client.request("prism_cam", "cam_speedfeed_compute", {"a": 1})
        self.http.ready_up = False
        self.clock[0] += 4000  # exceeds max_stale_s=3600
        data, source = self.client.request("prism_cam", "cam_speedfeed_compute", {"a": 1})
        self.assertEqual(source, "cache-stale")
        self.assertEqual(data["feed"], 1)

    def test_no_live_no_cache_raises(self):
        self.http.ready_up = False
        with self.assertRaises(PrismUnavailable):
            self.client.request("prism_cam", "cam_speedfeed_compute", {"never": "cached"})

    def test_structured_content_preferred(self):
        self.http.post_handler = lambda body: (200, json.dumps({"result": {"structuredContent": {"feed": 42}, "content": [{"text": "ignored"}]}}))
        data, source = self.client.request("prism_cam", "x", {})
        self.assertEqual(data, {"feed": 42})

    def test_mcp_error_envelope_falls_back(self):
        self.http.post_handler = lambda body: mcp_ok({"feed": 9})  # prime
        self.client.request("prism_cam", "y", {})
        self.http.post_handler = lambda body: (200, json.dumps({"error": {"code": -32000, "message": "nope"}}))
        data, source = self.client.request("prism_cam", "y", {})
        self.assertEqual(source, "cache")  # error envelope → fall back, don't crash
        self.assertEqual(data["feed"], 9)

    def test_request_includes_action_in_arguments(self):
        captured = {}
        def handler(body):
            captured["body"] = json.loads(body)
            return mcp_ok({"ok": True})
        self.http.post_handler = handler
        self.client.request("prism_cam", "cam_speedfeed_compute", {"toolDia": 0.5})
        args = captured["body"]["params"]["arguments"]
        self.assertEqual(args["action"], "cam_speedfeed_compute")
        self.assertEqual(args["toolDia"], 0.5)
        self.assertEqual(captured["body"]["params"]["name"], "prism_cam")

    def test_key_is_stable_and_payload_order_independent(self):
        self.assertEqual(request_key("a", {"x": 1, "y": 2}), request_key("a", {"y": 2, "x": 1}))
        self.assertNotEqual(request_key("a", {"x": 1}), request_key("b", {"x": 1}))

    def test_cache_corruption_does_not_crash(self):
        with open(self.cache, "w") as f:
            f.write("{ not valid json")
        self.http.ready_up = False
        with self.assertRaises(PrismUnavailable):  # corrupt cache treated as empty
            self.client.request("prism_cam", "z", {})

    def test_convenience_wrappers(self):
        self.http.post_handler = lambda body: mcp_ok({"feed": 600, "rpm": 6000})
        d, s = self.client.speed_feed({"toolDia": 0.5, "flutes": 4})
        self.assertEqual(s, "live")
        self.assertEqual(d["rpm"], 6000)


if __name__ == "__main__":
    unittest.main()
