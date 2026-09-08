import { initializeCrypto } from "@/core/services/crypto";

export type TermuxMcpRequest = {
  version: 1;
  requestId: string;
  issuedAtMs: number;
  nonce: string;
  method: "execute";
  command: string;
  approvalId: string;
};

export type TermuxMcpEnvelope = TermuxMcpRequest & { mac: string };

const MAX_CLOCK_SKEW_MS = 30_000;
const MAX_COMMAND_BYTES = 8 * 1024;
const HEX = /^[0-9a-f]+$/i;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 || !HEX.test(value)) throw new Error("Invalid hex value");
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function canonical(request: TermuxMcpRequest): string {
  return JSON.stringify([
    request.version,
    request.requestId,
    request.issuedAtMs,
    request.nonce,
    request.method,
    request.command,
    request.approvalId,
  ]);
}

async function hmacHex(secret: Uint8Array, value: string): Promise<string> {
  await initializeCrypto();
  const key = await globalThis.crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const data = new TextEncoder().encode(value);
  return bytesToHex(new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", key, data)));
}

export async function createTermuxMcpSessionSecret(): Promise<string> {
  await initializeCrypto();
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function signTermuxMcpRequest(
  secretHex: string,
  input: Omit<TermuxMcpRequest, "version" | "requestId" | "issuedAtMs" | "nonce" | "method">,
): Promise<TermuxMcpEnvelope> {
  await initializeCrypto();
  if (!input.approvalId.trim()) throw new Error("TermuxMCP approval is required");
  if (!input.command || new TextEncoder().encode(input.command).byteLength > MAX_COMMAND_BYTES) throw new Error("Invalid TermuxMCP command");
  const nonceBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(nonceBytes);
  const request: TermuxMcpRequest = {
    version: 1,
    requestId: crypto.randomUUID(),
    issuedAtMs: Date.now(),
    nonce: bytesToHex(nonceBytes),
    method: "execute",
    command: input.command,
    approvalId: input.approvalId,
  };
  return { ...request, mac: await hmacHex(hexToBytes(secretHex), canonical(request)) };
}

export async function verifyTermuxMcpRequest(
  secretHex: string,
  envelope: TermuxMcpEnvelope,
  nowMs = Date.now(),
  seenNonces = new Set<string>(),
): Promise<void> {
  if (envelope.version !== 1 || envelope.method !== "execute") throw new Error("Unsupported TermuxMCP request");
  if (!envelope.requestId || envelope.nonce.length !== 32 || !HEX.test(envelope.nonce)) throw new Error("Invalid TermuxMCP nonce");
  if (Math.abs(nowMs - envelope.issuedAtMs) > MAX_CLOCK_SKEW_MS) throw new Error("Expired TermuxMCP request");
  if (seenNonces.has(envelope.nonce)) throw new Error("Replay detected");
  if (!envelope.approvalId.trim()) throw new Error("Missing approval");
  if (!envelope.command || new TextEncoder().encode(envelope.command).byteLength > MAX_COMMAND_BYTES) throw new Error("Invalid command");
  const expected = await hmacHex(hexToBytes(secretHex), canonical(envelope));
  if (expected.length !== envelope.mac.length || !globalThis.crypto.subtle) throw new Error("Invalid TermuxMCP MAC");
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) mismatch |= expected.charCodeAt(i) ^ envelope.mac.charCodeAt(i);
  if (mismatch !== 0) throw new Error("Invalid TermuxMCP MAC");
  seenNonces.add(envelope.nonce);
}
