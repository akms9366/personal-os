# Personal OS

「自分専用の Personal OS」の実装リポジトリ。

設計の唯一の正本（SSOT）と Issue 管理は
[`personal-os-design`](https://github.com/akms9366/personal-os-design) で行う。
本リポジトリは実装コードのみを保持する。

## 技術スタック

- Next.js（App Router）+ TypeScript
- Tailwind CSS
- ESLint / Prettier

## 起動手順

```bash
npm install
npm run dev
```

開発サーバ起動後、http://localhost:3000 にアクセスする。

## スクリプト

| コマンド               | 内容                         |
| ---------------------- | ---------------------------- |
| `npm run dev`          | 開発サーバを起動             |
| `npm run build`        | 本番ビルド                   |
| `npm run start`        | 本番サーバを起動             |
| `npm run lint`         | ESLint                       |
| `npm run typecheck`    | 型チェック（`tsc --noEmit`） |
| `npm run format`       | Prettier で整形              |
| `npm run format:check` | Prettier の整形チェック      |

## ディレクトリ構成（骨組み）

設計書 `docs/14 §3` の目安構成に沿った骨格のみを用意している（中身は後続 Issue で実装）。

```text
app/                 画面（5空間ナビは Issue #4 で実装）
lib/
  db/                Prisma（Issue #2）
  ai/                Claude API ラッパ（Issue #19）
  domain/            Entry/Task/状態遷移（Issue #3, #10）
  integrations/      外部連携 / Calendar（Issue #13）
prisma/              Prisma schema（Issue #2）
```
