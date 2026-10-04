"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import {
  clearCheckedAction,
  deleteShoppingItemAction,
  toggleShoppingItemAction,
} from "./actions";
import {
  dangerButtonClass,
  emptyClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface ShoppingItemView {
  id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
}

export function ShoppingList({ items }: { items: ShoppingItemView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // チェックはすぐ反映させる（店内での操作を軽くするため楽観的更新）。
  const [optimisticItems, setOptimistic] = useOptimistic(
    items,
    (current, change: { id: string; checked: boolean }) =>
      current.map((item) =>
        item.id === change.id ? { ...item, checked: change.checked } : item,
      ),
  );

  function toggle(item: ShoppingItemView) {
    startTransition(async () => {
      setOptimistic({ id: item.id, checked: !item.checked });
      await toggleShoppingItemAction(item.id, !item.checked);
      router.refresh();
    });
  }

  function remove(item: ShoppingItemView) {
    startTransition(async () => {
      await deleteShoppingItemAction(item.id);
      router.refresh();
    });
  }

  function clearChecked() {
    if (!window.confirm("チェック済みの項目をすべて削除しますか？")) {
      return;
    }
    startTransition(async () => {
      await clearCheckedAction();
      router.refresh();
    });
  }

  const remaining = optimisticItems.filter((item) => !item.checked);
  const checked = optimisticItems.filter((item) => item.checked);

  if (optimisticItems.length === 0) {
    return <p className={emptyClass}>買い物メモは空です。</p>;
  }

  const renderItem = (item: ShoppingItemView) => (
    <li
      key={item.id}
      className="flex items-center gap-3 border-t border-zinc-200 py-2 first:border-t-0 dark:border-zinc-800"
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => toggle(item)}
          className="size-5 shrink-0 accent-zinc-900 dark:accent-zinc-100"
        />
        <span
          className={`text-sm ${item.checked ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}
        >
          {item.name}
          {item.quantity ? (
            <span className="ml-2 text-xs text-zinc-500">{item.quantity}</span>
          ) : null}
        </span>
      </label>
      <button
        type="button"
        onClick={() => remove(item)}
        disabled={pending}
        aria-label={`${item.name} を削除`}
        className={dangerButtonClass}
      >
        ×
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
          残り {remaining.length} 件
        </p>
        <ul>{remaining.map(renderItem)}</ul>
      </div>
      {checked.length > 0 ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              チェック済み {checked.length} 件
            </p>
            <button
              type="button"
              onClick={clearChecked}
              disabled={pending}
              className={secondaryButtonClass}
            >
              チェック済みを削除
            </button>
          </div>
          <ul>{checked.map(renderItem)}</ul>
        </div>
      ) : null}
    </div>
  );
}
