# OX P0 Adoption Map

This document records what OX adopts from the researched projects.

## Adopt as architecture

- Spec Kit: constitution → specify → clarify → plan → tasks → analyze → implement → converge.
- OKF Agent Memory: provenance, trust tiers, status, freshness, progressive disclosure.
- Supermemory: temporal updates, contradiction handling, forgetting, hybrid retrieval.
- HyperResearch: source/evidence/provenance research pipeline.

## Adopt as external workers

- Playwright MCP: browser worker.
- Neko: self-hosted browser/desktop environment behind the browser worker.
- FastMCP: external MCP infrastructure for Python services.
- MAX: optional model/inference worker.

## Deferred

WeKnora, God's Eye View, Archon, FinRobot, KBLaM, GenAI_Agents, ArmorPaint, Sonarr, Dokku and unresolved projects remain research references until a concrete OX capability requires them.

## Non-negotiable boundaries

1. External MCP servers do not bypass OX approval or verification.
2. Workers execute only requests accepted by OX routing/policy.
3. Evidence is produced by execution/observation, not by planner claims.
4. Learning may affect ranking/confidence only.
5. No external repository is copied wholesale into the OX mobile application unless a later architecture and license review explicitly approves it.

## Current implementation order

1. Constitution and evidence contracts.
2. Capability and worker contracts.
3. Provenance-aware memory model.
4. Persistent database migration for memory metadata.
5. Discovery registry.
6. Research worker.
7. Browser worker integration.
8. Model router expansion.
