import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 最低限のシード（原情報 S1 のサンプル）＋来歴検証用の派生サンプル1件。
// 冪等: 既に Entry が存在する場合はスキップし、重複投入しない。
async function main() {
  const existing = await prisma.entry.count();
  if (existing > 0) {
    console.log(`Entry already has ${existing} row(s); skip seeding.`);
    return;
  }

  // 原情報（S1）。origin=human / external、sourceEntryId=null。
  const note = await prisma.entry.create({
    data: {
      kind: "note",
      body: "Personal OS の最初のメモ。",
      source: "manual",
      origin: "human",
      state: "S1",
    },
  });

  await prisma.entry.create({
    data: {
      kind: "journal",
      body: "今日から Personal OS を作り始めた。",
      source: "manual",
      origin: "human",
      state: "S1",
    },
  });

  await prisma.entry.create({
    data: {
      kind: "bookmark",
      body: "https://nextjs.org",
      source: "quick-capture",
      origin: "human",
      state: "S1",
    },
  });

  // 派生サンプル（AI機能ではなく、来歴が正しく辿れることの検証データ）。
  // origin=ai / state=S2（解釈）/ sourceEntryId=元 Entry（note）。
  await prisma.entry.create({
    data: {
      kind: "note",
      body: "（解釈サンプル）このメモは Personal OS 構築の起点を示す。",
      source: "ai-interpretation",
      origin: "ai",
      state: "S2",
      sourceEntryId: note.id,
    },
  });

  console.log("Seeded 3 original entries + 1 derived (S2) entry.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
