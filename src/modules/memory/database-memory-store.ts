import type { MemoryRepository } from "@/core/db/repositories/memory-repository";
import type { AppDatabase } from "@/core/db/repositories/types";
import type { MemoryStore } from "@/modules/memory/types";

export function createDatabaseMemoryStore(
  db: AppDatabase,
  repository?: MemoryRepository,
): MemoryStore {
  const memoryRepository = repository ?? createMemoryRepository(db);

  return {
    async read() {
      return memoryRepository.getActive();
    },
    async write(content, metadata) {
      return memoryRepository.createOrReplace({ content, ...metadata });
    },
    async clear() {
      const current = await memoryRepository.getActive();
      if (current) {
        await memoryRepository.archive(current.id);
      }
    },
  };
}
