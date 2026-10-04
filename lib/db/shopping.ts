import { prisma } from "./client";

// 買い物メモ。

export async function listShoppingItems() {
  return prisma.shoppingItem.findMany({
    orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
  });
}

export async function createShoppingItem(
  name: string,
  quantity: string | null,
) {
  return prisma.shoppingItem.create({ data: { name, quantity } });
}

export async function setShoppingItemChecked(id: string, checked: boolean) {
  return prisma.shoppingItem.update({
    where: { id },
    data: { checked, checkedAt: checked ? new Date() : null },
  });
}

export async function deleteShoppingItem(id: string) {
  await prisma.shoppingItem.delete({ where: { id } });
}

export async function clearCheckedShoppingItems() {
  await prisma.shoppingItem.deleteMany({ where: { checked: true } });
}
