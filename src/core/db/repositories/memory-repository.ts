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
  let migrationPromise: Promise<MemoryEntry | null> | null = null;

  async function migrateLegacyRows(): Promise<MemoryEntry | null> {
    const existingDocument = (
      await db
        .select()
        .from(memories)
        .where(eq(memories.id, MEMORY_DOCUMENT_ID))
        .limit(1)
    )[0];

    if (existingDocument?.status === "active") {
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

    if (existingDocument) {
      await db
        .update(memories)
        .set({
          content,
          enabled: true,
          sourceConversationId: null,
          sourceMessageId: null,
          updatedAt: timestamp,
          archivedAt: null,
          trust: "untrusted",
          status: "active",
          sourceKind: "conversation",
          sourceRef: null,
          validFrom: existingDocument.validFrom || timestamp,
          staleAfter: null,
          supersedes: null,
          supersededBy: null,
          confidence: 0.5,
        })
        .where(eq(memories.id, MEMORY_DOCUMENT_ID));
    } else {
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
    }

    return (
      await db
        .select()
        .from(memories)
        .where(eq(memories.id, MEMORY_DOCUMENT_ID))
        .limit(1)
    )[0] ?? null;
  }

  async function ensureLegacyMigration() {
    migrationPromise ??= migrateLegacyRows();
    return migrationPromise;
  }

  return {
    async getActive() {
      const row = await ensureLegacyMigration();
      return row ? toMemoryEntry(row) : null;
    },
    async getById(id) {
      const row = (
        await db.select().from(memories).where(eq(memories.id, id)).limit(1)
      )[0];

      return row ? toMemoryEntry(row) : null;
    },
    async createOrReplace(input) {
      await ensureLegacyMigration();
      const timestamp = nowIso();
      const existing = await this.getById(MEMORY_DOCUMENT_ID);
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
        validFrom: existing?.validFrom ?? timestamp,
        staleAfter: null,
        supersedes: null,
        supersededBy: null,
        confidence: input.confidence ?? 0.5,
      };

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
