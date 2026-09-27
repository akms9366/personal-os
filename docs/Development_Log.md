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
