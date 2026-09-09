import { describe, expect, it } from "vitest";
import { createTermuxMcpSessionSecret, signTermuxMcpRequest, verifyTermuxMcpRequest } from "./secure-ipc";

describe("TermuxMCP authenticated IPC", () => {
  it("accepts a correctly signed request once", async () => {
    const secret = await createTermuxMcpSessionSecret();
    const request = await signTermuxMcpRequest(secret, { command: "echo ok", approvalId: "approval-1" });
    const seen = new Set<string>();
    await expect(verifyTermuxMcpRequest(secret, request, Date.now(), seen)).resolves.toBeUndefined();
    expect(seen.has(request.nonce)).toBe(true);
  });

  it("rejects replay", async () => {
    const secret = await createTermuxMcpSessionSecret();
    const request = await signTermuxMcpRequest(secret, { command: "echo ok", approvalId: "approval-1" });
    const seen = new Set<string>();
    await verifyTermuxMcpRequest(secret, request, Date.now(), seen);
    await expect(verifyTermuxMcpRequest(secret, request, Date.now(), seen)).rejects.toThrow("Replay");
  });

  it("rejects a forged or expired request", async () => {
    const secret = await createTermuxMcpSessionSecret();
    const request = await signTermuxMcpRequest(secret, { command: "echo ok", approvalId: "approval-1" });
    await expect(verifyTermuxMcpRequest(secret, { ...request, command: "rm -rf /" }, Date.now())).rejects.toThrow("MAC");
    await expect(verifyTermuxMcpRequest(secret, request, Date.now() + 60_000)).rejects.toThrow("Expired");
  });
});
