const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function isValidIpv4(value: string): boolean {
  if (!IPV4_RE.test(value)) return false;
  return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
}

function ipv4IsPrivateOrReserved(value: string): boolean {
  if (!isValidIpv4(value)) return false;
  const [a, b] = value.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function ipv6IsPrivateOrReserved(host: string): boolean {
  const value = host.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb") ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("ff") ||
    value.startsWith("::ffff:") && isValidIpv4(value.slice(7))
  );
}

export type McpEndpointSecurityOptions = {
  allowLoopbackHttp?: boolean;
  allowPrivateNetwork?: boolean;
};

/**
 * Validate the URL before it reaches the MCP client. This is deliberately
 * synchronous and conservative: hostname DNS resolution/rebinding protection
 * must be performed by the runtime/native networking layer before connection.
 */
export function validateMcpEndpoint(
  rawUrl: string,
  options: McpEndpointSecurityOptions = {},
): URL {
  const { allowLoopbackHttp = true, allowPrivateNetwork = false } = options;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid MCP server URL.");
  }

  if (!["http:", "https:", "ws:", "wss:"].includes(parsed.protocol)) {
    throw new Error("MCP server URL must use HTTP(S) or WS(S).");
  }
  if (parsed.username || parsed.password) {
    throw new Error("MCP server URL must not contain embedded credentials.");
  }
  if (parsed.hash) {
    throw new Error("MCP server URL must not contain a fragment.");
  }

  const host = parsed.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  const literalPrivate = isValidIpv4(host) ? ipv4IsPrivateOrReserved(host) : host.includes(":") ? ipv6IsPrivateOrReserved(host) : false;

  if ((parsed.protocol === "http:" || parsed.protocol === "ws:") && !(loopback && allowLoopbackHttp)) {
    throw new Error("Cleartext MCP transport is allowed only for loopback endpoints.");
  }
  if (literalPrivate && !loopback && !allowPrivateNetwork) {
    throw new Error("Private, link-local, multicast, or reserved MCP addresses are blocked by default.");
  }

  return parsed;
}
