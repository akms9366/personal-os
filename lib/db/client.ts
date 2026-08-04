import { PrismaClient } from "@prisma/client";

// Prisma Client のシングルトン（DB 基盤）。
// Next.js の開発時ホットリロードで接続が増殖しないよう、globalThis に保持する。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
