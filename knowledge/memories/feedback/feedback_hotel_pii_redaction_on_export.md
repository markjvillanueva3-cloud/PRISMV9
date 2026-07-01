---
name: feedback_hotel_pii_redaction_on_export
description: Redact PII (SSN/card/name) on every export and log; never emit raw
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
aliases: feedback_hotel_pii_redaction_on_export
---


Redact PII on every export/log: SSN -> last4, credit card -> masked (****-****-****-1234), names -> role-only. Never emit full SSN, full card, or name+DOB+address together.

**Why:** PII leakage is a legal + customer-trust catastrophe; hotel soul refuse #2.

**How to apply:** consult EncryptionAtRestEngine + mcp-server/data/state/customer-consents.json before any customer-data export; defer hard PII cases to security (escalation_path).
