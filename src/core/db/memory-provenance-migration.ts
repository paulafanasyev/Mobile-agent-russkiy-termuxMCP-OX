import type { SQLiteDatabase } from "expo-sqlite";

const MEMORY_PROVENANCE_COLUMNS = [
  "trust",
  "status",
  "source_kind",
  "source_ref",
  "valid_from",
  "stale_after",
  "supersedes",
  "superseded_by",
  "confidence",
] as const;

export async function migrateMemoryProvenance(db: SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(memories)",
  );
  const has = (name: string) => columns.some((column) => column.name === name);

  if (!has("trust")) {
    await db.execAsync(
      "ALTER TABLE memories ADD COLUMN trust TEXT NOT NULL DEFAULT 'untrusted';",
    );
  }
  if (!has("status")) {
    await db.execAsync(
      "ALTER TABLE memories ADD COLUMN status TEXT NOT NULL DEFAULT 'active';",
    );
  }
  if (!has("source_kind")) {
    await db.execAsync(
      "ALTER TABLE memories ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'conversation';",
    );
  }
  if (!has("source_ref")) {
    await db.execAsync("ALTER TABLE memories ADD COLUMN source_ref TEXT;");
  }
  if (!has("valid_from")) {
    await db.execAsync(
      "ALTER TABLE memories ADD COLUMN valid_from TEXT NOT NULL DEFAULT '';",
    );
    await db.execAsync(
      "UPDATE memories SET valid_from = created_at WHERE valid_from = '';",
    );
  }
  if (!has("stale_after")) {
    await db.execAsync("ALTER TABLE memories ADD COLUMN stale_after TEXT;");
  }
  if (!has("supersedes")) {
    await db.execAsync("ALTER TABLE memories ADD COLUMN supersedes TEXT;");
  }
  if (!has("superseded_by")) {
    await db.execAsync("ALTER TABLE memories ADD COLUMN superseded_by TEXT;");
  }
  if (!has("confidence")) {
    await db.execAsync(
      "ALTER TABLE memories ADD COLUMN confidence REAL NOT NULL DEFAULT 0.5;",
    );
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_memories_status_updated_at
    ON memories(status, updated_at);

    CREATE INDEX IF NOT EXISTS idx_memories_source_kind_updated_at
    ON memories(source_kind, updated_at);

    CREATE INDEX IF NOT EXISTS idx_memories_stale_after
    ON memories(stale_after);
  `);

  return MEMORY_PROVENANCE_COLUMNS;
}
