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

---

## 2026-08-12

### Issue #4

#### 概要

レイアウトと5空間ナビゲーション。Personal OS の**画面骨格**（5 Space の主ナビ＋共通シェル＋各 route）を用意した。機能は載せず、「今後の機能を載せられる UI の骨格」を成立させることに範囲を限定する。

- 対応 Issue: [personal-os-design#4](https://github.com/akms9366/personal-os-design/issues/4)
- Pull Request: [personal-os#5](https://github.com/akms9366/personal-os/pull/5)（**レビュー待ち・未 Merge**）
- 前提: [personal-os#4](https://github.com/akms9366/personal-os/pull/4)（Issue #3）は Merge 済み（merge commit `0ef96ba`）。本 Issue は #3 と独立で #1 のみに依存。
- feature ブランチ: `feature/issue-004-layout-navigation`

#### 目的

5 Space（Home / Insights / Knowledge / Finance / Settings）を利用者が移動できる状態にする。各 Space の本格機能は実装せず、共通ナビゲーションと最小のページ骨格を用意する（`05 §9.1`）。

#### 追加

- `lib/navigation/spaces.ts`: 5 Space の**唯一の定義元**（`SPACES` 配列＋`spaceHref` / `getSpace`）。順序・ラベル・役割・実装状態（active/stub）を一元管理。
- `components/navigation/SpaceNav.tsx`（Client）: 主ナビ。`variant`（sidebar / bottom）で見た目のみ切替え、順序・現在地判定・リンク先は共通化。`usePathname` で現在地を `aria-current="page"` と背景で表現。
- `components/layout/SpaceScaffold.tsx`: 各ページ共通の骨格（見出し＋役割＋本文領域 or「準備中」）。
- `app/(app)/layout.tsx`: アプリシェル（PC 左サイドバー / モバイル下部固定バー）。route group `(app)` で URL を汚さず 5 Space に共通シェルを適用。
- `app/(app)/{home,insights,knowledge,finance,settings}/page.tsx`: 5 route。Home のみ実ページ（最小プレースホルダ）、他4はスタブ。

#### 変更

- `app/page.tsx`: ルート `/` を `/home` へ `redirect`（従来の "Personal OS" 中央表示を置換）。

#### route 設計

- `/` → `/home` へ redirect。Home も他 Space と同じく `/home` で addressable にし、経路を一貫させる（特別扱いの root ページを持たない）。
- 5 Space = `/home` `/insights` `/knowledge` `/finance` `/settings`。
- route group `(app)` に 5 Space をまとめ、共通シェル（`(app)/layout.tsx`）を一括適用。複雑な routing は導入しない。
- ビルドで全 route が静的 prerender されることを確認（`○ (Static)`）。

#### navigation 設計

- 主タブは 5 Space のみ・固定順序（`05 §9.1`：利用頻度と意思決定の順序）。PC/モバイルで順序と意味を変えない（`05 §9.3`）。
- 現在地表示: アクティブタブに `aria-current="page"` と背景ハイライト。
- **Quick Capture / Search は主タブに含めない**（`05 §9.1` の横断能力。後続 Issue）。
- **外部サービス名・AI提供者名を主ナビにしない**（`05 §9.4`）。ラベルは目的ベースの空間名のみ。
- アイコンライブラリを導入せず、テキストラベルのみで構成。

#### responsive 対応

- PC（`md` 以上）: 左サイドバー（縦ナビ＋アプリ名）＋右本文。
- モバイル（`md` 未満）: サイドバー非表示、下部固定バー（横ナビ5項目）。本文は下部バー分の余白（`pb-16`）を確保。
- 検証（dev サーバ 3100）: 1280px でサイドバー表示・下部バー非表示、375px でサイドバー非表示・下部バー全幅固定・横スクロールなしを確認。コンソールエラーなし。

#### 設計 SSOT との整合

- `05 §9.1` 主ナビ順に一致（Home→Insights→Knowledge→Finance→Settings）。
- `05 §9.4` 禁止事項を遵守（外部サービス名を主ナビにしない／管理設定を前面に出しすぎない）。
- 各 Space の `purpose` 文言は `05 §9.1` の一言要約に準拠。
- `99_Reference/Module_Layer_Space_Mapping.md §4` の 5 Space 逆引きと Space 名・粒度が一致。

#### 今回実装しなかった範囲（＝なぜここまでか）

Issue #4 の完了条件は「5タブ遷移／モバイルで崩れない／外部サービス名がタブでない」の3点のみ。骨格 Issue のため、各 Space の**中身**は範囲外とし、後続 Issue の責務を先取りしない：

- Home の現在地／今日／振り返り（#15/#16/#17/#18）→ 空プレースホルダのみ。
- Quick Capture（#7）/ Inbox（#8）/ Journal（#9）/ Task（#10）/ Calendar（#13/#14）→ 未実装。
- Settings 実機能（#6）、認証（#5）、AI（#19〜#22）、DB 連携、Finance 機能 → 未実装。
- スタブ4空間は「準備中」表示のみ。

#### 技術的判断

- **単一定義元（`lib/navigation/spaces.ts`）**: 順序・語彙のドリフトを防ぎ、nav とページで共有。将来の Space 追加・文言変更を1箇所に閉じる。
- **route group `(app)` ＋共通 `SpaceScaffold`**: レイアウトとページ骨格を共通化しつつ、過剰な UI フレームワーク化・巨大抽象化は避ける（`13` 方針）。
- **1コンポーネント×variant のナビ**: PC/モバイルで現在地判定ロジックを重複させない。
- **`redirect('/home')`**: root を Home に寄せる最小実装。中間ダッシュボードを作らない。
- **スタイルは既存の zinc パレット＋既存 dark mode（`prefers-color-scheme`）に追従**。新テーマシステムやブランドデザインは導入しない。

#### 問題・制約

- `app/globals.css` の `body { font-family: Arial }` が geist フォント変数を上書きしている既存挙動は本 Issue の範囲外として温存（フォント統一は別途）。
- 画面の視覚スクリーンショットはプレビューペイン非表示のため取得できず、`read_page` / computed CSS / DOM 計測でレイアウト・現在地・レスポンシブ・オーバーフローを検証した。
- モバイルナビはテキストのみ・最小限。アイコンや凝ったモバイル専用 UI は意図的に未実装。

#### 今後への影響

- 各 Space ページは `SpaceScaffold` の本文領域に機能を載せていける（#6 Settings、#7 Quick Capture、#15〜#18 Home 領域 等）。
- Space を増やす場合は `SPACES` に1エントリ追加すれば nav・route 方針が揃う（ただし主タブ5つ上限は `05 §9.2` を尊重）。
- Quick Capture / Search（横断能力）は主タブではなく別入口として後続 Issue で追加する前提を骨格に明示済み。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 13/13 成功（Issue #3 の不変条件テストを維持）/ `npm run build` 成功（5 Space ＋ `/` を静的 prerender）。

---

## 2026-09-27

### Issue #5

#### 概要

単一ユーザー認証。自分だけがアクセスできるように、全画面を保護する。`14 §3` の決定（環境変数パスワード or NextAuth Credentials）のうち、**環境変数パスワード＋自前の署名付きセッション Cookie** を採用し、NextAuth 等の追加依存は導入しなかった。

- 対応 Issue: [personal-os-design#5](https://github.com/akms9366/personal-os-design/issues/5)
- Pull Request: personal-os#6（作成予定）
- feature ブランチ: `feature/issue-005-auth`
- 前提: Issue #4（PR #5）は本セッション内で Merge 済み（merge commit `9b4c69a`）。設計リポ Issue #4 も Close 済み。

#### 追加

- `lib/auth/session.ts`: パスワード検証（`verifyPassword`, 定数時間比較）とセッショントークンの発行・検証（`createSessionToken` / `verifySessionToken`）。Web Crypto API（`crypto.subtle`）のみで実装し、Node 専用 API（`Buffer` 等）を使わない。Edge runtime（`proxy.ts`）と Node runtime（Server Action）の両方から同一ロジックを利用できる。
- `proxy.ts`（Next.js 16 の新命名規約。旧 `middleware.ts` は非推奨）: `/login` を除く全画面を保護。未認証は `/login?next=<元のパス>` へリダイレクト。
- `app/login/page.tsx` / `LoginForm.tsx` / `actions.ts`: ログイン画面。React 19 の `useActionState` でエラー表示（「パスワードが違います。」）。Server Action がパスワード照合しセッション Cookie（HttpOnly, SameSite=Lax, 本番のみ Secure, 30日）を発行、`next` パラメータの遷移先へ `redirect`。既にログイン済みで `/login` を開いた場合は `/home` へ即リダイレクト。
- `.env.example`: `AUTH_PASSWORD` / `AUTH_SESSION_SECRET` を追記（値はプレースホルダ）。

#### 設計判断

- **NextAuth を導入しない**: `14 §3` はどちらでも良いとしていたが、単一ユーザー・パスワード1個のためだけに NextAuth（プロバイダ抽象化・DB アダプタ等）を入れるのは「シンプル・保守しやすい」（`14 §1` 判断基準の2/3位）に反する。Web Crypto ベースの最小実装（約120行）で完了条件を満たせるため、追加依存ゼロで実装した。
- **セッションは HMAC 署名付き Cookie（サーバ側ストアなし）**: 自分専用・単一セッションのため、DB にセッションテーブルを持つ必要はない。`AUTH_SESSION_SECRET` の HMAC-SHA256 で署名し、Cookie 単体の署名検証だけで真正性と有効期限（30日）を確認する。秘密鍵未設定時は fail closed（誰も認証できない）。
- **パスワードは平文の環境変数比較**: 単一ユーザー・ローカル優先（`14 §3` 保存方式決定）のため、ハッシュ化・ソルト等は過剰実装と判断。`.env*` は既に `.gitignore` 済みで平文値がリポジトリに入る経路はない。
- **`middleware.ts` ではなく `proxy.ts`**: 実装中に Next.js 16.2.12 のビルドが `middleware` ファイル規約の非推奨化を警告したため（https://nextjs.org/docs/messages/middleware-to-proxy）、現行バージョンの正式な規約に合わせて `proxy.ts` ＋ `export function proxy` を採用。Issue #5 のスコープ内の実装詳細として、ユーザー確認なしで判断した。
- **`next` リダイレクトパラメータ**: 完了条件には明記されていないが、認証を挟んでも元の遷移先に戻れることは実務利用上ほぼ必須の挙動であり、実装コストも小さいため含めた。

#### 今後への影響

- Epic2 以降（Quick Capture 等）で新設する API Route / Server Action は、`proxy.ts` の matcher（`_next` 静的アセット・`favicon.ico`・`login` 以外の全パス）に自動的に含まれるため、個別に認証チェックを書かなくても保護される。
- ログアウト機能は本 Issue の完了条件（未認証→リダイレクト／認証後→アクセス可）に含まれないため未実装。必要になれば Settings 骨格（#6）実装時に検討する。
- Settings 骨格（#6）で「AI & Automation」等の設定 UI を作る際、認証保護は本 Issue の `proxy.ts` がすでに適用範囲としてカバーする。

#### 問題・制約

- パスワード変更・忘却時の復旧手段は UI になし（`.env` を直接書き換える運用を前提とする）。自分専用ローカル運用のため許容。
- セッション有効期限は固定30日でハードコード。設定画面での可変化は将来必要になれば対応。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 13/13 成功（既存の状態区別コアテストに影響なし）/ `npm run build` 成功（`/login` のみ動的、他は静的）。
- dev サーバ（3100）で実挙動確認: 未認証で `/insights` へ直接アクセス→`/login?next=%2Finsights` へリダイレクト／誤パスワードでエラー表示／正パスワードで `/insights`（元の遷移先）へ復帰／認証済みで `/login` 再訪問時は `/home` へ即リダイレクト。コンソールエラーなし。

---

## 2026-09-27（続き）

### Issue #6

#### 概要

Settings 骨格。`05 §8` の制御面のうち、`14 PR-06` が確定した MVP スコープ（4枠：Intent & Preferences / Connections / AI & Automation / Data & Privacy）の器を用意し、実際に機能するのは「AI & Automation」（API キー・モデルの保存）のみとした。

- 対応 Issue: [personal-os-design#6](https://github.com/akms9366/personal-os-design/issues/6)
- Pull Request: personal-os#7（作成予定）
- feature ブランチ: `feature/issue-006-settings-skeleton`
- 前提: Issue #4（PR #5）・Issue #5（PR #6）は本セッション内で Merge 済み。

#### 追加

- `prisma/schema.prisma`: `Settings` モデル（シングルトン、`id="singleton"` 固定）。`aiApiKey`（nullable, 平文保持）・`aiModel`（既定 `claude-sonnet-5`）・`updatedAt`。migration `20260927020620_add_settings`。
- `lib/settings/store.ts`: `getSettings()`（マスク済みビューを返す。生のキーはこの層から外へ出さない）／`updateAiSettings()`（空欄保存で既存キーを消さないようガード）。
- `app/(app)/settings/actions.ts`: 保存 Server Action（`useActionState` 用の状態を返す）。
- `app/(app)/settings/AiSettingsForm.tsx`（Client）: モデル入力＋API キー入力（`type=password`、`placeholder` にマスク済み値、空欄=変更なし）。
- `app/(app)/settings/page.tsx`: 4枠のレイアウト。AI & Automation 以外は「今後実装します」の一言スタブ（Issue #4 の Space スタブと同じ思想）。

#### 変更

- `lib/navigation/spaces.ts`: `settings` の `status` を `"stub"` → `"active"` に変更（Settings 空間は Issue #6 で実装完了のため、5空間ナビ骨格のスタブ扱いを終了）。

#### 設計判断

- **Settings は Entry モデルに乗せない**: `06_Data_Model.md §7 Ownership` と `Module_Layer_Space_Mapping.md §4`（Settings & Consent は Trust & Runtime Foundation 層）により、Settings は原情報（S1）ドメインと別概念と判断。Entry の origin/state/sourceEntryId 不変条件をこじつけて流用せず、専用の `Settings` シングルトンテーブルを新設した。
- **4枠のうち機能するのは AI & Automation のみ**: `14 PR-06` の完了条件（設定の保存・読込／APIキー非表示）が要求するのはこの1枠のみ。Intent & Preferences・Connections・Data & Privacy は対応する機能自体がまだ存在しない（各後続 Issue が実装）ため、Issue #4 のスタブ空間と同じ「今後実装します」の一言に留め、偽の保存 UI を作らなかった（過剰実装回避）。
- **API キーは DB に平文保持、画面表示のみマスク**: 完了条件は「画面に平文で出ない」であり、保存時の暗号化までは要求していない。ローカル優先 SQLite（`14 §3`）はすでに Entry 等の原情報を保持する信頼境界であり、Settings だけ別途暗号化基盤を足すのは `14 §2` の簡素化方針（監査・暗号化基盤は落とす）に反する。`getSettings()` がサーバ層で末尾4桁のみのマスク文字列に変換し、生の値をクライアントへは一切渡さない設計で完了条件を満たした。
- **空欄保存で既存キーを消さない**: `updateAiSettings` は API キー欄が空なら既存値を保持する。モデル名だけを変更したい場合にキーを消してしまう事故を防ぐ（UI ミス耐性）。
- **`server-only` パッケージは導入しない**: 未インストールの新規依存を避けるため見送り。Prisma Client は元々サーバ専用の前提で、クライアントバンドルに混入すればビルド時に破綻するため実害はない。

#### 今後への影響

- Issue #13（Google Calendar 接続）は Connections 枠に実データを追加する形で拡張する。
- Issue #19（Claude API サーバ統合）は `lib/settings/store.ts` の `getSettings()` からモデル名・API キーを読む消費者になる想定。
- Intent & Preferences・Data & Privacy は MVP 対象外機能（`14 §4` Won't/将来）に対応するため、現時点でスキーマを先取りしない。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 13/13 成功（既存テストに影響なし）/ `npm run build` 成功。
- dev サーバで実挙動確認: API キー入力→保存→マスク表示（末尾4桁）に反映／ページリロード後も保存値が読み込まれる／レンダリング後の HTML に平文キーが含まれないことを `document.documentElement.outerHTML` で確認。コンソールエラーなし（HMR の WebSocket 警告のみ、プレビュー環境起因で無関係）。

---

## 2026-09-27（続き2）

### Issue #7

#### 概要

Quick Capture 入口。Personal OS の日中ループの中心（`11 §5`）。どの画面からも1操作で開き、分類を一切求めず原情報（S1）として即記録する。Issue #3 で確立した「全書込みはドメインガード経由」の規約を、実際の書込み経路として初めて適用した。

- 対応 Issue: [personal-os-design#7](https://github.com/akms9366/personal-os-design/issues/7)
- Pull Request: personal-os#8（作成予定）
- feature ブランチ: `feature/issue-007-quick-capture`
- 前提: Issue #4（PR #5）・Issue #3（PR #4）は Merge 済み（依存関係どおり）。

#### 追加

- `lib/db/entries.ts`: `createEntry()` — Entry 書込みの唯一の入口。`prisma.entry.create` を直接呼ばず、必ず `lib/domain/guard.ts` の `validateEntryInvariants` を通してから書き込む。Issue #3 の Development Log で予告した「実際の write ラッパ」をここで実装。
- `lib/capture/actions.ts`: `saveQuickCapture` Server Action。入力必須のみ検証し、常に `Entry(kind=note, origin=human, source="quick-capture")` を生成（分類 UI は一切持たない）。
- `components/capture/QuickCapture.tsx`（Client）: フローティングボタン＋モーダル。グローバルショートカット `c`（入力中・修飾キー押下時は無視）で開き、`Escape` で閉じる。`Cmd/Ctrl+Enter` で送信。保存成功後はフォームをリセットして入力欄にフォーカスを戻し、モーダルは開いたまま連続記録できるようにした。
- `app/(app)/layout.tsx`: `<QuickCapture />` を追加し、5 Space 共通シェルに組み込むことで全画面から到達可能にした。

#### 設計判断

- **Quick Capture は主タブに追加しない**: `05 §9.1`／`11 §5` により横断能力として扱い、5空間ナビ（`lib/navigation/spaces.ts`）とは別に共通シェルへ直接組み込んだ。ナビの定義元を汚さない。
- **分類 UI を一切持たない**: Issue #7 の完了条件は常に `kind=note` を生成すること。将来の `kind=journal`（#9）・タスク化（#12）は利用者の明示操作による別経路であり、Quick Capture 自体に分類選択を持たせると「分類を強制しない」（`11 §5` 必ず守ること）という原則にかえって反する。
- **`lib/db/entries.ts` を新設し、Prisma を直接叩かない**: Issue #3 で確立した規約の実適用。将来の書込み経路（Inbox 編集 #8、Journal #9、タスク化 #12 等）もこの層に関数を追加していく前提。
- **保存成功後もモーダルを閉じない**: 「思いついたことをすぐ残す」体験（`11 §5`）を最大化するため、都度モーダルを開き直す手間を無くし、連続入力を主要フローとして設計した。
- **ショートカットキーは `c`**: 設計は具体キーを指定していないため、単一文字・修飾キー不要の一般的な "compose" 慣習（Gmail/Linear 等）を採用。入力中の要素にフォーカスがある場合は発火しないようガードした。

#### 今後への影響

- `lib/db/entries.ts` は Inbox（#8: 一覧・編集・削除）、Journal（#9: kind=journal 生成）、Quick Capture → Task 化（#12: 派生生成時のガード呼び出し）が今後利用する共通基盤になる。
- Quick Capture で生成した Entry は現時点でどの画面にも一覧表示されない（Inbox は #8 で実装）。本 Issue の完了条件は「保存できること」のみのため、閲覧 UI は意図的にこの Issue の範囲外とした。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 13/13 成功（既存テストに影響なし。`createEntry` 自体は薄い書込みラッパのため DB 統合テストは追加せず、ブラウザでの実書込み確認で担保）/ `npm run build` 成功。
- dev サーバで実挙動確認: `/knowledge` など任意の画面で `c` キー押下→モーダルが開く／`Ctrl+Enter` で送信→保存成功メッセージ表示・入力欄クリア・モーダルは開いたまま／連続で2件目を記録→`Escape` で正常に閉じる／DB を直接クエリし、生成された Entry が `kind=note, origin=human, state=S1, source=quick-capture, sourceEntryId=null` であることを確認（検証用データはテスト後に削除）。コンソールエラーなし（HMR警告のみ）。

---

## 2026-09-27（続き3）

### Issue #8

#### 概要

Inbox（受信箱）一覧。Quick Capture で溜めた原情報を見返し・編集（新版生成）・削除できるようにした。`05 §6 Knowledge` の主な入口「BrainDump」に対応する MVP の実体として、Knowledge 空間（Issue #4 ではスタブ）を初めて active 化した。

- 対応 Issue: [personal-os-design#8](https://github.com/akms9366/personal-os-design/issues/8)
- Pull Request: personal-os#9（作成予定）
- feature ブランチ: `feature/issue-008-inbox`
- 前提: Issue #7（PR #8）Merge 済み。

#### 追加

- `prisma/schema.prisma`: Entry に `revisesEntryId`（自己参照、`EntryRevision`）を追加。「この Entry は revisesEntryId の新版である」を表す、`sourceEntryId`（派生の来歴）とは別概念のフィールド。migration `20260927040426_entry_revision_and_restrict_delete`。
- `lib/domain/guard.ts`: `assertRevisionTargetIsOriginal` — 「修正は新版生成」の対象を原情報（S1）のみに限定するガード。テスト3件追加（16/16 pass）。
- `lib/db/entries.ts`: `listCurrentEntries()`（`state=S1` かつ `revisedBy` が空 = 現在版の原情報のみ）／`reviseEntry()`（新版生成、旧版は一切更新しない）／`deleteEntry()`（派生・改訂履歴がある場合は削除せず理由を返す）。
- `app/(app)/knowledge/{page.tsx,InboxItem.tsx,actions.ts}`: 一覧・インライン編集・削除（`window.confirm` で確認）。

#### 変更

- `prisma/schema.prisma`: **`sourceEntryId` の外部キーを `ON DELETE SET NULL` → `ON DELETE RESTRICT` に変更**（後述、PR #4 レビュー IMPORTANT 指摘への対応）。
- `lib/navigation/spaces.ts`: `knowledge` の `status` を `"stub"` → `"active"`。

#### 設計判断

- **`revisesEntryId` を `sourceEntryId` と別フィールドにした**: `sourceEntryId` は「派生（S2/S4/S5）が原情報を参照する」ための来歴であり、`validateEntryInvariants` が「原情報(S1)は sourceEntryId を持てない」と厳格に禁止している。同じ S1 同士の「新版」関係をこの来歴フィールドに乗せると、その不変条件と衝突する。物理的に別リレーションにすることで、Issue #3 の不変条件を一切変更せずに「新版生成」を追加できた。
- **Inbox 一覧は `state="S1"` に限定**: 実装中に、Issue #2 の seed に含まれる `state="S2"`（AI解釈サンプル）が一覧に混在して表示される不具合を実機検証で発見し、修正した。原情報とAI派生を同じ見た目で混在させないことは `05 §3.1` / P3 の中核であり、これを見逃すと Inbox が「原情報の受信箱」ではなくなる。Development Log にも重大な自己レビュー事項として明記する。
- **`sourceEntryId` の FK を `RESTRICT` に変更（PR #4 レビュー IMPORTANT #2 の解消）**: 従来の `ON DELETE SET NULL` は、親 Entry を削除すると派生の来歴が黙って失われる設計だった。Issue #8 で実際に削除機能を実装するにあたり、このタイミングで是正した。派生・改訂履歴を持つ Entry は削除できない仕様とし、アプリ層（`deleteEntry` の事前カウントチェック）と DB 層（FK RESTRICT）の二重で防御する。
- **削除の確認は `window.confirm()`**: `14 §2`「高影響操作の承認ラダーは作らず、確認ダイアログのみ」に従い、専用モーダルは作らずブラウザ標準の確認ダイアログで最小限に済ませた。
- **編集は新版生成、旧版は一切更新しない**: `06 §9`「原情報は不変」を厳密に守り、`reviseEntry` は既存レコードを一切 UPDATE せず、新しい Entry を `revisesEntryId` 付きで INSERT するだけ。一覧クエリが「現在版」を自動的に絞り込む。
- **`isDerivedState` 二値化（PR #4 レビュー IMPORTANT #1）は本 Issue では対応しない**: S0/S8 導入（Issue #17 Reflection）が前提のため、引き続き #17 着手前の対応事項として持ち越す。

#### 今後への影響

- Journal（#9）は `kind=journal` の Entry を同じ `createEntry`/`listCurrentEntries` 基盤の上に構築できる。
- Quick Capture → Task 化（#12）は、削除と同様に「派生・依存を持つ原情報をどう扱うか」の先例（RESTRICT・事前チェック方式）を踏襲できる。
- Inbox の「編集履歴を辿る」UI（旧版を遡って見る）は本 Issue の範囲外（完了条件は「現在版の編集が反映されること」のみ）。データは `revisesEntryId` チェーンとして残っているため、将来 Knowledge の来歴表示機能で拡張可能。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 16/16 成功（新規3件含む）/ `npm run build` 成功。
- dev サーバで実挙動確認: 一覧が新しい順で表示（`state=S2` サンプルは表示されないことを修正後に確認）／編集→新版として保存→一覧に新版のみ表示され旧版は隠れることを確認／DB 直接クエリで旧版が一切変更されず新版が `revisesEntryId` で正しく参照することを確認／派生・改訂履歴を持つ Entry への直接削除試行が DB 制約（`P2003`）でブロックされることを確認／アプリ層の事前チェック（件数カウント）が同じ判定を返すことを確認／依存のない Entry の作成→削除が成功することを `tsx` 経由の一時検証スクリプトで確認（検証後に削除、リポジトリに残存なし）。コンソールエラーなし（HMR警告のみ）。

---

## 2026-09-27（続き4）

### Issue #9

#### 概要

Journal 種別（時点保持）。内省・振り返りの原情報（S1）を明示的に残せるようにした。夜の振り返り領域（#17）が将来この土台の上に構築される。

- 対応 Issue: [personal-os-design#9](https://github.com/akms9366/personal-os-design/issues/9)
- Pull Request: personal-os#10（作成予定）
- feature ブランチ: `feature/issue-009-journal`
- 前提: Issue #7（PR #8）Merge 済み。

#### 追加

- `app/(app)/knowledge/actions.ts`: `saveJournalEntry` Server Action。常に `Entry(kind=journal, origin=human, source="journal", state=S1)` を生成。
- `app/(app)/knowledge/JournalForm.tsx`（Client）: Knowledge ページ上部の常設フォーム。保存成功後は入力欄をリセット。

#### 変更

- `app/(app)/knowledge/page.tsx`: `<JournalForm />` を Inbox 一覧の上に追加。案内文を「Quick Capture・Journal で残した記録の一覧」に更新。

#### 設計判断

- **専用の一覧・route は作らない**: Issue #8 で実装した Inbox 一覧（`listCurrentEntries()`）は kind を問わず全ての現在版の原情報を表示する汎用実装であり、`kind=journal` の Entry も kind バッジ付きでそのまま一覧に現れる。`05 §6` の Knowledge の責務「作成経路を問わず原情報へ戻れるようにする」に合致するため、Journal 専用の別画面・別フィルタを新設せず既存基盤を再利用した（過剰な抽象化・route の増殖を回避）。
- **Quick Capture とは別の入口として実装**: Issue #7 で「Quick Capture は分類UIを一切持たず常に kind=note」と決めたため、journal 作成はここで独立した小さなフォームとして追加した。両者は原情報の生成経路として並存する。
- **時点保持は Entry モデルの既定機能でそのまま満たす**: `createdAt` は `@default(now())` かつ不変（更新されない）ため、Journal 特有の追加実装は不要だった。

#### 今後への影響

- Issue #17（振り返り領域）は、本 Issue の `createEntry({ kind: "journal", ... })` 経路を土台に、夜の振り返り専用の入力導線（Home 空間からの導線・S8 相当の意味づけ）を追加する形で拡張する。現時点の Journal は state=S1（原情報）のみで、S8（振り返り状態）の区別は #17 で導入する。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 16/16 成功（既存テストに影響なし）/ `npm run build` 成功。
- dev サーバで実挙動確認: Journal フォームから記録→「記録しました。」表示・入力欄クリア／Inbox 一覧に `journal` バッジ付きで即座に反映／DB 直接クエリで `kind=journal, origin=human, state=S1, source=journal` と作成時点が正しく保持されていることを確認。コンソールエラーなし（HMR警告のみ）。

---

## 2026-09-27（続き5）

### Issue #10

#### 概要

Task モデルと CRUD。行動（タスク）を扱う土台。UI は持たず（今日のタスク view は #11）、モデルと CRUD 層のみを実装する。Epic 3 の最初の Issue。

- 対応 Issue: [personal-os-design#10](https://github.com/akms9366/personal-os-design/issues/10)
- Pull Request: personal-os#11（作成予定）
- feature ブランチ: `feature/issue-010-task-model`
- 前提: Issue #3（PR #4）Merge 済み。

#### 追加

- `lib/domain/task.ts`: `TASK_STATUSES`（todo/doing/hold/done）・`TASK_PRIORITIES`（low/medium/high、未設定=nullを許容）の値域 SSOT と型ガード。
- `prisma/schema.prisma`: `Task` モデル（`title, note, status, dueAt, priority, createdAt, originEntryId?`）。`originEntryId` は Entry への自己参照ではない通常の FK（`onDelete: Restrict`）。Entry 側に `originatedTasks Task[]` の逆参照を追加。
- migration `20260927042734_add_task`。
- `lib/db/tasks.ts`: `createTask`/`getTask`/`listTasks`/`updateTask`/`deleteTask`。Entry の `lib/db/entries.ts` と同じ「Prisma を直接叩かずこの層を経由する」規約に従う。

#### 変更

- **`lib/db/entries.ts` の `deleteEntry()` を修正**: Task 追加に伴い、`Task.originEntryId` で参照されている Entry も削除ブロック対象に加えた（後述、実装中に発見）。

#### 設計判断

- **Task は Entry と異なり不変にしない**: `06 §3.3` は Task を「状態・優先度・保留を持つ」利用者の行動記録と位置づけ、原情報（S1）の不変性とは別categoryである。`updateTask` は通常の in-place 更新を許可する（Entry の `assertOriginalImmutable` のような禁止ガードは設けない）。
- **status/priority は SQLite enum 非対応のため String + ドメイン層検証**（Issue #2/#3 の `kind`/`origin`/`state` と同じ判断を継承）。
- **priority は既定値を持たせず null を許容**: `11 §2`「優先順位を自動確定しない」ため、未設定を正規の状態として扱う。
- **`originEntryId` の FK も `onDelete: Restrict`**: Issue #8 で確立した「来歴を来歴ごと消さない」方針を Task にも一貫して適用。Quick Capture 由来のタスク（#12 で実装）が、元原情報の削除によって来歴を失うことを防ぐ。
- **本 Issue では UI を作らない**: 完了条件が「migration成功」「APIで作成・取得・更新・削除ができる」のみであり、実際の一覧・状態遷移 UI は Issue #11 の責務。UI を先取りしないことで Issue の境界を明確に保った。

#### 実装中に発見した問題と対応

- Task 追加により Entry に新しい被参照経路（`originEntryId`）が生まれたが、Issue #8 で実装した `deleteEntry()` の事前チェックはこれを考慮しておらず、Task が紐づく Entry を削除しようとすると DB 制約（`P2003`）による**未捕捉の例外**が発生することを検証スクリプトで発見した。`deleteEntry()` に `Task.originEntryId` のカウントチェックを追加し、他の来歴と同様に穏当な `blocked` メッセージを返すよう修正した。DB 制約（RESTRICT）自体は正しく機能しており、データの整合性は損なわれていなかった（アプリ層のエラーハンドリングの抜け漏れのみ）。
- **教訓**: Entry を参照する新しいモデル・フィールドを追加するたびに、`deleteEntry()` の事前チェック一覧を見直す必要がある。次に Entry への参照を追加する Issue（#12 Capture→Task化 で `Task.originEntryId` は既存、#20/#21 の AI 派生も既存の `sourceEntryId` を使うため影響なし想定）でも同様の確認を行うこと。

#### 今後への影響

- Issue #11（今日のタスク view と状態遷移）は `lib/db/tasks.ts` の CRUD 関数の上に UI を構築する。
- Issue #12（Quick Capture → Task 化）は `createTask({ ..., originEntryId: entry.id })` を呼ぶだけで来歴付きタスク化が成立する（追加のスキーマ変更は不要）。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 16/16 成功（既存テストに影響なし）/ `npm run build` 成功。
- UI を持たない Issue のため、`tsx` 経由の一時検証スクリプトで CRUD 全経路を実DBに対して検証（検証後にスクリプトと生成データを削除、リポジトリ・DBに残存なし）: 作成・取得・一覧・更新（成功）／不正な status・priority が `TaskValidationError` で拒否されること／`originEntryId` が正しく Entry を参照すること／参照元 Entry の削除が `deleteEntry()` 修正後は例外を投げず `blocked` を返すこと／DB 制約（FK RESTRICT）自体も独立して機能していることを確認。

---

## 2026-09-27（続き6）

### Issue #11

#### 概要

今日のタスク view と状態遷移。Issue #10 で作った Task CRUD の上に、実際に使える UI を Home 空間へ実装した。

- 対応 Issue: [personal-os-design#11](https://github.com/akms9366/personal-os-design/issues/11)
- Pull Request: personal-os#12（作成予定）
- feature ブランチ: `feature/issue-011-today-tasks`
- 前提: Issue #10（PR #11）Merge 済み。

#### 追加

- `app/(app)/home/actions.ts`: `createTaskAction`（タイトルのみでタスク作成、priority は自動設定しない）／`updateTaskStatusAction`（`isTaskStatus` で値域検証してから更新）。
- `app/(app)/home/TaskCreateForm.tsx`（Client）: タスク追加フォーム。
- `app/(app)/home/TaskList.tsx`（Client）: 一覧＋状態遷移 `<select>`（todo/doing/hold/done を "未着手/進行中/保留/完了" と中立的な日本語ラベルで表示）。

#### 変更

- `app/(app)/home/page.tsx`: Issue #4 のプレースホルダを置き換え、「今日のタスク」セクション（作成フォーム＋一覧）を実装。現在地・振り返り（#15/#17）は引き続き「今後この領域に構成します」のスタブ文言を残した。

#### 設計判断

- **Task UI は Home 空間に置いた**: `05 §4` Home の「今日」領域の定義（「今日の行動を選び、実行・調整する」）、および `Module_Layer_Space_Mapping.md §4`（Tasks モジュール → Home「今日」）に基づく。Knowledge や新規 route は作らず、Issue #4 で用意した Home の「今後この領域に構成します」プレースホルダを、まさにその「後続 Issue」として実際に埋めた。
- **タスク作成の最小フォーム（タイトルのみ）を含めた**: Issue #11 の「やること」には作成 UI が明記されていないが、Issue #10 は UI を持たないため、作成手段が皆無だと「一覧・状態遷移」自体を検証・利用できない。#12（Quick Capture→Task化）は既存 Entry からの変換という別経路であり、手動でのタスク起票を代替しない。両者は並存する入口と判断し、最小のタイトル入力フォームを追加した。
- **状態遷移は `<select>` 一つに単純化**: 4状態間の遷移に順序制約を設けない（`11 §2`）。ボタン群やドラッグ&ドロップ等の凝った UI は今回作らず、`<select>` で「状態遷移が動く」という完了条件を過不足なく満たした。
- **状態ラベルは中立語を採用**: todo→「未着手」、doing→「進行中」、hold→「保留」、done→「完了」。「未完了」「失敗」等の否定的表現を避け、`11 §2` の完了条件（未完了に否定的表現がない）を満たす。
- **一覧は現時点で全タスクを表示（絞り込みなし）**: `05 §4` の Home「今日」領域は本来「無制限のToDo一覧」を含めないことを求めているが、現時点では「今日に割り当てる」という概念自体がモデルに存在しない（Calendar 統合前）。Epic5 の Issue #16「今日領域（統合）」が Task と Calendar を実際に統合する際に、この一覧を焦点を絞った表示へ発展させる想定。ここで無理に「今日」概念を先取り実装せず、Loop Engineering の「小さく実装して使ってから設計へフィードバックする」方針に沿って一旦単純な全件一覧とした。次セッションは #16 着手時にこの点を必ず思い出すこと。

#### 今後への影響

- Issue #16（今日領域統合）は、本 Issue の `TaskList`/`listTasks()` を土台に、Calendar の予定と合わせた「今日」に絞った表示へ発展させる（`05 §4` の「無制限のToDo一覧を含めない」を本格的に満たすのはここ）。
- Issue #12（Quick Capture→Task化）は、Inbox の Entry に対して `createTask({ ..., originEntryId })` を呼ぶ操作を追加するだけで、本 Issue の一覧にそのまま現れる。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 16/16 成功（既存テストに影響なし）/ `npm run build` 成功。
- dev サーバで実挙動確認: タスク作成→一覧に反映／状態を `todo→doing→hold→todo→done` と遷移させ、逆遷移（hold→todo）も含めて順序が強制されないことを確認／各遷移をDB直接クエリで確認／中立的な状態ラベルが表示されることを確認（検証用データは終了後に削除）。コンソールエラーなし（HMR警告のみ）。

---

## 2026-09-27（続き7）

### Issue #12

#### 概要

Quick Capture → Task 化。Epic 3 の最後の Issue。Inbox の Entry から、利用者の明示操作でタスクを起票できるようにした。AI は関与しない（`11 §6`）。

- 対応 Issue: [personal-os-design#12](https://github.com/akms9366/personal-os-design/issues/12)
- Pull Request: personal-os#13（作成予定）
- feature ブランチ: `feature/issue-012-capture-to-task`
- 前提: Issue #8（PR #9）・Issue #11（PR #12）Merge 済み。

#### 追加

- `lib/db/tasks.ts`: `convertEntryToTask(entryId)` — Entry を読み取り、本文の先頭行（80文字超は省略）をタイトルに、全文を `note` に、`originEntryId` に元 Entry を設定して `createTask` を呼ぶ。Entry 自体は一切変更しない。
- `app/(app)/knowledge/actions.ts`: `taskifyInboxEntry` Server Action。成功後は `/home`（タスク一覧）を revalidate。
- `app/(app)/knowledge/InboxItem.tsx`: 各 Inbox 項目に「タスク化」ボタンを追加（編集・削除と並置）。成功時は「タスク化しました（Home の今日のタスクに追加）。」を表示。

#### 設計判断

- **タイトルは本文の先頭行を機械的に切り出す（AI要約はしない）**: `11 §6`「利用者の明示変換」であり、AI が介在する余地を持たせない。整形は単純な文字列処理（先頭行・80文字切り詰め）に限定し、全文は `note` にそのまま保持して情報を失わない。
- **タスク化は何度でも実行できる（重複防止をしない）**: 1つの原情報から複数のタスクに分解したい場合（例: 箇条書きメモ）を妨げないため、"既にタスク化済み" の抑制は設けなかった。完了条件（原情報が残る／来歴を辿れる）に反しない限り、利用者の裁量に委ねる。
- **原情報 Entry の変更・削除は一切行わない**: `convertEntryToTask` は Entry を読み取り専用で参照するのみ。Issue #8 で確立した「派生・関連を持つ Entry は削除できない」制約（`Task.originEntryId` の FK RESTRICT、Issue #10 で追加済み）が、タスク化後の Entry 削除操作からも自動的に来歴を守る。

#### 今後への影響

- Issue #16（今日領域統合）・Issue #20/#21（AI整理・行動候補）は、`Task.originEntryId` を辿って「どの原情報から生まれたタスクか」を説明可能性（P4）の一部として利用できる。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 16/16 成功（既存テストに影響なし）/ `npm run build` 成功。
- dev サーバで実挙動確認: Inbox の Journal エントリを「タスク化」→ Home の今日のタスク一覧に反映／DB 直接クエリで `Task.originEntryId` が元 Entry を正しく参照し、元 Entry が一切変更されず残っていることを確認／タスク化後も Inbox 一覧に元の Entry が変わらず表示されることを確認。加えて `tsx` 経由の一時検証で、長文（100文字）が80文字＋省略記号に切り詰められること、複数行本文では先頭行のみがタイトルになることを確認（検証後にスクリプトと一時データを削除）。コンソールエラーなし（HMR警告のみ）。

---

## 2026-09-27（続き8）

### Issue #13

#### 概要

Google Calendar 接続（read-only）。Epic4 Calendar の先頭。設計SSOTが「MVP最大の外部依存・最大リスク」と明示する Issue のため、着手前にユーザーへ実装方式を確認し、**ICS 秘密URL方式**（OAuth 難航時の代替として `14 §8` が明記する方式）を採用する旨の承認を得てから実装した。

- 対応 Issue: [personal-os-design#13](https://github.com/akms9366/personal-os-design/issues/13)
- Pull Request: personal-os#14（作成予定）
- feature ブランチ: `feature/issue-013-calendar-ics`
- 前提: Issue #6（PR #7）Merge 済み。

#### 追加

- `prisma/schema.prisma`: `Settings` に `calendarIcsUrl`（平文保持、画面には一切渡さない）・`calendarLastSyncAt`・`calendarLastSyncError` を追加。migration `20260927053129_add_calendar_ics_connection`。
- `lib/calendar/ics.ts`: `fetchIcsText()`（Issue #14 の取得処理と共有する予定）・`validateIcsUrl()`（`BEGIN:VCALENDAR` を含むかで簡易検証）。
- `lib/settings/store.ts`: `SettingsView` に `calendarConnected`/`calendarLastSyncAt`/`calendarLastSyncError` を追加。`connectCalendar()`（検証成功時のみ保存）・`disconnectCalendar()`・`getCalendarIcsUrl()`（Issue #14 専用、UIには渡さないサーバ内部関数）。
- `app/(app)/settings/actions.ts`: `connectCalendarAction`／`disconnectCalendarAction`。
- `app/(app)/settings/CalendarConnectionForm.tsx`: 未接続時はURL入力フォーム、接続済み時は状態・最終同期時刻・切断ボタンを表示。

#### 変更

- `app/(app)/settings/page.tsx`: 「Connections」枠のスタブを `CalendarConnectionForm` に置き換え。
- `eslint.config.mjs`: `@typescript-eslint/no-unused-vars` に `argsIgnorePattern: "^_"` を明示設定（Server Action の `(prevState, formData)` 呼び出し規約上、両方とも未使用になるケース＝`disconnectCalendarAction` で警告が出たため、既存の `_` 接頭辞慣習を正式にルール化した）。

#### 設計判断

- **OAuth ではなく ICS 秘密URL方式を採用**（ユーザー承認済み）: `14 §11` セルフレビューが「難航時はICSへ切替」としていたものを、`14 §1` の判断基準（1.毎日使いやすい 2.保守しやすい 3.シンプル 4.実装速度）に照らし、最初からICSを選択。Google Cloud Console でのOAuthクライアント登録・同意画面設定・トークンリフレッシュ実装が不要になり、実装・保守コストを大幅に下げた。
- **「読み取りスコープのみ」の完了条件はICSという方式自体で満たす**: ICS配信は原理的に読み取り専用（書込みAPIが存在しない）。OAuthのスコープ制御に相当する安全性を、方式の選択そのもので実現しており、追加のアクセス制御コードは不要と判断した。
- **接続検証に成功した場合のみ保存する**: 壊れたURLや誤入力を「接続済み」として保存すると、実体のない接続状態を利用者に見せてしまう（`11 §9` 誠実な失敗）。`connectCalendar()` は検証(`validateIcsUrl`)が成功したときのみ DB を更新し、失敗時は既存の状態を変更せずエラーメッセージのみ返す。
- **秘密URLは画面に一切渡さない**: API キー（Issue #6）は末尾4桁のマスク表示だったが、ICS秘密URLは全体が秘密情報であり部分表示の意味がないため、真偽値（接続済み/未接続）のみを画面に渡す設計とした。`getCalendarIcsUrl()`（生のURLを返す関数）はサーバ内部専用とし、Client Component には一切公開しない。
- **`fetchIcsText`/`validateIcsUrl` を Issue #14 と共有できる形で `lib/calendar/ics.ts` に切り出した**: 接続検証（#13）と実際のイベント取得・表示（#14）は同じ「ICSを取得する」処理を必要とするため、二重実装を避けた。

#### 今後への影響

- Issue #14（今日の予定の表示）は `getCalendarIcsUrl()` で秘密URLを取得し、`fetchIcsText()` で本文を取得したうえで、実際の VEVENT パースと「今日」分の抽出・表示を実装する。
- 同期失敗時の表示（`calendarLastSyncError`）は #13 では書き込みパスを用意したのみで、実際に同期を試みて失敗を記録する処理は #14 のイベント取得時に初めて発生する。

#### 検証

- `npm run lint` 成功（設定調整後）/ `npm run typecheck` 成功 / `npm test` 16/16 成功（既存テストに影響なし）/ `npm run build` 成功。
- dev サーバで実挙動確認: 無効なURL（`https://example.com/not-a-calendar`）で接続を試み、「接続に失敗しました（HTTP 404）」が表示され状態が「未接続」のまま変わらないことを確認／実在する公開ICSフィード（Google 提供の米国祝日カレンダー公開ICS）で接続→「状態: 接続済み」・最終同期時刻が表示されることを確認／DB直接クエリで `calendarIcsUrl` が保存され `calendarLastSyncError` が null であることを確認／切断→フォームが未接続状態に戻り、DB上も全フィールドが `null` にクリアされることを確認。コンソールエラーなし。

---

## 2026-09-27（続き9）

### Issue #14

#### 概要

今日の予定の表示。Epic4 Calendar の最後、Epic4 全体の完了。Issue #13 で確立した ICS 接続を実際に使い、今日分のイベントを取得・表示し、`Entry(origin=external, kind=event)` として保持する。

- 対応 Issue: [personal-os-design#14](https://github.com/akms9366/personal-os-design/issues/14)
- Pull Request: personal-os#15（作成予定）
- feature ブランチ: `feature/issue-014-today-events`
- 前提: Issue #13（PR #14）Merge 済み。

#### 追加

- 依存追加: `node-ical`（ICS/RFC5545 パーサ）。繰り返しイベント（RRULE）・RECURRENCE-ID による上書き・EXDATE・終日判定など、ICS の実務的な複雑さを自前実装せず委譲するため採用（詳細は設計判断参照）。
- `lib/domain/entry.ts`: `KINDS` に `"event"` を追加。
- `lib/calendar/ics.ts`: `parseTodayEvents()` — `node-ical` の `expandRecurringEvent()` を使い、繰り返し・終日イベントを含めて「今日」に該当する発生（occurrence）を抽出する。
- `lib/calendar/sync.ts`: `getTodayEvents()` — 接続確認→取得→解析→表示用データ整形→Entry永続化→同期状態記録、を一括して行うオーケストレーション層。
- `lib/settings/store.ts`: `recordCalendarSyncSuccess()`／`recordCalendarSyncError()`。
- `app/(app)/home/TodayEvents.tsx`: 今日の予定の表示（未接続／同期失敗／0件／一覧の4状態）。
- `app/(app)/home/page.tsx`: 「今日の予定」セクションを追加（今日のタスクの上）。

#### 変更

- **`lib/db/entries.ts` の `listCurrentEntries()` を修正**: `kind: { not: "event" }` を追加。実機検証で、Google Calendar 由来の Entry（kind=event, origin=external）が Inbox 一覧に混在して表示され、「編集（新版生成）」「削除」「タスク化」といった本来 BrainDump 向けの操作が外部データにも表示されてしまう不具合を発見し、その場で修正した（後述）。

#### 設計判断

- **ICS パースに `node-ical` を採用（自前実装しない）**: RFC5545 の繰り返し規則（RRULE）・例外日（EXDATE）・個別上書き（RECURRENCE-ID）・終日イベント判定・タイムゾーン変換は、正しく実装しようとすると自前実装は非常に複雑で誤りやすい（`14 §2` は「過剰実装を避ける」としているが、これは逆に「枯れたライブラリに委譲することでシンプルさを保つ」ケースと判断した）。`expandRecurringEvent()` 1関数呼び出しで、繰り返し・単発・終日を統一的に扱える。
- **`Entry(origin=external, kind=event)` の永続化は「発生（occurrence）単位」で冪等**: 同じイベント（UID）・同じ発生時刻の組を安定キー（`source = "google-calendar:<uid>:<開始時刻ISO>"`）とし、既存レコードがあれば再作成しない。再取得のたびに重複が増えることを防ぎつつ、`06 §2.2`「外部側更新は新版として追記」の考え方に沿う（同一発生の重複だけを防ぎ、変更検知・差分更新は本 Issue の範囲外とした）。
- **同期成功／失敗と関わらず、既存の書込み規約（`createEntry`）を経由する**: Prisma を直接叩かず、`lib/db/entries.ts` の `createEntry` を呼ぶことで、値域検証（`kind`/`origin`/`state`）を他の経路と同じように担保する。
- **「成功したように見せない」を Home と Settings の両方で担保**: 取得・解析いずれかが失敗した場合、`events` は常に空配列で返し、`error` を必ず設定する。`TodayEvents` コンポーネントは「0件」と「エラー」を明確に区別して表示する（0件を装ってエラーを隠さない）。Settings 側にも直近の同期エラーを表示し、Home を見ない利用者にも同期不調が伝わるようにした。
- **`kind=event` を Inbox から除外（実装中に発見・修正）**: `listCurrentEntries()` は元々 `state="S1"` のみで絞っていたが、`origin=external` の Entry も state=S1 であるため、そのままでは Google Calendar 由来のイベントが Quick Capture / Journal と同じ Inbox 一覧に紛れ込み、「編集」「削除」「タスク化」が外部データに対しても表示されてしまうことをブラウザでの実機検証で発見した。Inbox（BrainDump）は利用者が明示的に残した断片の受信箱であり、外部同期データとは性質が異なるため、`kind: { not: "event" }` を追加して除外した。Issue #8 で発見した state=S2 混在バグと同種の「一覧を実装するたびに、意図しない種類の Entry が紛れ込んでいないか確認する」教訓が再び当てはまった。

#### 実装中に発見した問題（npm audit）

- `node-ical` 導入時の `npm install` で `npm audit` が **critical** の Next.js 脆弱性（Windows ホスト環境での未認証RCE、GHSA-p293-qw3h-jr36。現行 next@16.2.12 が該当、next@16.3.6 で修正）を報告した。本 Issue（Calendar）とは無関係の既存依存の問題のため、範囲外の変更としてこの場では着手せず、別タスクとして切り出した（フォローアップが必要）。

#### 今後への影響

- Issue #16（今日領域統合）は、本 Issue の `getTodayEvents()`／`TodayEvents` を Task の「今日」表示と統合する際の材料になる。
- Issue #20/#21（AI整理・行動候補）が「今日の予定」を文脈として読む場合、`Entry(kind=event)` を辿ることで来歴（P3）を保った参照ができる。
- 同一イベントの内容変更（時刻変更・タイトル変更等）を検知して新版として記録する仕組みは本 Issue の範囲外（将来必要になれば `revisesEntryId` の枠組みを再利用できる）。

#### 検証

- `npm run lint` 成功 / `npm run typecheck` 成功 / `npm test` 16/16 成功（既存テストに影響なし）/ `npm run build` 成功。
- 実際の日付（2026-09-27）に依存する検証のため、単発・終日・毎日繰り返し・前日（除外されるべき）の4種類のVEVENTを含む一時テストICSファイル（`public/test-calendar.ics`、検証後に削除）を用意し、dev サーバで実挙動確認: Settings で接続→Home に3件（終日・単発・繰り返し）が正しい時刻順で表示され、前日のイベントが含まれないことを確認／DB直接クエリで3件が `kind=event, origin=external, state=S1` として永続化されることを確認／ページ再読込後も重複作成されない（冪等）ことを確認／ファイルを一時的にリネームして同期を失敗させ、Home に「同期に失敗しました」、Settings に「直近の同期エラー」が表示され、`calendarLastSyncAt`（直近成功時刻）は上書きされないことを確認／ファイルを復元し切断、DBのテストデータ（event Entry 3件）とテストICSファイルを削除。コンソールエラーなし。
