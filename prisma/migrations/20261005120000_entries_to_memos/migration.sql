-- Quick Capture / Journal の記録（旧 Inbox）を Memo に移す（データのコピーのみ。Entry は変更・削除しない）。
-- 対象は旧 Inbox の表示条件と同じ「現在版の原情報」: state = 'S1'、kind <> 'event'、
-- 他の Entry に修正（新版）されていないもの。S8（振り返り）は対象外。
-- 1行目 → title、2行目以降 → body。作成日時は元の記録のまま保つ。
-- Memo の id を 'entry-<元の id>' にして、再実行しても二重に作られないようにする。
INSERT INTO "Memo" ("id", "title", "body", "url", "createdAt", "updatedAt")
SELECT
    'entry-' || "id",
    CASE
        WHEN instr("t", char(10)) > 0
            THEN rtrim(substr("t", 1, instr("t", char(10)) - 1), char(13) || ' ')
        ELSE "t"
    END,
    CASE
        WHEN instr("t", char(10)) > 0
            THEN nullif(trim(substr("t", instr("t", char(10)) + 1), char(10) || char(13) || ' '), '')
        ELSE NULL
    END,
    NULL,
    "createdAt",
    "createdAt"
FROM (
    SELECT
        e."id" AS "id",
        e."createdAt" AS "createdAt",
        trim(e."body", ' ' || char(9) || char(10) || char(13)) AS "t"
    FROM "Entry" e
    WHERE e."state" = 'S1'
      AND e."kind" <> 'event'
      AND NOT EXISTS (SELECT 1 FROM "Entry" r WHERE r."revisesEntryId" = e."id")
      AND NOT EXISTS (SELECT 1 FROM "Memo" m WHERE m."id" = 'entry-' || e."id")
)
WHERE "t" <> '';
