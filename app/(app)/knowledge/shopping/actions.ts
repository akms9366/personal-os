"use server";

import { revalidatePath } from "next/cache";
import {
  clearCheckedShoppingItems,
  createShoppingItem,
  deleteShoppingItem,
  setShoppingItemChecked,
} from "@/lib/db/shopping";

export interface ShoppingActionState {
  success?: boolean;
  error?: string;
}

const PATH = "/knowledge/shopping";

/// 追加。1行に1品、改行でまとめて追加できる（「牛乳 2本」のように後ろに数量を書いてもよい）。
export async function addShoppingItemsAction(
  _prevState: ShoppingActionState,
  formData: FormData,
): Promise<ShoppingActionState> {
  const lines = String(formData.get("items") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { error: "品名を入力してください。" };
  }
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  for (const name of lines) {
    await createShoppingItem(name, lines.length === 1 ? quantity : null);
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function toggleShoppingItemAction(
  id: string,
  checked: boolean,
): Promise<void> {
  await setShoppingItemChecked(id, checked);
  revalidatePath(PATH);
}

export async function deleteShoppingItemAction(id: string): Promise<void> {
  await deleteShoppingItem(id);
  revalidatePath(PATH);
}

export async function clearCheckedAction(): Promise<void> {
  await clearCheckedShoppingItems();
  revalidatePath(PATH);
}
