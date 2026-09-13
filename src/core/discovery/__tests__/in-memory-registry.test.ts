import { describe, expect, it } from "vitest";

import { createDiscoveryRegistry } from "@/core/discovery/in-memory-registry";

describe("discovery registry", () => {
  it("registers and filters entries without executing them", () => {
    const registry = createDiscoveryRegistry();

    registry.register({
      id: "playwright-mcp",
      kind: "mcp-server",
      name: "Playwright MCP",
      trust: "observed",
      capabilities: ["browser.automation"],
      discoveredAt: "2026-09-13T00:00:00.000Z",
      enabled: true,
    });

    registry.register({
      id: "unknown-api",
      kind: "public-api",
      name: "Unknown API",
      trust: "unverified",
      capabilities: ["weather"],
      discoveredAt: "2026-09-13T00:00:00.000Z",
      enabled: false,
    });

    expect(registry.get("playwright-mcp")?.name).toBe("Playwright MCP");
    expect(
      registry.list({ kind: "mcp-server", capability: "browser.automation" }),
    ).toHaveLength(1);
    expect(registry.list({ enabledOnly: true })).toHaveLength(1);
    expect(registry.list({ trust: "unverified" })).toHaveLength(1);
  });
});
