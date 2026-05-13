# CLOSE-OUT-DEFERRED — explicitly-triaged candidates that are NOT being closed this session

> Append-only ledger. Each line names a candidate `unit_id` surfaced by
> `scripts/audit-close-out-candidates.mjs` plus the deferral reason.
> `goal-complete-gate.mjs` checks this file when verifying triage so the
> gate clears without requiring every flagged unit to have a fresh commit.

## Format

```
<unit_id> | <session/slot/chat-id> | <ISO timestamp> | <reason>
```

`<reason>` should be one of:
  - `closed-in-commit:<sha>` — already closed in a separate commit (e.g. peer chat); not duplicating
  - `defer-to-followup:<reason>` — needs more work / cross-team coord / capacity-bound
  - `false-positive:<why>` — audit flagged it but verification shows spec intent unsatisfied

---

## Entries

U-CAMP01 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: CAM-PARITY-AGI-MS0 is a different milestone scope; deliverables resolve (Mastercam DL + material bridge files exist) but cross-CAM parity requires verifying ALL 4 sibling CAM systems before declaring complete. Out of scope for this session's BRAVO slot.
U-CAMP13 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: CAM AGI Master Orchestrator deliverable file resolves but engine wiring + dispatcher integration not verified end-to-end. Needs a dedicated session to audit the orchestrator's actual API surface before close-out.
U-CAMP14 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: Post Processor AGI Unification — file token resolves to a unification doc/script but cross-CAM coverage (Fanuc/Siemens/Haas/Mazak/Okuma) requires per-controller verification. Out of scope for goal-complete-gate landing session.
U-CAMP15 | claude-de9949da/BRAVO | 2026-05-13T17:10:00Z | defer-to-followup: Master Post Fine-Tuning System — file token resolves but training-loop and shipped fine-tuned weights need separate verification. Audit confidence 1.0 reflects file presence only; spec correctness pending dedicated review.
