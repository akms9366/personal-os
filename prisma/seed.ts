import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 最低限のシード（原情報 S1 のサンプル）。
// 冪等: 既に Entry が存在する場合はスキップし、重複投入しない。
async function main() {
  const existing = await prisma.entry.count();
  if (existing > 0) {
    console.log(`Entry already has ${existing} row(s); skip seeding.`);
    return;
  }

  await prisma.entry.createMany({
    data: [
      { kind: "note", body: "Personal OS の最初のメモ。", source: "manual" },
      {
        kind: "journal",
        body: "今日から Personal OS を作り始めた。",
        source: "manual",
      },
      { kind: "bookmark", body: "https://nextjs.org", source: "quick-capture" },
    ],
  });

  console.log("Seeded 3 entries.");
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
