# Aster Hands → OX2 integration mapping

Status: feasibility baseline, no Aster changes.

## Architecture lock

- Aster remains an untouched working reference.
- OX2 keeps its existing Hands shell and forensic workflows.
- Proven Aster mechanics are integrated incrementally into OX2; OX2 Hands is not replaced wholesale.
- Chat and voice enter one shared command/agent path.
- `/loop` is an autonomous execution mode: observe → plan → act → verify → repeat, with an explicit STOP path.

## Proven Aster capabilities to port/selectively reproduce

| Aster capability | OX2 current state | Integration target |
|---|---|---|
| Accessibility service lifecycle/singleton | Existing native accessibility-agent bridge | Preserve OX2 service; strengthen with Aster lifecycle semantics where needed |
| Multi-window observation | OX2 exposes a flattened tree | Add window-aware observation/budgeting |
| Screen revision + post-action settle | OX2 action executor has fixed waitMs | Add event-driven revision/settle semantics |
| Snapshot cache / ref re-resolution | OX2 node ids are used directly | Add snapshot-backed refs with descriptor verification |
| Verified tap / long press / swipe | OX2 supports basic actions | Add before/after verification and stale-ref fail-closed behavior |
| Text input | OX2 has setNodeText | Add focused-node fallback + explicit verification |
| IME key actions | OX2 action surface is narrower | Add router-backed key/IME path |
| Scroll-to-find | OX2 has scrollNode | Add bounded event-aware search |
| Screenshot + OCR fallback | OX2 tree bridge exists; screenshot/OCR need audit | Add only after dependency/build feasibility is proven |
| Safety guard / kill switch | OX2 approval bridge exists; forensic gate exists | Preserve and connect to loop-wide STOP |

## Current OX2 evidence

- `modules/accessibility-agent/index.ts`: current bridge exposes tree, node lookup/wait, events/window changes, tap, long press, text, scroll, swipe, global actions and app opening.
- `src/tools/executors/accessibility-executors.ts`: current observe/action executor performs a11y-enabled check and optional post-action causal verification.
- `src/tools/bridge.ts`: current device tool set includes observe/act/open-app and approval handling.
- `scripts/hands-android-probe.sh`: current runtime forensic probe covers service bind, tree, real accessibility tap, app launch and fatal-error checks.
- `.github/workflows/hands-forensic-gate.yml`: current evidence gate enforces provenance and runtime H1-H14 evidence.

## First implementation sequence

1. Freeze Aster baseline.
2. Create isolated OX2 integration branch from main.
3. Port the smallest proven semantic unit: event-driven action verification + snapshot/ref model.
4. Run Hands forensic gate.
5. Add multi-window observation.
6. Run gate again.
7. Add autonomous loop command bus and connect chat + voice to it.
8. Run end-to-end `/loop` phone execution test with STOP evidence.

No PASS is inferred from source presence or a green build; each runtime capability requires runtime evidence.
