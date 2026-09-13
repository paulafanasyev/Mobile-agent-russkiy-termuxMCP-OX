import { desc, eq } from "drizzle-orm";

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
  };
}

export interface MemoryRepository {
  getActive(): Promise<MemoryEntry | null>;
  getById(id: string): Promise<MemoryEntry | null>;
  createOrReplace(input: {
    content: string;
    sourceConversationId?: string | null;
    sourceMessageId?: string | null;
  }): Promise<MemoryEntry>;
  archive(id: string): Promise<void>;
}

export function createMemoryRepository(db: AppDatabase): MemoryRepository {
  async function migrateLegacyRows() {
    const existingDocument = (
      await db
        .select()
        .from(memories)
        .where(eq(memories.id, MEMORY_DOCUMENT_ID))
        .limit(1)
    )[0];

    if (existingDocument) {
      return existingDocument;
    }

    const legacyRows = await db
      .select()
      .from(memories)
      .where(eq(memories.status, "active"))
      .orderBy(desc(memories.updatedAt));

    if (legacyRows.length === 0) {
      return null;
    }

    const timestamp = nowIso();
    const content = [
      "# Memory",
      "",
      ...legacyRows.map((row) => `- ${row.content}`),
    ].join("\n");

    await db
      .update(memories)
      .set({
        archivedAt: timestamp,
        enabled: false,
        status: "archived",
        updatedAt: timestamp,
      })
      .where(eq(memories.status, "active"));

    await db.insert(memories).values({
      id: MEMORY_DOCUMENT_ID,
      content,
      enabled: true,
      sourceConversationId: null,
      sourceMessageId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      trust: "untrusted",
      status: "active",
      sourceKind: "conversation",
      sourceRef: null,
      validFrom: timestamp,
      staleAfter: null,
      supersedes: null,
      supersededBy: null,
      confidence: 0.5,
    });

    return (
      await db
        .select()
        .from(memories)
        .where(eq(memories.id, MEMORY_DOCUMENT_ID))
        .limit(1)
    )[0] ?? null;
  }

  return {
    async getActive() {
      const row = await migrateLegacyRows();
      return row ? toMemoryEntry(row) : null;
    },
    async getById(id) {
      const row = (
        await db.select().from(memories).where(eq(memories.id, id)).limit(1)
      )[0];

      return row ? toMemoryEntry(row) : null;
    },
    async createOrReplace(input) {
      await migrateLegacyRows();
      const timestamp = nowIso();
      const values = {
        content: input.content,
        enabled: true,
        sourceConversationId: input.sourceConversationId ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        updatedAt: timestamp,
        archivedAt: null,
        trust: "untrusted" as const,
        status: "active" as const,
        sourceKind: "conversation" as const,
        sourceRef: null,
        validFrom: timestamp,
        staleAfter: null,
        supersedes: null,
        supersededBy: null,
        confidence: 0.5,
      };

      const existing = await this.getById(MEMORY_DOCUMENT_ID);

      if (existing) {
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
