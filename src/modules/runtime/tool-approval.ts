import type { ToolSet } from "ai";

import { createRecord, summarizeValue } from "@/modules/tools/built-in/shared";
import type { PendingToolApprovalRequest, ToolApprovalMode, ToolExecutionRecord } from "@/core/types/app-state";

type ToolApprovalDecision = "approve" | "deny" | "abort";

let approvalSequence = 0;

type DeviceToolApprovalHandler = (toolName: string, toolInput: unknown) => Promise<ToolApprovalDecision>;
let deviceToolApprovalHandler: DeviceToolApprovalHandler | null = null;

/**
 * Device tools are injected by the AI SDK runtime after the normal runtime
 * ToolSet has been assembled. Privileged operations remain approval-gated even
 * when a run is otherwise configured for automatic execution.
 */
export function setDeviceToolApprovalHandler(handler: DeviceToolApprovalHandler | null): void {
  deviceToolApprovalHandler = handler;
}

export async function requestDeviceToolApproval(toolName: string, toolInput: unknown): Promise<ToolApprovalDecision | null> {
  if (!deviceToolApprovalHandler) return null;
  return deviceToolApprovalHandler(toolName, toolInput);
}

function createApprovalId(toolName: string) {
  approvalSequence += 1;
  return `${toolName}:${Date.now()}:${approvalSequence}`;
}

/**
 * This denylist is intentionally enforced below the run-level autoApprove flag.
 * A scheduler, headless run, or background run must never turn a write/device/
 * account/network/destructive operation into an unconditional execution path.
 */
export const PRIVILEGED_TOOL_NAMES = new Set([
  "createDirectory", "createFile", "deleteEntry", "downloadFile", "edit",
  "exportWorkspaceFileToFolder", "importFolderFileToWorkspace", "manageSkill",
  "moveEntry", "renameEntry", "write", "transfer", "schedule_task",
  "update_schedule", "cancel_schedule", "skill", "mcp_mutation",
  "send_message", "send_email", "purchase", "payment", "transfer_funds",
  "install", "delete", "credential",
]);

function mustAlwaysRequireApproval(toolName: string): boolean {
  return PRIVILEGED_TOOL_NAMES.has(toolName) || /^mcp_[^_]+_.+/.test(toolName) && toolName.includes("_mutation_");
}

async function resolveApproval(
  toolName: string,
  toolInput: unknown,
  input: {
    getRequestSummary?: (toolName: string, toolInput: unknown) => string;
    mode: ToolApprovalMode;
    requestApproval: (request: PendingToolApprovalRequest) => Promise<ToolApprovalDecision>;
    shouldRequireApproval?: (toolName: string, toolInput: unknown) => boolean;
  },
): Promise<ToolApprovalDecision | null> {
  const inputSummary = input.getRequestSummary?.(toolName, toolInput) ?? summarizeValue(toolInput);
  const needsApproval = mustAlwaysRequireApproval(toolName) || (input.shouldRequireApproval?.(toolName, toolInput) ?? true);
  if (input.mode !== "ask" && !mustAlwaysRequireApproval(toolName)) return "approve";
  if (!needsApproval) return "approve";
  return input.requestApproval({ id: createApprovalId(toolName), inputSummary, toolName });
}

export function wrapToolsWithApproval<T extends ToolSet>(
  tools: T,
  input: {
    getRequestSummary?: (toolName: string, toolInput: unknown) => string;
    mode: ToolApprovalMode;
    onRecord?: (record: ToolExecutionRecord) => void;
    shouldRequireApproval?: (toolName: string, toolInput: unknown) => boolean;
    requestApproval: (request: PendingToolApprovalRequest) => Promise<ToolApprovalDecision>;
  },
) {
  setDeviceToolApprovalHandler((toolName, toolInput) => resolveApproval(toolName, toolInput, input).then((decision) => decision ?? "approve"));

  return Object.fromEntries(
    Object.entries(tools).map(([toolName, toolDefinition]) => {
      if (!toolDefinition || typeof toolDefinition.execute !== "function") return [toolName, toolDefinition];
      const execute = toolDefinition.execute as (toolInput: unknown, options?: unknown) => Promise<unknown>;
      return [toolName, {
        ...toolDefinition,
        execute: async (toolInput: unknown, options?: unknown) => {
          const decision = await resolveApproval(toolName, toolInput, input);
          if (decision === "abort") throw new Error("Request aborted.");
          if (decision === "deny") {
            const inputSummary = input.getRequestSummary?.(toolName, toolInput) ?? summarizeValue(toolInput);
            input.onRecord?.(createRecord({ toolName, status: "failed", inputSummary, error: "User denied this tool call." }));
            return { denied: true, message: "The user denied this tool call. Ask before trying again or continue without this tool." };
          }
          return execute(toolInput, options);
        },
      }];
    }),
  ) as T;
}
