import { createMemoryRepository } from "@/core/db/repositories/memory-repository";
import type { AppDatabase } from "@/core/db/repositories/types";
import type { MemoryStore } from "@/modules/memory/types";

export function createDatabaseMemoryStore(db: AppDatabase): MemoryStore {
  const repository = createMemoryRepository(db);

  return {
    async read() {
      return repository.getActive();
    },
    async write(content) {
      return repository.createOrReplace({ content });
    },
    async clear() {
      const current = await repository.getActive();
      if (current) {
        await repository.archive(current.id);
      }
    },
  };
}
