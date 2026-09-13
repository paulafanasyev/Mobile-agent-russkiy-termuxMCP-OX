# OX Architecture Constitution

## 1. Evidence before PASS
No feature is considered proven from source code, a mock, an MCP client, or a planned action alone. A real capability requires the strongest available chain: code → build/CI → runtime → real action → verification → evidence.

## 2. Planning is not execution
Planner output is data. Planning must not directly execute device, browser, network, privileged, or external-provider actions.

## 3. Policy is authoritative
Learning, memory, model output, external workers, MCP servers, and plugins may recommend actions but may not silently grant permissions, change policy, or create capabilities.

## 4. Workers are replaceable
Android Hands, Termux, Browser, Research, Knowledge, Model, and external MCP workers are adapters behind explicit contracts. OX Core owns routing, policy, approval, verification, and evidence.

## 5. Memory has provenance
A memory without a source, status, trust level, and freshness semantics must not be treated as authoritative project knowledge.

## 6. Verification is independent
An executor reporting success is not sufficient. Verification must observe the resulting state or another independently meaningful signal.

## 7. Fail closed
Unknown capability, missing approval, invalid contract, unavailable worker, ambiguous target, or failed verification must stop or return a bounded retryable result. Never silently downgrade security.

## 8. Learning is bounded
Learning may change ranking, confidence, routing preference, and research priorities. Learning must not directly change security policy, permissions, capability definitions, or approval requirements.

## 9. External projects are dependencies only by decision
A researched open-source project is not copied into OX merely because it is useful. Each adoption must be classified as: full external worker, isolated compatible component, architecture pattern, or deferred.

## 10. Runtime evidence is preserved
Failures and important verification results must produce an auditable evidence record that can be inspected after the run.
