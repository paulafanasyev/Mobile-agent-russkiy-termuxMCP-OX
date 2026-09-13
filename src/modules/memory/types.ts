import type { MemoryEntry } from "@/core/types/app-state";

export type MemoryWriteMetadata = Pick<
  MemoryEntry,
  "sourceConversationId" | "sourceMessageId" | "sourceKind" | "sourceRef" | "trust" | "confidence"
>;

export interface MemoryStore {
  clear(): Promise<void>;
  read(): Promise<MemoryEntry | null>;
  write(content: string, metadata?: Partial<MemoryWriteMetadata>): Promise<MemoryEntry>;
}
