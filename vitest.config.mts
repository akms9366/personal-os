import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 単体テスト（ドメイン層の純粋関数）と、使い捨て SQLite を使う統合テスト（*.int.test.ts）。
// UI は presentational コンポーネントをサーバ描画（react-dom/server）して検証する。
// AI の応答はモックで差し替え、実 API には接続しない。
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.{ts,tsx}"],
  },
});
