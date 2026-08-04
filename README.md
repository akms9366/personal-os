# Personal OS

「自分専用の Personal OS」の実装リポジトリ。

設計の唯一の正本（SSOT）と Issue 管理は
[`personal-os-design`](https://github.com/akms9366/personal-os-design) で行う。
本リポジトリは実装コードのみを保持する。

## 技術スタック

- Next.js（App Router）+ TypeScript
- Tailwind CSS
- ESLint / Prettier
- Prisma + SQLite（ローカル DB）

## 起動手順

```bash
npm install
cp .env.example .env   # DATABASE_URL を設定
npm run db:generate    # Prisma Client 生成
npm run db:migrate     # DB 作成 + マイグレーション適用（seed も実行される）
npm run dev
```

開発サーバ起動後、http://localhost:3000 にアクセスする。

> 注: `npm install` 時にインストールスクリプトがブロックされる環境では、
> Prisma Client が自動生成されないため `npm run db:generate` を明示的に実行する。

### データベース

- ローカル DB は SQLite（`prisma/dev.db`、gitignore 済み）。
- スキーマは `prisma/schema.prisma`。`Entry`（原情報）モデルを定義。
- データ確認: `npm run db:studio`（Prisma Studio）。

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
| `npm run db:generate`  | Prisma Client 生成           |
| `npm run db:migrate`   | マイグレーション（＋seed）   |
| `npm run db:seed`      | seed 投入                    |
| `npm run db:studio`    | Prisma Studio 起動           |

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
