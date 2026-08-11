# Development Log

---

## 2026-08-02

### Issue #1

#### 概要

プロジェクト初期化（Next.js + TypeScript + Tailwind + Lint）。開発を翌日から開始できる土台を構築した。

- 対応 Issue: [personal-os-design#1](https://github.com/akms9366/personal-os-design/issues/1)
- Pull Request: [personal-os#1](https://github.com/akms9366/personal-os/pull/1)（merge commit `e96b151`）
- Commit 一覧（feature ブランチ `feature/issue-001-project-init`）:
  - `5e4002f` feat: initialize Next.js app with TypeScript and Tailwind
  - `f80ab81` chore: configure prettier
  - `82bf4ff` chore: scaffold lib and prisma skeleton directories
  - （リポジトリ初期化: `0ae5c49` chore: initialize repository）

#### 追加

- Next.js（App Router）+ TypeScript + Tailwind CSS の初期化一式
- ESLint（`eslint-config-next`）+ Prettier（`prettier-plugin-tailwindcss`）設定
- npm スクリプト: `typecheck`（`tsc --noEmit`）/ `format` / `format:check`
- ディレクトリ骨組み（`docs/14 §3` 準拠、中身は空）:
  `lib/db` / `lib/ai` / `lib/domain` / `lib/integrations` / `prisma`
- README（起動手順・スクリプト一覧・構成説明）
- 本 Development Log（`docs/Development_Log.md`）

#### 変更

- `app/page.tsx`: create-next-app 既定のマーケティングページ → Personal OS の最小プレースホルダへ置換
- `app/layout.tsx`: `metadata`（title/description）を Personal OS へ変更
- テンプレ付随ファイル `AGENTS.md` / `CLAUDE.md` を削除（スコープ外のため）

#### 設計判断

- **設計リポジトリと実装リポジトリを分離した理由**:
  設計リポジトリ [`personal-os-design`](https://github.com/akms9366/personal-os-design) の README は「このリポジトリは設計の唯一の正本（SSOT）であり、実装コードは置かない」と宣言している。一方 Issue #1 は Next.js アプリの初期化であり、両者は同一リポジトリ内で両立しない。設計 SSOT の役割を保つため、実装は新規リポジトリ [`personal-os`](https://github.com/akms9366/personal-os) に分離した。設計内容そのものは変更していない。Issue 管理は引き続き `personal-os-design` で行う。
- **完了条件のみに集中**: Issue #2 以降（Prisma スキーマ・状態区別コア・5空間ナビ・認証・Settings 等）には着手せず、`lib/` `prisma/` は空の骨組み（`.gitkeep`）のみとした。段階的導入（設計 P8）に沿い、土台→原情報→行動→統合→AI の順で積み上げる。
- **今後の開発ルール**（本プロジェクトの合意事項）:
  1. 設計書（`personal-os-design`）を唯一の正本（SSOT）とし、設計変更は勝手に行わず必ず相談する。
  2. `main` へ直接コミットしない。1 Issue = 1 Feature Branch = 1 Pull Request = 1 Review。
  3. Issue のスコープ外は変更しない。常にビルド可能な状態を維持する。
  4. コミットは Conventional Commits。
  5. すべての Issue で本 Development Log を更新し、「何を作ったか」だけでなく「なぜその設計判断をしたか」を必ず残す（長期保守の資産）。Issue #2 以降はログ更新を各 Issue の feature PR に含める。

#### 学び

- `create-next-app` は対象ディレクトリに `README.md` 等の既存ファイルがあると競合エラーになる。初期 `main` の README は一時退避してから scaffold した。
- 設計と実装で「リポジトリの役割宣言」が衝突する場合、実装を止めて配置方針を合意することが、SSOT を壊さない最短路だった。
- ローカル単一環境・自分専用の前提でも、Git 運用（ブランチ/PR/レビュー）を最初から徹底することで、後続 Issue の履歴と来歴が追える。

#### 次回

Issue #2「DB 基盤と Entry（原情報）スキーマ」。Prisma + SQLite を導入し、原情報（S1）の正本となる `Entry` モデルを定義する（`lib/db` / `prisma/` を実装）。原情報の不変前提（更新は新レコード方針）をコメントで明記する。

---

## 2026-08-03

### Issue #2

#### 概要

DB 基盤と Entry（原情報）スキーマ。原情報（Original Information / State Taxonomy S1）を保存できる土台を構築した。今回のスコープは **Entry モデルのみ**。

- 対応 Issue: [personal-os-design#2](https://github.com/akms9366/personal-os-design/issues/2)
- Pull Request: [personal-os#3](https://github.com/akms9366/personal-os/pull/3)（**レビュー待ち・未 Merge**）
- Commit 一覧（feature ブランチ `feature/issue-002-db-entry-schema`）:
  - `d582457` feat: set up Prisma with SQLite and Entry schema
  - `5413e0c` feat: add Prisma client singleton for DB foundation
  - （docs: 本ログと README の DB セットアップ手順）

#### 追加

- Prisma + SQLite 導入（`@prisma/client` / `prisma` を 6.19.3 に固定、seed 実行用に `tsx`）
- `prisma/schema.prisma`: `Entry` モデル（`id, kind[note|journal|bookmark], body, createdAt, source`）
- 初回 migration `20260802150011_init_entry`
- `prisma/seed.ts`: 最低限の seed（note / journal / bookmark 各1件、冪等）
- `lib/db/client.ts`: Prisma Client シングルトン（DB 基盤）
- npm スクリプト: `db:generate` / `db:migrate` / `db:seed` / `db:studio` と `package.json#prisma.seed`
- `.env.example`、`.gitignore` に SQLite DB ファイルと `!.env.example`
- README に DB セットアップ手順・スクリプトを追記

#### 変更

- 骨組みの `prisma/.gitkeep` / `lib/db/.gitkeep` を実ファイルへ置換（削除）

#### 設計判断

- **Entry のみ・状態区別は Issue #3**: 設計（`06 §3` / `State_Taxonomy` S1）に沿い、Entry は原情報の正本とする。`origin` / `state` / 来歴参照（`sourceEntryId`）と「AI は原情報を書き換えない」ガードは Issue #3 の責務であり、本 Issue では実装しない。State / Knowledge / Interpretation / Insight / Suggestion も対象外。
- **原情報の不変性**: 変更を暗示する `updatedAt` を持たせず、「修正は新版生成」を schema コメントに明記（`14 §11` / `State_Taxonomy §3` S1 / `06 §7`）。
- **`kind` は enum でなく String**: SQLite は Prisma の enum を非対応のため、`kind` を String とし許容値（`note|journal|bookmark`）をコメントで明示、値の検証はドメイン層（Issue #3+）に委ねる。`06` は物理型を定めない方針のため、これは設計変更ではなく物理設計上の対応。
- **Prisma 6.x を採用（7 ではない）**: Prisma 7 は新しい `prisma-client` generator（`output` 必須・生成フォルダ管理）が既定で構成が複雑になる。安定・標準的な `@prisma/client` + `prisma-client-js` の 6.19.3 を固定した。Prisma 7 への移行は将来課題。
- **`source` は必須**: 原情報は出所（Source）・時点を伴う（`Glossary`: Original Information）。AI を Source としない。
- **`id` は `cuid()`**: 不変・非連番の識別子が原情報レコードに適する。
- **seed runner は `tsx`**: TS の seed を安定実行するため。`package.json#prisma` の seed 設定は Prisma 7 で deprecated 警告が出るが 6 では正常動作。

#### 今後への影響

- Issue #3（状態区別コア）は本 Entry に `origin` / `state` / `sourceEntryId` を**追加する形**で拡張する（Entry を作り直さない）。不変性ガードもドメイン層（`lib/db` / `lib/domain`）に載せる。
- `lib/db/client.ts` のシングルトンを以後の全 DB アクセスの共通入口とする。
- `npm install` がインストールスクリプトをブロックする環境では Prisma Client が自動生成されない。README に `npm run db:generate` を明示し、クローン後の再現性を担保した。

#### 学び

- SQLite × Prisma では enum が使えないため、種別は String＋アプリ層検証が定石。設計が物理型を縛っていないおかげで摩擦なく対応できた。
- 新しめの npm はインストールスクリプトを保留する。Prisma Client 生成を明示スクリプト化しておくと環境差に強い。
- Entry を不変前提で設計しておくと、Issue #3 の来歴・状態区別を「追記」で自然に載せられる。

#### 次回

Issue #3「状態区別コア（origin / state / 来歴参照）」。Entry に `origin[human|ai|external]` / `state`（軽量 enum 相当）/ `sourceEntryId` を追加し、`lib/domain` に「AI は原情報を書き換えない」ガードを実装、Vitest で不変条件を担保する。

---

## 2026-08-05

### Issue #3

#### 概要

状態区別コア（origin / state / 来歴参照）。原情報・AI派生・利用者決定を**データレベルで区別**し、派生が原情報へ辿れる不変条件をコードで固定した。Personal OS の同一性を決める設計の核（P3 来歴）。

- 対応 Issue: [personal-os-design#3](https://github.com/akms9366/personal-os-design/issues/3)
- Pull Request: [personal-os#4](https://github.com/akms9366/personal-os/pull/4)（**レビュー待ち・未 Merge**）
- Commit 一覧（feature ブランチ `feature/issue-003-state-core`）:
  - `0513e95` feat: add origin/state/sourceEntryId to Entry (state core)
  - `432df09` feat: add domain guards for Entry state and provenance invariants
  - `3f2d002` test: add vitest and Entry invariant tests
  - （docs: 本ログ）

#### 追加

- `Entry` フィールド: `origin`（default `human`）/ `state`（default `S1`）/ `sourceEntryId`（自己参照リレーション `EntryProvenance`）
- 2本目 migration `20260804215713_add_origin_state_provenance`
- `lib/domain/entry.ts`: 値域の SSOT（`ORIGINS` / `STATES` / `KINDS` と union 型、判定関数）
- `lib/domain/guard.ts`: 純粋関数ガード（`validateEntryInvariants` / `assertAiCannotWriteOriginal` / `assertOriginalImmutable` / `EntryInvariantError`）
- Vitest 一式（`vitest` devDep、`vitest.config.mts`、`test` / `test:watch` スクリプト）と `lib/domain/guard.test.ts`（13 ケース）
- seed に来歴検証用の派生サンプル1件（`origin=ai, state=S2, sourceEntryId=元Entry`）

#### 変更

- `prisma/schema.prisma`: Entry モデル拡張とコメント更新（単一 Entry モデル方式を明記）
- `prisma/seed.ts`: 既存3件に `origin/state` を明示付与
- 骨組み `lib/domain/.gitkeep` を実ファイルへ置換（削除）

#### 設計判断

- **単一 Entry モデル方式を採用**: origin/state/sourceEntryId を Entry に持たせ、派生専用モデル（Interpretation/Suggestion/Decision）は作らない。理由は `14 §2` が採用した軽量フィールド方式を優先するため。`06` は概念モデルで物理設計を下流に委ねており（§1）、単一 Entry は正当な物理具体化で設計変更ではない。#20/#21 の派生も同じフィールドで表現できる。
- **`state` は S1/S2/S4/S5 を先に定義**: 語彙を一度で固定し #20/#21 での churn を回避。実データは当面 S1 のみ、検証用に S2 を1件のみ使用。
- **origin/state は String（enum 不使用）**: SQLite が Prisma enum 非対応（#2 の `kind` 判断を継承）。値域検証は `lib/domain`。
- **ガードは純粋関数（DB 非依存）**: テストが DB を要求せず高速。全書込み経路がこのガードを通す規約とし、実書込み時の適用は #7 以降で行う。#3 は関数＋テストで不変条件を確立。
- **`sourceEntryId` は nullable＋条件付き必須**: 「派生なら必須／原情報なら null」は単純 NOT NULL で表せないためドメイン＋テストで担保。
- **原情報の不変性**: `assertOriginalImmutable` で S1 の in-place 更新を禁止（修正は新版生成、`06 §9`）。
- **System origin を Entry から除外**: S6/S7 実行系（#10/#21）で登場するため Entry の origin には含めない。
- **完了条件「AI は原情報を更新不可」**: `assertAiCannotWriteOriginal` を核として Vitest で担保。

#### 今後への影響

- #7（Quick Capture）は `Entry(origin=human, state=S1)` を、#20 は `origin=ai, state=S2, sourceEntryId` を、#21 は `state=S4/S5` を生成する際に本フィールドとガードを消費する。
- **書込み経路はドメインガード経由に統一**する規約を確立（prisma を直接叩かない）。実際の write ラッパは各書込み Issue で `lib/db` 上に載せる。
- Issue #4（レイアウトと5空間ナビ）は #3 に依存しない独立 UI（#1 依存）。#3 の成果を直接受け継ぐのは #7/#10/#20/#21。

#### 学び

- SQLite の FK 追加は ALTER 不可のため、Prisma migrate はテーブル再定義（新テーブル作成→コピー→リネーム）で対応する。既存 seed 行は default で保全された。
- ガードを Prisma から切り離して純粋関数にすると、DB を立てずに設計の核を高速・確実にテストできる。来歴（派生→原情報）は seed の実データ＋include クエリでも確認した。

#### 次回

Issue #4「レイアウトと5空間ナビ」。主ナビ5タブ（Home / Insights / Knowledge / Finance / Settings、`05 §9.1` 順）を用意し Home のみ実装、他はスタブ。外部サービス名をタブにしない（`05 §9.4`）。#1 依存で #3 とは独立。
