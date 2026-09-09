const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function isValidIpv4(value: string): boolean {
  if (!IPV4_RE.test(value)) return false;
  return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
}

export function isBlockedIpAddress(value: string): boolean {
  const host = value.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (isValidIpv4(host)) {
    const [a, b] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (!host.includes(":")) return false;
  const mapped = host.match(/^(?:::ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped && isValidIpv4(mapped[1])) return isBlockedIpAddress(mapped[1]);
  const hextets = host.split(":");
  const first = Number.parseInt(hextets[0] || "0", 16);
  const second = Number.parseInt(hextets[1] || "0", 16);
  if (!Number.isFinite(first) || first < 0 || first > 0xffff) return false;
  return host === "::" || host === "::1" || (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00 || (first === 0 && second === 0);
}

export function validateResolvedMcpAddresses(addresses: readonly string[], options: { allowPrivateNetwork?: boolean } = {}): void {
  if (options.allowPrivateNetwork) return;
  for (const address of addresses) {
    if (isBlockedIpAddress(address)) throw new Error("MCP hostname resolves to a private, link-local, multicast, loopback, or reserved address.");
  }
}

export type McpEndpointSecurityOptions = {
  allowLoopbackHttp?: boolean;
  allowPrivateNetwork?: boolean;
};

export function validateMcpEndpoint(rawUrl: string, options: McpEndpointSecurityOptions = {}): URL {
  const { allowLoopbackHttp = true, allowPrivateNetwork = false } = options;
  let parsed: URL;
  try { parsed = new URL(rawUrl.trim()); } catch { throw new Error("Invalid MCP server URL."); }
  if (!["http:", "https:", "ws:", "wss:"].includes(parsed.protocol)) throw new Error("MCP server URL must use HTTP(S) or WS(S).");
  if (parsed.username || parsed.password) throw new Error("MCP server URL must not contain embedded credentials.");
  if (parsed.hash) throw new Error("MCP server URL must not contain a fragment.");
  const host = parsed.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  if ((parsed.protocol === "http:" || parsed.protocol === "ws:") && !(loopback && allowLoopbackHttp)) throw new Error("Cleartext MCP transport is allowed only for loopback endpoints.");
  if (!allowPrivateNetwork && isBlockedIpAddress(host) && !loopback) throw new Error("Private, link-local, multicast, or reserved MCP addresses are blocked by default.");
  return parsed;
}
