import { prisma } from "./client";

// 体重記録。1日1件（同じ日付で保存すると上書き）。

export interface WeightParams {
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  note: string | null;
}

export async function listWeights() {
  return prisma.weightRecord.findMany({ orderBy: { date: "desc" } });
}

export async function upsertWeight(params: WeightParams) {
  const { date, ...data } = params;
  return prisma.weightRecord.upsert({
    where: { date },
    create: params,
    update: data,
  });
}

export async function deleteWeight(id: string) {
  await prisma.weightRecord.delete({ where: { id } });
}
