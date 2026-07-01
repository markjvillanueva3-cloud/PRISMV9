// scripts/lib/redact-secrets.test.mjs — shared secret-redactor tests (pure).
//
// Verifies the FULL pattern set the FOUNDATION-HARDEN data-leak fix requires:
// bearer tokens, vendor API keys (Google/OpenAI/xAI/GitHub), JWTs, generic
// credential-assignment lines, long hex runs, and leaking frontmatter keys.
// Real assertions — each checks the secret is GONE and the mask token PRESENT.

import test from "node:test";
import assert from "node:assert/strict";
import { redactSecrets } from "./redact-secrets.mjs";

test("masks Bearer tokens", () => {
  const out = redactSecrets("Authorization: Bearer abc.def.ghi rest");
  assert.ok(!out.includes("abc.def.ghi"));
  assert.match(out, /Bearer \[redacted\]/);
});

test("masks a Google API key (AIza…)", () => {
  const key = "AIza" + "B".repeat(35);
  const out = redactSecrets(`google_key=${key}`);
  assert.ok(!out.includes(key));
  assert.match(out, /\[redacted-google-key\]/);
});

test("masks OpenAI sk- and xAI xai- keys", () => {
  const o1 = redactSecrets("use sk-ABCdef1234567890 now");
  assert.ok(!o1.includes("sk-ABCdef1234567890"));
  assert.match(o1, /\[redacted-openai-key\]/);
  const o2 = redactSecrets("xai-ZZZ999abcDEF here");
  assert.ok(!o2.includes("xai-ZZZ999abcDEF"));
  assert.match(o2, /\[redacted-xai-key\]/);
});

test("masks GitHub PAT (ghp_ and github_pat_)", () => {
  const o1 = redactSecrets("token ghp_0123456789abcdef tail");
  assert.ok(!o1.includes("ghp_0123456789abcdef"));
  assert.match(o1, /\[redacted-github-token\]/);
  const o2 = redactSecrets("github_pat_11ABCDEFG0_xyz123 tail");
  assert.ok(!o2.includes("github_pat_11ABCDEFG0_xyz123"));
  assert.match(o2, /\[redacted-github-pat\]/);
});

test("masks a JWT (three base64url segments)", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36";
  const out = redactSecrets(`cookie=${jwt};`);
  assert.ok(!out.includes(jwt));
  assert.match(out, /\[redacted-jwt\]/);
});

test("masks generic credential-assignment lines (api_key/secret/token/password)", () => {
  for (const [line, val] of [
    ["api_key: xyzSECRETvalue", "xyzSECRETvalue"],
    ["api-key = anotherSecret9", "anotherSecret9"],
    ["secret=topSecretThing", "topSecretThing"],
    ["token : bearerLikeThing", "bearerLikeThing"],
    ["password=hunter2plus", "hunter2plus"],
  ]) {
    const out = redactSecrets(line);
    assert.ok(!out.includes(val), `value should be gone for: ${line} → ${out}`);
    assert.match(out, /\[redacted-secret\]/, `mask expected for: ${line} → ${out}`);
  }
});

test("masks long hex runs (≥32 lowercase hex chars)", () => {
  const hex = "a".repeat(40);
  const out = redactSecrets(`hash ${hex} end`);
  assert.ok(!out.includes(hex));
  assert.match(out, /\[redacted-hex\]/);
});

test("masks UPPERCASE long hex runs (regression: bridge's case-insensitive coverage)", () => {
  const hex = "ABCDEF0123456789ABCDEF0123456789ABCDEF01"; // 40 uppercase hex chars
  const out = redactSecrets(`blob ${hex} tail`);
  assert.ok(!out.includes(hex));
  assert.match(out, /\[redacted-hex\]/);
});

test("masks the OS username in home paths (privacy — Windows + Unix, both slash styles)", () => {
  const w = redactSecrets("see C:/Users/wompu/.claude/projects/H--prism/memory/foo.md for detail");
  assert.ok(!w.includes("wompu"), `username leaked: ${w}`);
  assert.match(w, /C:\/Users\/\[user\]\/\.claude/);
  // The rest of the path (project structure) is preserved.
  assert.match(w, /\.claude\/projects\/H--prism\/memory\/foo\.md/);
  // Backslash style.
  const back = redactSecrets("path C:\\Users\\wompu\\.claude\\x");
  assert.ok(!back.includes("wompu"), `backslash username leaked: ${back}`);
  // Unix home.
  const unix = redactSecrets("at /home/markj/prism/run.sh now");
  assert.ok(!unix.includes("markj"));
  assert.match(unix, /\/home\/\[user\]\/prism/);
});

test("strips leaking YAML frontmatter keys (source_path, content_hash, slug, generator, generated_at)", () => {
  const fm = [
    "---",
    "source_path: H:/prism/secret/path.md",
    "content_hash: deadbeefcafebabe",
    "slug: my-private-slug",
    "generator: memory-emitter-v3",
    "generated_at: 2026-05-31T00:00:00Z",
    "title: Public Title",
    "---",
    "body text",
  ].join("\n");
  const out = redactSecrets(fm);
  assert.ok(!out.includes("H:/prism/secret/path.md"), "source_path value leaked");
  assert.ok(!out.includes("my-private-slug"), "slug value leaked");
  assert.ok(!out.includes("memory-emitter-v3"), "generator value leaked");
  assert.match(out, /source_path: \[redacted\]/);
  assert.match(out, /generated_at: \[redacted\]/);
  // The public title and body are preserved.
  assert.match(out, /title: Public Title/);
  assert.match(out, /body text/);
});

test("masks multiple secrets on one line + handles combined snippet", () => {
  const out = redactSecrets("Bearer t0ken123 and api_key=zzz9 and " + "f".repeat(33));
  assert.ok(!out.includes("zzz9"));
  assert.match(out, /Bearer \[redacted\]/);
  assert.match(out, /\[redacted-secret\]/);
  assert.match(out, /\[redacted-hex\]/);
});

test("fail-soft: non-string / null / empty input coerces, never throws", () => {
  assert.equal(redactSecrets(""), "");
  assert.equal(redactSecrets(null), "");
  assert.equal(redactSecrets(undefined), "");
  assert.equal(redactSecrets(42), "42");
  assert.equal(typeof redactSecrets({ a: 1 }), "string");
  // Clean text is returned unchanged.
  assert.equal(redactSecrets("a perfectly normal sentence"), "a perfectly normal sentence");
});
