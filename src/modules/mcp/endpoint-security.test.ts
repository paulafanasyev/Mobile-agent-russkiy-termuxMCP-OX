import { describe, expect, it } from "vitest";
import { validateMcpEndpoint } from "./endpoint-security";

describe("MCP endpoint security", () => {
  it("accepts HTTPS endpoints", () => {
    expect(validateMcpEndpoint("https://example.com/mcp").protocol).toBe("https:");
  });

  it("allows loopback HTTP for local MCP", () => {
    expect(validateMcpEndpoint("http://127.0.0.1:8787/mcp").hostname).toBe("127.0.0.1");
  });

  it("rejects cleartext remote endpoints", () => {
    expect(() => validateMcpEndpoint("http://example.com/mcp")).toThrow();
  });

  it("rejects embedded credentials", () => {
    expect(() => validateMcpEndpoint("https://user:pass@example.com/mcp")).toThrow();
  });

  it("rejects private IPv4 addresses by default", () => {
    expect(() => validateMcpEndpoint("https://192.168.1.20/mcp")).toThrow();
  });

  it("rejects loopback IPv6 except explicit local endpoint", () => {
    expect(() => validateMcpEndpoint("https://[::1]:8787/mcp")).not.toThrow();
  });
});
