import { desc, eq, isNull } from "drizzle-orm";

import { memories } from "@/core/db/schema";
import type { MemoryEntry } from "@/core/types/app-state";
import { nowIso } from "@/core/db/repositories/shared";
import type { AppDatabase } from "@/core/db/repositories/types";

const MEMORY_DOCUMENT_ID = "memory.md";

function toMemoryEntry(row: typeof memories.$inferSelect): MemoryEntry {
  return {
    id: row.id,
    content: row.content,
    enabled: row.enabled,
    sourceConversationId: row.sourceConversationId,
    sourceMessageId: row.sourceMessageId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    trust: row.trust,
    status: row.status,
    sourceKind: row.sourceKind,
    sourceRef: row.sourceRef,
    validFrom: row.validFrom,
    staleAfter: row.staleAfter,
    supersedes: row.supersedes,
    supersededBy: row.supersededBy,
    confidence: row.confidence,
  };
}

export interface MemoryRepository {
  getActive(): Promise<MemoryEntry | null>;
  getById(id: string): Promise<MemoryEntry | null>;
  createOrReplace(input: {
    content: string;
    sourceConversationId?: string | null;
    sourceMessageId?: string | null;
    sourceKind?: MemoryEntry["sourceKind"];
    sourceRef?: string | null;
    trust?: MemoryEntry["trust"];
    confidence?: number;
  }): Promise<MemoryEntry>;
  archive(id: string): Promise<void>;
}

export function createMemoryRepository(db: AppDatabase): MemoryRepository {
  return {
    async getActive() {
      const row = (
        await db
          .select()
          .from(memories)
          .where(eq(memories.status, "active"))
          .orderBy(desc(memories.updatedAt))
          .limit(1)
      )[0];

      return row ? toMemoryEntry(row) : null;
    },
    async getById(id) {
      const row = (
        await db.select().from(memories).where(eq(memories.id, id)).limit(1)
      )[0];

      return row ? toMemoryEntry(row) : null;
    },
    async createOrReplace(input) {
      const current = await this.getById(MEMORY_DOCUMENT_ID);
      const timestamp = nowIso();
      const values = {
        content: input.content,
        enabled: true,
        sourceConversationId: input.sourceConversationId ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        updatedAt: timestamp,
        archivedAt: null,
        trust: input.trust ?? "untrusted",
        status: "active" as const,
        sourceKind: input.sourceKind ?? "conversation",
        sourceRef: input.sourceRef ?? null,
        validFrom: current?.validFrom ?? timestamp,
        staleAfter: null,
        supersedes: current?.id ?? null,
        supersededBy: null,
        confidence: input.confidence ?? 0.5,
      };

      if (current) {
        await db
          .update(memories)
          .set(values)
          .where(eq(memories.id, MEMORY_DOCUMENT_ID));
      } else {
        await db.insert(memories).values({
          id: MEMORY_DOCUMENT_ID,
          createdAt: timestamp,
          ...values,
        });
      }

      const result = await this.getById(MEMORY_DOCUMENT_ID);

      if (!result) {
        throw new Error("Failed to persist memory");
      }

      return result;
    },
    async archive(id) {
      const timestamp = nowIso();
      await db
        .update(memories)
        .set({
          archivedAt: timestamp,
          enabled: false,
          status: "archived",
          updatedAt: timestamp,
        })
        .where(eq(memories.id, id));
    },
  };
}

export { MEMORY_DOCUMENT_ID };
