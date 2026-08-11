import { defineConfig } from "vitest/config";

// ドメイン層の純粋関数を対象とする単体テスト（DB 非依存）。
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
