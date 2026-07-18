---
name: warn-xxe-injection
enabled: false
event: file
pattern: (LIBXML_NOENT|resolve_entities\s*=\s*True|xmlParseEntityDecl|\.setFeature\(.*external.*false|etree\.parse\s*\(\s*(?!.*XMLParser)|lxml\.etree\.fromstring\s*\((?!.*XMLParser))
action: warn
---

**XML parsing detected -- check for XXE vulnerability! (OWASP A05:2021)**

XXE injection allows attackers to read server files, perform SSRF, and cause DoS via entity expansion.

- Always disable external entity resolution when parsing XML from untrusted sources
- Use safe parsers: `defusedxml` (Python), `xml2js`/`fast-xml-parser` (Node.js), disable doctype decl (Java)
