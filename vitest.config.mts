import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const dir = import.meta.dirname;

export default defineConfig({
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: [
      // Workspace source alias.
      { find: /^@\//, replacement: resolve(dir, "src") + "/" },
      // The git dependency ships TypeScript sources but no built `lib/`, so
      // both tsc (via tsconfig paths) and vitest (via this alias) must
      // resolve it to its source entry.
      {
        find: /^react-native-accessibility-controller$/,
        replacement: resolve(
          dir,
          "node_modules/react-native-accessibility-controller/src/index.ts",
        ),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
