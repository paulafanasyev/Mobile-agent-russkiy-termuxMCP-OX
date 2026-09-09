import { describe, expect, it } from "vitest";
import { isBlockedIpAddress, validateMcpEndpoint, validateResolvedMcpAddresses } from "./endpoint-security";

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

  it("rejects embedded credentials and fragments", () => {
    expect(() => validateMcpEndpoint("https://user:pass@example.com/mcp")).toThrow();
    expect(() => validateMcpEndpoint("https://example.com/mcp#fragment")).toThrow();
  });

  it("rejects private, mapped and multicast literals", () => {
    expect(isBlockedIpAddress("192.168.1.20")).toBe(true);
    expect(isBlockedIpAddress("::ffff:192.168.1.20")).toBe(true);
    expect(isBlockedIpAddress("ff02::1")).toBe(true);
  });

  it("rejects private DNS answers immediately before connection", () => {
    expect(() => validateResolvedMcpAddresses(["93.184.216.34", "10.0.0.7"])).toThrow();
    expect(() => validateResolvedMcpAddresses(["93.184.216.34"])).not.toThrow();
  });

  it("allows explicit private-network policy", () => {
    expect(() => validateResolvedMcpAddresses(["10.0.0.7"], { allowPrivateNetwork: true })).not.toThrow();
  });
});
