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
