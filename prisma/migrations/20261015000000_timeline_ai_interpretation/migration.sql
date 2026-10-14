-- Issue #20: タイムライン投稿（Memo）を原情報（S1 Entry）と紐づけ、AI 解析（S2 解釈）の実行記録を持つ。
-- 既存データは書き換えない（列追加・テーブル追加・INSERT・Memo.entryId の設定のみ）。

-- AI 解析の実行記録（原情報の版ごとに最大1行）。
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceEntryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "model" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiAnalysis_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "Entry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiAnalysis_sourceEntryId_key" ON "AiAnalysis"("sourceEntryId");

-- Memo → 原情報（S1）の現在版。テーブルを作り直さず列追加で済ませる（タグの関連テーブルに触れない）。
ALTER TABLE "Memo" ADD COLUMN "entryId" TEXT CONSTRAINT "Memo_entryId_fkey" REFERENCES "Entry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Memo_entryId_key" ON "Memo"("entryId");

-- 既存メモの原情報を補完する。投稿テキスト = title ＋ 改行 ＋ body（＋ 本文にない URL）。
-- （lib/domain/memo.ts の composeMemoText と同じ組み立て）

-- (a) 旧 Inbox から移行したメモ（id = 'entry-<元の Entry id>'）で、移行後に編集されていないもの
--     （移行時に updatedAt = createdAt としている）→ 元の原情報にそのまま紐づける。
UPDATE "Memo"
SET "entryId" = substr("id", 7)
WHERE "entryId" IS NULL
  AND "id" LIKE 'entry-%'
  AND "updatedAt" = "createdAt"
  AND EXISTS (
      SELECT 1 FROM "Entry" e
      WHERE e."id" = substr("Memo"."id", 7)
        AND e."state" = 'S1'
        AND NOT EXISTS (SELECT 1 FROM "Entry" r WHERE r."revisesEntryId" = e."id")
  );

-- (b) 旧 Inbox から移行したあとで編集されたメモ → 元の原情報の新版（revisesEntryId）として現在の本文を残す。
INSERT INTO "Entry" ("id", "kind", "body", "createdAt", "source", "origin", "state", "revisesEntryId")
SELECT
    'memo-' || m."id",
    e."kind",
    m."title"
        || coalesce(char(10) || m."body", '')
        || CASE
               WHEN m."url" IS NOT NULL
                    AND instr(m."title" || coalesce(char(10) || m."body", ''), m."url") = 0
                   THEN char(10) || m."url"
               ELSE ''
           END,
    m."updatedAt",
    e."source",
    'human',
    'S1',
    e."id"
FROM "Memo" m
JOIN "Entry" e ON e."id" = substr(m."id", 7)
WHERE m."entryId" IS NULL
  AND m."id" LIKE 'entry-%'
  AND e."state" = 'S1'
  AND NOT EXISTS (SELECT 1 FROM "Entry" r WHERE r."revisesEntryId" = e."id")
  AND NOT EXISTS (SELECT 1 FROM "Entry" x WHERE x."id" = 'memo-' || m."id");

-- (c) メモページで直接書いたメモなど、原情報を持たないもの → 新しい原情報（S1）を作る。
INSERT INTO "Entry" ("id", "kind", "body", "createdAt", "source", "origin", "state")
SELECT
    'memo-' || m."id",
    'note',
    m."title"
        || coalesce(char(10) || m."body", '')
        || CASE
               WHEN m."url" IS NOT NULL
                    AND instr(m."title" || coalesce(char(10) || m."body", ''), m."url") = 0
                   THEN char(10) || m."url"
               ELSE ''
           END,
    m."createdAt",
    'timeline',
    'human',
    'S1'
FROM "Memo" m
WHERE m."entryId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Entry" x WHERE x."id" = 'memo-' || m."id");

-- (b)(c) で作った原情報に紐づける。
UPDATE "Memo"
SET "entryId" = 'memo-' || "id"
WHERE "entryId" IS NULL
  AND EXISTS (SELECT 1 FROM "Entry" x WHERE x."id" = 'memo-' || "Memo"."id");
