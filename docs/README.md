# Discovery Loop Accelerated Package

Outcome: OUT-001 - Cost Control
Profile: Discovery Loop Accelerated

Contents:
- out-001-discovery-loop-accelerated-framing-handoff.md
- out-001-discovery-loop-accelerated-framing-handoff.json
- ux-sketches/... linked to the correct Story Idea

Prepared for a more autonomous downstream discovery loop with available agent roles, while preserving governance, traceability and approval boundaries.

## General handling rules
- Run a discovery loop from the Framing source of truth: inspect Outcome, Epics, Story Ideas, Journey Context, constraints, AI level and approval context before producing downstream artifacts.
- Do not ask for confirmation at every refinement step. Make reasonable documented assumptions, batch open questions, and continue until a meaningful refinement package exists.
- Use available specialist agents or BMAD-style roles when helpful, for example analyst, product, UX, architect, dev and QA perspectives, but keep one consolidated source-of-truth output.
- Escalate to the human only for governance-sensitive decisions, missing critical facts, material scope changes, high-risk data/security/privacy issues, or approval/sign-off boundaries.
- Return discovery outputs as traceable proposals linked back to Outcome -> Epic -> Story Idea -> Journey where applicable, plus assumptions, risks, suggested next experiments and validation checks.

Use the markdown handoff for direct AI transfer. Use the JSON plus ux-sketches folder when the next step should preserve structure, traceability and visual references together.